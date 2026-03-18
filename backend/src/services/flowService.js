const { query } = require('../config/database');
const whatsappService = require('./whatsappService');

/**
 * Called on every incoming message.
 * Checks if a flow should be triggered or continued.
 */
const processFlowForMessage = async (contact, conversation, messageText, messageType, io) => {
  try {
    // 1. Check if contact already has an active flow session
    const sessionResult = await query(
      `SELECT fs.*, f.workspace_id FROM flow_sessions fs
       JOIN flows f ON f.id = fs.flow_id
       WHERE fs.contact_id = $1 AND fs.status = 'active'
       ORDER BY fs.started_at DESC LIMIT 1`,
      [contact.id]
    );

    if (sessionResult.rows.length > 0) {
      const session = sessionResult.rows[0];

      // Check if session is waiting for input (set_variable node)
      const currentNodeResult = await query(
        `SELECT node_type FROM flow_nodes WHERE id = $1`,
        [session.current_node_id]
      );
      const isWaitingForInput = currentNodeResult.rows[0]?.node_type === 'set_variable';

      // Only allow keyword restart if NOT waiting for user input
      if (!isWaitingForInput) {
        const allFlows = await query(
          `SELECT * FROM flows WHERE workspace_id = $1 AND is_active = true`,
          [contact.workspace_id]
        );
        for (const flow of allFlows.rows) {
          if (flow.trigger_type === 'keyword') {
            const kw = (flow.trigger_value || '').toLowerCase().trim();
            if (kw && (messageText || '').toLowerCase().includes(kw)) {
              await query(`UPDATE flow_sessions SET status='exited' WHERE id=$1`, [session.id]);
              await startFlow(flow, contact, conversation, io);
              return true;
            }
          }
        }
      }

      // Continue existing session with user's reply
      await continueFlow(session, contact, conversation, messageText, io);
      return true;
    }

    // 2. No active session — check if any flow should be triggered
    const flowResult = await query(
      `SELECT * FROM flows
       WHERE workspace_id = $1 AND is_active = true
       ORDER BY created_at ASC`,
      [contact.workspace_id]
    );

    for (const flow of flowResult.rows) {
      const triggered = await checkTrigger(flow, messageText, messageType, conversation);
      if (triggered) {
        await startFlow(flow, contact, conversation, io);
        return true;
      }
    }

    return false; // No flow matched
  } catch (err) {
    console.error('[FlowService] Error processing flow:', err.message);
    return false;
  }
};

/**
 * Check if a flow's trigger matches the incoming message
 */
const checkTrigger = async (flow, messageText, messageType, conversation) => {
  const text = (messageText || '').toLowerCase().trim();

  switch (flow.trigger_type) {
    case 'keyword':
      const keyword = (flow.trigger_value || '').toLowerCase().trim();
      return keyword && text.includes(keyword);

    case 'first_message':
      // Check if this is the first message in the conversation
      const msgCount = await query(
        `SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND direction = 'incoming'`,
        [conversation.id]
      );
      return parseInt(msgCount.rows[0].count) <= 1;

    case 'button_reply':
      return messageType === 'interactive' &&
        (messageText || '').toLowerCase().includes((flow.trigger_value || '').toLowerCase());

    default:
      return false;
  }
};

/**
 * Start a new flow session — find the first node and execute it
 */
const startFlow = async (flow, contact, conversation, io) => {
  // Get first node - the one not referenced as next_node_id by any other node
  const firstNodeResult = await query(
    `SELECT * FROM flow_nodes fn WHERE fn.flow_id = $1
     AND fn.id NOT IN (
       SELECT next_node_id FROM flow_nodes
       WHERE flow_id = $1 AND next_node_id IS NOT NULL
     )
     ORDER BY fn.position_y ASC LIMIT 1`,
    [flow.id]
  );

  if (firstNodeResult.rows.length === 0) {
    console.warn(`[FlowService] Flow ${flow.id} has no nodes`);
    return;
  }

  const firstNode = firstNodeResult.rows[0];

  // Create session
  const sessionResult = await query(
    `INSERT INTO flow_sessions (contact_id, flow_id, current_node_id, variables, status)
     VALUES ($1, $2, $3, $4, 'active') RETURNING *`,
    [contact.id, flow.id, firstNode.id, JSON.stringify({})]
  );

  const session = sessionResult.rows[0];
  console.log(`[FlowService] Started flow "${flow.name}" for contact ${contact.phone_number}`);

  await executeNode(firstNode, session, contact, conversation, null, io);
};

/**
 * Continue an existing session from where the contact left off
 */
const continueFlow = async (session, contact, conversation, messageText, io) => {
  await query(
    `UPDATE flow_sessions SET last_activity_at = NOW() WHERE id = $1`,
    [session.id]
  );

  const nodeResult = await query(
    `SELECT * FROM flow_nodes WHERE id = $1`,
    [session.current_node_id]
  );

  if (nodeResult.rows.length === 0) {
    await endSession(session.id);
    return;
  }

  const currentNode = nodeResult.rows[0];

  // If current node was waiting for user input (set_variable), store the reply
  // Only capture if node is actually waiting (current_node_id === node.id in session)
  if (currentNode.node_type === 'set_variable') {
    const varName = currentNode.node_config?.variable_name;
    if (varName && messageText) {
      const variables = { ...(session.variables || {}), [varName]: messageText };
      await query(
        `UPDATE flow_sessions SET variables = $1, last_activity_at = NOW() WHERE id = $2`,
        [JSON.stringify(variables), session.id]
      );
      session.variables = variables;
      console.log(`[FlowService] Captured variable "${varName}" = "${messageText}"`);
    }
  }

  // Move to next node
  if (currentNode.next_node_id) {
    const nextNodeResult = await query(
      `SELECT * FROM flow_nodes WHERE id = $1`,
      [currentNode.next_node_id]
    );
    if (nextNodeResult.rows.length > 0) {
      await query(
        `UPDATE flow_sessions SET current_node_id = $1 WHERE id = $2`,
        [nextNodeResult.rows[0].id, session.id]
      );
      await executeNode(nextNodeResult.rows[0], session, contact, conversation, messageText, io);
    } else {
      await endSession(session.id);
    }
  } else {
    await endSession(session.id);
  }
};

/**
 * Execute a single node based on its type
 */
const executeNode = async (node, session, contact, conversation, incomingText, io) => {
  const config = node.node_config || {};

  console.log(`[FlowService] Executing node type: ${node.node_type}`);

  switch (node.node_type) {

    case 'send_message': {
      // Replace variables in message text
      let text = config.text || '';
      const vars = session.variables || {};
      Object.keys(vars).forEach(k => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), vars[k]);
      });
      await whatsappService.sendTextMessage(contact.phone_number, text, conversation.id, io);

      // Auto-advance if has next node
      if (node.next_node_id) {
        const next = await query(`SELECT * FROM flow_nodes WHERE id = $1`, [node.next_node_id]);
        if (next.rows.length > 0) {
          await query(`UPDATE flow_sessions SET current_node_id=$1 WHERE id=$2`, [next.rows[0].id, session.id]);
          await executeNode(next.rows[0], session, contact, conversation, null, io);
        }
      } else {
        await endSession(session.id);
      }
      break;
    }

    case 'set_variable': {
      // This node WAITS for user input — just update current node pointer and stop
      await query(
        `UPDATE flow_sessions SET current_node_id = $1 WHERE id = $2`,
        [node.id, session.id]
      );
      // Optionally send a prompt message
      if (config.prompt) {
        console.log(`[FlowService] Sending prompt to ${contact.phone_number}: "${config.prompt}", convId: ${conversation.id}, io: ${!!io}`);
        try {
          await whatsappService.sendTextMessage(contact.phone_number, config.prompt, conversation.id, io);
          console.log(`[FlowService] Prompt sent OK`);
        } catch(e) { console.error('[FlowService] Prompt send FAILED:', e?.response?.data || e.message); }
      }
      break;
    }

    case 'delay': {
      const seconds = config.delay_seconds || 2;
      await new Promise(resolve => setTimeout(resolve, seconds * 1000));
      if (node.next_node_id) {
        const next = await query(`SELECT * FROM flow_nodes WHERE id = $1`, [node.next_node_id]);
        if (next.rows.length > 0) {
          await query(`UPDATE flow_sessions SET current_node_id=$1 WHERE id=$2`, [next.rows[0].id, session.id]);
          await executeNode(next.rows[0], session, contact, conversation, null, io);
        }
      }
      break;
    }

    case 'condition': {
      const varName  = config.variable || '';
      const operator = config.operator || 'contains';
      const value    = config.value || '';
      const varValue = (session.variables?.[varName] || incomingText || '').toLowerCase();
      const compareVal = value.toLowerCase();

      let conditionMet = false;
      if (operator === 'contains')    conditionMet = varValue.includes(compareVal);
      if (operator === 'equals')      conditionMet = varValue === compareVal;
      if (operator === 'not_equals')  conditionMet = varValue !== compareVal;

      const nextId = conditionMet ? node.next_node_id : (config.else_node_id || node.next_node_id);
      console.log(`[FlowService] Condition: met=${conditionMet}, nextId=${nextId}`);
      if (nextId) {
        const next = await query(`SELECT * FROM flow_nodes WHERE id = $1`, [nextId]);
        if (next.rows.length > 0) {
          await query(`UPDATE flow_sessions SET current_node_id=$1 WHERE id=$2`, [next.rows[0].id, session.id]);
          await executeNode(next.rows[0], session, contact, conversation, incomingText, io);
        } else {
          await endSession(session.id);
        }
      } else {
        await endSession(session.id);
      }
      break;
    }

    case 'end_flow': {
      const msg = config.message;
      if (msg) {
        await whatsappService.sendTextMessage(contact.phone_number, msg, conversation.id, io);
      }
      await endSession(session.id);
      break;
    }

    case 'human_handoff': {
      // Pause automation, notify agent via socket
      await query(
        `UPDATE conversations SET automation_enabled=false, updated_at=NOW() WHERE id=$1`,
        [conversation.id]
      );
      if (config.message) {
        await whatsappService.sendTextMessage(contact.phone_number, config.message, conversation.id, io);
      }
      io.emit('conversation_updated', { conversationId: conversation.id, automation_enabled: false });
      await endSession(session.id);
      break;
    }

    case 'ai_reply': {
      // Hand off to n8n/AI — exit flow session
      await endSession(session.id);
      break;
    }

    default:
      console.warn(`[FlowService] Unknown node type: ${node.node_type}`);
      if (node.next_node_id) {
        const next = await query(`SELECT * FROM flow_nodes WHERE id = $1`, [node.next_node_id]);
        if (next.rows.length > 0) {
          await executeNode(next.rows[0], session, contact, conversation, incomingText, io);
        }
      }
  }
};

const endSession = async (sessionId) => {
  await query(
    `UPDATE flow_sessions SET status='completed', last_activity_at=NOW() WHERE id=$1`,
    [sessionId]
  );
  console.log(`[FlowService] Session ${sessionId} completed`);
};

module.exports = { processFlowForMessage };
