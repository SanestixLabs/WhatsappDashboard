const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireRole, auditLog } = require('../middleware/auth');
const router = express.Router();

router.get('/settings', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(`SELECT * FROM ai_settings WHERE workspace_id = 'default' LIMIT 1`);
    if (result.rows.length === 0) {
      const created = await query(`INSERT INTO ai_settings (workspace_id) VALUES ('default') RETURNING *`);
      return res.json({ settings: created.rows[0] });
    }
    res.json({ settings: result.rows[0] });
  } catch (err) { next(err); }
});

router.put('/settings', authenticateToken, requireRole('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { ai_name, system_prompt, model, confidence_threshold, auto_resume_hours, auto_pause_enabled, sentiment_enabled, intent_enabled, pause_keywords, intent_categories } = req.body;
    const result = await query(
      `UPDATE ai_settings SET
        ai_name              = COALESCE($1,  ai_name),
        system_prompt        = COALESCE($2,  system_prompt),
        model                = COALESCE($3,  model),
        confidence_threshold = COALESCE($4,  confidence_threshold),
        auto_resume_hours    = COALESCE($5,  auto_resume_hours),
        auto_pause_enabled   = COALESCE($6,  auto_pause_enabled),
        sentiment_enabled    = COALESCE($7,  sentiment_enabled),
        intent_enabled       = COALESCE($8,  intent_enabled),
        pause_keywords       = COALESCE($9,  pause_keywords),
        intent_categories    = COALESCE($10, intent_categories),
        updated_at           = NOW()
      WHERE workspace_id = 'default' RETURNING *`,
      [
        ai_name || null, system_prompt || null, model || null,
        confidence_threshold !== undefined ? confidence_threshold : null,
        auto_resume_hours    !== undefined ? auto_resume_hours    : null,
        auto_pause_enabled   !== undefined ? auto_pause_enabled   : null,
        sentiment_enabled    !== undefined ? sentiment_enabled    : null,
        intent_enabled       !== undefined ? intent_enabled       : null,
        pause_keywords    ? pause_keywords                        : null,
        intent_categories ? JSON.stringify(intent_categories)     : null,
      ]
    );
    await auditLog(req.user.id, 'ai_settings.updated', 'default', { fields: Object.keys(req.body) }, req.ip);
    res.json({ settings: result.rows[0], message: 'AI settings saved' });
  } catch (err) { next(err); }
});

router.post('/analyze', authenticateToken, async (req, res, next) => {
  try {
    const { conversation_id, message_text } = req.body;
    if (!message_text) return res.json({ intent: 'other', sentiment: 'neutral', sentiment_score: 0, should_pause: false });
    const settingsRes = await query(`SELECT * FROM ai_settings WHERE workspace_id = 'default' LIMIT 1`);
    const settings = settingsRes.rows[0];
    if (!settings) return res.json({ intent: 'other', sentiment: 'neutral', sentiment_score: 0, should_pause: false });
    const result = await analyzeMessage(message_text, settings);
    if (conversation_id) {
      await query(`UPDATE conversations SET intent=$1, sentiment=$2, sentiment_score=$3, updated_at=NOW() WHERE id=$4`,
        [result.intent, result.sentiment, result.sentiment_score, conversation_id]);
      if (result.should_pause && settings.auto_pause_enabled) {
        const resumeAt = new Date(Date.now() + (settings.auto_resume_hours || 2) * 60 * 60 * 1000);
        await query(`UPDATE conversations SET ai_paused_until=$1, ai_pause_reason=$2, automation_enabled=false, updated_at=NOW() WHERE id=$3`,
          [resumeAt, result.pause_reason, conversation_id]);
        result.paused_until = resumeAt;
      }
    }
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/pause/:convId', authenticateToken, async (req, res, next) => {
  try {
    const { duration_minutes = 60, reason = 'manual' } = req.body;
    const resumeAt = new Date(Date.now() + duration_minutes * 60 * 1000);
    const result = await query(
      `UPDATE conversations SET automation_enabled=false, ai_paused_until=$1, ai_pause_reason=$2, updated_at=NOW() WHERE id=$3 RETURNING *`,
      [resumeAt, reason, req.params.convId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    req.app.get('io').emit('conversation_updated', result.rows[0]);
    await auditLog(req.user.id, 'ai.paused', req.params.convId, { duration_minutes, reason }, req.ip);
    res.json({ message: 'AI paused', paused_until: resumeAt, conversation: result.rows[0] });
  } catch (err) { next(err); }
});

router.post('/resume/:convId', authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE conversations SET automation_enabled=true, ai_paused_until=NULL, ai_pause_reason=NULL, updated_at=NOW() WHERE id=$1 RETURNING *`,
      [req.params.convId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Conversation not found' });
    req.app.get('io').emit('conversation_updated', result.rows[0]);
    await auditLog(req.user.id, 'ai.resumed', req.params.convId, {}, req.ip);
    res.json({ message: 'AI resumed', conversation: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/stats', authenticateToken, async (req, res, next) => {
  try {
    const [intentStats, sentimentStats, pausedCount] = await Promise.all([
      query(`SELECT intent, COUNT(*) as count FROM conversations WHERE intent IS NOT NULL AND status='open' GROUP BY intent ORDER BY count DESC`),
      query(`SELECT sentiment, COUNT(*) as count FROM conversations WHERE sentiment IS NOT NULL AND status='open' GROUP BY sentiment`),
      query(`SELECT COUNT(*) as count FROM conversations WHERE ai_paused_until > NOW() AND status='open'`),
    ]);
    res.json({ intents: intentStats.rows, sentiments: sentimentStats.rows, paused_count: parseInt(pausedCount.rows[0]?.count || 0) });
  } catch (err) { next(err); }
});

const runAutoResume = async () => {
  try {
    const result = await query(
      `UPDATE conversations SET automation_enabled=true, ai_paused_until=NULL, ai_pause_reason=NULL, updated_at=NOW()
       WHERE ai_paused_until IS NOT NULL AND ai_paused_until <= NOW() AND status='open' RETURNING id`
    );
    if (result.rows.length > 0) console.log(`[AI] Auto-resumed ${result.rows.length} conversation(s)`);
  } catch (err) { console.error('[AI] Auto-resume error:', err.message); }
};

async function analyzeMessage(text, settings) {
  const lower = text.toLowerCase();
  const triggeredKeyword = (settings.pause_keywords || []).find(kw => lower.includes(kw.toLowerCase()));
  let intent = 'other';
  if (/order|track|shipping|delivery|dispatch|parcel|package/i.test(text))              intent = 'order';
  else if (/complain|angry|terrible|awful|worst|bad|problem|issue|broken|frustrated/i.test(text)) intent = 'complaint';
  else if (/pay|payment|price|cost|invoice|bill|charge|fee|refund/i.test(text))         intent = 'payment';
  else if (/\?|how|what|when|where|why|who|help|info|detail/i.test(text))               intent = 'question';
  const negWords = ['bad','terrible','awful','hate','angry','furious','worst','broken','complaint','refund','cancel','frustrat','disappoint','unacceptable'];
  const posWords = ['great','good','thanks','thank','love','excellent','perfect','happy','amazing','helpful','appreciate','wonderful'];
  let score = 0;
  negWords.forEach(w => { if (lower.includes(w)) score -= 0.2; });
  posWords.forEach(w => { if (lower.includes(w)) score += 0.2; });
  score = Math.max(-1, Math.min(1, score));
  const sentiment = score <= -0.3 ? 'negative' : score >= 0.3 ? 'positive' : 'neutral';
  const shouldPause = !!triggeredKeyword || (settings.auto_pause_enabled && sentiment === 'negative' && score <= -0.4);
  const pauseReason = triggeredKeyword ? `Pause keyword detected: "${triggeredKeyword}"` : shouldPause ? 'Negative sentiment detected' : null;
  return { intent, sentiment, sentiment_score: parseFloat(score.toFixed(2)), should_pause: shouldPause, pause_reason: pauseReason, triggered_keyword: triggeredKeyword || null };
}

module.exports = router;
module.exports.runAutoResume = runAutoResume;
