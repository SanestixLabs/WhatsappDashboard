const express = require('express');
const axios   = require('axios');
const { query } = require('../config/database');
const router  = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { conversationId, templateId, variables } = req.body;
    if (!conversationId || !templateId) return res.status(400).json({ error: 'conversationId and templateId required' });

    const convRes = await query(
      'SELECT conv.*, ct.phone_number FROM conversations conv JOIN contacts ct ON ct.id=conv.contact_id WHERE conv.id=$1',
      [conversationId]
    );
    if (!convRes.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convRes.rows[0];

    const tplRes = await query('SELECT * FROM message_templates WHERE id=$1', [templateId]);
    if (!tplRes.rows.length) return res.status(404).json({ error: 'Template not found' });
    const tpl = tplRes.rows[0];

    // Build components with variable substitution
    const components = [];
    if (Object.keys(variables||{}).length > 0) {
      const params = Object.values(variables).map(v => ({ type:'text', text: v }));
      components.push({ type:'body', parameters: params });
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: conv.phone_number,
      type: 'template',
      template: {
        name: tpl.name.toLowerCase().replace(/\s+/g,'_'),
        language: { code: tpl.language },
        components: components.length ? components : undefined,
      }
    };

    const sendRes = await axios.post(
      'https://graph.facebook.com/' + process.env.WHATSAPP_API_VERSION + '/' + process.env.WHATSAPP_PHONE_NUMBER_ID + '/messages',
      payload,
      { headers: { Authorization: 'Bearer ' + process.env.WHATSAPP_ACCESS_TOKEN, 'Content-Type':'application/json' } }
    );

    const waMessageId = sendRes.data?.messages?.[0]?.id;
    let bodyText = tpl.body;
    if (variables) {
      Object.values(variables).forEach((v,i) => { bodyText = bodyText.replace('{{' + (i+1) + '}}', v); });
    }

    const result = await query(
      'INSERT INTO messages (conversation_id, wa_message_id, direction, type, content, status) VALUES ($1,$2,$2,$3,$4,$5,$6) RETURNING *',
      [conversationId, waMessageId, 'outgoing', 'template', bodyText, 'sent']
    );

    await query('UPDATE conversations SET last_message_at=NOW() WHERE id=$1', [conversationId]);
    res.json(result.rows[0]);
  } catch(err) {
    const metaError = err.response?.data?.error?.message;
    if (metaError) return res.status(400).json({ error: metaError });
    next(err);
  }
});

module.exports = router;
