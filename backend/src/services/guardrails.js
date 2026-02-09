const xss = require('xss');

// ═══════════════════════════════════════════════════════════════════
//  J2S-Bot Guardrails — Production-Grade Safety System
//  Children's education platform — zero tolerance for unsafe content
// ═══════════════════════════════════════════════════════════════════

// ─── Flood Protection (in-memory, per-session) ────────────────────
const messageTimestamps = new Map(); // sessionId → [timestamps]
const FLOOD_WINDOW_MS = 60_000;      // 1-minute window
const FLOOD_MAX_MESSAGES = 15;       // max messages per window
const FLOOD_CLEANUP_INTERVAL = 300_000; // cleanup every 5 min

// Periodic cleanup of stale flood-tracking entries
setInterval(() => {
  const cutoff = Date.now() - FLOOD_WINDOW_MS * 2;
  for (const [key, timestamps] of messageTimestamps) {
    const recent = timestamps.filter(t => t > cutoff);
    if (recent.length === 0) messageTimestamps.delete(key);
    else messageTimestamps.set(key, recent);
  }
}, FLOOD_CLEANUP_INTERVAL);


// ═══════════════════════════════════════════════════════════════════
//  1. INPUT SANITIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Sanitize user input — strip HTML/XSS, trim, enforce length limit
 */
function sanitizeInput(text) {
  if (!text || typeof text !== 'string') return '';

  let clean = xss(text, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style', 'iframe', 'object', 'embed'],
  });

  // Normalize unicode tricks (zero-width chars, homoglyphs)
  clean = clean.replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Collapse excessive whitespace
  clean = clean.replace(/\s{10,}/g, '   ');

  // Trim and limit length
  clean = clean.trim().substring(0, 2000);

  return clean;
}


// ═══════════════════════════════════════════════════════════════════
//  2. PRE-PROCESSING GUARDRAILS — Check BEFORE sending to Claude
// ═══════════════════════════════════════════════════════════════════

/**
 * Master pre-processing pipeline — runs all input checks in priority order.
 * Returns: { blocked, flagged, message, reason, medicalDisclaimer }
 */
function applyGuardrails(userMessage, sessionId = null) {
  const lower = userMessage.toLowerCase().trim();

  // ── 2a. Flood detection ──────────────────────────────────────
  if (sessionId) {
    const floodResult = checkFlood(sessionId);
    if (floodResult.blocked) return floodResult;
  }

  // ── 2b. Empty / garbage input ────────────────────────────────
  const garbageResult = checkGarbage(userMessage, lower);
  if (garbageResult.blocked) return garbageResult;

  // ── 2c. Prompt injection / jailbreak ─────────────────────────
  const injectionResult = checkPromptInjection(lower);
  if (injectionResult.blocked) return injectionResult;

  // ── 2d. Sensitive PII (credit cards, SSN, bank accounts) ─────
  const piiResult = checkSensitivePII(userMessage, lower);
  if (piiResult.blocked) return piiResult;

  // ── 2e. Age-inappropriate / harmful content ──────────────────
  const contentResult = checkInappropriateContent(lower);
  if (contentResult.blocked) return contentResult;

  // ── 2f. Profanity / abuse / threats ──────────────────────────
  const abuseResult = checkAbuse(lower);
  if (abuseResult.blocked) return abuseResult;

  // ── 2g. Phishing / malicious URLs ───────────────────────────
  const urlResult = checkMaliciousURLs(userMessage);
  if (urlResult.blocked) return urlResult;

  // ── 2h. Off-topic / competitor probing ──────────────────────
  const offTopicResult = checkOffTopic(lower);
  if (offTopicResult.flagged) return offTopicResult;

  // ── 2i. Medical keyword detection (non-blocking) ────────────
  const medicalResult = checkMedicalContent(lower);
  if (medicalResult.medicalDisclaimer) return medicalResult;

  return { blocked: false, flagged: false, message: null };
}


// ─── 2a. Flood Detection ──────────────────────────────────────────
function checkFlood(sessionId) {
  const now = Date.now();
  const timestamps = messageTimestamps.get(sessionId) || [];
  const recent = timestamps.filter(t => now - t < FLOOD_WINDOW_MS);
  recent.push(now);
  messageTimestamps.set(sessionId, recent);

  if (recent.length > FLOOD_MAX_MESSAGES) {
    return {
      blocked: true,
      message: "You're sending messages very quickly! Please wait a moment before trying again.",
      reason: 'flood_detected',
    };
  }
  return { blocked: false };
}


// ─── 2b. Garbage / Gibberish Detection ────────────────────────────
function checkGarbage(raw, lower) {
  // All-whitespace or empty after sanitization
  if (lower.length === 0) {
    return { blocked: true, message: "It looks like your message was empty. How can I help you?", reason: 'empty_message' };
  }

  // Extremely short single-char spam (excluding "?", "y", "n", etc.)
  if (lower.length === 1 && !/[a-z0-9?!]/.test(lower)) {
    return { blocked: true, message: "I didn't catch that. Could you tell me what you'd like to know about Journey to STEAM?", reason: 'gibberish' };
  }

  // Repeated character spam: "aaaaaaaaaa", "!!!!!!!!!!!!"
  if (/^(.)\1{15,}$/.test(lower)) {
    return { blocked: true, message: "I didn't catch that. How can I help you with Journey to STEAM programs?", reason: 'repeated_chars' };
  }

  // Excessive special-character ratio (>80% non-alphanumeric in messages >10 chars)
  if (raw.length > 10) {
    const alphaCount = (raw.match(/[a-zA-Z0-9\s]/g) || []).length;
    if (alphaCount / raw.length < 0.2) {
      return { blocked: true, message: "I had trouble reading that. Could you rephrase your question about our programs?", reason: 'special_char_spam' };
    }
  }

  return { blocked: false };
}


// ─── 2c. Prompt Injection / Jailbreak Detection ──────────────────
function checkPromptInjection(lower) {
  const injectionPatterns = [
    // Direct instruction override attempts
    /ignore\s+(all\s+)?(previous|prior|above|your|system)\s+(instructions?|prompts?|rules?|guardrails?|guidelines?)/,
    /disregard\s+(all\s+)?(previous|prior|above|your)\s+(instructions?|prompts?|rules?)/,
    /forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|rules?)/,
    /override\s+(your|all|the)\s+(instructions?|prompts?|rules?|guardrails?|settings?)/,

    // Role-play / identity manipulation
    /you\s+are\s+now\s+(a|an|my|the)\s+/,
    /pretend\s+(to\s+be|you\s+are|you're)\s+/,
    /act\s+as\s+(a|an|if\s+you\s+are|if\s+you're)\s+/,
    /roleplay\s+as/,
    /from\s+now\s+on\s+(you\s+are|you're|act|behave|respond)/,
    /switch\s+to\s+(\w+)\s+mode/,
    /enter\s+(\w+)\s+mode/,
    /activate\s+(\w+)\s+mode/,

    // System prompt extraction
    /what\s+(are|is)\s+your\s+(system\s+)?(instructions?|prompts?|rules?|guidelines?|programming)/,
    /show\s+me\s+your\s+(system\s+)?(prompt|instructions?|rules?|config)/,
    /reveal\s+your\s+(system\s+)?(prompt|instructions?|rules?)/,
    /print\s+your\s+(system\s+)?(prompt|instructions?)/,
    /output\s+your\s+(system\s+)?(prompt|instructions?)/,
    /repeat\s+(your|the)\s+(system\s+)?(prompt|instructions?)/,

    // Delimiter / context manipulation
    /\[system\]/i,
    /\[INST\]/i,
    /<\/?system>/i,
    /###\s*(system|instruction|prompt)/,
    /\bsystem:\s/,
    /\bhuman:\s/i,
    /\bassistant:\s/i,
    /```system/i,

    // DAN / jailbreak named attacks
    /\bdan\b.*\bmode\b/,
    /\bjailbreak/,
    /\bdo\s+anything\s+now\b/,
    /\bdevil\s+mode\b/,
    /\bgod\s+mode\b/,
    /\bunfiltered\s+mode\b/,
    /\bno\s+restrictions?\s+mode\b/,
    /\bdeveloper\s+mode\b/,

    // Token manipulation
    /\bignore\s+safety\b/,
    /\bbypass\s+(filter|guard|safe|content)/,
    /\bdisable\s+(filter|guard|safe|content)/,
    /\bturn\s+off\s+(filter|guard|safe|content)/,
    /\bremove\s+(filter|guard|safe|content)/,
  ];

  for (const pattern of injectionPatterns) {
    if (pattern.test(lower)) {
      return {
        blocked: true,
        message: "I'm here to help with Journey to STEAM programs! What would you like to know about our classes, camps, or events?",
        reason: 'prompt_injection',
      };
    }
  }

  return { blocked: false };
}


// ─── 2d. Sensitive PII Detection ──────────────────────────────────
function checkSensitivePII(raw, lower) {
  // Credit card numbers (Visa, Mastercard, Amex, Discover patterns)
  const ccPatterns = [
    /\b4\d{3}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,         // Visa
    /\b5[1-5]\d{2}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,     // Mastercard
    /\b3[47]\d{2}[\s-]?\d{6}[\s-]?\d{5}\b/,                  // Amex
    /\b6(?:011|5\d{2})[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,  // Discover
    /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/,               // Any 16-digit formatted
    /\b\d{15,16}\b/,                                           // Any 15-16 continuous digits
  ];

  for (const pattern of ccPatterns) {
    if (pattern.test(raw)) {
      return {
        blocked: true,
        message: "For your security, please don't share payment card information in chat. When you're ready to enroll, our team will collect payment through a secure process. Would you like me to connect you with someone?",
        reason: 'credit_card_detected',
      };
    }
  }

  // SSN patterns (XXX-XX-XXXX)
  const ssnMatch = raw.match(/\b(\d{3})[-\s]?(\d{2})[-\s]?(\d{4})\b/);
  if (ssnMatch) {
    const first3 = parseInt(ssnMatch[1]);
    // Valid SSN ranges (exclude known non-SSN patterns like zip codes, dates)
    if (first3 > 0 && first3 < 900 && first3 !== 666 && parseInt(ssnMatch[2]) > 0 && parseInt(ssnMatch[3]) > 0) {
      return {
        blocked: true,
        message: "For your privacy and security, please never share your Social Security number in chat. We don't need it for any of our programs. How else can I help you?",
        reason: 'ssn_detected',
      };
    }
  }

  // Bank account / routing numbers
  if (/\b(bank\s*account|routing\s*number|account\s*number|aba\s*number)\s*[:#]?\s*\d{6,17}\b/i.test(raw)) {
    return {
      blocked: true,
      message: "For your security, please don't share bank account or routing numbers in chat. Our team can help with payment securely. Would you like me to connect you with someone?",
      reason: 'bank_info_detected',
    };
  }

  // Password sharing
  if (/\b(my\s+password\s+is|password\s*[:#]\s*\S+|login\s*[:#]\s*\S+)/i.test(raw)) {
    return {
      blocked: true,
      message: "Please don't share passwords or login credentials in chat. If you need help with your account, please contact us at getintouch@journeytosteam.com.",
      reason: 'password_detected',
    };
  }

  // Date of birth in full detail (child safety — MM/DD/YYYY or similar)
  if (/\b(date\s+of\s+birth|birthday|dob)\s*(is|:)?\s*\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i.test(raw)) {
    return {
      blocked: false,
      flagged: true,
      message: null,
      reason: 'dob_shared',
      note: 'Parent shared child DOB — store only age range, not exact date',
    };
  }

  return { blocked: false };
}


// ─── 2e. Age-Inappropriate / Harmful Content ─────────────────────
function checkInappropriateContent(lower) {
  // Violence / weapon references
  const violencePatterns = [
    /\b(gun|firearm|weapon|shoot|kill|murder|bomb|explod|terroris)/,
    /\b(stab|assault|attack\s+(?:a|the)\s+\w+|hurt\s+(?:a|the|my)\s+child)/,
    /\b(suicide|self[- ]?harm|cut\s+my(self)?|end\s+my\s+life)/,
  ];

  // Sexual content (children's platform — zero tolerance)
  const sexualPatterns = [
    /\b(sex|porn|nude|naked|erotic|xxx|nsfw|onlyfans|stripper|prostitut)/,
    /\b(molest|pedophil|groom(ing)?|inappropriat(e|ely)\s+touch)/,
    /\b(sex(ual|ually)\s+(abuse|assault|predator|offender))/,
  ];

  // Drug / substance references
  const drugPatterns = [
    /\b(marijuana|cocaine|heroin|meth|opioid|fentanyl|drug\s+dealer|weed|edible)/,
    /\b(buy\s+(drugs?|weed|pills)|sell\s+(drugs?|weed|pills))/,
  ];

  // Hate speech / discrimination
  const hatePatterns = [
    /\b(white\s+supremac|racial\s+superiorit|ethnic\s+cleans)/,
    /\b(hate\s+(all|every)\s+(black|white|asian|muslim|jew|christian|gay|trans))/,
    /\b(nazi|hitler\s+was\s+right|holocaust\s+(?:didn'?t|never))/,
  ];

  const allPatterns = [
    { patterns: violencePatterns, reason: 'violence_detected', msg: "I'm only able to help with questions about Journey to STEAM's educational programs. If you or someone you know needs help, please call 988 (Suicide & Crisis Lifeline) or 911 for emergencies." },
    { patterns: sexualPatterns, reason: 'sexual_content_detected', msg: "This is a children's education platform. I can only help with questions about Journey to STEAM programs and services." },
    { patterns: drugPatterns, reason: 'drug_content_detected', msg: "I'm only able to help with questions about Journey to STEAM's educational programs. What would you like to know about our classes or camps?" },
    { patterns: hatePatterns, reason: 'hate_speech_detected', msg: "Journey to STEAM is an inclusive community that welcomes all families. I can help with questions about our programs and services." },
  ];

  for (const category of allPatterns) {
    for (const pattern of category.patterns) {
      if (pattern.test(lower)) {
        return {
          blocked: true,
          message: category.msg,
          reason: category.reason,
        };
      }
    }
  }

  return { blocked: false };
}


// ─── 2f. Profanity / Abuse / Threats ──────────────────────────────
function checkAbuse(lower) {
  // Direct threats
  const threatPatterns = [
    /\b(i('ll|m\s+going\s+to|m\s+gonna|will))\s+(kill|hurt|harm|find|hunt|stalk)\s+(you|them|her|him|the\s+)/,
    /\b(threat(en)?|harass|stalk|dox|swat)\s+(you|them|the\s+)/,
    /\b(i\s+know\s+where\s+you\s+live|come\s+find\s+you|watch\s+your\s+back)/,
  ];

  for (const pattern of threatPatterns) {
    if (pattern.test(lower)) {
      return {
        blocked: true,
        message: "This type of language is not appropriate. If you have a concern, please contact us at getintouch@journeytosteam.com or call (503) 506-3287.",
        reason: 'threat_detected',
      };
    }
  }

  // Heavy profanity (common patterns — not an exhaustive list, just the worst offenders)
  const profanityPatterns = [
    /\bf+u+c+k+/,
    /\bs+h+i+t+(?!ake)/,  // exclude "shiitake"
    /\ba+s+s+h+o+l+e/,
    /\bb+i+t+c+h/,
    /\bc+u+n+t/,
    /\bn+i+g+g+/,
    /\bf+a+g+(?:g+o+t+)?/,
    /\bwh+o+r+e/,
    /\bret+a+r+d/,
  ];

  for (const pattern of profanityPatterns) {
    if (pattern.test(lower)) {
      return {
        blocked: true,
        message: "Let's keep our conversation friendly! I'm here to help with Journey to STEAM programs. What would you like to know?",
        reason: 'profanity_detected',
      };
    }
  }

  return { blocked: false };
}


// ─── 2g. Malicious URL Detection ──────────────────────────────────
function checkMaliciousURLs(raw) {
  // Extract URLs from message
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;
  const urls = raw.match(urlPattern) || [];

  if (urls.length === 0) return { blocked: false };

  // Allow only journeytosteam.com URLs
  const allowedDomains = [
    'journeytosteam.com',
    'www.journeytosteam.com',
  ];

  for (const url of urls) {
    try {
      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();
      if (!allowedDomains.some(d => hostname === d || hostname.endsWith('.' + d))) {
        return {
          blocked: true,
          message: "For everyone's safety, I can't process external links. If you have a question about Journey to STEAM, I'm happy to help!",
          reason: 'external_url_detected',
        };
      }
    } catch {
      // Malformed URL — block it
      return {
        blocked: true,
        message: "I wasn't able to process that link. How can I help you with Journey to STEAM programs?",
        reason: 'malformed_url_detected',
      };
    }
  }

  return { blocked: false };
}


// ─── 2h. Off-Topic / Competitor Probing ───────────────────────────
function checkOffTopic(lower) {
  // Competitor comparisons — don't block, but flag for the AI to stay on-brand
  const competitorPatterns = [
    /\b(code\s*ninja|kumon|mathnasium|sylvan|c2\s*education|russian\s*school|snapology)/,
    /\b(better\s+than|worse\s+than|compared?\s+to|vs\.?\s+)\w+/,
  ];

  for (const pattern of competitorPatterns) {
    if (pattern.test(lower)) {
      return {
        blocked: false,
        flagged: true,
        message: null,
        reason: 'competitor_mention',
        note: 'User mentioned a competitor — AI should focus on J2S strengths without criticizing others',
      };
    }
  }

  // Completely unrelated topics (not blocking, but flagging for AI guidance)
  const unrelatedPatterns = [
    /\b(stock\s+market|crypto|bitcoin|invest(ment|ing)?|forex)\b/,
    /\b(election|democrat|republican|trump|biden|politic)/,
    /\b(recipe|cook(ing)?|restaurant|diet\s+plan)\b/,
    /\b(dating|tinder|relationship\s+advice)\b/,
  ];

  for (const pattern of unrelatedPatterns) {
    if (pattern.test(lower)) {
      return {
        blocked: false,
        flagged: true,
        message: null,
        reason: 'off_topic',
        note: 'User asked about unrelated topic — AI should redirect to J2S programs',
      };
    }
  }

  return { blocked: false, flagged: false };
}


// ─── 2i. Medical Content Detection (Non-Blocking) ────────────────
function checkMedicalContent(lower) {
  const medicalKeywords = [
    'diagnosis', 'medication', 'prescription', 'medical condition',
    'adhd medication', 'dosage', 'treatment plan', 'medical advice',
    'should i give my child', 'is it safe to', 'allergic reaction',
    'epipen', 'inhaler', 'seizure', 'anaphylax', 'insulin',
    'therapy', 'therapist', 'psychiatrist', 'psychologist',
    'behavioral issue', 'anxiety disorder', 'depression',
    'sensory processing', 'occupational therapy',
  ];

  for (const keyword of medicalKeywords) {
    if (lower.includes(keyword)) {
      return {
        blocked: false,
        flagged: false,
        medicalDisclaimer: true,
        message: null,
        reason: 'medical_keyword',
      };
    }
  }

  return { blocked: false, medicalDisclaimer: false };
}


// ═══════════════════════════════════════════════════════════════════
//  3. POST-PROCESSING GUARDRAILS — Validate Claude's Response
// ═══════════════════════════════════════════════════════════════════

/**
 * Master post-processing pipeline — validates AI response, checks for
 * escalation needs, and sanitizes output before delivery.
 */
function checkEscalation(aiResponse, userMessage) {
  const lowerResponse = aiResponse.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // ── 3a. CRITICAL: Block enrollment confirmations ─────────────
  const enrollmentResult = checkEnrollmentConfirmation(lowerResponse);
  if (enrollmentResult.needsEscalation && enrollmentResult.severity === 'critical') {
    return enrollmentResult;
  }

  // ── 3b. PII echo-back prevention ─────────────────────────────
  const piiEchoResult = checkPIIEchoBack(aiResponse, userMessage);
  if (piiEchoResult.rewrite) {
    return piiEchoResult;
  }

  // ── 3c. Contact info accuracy ────────────────────────────────
  const contactResult = checkContactAccuracy(lowerResponse);
  if (contactResult.needsEscalation) {
    return contactResult;
  }

  // ── 3d. Hallucination markers ────────────────────────────────
  const hallucinationResult = checkHallucination(lowerResponse);
  if (hallucinationResult.needsEscalation) {
    return hallucinationResult;
  }

  // ── 3e. Competitor discussion in response ────────────────────
  const competitorResult = checkCompetitorInResponse(lowerResponse);
  if (competitorResult.needsEscalation) {
    return competitorResult;
  }

  // ── 3f. Inappropriate AI response ───────────────────────────
  const toneResult = checkResponseTone(lowerResponse);
  if (toneResult.needsEscalation) {
    return toneResult;
  }

  // ── 3g. Escalation triggers from user message ───────────────
  const userEscalation = checkUserEscalationTriggers(lowerMessage);
  if (userEscalation.needsEscalation) {
    return userEscalation;
  }

  // ── 3h. AI self-suggested escalation ────────────────────────
  if (lowerResponse.includes('connect you with') ||
      lowerResponse.includes('team member') ||
      lowerResponse.includes('let me get someone') ||
      lowerResponse.includes('speak with someone') ||
      lowerResponse.includes('reach out to our team') ||
      lowerResponse.includes('contact our team')) {
    return { needsEscalation: true, reason: 'ai_suggested_handoff' };
  }

  return { needsEscalation: false };
}


// ─── 3a. Enrollment Confirmation Detection ────────────────────────
function checkEnrollmentConfirmation(lowerResponse) {
  const criticalPhrases = [
    'you are now enrolled',
    'enrollment confirmed',
    'you have been registered',
    'registration complete',
    'registration confirmed',
    'payment processed',
    'payment confirmed',
    'payment received',
    'your spot is reserved',
    'your spot is confirmed',
    'your spot has been',
    'enrollment is complete',
    'you\'re all signed up',
    'you\'re all set for',
    'you are enrolled in',
    'successfully enrolled',
    'successfully registered',
    'welcome to the class',
    'see you on',                  // implies confirmed attendance
    'i\'ve added you to',
    'i have added you to',
    'you\'ve been added to',
    'booking confirmed',
    'reservation confirmed',
    'confirmed your registration',
  ];

  for (const phrase of criticalPhrases) {
    if (lowerResponse.includes(phrase)) {
      return {
        needsEscalation: true,
        reason: 'enrollment_confirmation_detected',
        severity: 'critical',
        note: `AI used forbidden phrase: "${phrase}"`,
      };
    }
  }

  return { needsEscalation: false };
}


// ─── 3b. PII Echo-Back Prevention ─────────────────────────────────
function checkPIIEchoBack(aiResponse, userMessage) {
  // If user shared a credit card or SSN and AI echoed any digits back
  const sensitiveDigits = userMessage.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/);
  if (sensitiveDigits) {
    const last4 = sensitiveDigits[0].replace(/[\s-]/g, '').slice(-4);
    if (aiResponse.includes(last4) && aiResponse.match(/\d{4,}/)) {
      return {
        rewrite: true,
        needsEscalation: true,
        reason: 'pii_echo_detected',
        severity: 'critical',
        note: 'AI echoed back card digits',
      };
    }
  }

  // Check if AI repeated a full SSN-like pattern
  const ssnPattern = /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/;
  if (ssnPattern.test(userMessage) && ssnPattern.test(aiResponse)) {
    return {
      rewrite: true,
      needsEscalation: true,
      reason: 'ssn_echo_detected',
      severity: 'critical',
    };
  }

  return { rewrite: false, needsEscalation: false };
}


// ─── 3c. Contact Info Accuracy ────────────────────────────────────
function checkContactAccuracy(lowerResponse) {
  // Correct contact info
  const correctEmail = 'getintouch@journeytosteam.com';
  const correctPhone = '(503) 506-3287';
  const correctPhoneAlt = '503-506-3287';
  const correctPhoneDigits = '5035063287';
  const correctWebsite = 'journeytosteam.com';

  // Check if AI hallucinated a wrong email
  const emailMatch = lowerResponse.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    const mentionedEmail = emailMatch[0].toLowerCase();
    if (mentionedEmail !== correctEmail &&
        mentionedEmail !== 'admin@journeytosteam.com' &&
        !mentionedEmail.endsWith('@journeytosteam.com')) {
      return {
        needsEscalation: true,
        reason: 'wrong_email_in_response',
        severity: 'high',
        note: `AI gave wrong email: ${mentionedEmail}`,
      };
    }
  }

  // Check if AI hallucinated a wrong phone number
  const phoneMatch = lowerResponse.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch) {
    const mentionedDigits = phoneMatch[0].replace(/\D/g, '');
    if (mentionedDigits.length >= 10) {
      const last10 = mentionedDigits.slice(-10);
      if (last10 !== correctPhoneDigits) {
        return {
          needsEscalation: true,
          reason: 'wrong_phone_in_response',
          severity: 'high',
          note: `AI gave wrong phone: ${phoneMatch[0]}`,
        };
      }
    }
  }

  // Check if AI mentioned a wrong website
  const urlMatch = lowerResponse.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+\.[a-z]{2,})/);
  if (urlMatch) {
    const domain = urlMatch[1].toLowerCase();
    if (domain !== correctWebsite && domain !== 'www.journeytosteam.com' &&
        !domain.endsWith('.journeytosteam.com') &&
        // Allow known safe domains
        !['google.com', 'maps.google.com'].includes(domain)) {
      return {
        needsEscalation: true,
        reason: 'wrong_website_in_response',
        severity: 'medium',
        note: `AI mentioned external domain: ${domain}`,
      };
    }
  }

  return { needsEscalation: false };
}


// ─── 3d. Hallucination Detection ──────────────────────────────────
function checkHallucination(lowerResponse) {
  // Detect phrases that suggest the AI is making things up
  const hallucinationMarkers = [
    // Fabricating specific info
    /we (?:are |were )?located at \d+/,                // Making up addresses
    /(?:open|hours?).*(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday).*\d{1,2}(?::\d{2})?\s*(?:am|pm)/,  // Making up hours not in KB
    /founded in \d{4}/,                                 // Making up founding year
    /(?:over|more than) \d{3,}\s+(?:students|families|children|kids)/, // Making up stats

    // Making promises outside policy
    /i(?:'ll| will) (?:make sure|ensure|guarantee)/,
    /i can (?:promise|guarantee|assure)\s+(?:you|that)/,
    /(?:100|full)\s*%\s*(?:guarantee|refund|money\s*back)/,
    /(?:free|complimentary)\s+(?:trial|session|class|lesson)/,  // unless it's in KB

    // Unauthorized discounts / pricing
    /(?:special|exclusive)\s+(?:discount|offer|deal|price)\s+(?:for you|just for)/,
    /i can (?:give|offer) you (?:a )?(\d+)%/,
    /let me (?:waive|remove|discount)/,
  ];

  for (const pattern of hallucinationMarkers) {
    if (pattern.test(lowerResponse)) {
      return {
        needsEscalation: true,
        reason: 'potential_hallucination',
        severity: 'medium',
        note: `Response matched hallucination pattern: ${pattern.source.substring(0, 50)}`,
      };
    }
  }

  return { needsEscalation: false };
}


// ─── 3e. Competitor Discussion in Response ────────────────────────
function checkCompetitorInResponse(lowerResponse) {
  const competitors = [
    'code ninja', 'kumon', 'mathnasium', 'sylvan learning',
    'c2 education', 'russian school of math', 'snapology',
    'engineering for kids', 'bricks 4 kidz', 'idtech',
    'codecombat', 'kodable',
  ];

  for (const comp of competitors) {
    if (lowerResponse.includes(comp)) {
      return {
        needsEscalation: true,
        reason: 'competitor_mentioned_in_response',
        severity: 'low',
        note: `AI mentioned competitor: ${comp}`,
      };
    }
  }

  return { needsEscalation: false };
}


// ─── 3f. Response Tone Safety ─────────────────────────────────────
function checkResponseTone(lowerResponse) {
  // Check for inappropriate tone markers
  const inappropriatePatterns = [
    /\bi\s+(?:hate|dislike|despise)/,
    /\b(?:stupid|dumb|idiot|moron)\b/,
    /\b(?:shut\s+up|go\s+away|leave\s+me\s+alone)\b/,
    /\bthat'?s\s+(?:your|the)\s+problem\b/,
    /\bi\s+don'?t\s+care\b/,
    /\bnot\s+my\s+(?:job|problem|concern)\b/,
  ];

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(lowerResponse)) {
      return {
        needsEscalation: true,
        reason: 'inappropriate_tone',
        severity: 'high',
        note: 'AI response contained inappropriate language',
      };
    }
  }

  return { needsEscalation: false };
}


// ─── 3g. User Escalation Triggers ─────────────────────────────────
function checkUserEscalationTriggers(lowerMessage) {
  const triggers = [
    // Enrollment / registration intent
    { keywords: ['want to enroll', 'ready to enroll', 'enroll my child', 'enroll my kid', 'sign up my', 'register my', 'how do i register', 'how do i enroll', 'how do i sign up', 'i want to join', 'i want to sign up', 'ready to register'], reason: 'enrollment_request' },

    // Special needs / accessibility
    { keywords: ['special needs', 'accommodation', 'iep', 'disability', '504 plan', 'learning disability', 'learning difference', 'wheelchair', 'accessible', 'autism', 'autistic', 'on the spectrum', 'sensory needs', 'behavioral support'], reason: 'special_needs_inquiry' },

    // Complaints / dissatisfaction
    { keywords: ['complaint', 'refund', 'unhappy', 'disappointed', 'terrible', 'worst', 'awful', 'horrible', 'unacceptable', 'demand', 'sue', 'lawyer', 'attorney', 'better business bureau', 'bbb', 'file a complaint', 'report you', 'report this'], reason: 'complaint' },

    // Cancellation / billing
    { keywords: ['cancel my', 'cancellation', 'want a refund', 'money back', 'overcharged', 'double charged', 'billing issue', 'billing problem', 'payment issue', 'charge me', 'charged me'], reason: 'cancellation_or_billing' },

    // Human handoff request
    { keywords: ['speak to someone', 'talk to a person', 'talk to a human', 'real person', 'real human', 'manager', 'supervisor', 'owner', 'director', 'dr. hammond', 'dr hammond', 'arielle', 'not a bot', 'actual person', 'live agent', 'live person', 'customer service rep', 'representative', 'someone real'], reason: 'human_handoff_request' },

    // Scheduling conflicts
    { keywords: ['schedule conflict', 'can\'t make it', 'reschedule', 'change the time', 'different day', 'another time', 'doesn\'t work for us', 'conflict with'], reason: 'scheduling_conflict' },

    // Partnership / business inquiries
    { keywords: ['partnership', 'partner with', 'school partnership', 'corporate', 'sponsor', 'sponsorship', 'bulk', 'group rate', 'group discount', 'field trip for', 'my school', 'our school'], reason: 'partnership_inquiry' },

    // Safety / emergency
    { keywords: ['accident', 'injury', 'injured', 'emergency', 'hurt at', 'hurt during', 'allergic reaction', 'ambulance', 'hospital', 'incident report', 'my child was hurt', 'my kid was hurt'], reason: 'safety_concern' },

    // Media / press
    { keywords: ['press', 'media', 'interview', 'journalist', 'reporter', 'news', 'article about', 'feature'], reason: 'media_inquiry' },
  ];

  for (const trigger of triggers) {
    if (trigger.keywords.some(kw => lowerMessage.includes(kw))) {
      return { needsEscalation: true, reason: trigger.reason };
    }
  }

  return { needsEscalation: false };
}


// ═══════════════════════════════════════════════════════════════════
//  4. RESPONSE POST-PROCESSING — Clean / Modify AI Output
// ═══════════════════════════════════════════════════════════════════

/**
 * Post-process AI response — apply corrections and safety edits.
 * Called in claude.js after checkEscalation.
 */
function postProcessResponse(aiResponse, escalationResult) {
  let response = aiResponse;

  // If enrollment confirmation was detected, replace the response entirely
  if (escalationResult.reason === 'enrollment_confirmation_detected') {
    response = "I'd love to help you get started! To complete enrollment, please visit journeytosteam.com/register or contact our team at getintouch@journeytosteam.com. They'll guide you through the registration process and answer any questions. Would you like to know anything else about our programs?";
  }

  // If PII was echoed back, strip it
  if (escalationResult.reason === 'pii_echo_detected' || escalationResult.reason === 'ssn_echo_detected') {
    response = "For your security, I've removed sensitive information from my response. Please never share payment cards or personal identification numbers in chat. How else can I help you with Journey to STEAM programs?";
  }

  // If wrong contact info was given, correct it
  if (escalationResult.reason === 'wrong_email_in_response' ||
      escalationResult.reason === 'wrong_phone_in_response' ||
      escalationResult.reason === 'wrong_website_in_response') {
    response += '\n\n**Correct contact info:** Email: getintouch@journeytosteam.com | Phone: (503) 506-3287 | Web: journeytosteam.com';
  }

  // If tone was inappropriate, replace entirely
  if (escalationResult.reason === 'inappropriate_tone') {
    response = "I apologize if my previous response wasn't helpful. Let me try again — what would you like to know about Journey to STEAM's programs and services?";
  }

  // Enforce max response length (prevent runaway responses)
  if (response.length > 2000) {
    // Truncate at last complete sentence before limit
    const truncated = response.substring(0, 2000);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastExclaim = truncated.lastIndexOf('!');
    const lastQuestion = truncated.lastIndexOf('?');
    const cutoff = Math.max(lastPeriod, lastExclaim, lastQuestion);
    if (cutoff > 500) {
      response = truncated.substring(0, cutoff + 1);
    } else {
      response = truncated + '...';
    }
  }

  return response;
}


// ═══════════════════════════════════════════════════════════════════
//  5. LEAD EXTRACTION — Parse Contact Info from Messages
// ═══════════════════════════════════════════════════════════════════

/**
 * Extract lead information from user messages
 */
function extractLeadInfo(message) {
  const info = {};

  // Extract email
  const emailMatch = message.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
  if (emailMatch) {
    const email = emailMatch[0].toLowerCase();
    // Don't capture our own contact emails as leads
    if (!email.endsWith('@journeytosteam.com')) {
      info.email = email;
    }
  }

  // Extract phone (various US formats)
  const phoneMatch = message.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/);
  if (phoneMatch) {
    let phone = phoneMatch[0].replace(/[^\d+]/g, '');
    if (phone.length === 10) phone = '+1' + phone;
    else if (phone.length === 11 && phone.startsWith('1')) phone = '+' + phone;
    // Don't capture our own phone as a lead
    if (phone !== '+15035063287') {
      info.phone = phone;
    }
  }

  // Extract name (heuristic: "my name is X" or "I'm X")
  const namePatterns = [
    /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /^(?:hi|hello|hey),?\s+(?:my name is|i'm|i am)\s+([A-Z][a-z]+)/i,
    /(?:name\s*[:#]\s*)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];

  for (const pattern of namePatterns) {
    const nameMatch = message.match(pattern);
    if (nameMatch) {
      info.name = nameMatch[1].trim();
      break;
    }
  }

  // Extract program interest (what they're asking about)
  const programPatterns = [
    { pattern: /\b(after[- ]?school|enrichment)\b/i, value: 'After-School Enrichment' },
    { pattern: /\b(summer\s+camp|summer\s+program)\b/i, value: 'Summer Camp' },
    { pattern: /\b(birthday\s+part|party)\b/i, value: 'Birthday Party' },
    { pattern: /\b(workshop|one[- ]?day)\b/i, value: 'Workshop' },
    { pattern: /\b(field\s+trip)\b/i, value: 'Field Trip' },
    { pattern: /\b(robot|robotics)\b/i, value: 'Robotics' },
    { pattern: /\b(coding|programming|code)\b/i, value: 'Coding' },
    { pattern: /\b(lego|brick)\b/i, value: 'LEGO' },
  ];

  for (const { pattern, value } of programPatterns) {
    if (pattern.test(message)) {
      info.programInterest = value;
      break;
    }
  }

  return info;
}


// ═══════════════════════════════════════════════════════════════════
//  EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  sanitizeInput,
  applyGuardrails,
  checkEscalation,
  postProcessResponse,
  extractLeadInfo,
};
