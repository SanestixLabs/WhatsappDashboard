const express = require('express');
const { query } = require('../config/database');
const { requireRole } = require('../middleware/auth');
const router = express.Router();
const getDays = (p) => ({ '7d':7,'30d':30,'90d':90 }[p] || 7);

router.get('/kpi', requireRole('owner','manager','super_admin'), async (req,res,next) => {
  try {
    const days = getDays(req.query.period);
    const r = await query(
      `SELECT COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ai_resolved=true) AS ai_resolved,
        COUNT(*) FILTER (WHERE status='open') AS open_now,
        COUNT(*) FILTER (WHERE status='closed') AS closed,
        ROUND(AVG(EXTRACT(EPOCH FROM (first_response_at-created_at))/60)
          FILTER (WHERE first_response_at IS NOT NULL),1) AS avg_first_resp_mins,
        ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at-created_at))/60)
          FILTER (WHERE resolved_at IS NOT NULL),1) AS avg_resolution_mins
       FROM conversations WHERE created_at >= NOW() - INTERVAL '1 day' * $1`,
      [days]);
    const row = r.rows[0];
    const total = parseInt(row.total)||0;
    const ai = parseInt(row.ai_resolved)||0;
    res.json({ total_conversations:total, ai_resolved_count:ai,
      ai_resolved_pct: total>0?Math.round((ai/total)*100):0,
      open_now:parseInt(row.open_now)||0, closed:parseInt(row.closed)||0,
      avg_first_resp_mins:parseFloat(row.avg_first_resp_mins)||0,
      avg_resolution_mins:parseFloat(row.avg_resolution_mins)||0 });
  } catch(err){next(err);}
});

router.get('/volume', requireRole('owner','manager','super_admin'), async (req,res,next) => {
  try {
    const days = getDays(req.query.period);
    const r = await query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS total,
        COUNT(*) FILTER (WHERE ai_resolved=true) AS ai_count,
        COUNT(*) FILTER (WHERE ai_resolved=false OR ai_resolved IS NULL) AS agent_count
       FROM conversations WHERE created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at) ORDER BY date ASC`,[days]);
    res.json(r.rows);
  } catch(err){next(err);}
});

router.get('/agents', requireRole('owner','manager','super_admin'), async (req,res,next) => {
  try {
    const days = getDays(req.query.period);
    const r = await query(
      `SELECT u.id,u.name,u.email,u.role,
        COUNT(c.id) AS chats_handled,
        ROUND(AVG(EXTRACT(EPOCH FROM (c.first_response_at-c.created_at))/60)
          FILTER (WHERE c.first_response_at IS NOT NULL),1) AS avg_resp_mins,
        ROUND(AVG(EXTRACT(EPOCH FROM (c.resolved_at-c.created_at))/60)
          FILTER (WHERE c.resolved_at IS NOT NULL),1) AS avg_resolution_mins,
        ROUND(AVG(cr.score),2) AS csat_score
       FROM users u
       LEFT JOIN conversations c ON c.assigned_to=u.id AND c.created_at >= NOW() - INTERVAL '1 day' * $1
       LEFT JOIN csat_responses cr ON cr.conversation_id=c.id
       WHERE u.is_active=true AND u.role IN ('owner','manager','agent','super_admin')
       GROUP BY u.id,u.name,u.email,u.role ORDER BY chats_handled DESC`,[days]);
    res.json(r.rows);
  } catch(err){next(err);}
});

router.get('/export', requireRole('owner','manager','super_admin'), async (req,res,next) => {
  try {
    const days = getDays(req.query.period);
    const r = await query(
      `SELECT c.id,c.status,c.ai_resolved,c.created_at,c.resolved_at,
        c.first_response_at,u.name AS agent_name,ct.phone_number,ct.name AS contact_name
       FROM conversations c
       LEFT JOIN users u ON u.id=c.assigned_to
       LEFT JOIN contacts ct ON ct.id=c.contact_id
       WHERE c.created_at >= NOW() - INTERVAL '1 day' * $1
       ORDER BY c.created_at DESC`,[days]);
    const headers = Object.keys(r.rows[0]).join(',');
    const rows = r.rows.map(row=>Object.values(row).map(v=>v===null?'':'"'+String(v).replace(/"/g,'""')+'"').join(','));
    res.setHeader('Content-Type','text/csv');
    res.setHeader('Content-Disposition','attachment; filename=analytics.csv');
    res.send([headers,...rows].join('\n'));
  } catch(err){next(err);}
});

module.exports = router;
