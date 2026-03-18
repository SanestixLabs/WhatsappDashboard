const express = require('express');
const router  = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const shopifyService = require('../services/shopifyService');

// ═══════════════════════════════════════════════════════
// PUBLIC — Shopify webhook receiver
// POST /api/shopify/webhook/:workspaceId
// ═══════════════════════════════════════════════════════
router.post('/webhook/:workspaceId',
  express.raw({ type: '*/*' }),
  async (req, res) => {
    const { workspaceId } = req.params;
    const topic = req.headers['x-shopify-topic'];

    try {
      // Get integration config
      const config = await shopifyService.getIntegration(workspaceId);
      if (!config) {
        return res.status(404).json({ error: 'Integration not found' });
      }

      // Parse body
      const rawBody = Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body));

      const order = JSON.parse(rawBody.toString('utf8'));
      const waPhoneId = config.wa_phone_number_id;

      console.log(`[Shopify] Received topic: ${topic} order: #${order.order_number}`);

      // Respond immediately to Shopify
      res.status(200).json({ received: true });

      // Process async
      if (topic === 'orders/create') {
        await shopifyService.handleOrderCreated(workspaceId, order, waPhoneId);
      } else if (topic === 'orders/fulfilled') {
        await shopifyService.handleOrderFulfilled(workspaceId, order, waPhoneId);
      } else if (topic === 'orders/cancelled') {
        await shopifyService.handleOrderCancelled(workspaceId, order, waPhoneId);
      } else {
        await shopifyService.logDelivery(workspaceId, topic, order, 'ignored', false, 'Unhandled topic');
      }

    } catch (err) {
      console.error('[Shopify] Webhook error:', err.message);
      if (!res.headersSent) res.status(500).json({ error: 'Internal error' });
    }
  }
);

// ═══════════════════════════════════════════════════════
// PRIVATE — Webhook delivery logs
// GET /api/shopify/logs
// ═══════════════════════════════════════════════════════
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const limit  = parseInt(req.query.limit) || 20;
    const status = req.query.status;
    let q = `SELECT id, event, status, wa_sent, error_message, created_at
             FROM webhook_deliveries
             WHERE workspace_id = $1 AND provider = 'shopify'`;
    const params = [workspaceId];
    if (status) { q += ` AND status = $2`; params.push(status); }
    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    const { rows } = await pool.query(q, params);
    res.json({ logs: rows });
  } catch (err) {
    console.error('[Shopify] Logs error:', err.message);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// ═══════════════════════════════════════════════════════
// PRIVATE — Connect manually (Option A)
// POST /api/shopify/connect
// ═══════════════════════════════════════════════════════
router.post('/connect', authenticateToken, async (req, res) => {
  try {
    const { shop_domain, access_token, webhook_secret, wa_phone_number_id } = req.body;
    const workspaceId = req.user.workspace_id;
    if (!shop_domain || !access_token || !webhook_secret || !wa_phone_number_id) {
      return res.status(400).json({ error: 'All fields required' });
    }
    const config = { shop_domain, access_token, webhook_secret, wa_phone_number_id };
    await pool.query(
      `INSERT INTO integrations (workspace_id, provider, config, is_active)
       VALUES ($1, 'shopify', $2, true)
       ON CONFLICT (workspace_id, provider)
       DO UPDATE SET config = $2, is_active = true, updated_at = NOW()`,
      [workspaceId, JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save' });
  }
});


// ═══════════════════════════════════════════════════════
// PRIVATE — Get Shopify message templates
// GET /api/shopify/templates
// ═══════════════════════════════════════════════════════
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.workspaceId;
    const names = ['shopify_order_confirmed', 'shopify_order_shipped', 'shopify_order_cancelled'];
    const { rows } = await pool.query(
      `SELECT id, name, body, variables, updated_at FROM message_templates
       WHERE workspace_id = $1 AND name = ANY($2)`,
      [workspaceId, names]
    );
    res.json({ templates: rows });
  } catch (err) {
    console.error('[Shopify] templates error:', err.message);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// ═══════════════════════════════════════════════════════
// PRIVATE — Update a Shopify message template
// PUT /api/shopify/templates/:name
// ═══════════════════════════════════════════════════════
router.put('/templates/:name', authenticateToken, async (req, res) => {
  try {
    const workspaceId = req.workspaceId;
    const { name } = req.params;
    const allowed = ['shopify_order_confirmed', 'shopify_order_shipped', 'shopify_order_cancelled'];
    if (!allowed.includes(name)) return res.status(400).json({ error: 'Invalid template name' });
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'Body is required' });
    const { rows } = await pool.query(
      `UPDATE message_templates SET body = $1, updated_at = NOW()
       WHERE workspace_id = $2 AND name = $3
       RETURNING id, name, body, updated_at`,
      [body.trim(), workspaceId, name]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Template not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[Shopify] update template error:', err.message);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

module.exports = router;
