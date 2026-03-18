const express = require('express');
const router  = express.Router();
const { query } = require('../config/database');

// ── GET /api/flows — List all flows for workspace ─────────────
router.get('/', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const result = await query(
      `SELECT f.*, 
        COUNT(fn.id) as node_count,
        COUNT(fs.id) FILTER (WHERE fs.status = 'active') as active_sessions
       FROM flows f
       LEFT JOIN flow_nodes fn ON fn.flow_id = f.id
       LEFT JOIN flow_sessions fs ON fs.flow_id = f.id
       WHERE f.workspace_id = $1
       GROUP BY f.id
       ORDER BY f.created_at DESC`,
      [workspaceId]
    );
    res.json({ flows: result.rows });
  } catch (err) {
    console.error('[Flows] List error:', err.message);
    res.status(500).json({ error: 'Failed to fetch flows' });
  }
});

// ── POST /api/flows — Create new flow ─────────────────────────
router.post('/', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const userId      = req.user.id;
    const { name, description, trigger_type, trigger_value } = req.body;

    if (!name || !trigger_type) {
      return res.status(400).json({ error: 'name and trigger_type are required' });
    }

    const result = await query(
      `INSERT INTO flows (workspace_id, name, description, trigger_type, trigger_value, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [workspaceId, name, description || null, trigger_type, trigger_value || null, userId]
    );
    res.status(201).json({ flow: result.rows[0] });
  } catch (err) {
    console.error('[Flows] Create error:', err.message);
    res.status(500).json({ error: 'Failed to create flow' });
  }
});

// ── GET /api/flows/:id — Get single flow with nodes ───────────
router.get('/:id', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const flowResult  = await query(
      `SELECT * FROM flows WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, workspaceId]
    );
    if (flowResult.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    const nodesResult = await query(
      `SELECT * FROM flow_nodes WHERE flow_id = $1 ORDER BY created_at ASC`,
      [req.params.id]
    );
    res.json({ flow: flowResult.rows[0], nodes: nodesResult.rows });
  } catch (err) {
    console.error('[Flows] Get error:', err.message);
    res.status(500).json({ error: 'Failed to fetch flow' });
  }
});

// ── PUT /api/flows/:id — Update flow + nodes (full replace) ───
router.put('/:id', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { name, description, trigger_type, trigger_value, nodes } = req.body;

    // Verify ownership
    const check = await query(
      `SELECT id FROM flows WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, workspaceId]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }

    // Update flow metadata
    await query(
      `UPDATE flows SET name=$1, description=$2, trigger_type=$3, trigger_value=$4, updated_at=NOW()
       WHERE id=$5`,
      [name, description || null, trigger_type, trigger_value || null, req.params.id]
    );

    // Replace all nodes if provided
    if (nodes && Array.isArray(nodes)) {
      await query(`DELETE FROM flow_nodes WHERE flow_id = $1`, [req.params.id]);
      // Helper: validate or generate UUID
      const toUUID = (id) => {
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRe.test(id)) return id;
        // Generate a deterministic UUID v4-like from the string
        const crypto = require('crypto');
        const hash = crypto.createHash('md5').update(String(id)).digest('hex');
        return `${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-${((parseInt(hash[16],16)&0x3)|0x8).toString(16)}${hash.slice(17,20)}-${hash.slice(20,32)}`;
      };
      // Insert all nodes first without next_node_id to avoid FK violations
      for (const node of nodes) {
        await query(
          `INSERT INTO flow_nodes (id, flow_id, node_type, node_config, position_x, position_y, next_node_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            toUUID(node.id),
            req.params.id,
            node.node_type,
            JSON.stringify(node.node_config || {}),
            node.position_x || 0,
            node.position_y || 0,
            null,
          ]
        );
      }
      // Now update next_node_id references
      for (const node of nodes) {
        if (node.next_node_id) {
          await query(
            `UPDATE flow_nodes SET next_node_id = $1 WHERE id = $2`,
            [toUUID(node.next_node_id), toUUID(node.id)]
          );
        }
      }
    }

    const updated = await query(`SELECT * FROM flows WHERE id = $1`, [req.params.id]);
    const updatedNodes = await query(`SELECT * FROM flow_nodes WHERE flow_id = $1`, [req.params.id]);
    res.json({ flow: updated.rows[0], nodes: updatedNodes.rows });
  } catch (err) {
    console.error('[Flows] Update error:', err.message);
    res.status(500).json({ error: 'Failed to update flow' });
  }
});

// ── POST /api/flows/:id/activate — Toggle flow active ─────────
router.post('/:id/activate', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    const { is_active } = req.body;

    const result = await query(
      `UPDATE flows SET is_active=$1, updated_at=NOW()
       WHERE id=$2 AND workspace_id=$3 RETURNING *`,
      [is_active, req.params.id, workspaceId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flow not found' });
    }
    res.json({ flow: result.rows[0] });
  } catch (err) {
    console.error('[Flows] Activate error:', err.message);
    res.status(500).json({ error: 'Failed to toggle flow' });
  }
});

// ── DELETE /api/flows/:id — Delete flow ───────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const workspaceId = req.user.workspace_id;
    await query(
      `DELETE FROM flows WHERE id = $1 AND workspace_id = $2`,
      [req.params.id, workspaceId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Flows] Delete error:', err.message);
    res.status(500).json({ error: 'Failed to delete flow' });
  }
});

// ── GET /api/flows/:id/analytics — Flow stats ─────────────────
router.get('/:id/analytics', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status='completed') as completed,
        COUNT(*) FILTER (WHERE status='active') as active,
        COUNT(*) FILTER (WHERE status='exited') as exited
       FROM flow_sessions WHERE flow_id = $1`,
      [req.params.id]
    );
    res.json({ analytics: result.rows[0] });
  } catch (err) {
    console.error('[Flows] Analytics error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;
