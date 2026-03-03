const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
  max:      parseInt(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10, // strict for auth endpoints
  message:  { error: 'Too many login attempts, please try again later.' },
});

const messageSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max:      30,
  message:  { error: 'Message send rate limit exceeded.' },
});

module.exports = { limiter, authLimiter, messageSendLimiter };
