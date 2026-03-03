const express = require('express');
const { query } = require('../config/database');
const router  = express.Router();

// GET /api/conversations — list with pagination
router.get('/', async (req, res, next) => {
  try {
    const { status = 'open', page = 1, limit = 25, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereClause = 'WHERE conv.status = $1';
    const params = [status, parseInt(limit), offset];

    if (search) {
      whereClause += ` AND (ct.name ILIKE $4 OR ct.phone_number ILIKE $4)`;
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT
         conv.id,
         conv.status,
         conv.automation_enabled,
         conv.unread_count,
         conv.last_message_at,
         conv.session_expires_at,
         conv.updated_at,
         ct.id         AS contact_id,
         ct.phone_number,
         ct.name       AS contact_name,
         ct.profile_pic_url,
         lm.content    AS last_message,
         lm.direction  AS last_message_direction,
         lm.type       AS last_message_type
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       LEFT JOIN LATERAL (
         SELECT content, direction, type
         FROM messages
         WHERE conversation_id = conv.id
         ORDER BY timestamp DESC
         LIMIT 1
       ) lm ON true
       ${whereClause}
       ORDER BY conv.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      params
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM conversations WHERE status = $1`,
      [status]
    );

    res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/conversations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         conv.*,
         ct.phone_number,
         ct.name AS contact_name,
         ct.profile_pic_url,
         ct.tags,
         ct.metadata AS contact_metadata
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       WHERE conv.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Reset unread count on open
    await query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [req.params.id]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/conversations/:id — update status / toggle automation
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, automation_enabled, assigned_to } = req.body;

    const updates = [];
    const params  = [];
    let idx = 1;

    if (status !== undefined)             { updates.push(`status = $${idx++}`);             params.push(status); }
    if (automation_enabled !== undefined) { updates.push(`automation_enabled = $${idx++}`); params.push(automation_enabled); }
    if (assigned_to !== undefined)        { updates.push(`assigned_to = $${idx++}`);         params.push(assigned_to); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(req.params.id);

    const result = await query(
      `UPDATE conversations SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    // Emit real-time update
    req.app.get('io').emit('conversation_updated', result.rows[0]);

    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
