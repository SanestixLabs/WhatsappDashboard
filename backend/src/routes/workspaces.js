const express = require("express");
const { body, validationResult } = require("express-validator");
const { query } = require("../config/database");
const { authenticateToken, requireRole, auditLog } = require("../middleware/auth");
const router = express.Router();

// GET /api/workspaces — list all workspaces (super_admin only)
router.get("/", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT w.*, 
        (SELECT COUNT(*) FROM users u WHERE u.workspace_id = w.id) as member_count,
        (SELECT COUNT(*) FROM conversations c WHERE c.workspace_id = w.id) as conversation_count
       FROM workspaces w ORDER BY w.created_at DESC`
    );
    res.json({ workspaces: result.rows });
  } catch (err) { next(err); }
});

// GET /api/workspaces/mine — get current user workspace
router.get("/mine", authenticateToken, async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM workspaces WHERE id = $1",
      [req.workspaceId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Workspace not found" });
    res.json({ workspace: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/workspaces — create new workspace (super_admin only)
router.post("/",
  authenticateToken, requireRole("super_admin"),
  body("name").notEmpty().trim(),
  body("slug").notEmpty().trim().toLowerCase(),
  async (req, res, next) => {
    const errors = validationResult(req);
    try {
      const { name, slug, phone_number, wa_phone_id, wa_access_token, plan } = req.body;
      const exists = await query("SELECT id FROM workspaces WHERE slug = $1", [slug]);
      if (exists.rows.length > 0) return res.status(409).json({ error: "Slug already taken" });
      const result = await query(
        `INSERT INTO workspaces (name, slug, phone_number, wa_phone_id, wa_access_token, plan)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [name, slug, phone_number || null, wa_phone_id || null, wa_access_token || null, plan || "trial"]
      );
      await auditLog(req.user.id, "workspace.created", slug, { name }, req.ip);
      res.status(201).json({ workspace: result.rows[0] });
    } catch (err) { next(err); }
  }
);

// PATCH /api/workspaces/:id — update workspace
router.patch("/:id", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    const { name, logo_url, custom_domain, is_active, plan, wa_phone_id, wa_access_token, phone_number } = req.body;
    const result = await query(
      `UPDATE workspaces SET
        name = COALESCE($1, name),
        logo_url = COALESCE($2, logo_url),
        custom_domain = COALESCE($3, custom_domain),
        is_active = COALESCE($4, is_active),
        plan = COALESCE($5, plan),
        wa_phone_id = COALESCE($6, wa_phone_id),
        wa_access_token = COALESCE($7, wa_access_token),
        phone_number = COALESCE($8, phone_number),
        updated_at = NOW()
       WHERE id = $9 RETURNING *`,
      [name, logo_url, custom_domain, is_active, plan, wa_phone_id, wa_access_token, phone_number, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Workspace not found" });
    await auditLog(req.user.id, "workspace.updated", req.params.id, req.body, req.ip);
    res.json({ workspace: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:id/suspend — suspend workspace
router.post("/:id/suspend", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    await query("UPDATE workspaces SET is_active = false, updated_at = NOW() WHERE id = $1", [req.params.id]);
    await auditLog(req.user.id, "workspace.suspended", req.params.id, null, req.ip);
    res.json({ message: "Workspace suspended" });
  } catch (err) { next(err); }
});

// POST /api/workspaces/:id/activate — activate workspace
router.post("/:id/activate", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    await query("UPDATE workspaces SET is_active = true, updated_at = NOW() WHERE id = $1", [req.params.id]);
    await auditLog(req.user.id, "workspace.activated", req.params.id, null, req.ip);
    res.json({ message: "Workspace activated" });
  } catch (err) { next(err); }
});

// GET /api/workspaces/:id/stats — workspace usage stats
router.get("/:id/stats", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    const id = req.params.id;
    const [members, conversations, contacts, broadcasts] = await Promise.all([
      query("SELECT COUNT(*) FROM users WHERE workspace_id = $1", [id]),
      query("SELECT COUNT(*) FROM conversations WHERE workspace_id = $1", [id]),
      query("SELECT COUNT(*) FROM contacts WHERE workspace_id = $1", [id]),
      query("SELECT COUNT(*) FROM broadcasts WHERE workspace_id = $1", [id]),
    ]);
    res.json({
      members:       parseInt(members.rows[0].count),
      conversations: parseInt(conversations.rows[0].count),
      contacts:      parseInt(contacts.rows[0].count),
      broadcasts:    parseInt(broadcasts.rows[0].count),
    });
  } catch (err) { next(err); }
});

module.exports = router;

// POST /api/workspaces/:id/connect-whatsapp — exchange Meta code for token
router.post("/:id/connect-whatsapp", authenticateToken, requireRole("super_admin"), async (req, res, next) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: "Missing code" });

    const appId     = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    // Step 1: Exchange code for access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&code=${code}`
    );
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.status(400).json({ error: "Failed to exchange token", details: tokenData });
    }
    const userToken = tokenData.access_token;

    // Step 2: Get WABA and phone numbers linked to this token
    const wabaRes = await fetch(
      `https://graph.facebook.com/v19.0/me/businesses?fields=owned_whatsapp_business_accounts&access_token=${userToken}`
    );
    const wabaData = await wabaRes.json();

    let phoneNumberId  = null;
    let phoneNumber    = null;
    let accessToken    = userToken;
    let wabaId         = null;

    // Try to get phone number from WABA
    if (wabaData.data && wabaData.data.length > 0) {
      const biz = wabaData.data[0];
      if (biz.owned_whatsapp_business_accounts && biz.owned_whatsapp_business_accounts.data.length > 0) {
        wabaId = biz.owned_whatsapp_business_accounts.data[0].id;
        // Get phone numbers for this WABA
        const phoneRes = await fetch(
          `https://graph.facebook.com/v19.0/${wabaId}/phone_numbers?fields=display_phone_number,verified_name&access_token=${userToken}`
        );
        const phoneData = await phoneRes.json();
        if (phoneData.data && phoneData.data.length > 0) {
          phoneNumberId = phoneData.data[0].id;
          phoneNumber   = phoneData.data[0].display_phone_number;
        }
      }
    }

    // Step 3: Save to workspace
    const result = await query(
      `UPDATE workspaces SET
        wa_access_token = $1,
        wa_phone_id     = $2,
        phone_number    = $3,
        updated_at      = NOW()
       WHERE id = $4 RETURNING *`,
      [accessToken, phoneNumberId, phoneNumber, req.params.id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: "Workspace not found" });

    await auditLog(req.user.id, "workspace.whatsapp_connected", req.params.id, { phoneNumber }, req.ip);

    res.json({
      workspace: result.rows[0],
      phone_number:   phoneNumber,
      phone_number_id: phoneNumberId,
      waba_id:        wabaId,
    });
  } catch (err) { next(err); }
});
