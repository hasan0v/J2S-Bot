const xss = require('xss');

/**
 * Sanitize user input - strip HTML/XSS, trim whitespace
 */
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';
  
  // Strip HTML tags and XSS vectors
  let clean = xss(text, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style'],
  });

  // Trim and limit length
  clean = clean.trim().substring(0, 2000);
  
  return clean;
}

/**
 * Pre-processing guardrails - check user message before sending to Claude
 */
function applyGuardrails(userMessage) {
  const lower = userMessage.toLowerCase();

  // Check for credit card numbers (basic regex patterns)
  const ccPatterns = [
    /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,  // Standard card format
    /\b\d{15,16}\b/,                                    // Continuous digits
  ];
  
  for (const pattern of ccPatterns) {
    if (pattern.test(userMessage)) {
      return {
        blocked: true,
        message: "For your security, please don't share payment card information in chat. Our team will collect payment details securely when you're ready to enroll. Would you like me to connect you with someone?",
        reason: 'payment_card_detected',
      };
    }
  }

  // Check for SSN patterns
  if (/\b\d{3}[-]?\d{2}[-]?\d{4}\b/.test(userMessage)) {
    const ssnLike = userMessage.match(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/)[0];
    // Basic check - SSNs start with specific ranges
    const first3 = parseInt(ssnLike.replace(/-/g, '').substring(0, 3));
    if (first3 > 0 && first3 < 900) {
      return {
        blocked: true,
        message: "For your privacy, please don't share sensitive personal identification numbers in chat. Is there something else I can help you with?",
        reason: 'ssn_detected',
      };
    }
  }

  // Check for medical-specific queries
  const medicalKeywords = [
    'diagnosis', 'medication', 'prescription', 'medical condition',
    'adhd medication', 'dosage', 'treatment plan', 'medical advice',
    'should i give my child', 'is it safe to',
  ];
  
  for (const keyword of medicalKeywords) {
    if (lower.includes(keyword)) {
      return {
        blocked: false,
        medicalDisclaimer: true,
        message: null,
        reason: 'medical_keyword',
      };
    }
  }

  return { blocked: false, message: null };
}

/**
 * Post-processing - check Claude's response for issues and detect escalation needs
 */
function checkEscalation(aiResponse, userMessage) {
  const lowerResponse = aiResponse.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // Check if AI accidentally confirmed enrollment
  const enrollmentPhrases = [
    'you are now enrolled',
    'enrollment confirmed',
    'you have been registered',
    'registration complete',
    'payment processed',
    'your spot is reserved',
    'you\'re all set',
    'enrollment is complete',
  ];

  for (const phrase of enrollmentPhrases) {
    if (lowerResponse.includes(phrase)) {
      return {
        needsEscalation: true,
        reason: 'enrollment_confirmation_detected',
        severity: 'high',
      };
    }
  }

  // Check user message for escalation triggers
  const escalationTriggers = [
    { keywords: ['enroll', 'sign up', 'register', 'join'], reason: 'enrollment_request' },
    { keywords: ['special needs', 'accommodation', 'iep', 'disability', '504 plan'], reason: 'special_needs_inquiry' },
    { keywords: ['complaint', 'refund', 'unhappy', 'disappointed', 'terrible', 'worst'], reason: 'complaint' },
    { keywords: ['cancel', 'cancellation'], reason: 'cancellation_request' },
    { keywords: ['speak to someone', 'talk to a person', 'human', 'real person', 'manager'], reason: 'human_handoff_request' },
    { keywords: ['schedule conflict', 'can\'t make it', 'reschedule', 'change the time'], reason: 'scheduling_conflict' },
  ];

  for (const trigger of escalationTriggers) {
    if (trigger.keywords.some(kw => lowerMessage.includes(kw))) {
      return { needsEscalation: true, reason: trigger.reason };
    }
  }

  // Check if AI response suggests escalation
  if (lowerResponse.includes('connect you with') || 
      lowerResponse.includes('team member') ||
      lowerResponse.includes('let me get someone')) {
    return { needsEscalation: true, reason: 'ai_suggested_handoff' };
  }

  return { needsEscalation: false };
}

/**
 * Extract lead information from user messages
 */
function extractLeadInfo(message) {
  const info = {};

  // Extract email
  const emailMatch = message.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) info.email = emailMatch[0].toLowerCase();

  // Extract phone (various formats)
  const phoneMatch = message.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    let phone = phoneMatch[0].replace(/[^\d+]/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11 && phone.startsWith('1')) phone = '+' + phone;
    info.phone = phone;
  }

  // Extract name (heuristic: "my name is X" or "I'm X")
  const namePatterns = [
    /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^(?:hi|hello|hey),?\s+(?:my name is|i'm|i am)\s+([A-Z][a-z]+)/i,
  ];
  
  for (const pattern of namePatterns) {
    const nameMatch = message.match(pattern);
    if (nameMatch) {
      info.name = nameMatch[1].trim();
      break;
    }
  }

  return info;
}

module.exports = { sanitizeInput, applyGuardrails, checkEscalation, extractLeadInfo };
