const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const { query } = require('../config/database');
const whatsappService = require('../services/whatsappService');
const { authenticateToken } = require('../middleware/auth');
const axios = require('axios');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => { cb(null, true); }
});

const WA_BASE = () => `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
const WA_HEADERS = () => ({ Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, 'Content-Type': 'application/json' });

// ── POST /api/rich/send/:conversationId ──────────────────────
// Unified send: text, image, video, audio, document, location,
//               interactive_buttons, interactive_list, template
router.post('/send/:conversationId', authenticateToken, async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { type = 'text', ...body } = req.body;

    const convRes = await query(
      `SELECT conv.*, ct.phone_number FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id WHERE conv.id = $1`,
      [conversationId]
    );
    if (!convRes.rows.length) return res.status(404).json({ error: 'Conversation not found' });
    const conv = convRes.rows[0];
    const to   = conv.phone_number;

    let payload;

    if (type === 'text') {
      payload = { messaging_product:'whatsapp', to, type:'text', text:{ body: body.text, preview_url: false } };

    } else if (type === 'image') {
      const imgObj = body.media_id ? { id: body.media_id, caption: body.caption||'' } : { link: body.media_url, caption: body.caption||'' };
      payload = { messaging_product:'whatsapp', to, type:'image', image: imgObj };

    } else if (type === 'video') {
      const vidObj = body.media_id ? { id: body.media_id, caption: body.caption||'' } : { link: body.media_url, caption: body.caption||'' };
      payload = { messaging_product:'whatsapp', to, type:'video', video: vidObj };

    } else if (type === 'audio') {
      const audObj = body.media_id ? { id: body.media_id } : { link: body.media_url };
      payload = { messaging_product:'whatsapp', to, type:'audio', audio: audObj };

    } else if (type === 'document') {
      const docObj = body.media_id ? { id: body.media_id, caption: body.caption||'', filename: body.filename||'document.pdf' } : { link: body.media_url, caption: body.caption||'', filename: body.filename||'document.pdf' };
      payload = { messaging_product:'whatsapp', to, type:'document', document: docObj };

    } else if (type === 'location') {
      payload = { messaging_product:'whatsapp', to, type:'location', location:{ latitude: body.latitude, longitude: body.longitude, name: body.name||'', address: body.address||'' } };

    } else if (type === 'interactive_buttons') {
      if (!body.buttons?.length || body.buttons.length > 3) return res.status(400).json({ error: '1-3 buttons required' });
      payload = {
        messaging_product:'whatsapp', to, type:'interactive',
        interactive:{
          type:'button',
          ...(body.header && { header:{ type:'text', text:body.header } }),
          body:{ text: body.text },
          ...(body.footer && { footer:{ text:body.footer } }),
          action:{ buttons: body.buttons.map((b,i) => ({ type:'reply', reply:{ id: b.id||`btn_${i}`, title: b.title } })) }
        }
      };

    } else if (type === 'interactive_list') {
      if (!body.sections?.length) return res.status(400).json({ error: 'sections required' });
      payload = {
        messaging_product:'whatsapp', to, type:'interactive',
        interactive:{
          type:'list',
          ...(body.header && { header:{ type:'text', text:body.header } }),
          body:{ text: body.text },
          ...(body.footer && { footer:{ text:body.footer } }),
          action:{ button: body.button_label||'Choose option', sections: body.sections }
        }
      };

    } else if (type === 'template') {
      payload = {
        messaging_product:'whatsapp', to, type:'template',
        template:{ name: body.template_name, language:{ code: body.language||'en' }, components: body.components||[] }
      };

    } else {
      return res.status(400).json({ error: `Unsupported type: ${type}` });
    }

    // Send to WhatsApp
    const waRes = await axios.post(`${WA_BASE()}/messages`, payload, { headers: WA_HEADERS() });
    const waMessageId = waRes.data?.messages?.[0]?.id;

    // Save to DB
    const content = body.text || body.caption || body.template_name || body.media_url || type;
    const dbType = (type === 'interactive_buttons' || type === 'interactive_list') ? 'interactive' : type;
    const msgRes  = await query(
      `INSERT INTO messages
         (conversation_id, wa_message_id, direction, type, message_type, content,
          media_url, media_caption, interactive_data, template_name,
          location_lat, location_lng, location_name, status, sent_by)
       VALUES ($1,$2,'outgoing',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'sent',$13) RETURNING *`,
      [
        conversationId, waMessageId, dbType, dbType, content,
        body.local_url || body.media_url || null,
        body.caption   || null,
        (body.buttons || body.sections) ? JSON.stringify(body) : null,
        body.template_name || null,
        body.latitude  || null,
        body.longitude || null,
        body.name      || null,
        req.user?.id   || null,
      ]
    );

    await query(`UPDATE conversations SET last_message_at=NOW(), automation_enabled=false WHERE id=$1`, [conversationId]);

    const io = req.app.get('io');
    if (io) io.emit('new_message', { message: msgRes.rows[0], conversationId });

    res.json({ success: true, message: msgRes.rows[0], wa_message_id: waMessageId });
  } catch (err) {
    const metaErr = err.response?.data?.error?.message;
    if (metaErr) return res.status(400).json({ error: metaErr });
    next(err);
  }
});

// ── POST /api/rich/media/upload ──────────────────────────────
router.post('/media/upload', authenticateToken, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Save file locally for display
    const fs = require('fs');
    const path = require('path');
    const uploadDir = process.env.UPLOAD_DIR || '/tmp/uploads';
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    const ext = path.extname(req.file.originalname) || '.bin';
    const localName = `${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;
    const localPath = path.join(uploadDir, localName);
    fs.writeFileSync(localPath, req.file.buffer);
    const localUrl = `/api/rich/files/${localName}`;

    // Upload to WhatsApp
    const FormData = require('form-data');
    const form = new FormData();
    form.append('messaging_product', 'whatsapp');
    form.append('file', req.file.buffer, { filename: req.file.originalname, contentType: req.file.mimetype });

    const uploadRes = await axios.post(
      `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/media`,
      form,
      { headers: { ...form.getHeaders(), Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}` } }
    );

    const wa_media_id = uploadRes.data?.id;

    await query(
      `INSERT INTO media_uploads (filename, mime_type, size_bytes, storage_url, wa_media_id)
       VALUES ($1,$2,$3,$4,$5)`,
      [req.file.originalname, req.file.mimetype, req.file.size, localUrl, wa_media_id]
    );

    res.json({ wa_media_id, local_url: localUrl, filename: req.file.originalname, mime_type: req.file.mimetype });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/rich/files/:filename ── serve uploaded files (public - random filenames)
router.get('/files/:filename', (req, res) => {
  const path = require('path');
  const fs   = require('fs');
  const dir  = process.env.UPLOAD_DIR || '/tmp/uploads';
  const file = path.join(dir, path.basename(req.params.filename));
  if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(file);
});

module.exports = router;
