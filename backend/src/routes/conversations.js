const express = require('express');
const { query } = require('../config/database');
const router  = express.Router();

// GET /api/conversations
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
      `SELECT conv.id, conv.status, conv.automation_enabled, conv.unread_count,
         conv.last_message_at, conv.session_expires_at, conv.updated_at, conv.assigned_to,
         ct.id AS contact_id, ct.phone_number, ct.name AS contact_name, ct.profile_pic_url,
         lm.content AS last_message, lm.direction AS last_message_direction, lm.type AS last_message_type
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       LEFT JOIN LATERAL (
         SELECT content, direction, type FROM messages
         WHERE conversation_id = conv.id ORDER BY timestamp DESC LIMIT 1
       ) lm ON true
       ${whereClause}
       ORDER BY conv.last_message_at DESC NULLS LAST
       LIMIT $2 OFFSET $3`,
      params
    );
    const countResult = await query(
      `SELECT COUNT(*) FROM conversations WHERE status = $1`, [status]
    );
    res.json({
      conversations: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) { next(err); }
});

// GET /api/conversations/queue/list
router.get('/queue/list', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT conv.id, conv.status, conv.unread_count, conv.last_message_at, conv.created_at,
         ct.phone_number, ct.name AS contact_name, ct.profile_pic_url
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       WHERE conv.assigned_to IS NULL AND conv.status = 'open'
       ORDER BY conv.last_message_at DESC NULLS LAST`
    );
    res.json({ queue: result.rows, total: result.rows.length });
  } catch (err) { next(err); }
});

// GET /api/conversations/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT conv.*, ct.phone_number, ct.name AS contact_name,
         ct.profile_pic_url, ct.tags, ct.metadata AS contact_metadata
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       WHERE conv.id = $1`,
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    await query('UPDATE conversations SET unread_count = 0 WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/conversations/:id/contact
router.get('/:id/contact', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT ct.* FROM contacts ct JOIN conversations conv ON conv.contact_id=ct.id WHERE conv.id=$1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Contact not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/conversations/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { status, automation_enabled, assigned_to } = req.body;
    const updates = [];
    const params  = [];
    let idx = 1;
    if (status !== undefined)             { updates.push(`status = $${idx++}`);             params.push(status); }
    if (automation_enabled !== undefined) { updates.push(`automation_enabled = $${idx++}`); params.push(automation_enabled); }
    if (assigned_to !== undefined)        { updates.push(`assigned_to = $${idx++}`);        params.push(assigned_to); }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    params.push(req.params.id);
    const result = await query(
      `UPDATE conversations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    req.app.get('io').emit('conversation_updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/claim
router.post('/:id/claim', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE conversations SET assigned_to = $1, updated_at = NOW()
       WHERE id = $2 AND assigned_to IS NULL RETURNING *`,
      [req.user.id, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(409).json({ error: 'Already claimed or not found' });
    }
    req.app.get('io').emit('conversation_claimed', {
      conversationId: req.params.id, agentId: req.user.id
    });
    res.json({ message: 'Conversation claimed', conversation: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/transfer
router.post('/:id/transfer', async (req, res, next) => {
  try {
    const { agent_id, note } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
    const agentCheck = await query(
      `SELECT id, name FROM users WHERE id = $1 AND is_active = true`, [agent_id]
    );
    if (agentCheck.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    const result = await query(
      `UPDATE conversations
       SET assigned_to = $1, transferred_from = $2,
           transfer_note = $3, transferred_at = NOW(), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [agent_id, req.user.id, note || null, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'conversation.transferred', 'conversation', $2, $3)`,
      [req.user.id, req.params.id, JSON.stringify({ to: agent_id, note })]
    );
    req.app.get('io').emit('conversation_transferred', {
      conversationId: req.params.id,
      fromAgentId: req.user.id,
      toAgentId: agent_id,
      toAgentName: agentCheck.rows[0].name,
    });
    res.json({ message: 'Conversation transferred', conversation: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/conversations/:id/assign
router.post('/:id/assign', async (req, res, next) => {
  try {
    const { agent_id } = req.body;
    if (!agent_id) return res.status(400).json({ error: 'agent_id required' });
    const agentCheck = await query(
      `SELECT id, name FROM users WHERE id = $1 AND is_active = true`, [agent_id]
    );
    if (agentCheck.rows.length === 0) return res.status(404).json({ error: 'Agent not found' });
    const result = await query(
      `UPDATE conversations SET assigned_to = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [agent_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    req.app.get('io').emit('conversation_assigned', {
      conversationId: req.params.id,
      agentId: agent_id,
      agentName: agentCheck.rows[0].name,
    });
    res.json({ message: 'Conversation assigned', conversation: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
