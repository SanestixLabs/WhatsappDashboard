const express = require('express');
const bcrypt  = require('bcrypt');
const crypto  = require('crypto');
const { body, validationResult } = require('express-validator');
const { query } = require('../config/database');
const { authenticateToken, requireRole, auditLog } = require('../middleware/auth');
const router = express.Router();

// GET /api/team — list all team members
router.get('/', authenticateToken, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, email, name, role, status, last_active, avatar_url, is_active, created_at
       FROM users ORDER BY created_at ASC`
    );
    res.json({ team: result.rows });
  } catch (err) { next(err); }
});

// POST /api/team/invite — send invite
router.post('/invite', authenticateToken, requireRole('super_admin', 'admin'),
  body('email').isEmail().normalizeEmail(),
  body('role').isIn(['admin', 'agent', 'viewer']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { email, role } = req.body;
      const workspace_id = 'default';

      // Check if user already exists
      const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'User with this email already exists' });
      }

      // Check for existing pending invite
      const pendingInvite = await query(
        'SELECT id FROM invites WHERE email = $1 AND used_at IS NULL AND expires_at > NOW()',
        [email]
      );
      if (pendingInvite.rows.length > 0) {
        return res.status(409).json({ error: 'Pending invite already exists for this email' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await query(
        `INSERT INTO invites (email, role, token, workspace_id, invited_by, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [email, role, token, workspace_id, req.user.id, expiresAt]
      );

      await auditLog(req.user.id, 'invite.sent', email, { role }, req.ip);

      // TODO: Send email via Resend in next step
      const inviteUrl = `${process.env.FRONTEND_URL}/accept-invite?token=${token}`;

      res.json({
        message: 'Invite created successfully',
        inviteUrl,
        expiresAt
      });
    } catch (err) { next(err); }
  }
);

// GET /api/team/invites/validate/:token — validate invite token (public)
router.get('/invites/validate/:token', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT email, role FROM invites 
       WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
      [req.params.token]
    );
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired invite token' });
    }
    res.json({ valid: true, email: result.rows[0].email, role: result.rows[0].role });
  } catch (err) { next(err); }
});

// POST /api/team/invites/accept — accept invite + set password
router.post('/invites/accept',
  body('token').notEmpty(),
  body('name').notEmpty(),
  body('password').isLength({ min: 6 }),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { token, name, password } = req.body;

      const inviteResult = await query(
        `SELECT * FROM invites WHERE token = $1 AND used_at IS NULL AND expires_at > NOW()`,
        [token]
      );

      if (inviteResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid or expired invite token' });
      }

      const invite = inviteResult.rows[0];
      const password_hash = await bcrypt.hash(password, 12);

      // Create user
      const userResult = await query(
        `INSERT INTO users (email, name, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'offline') RETURNING id, email, name, role`,
        [invite.email, name, password_hash, invite.role]
      );

      const newUser = userResult.rows[0];

      // Mark invite as used
      await query('UPDATE invites SET used_at = NOW() WHERE id = $1', [invite.id]);

      await auditLog(newUser.id, 'user.registered', invite.email, { role: invite.role }, req.ip);

      res.json({ message: 'Account created successfully', user: newUser });
    } catch (err) { next(err); }
  }
);

// PATCH /api/team/:id/role — change a user's role
router.patch('/:id/role', authenticateToken, requireRole('super_admin'),
  body('role').isIn(['admin', 'agent', 'viewer']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const result = await query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, name, role',
        [req.body.role, req.params.id]
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });

      await auditLog(req.user.id, 'user.role_changed', req.params.id, { newRole: req.body.role }, req.ip);
      res.json({ user: result.rows[0] });
    } catch (err) { next(err); }
  }
);

// PATCH /api/team/:id/status — agent updates their own status
router.patch('/:id/status', authenticateToken,
  body('status').isIn(['online', 'away', 'offline']),
  async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Agents can only update their own status
    if (req.user.id !== req.params.id && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Cannot update another user status' });
    }

    try {
      await query(
        'UPDATE users SET status = $1, last_active = NOW() WHERE id = $2',
        [req.body.status, req.params.id]
      );
      res.json({ message: 'Status updated' });
    } catch (err) { next(err); }
  }
);

// DELETE /api/team/:id — deactivate user
router.delete('/:id', authenticateToken, requireRole('super_admin'),
  async (req, res, next) => {
    try {
      if (req.user.id === req.params.id) {
        return res.status(400).json({ error: 'Cannot deactivate yourself' });
      }
      await query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
      await auditLog(req.user.id, 'user.deactivated', req.params.id, null, req.ip);
      res.json({ message: 'User deactivated' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
