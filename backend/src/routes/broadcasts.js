const express = require('express');
const { query } = require('../config/database');
const axios   = require('axios');
const router  = express.Router();

const WA_API_URL  = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}`;
const WA_TOKEN    = process.env.WHATSAPP_ACCESS_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;

// GET /api/broadcasts
router.get('/', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT b.*, u.name as created_by_name, s.name as segment_name
      FROM broadcasts b
      LEFT JOIN users u ON b.created_by=u.id
      LEFT JOIN segments s ON b.segment_id=s.id
      ORDER BY b.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// GET /api/broadcasts/:id
router.get('/:id', async (req, res, next) => {
  try {
    const b = await query(`
      SELECT b.*, u.name as created_by_name, s.name as segment_name
      FROM broadcasts b
      LEFT JOIN users u ON b.created_by=u.id
      LEFT JOIN segments s ON b.segment_id=s.id
      WHERE b.id=$1`, [req.params.id]);
    if (!b.rows.length) return res.status(404).json({ error: 'Not found' });

    const recipients = await query(
      `SELECT br.*, c.name as contact_name FROM broadcast_recipients br
       JOIN contacts c ON br.contact_id=c.id
       WHERE br.broadcast_id=$1 ORDER BY br.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    res.json({ ...b.rows[0], recipients: recipients.rows });
  } catch (err) { next(err); }
});

// POST /api/broadcasts — create
router.post('/', async (req, res, next) => {
  try {
    const { name, template_name, template_lang, template_vars, segment_id, target_tags, target_all, scheduled_at } = req.body;
    if (!name || !template_name) return res.status(400).json({ error: 'name and template_name required' });

    const result = await query(
      `INSERT INTO broadcasts (name, template_name, template_lang, template_vars, segment_id, target_tags, target_all, scheduled_at, status, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [name, template_name, template_lang || 'en', JSON.stringify(template_vars || []),
       segment_id || null, target_tags || [], target_all || false,
       scheduled_at || null, scheduled_at ? 'scheduled' : 'draft', req.user?.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/broadcasts/:id/send — send now
router.post('/:id/send', async (req, res, next) => {
  try {
    const b = await query(`SELECT * FROM broadcasts WHERE id=$1`, [req.params.id]);
    if (!b.rows.length) return res.status(404).json({ error: 'Not found' });
    const broadcast = b.rows[0];

    if (['sending','sent'].includes(broadcast.status))
      return res.status(400).json({ error: 'Already sent or sending' });

    // Resolve contacts
    let contacts = [];
    if (broadcast.target_all) {
      const r = await query(`SELECT id, phone_number FROM contacts WHERE opted_out=false`);
      contacts = r.rows;
    } else if (broadcast.segment_id) {
      const seg = await query(`SELECT * FROM segments WHERE id=$1`, [broadcast.segment_id]);
      if (seg.rows[0]?.filter_type === 'all') {
        const r = await query(`SELECT id, phone_number FROM contacts WHERE opted_out=false`);
        contacts = r.rows;
      } else {
        const r = await query(`SELECT id, phone_number FROM contacts WHERE tags && $1 AND opted_out=false`, [seg.rows[0].filter_tags]);
        contacts = r.rows;
      }
    } else if (broadcast.target_tags?.length) {
      const r = await query(`SELECT id, phone_number FROM contacts WHERE tags && $1 AND opted_out=false`, [broadcast.target_tags]);
      contacts = r.rows;
    }

    if (!contacts.length) return res.status(400).json({ error: 'No contacts in target audience' });

    // Insert recipients
    await query(`DELETE FROM broadcast_recipients WHERE broadcast_id=$1`, [broadcast.id]);
    for (const c of contacts) {
      await query(
        `INSERT INTO broadcast_recipients (broadcast_id, contact_id, phone_number) VALUES ($1,$2,$3)`,
        [broadcast.id, c.id, c.phone_number]
      );
    }

    // Mark as sending
    await query(`UPDATE broadcasts SET status='sending', started_at=NOW(), total_recipients=$1 WHERE id=$2`,
      [contacts.length, broadcast.id]);

    // Respond immediately, process async
    res.json({ success: true, total_recipients: contacts.length, message: 'Broadcast started' });

    // Async send
    setImmediate(() => processBroadcast(broadcast, contacts));

  } catch (err) { next(err); }
});

// POST /api/broadcasts/:id/cancel
router.post('/:id/cancel', async (req, res, next) => {
  try {
    await query(`UPDATE broadcasts SET status='cancelled', updated_at=NOW() WHERE id=$1 AND status IN ('draft','scheduled')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// DELETE /api/broadcasts/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await query(`DELETE FROM broadcasts WHERE id=$1 AND status IN ('draft','cancelled')`, [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

// Internal: process broadcast sending with rate limiting
async function processBroadcast(broadcast, contacts) {
  let sent = 0, failed = 0;
  const vars = broadcast.template_vars || [];
  // Lookup actual language from message_templates table
  const tmplRow = await query('SELECT language FROM message_templates WHERE name=$1 ORDER BY created_at DESC LIMIT 1', [broadcast.template_name]);
  const tmplLang = tmplRow.rows[0]?.language || broadcast.template_lang || 'en';

  for (const contact of contacts) {
    try {
      const components = vars.length ? [{
        type: 'body',
        parameters: vars.map(v => ({ type: 'text', text: v }))
      }] : [];

      const response = await axios.post(
        `${WA_API_URL}/${WA_PHONE_ID}/messages`,
        {
          messaging_product: 'whatsapp',
          to: contact.phone_number,
          type: 'template',
          template: {
            name: broadcast.template_name,
            language: { code: tmplLang },
            components
          }
        },
        { headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' } }
      );

      const waId = response.data?.messages?.[0]?.id;
      await query(
        `UPDATE broadcast_recipients SET status='sent', wa_message_id=$1, sent_at=NOW() WHERE broadcast_id=$2 AND contact_id=$3`,
        [waId, broadcast.id, contact.id]
      );
      sent++;
    } catch (err) {
      const errMsg = err.response?.data?.error?.message || err.message;
      await query(
        `UPDATE broadcast_recipients SET status='failed', error_message=$1 WHERE broadcast_id=$2 AND contact_id=$3`,
        [errMsg, broadcast.id, contact.id]
      );
      failed++;
    }

    // Rate limit: 80 messages/min = ~750ms per message
    await new Promise(r => setTimeout(r, 750));
  }

  await query(
    `UPDATE broadcasts SET status='sent', completed_at=NOW(), sent_count=$1, failed_count=$2, updated_at=NOW() WHERE id=$3`,
    [sent, failed, broadcast.id]
  );
}

module.exports = router;
