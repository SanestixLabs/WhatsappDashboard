const { query, withTransaction } = require('../config/database');
const whatsappService = require('./whatsappService');
const n8nService      = require('./n8nService');
const { notifyQueue } = require('./queueService');
const { processFlowForMessage } = require('./flowService');
const { emitToConversation } = require('./socketService');

const processWebhookEvent = async (body, io) => {
  await query(
    'INSERT INTO webhook_events (event_type, raw_payload) VALUES ($1, $2)',
    [body.object, JSON.stringify(body)]
  );

  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      if (change.field !== 'messages') continue;
      const value = change.value;
      if (value.messages) {
        for (const msg of value.messages) {
          await handleIncomingMessage(msg, value.metadata, io);
        }
      }
      if (value.statuses) {
        for (const status of value.statuses) {
          await handleStatusUpdate(status, io);
        }
      }
    }
  }
};

const handleIncomingMessage = async (waMsg, metadata, io) => {
  const phoneNumber = waMsg.from;
  const waMessageId = waMsg.id;

  const existing = await query('SELECT id FROM messages WHERE wa_message_id = $1', [waMessageId]);
  if (existing.rows.length > 0) return;

  const { type, content, mediaUrl } = extractMessageContent(waMsg);

  // Resolve workspace
  const wsResult = await query('SELECT id FROM workspaces LIMIT 1');
  const workspaceId = wsResult.rows[0]?.id || null;

  await withTransaction(async (client) => {
    const contactResult = await client.query(
      `INSERT INTO contacts (phone_number, name, workspace_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (phone_number, workspace_id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, contacts.name),
         updated_at = NOW()
       RETURNING *`,
      [phoneNumber, waMsg.profile?.name || null, workspaceId]
    );
    const contact = contactResult.rows[0];

    let convResult = await client.query(
      `SELECT * FROM conversations WHERE contact_id = $1 AND status = 'open' LIMIT 1`,
      [contact.id]
    );

    let isNewConversation = false;
    if (convResult.rows.length === 0) {
      isNewConversation = true;
      convResult = await client.query(
        `INSERT INTO conversations (contact_id, status, automation_enabled, workspace_id)
         VALUES ($1, 'open', true, $2) RETURNING *`,
        [contact.id, workspaceId]
      );
    }
    const conversation = convResult.rows[0];

    if (isNewConversation) {
      setImmediate(() => notifyQueue(io, conversation, contact).catch(console.error));
    }

    const msgResult = await client.query(
      `INSERT INTO messages (conversation_id, wa_message_id, direction, type, content, media_url, status, timestamp)
       VALUES ($1, $2, 'incoming', $3, $4, $5, 'delivered', to_timestamp($6))
       RETURNING *`,
      [conversation.id, waMessageId, type, content, mediaUrl || null, waMsg.timestamp]
    );
    const message = msgResult.rows[0];

    await client.query(
      `UPDATE webhook_events SET processed = true, processed_at = NOW()
       WHERE raw_payload->>'id' = $1`,
      [waMessageId]
    );

    // Refresh 24-hour session window on every incoming customer message
    await client.query(
      `UPDATE conversations
        SET session_expires_at = NOW() + INTERVAL '24 hours',
            updated_at = NOW()
        WHERE id = $1`,
      [conversation.id]
    );

    // Emit to conversation room (targeted) AND broadcast for conversation list updates
    emitToConversation(conversation.id, 'new_message', {
      message,
      conversation: { ...conversation, contact },
      conversationId: conversation.id,
    });
    // Removed duplicate global emit — emitToConversation above is sufficient
    io.emit('conversation_updated', {
      conversationId: conversation.id,
      contactName: contact.name || phoneNumber,
      lastMessage: content,
      timestamp: message.timestamp,
    });

    // ── Check if AI is paused for this conversation ──
    const isPaused = conversation.ai_paused_until && new Date(conversation.ai_paused_until) > new Date();

    // ── Phase 8: Check flow triggers first ──
    // Re-fetch fresh conversation to get latest automation_enabled state
    const freshConvResult = await client.query(
      `SELECT * FROM conversations WHERE id = $1`,
      [conversation.id]
    );
    const freshConv = freshConvResult.rows[0] || conversation;
    const flowHandled = await processFlowForMessage(contact, freshConv, content, type, io);

    if (!flowHandled && conversation.automation_enabled && !isPaused && isWithin24HourWindow(conversation)) {
      // ── Run intent + sentiment analysis ──
      setImmediate(() =>
        runAnalysis(message, conversation, contact, io).catch(console.error)
      );
    }
  });
};

const runAnalysis = async (message, conversation, contact, io) => {
  try {
    // Fetch AI settings from DB
    const settingsRes = await query(`SELECT * FROM ai_settings WHERE workspace_id = 'default' LIMIT 1`);
    const settings = settingsRes.rows[0];

    if (!settings) {
      // No settings — just trigger n8n with defaults
      return triggerN8n(message, conversation, contact, settings, io);
    }

    // Run intent + sentiment
    const text = message.content || '';
    const lower = text.toLowerCase();

    // Intent detection
    let intent = 'other';
    if (/order|track|shipping|delivery|dispatch|parcel|package/i.test(text))              intent = 'order';
    else if (/complain|angry|terrible|awful|worst|bad|problem|issue|broken|frustrated/i.test(text)) intent = 'complaint';
    else if (/pay|payment|price|cost|invoice|bill|charge|fee|refund/i.test(text))         intent = 'payment';
    else if (/\?|how|what|when|where|why|who|help|info|detail/i.test(text))               intent = 'question';

    // Sentiment scoring
    const negWords = ['bad','terrible','awful','hate','angry','furious','worst','broken','complaint','refund','cancel','frustrat','disappoint','unacceptable'];
    const posWords = ['great','good','thanks','thank','love','excellent','perfect','happy','amazing','helpful','appreciate','wonderful'];
    let score = 0;
    negWords.forEach(w => { if (lower.includes(w)) score -= 0.2; });
    posWords.forEach(w => { if (lower.includes(w)) score += 0.2; });
    score = Math.max(-1, Math.min(1, score));
    const sentiment = score <= -0.3 ? 'negative' : score >= 0.3 ? 'positive' : 'neutral';

    // Persist intent + sentiment to conversation
    await query(
      `UPDATE conversations SET intent=$1, sentiment=$2, sentiment_score=$3, updated_at=NOW() WHERE id=$4`,
      [intent, sentiment, parseFloat(score.toFixed(2)), conversation.id]
    );

    // Check auto-pause conditions
    const triggeredKeyword = (settings.pause_keywords || []).find(kw => lower.includes(kw.toLowerCase()));
    const shouldPause = settings.auto_pause_enabled && (
      !!triggeredKeyword || (settings.sentiment_enabled && sentiment === 'negative' && score <= -0.4)
    );

    if (shouldPause) {
      const resumeAt = new Date(Date.now() + (settings.auto_resume_hours || 2) * 60 * 60 * 1000);
      const pauseReason = triggeredKeyword
        ? `Pause keyword detected: "${triggeredKeyword}"`
        : 'Negative sentiment detected';

      await query(
        `UPDATE conversations SET automation_enabled=false, ai_paused_until=$1, ai_pause_reason=$2, updated_at=NOW() WHERE id=$3`,
        [resumeAt, pauseReason, conversation.id]
      );

      // Emit update so dashboard shows AI paused
      const updatedConv = await query(`SELECT * FROM conversations WHERE id=$1`, [conversation.id]);
      io.emit('conversation_updated', updatedConv.rows[0]);

      console.log(`[AI] Auto-paused conversation ${conversation.id}: ${pauseReason}`);
      return; // Don't send AI reply — hand to human
    }

    // All good — trigger n8n with system prompt from DB
    await triggerN8n(message, conversation, contact, settings, io);

  } catch (err) {
    console.error('[AI Analysis] Error:', err.message);
    // Fallback — still try to reply via n8n
    await triggerN8n(message, conversation, contact, null, io).catch(console.error);
  }
};

const triggerN8n = async (message, conversation, contact, settings, io) => {
  const payload = {
    phone_number:    contact.phone_number,
    contact_name:    contact.name,
    message_text:    message.content,
    message_type:    message.type,
    conversation_id: conversation.id,
    message_id:      message.id,
    // ── Phase 3: Pass AI settings to n8n so it can use the correct system prompt ──
    ai_settings: settings ? {
      system_prompt:        settings.system_prompt,
      ai_name:              settings.ai_name,
      model:                settings.model,
      confidence_threshold: settings.confidence_threshold,
      intent:               conversation.intent || null,
      sentiment:            conversation.sentiment || null,
    } : null,
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

    if (response?.reply) {
      // Mark reply as AI-generated
      const sentMsg = await whatsappService.sendTextMessage(contact.phone_number, response.reply, conversation.id, io);
      await query(`UPDATE messages SET is_ai=true, source='ai' WHERE id=$1`, [sentMsg.id]).catch(() => {});
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

const handleStatusUpdate = async (statusUpdate, io) => {
  const { id: waMessageId, status, timestamp } = statusUpdate;

  // Update messages table
  const result = await query(
    `UPDATE messages SET status = $1 WHERE wa_message_id = $2 RETURNING id, conversation_id`,
    [status, waMessageId]
  );
  if (result.rows.length > 0) {
    const { id, conversation_id } = result.rows[0];
    io.emit('message_status_update', { messageId: id, conversationId: conversation_id, status });
  }

  // Update broadcast_recipients table
  const validBroadcastStatus = ['sent', 'delivered', 'read', 'failed'];
  if (validBroadcastStatus.includes(status)) {
    const brResult = await query(
      `UPDATE broadcast_recipients SET status=$1 WHERE wa_message_id=$2 RETURNING broadcast_id`,
      [status, waMessageId]
    );
    if (brResult.rows.length > 0) {
      const broadcastId = brResult.rows[0].broadcast_id;
      // Recalculate broadcast counters
      const counts = await query(
        `SELECT
          COUNT(*) FILTER (WHERE status='sent') as sent_count,
          COUNT(*) FILTER (WHERE status='delivered') as delivered_count,
          COUNT(*) FILTER (WHERE status='read') as read_count,
          COUNT(*) FILTER (WHERE status='failed') as failed_count,
          COUNT(*) as total_count
         FROM broadcast_recipients WHERE broadcast_id=$1`,
        [broadcastId]
      );
      const c = counts.rows[0];
      await query(
        `UPDATE broadcasts SET
          sent_count=$1, delivered_count=$2, read_count=$3, failed_count=$4
         WHERE id=$5`,
        [c.sent_count, c.delivered_count, c.read_count, c.failed_count, broadcastId]
      );
      io.emit('broadcast_stats_update', { broadcastId, ...c });
    }
  }
};

const extractMessageContent = (waMsg) => {
  const type = waMsg.type;
  let content = null;
  let mediaUrl = null;
  switch (type) {
    case 'text':     content = waMsg.text?.body; break;
    case 'image':    content = waMsg.image?.caption || '[Image]';    mediaUrl = waMsg.image?.id;    break;
    case 'audio':    content = '[Voice message]';                     mediaUrl = waMsg.audio?.id;    break;
    case 'video':    content = waMsg.video?.caption || '[Video]';    mediaUrl = waMsg.video?.id;    break;
    case 'document': content = waMsg.document?.filename || '[Document]'; mediaUrl = waMsg.document?.id; break;
    case 'sticker':  content = '[Sticker]'; break;
    case 'location': content = `[Location: ${waMsg.location?.latitude}, ${waMsg.location?.longitude}]`; break;
    case 'interactive':
      content = waMsg.interactive?.button_reply?.title || waMsg.interactive?.list_reply?.title || '[Interactive]';
      break;
    default: content = `[${type}]`;
  }
  return { type, content, mediaUrl };
};

const isWithin24HourWindow = (conversation) => {
  if (!conversation.session_expires_at) return false;
  return new Date(conversation.session_expires_at) > new Date();
};

module.exports = { processWebhookEvent };
