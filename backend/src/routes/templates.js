const express = require('express');
const axios   = require('axios');
const { query } = require('../config/database');
const router  = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM message_templates ORDER BY created_at DESC');
    res.json(result.rows);
  } catch(err) { next(err); }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, category, language, header_type, header_text, body, footer, variables } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name and body required' });
    const components = [];
    if (header_text) components.push({ type:'HEADER', format: header_type||'TEXT', text: header_text });
    components.push({ type:'BODY', text: body });
    if (footer) components.push({ type:'FOOTER', text: footer });
    let metaId = null, status = 'draft';
    try {
      const metaRes = await axios.post(
        'https://graph.facebook.com/' + process.env.WHATSAPP_API_VERSION + '/' + process.env.META_WABA_ID + '/message_templates',
        { name: name.toLowerCase().replace(/\s+/g,'_'), category: category||'MARKETING', language: language||'en', components },
        { headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN, 'Content-Type':'application/json' } }
      );
      metaId = metaRes.data.id;
      status = metaRes.data.status || 'pending';
    } catch(e) {
      console.error('Meta error:', e.response?.data?.error?.message || e.message);
    }
    const result = await query(
      'INSERT INTO message_templates (name,category,language,header_type,header_text,body,footer,variables,meta_template_id,status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',
      [name, category||'MARKETING', language||'en', header_type||null, header_text||null, body, footer||null, JSON.stringify(variables||[]), metaId, status]
    );
    res.json(result.rows[0]);
  } catch(err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const t = await query('SELECT * FROM message_templates WHERE id=$1', [req.params.id]);
    if (!t.rows.length) return res.status(404).json({ error: 'Not found' });
    if (t.rows[0].meta_template_id) {
      try {
        await axios.delete(
          'https://graph.facebook.com/' + process.env.WHATSAPP_API_VERSION + '/' + process.env.META_WABA_ID + '/message_templates?name=' + t.rows[0].name,
          { headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN } }
        );
      } catch(e) { console.error('Meta delete error:', e.response?.data); }
    }
    await query('DELETE FROM message_templates WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch(err) { next(err); }
});

router.post('/sync', async (req, res, next) => {
  try {
    const metaRes = await axios.get(
      'https://graph.facebook.com/' + process.env.WHATSAPP_API_VERSION + '/' + process.env.META_WABA_ID + '/message_templates?limit=100',
      { headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN } }
    );
    const templates = metaRes.data.data || [];
    for (const t of templates) {
      await query('UPDATE message_templates SET status=$1 WHERE meta_template_id=$2', [t.status, t.id]);
    }
    res.json({ synced: templates.length });
  } catch(err) { next(err); }
});

module.exports = router;
