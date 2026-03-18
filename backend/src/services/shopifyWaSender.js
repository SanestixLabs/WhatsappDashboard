const axios = require('axios');

// Send WA message directly via Meta API
// Bypasses conversationId requirement — used for outbound notifications
async function sendDirectWA(phone, message) {
  const phoneId  = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const token    = process.env.WHATSAPP_ACCESS_TOKEN;
  const version  = process.env.WHATSAPP_API_VERSION || 'v19.0';
  const url      = `https://graph.facebook.com/${version}/${phoneId}/messages`;

  // Normalize phone — add 92 if starts with 0
  let to = phone.replace(/\D/g, '');
  if (to.startsWith('0')) to = '92' + to.substring(1);

  const payload = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { preview_url: false, body: message },
  };

  const response = await axios.post(url, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`[Shopify WA] ✅ Sent to ${to} — msgId: ${response.data.messages?.[0]?.id}`);
  return response.data;
}

module.exports = { sendDirectWA };
