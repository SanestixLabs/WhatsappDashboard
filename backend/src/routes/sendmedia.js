const express   = require('express');
const multer    = require('multer');
const { query } = require('../config/database');
const whatsappService = require('../services/whatsappService');
const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 16 * 1024 * 1024 },
});

function convertToOgg(inputBuffer, inputExt) {
  const tmpIn  = path.join(os.tmpdir(), `voice_in_${Date.now()}.${inputExt}`);
  const tmpOut = path.join(os.tmpdir(), `voice_out_${Date.now()}.ogg`);
  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    execSync(`ffmpeg -y -i ${tmpIn} -c:a libopus -b:a 64k ${tmpOut}`, { stdio: 'ignore' });
    const outBuffer = fs.readFileSync(tmpOut);
    return outBuffer;
  } finally {
    try { fs.unlinkSync(tmpIn); } catch {}
    try { fs.unlinkSync(tmpOut); } catch {}
  }
}

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    const { conversationId } = req.body;
    if (!conversationId || !req.file) {
      return res.status(400).json({ error: 'conversationId and file are required' });
    }

    const convResult = await query(
      `SELECT conv.*, ct.phone_number, conv.session_expires_at
       FROM conversations conv
       JOIN contacts ct ON ct.id = conv.contact_id
       WHERE conv.id = $1`,
      [conversationId]
    );
    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    const conv = convResult.rows[0];
    const inWindow = conv.session_expires_at && new Date(conv.session_expires_at) > new Date();
    if (!inWindow) {
      return res.status(400).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    }

    // Convert audio to ogg/opus if needed (WhatsApp requires ogg)
    let fileBuffer  = req.file.buffer;
    let fileMime    = req.file.mimetype;
    let filename    = req.file.originalname;

    if (fileMime.startsWith('audio/') && !fileMime.includes('ogg')) {
      try {
        const ext = filename.split('.').pop() || 'webm';
        fileBuffer = convertToOgg(fileBuffer, ext);
        fileMime   = 'audio/ogg';
        filename   = filename.replace(/\.[^.]+$/, '.ogg');
      } catch (e) {
        console.error('ffmpeg conversion failed:', e.message);
        // proceed with original if conversion fails
      }
    }

    const message = await whatsappService.sendMediaMessage(
      conv.phone_number,
      fileBuffer,
      fileMime,
      filename,
      conversationId,
      req.app.get('io')
    );

    await query('UPDATE messages SET sent_by = $1 WHERE id = $2', [req.user.id, message.id]);
    await query('UPDATE conversations SET automation_enabled = false WHERE id = $1', [conversationId]);
    res.json(message);
  } catch (err) { next(err); }
});

module.exports = router;
