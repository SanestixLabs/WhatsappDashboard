const express = require('express');
const { query } = require('../config/database');
const router  = express.Router();

// GET /api/contacts
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let where = '';
    const params = [parseInt(limit), offset];

    if (search) {
      where = 'WHERE name ILIKE $3 OR phone_number ILIKE $3';
      params.push(`%${search}%`);
    }

    const result = await query(
      `SELECT * FROM contacts ${where} ORDER BY last_message_at DESC NULLS LAST LIMIT $1 OFFSET $2`,
      params
    );

    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM contacts WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/contacts/:id — update name/tags
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, tags } = req.body;

    const result = await query(
      `UPDATE contacts SET
         name = COALESCE($1, name),
         tags = COALESCE($2, tags),
         updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [name, tags, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;
