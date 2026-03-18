const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT id, email, name, role, status, avatar_url, workspace_id
       FROM users WHERE id = $1 AND is_active = true`,
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found or inactive' });
    }

    req.user = result.rows[0];
    req.workspaceId = result.rows[0].workspace_id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }
};

// Check role permission
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Log action to audit_logs
const auditLog = async (actorId, action, target, metadata, ip) => {
  try {
    await query(
      'INSERT INTO audit_logs (actor_id, action, target, metadata, ip) VALUES ($1, $2, $3, $4, $5)',
      [actorId, action, target, metadata ? JSON.stringify(metadata) : null, ip]
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
};

module.exports = { authenticateToken, requireRole, auditLog };
