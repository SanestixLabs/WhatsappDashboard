const axios = require('axios');

// Normalize phone — add 92 if starts with 0
function normalizePhone(phone) {
  let to = phone.replace(/\D/g, '');
  if (to.startsWith('0')) to = '92' + to.substring(1);
  return to;
}

// Send plain text WA message directly via Meta API
async function sendDirectWA(phone, message) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const url     = `https://graph.facebook.com/${version}/${phoneId}/messages`;
  const to      = normalizePhone(phone);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: message },
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log(`[Shopify WA] ✅ Sent to ${to} — msgId: ${response.data.messages?.[0]?.id}`);
  return response.data;
}

// Send interactive YES/NO confirmation buttons
async function sendConfirmationButtons(phone, orderNumber, total, items) {
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token   = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const url     = `https://graph.facebook.com/${version}/${phoneId}/messages`;
  const to      = normalizePhone(phone);

  const itemsText = items || 'your items';

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text: `🛍️ *New Order Received!*\n\nOrder: *#${orderNumber}*\nItems: ${itemsText}\nTotal: *${total}*\n\nPlease confirm your order:`,
      },
      action: {
        buttons: [
          {
            type: 'reply',
            reply: { id: `shopify_confirm_${orderNumber}`, title: '✅ Confirm Order' },
          },
          {
            type: 'reply',
            reply: { id: `shopify_cancel_${orderNumber}`, title: '❌ Cancel Order' },
          },
        ],
      },
    },
  };

  const response = await axios.post(url, payload, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });

  console.log(`[Shopify WA] ✅ Confirmation buttons sent to ${to} — order #${orderNumber}`);
  return response.data;
}

module.exports = { sendDirectWA, sendConfirmationButtons, normalizePhone };

// Check if customer has an active 24hr session
async function hasActiveSession(phone) {
  const { pool } = require('../config/database');
  const normalized = normalizePhone(phone);
  const { rows } = await pool.query(
    `SELECT c.session_expires_at
     FROM conversations c
     JOIN contacts ct ON ct.id = c.contact_id
     WHERE ct.phone_number = $1
       AND c.session_expires_at > NOW()
     ORDER BY c.session_expires_at DESC
     LIMIT 1`,
    [normalized]
  );
  return rows.length > 0;
}

// Smart send — buttons if session active, template text if not
async function sendOrderConfirmationSmart(phone, orderNumber, total, items) {
  const sessionActive = await hasActiveSession(phone);
  if (sessionActive) {
    return sendConfirmationButtons(phone, orderNumber, total, items);
  } else {
    // Fallback: plain text with instructions (template would need Meta approval)
    const message = `🛍️ *New Order Received!*\n\nOrder: *#${orderNumber}*\nItems: ${items}\nTotal: *${total}*\n\nReply *CONFIRM ${orderNumber}* to confirm or *CANCEL ${orderNumber}* to cancel.\n\n⏰ Auto-confirms in 1 hour if no reply.`;
    console.log(`[Shopify] No active session for ${phone} — sending text fallback`);
    return sendDirectWA(phone, message);
  }
}

module.exports = { sendDirectWA, sendConfirmationButtons, sendOrderConfirmationSmart, normalizePhone };
