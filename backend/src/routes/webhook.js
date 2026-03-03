const express  = require('express');
const crypto   = require('crypto');
const router   = express.Router();
const { processWebhookEvent } = require('../services/webhookService');

// ── GET: Meta verification challenge ─────────────────────────
router.get('/', (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('[Webhook] Meta verification successful');
    return res.status(200).send(challenge);
  }

  console.warn('[Webhook] Verification failed');
  res.status(403).send('Forbidden');
});

// ── POST: Incoming WhatsApp events ───────────────────────────
router.post('/', verifyMetaSignature, async (req, res) => {
  // Always respond 200 immediately — Meta requires this
  res.status(200).send('EVENT_RECEIVED');

  try {
    const body = JSON.parse(req.body.toString());
    await processWebhookEvent(body, req.app.get('io'));
  } catch (err) {
    console.error('[Webhook] Processing error:', err);
  }
});

// ── Signature Verification Middleware ─────────────────────────
function verifyMetaSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];

  if (!signature) {
    console.warn('[Webhook] Missing signature header');
    return res.status(401).send('Missing signature');
  }

  const expectedSig = 'sha256=' + crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(req.body)
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    console.warn('[Webhook] Invalid signature');
    return res.status(401).send('Invalid signature');
  }

  next();
}

module.exports = router;
