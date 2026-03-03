const axios  = require('axios');
const { query } = require('../config/database');

const BASE_URL = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;

const headers = () => ({
  Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Send a plain text message
 */
const sendTextMessage = async (to, text, conversationId, io) => {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: text },
  };

  return _sendMessage(payload, conversationId, 'text', text, null, io);
};

/**
 * Send a template message (for outside 24-hour window)
 */
const sendTemplateMessage = async (to, templateName, languageCode, components, conversationId, io) => {
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name:     templateName,
      language: { code: languageCode },
      components: components || [],
    },
  };

  return _sendMessage(payload, conversationId, 'template', `[Template: ${templateName}]`, null, io);
};

/**
 * Mark a message as read
 */
const markAsRead = async (waMessageId) => {
  try {
    await axios.post(`${BASE_URL}/messages`, {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: waMessageId,
    }, { headers: headers() });
  } catch (err) {
    console.error('[WhatsApp] Mark as read failed:', err.response?.data || err.message);
  }
};

/**
 * Internal send helper — posts to Meta API and stores in DB
 */
const _sendMessage = async (payload, conversationId, type, content, mediaUrl, io) => {
  try {
    const response = await axios.post(`${BASE_URL}/messages`, payload, { headers: headers() });
    const waMessageId = response.data.messages?.[0]?.id;

    // Get the conversation's contact for the phone number
    const convResult = await query(
      `SELECT c.id, ct.phone_number FROM conversations c
       JOIN contacts ct ON ct.id = c.contact_id
       WHERE c.id = $1`,
      [conversationId]
    );

    if (convResult.rows.length === 0) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    // Store outgoing message
    const msgResult = await query(
      `INSERT INTO messages (conversation_id, wa_message_id, direction, type, content, media_url, status)
       VALUES ($1, $2, 'outgoing', $3, $4, $5, 'sent') RETURNING *`,
      [conversationId, waMessageId, type, content, mediaUrl || null]
    );

    const message = msgResult.rows[0];

    // Emit real-time update
    if (io) {
      io.emit('new_message', { message, conversationId });
    }

    return message;
  } catch (err) {
    const errData = err.response?.data;
    console.error('[WhatsApp] Send failed:', errData || err.message);

    // Log failed message
    if (conversationId) {
      await query(
        `INSERT INTO messages (conversation_id, direction, type, content, status, error_data)
         VALUES ($1, 'outgoing', $2, $3, 'failed', $4)`,
        [conversationId, type, content, JSON.stringify(errData || { message: err.message })]
      );
    }

    throw err;
  }
};

module.exports = { sendTextMessage, sendTemplateMessage, markAsRead };
