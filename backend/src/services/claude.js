const Anthropic = require('@anthropic-ai/sdk');
const { pool } = require('../models/database');
const { applyGuardrails, checkEscalation, sanitizeInput } = require('./guardrails');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 1024;
const TEMPERATURE = 0.7;
const MAX_CONTEXT_MESSAGES = 20; // 10 pairs of user + assistant
const MAX_CONTEXT_TOKENS = 3000;

/**
 * Fetch active knowledge base entries and build system prompt
 */
async function buildSystemPrompt() {
  const { rows } = await pool.query(
    `SELECT category, title, content FROM knowledge_base WHERE is_active = TRUE ORDER BY category, title`
  );

  // Group entries by category
  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push(`**${row.title}**: ${row.content}`);
  }

  let knowledgeSection = '';
  for (const [category, entries] of Object.entries(grouped)) {
    knowledgeSection += `\n### ${category.toUpperCase()}\n${entries.join('\n')}\n`;
  }

  return `You are a helpful assistant for Journey to STEAM, a hands-on robotics, coding, and LEGO education provider for kids ages 5-12 (grades K-8). Founded by Dr. Arielle Hammond, a former K-5 principal. You serve the Portland Metro area (Clackamas, Multnomah, Washington counties in Oregon and Clark County in Washington).

KNOWLEDGE BASE:
${knowledgeSection || 'No knowledge base entries available yet. Answer general questions about STEAM education and direct specific inquiries to the team.'}

GUARDRAILS (CRITICAL - NEVER VIOLATE):
1. NEVER confirm enrollment or take payment information - always direct to the registration page or say "I'll connect you with our team to complete enrollment"
2. NEVER provide medical advice - redirect to "Please consult your pediatrician"
3. NEVER share other customers' information
4. If asked about topics outside your knowledge, say "Let me connect you with a team member who can help with that"
5. NEVER discuss politics, religion, or controversial topics
6. NEVER generate inappropriate content - this is a children's education platform
7. Keep responses concise (2-3 sentences max unless explaining programs in detail)

ESCALATION TRIGGERS (offer to connect with a team member when):
- Parent wants to enroll immediately
- Questions about special needs accommodations
- Complaints or refund requests
- Complex scheduling conflicts
- School partnership inquiries
- Questions requiring medical advice
- Requests outside your knowledge base

PERSONALITY:
- Warm, friendly, professional (imagine a helpful school administrator)
- Use parent's name when provided
- Enthusiastic about STEAM education
- Empathetic to parent concerns

LEAD CAPTURE:
- Naturally ask for name, email, phone during conversation flow
- Frame it as "I'd love to follow up with details - what's the best email to send info?"
- Never be pushy about collecting information

KEY CONTACT INFO (include when relevant):
- Email: getintouch@journeytosteam.com
- Phone: (503) 506-3287
- Website: https://journeytosteam.com

RESPONSE FORMAT:
- Use short paragraphs
- Use bullet points for listing programs or features
- Be direct and helpful
- Use emojis sparingly`;
}

/**
 * Get conversation history for context (last N messages)
 */
async function getConversationHistory(conversationId) {
  const { rows } = await pool.query(
    `SELECT role, content FROM messages 
     WHERE conversation_id = $1 
     ORDER BY created_at ASC`,
    [conversationId]
  );

  // Keep only last MAX_CONTEXT_MESSAGES
  const recent = rows.slice(-MAX_CONTEXT_MESSAGES);

  // Rough token estimation (4 chars ≈ 1 token)
  let totalChars = 0;
  const trimmed = [];
  for (let i = recent.length - 1; i >= 0; i--) {
    totalChars += recent[i].content.length;
    if (totalChars / 4 > MAX_CONTEXT_TOKENS && trimmed.length >= 4) break;
    trimmed.unshift(recent[i]);
  }

  return trimmed.map(m => ({ role: m.role, content: m.content }));
}

/**
 * Main chat handler - process user message through Claude with guardrails
 */
async function processMessage(userMessage, conversationId, channel = 'web') {
  // Pre-processing: sanitize and check guardrails
  const sanitized = sanitizeInput(userMessage);
  const preCheck = applyGuardrails(sanitized);

  if (preCheck.blocked) {
    return {
      response: preCheck.message,
      escalation: false,
      metadata: { blocked: true, reason: preCheck.reason },
    };
  }

  try {
    // Build system prompt with knowledge base
    const systemPrompt = await buildSystemPrompt();

    // Get conversation history for context
    const history = await getConversationHistory(conversationId);

    // Add current user message
    const messages = [
      ...history,
      { role: 'user', content: sanitized },
    ];

    // Call Claude API
    const startTime = Date.now();
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      system: systemPrompt,
      messages: messages,
    });

    const processingTime = Date.now() - startTime;
    let aiResponse = response.content[0].text;

    // Post-processing: validate Claude's response
    const postCheck = checkEscalation(aiResponse, sanitized);

    if (postCheck.needsEscalation) {
      // Add escalation note if not already present
      if (!aiResponse.includes('connect you with') && !aiResponse.includes('team member')) {
        aiResponse += '\n\nWould you like me to connect you with a team member who can help further?';
      }
    }

    // Format response based on channel
    if (channel === 'sms') {
      aiResponse = formatForSMS(aiResponse);
    }

    return {
      response: aiResponse,
      escalation: postCheck.needsEscalation,
      escalationReason: postCheck.reason || null,
      metadata: {
        model: MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        processingTimeMs: processingTime,
      },
    };
  } catch (err) {
    console.error('[Claude API Error]', err.message);

    // Handle specific API errors
    if (err.status === 429) {
      // Rate limited - retry with backoff
      return await retryWithBackoff(userMessage, conversationId, channel);
    }

    if (err.status === 529 || err.message?.includes('overloaded')) {
      return {
        response: getFallbackResponse(),
        escalation: false,
        metadata: { error: 'api_overloaded' },
      };
    }

    return {
      response: getFallbackResponse(),
      escalation: false,
      metadata: { error: err.message },
    };
  }
}

/**
 * Retry Claude API call with exponential backoff
 */
async function retryWithBackoff(userMessage, conversationId, channel, attempt = 1) {
  const maxAttempts = 3;
  const delays = [1000, 2000, 4000];

  if (attempt > maxAttempts) {
    return {
      response: getFallbackResponse(),
      escalation: false,
      metadata: { error: 'max_retries_exceeded' },
    };
  }

  await new Promise(resolve => setTimeout(resolve, delays[attempt - 1]));
  return processMessage(userMessage, conversationId, channel);
}

/**
 * Format response for SMS (strip markdown, limit length)
 */
function formatForSMS(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')     // Remove bold
    .replace(/\*(.*?)\*/g, '$1')           // Remove italic
    .replace(/#{1,6}\s/g, '')              // Remove headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/```[\s\S]*?```/g, '')        // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')           // Remove inline code
    .replace(/\n{3,}/g, '\n\n')            // Limit consecutive newlines
    .trim();
}

/**
 * Fallback response when Claude API is unavailable
 */
function getFallbackResponse() {
  return "I'm having trouble connecting right now. Please email us at getintouch@journeytosteam.com or call (503) 506-3287 and we'll get back to you shortly!";
}

module.exports = { processMessage, buildSystemPrompt };
