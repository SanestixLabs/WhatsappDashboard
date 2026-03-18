const crypto = require('crypto');
const axios  = require('axios');
const { pool } = require('../config/database');

const SHOPIFY_API_KEY    = process.env.SHOPIFY_API_KEY;
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
const SHOPIFY_SCOPES     = process.env.SHOPIFY_SCOPES;
const SHOPIFY_APP_URL    = process.env.SHOPIFY_APP_URL;
const WA_PHONE_ID        = process.env.WHATSAPP_PHONE_NUMBER_ID;

// ── Generate OAuth install URL ────────────────────────────────────
function buildInstallUrl(shop, state) {
  const redirectUri = `${SHOPIFY_APP_URL}/api/shopify/oauth/callback`;
  return `https://${shop}/admin/oauth/authorize?` +
    `client_id=${SHOPIFY_API_KEY}&` +
    `scope=${SHOPIFY_SCOPES}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `state=${state}`;
}

// ── Verify HMAC from Shopify ──────────────────────────────────────
function verifyHmac(query) {
  const { hmac, ...rest } = query;
  const message = Object.keys(rest)
    .sort()
    .map(k => `${k}=${rest[k]}`)
    .join('&');
  const digest = crypto
    .createHmac('sha256', SHOPIFY_API_SECRET)
    .update(message)
    .digest('hex');
  return digest === hmac;
}

// ── Exchange code for access token ────────────────────────────────
async function exchangeCodeForToken(shop, code) {
  const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
    client_id:     SHOPIFY_API_KEY,
    client_secret: SHOPIFY_API_SECRET,
    code,
  });
  return response.data; // { access_token, scope }
}

// ── Register webhooks on the shop ─────────────────────────────────
async function registerWebhooks(shop, accessToken, workspaceId) {
  const webhookUrl = `${SHOPIFY_APP_URL}/api/shopify/webhook/${workspaceId}`;
  const topics = ['orders/create', 'orders/fulfilled', 'orders/cancelled'];

  for (const topic of topics) {
    try {
      await axios.post(
        `https://${shop}/admin/api/2026-01/webhooks.json`,
        {
          webhook: {
            topic,
            address: webhookUrl,
            format:  'json',
          },
        },
        {
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(`[Shopify OAuth] Webhook registered: ${topic} → ${webhookUrl}`);
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      console.error(`[Shopify OAuth] Failed to register ${topic}:`, msg);
    }
  }
}

// ── Save integration to DB ────────────────────────────────────────
async function saveIntegration(workspaceId, shop, accessToken, scope) {
  const config = {
    shop_domain:       shop,
    access_token:      accessToken,
    webhook_secret:    SHOPIFY_API_SECRET,
    wa_phone_number_id: WA_PHONE_ID,
  };

  await pool.query(
    `INSERT INTO integrations
       (workspace_id, provider, shop_domain, config, scope, is_active)
     VALUES ($1, 'shopify', $2, $3, $4, true)
     ON CONFLICT (workspace_id, provider)
     DO UPDATE SET
       shop_domain = $2,
       config      = $3,
       scope       = $4,
       is_active   = true,
       updated_at  = NOW()`,
    [workspaceId, shop, JSON.stringify(config), scope]
  );
}

// ── Get all active integrations for a shop ────────────────────────
async function getIntegrationByShop(shop) {
  const { rows } = await pool.query(
    `SELECT * FROM integrations
     WHERE shop_domain = $1 AND provider = 'shopify' AND is_active = true`,
    [shop]
  );
  return rows[0] || null;
}

module.exports = {
  buildInstallUrl,
  verifyHmac,
  exchangeCodeForToken,
  registerWebhooks,
  saveIntegration,
  getIntegrationByShop,
};
