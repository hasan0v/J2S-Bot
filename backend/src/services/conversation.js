const { pool } = require('../models/database');

/**
 * Create or get a conversation by session ID
 */
async function findOrCreateConversation(sessionId, channel = 'web', phone = null) {
  // Try to find existing conversation
  const { rows } = await pool.query(
    `SELECT * FROM conversations WHERE session_id = $1`,
    [sessionId]
  );

  if (rows.length > 0) {
    // Update the updated_at timestamp
    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [rows[0].id]
    );
    return rows[0];
  }

  // Create new conversation
  const { rows: newRows } = await pool.query(
    `INSERT INTO conversations (session_id, channel, parent_phone, status) 
     VALUES ($1, $2, $3, 'active') 
     RETURNING *`,
    [sessionId, channel, phone]
  );

  return newRows[0];
}

/**
 * Save a message to the database
 */
async function saveMessage(conversationId, role, content, metadata = {}) {
  const { rows } = await pool.query(
    `INSERT INTO messages (conversation_id, role, content, metadata) 
     VALUES ($1, $2, $3, $4) 
     RETURNING *`,
    [conversationId, role, content, JSON.stringify(metadata)]
  );
  return rows[0];
}

/**
 * Update conversation with lead info
 */
async function updateConversationLead(conversationId, leadInfo) {
  const updates = [];
  const values = [];
  let paramIndex = 1;

  if (leadInfo.name) {
    updates.push(`parent_name = $${paramIndex++}`);
    values.push(leadInfo.name);
  }
  if (leadInfo.email) {
    updates.push(`parent_email = $${paramIndex++}`);
    values.push(leadInfo.email);
  }
  if (leadInfo.phone) {
    updates.push(`parent_phone = $${paramIndex++}`);
    values.push(leadInfo.phone);
  }
  if (leadInfo.programInterest) {
    updates.push(`program_interest = $${paramIndex++}`);
    values.push(leadInfo.programInterest);
  }

  if (updates.length === 0) return;

  updates.push(`updated_at = NOW()`);
  values.push(conversationId);

  await pool.query(
    `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
    values
  );
}

/**
 * Mark conversation as escalated
 */
async function escalateConversation(conversationId, reason) {
  await pool.query(
    `UPDATE conversations SET status = 'escalated', escalation_reason = $2, updated_at = NOW() WHERE id = $1`,
    [conversationId, reason]
  );
}

/**
 * End a conversation
 */
async function endConversation(conversationId) {
  await pool.query(
    `UPDATE conversations SET status = 'ended', updated_at = NOW() WHERE id = $1`,
    [conversationId]
  );
}

/**
 * Get all conversations with pagination and filters
 */
async function getConversations({ page = 1, limit = 20, status, channel, search, startDate, endDate }) {
  let whereClause = ' WHERE 1=1';
  const params = [];
  let paramIndex = 1;

  if (status) {
    whereClause += ` AND c.status = $${paramIndex++}`;
    params.push(status);
  }
  if (channel) {
    whereClause += ` AND c.channel = $${paramIndex++}`;
    params.push(channel);
  }
  if (search) {
    whereClause += ` AND (c.parent_name ILIKE $${paramIndex} OR c.parent_email ILIKE $${paramIndex} OR c.parent_phone ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  if (startDate) {
    whereClause += ` AND c.created_at >= $${paramIndex++}`;
    params.push(startDate);
  }
  if (endDate) {
    whereClause += ` AND c.created_at <= $${paramIndex++}`;
    params.push(endDate);
  }

  // Count total
  const countQuery = `SELECT COUNT(*) FROM conversations c${whereClause}`;
  const { rows: countRows } = await pool.query(countQuery, params);
  const total = parseInt(countRows[0].count);

  // Fetch conversations with last message and message count
  const dataQuery = `SELECT c.*, 
    (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message,
    (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id) as message_count
    FROM conversations c${whereClause}
    ORDER BY c.updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const dataParams = [...params, limit, (page - 1) * limit];
  const { rows } = await pool.query(dataQuery, dataParams);

  return {
    conversations: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single conversation with all messages
 */
async function getConversationWithMessages(conversationId) {
  const { rows: convRows } = await pool.query(
    `SELECT * FROM conversations WHERE id = $1`,
    [conversationId]
  );
  if (convRows.length === 0) return null;

  const { rows: messages } = await pool.query(
    `SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [conversationId]
  );

  return { ...convRows[0], messages };
}

/**
 * Get leads (conversations with contact info)
 */
async function getLeads({ page = 1, limit = 50, search }) {
  let query = `SELECT id, parent_name, parent_email, parent_phone, program_interest, channel, created_at 
    FROM conversations 
    WHERE (parent_email IS NOT NULL OR parent_phone IS NOT NULL)`;
  const params = [];
  let paramIndex = 1;

  if (search) {
    query += ` AND (parent_name ILIKE $${paramIndex} OR parent_email ILIKE $${paramIndex} OR parent_phone ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const countQuery = `SELECT COUNT(*) FROM conversations WHERE (parent_email IS NOT NULL OR parent_phone IS NOT NULL)${search ? ` AND (parent_name ILIKE $1 OR parent_email ILIKE $1 OR parent_phone ILIKE $1)` : ''}`;
  const { rows: countRows } = await pool.query(countQuery, search ? [`%${search}%`] : []);
  const total = parseInt(countRows[0].count);

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  params.push(limit, (page - 1) * limit);

  const { rows } = await pool.query(query, params);

  return {
    leads: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/**
 * Get all leads for CSV export
 */
async function getAllLeadsForExport() {
  const { rows } = await pool.query(
    `SELECT parent_name, parent_email, parent_phone, program_interest, channel, created_at 
     FROM conversations 
     WHERE (parent_email IS NOT NULL OR parent_phone IS NOT NULL)
     ORDER BY created_at DESC`
  );
  return rows;
}

/**
 * Get dashboard metrics
 */
async function getMetrics() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.setDate(now.getDate() - now.getDay())).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [todayRes, weekRes, monthRes, leadsRes, escalatedRes, avgResponseRes] = await Promise.all([
    pool.query(`SELECT COUNT(*) FROM conversations WHERE created_at >= $1`, [todayStart]),
    pool.query(`SELECT COUNT(*) FROM conversations WHERE created_at >= $1`, [weekStart]),
    pool.query(`SELECT COUNT(*) FROM conversations WHERE created_at >= $1`, [monthStart]),
    pool.query(`SELECT COUNT(*) FROM conversations WHERE parent_email IS NOT NULL OR parent_phone IS NOT NULL`),
    pool.query(`SELECT COUNT(*) FROM conversations WHERE status = 'escalated'`),
    pool.query(`
      SELECT AVG(response_time) as avg_response_time FROM (
        SELECT EXTRACT(EPOCH FROM (
          (SELECT MIN(m2.created_at) FROM messages m2 WHERE m2.conversation_id = m1.conversation_id AND m2.role = 'assistant' AND m2.created_at > m1.created_at)
          - m1.created_at
        )) as response_time
        FROM messages m1 WHERE m1.role = 'user'
      ) sub WHERE response_time IS NOT NULL
    `),
  ]);

  const totalMonth = parseInt(monthRes.rows[0].count) || 1;
  const totalEscalated = parseInt(escalatedRes.rows[0].count);

  return {
    conversationsToday: parseInt(todayRes.rows[0].count),
    conversationsThisWeek: parseInt(weekRes.rows[0].count),
    conversationsThisMonth: parseInt(monthRes.rows[0].count),
    totalLeads: parseInt(leadsRes.rows[0].count),
    escalationRate: Math.round((totalEscalated / totalMonth) * 100),
    avgResponseTime: avgResponseRes.rows[0].avg_response_time 
      ? Math.round(parseFloat(avgResponseRes.rows[0].avg_response_time) * 10) / 10
      : null,
  };
}

/**
 * Get conversation trends (last 30 days)
 */
async function getConversationTrends() {
  const { rows } = await pool.query(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM conversations
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  return rows;
}

module.exports = {
  findOrCreateConversation,
  saveMessage,
  updateConversationLead,
  escalateConversation,
  endConversation,
  getConversations,
  getConversationWithMessages,
  getLeads,
  getAllLeadsForExport,
  getMetrics,
  getConversationTrends,
};
