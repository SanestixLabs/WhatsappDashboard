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

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 25, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    let where = '';
    const params = [parseInt(limit), offset];
    if (search) { where = 'WHERE name ILIKE $3 OR phone_number ILIKE $3'; params.push('%' + search + '%'); }
    const result = await query('SELECT * FROM contacts ' + where + ' ORDER BY last_message_at DESC NULLS LAST LIMIT $1 OFFSET $2', params);
    res.json(result.rows);
  } catch(err) { next(err); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM contacts WHERE id=$1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch(err) { next(err); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { name, tags, email, address, notes } = req.body;
    const result = await query(
      'UPDATE contacts SET name=COALESCE($1,name), tags=COALESCE($2,tags), email=COALESCE($3,email), address=COALESCE($4,address), notes=COALESCE($5,notes), updated_at=NOW() WHERE id=$6 RETURNING *',
      [name, tags, email, address, notes, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch(err) { next(err); }
});

router.post('/:id/avatar', upload.single('avatar'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file' });
    const url = '/uploads/avatars/' + req.file.filename;
    const result = await query('UPDATE contacts SET profile_pic_url=$1, updated_at=NOW() WHERE id=$2 RETURNING *', [url, req.params.id]);
    res.json(result.rows[0]);
  } catch(err) { next(err); }
});

module.exports = router;
