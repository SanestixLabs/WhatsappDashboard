const express = require('express');
const { query } = require('../config/database');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const router  = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = '/app/uploads/avatars';
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => cb(null, req.params.id + path.extname(file.originalname)),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// GET /api/contacts — list with search, tag filter, pagination + total count
router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search, tag, opted_out } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const params = [];
    const conditions = ['workspace_id = $' + (params.length + 1)];
    params.push(req.workspaceId);

    if (search) {
      params.push('%' + search + '%');
      conditions.push(`(name ILIKE $${params.length} OR phone_number ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (tag) {
      params.push(tag);
      conditions.push(`$${params.length} = ANY(tags)`);
    }
    if (opted_out !== undefined) {
      params.push(opted_out === 'true');
      conditions.push(`opted_out = $${params.length}`);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countResult = await query(`SELECT COUNT(*) FROM contacts ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit), offset);
    const result = await query(
      `SELECT * FROM contacts ${where} ORDER BY last_message_at DESC NULLS LAST LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ contacts: result.rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) { next(err); }
});

// GET /api/contacts/tags — all unique tags
router.get('/tags', async (req, res, next) => {
  try {
    
    const tagsResult = await query(`SELECT DISTINCT unnest(tags) as tag FROM contacts WHERE workspace_id = $1 AND tags != '{}' ORDER BY tag`, [req.workspaceId]);
    res.json(tagsResult.rows.map(r => r.tag));
  } catch (err) { next(err); }
});

// GET /api/contacts/export — CSV export
router.get('/export', async (req, res, next) => {
  try {
    const { tag } = req.query;
    let sql = 'SELECT phone_number, name, email, tags, notes, opted_out, created_at FROM contacts WHERE workspace_id = $1';
    const params = [req.workspaceId];
    if (tag) { params.push(tag); sql += ` AND $2 = ANY(tags)`; }
    sql += ' ORDER BY created_at DESC';
    const result = await query(sql, params);

    const header = 'phone_number,name,email,tags,notes,opted_out,created_at\n';
    const rows = result.rows.map(r =>
      [r.phone_number, r.name || '', r.email || '',
       (r.tags || []).join(';'), (r.notes || '').replace(/,/g, ' '),
       r.opted_out, r.created_at].map(v => `"${v}"`).join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="contacts.csv"');
    res.send(header + rows);
  } catch (err) { next(err); }
});

// POST /api/contacts/import — CSV import
router.post('/import', async (req, res, next) => {
  try {
    const { contacts } = req.body; // array of { phone_number, name, email, tags }
    if (!Array.isArray(contacts) || !contacts.length)
      return res.status(400).json({ error: 'contacts array required' });

    let imported = 0, skipped = 0;
    for (const c of contacts) {
      if (!c.phone_number) { skipped++; continue; }
      const tags = Array.isArray(c.tags) ? c.tags : (c.tags ? c.tags.split(';') : []);
      await query(
        `INSERT INTO contacts (phone_number, name, email, tags, workspace_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (phone_number, workspace_id) DO UPDATE
         SET name=COALESCE(EXCLUDED.name, contacts.name),
             email=COALESCE(EXCLUDED.email, contacts.email),
             tags=CASE WHEN EXCLUDED.tags != '{}' THEN EXCLUDED.tags ELSE contacts.tags END,
             updated_at=NOW()`,
        [c.phone_number.trim(), c.name || null, c.email || null, tags, req.workspaceId]
      );
      imported++;
    }
    res.json({ imported, skipped });
  } catch (err) { next(err); }
});


// POST /api/contacts — create single contact manually
router.post('/', async (req, res, next) => {
  try {
    const { phone_number, name, email, tags, notes } = req.body;
    if (!phone_number) return res.status(400).json({ error: 'phone_number required' });
    const tagArr = Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t=>t.trim()).filter(Boolean) : []);
    const result = await query(
      `INSERT INTO contacts (phone_number, name, email, tags, notes, workspace_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (phone_number, workspace_id) DO UPDATE
       SET name=COALESCE(EXCLUDED.name, contacts.name),
           email=COALESCE(EXCLUDED.email, contacts.email),
           tags=CASE WHEN EXCLUDED.tags != '{}' THEN EXCLUDED.tags ELSE contacts.tags END,
           notes=COALESCE(EXCLUDED.notes, contacts.notes),
           updated_at=NOW()
       RETURNING *`,
      [phone_number.trim(), name || null, email || null, tagArr, notes || null, req.workspaceId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// GET /api/contacts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM conversations WHERE contact_id = c.id) as conversation_count,
        (SELECT COUNT(*) FROM messages m JOIN conversations cv ON m.conversation_id=cv.id WHERE cv.contact_id=c.id) as message_count
      FROM contacts c WHERE c.id=$1 AND c.workspace_id=$2`, [req.params.id, req.workspaceId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /api/contacts/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { name, tags, email, notes, custom_fields, opted_out } = req.body;
    const result = await query(
      `UPDATE contacts SET
        name=COALESCE($1,name),
        tags=COALESCE($2,tags),
        email=COALESCE($3,email),
        notes=COALESCE($4,notes),
        custom_fields=COALESCE($5,custom_fields),
        opted_out=COALESCE($6,opted_out),
        opted_out_at=CASE WHEN $6=true AND opted_out=false THEN NOW() ELSE opted_out_at END,
        updated_at=NOW()
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [name, tags, email, notes, custom_fields ? JSON.stringify(custom_fields) : null, opted_out, req.params.id, req.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/contacts/:id/tags — add tags
router.post('/:id/tags', async (req, res, next) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) return res.status(400).json({ error: 'tags array required' });
    const result = await query(
      `UPDATE contacts SET tags = array(SELECT DISTINCT unnest(tags || $1::text[])), updated_at=NOW() WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [tags, req.params.id, req.workspaceId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/contacts/:id/tags — remove a tag
router.delete('/:id/tags/:tag', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE contacts SET tags = array_remove(tags, $1), updated_at=NOW() WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [req.params.tag, req.params.id, req.workspaceId]
    );
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/contacts/:id/avatar
router.post('/:id/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = '/uploads/avatars/' + req.file.filename;
    const result = await query('UPDATE contacts SET profile_pic_url=$1, updated_at=NOW() WHERE id=$2 AND workspace_id=$3 RETURNING *', [url, req.params.id, req.workspaceId]);
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

module.exports = router;

// DELETE /api/contacts/:id — permanently delete a contact
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      `DELETE FROM contacts WHERE id=$1 AND workspace_id=$2 RETURNING id`,
      [req.params.id, req.workspaceId]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) { next(err); }
});
