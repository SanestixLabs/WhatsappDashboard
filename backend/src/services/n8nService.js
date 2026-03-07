const axios = require('axios');

/**
 * Trigger an n8n webhook workflow and return parsed response
 */
const trigger = async (payload) => {
  const url = process.env.N8N_WEBHOOK_URL;

  if (!url) {
    throw new Error('N8N_WEBHOOK_URL is not configured');
  }

  const headers = { 'Content-Type': 'application/json' };

  // Optional: shared secret for n8n webhook auth
  if (process.env.N8N_SECRET) {
    headers['X-N8N-Secret'] = process.env.N8N_SECRET;
  }

  const response = await axios.post(url, payload, {
    headers,
    timeout: 30000, // 30 second timeout
  });

  const data = response.data;

  // n8n may return array or object
  const result = Array.isArray(data) ? data[0] : data;
  console.log('[n8n] Raw response:', JSON.stringify(data));

  // Validate expected shape
  if (!result || typeof result.reply !== 'string') {
    console.warn('[n8n] Unexpected response shape:', result);
    return null;
  }

  return result;
};

module.exports = { trigger };
