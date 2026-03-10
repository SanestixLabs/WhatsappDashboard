const express = require('express');
const axios   = require('axios');
const router  = express.Router();

const WA_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
const ACCESS_TOKEN   = () => process.env.WHATSAPP_ACCESS_TOKEN;

router.get('/:mediaId', async (req, res, next) => {
  const { mediaId } = req.params;

  if (!mediaId || !/^[a-zA-Z0-9_-]+$/.test(mediaId)) {
    return res.status(400).json({ error: 'Invalid media ID' });
  }

  try {
    const metaRes = await axios.get(
      `https://graph.facebook.com/${WA_API_VERSION}/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
        timeout: 10_000,
      }
    );

    const downloadUrl = metaRes.data?.url;
    if (!downloadUrl) {
      return res.status(404).json({ error: 'Media URL not found' });
    }

    const mediaRes = await axios.get(downloadUrl, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN()}` },
      responseType: 'stream',
      timeout: 30_000,
    });

    const contentType = mediaRes.headers['content-type'] || 'audio/ogg; codecs=opus';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'private, max-age=3600');

    mediaRes.data.pipe(res);

    mediaRes.data.on('error', (streamErr) => {
      console.error('[Media proxy] Stream error:', streamErr.message);
      if (!res.headersSent) res.status(500).json({ error: 'Stream failed' });
    });

  } catch (err) {
    const status = err.response?.status || 500;
    const msg    = err.response?.data?.error?.message || err.message;
    console.error('[Media proxy] Error:', msg);
    if (!res.headersSent) res.status(status).json({ error: msg });
  }
});

module.exports = router;
