const { query } = require('../config/database');

/**
 * Notify all online agents of a new queued conversation
 */
const notifyQueue = async (io, conversation, contact) => {
  try {
    // Get all online agents + admins
    const agentsResult = await query(
      `SELECT id FROM users 
       WHERE status = 'online' 
         AND is_active = true 
         AND role IN ('super_admin', 'admin', 'agent')`
    );

    // Emit to all online agents
    io.emit('queue_new_conversation', {
      conversationId: conversation.id,
      contactName: contact.name || contact.phone_number,
      phoneNumber: contact.phone_number,
      timestamp: new Date().toISOString(),
      agentCount: agentsResult.rows.length,
    });

    console.log(`[Queue] New conversation ${conversation.id} notified to ${agentsResult.rows.length} agents`);
  } catch (err) {
    console.error('[Queue] Notify failed:', err.message);
  }
};

module.exports = { notifyQueue };
