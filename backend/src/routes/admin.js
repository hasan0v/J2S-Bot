const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const {
  getConversations,
  getConversationWithMessages,
  getLeads,
  getAllLeadsForExport,
  getMetrics,
  getConversationTrends,
  escalateConversation,
  endConversation,
} = require('../services/conversation');

const router = express.Router();

// All admin routes require authentication
router.use(authenticateToken);

/**
 * GET /api/admin/conversations
 * List conversations with filtering and pagination
 */
router.get('/conversations', async (req, res) => {
  try {
    const { page, limit, status, channel, search, startDate, endDate } = req.query;
    const result = await getConversations({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20,
      status,
      channel,
      search,
      startDate,
      endDate,
    });
    res.json(result);
  } catch (err) {
    console.error('[Admin Conversations Error]', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * GET /api/admin/conversations/:id
 * Get a single conversation with all messages
 */
router.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await getConversationWithMessages(req.params.id);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json(conversation);
  } catch (err) {
    console.error('[Admin Conversation Detail Error]', err);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

/**
 * PUT /api/admin/conversations/:id/escalate
 * Mark a conversation as escalated
 */
router.put('/conversations/:id/escalate', async (req, res) => {
  try {
    const { reason } = req.body;
    await escalateConversation(req.params.id, reason || 'Manually escalated by admin');
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin Escalate Error]', err);
    res.status(500).json({ error: 'Failed to escalate conversation' });
  }
});

/**
 * PUT /api/admin/conversations/:id/end
 * End a conversation
 */
router.put('/conversations/:id/end', async (req, res) => {
  try {
    await endConversation(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('[Admin End Error]', err);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

/**
 * GET /api/admin/leads
 * Get leads (conversations with contact info)
 */
router.get('/leads', async (req, res) => {
  try {
    const { page, limit, search } = req.query;
    const result = await getLeads({
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 50,
      search,
    });
    res.json(result);
  } catch (err) {
    console.error('[Admin Leads Error]', err);
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

/**
 * GET /api/admin/leads/export
 * Export leads as CSV
 */
router.get('/leads/export', async (req, res) => {
  try {
    const leads = await getAllLeadsForExport();

    // Build CSV
    const headers = ['Name', 'Email', 'Phone', 'Program Interest', 'Channel', 'Date'];
    const csvRows = [headers.join(',')];

    for (const lead of leads) {
      csvRows.push([
        escapeCsvField(lead.parent_name || ''),
        escapeCsvField(lead.parent_email || ''),
        escapeCsvField(lead.parent_phone || ''),
        escapeCsvField(lead.program_interest || ''),
        lead.channel,
        new Date(lead.created_at).toISOString().split('T')[0],
      ].join(','));
    }

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (err) {
    console.error('[Admin Export Error]', err);
    res.status(500).json({ error: 'Failed to export leads' });
  }
});

/**
 * GET /api/admin/metrics
 * Get dashboard metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = await getMetrics();
    res.json(metrics);
  } catch (err) {
    console.error('[Admin Metrics Error]', err);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

/**
 * GET /api/admin/trends
 * Get conversation trends (last 30 days)
 */
router.get('/trends', async (req, res) => {
  try {
    const trends = await getConversationTrends();
    res.json(trends);
  } catch (err) {
    console.error('[Admin Trends Error]', err);
    res.status(500).json({ error: 'Failed to fetch trends' });
  }
});

/**
 * Escape CSV field values
 */
function escapeCsvField(value) {
  if (!value) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

module.exports = router;
