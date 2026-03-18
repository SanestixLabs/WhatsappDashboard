const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendDirectWA } = require('./shopifyWaSender');

// ── Verify Shopify HMAC ───────────────────────────────────────────
function verifyShopifyWebhook(rawBody, hmacHeader, secret) {
  try {
    const hash = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    const a = Buffer.from(hash);
    const b = Buffer.from(hmacHeader || '');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch (err) {
    console.error('[Shopify] HMAC error:', err.message);
    return false;
  }
}

// ── Get integration config ────────────────────────────────────────
async function getIntegration(workspaceId) {
  const { rows } = await pool.query(
    `SELECT config, shop_domain, scope, created_at FROM integrations
     WHERE workspace_id = $1 AND provider = 'shopify' AND is_active = true`,
    [workspaceId]
  );
  if (!rows[0]) return null;
  return { ...rows[0].config, shop_domain: rows[0].shop_domain, scope: rows[0].scope, created_at: rows[0].created_at };
}

// ── Log webhook delivery ──────────────────────────────────────────
async function logDelivery(workspaceId, event, payload, status, waSent, errorMsg) {
  try {
    await pool.query(
      `INSERT INTO webhook_deliveries (workspace_id, provider, event, payload, status, wa_sent, error_message)
       VALUES ($1, 'shopify', $2, $3, $4, $5, $6)`,
      [workspaceId, event, JSON.stringify(payload), status, waSent, errorMsg || null]
    );
  } catch (err) {
    console.error('[Shopify] logDelivery error:', err.message);
  }
}

// ── Get message template for an event ────────────────────────────
async function getTemplate(workspaceId, templateName) {
  try {
    const { rows } = await pool.query(
      `SELECT body FROM message_templates
       WHERE workspace_id = $1 AND name = $2 LIMIT 1`,
      [workspaceId, templateName]
    );
    return rows[0] ? rows[0].body : null;
  } catch (err) {
    console.error('[Shopify] getTemplate error:', err.message);
    return null;
  }
}

// ── Fill template variables ───────────────────────────────────────
function fillTemplate(template, vars) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] !== undefined ? vars[key] : '');
}

// ── Format money ──────────────────────────────────────────────────
function formatMoney(amount, currency) {
  return `${currency} ${parseFloat(amount).toFixed(2)}`;
}

// ── Extract phone from Shopify order ─────────────────────────────
function extractPhone(order) {
  return order.phone ||
    (order.billing_address  && order.billing_address.phone)  ||
    (order.shipping_address && order.shipping_address.phone) ||
    (order.customer && order.customer.phone) || null;
}

// ── Extract customer name ─────────────────────────────────────────
function extractName(order) {
  return (order.billing_address  && order.billing_address.first_name)  ||
         (order.shipping_address && order.shipping_address.first_name) ||
         (order.customer && order.customer.first_name) || 'Customer';
}

// ── Sync Shopify order into orders table ──────────────────────────
async function syncOrderToDB(workspaceId, order) {
  try {
    const phone = extractPhone(order);
    let contactId = null;

    if (phone) {
      const cleaned = phone.replace(/\D/g, '');
      const last9 = cleaned.slice(-9);
      const { rows: contacts } = await pool.query(
        `SELECT id FROM contacts
         WHERE workspace_id = $1 AND phone_number LIKE $2
         LIMIT 1`,
        [workspaceId, `%${last9}`]
      );
      contactId = contacts[0]?.id || null;
    }

    const items = (order.line_items || []).map(i => ({
      name:  i.name,
      qty:   i.quantity,
      price: parseFloat(i.price)
    }));

    const tracking    = order.fulfillments?.[0]?.tracking_number || null;
    const trackingUrl = order.fulfillments?.[0]?.tracking_url    || null;
    const shopifyId   = String(order.id);

    const orderStatus =
      order.cancelled_at        ? 'cancelled' :
      order.fulfillment_status === 'fulfilled' ? 'shipped' : 'confirmed';

    await pool.query(
      `INSERT INTO orders
         (workspace_id, contact_id, items, total_amount, currency, status,
          shopify_order_id, tracking_number, tracking_url, source, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'shopify', $10)
       ON CONFLICT (shopify_order_id) DO UPDATE SET
         status          = EXCLUDED.status,
         tracking_number = COALESCE(EXCLUDED.tracking_number, orders.tracking_number),
         tracking_url    = COALESCE(EXCLUDED.tracking_url,    orders.tracking_url),
         updated_at      = NOW()`,
      [
        workspaceId,
        contactId,
        JSON.stringify(items),
        parseFloat(order.total_price),
        order.currency,
        orderStatus,
        shopifyId,
        tracking,
        trackingUrl,
        `Shopify Order #${order.order_number}`
      ]
    );
    console.log(`[Shopify] ✅ Order #${order.order_number} synced to DB (contact: ${contactId || 'none'})`);
  } catch (err) {
    console.error('[Shopify] syncOrderToDB error:', err.message);
    // Don't rethrow — sync failure should not block WA send
  }
}

// ── Handle orders/create ──────────────────────────────────────────
async function handleOrderCreated(workspaceId, order, waPhoneId) {
  try {
    await syncOrderToDB(workspaceId, order);

    const customerPhone = extractPhone(order);
    if (!customerPhone) {
      await logDelivery(workspaceId, 'orders/create', order, 'skipped', false, 'No phone number in order');
      return;
    }

    const template  = await getTemplate(workspaceId, 'shopify_order_confirmed');
    const itemsList = (order.line_items || []).map(i => `• ${i.name} x${i.quantity}`).join('\n');

    const message = template
      ? fillTemplate(template, {
          customer_name: extractName(order),
          order_number:  String(order.order_number),
          items_list:    itemsList,
          total:         formatMoney(order.total_price, order.currency),
        })
      : `🛍️ Order #${order.order_number} confirmed!\n\nItems:\n${itemsList}\n\nTotal: ${formatMoney(order.total_price, order.currency)}`;

    const phone = customerPhone.replace(/\D/g, '');
    await sendDirectWA(phone, message);
    await logDelivery(workspaceId, 'orders/create', order, 'processed', true, null);
    console.log(`[Shopify] ✅ Order #${order.order_number} — WA sent to ${phone}`);
  } catch (err) {
    await logDelivery(workspaceId, 'orders/create', order, 'failed', false, err.message);
    console.error('[Shopify] handleOrderCreated error:', err.message);
  }
}

// ── Handle orders/fulfilled ───────────────────────────────────────
async function handleOrderFulfilled(workspaceId, order, waPhoneId) {
  try {
    await syncOrderToDB(workspaceId, order);

    const customerPhone = extractPhone(order);
    if (!customerPhone) {
      await logDelivery(workspaceId, 'orders/fulfilled', order, 'skipped', false, 'No phone number');
      return;
    }

    const template     = await getTemplate(workspaceId, 'shopify_order_shipped');
    const tracking     = order.fulfillments?.[0];
    const trackingLine = tracking?.tracking_number
      ? `*Tracking:* ${tracking.tracking_number}\n` : '';

    const message = template
      ? fillTemplate(template, {
          customer_name: extractName(order),
          order_number:  String(order.order_number),
          tracking_line: trackingLine,
        })
      : `📦 Order #${order.order_number} shipped!\n${trackingLine}`;

    const phone = customerPhone.replace(/\D/g, '');
    await sendDirectWA(phone, message);
    await logDelivery(workspaceId, 'orders/fulfilled', order, 'processed', true, null);
    console.log(`[Shopify] ✅ Order #${order.order_number} fulfilled — WA sent to ${phone}`);
  } catch (err) {
    await logDelivery(workspaceId, 'orders/fulfilled', order, 'failed', false, err.message);
    console.error('[Shopify] handleOrderFulfilled error:', err.message);
  }
}

// ── Handle orders/cancelled ───────────────────────────────────────
async function handleOrderCancelled(workspaceId, order, waPhoneId) {
  try {
    await syncOrderToDB(workspaceId, order);

    const customerPhone = extractPhone(order);
    if (!customerPhone) {
      await logDelivery(workspaceId, 'orders/cancelled', order, 'skipped', false, 'No phone number');
      return;
    }

    const template = await getTemplate(workspaceId, 'shopify_order_cancelled');
    const message  = template
      ? fillTemplate(template, {
          customer_name: extractName(order),
          order_number:  String(order.order_number),
          total:         formatMoney(order.total_price, order.currency),
        })
      : `❌ Order #${order.order_number} cancelled.\nRefund: ${formatMoney(order.total_price, order.currency)}`;

    const phone = customerPhone.replace(/\D/g, '');
    await sendDirectWA(phone, message);
    await logDelivery(workspaceId, 'orders/cancelled', order, 'processed', true, null);
    console.log(`[Shopify] ✅ Order #${order.order_number} cancelled — WA sent to ${phone}`);
  } catch (err) {
    await logDelivery(workspaceId, 'orders/cancelled', order, 'failed', false, err.message);
    console.error('[Shopify] handleOrderCancelled error:', err.message);
  }
}

module.exports = {
  verifyShopifyWebhook,
  getIntegration,
  logDelivery,
  handleOrderCreated,
  handleOrderFulfilled,
  handleOrderCancelled,
};
