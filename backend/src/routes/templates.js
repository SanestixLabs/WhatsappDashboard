const express = require('express');
const axios   = require('axios');
const { query } = require('../config/database');
const router  = express.Router();

const WA_URL   = () => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}`;
const WABA_ID  = () => process.env.META_WABA_ID;
const WA_TOKEN = () => process.env.WHATSAPP_ACCESS_TOKEN;

// GET /api/templates
router.get('/', async (req, res, next) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await query(
      'SELECT * FROM message_templates WHERE workspace_id=$1 ORDER BY created_at DESC',
      [workspaceId]
    );
    res.json(result.rows);
  } catch(err) { next(err); }
});

// POST /api/templates — create + submit to Meta
router.post('/', async (req, res, next) => {
  try {
    const { name, category, language, header_type, header_text, body, footer, variables } = req.body;
    if (!name || !body) return res.status(400).json({ error: 'name and body required' });
    const workspaceId = req.user.workspace_id;

    const components = [];
    if (header_text) components.push({ type: 'HEADER', format: header_type || 'TEXT', text: header_text });
    components.push({ type: 'BODY', text: body });
    if (footer) components.push({ type: 'FOOTER', text: footer });

    let metaId = null, status = 'draft', metaError = null;
    try {
      const metaRes = await axios.post(
        `${WA_URL()}/${WABA_ID()}/message_templates`,
        { name: name.toLowerCase().replace(/\s+/g, '_'), category: category || 'MARKETING', language: language || 'en', components },
        { headers: { Authorization: `Bearer ${WA_TOKEN()}`, 'Content-Type': 'application/json' } }
      );
      metaId = metaRes.data.id;
      status = metaRes.data.status || 'pending';
    } catch(e) {
      metaError = e.response?.data?.error?.message || e.message;
      console.error('Meta template error:', metaError);
    }

    const result = await query(
      `INSERT INTO message_templates (name,category,language,header_type,header_text,body,footer,variables,meta_template_id,status,workspace_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [name, category || 'MARKETING', language || 'en', header_type || null, header_text || null,
       body, footer || null, JSON.stringify(variables || []), metaId, status, workspaceId]
    );

    res.json({ ...result.rows[0], meta_error: metaError });
  } catch(err) { next(err); }
});

// POST /api/templates/sync — pull ALL templates from Meta and upsert locally
router.post('/sync', async (req, res, next) => {
  try {
    const workspaceId = req.user.workspace_id;
    const metaRes = await axios.get(
      `${WA_URL()}/${WABA_ID()}/message_templates?limit=100&fields=id,name,status,category,language,components`,
      { headers: { Authorization: `Bearer ${WA_TOKEN()}` } }
    );

    const templates = metaRes.data.data || [];
    let synced = 0, imported = 0;

    for (const t of templates) {
      const bodyComp   = t.components?.find(c => c.type === 'BODY');
      const headerComp = t.components?.find(c => c.type === 'HEADER');
      const footerComp = t.components?.find(c => c.type === 'FOOTER');

      const bodyText   = bodyComp?.text || '';
      const headerText = headerComp?.text || null;
      const footerText = footerComp?.text || null;
      const lang       = Array.isArray(t.language) ? t.language[0] : (t.language || 'en');

      const existing = await query(
        'SELECT id FROM message_templates WHERE meta_template_id=$1 AND workspace_id=$2',
        [t.id, workspaceId]
      );

      if (existing.rows.length) {
        await query(
          `UPDATE message_templates SET status=$1, name=$2, category=$3, language=$4,
           header_text=$5, body=$6, footer=$7, updated_at=NOW() WHERE meta_template_id=$8 AND workspace_id=$9`,
          [t.status.toLowerCase(), t.name, t.category, lang, headerText, bodyText, footerText, t.id, workspaceId]
        );
        synced++;
      } else {
        await query(
          `INSERT INTO message_templates (name, category, language, header_text, body, footer, meta_template_id, status, workspace_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT DO NOTHING`,
          [t.name, t.category, lang, headerText, bodyText || '(synced from Meta)', footerText, t.id, t.status.toLowerCase(), workspaceId]
        );
        imported++;
      }
    }

    res.json({ success: true, total: templates.length, synced, imported });
  } catch(err) {
    console.error('Sync error:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.error?.message || err.message });
  }
});

// DELETE /api/templates/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const workspaceId = req.user.workspace_id;
    const t = await query(
      'SELECT * FROM message_templates WHERE id=$1 AND workspace_id=$2',
      [req.params.id, workspaceId]
    );
    if (!t.rows.length) return res.status(404).json({ error: 'Not found' });
    if (t.rows[0].meta_template_id) {
      try {
        await axios.delete(
          `${WA_URL()}/${WABA_ID()}/message_templates?name=${t.rows[0].name}`,
          { headers: { Authorization: `Bearer ${WA_TOKEN()}` } }
        );
      } catch(e) { console.error('Meta delete error:', e.response?.data); }
    }
    await query('DELETE FROM message_templates WHERE id=$1 AND workspace_id=$2', [req.params.id, workspaceId]);
    res.json({ success: true });
  } catch(err) { next(err); }
});

module.exports = router;
