const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { processMessage } = require('../services/claude');
const { extractLeadInfo } = require('../services/guardrails');
const {
  findOrCreateConversation,
  saveMessage,
  updateConversationLead,
  escalateConversation,
  endConversation,
} = require('../services/conversation');

const router = express.Router();

/**
 * POST /api/chat
 * Process a chat message from the web widget
 * Body: { message: string, sessionId?: string }
 */
router.post('/', async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({ error: 'Message too long (max 2000 characters)' });
    }

    // Use provided session ID or generate new one
    const sid = sessionId || `web_${uuidv4()}`;

    // Find or create conversation
    const conversation = await findOrCreateConversation(sid, 'web');

    // Save user message
    await saveMessage(conversation.id, 'user', message.trim());

    // Extract any lead info from user message
    const leadInfo = extractLeadInfo(message);
    if (Object.keys(leadInfo).length > 0) {
      await updateConversationLead(conversation.id, leadInfo);
    }

    // Process through Claude AI
    const result = await processMessage(message.trim(), conversation.id, 'web');

    // Save assistant response
    await saveMessage(conversation.id, 'assistant', result.response, result.metadata);

    // Handle escalation
    if (result.escalation) {
      await escalateConversation(conversation.id, result.escalationReason);
    }

    res.json({
      response: result.response,
      sessionId: sid,
      escalation: result.escalation || false,
      conversationId: conversation.id,
    });
  } catch (err) {
    console.error('[Chat Route Error]', err);
    res.status(500).json({
      error: 'Something went wrong processing your message',
      fallback: "I'm having trouble connecting right now. Please email hello@journeytosteam.com and we'll respond within 1 hour!",
    });
  }
});

/**
 * POST /api/chat/lead
 * Update lead information for a conversation
 * Body: { sessionId: string, name?: string, email?: string, phone?: string, programInterest?: string }
 */
router.post('/lead', async (req, res) => {
  try {
    const { sessionId, name, email, phone, programInterest } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const conversation = await findOrCreateConversation(sessionId, 'web');

    const leadInfo = {};
    if (name) leadInfo.name = name;
    if (email) leadInfo.email = email;
    if (phone) leadInfo.phone = phone;
    if (programInterest) leadInfo.programInterest = programInterest;

    await updateConversationLead(conversation.id, leadInfo);

    res.json({ success: true });
  } catch (err) {
    console.error('[Lead Route Error]', err);
    res.status(500).json({ error: 'Failed to save lead information' });
  }
});

/**
 * POST /api/chat/end
 * End a conversation session
 * Body: { sessionId: string }
 */
router.post('/end', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const conversation = await findOrCreateConversation(sessionId, 'web');
    await endConversation(conversation.id);

    res.json({ success: true });
  } catch (err) {
    console.error('[End Chat Error]', err);
    res.status(500).json({ error: 'Failed to end conversation' });
  }
});

/**
 * GET /api/chat/history/:sessionId
 * Get conversation history for a session
 */
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const conversation = await findOrCreateConversation(sessionId, 'web');

    const { pool } = require('../models/database');
    const { rows } = await pool.query(
      `SELECT role, content, created_at FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
      [conversation.id]
    );

    res.json({
      sessionId,
      messages: rows.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.created_at,
      })),
    });
  } catch (err) {
    console.error('[History Route Error]', err);
    res.status(500).json({ error: 'Failed to retrieve conversation history' });
  }
});

module.exports = router;
