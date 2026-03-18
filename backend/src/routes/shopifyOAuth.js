const express = require('express');
const router  = express.Router();
const crypto  = require('crypto');
const { authenticateToken } = require('../middleware/auth');
const shopifyOAuth = require('../services/shopifyOAuthService');

// In-memory nonce store (state → workspaceId)
const pendingStates = new Map();

// ═══════════════════════════════════════════════════════
// STEP 1 — Start OAuth flow
// GET /api/shopify/oauth/install?shop=mystore.myshopify.com
// Called from Sanestix dashboard — user must be logged in
// ═══════════════════════════════════════════════════════
router.get('/install', authenticateToken, (req, res) => {
  const { shop } = req.query;

  if (!shop || !shop.includes('.myshopify.com')) {
    return res.status(400).json({ error: 'Valid shop domain required (e.g. mystore.myshopify.com)' });
  }

  const workspaceId = req.user.workspace_id;
  const state = crypto.randomBytes(16).toString('hex');

  // Store state → workspaceId mapping (expires in 10 mins)
  pendingStates.set(state, { workspaceId, shop });
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

  const installUrl = shopifyOAuth.buildInstallUrl(shop, state);
  console.log(`[Shopify OAuth] Install started: ${shop} workspace=${workspaceId}`);

  res.json({ install_url: installUrl });
});

// ═══════════════════════════════════════════════════════
// STEP 2 — Shopify redirects back here after approval
// GET /api/shopify/oauth/callback?code=...&hmac=...&state=...&shop=...
// Public route — no auth (Shopify calls this)
// ═══════════════════════════════════════════════════════
router.get('/callback', async (req, res) => {
  const { shop, code, state, hmac } = req.query;

  try {
    // 1. Verify HMAC signature from Shopify
    if (!shopifyOAuth.verifyHmac(req.query)) {
      console.warn(`[Shopify OAuth] Invalid HMAC for shop ${shop}`);
      return res.status(401).send('Invalid HMAC signature');
    }

    // 2. Verify state matches what we sent
    const pending = pendingStates.get(state);
    if (!pending) {
      console.warn(`[Shopify OAuth] Unknown or expired state: ${state}`);
      return res.status(400).send('Invalid or expired state. Please try connecting again.');
    }
    pendingStates.delete(state);

    const { workspaceId } = pending;

    // 3. Exchange code for access token
    const { access_token, scope } = await shopifyOAuth.exchangeCodeForToken(shop, code);
    console.log(`[Shopify OAuth] Token received for ${shop}`);

    // 4. Save integration to DB
    await shopifyOAuth.saveIntegration(workspaceId, shop, access_token, scope);
    console.log(`[Shopify OAuth] Integration saved for workspace ${workspaceId}`);

    // 5. Auto-register webhooks on the shop
    await shopifyOAuth.registerWebhooks(shop, access_token, workspaceId);
    console.log(`[Shopify OAuth] Webhooks registered for ${shop}`);

    // 6. Redirect to dashboard success page
    const frontendUrl = process.env.FRONTEND_URL || 'https://flow.sanestix.com';
    res.redirect(`${frontendUrl}/settings/integrations?shopify=connected&shop=${shop}`);

  } catch (err) {
    console.error('[Shopify OAuth] Callback error:', err.message);
    const frontendUrl = process.env.FRONTEND_URL || 'https://flow.sanestix.com';
    res.redirect(`${frontendUrl}/settings/integrations?shopify=error&message=${encodeURIComponent(err.message)}`);
  }
});

// ═══════════════════════════════════════════════════════
// GET /api/shopify/oauth/status
// Check if current workspace has Shopify connected
// ═══════════════════════════════════════════════════════
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const workspaceId = req.user.workspace_id;

    const { rows } = await pool.query(
      `SELECT id, shop_domain, scope, is_active, created_at, updated_at
       FROM integrations
       WHERE workspace_id = $1 AND provider = 'shopify'`,
      [workspaceId]
    );

    if (!rows[0]) {
      return res.json({ connected: false });
    }

    res.json({
      connected:   rows[0].is_active,
      shop_domain: rows[0].shop_domain,
      scope:       rows[0].scope,
      created_at:  rows[0].created_at,
      updated_at:  rows[0].updated_at,
    });
  } catch (err) {
    console.error('[Shopify OAuth] Status error:', err.message);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// ═══════════════════════════════════════════════════════
// DELETE /api/shopify/oauth/disconnect
// Disconnect Shopify from current workspace
// ═══════════════════════════════════════════════════════
router.delete('/disconnect', authenticateToken, async (req, res) => {
  try {
    const { pool } = require('../config/database');
    const workspaceId = req.user.workspace_id;

    await pool.query(
      `UPDATE integrations SET is_active = false, updated_at = NOW()
       WHERE workspace_id = $1 AND provider = 'shopify'`,
      [workspaceId]
    );

    res.json({ success: true, message: 'Shopify disconnected successfully' });
  } catch (err) {
    console.error('[Shopify OAuth] Disconnect error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

module.exports = router;
