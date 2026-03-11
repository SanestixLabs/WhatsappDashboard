const express = require('express');
const { query } = require('../config/database');
const router  = express.Router();

// GET /api/segments
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`SELECT s.*, u.name as created_by_name FROM segments s LEFT JOIN users u ON s.created_by=u.id ORDER BY s.created_at DESC`);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /api/segments
router.post('/', async (req, res, next) => {
  try {
    const { name, description, filter_type, filter_tags } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    // Count contacts matching this segment
    let count = 0;
    if (filter_type === 'all') {
      const r = await query(`SELECT COUNT(*) FROM contacts WHERE opted_out=false`);
      count = parseInt(r.rows[0].count);
    } else if (filter_type === 'tag' && filter_tags?.length) {
      const r = await query(`SELECT COUNT(*) FROM contacts WHERE tags && $1 AND opted_out=false`, [filter_tags]);
      count = parseInt(r.rows[0].count);
    }

    const result = await query(
      `INSERT INTO segments (name, description, filter_type, filter_tags, contact_count, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, description, filter_type || 'tag', filter_tags || [], count, req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/segments/:id/contacts — preview contacts in segment
router.get('/:id/contacts', async (req, res, next) => {
  try {
    const seg = await query(`SELECT * FROM segments WHERE id=$1`, [req.params.id]);
    if (!seg.rows.length) return res.status(404).json({ error: 'Not found' });
    const s = seg.rows[0];

    let contacts;
    if (s.filter_type === 'all') {
      contacts = await query(`SELECT id, phone_number, name, tags FROM contacts WHERE opted_out=false ORDER BY name`);
    } else {
      contacts = await query(`SELECT id, phone_number, name, tags FROM contacts WHERE tags && $1 AND opted_out=false ORDER BY name`, [s.filter_tags]);
    }

    // Update count
    await query(`UPDATE segments SET contact_count=$1 WHERE id=$2`, [contacts.rows.length, req.params.id]);
    res.json({ contacts: contacts.rows, total: contacts.rows.length });
  } catch (err) { next(err); }
});

// DELETE /api/segments/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM segments WHERE id=$1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
