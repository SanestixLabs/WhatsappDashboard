const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authLimiter } = require('../middleware/rateLimiter');
const { authenticateToken, auditLog } = require('../middleware/auth');
const router = express.Router();

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
  return { accessToken, refreshToken };
};

// POST /api/auth/login
router.post('/login',
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;

      const result = await query(
        'SELECT * FROM users WHERE email = $1 AND is_active = true',
        [email]
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password_hash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const { accessToken, refreshToken } = generateTokens(user.id);

      const hash = await bcrypt.hash(refreshToken, 10);
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [user.id, hash]
      );

      await query(
        'UPDATE users SET last_login_at = NOW(), status = $1, last_active = NOW() WHERE id = $2',
        ['online', user.id]
      );

      await auditLog(user.id, 'user.login', user.email, null, req.ip);

      res.json({
        accessToken,
        refreshToken,
        user: {
          id:           user.id,
          email:        user.email,
          name:         user.name,
          role:         user.role,
          status:       'online',
          avatar_url:   user.avatar_url,
          workspace_id: user.workspace_id
        },
      });
    } catch (err) { next(err); }
  }
);

// POST /api/auth/refresh
router.post('/refresh', async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Refresh token required' });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    const tokens = await query(
      `SELECT * FROM refresh_tokens WHERE user_id = $1 AND revoked = false AND expires_at > NOW()`,
      [decoded.userId]
    );

    let validToken = null;
    for (const row of tokens.rows) {
      if (await bcrypt.compare(refreshToken, row.token_hash)) {
        validToken = row;
        break;
      }
    }

    if (!validToken) return res.status(401).json({ error: 'Invalid or expired refresh token' });

    await query('UPDATE refresh_tokens SET revoked = true WHERE id = $1', [validToken.id]);
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.userId);
    const hash = await bcrypt.hash(newRefreshToken, 10);
    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [decoded.userId, hash]
    );

    res.json({ accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Invalid token' });
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    await query('UPDATE refresh_tokens SET revoked = true WHERE user_id = $1', [req.user.id]);
    await query('UPDATE users SET status = $1 WHERE id = $2', ['offline', req.user.id]);
    await auditLog(req.user.id, 'user.logout', req.user.email, null, req.ip);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});


// POST /api/auth/signup — self-serve workspace signup (public)
router.post('/signup',
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('workspace_name').notEmpty().trim(),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, email, password, workspace_name } = req.body;

      // Check email not already taken
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      // Generate slug from workspace name
      let slug = workspace_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slugCheck = await query('SELECT id FROM workspaces WHERE slug = $1', [slug]);
      if (slugCheck.rows.length > 0) slug = slug + '-' + Date.now();

      // Create workspace
      const wsResult = await query(
        `INSERT INTO workspaces (name, slug, plan, trial_ends_at)
         VALUES ($1, $2, 'trial', NOW() + INTERVAL '14 days') RETURNING *`,
        [workspace_name, slug]
      );
      const workspace = wsResult.rows[0];

      // Create super_admin user for this workspace
      const password_hash = await bcrypt.hash(password, 12);
      const userResult = await query(
        `INSERT INTO users (email, name, password_hash, role, workspace_id, status)
         VALUES ($1, $2, $3, 'super_admin', $4, 'online') RETURNING id, email, name, role, workspace_id`,
        [email, name, password_hash, workspace.id]
      );
      const user = userResult.rows[0];

      // Issue tokens
      const { accessToken, refreshToken } = generateTokens(user.id);
      const hash = await bcrypt.hash(refreshToken, 10);
      await query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
        [user.id, hash]
      );

      await auditLog(user.id, 'workspace.signup', email, { workspace_name, slug }, req.ip);

      res.status(201).json({
        accessToken,
        refreshToken,
        user: {
          id:           user.id,
          email:        user.email,
          name:         user.name,
          role:         user.role,
          workspace_id: user.workspace_id
        },
        workspace: {
          id:             workspace.id,
          name:           workspace.name,
          slug:           workspace.slug,
          plan:           workspace.plan,
          trial_ends_at:  workspace.trial_ends_at
        }
      });
    } catch (err) { next(err); }
  }
);

module.exports = router;
