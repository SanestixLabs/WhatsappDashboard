const express = require('express');
const { body, validationResult } = require('express-validator');
const { query }          = require('../config/database');
const whatsappService    = require('../services/whatsappService');
const { messageSendLimiter } = require('../middleware/rateLimiter');
const router  = express.Router();

// GET /api/messages/:conversationId — paginated message history
router.get('/:conversationId', async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await query(
      `SELECT
         m.*,
         u.name AS sent_by_name
       FROM messages m
       LEFT JOIN users u ON u.id = m.sent_by
       WHERE m.conversation_id = $1
       ORDER BY m.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [req.params.conversationId, parseInt(limit), offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM messages WHERE conversation_id = $1',
      [req.params.conversationId]
    );

    res.json({
      messages: result.rows.reverse(), // chronological order
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// POST /api/messages/send — manual agent send
router.post('/send', messageSendLimiter,
  body('conversationId').isUUID(),
  body('text').isString().trim().isLength({ min: 1, max: 4096 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { conversationId, text } = req.body;

      // Get contact phone number
      const convResult = await query(
        `SELECT conv.*, ct.phone_number, conv.session_expires_at
         FROM conversations conv
         JOIN contacts ct ON ct.id = conv.contact_id
         WHERE conv.id = $1`,
        [conversationId]
      );

      if (convResult.rows.length === 0) {
        return res.status(404).json({ error: 'Conversation not found' });
      }

      const conv = convResult.rows[0];

      // Check 24-hour window for text messages
      const inWindow = conv.session_expires_at && new Date(conv.session_expires_at) > new Date();
      if (!inWindow) {
        return res.status(400).json({
          error: 'Outside 24-hour session window. Use a template message instead.',
          code: 'SESSION_EXPIRED',
        });
      }

      const message = await whatsappService.sendTextMessage(
        conv.phone_number,
        text,
        conversationId,
        req.app.get('io')
      );

      // Tag as manual send
      await query('UPDATE messages SET sent_by = $1 WHERE id = $2', [req.user.id, message.id]);

      // Disable automation when agent takes over
      await query(
        'UPDATE conversations SET automation_enabled = false WHERE id = $1',
        [conversationId]
      );

      res.json(message);
    } catch (err) { next(err); }
  }
);

module.exports = router;
