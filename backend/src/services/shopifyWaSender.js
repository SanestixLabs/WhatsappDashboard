const axios = require('axios');
const { pool } = require('../config/database');

// ── Normalize phone — add 92 prefix if starts with 0 ─────────────
function normalizePhone(phone) {
  let to = phone.replace(/\D/g, '');
  if (to.startsWith('0')) to = '92' + to.substring(1);
  return to;
}

// ── Base Meta API call ────────────────────────────────────────────
function getMetaConfig() {
  return {
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    token:   process.env.WHATSAPP_ACCESS_TOKEN,
    version: process.env.WHATSAPP_API_VERSION || 'v19.0',
  };
}

// ── Send plain text WA message ────────────────────────────────────
async function sendDirectWA(phone, message) {
  const { phoneId, token, version } = getMetaConfig();
  const to  = normalizePhone(phone);
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: message },
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log(`[Shopify WA] ✅ Text sent to ${to} — msgId: ${response.data.messages?.[0]?.id}`);
  return response.data;
}

// ── Send interactive YES/NO confirmation buttons (in-session) ─────
async function sendConfirmationButtons(phone, orderNumber, total, items) {
  const { phoneId, token, version } = getMetaConfig();
  const to  = normalizePhone(phone);
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  const itemsText = Array.isArray(items) ? items : (items || 'your items');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `🛍️ *New Order Received!*\n\nOrder: *#${orderNumber}*\nItems: ${itemsText}\nTotal: *${total}*\n\nPlease confirm your order:`,
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `shopify_confirm_${orderNumber}`, title: '✅ Confirm Order' } },
          { type: 'reply', reply: { id: `shopify_cancel_${orderNumber}`,  title: '❌ Cancel Order'  } },
        ],
      },
    },
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log(`[Shopify WA] ✅ Buttons sent to ${to} — order #${orderNumber}`);
  return response.data;
}

// ── Send Meta approved template (out-of-session) ──────────────────
// Template: shopify_order_confirmation (ID: 2338053690008028)
// Header {{1}} = order number
// Body {{1}} = customer name, {{2}} = items, {{3}} = total
// Buttons: Confirm Order / Cancel Order (QUICK_REPLY)
async function sendConfirmationTemplate(phone, orderNumber, customerName, items, total) {
  const { phoneId, token, version } = getMetaConfig();
  const to  = normalizePhone(phone);
  const url = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  const itemsText = Array.isArray(items)
    ? items.map(i => `• ${i.name || i.title} x${i.quantity || i.qty || 1}`).join('\n')
    : (items || 'your items');

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'template',
    template: {
      name:     'shopify_order_confirmation',
      language: { code: 'en' },
      components: [
        {
          type: 'header',
          parameters: [
            { type: 'text', text: String(orderNumber) },
          ],
        },
        {
          type: 'body',
          parameters: [
            { type: 'text', text: customerName || 'Customer' },
            { type: 'text', text: itemsText },
            { type: 'text', text: String(total) },
          ],
        },
        {
          type:     'button',
          sub_type: 'quick_reply',
          index:    '0',
          parameters: [
            { type: 'payload', payload: `shopify_confirm_${orderNumber}` },
          ],
        },
        {
          type:     'button',
          sub_type: 'quick_reply',
          index:    '1',
          parameters: [
            { type: 'payload', payload: `shopify_cancel_${orderNumber}` },
          ],
        },
      ],
    },
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log(`[Shopify WA] ✅ Template sent to ${to} — order #${orderNumber}`);
  return response.data;
}

// ── Check if customer has active 24hr session ─────────────────────
async function hasActiveSession(phone) {
  const normalized = normalizePhone(phone);
  // Only count session as active if customer has sent us a message
  // (not just because we sent them a template — that doesn't open a 2-way session)
  const { rows } = await pool.query(
    `SELECT c.session_expires_at
     FROM conversations c
     JOIN contacts ct ON ct.id = c.contact_id
     WHERE ct.phone_number = $1
       AND c.session_expires_at > NOW()
       AND EXISTS (
         SELECT 1 FROM messages m
         WHERE m.conversation_id = c.id
           AND m.direction = 'incoming'
           AND m.created_at > NOW() - INTERVAL '24 hours'
       )
     ORDER BY c.session_expires_at DESC
     LIMIT 1`,
    [normalized]
  );
  return rows.length > 0;
}

// ── Smart send — buttons if session active, template if not ───────
async function sendOrderConfirmationSmart(phone, orderNumber, total, items, customerName) {
  const sessionActive = await hasActiveSession(phone);

  if (sessionActive) {
    console.log(`[Shopify] Active session for ${phone} — sending interactive buttons`);
    const itemsText = Array.isArray(items)
      ? items.map(i => `• ${i.name || i.title} x${i.quantity || i.qty || 1}`).join('\n')
      : (items || 'your items');
    return sendConfirmationButtons(phone, orderNumber, total, itemsText);
  } else {
    console.log(`[Shopify] No active session for ${phone} — sending approved template`);
    return sendConfirmationTemplate(phone, orderNumber, customerName, items, total);
  }
}

module.exports = {
  sendDirectWA,
  sendConfirmationButtons,
  sendConfirmationTemplate,
  sendOrderConfirmationSmart,
  normalizePhone,
};
