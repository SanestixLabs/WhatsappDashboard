const express = require('express');
const multer  = require('multer');
const { query } = require('../config/database');
const axios   = require('axios');
const router  = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 },
});

router.post('/', upload.single('sticker'), async (req, res, next) => {
  try {
    const { conversationId, stickerId } = req.body;
    if (!conversationId) return res.status(400).json({ error: 'conversationId required' });

    const convResult = await query(
      `SELECT conv.*, ct.phone_number, conv.session_expires_at
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       WHERE conv.id = $1`,
      [conversationId]
    );
    if (convResult.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convResult.rows[0];
    const inWindow = conv.session_expires_at && new Date(conv.session_expires_at) > new Date();
    if (!inWindow) return res.status(400).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });

    let finalStickerId = stickerId;

    if (req.file) {
      const FormData = require('form-data');
      const uploadForm = new FormData();
      uploadForm.append('messaging_product', 'whatsapp');
      uploadForm.append('file', req.file.buffer, { filename: 'sticker.webp', contentType: 'image/webp' });
      const uploadRes = await axios.post(
        `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
        uploadForm,
        { headers: { ...uploadForm.getHeaders(), Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
      );
      finalStickerId = uploadRes.data.id;
    }

    if (!finalStickerId) return res.status(400).json({ error: 'stickerId or sticker file required' });

    const sendRes = await axios.post(
      `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: conv.phone_number,
        type: 'sticker',
        sticker: { id: finalStickerId },
      },
      { headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' } }
    );

    const waMessageId = sendRes.data?.messages?.[0]?.id;
    const result = await query(
      `INSERT INTO messages (conversation_id, wa_message_id, direction, type, content, media_url, status)
       VALUES ($1, $2, 'outgoing', 'sticker', '[Sticker]', $3, 'sent') RETURNING *`,
      [conversationId, waMessageId, finalStickerId]
    );
    await query('UPDATE messages SET sent_by = $1 WHERE id = $2', [req.user.id, result.rows[0].id]);
    await query('UPDATE conversations SET last_message_at = NOW(), automation_enabled = false WHERE id = $1', [conversationId]);

    res.json(result.rows[0]);
  } catch (err) {
    const metaError = err.response?.data?.error?.message;
    if (metaError) return res.status(400).json({ error: metaError });
    next(err);
  }
});

module.exports = router;
