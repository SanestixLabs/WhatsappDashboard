const crypto = require('crypto');
const { pool } = require('../config/database');
const { sendDirectWA, sendConfirmationButtons, sendOrderConfirmationSmart, normalizePhone } = require('./shopifyWaSender');

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
    `SELECT config, shop_domain FROM integrations
     WHERE workspace_id = $1 AND provider = 'shopify' AND is_active = true`,
    [workspaceId]
  );
  if (!rows[0]) return null;
  return { ...rows[0].config, shop_domain: rows[0].shop_domain };
}

// ── Log webhook delivery ──────────────────────────────────────────
async function logDelivery(workspaceId, event, payload, status, waSent, errorMsg) {
  try {
    await pool.query(
      `INSERT INTO webhook_deliveries (workspace_id, provider, event, payload, status, wa_sent, error_message)
       VALUES ($1, 'shopify', $2, $3, $4, $5, $6)`,
      [workspaceId, event, JSON.stringify(payload), status, waSent, errorMsg || null]
    );
  } catch (e) {
    console.error('[Shopify] logDelivery error:', e.message);
  }
}

// ── Format items list ─────────────────────────────────────────────
function formatItems(lineItems) {
  if (!lineItems || !lineItems.length) return 'your items';
  return lineItems.map(i => `• ${i.title} x${i.quantity}`).join('\n');
}

// ── Format currency ───────────────────────────────────────────────
function formatTotal(price, currency) {
  return `${currency || 'PKR'} ${Number(price || 0).toLocaleString()}`;
}

// ── Get phone from order ──────────────────────────────────────────
function getPhone(order) {
  return (
    order.phone ||
    order.billing_address?.phone ||
    order.shipping_address?.phone ||
    order.customer?.phone ||
    null
  );
}

// ── Upsert contact ────────────────────────────────────────────────
async function upsertContact(workspaceId, phone, name) {
  const { rows } = await pool.query(
    `INSERT INTO contacts (workspace_id, phone_number, name)
     VALUES ($1, $2, $3)
     ON CONFLICT (phone_number, workspace_id) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [workspaceId, normalizePhone(phone), name || 'Shopify Customer']
  );
  return rows[0].id;
}

// ── Handle orders/create ──────────────────────────────────────────
async function handleOrderCreated(workspaceId, order) {
  const phone = getPhone(order);
  if (!phone) {
    console.log(`[Shopify] Order #${order.order_number} — no phone`);
    return { sent: false, error: 'No phone number in order' };
  }

  const customerName = order.customer?.first_name || 'Customer';
  const orderNumber  = order.order_number;
  const total        = formatTotal(order.total_price, order.currency);
  const itemsText    = formatItems(order.line_items);

  try {
    // 1. Upsert contact
    const contactId = await upsertContact(workspaceId, phone, customerName);

    // 2. Sync order to DB
    const { rows: orderRows } = await pool.query(
      `INSERT INTO orders
         (workspace_id, contact_id, shopify_order_id, order_number, status, source,
          items, total_amount, currency)
       VALUES ($1, $2, $3, $4, 'pending_confirmation', 'shopify', $5, $6, $7)
       ON CONFLICT (shopify_order_id) DO UPDATE
         SET status = 'pending_confirmation', updated_at = NOW()
       RETURNING id`,
      [
        workspaceId, contactId,
        String(order.id), String(orderNumber),
        JSON.stringify(order.line_items || []),
        order.total_price || 0,
        order.currency || 'PKR',
      ]
    );
    const orderId = orderRows[0]?.id;

    // 3. Get or create conversation for this contact
    let conversation;
    const { rows: existingConv } = await pool.query(
      `SELECT * FROM conversations WHERE contact_id = $1 AND status = 'open'
       ORDER BY created_at DESC LIMIT 1`,
      [contactId]
    );
    if (existingConv[0]) {
      conversation = existingConv[0];
      await pool.query(
        `UPDATE conversations SET session_expires_at = NOW() + INTERVAL '24 hours', updated_at = NOW() WHERE id = $1`,
        [conversation.id]
      );
    } else {
      const { rows: newConv } = await pool.query(
        `INSERT INTO conversations (workspace_id, contact_id, status, automation_enabled, session_expires_at)
         VALUES ($1, $2, 'open', false, NOW() + INTERVAL '24 hours') RETURNING *`,
        [workspaceId, contactId]
      );
      conversation = newConv[0];
    }

    // 4. Send interactive confirmation buttons
    const waResult = await sendOrderConfirmationSmart(phone, orderNumber, total, itemsText);
    const waMessageId = waResult?.messages?.[0]?.id || null;

    // 5. Save outbound message to DB so it appears in chat window
    const msgBody = `🛍️ Order #${orderNumber}\nItems: ${itemsText}\nTotal: ${total}\n\nPlease confirm your order.`;
    await pool.query(
      `INSERT INTO messages
         (conversation_id, wa_message_id, direction, type, content, status, timestamp)
       VALUES ($1, $2, 'outgoing', 'interactive', $3, 'sent', NOW())
       ON CONFLICT (wa_message_id) DO NOTHING`,
      [conversation.id, waMessageId || `shopify_${orderNumber}_${Date.now()}`, msgBody]
    );

    // 6. Save pending confirmation record
    await pool.query(
      `INSERT INTO order_confirmations
         (workspace_id, order_id, shopify_order_id, order_number, phone, status, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'pending', NOW() + INTERVAL '1 hour')
       ON CONFLICT DO NOTHING`,
      [workspaceId, orderId, String(order.id), String(orderNumber), normalizePhone(phone)]
    );

    console.log(`[Shopify] ✅ Order #${orderNumber} — confirmation buttons sent to ${phone}`);
    return { sent: true };
  } catch (err) {
    console.error(`[Shopify] handleOrderCreated error:`, err.message);
    return { sent: false, error: err.message };
  }
}

// ── Handle orders/fulfilled (shipped) ────────────────────────────
async function handleOrderFulfilled(workspaceId, order) {
  const phone = getPhone(order);
  if (!phone) return { sent: false, error: 'No phone number in order' };

  const customerName   = order.customer?.first_name || 'Customer';
  const orderNumber    = order.order_number;
  const trackingNumber = order.fulfillments?.[0]?.tracking_number || null;
  const trackingUrl    = order.fulfillments?.[0]?.tracking_url || null;
  const trackingLine   = trackingNumber
    ? `*Tracking:* ${trackingNumber}${trackingUrl ? `\n${trackingUrl}` : ''}\n`
    : '';

  const message = `📦 *Your Order Has Shipped!*\n\nHi ${customerName}, great news!\n\n*Order:* #${orderNumber}\n${trackingLine}*Status:* Out for delivery 🚚\n\nYou'll receive it soon. Thank you!`;

  try {
    // Update order tracking in DB
    if (trackingNumber) {
      await pool.query(
        `UPDATE orders SET tracking_number = $1, tracking_url = $2, status = 'shipped', updated_at = NOW()
         WHERE shopify_order_id = $3 AND workspace_id = $4`,
        [trackingNumber, trackingUrl, String(order.id), workspaceId]
      );
    }
    await sendDirectWA(phone, message);
    console.log(`[Shopify] ✅ Order #${orderNumber} — shipped WA sent to ${phone}`);
    return { sent: true };
  } catch (err) {
    console.error('[Shopify] handleOrderFulfilled error:', err.message);
    return { sent: false, error: err.message };
  }
}

// ── Handle orders/cancelled ───────────────────────────────────────
async function handleOrderCancelled(workspaceId, order) {
  const phone = getPhone(order);
  if (!phone) return { sent: false, error: 'No phone number in order' };

  const customerName = order.customer?.first_name || 'Customer';
  const orderNumber  = order.order_number;
  const total        = formatTotal(order.total_price, order.currency);

  const message = `❌ *Order Cancelled*\n\nHi ${customerName}, your order #${orderNumber} has been cancelled.\n\n*Refund:* ${total}\nRefunds are processed within 5-7 business days.\n\nQuestions? Reply to this message anytime.`;

  try {
    await pool.query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW()
       WHERE shopify_order_id = $1 AND workspace_id = $2`,
      [String(order.id), workspaceId]
    );
    await sendDirectWA(phone, message);
    console.log(`[Shopify] ✅ Order #${orderNumber} — cancelled WA sent to ${phone}`);
    return { sent: true };
  } catch (err) {
    console.error('[Shopify] handleOrderCancelled error:', err.message);
    return { sent: false, error: err.message };
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
