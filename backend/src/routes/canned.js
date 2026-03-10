const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');

// GET /api/canned?q=search
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    let sql = 'SELECT id, shortcut, content, created_at FROM canned_responses';
    const params = [];
    if (q) { sql += ' WHERE shortcut ILIKE $1 OR content ILIKE $1'; params.push(`%${q}%`); }
    sql += ' ORDER BY shortcut ASC';
    const result = await query(sql, params);
    res.json({ canned: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch canned responses' });
  }
});

// POST /api/canned
router.post('/', async (req, res) => {
  try {
    const { shortcut, content } = req.body;
    if (!shortcut || !content) return res.status(400).json({ error: 'shortcut and content required' });
    const result = await query(
      `INSERT INTO canned_responses (shortcut, content, created_by)
       VALUES ($1, $2, $3) RETURNING id, shortcut, content, created_at`,
      [shortcut.toLowerCase().trim(), content.trim(), req.user.id]
    );
    res.status(201).json({ canned: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Shortcut already exists' });
    res.status(500).json({ error: 'Failed to create' });
  }
});

// PUT /api/canned/:id
router.put('/:id', async (req, res) => {
  try {
    const { shortcut, content } = req.body;
    const result = await query(
      `UPDATE canned_responses SET shortcut = $1, content = $2
       WHERE id = $3 RETURNING id, shortcut, content, created_at`,
      [shortcut.toLowerCase().trim(), content.trim(), req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ canned: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Shortcut already exists' });
    res.status(500).json({ error: 'Failed to update' });
  }
});

// DELETE /api/canned/:id
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM canned_responses WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete' });
  }
});

module.exports = router;
