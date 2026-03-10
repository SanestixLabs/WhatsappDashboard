const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');

// GET /api/notes/:conversationId
router.get('/:conversationId', async (req, res) => {
  try {
    const result = await query(
      `SELECT n.id, n.content, n.mentioned_users, n.created_at,
         u.name AS author_name, u.avatar_url AS author_avatar
       FROM conversation_notes n
       JOIN users u ON u.id = n.author_id
       WHERE n.conversation_id = $1
       ORDER BY n.created_at ASC`,
      [req.params.conversationId]
    );
    res.json({ notes: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/notes/:conversationId
router.post('/:conversationId', async (req, res) => {
  try {
    const { content, mentioned_users = [] } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });
    const result = await query(
      `INSERT INTO conversation_notes (conversation_id, author_id, content, mentioned_users)
       VALUES ($1, $2, $3, $4) RETURNING id, content, mentioned_users, created_at`,
      [req.params.conversationId, req.user.id, content.trim(), mentioned_users]
    );
    const note = result.rows[0];
    const io = req.app.get('io');
    if (io) io.emit('new_note', { conversationId: req.params.conversationId, note });
    await query(
      `INSERT INTO audit_logs (actor_id, action, target_type, target_id, metadata)
       VALUES ($1, 'note.added', 'conversation', $2, $3)`,
      [req.user.id, req.params.conversationId, JSON.stringify({ preview: content.substring(0, 50) })]
    );
    res.status(201).json({ note });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add note' });
  }
});

// DELETE /api/notes/:conversationId/:noteId
router.delete('/:conversationId/:noteId', async (req, res) => {
  try {
    const existing = await query(
      'SELECT id FROM conversation_notes WHERE id = $1 AND author_id = $2',
      [req.params.noteId, req.user.id]
    );
    if (!existing.rows[0]) return res.status(403).json({ error: 'Not found or not yours' });
    await query('DELETE FROM conversation_notes WHERE id = $1', [req.params.noteId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
