const { query, withTransaction } = require('../config/database');
const whatsappService = require('./whatsappService');
const n8nService      = require('./n8nService');
const { notifyQueue } = require('./queueService');

/**
 * Main entry point for all Meta webhook events
 */
const processWebhookEvent = async (body, io) => {
  // Log raw event
  await query(
    'INSERT INTO webhook_events (event_type, raw_payload) VALUES ($1, $2)',
    [body.object, JSON.stringify(body)]
  );

  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;

      // Handle incoming messages
      if (value.messages) {
        for (const msg of value.messages) {
          await handleIncomingMessage(msg, value.metadata, io);
        }
      }

      // Handle status updates (sent/delivered/read)
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status, io);
        }
      }
    }
  }
};

/**
 * Process an incoming WhatsApp message
 */
const handleIncomingMessage = async (waMsg, metadata, io) => {
  const phoneNumber = waMsg.from; // E.164 format
  const waMessageId = waMsg.id;

  // Deduplicate: skip if already processed
  const existing = await query('SELECT id FROM messages WHERE wa_message_id = $1', [waMessageId]);
  if (existing.rows.length > 0) {
    console.log(`[Webhook] Duplicate message ${waMessageId}, skipping`);
    return;
  }

  // Extract message content
  const { type, content, mediaUrl } = extractMessageContent(waMsg);

  await withTransaction(async (client) => {
    // Upsert contact
    const contactResult = await client.query(
      `INSERT INTO contacts (phone_number, name)
       VALUES ($1, $2)
       ON CONFLICT (phone_number) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, contacts.name),
         updated_at = NOW()
       RETURNING *`,
      [phoneNumber, waMsg.profile?.name || null]
    );
    const contact = contactResult.rows[0];

    // Get or create open conversation
    let convResult = await client.query(
      `SELECT * FROM conversations WHERE contact_id = $1 AND status = 'open' LIMIT 1`,
      [contact.id]
    );

    if (convResult.rows.length === 0) {
      convResult = await client.query(
        `INSERT INTO conversations (contact_id, status, automation_enabled)
         VALUES ($1, 'open', true) RETURNING *`,
        [contact.id]
      );
    }
    const isNewConversation = convResult.rows.length === 0;
    const conversation = convResult.rows[0];

    // Notify agents if new conversation
    if (isNewConversation) {
      setImmediate(() => notifyQueue(io, conversation, contact).catch(console.error));
    }

    // Store message
    const msgResult = await client.query(
      `INSERT INTO messages (conversation_id, wa_message_id, direction, type, content, media_url, status, timestamp)
       VALUES ($1, $2, 'incoming', $3, $4, $5, 'delivered', to_timestamp($6))
       RETURNING *`,
      [conversation.id, waMessageId, type, content, mediaUrl || null, waMsg.timestamp]
    );
    const message = msgResult.rows[0];

    // Mark webhook event as processed
    await client.query(
      `UPDATE webhook_events SET processed = true, processed_at = NOW()
       WHERE raw_payload->>'id' = $1`,
      [waMessageId]
    );

    // Emit real-time update to dashboard
    io.emit('new_message', {
      message,
      conversation: { ...conversation, contact },
    });

    io.emit('conversation_updated', {
      conversationId: conversation.id,
      contactName: contact.name || phoneNumber,
      lastMessage: content,
      timestamp: message.timestamp,
    });

    // Trigger n8n if automation is enabled
    if (conversation.automation_enabled && isWithin24HourWindow(conversation)) {
      setImmediate(() =>
        triggerN8n(message, conversation, contact, io).catch(console.error)
      );
    }
  });
};

/**
 * Handle WhatsApp delivery/read status updates
 */
const handleStatusUpdate = async (statusUpdate, io) => {
  const { id: waMessageId, status, timestamp } = statusUpdate;

  const result = await query(
    `UPDATE messages SET status = $1 WHERE wa_message_id = $2 RETURNING id, conversation_id`,
    [status, waMessageId]
  );

  if (result.rows.length > 0) {
    const { id, conversation_id } = result.rows[0];
    io.emit('message_status_update', { messageId: id, conversationId: conversation_id, status });
  }
};

/**
 * Trigger n8n workflow and handle response
 */
const triggerN8n = async (message, conversation, contact, io) => {
  const payload = {
    phone_number:    contact.phone_number,
    contact_name:    contact.name,
    message_text:    message.content,
    message_type:    message.type,
    conversation_id: conversation.id,
    message_id:      message.id,
  };

  const logResult = await query(
    `INSERT INTO n8n_logs (conversation_id, workflow_url, request_payload, status)
     VALUES ($1, $2, $3, 'pending') RETURNING id`,
    [conversation.id, process.env.N8N_WEBHOOK_URL, JSON.stringify(payload)]
  );
  const logId = logResult.rows[0].id;

  const start = Date.now();
  try {
    const response = await n8nService.trigger(payload);
    const duration = Date.now() - start;

    await query(
      `UPDATE n8n_logs SET status = 'success', response_data = $1, duration_ms = $2 WHERE id = $3`,
      [JSON.stringify(response), duration, logId]
    );

    // Send the reply back via WhatsApp
    if (response?.reply) {
      await whatsappService.sendTextMessage(contact.phone_number, response.reply, conversation.id, io);
    }
  } catch (err) {
    const duration = Date.now() - start;
    await query(
      `UPDATE n8n_logs SET status = 'failed', error_message = $1, duration_ms = $2 WHERE id = $3`,
      [err.message, duration, logId]
    );
    console.error('[n8n] Workflow trigger failed:', err.message);
  }
};

/**
 * Extract typed content from raw WhatsApp message object
 */
const extractMessageContent = (waMsg) => {
  const type = waMsg.type;
  let content = null;
  let mediaUrl = null;

  switch (type) {
    case 'text':
      content = waMsg.text?.body;
      break;
    case 'image':
      content = waMsg.image?.caption || '[Image]';
      mediaUrl = waMsg.image?.id; // media ID — resolve separately if needed
      break;
    case 'audio':
      content = '[Voice message]';
      mediaUrl = waMsg.audio?.id;
      break;
    case 'video':
      content = waMsg.video?.caption || '[Video]';
      mediaUrl = waMsg.video?.id;
      break;
    case 'document':
      content = waMsg.document?.filename || '[Document]';
      mediaUrl = waMsg.document?.id;
      break;
    case 'sticker':
      content = '[Sticker]';
      break;
    case 'location':
      content = `[Location: ${waMsg.location?.latitude}, ${waMsg.location?.longitude}]`;
      break;
    case 'interactive':
      content = waMsg.interactive?.button_reply?.title
             || waMsg.interactive?.list_reply?.title
             || '[Interactive]';
      break;
    default:
      content = `[${type}]`;
  }

  return { type, content, mediaUrl };
};

const isWithin24HourWindow = (conversation) => {
  if (!conversation.session_expires_at) return false;
  return new Date(conversation.session_expires_at) > new Date();
};

module.exports = { processWebhookEvent };
