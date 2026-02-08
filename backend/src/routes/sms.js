const express = require('express');
const twilio = require('twilio');
const { processMessage } = require('../services/claude');
const { extractLeadInfo } = require('../services/guardrails');
const {
  findOrCreateConversation,
  saveMessage,
  updateConversationLead,
  escalateConversation,
} = require('../services/conversation');

const router = express.Router();

// Twilio client initialization
let twilioClient = null;
function getTwilioClient() {
  if (!twilioClient && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return twilioClient;
}

/**
 * POST /api/sms/webhook
 * Twilio webhook endpoint for incoming SMS messages
 */
router.post('/webhook', async (req, res) => {
  try {
    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const signature = req.headers['x-twilio-signature'];
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
      const isValid = twilio.validateRequest(
        process.env.TWILIO_AUTH_TOKEN,
        signature,
        url,
        req.body
      );
      
      if (!isValid) {
        console.warn('[SMS] Invalid Twilio signature');
        return res.status(403).send('Invalid signature');
      }
    }

    const { From: fromNumber, Body: messageBody, MessageSid } = req.body;

    if (!fromNumber || !messageBody) {
      return res.status(400).send('Missing required fields');
    }

    console.log(`[SMS] Incoming from ${fromNumber}: ${messageBody.substring(0, 50)}...`);

    // Check for opt-out
    const lowerBody = messageBody.trim().toLowerCase();
    if (['stop', 'unsubscribe', 'cancel', 'quit'].includes(lowerBody)) {
      // Twilio handles STOP automatically, but let's log it
      console.log(`[SMS] Opt-out received from ${fromNumber}`);
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('You have been unsubscribed. Reply START to resubscribe.');
      res.type('text/xml').send(twiml.toString());
      return;
    }

    // Use phone number as session ID for SMS conversations
    const sessionId = `sms_${fromNumber.replace(/[^\d+]/g, '')}`;

    // Find or create conversation
    const conversation = await findOrCreateConversation(sessionId, 'sms', fromNumber);

    // Save incoming message
    await saveMessage(conversation.id, 'user', messageBody.trim(), { messageSid: MessageSid });

    // Extract lead info
    const leadInfo = extractLeadInfo(messageBody);
    if (Object.keys(leadInfo).length > 0) {
      await updateConversationLead(conversation.id, leadInfo);
    }

    // Process through Claude AI (SMS format)
    const result = await processMessage(messageBody.trim(), conversation.id, 'sms');

    // Save assistant response
    await saveMessage(conversation.id, 'assistant', result.response, result.metadata);

    // Handle escalation
    if (result.escalation) {
      await escalateConversation(conversation.id, result.escalationReason);
    }

    // Check if this is the first message - add opt-in compliance text
    const { pool } = require('../models/database');
    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM messages WHERE conversation_id = $1 AND role = 'assistant'`,
      [conversation.id]
    );
    const isFirstResponse = parseInt(rows[0].count) <= 1;

    let responseText = result.response;
    if (isFirstResponse) {
      responseText += '\n\nReply STOP to unsubscribe.';
    }

    // Split long messages for SMS (160 char segments)
    const segments = splitSMSMessage(responseText);

    // Send via TwiML response (for webhook) or via API for multiple segments
    if (segments.length === 1) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(segments[0]);
      res.type('text/xml').send(twiml.toString());
    } else {
      // For multi-segment, send first via TwiML and rest via API
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message(segments[0]);
      res.type('text/xml').send(twiml.toString());

      // Send additional segments via Twilio API
      const client = getTwilioClient();
      if (client) {
        for (let i = 1; i < segments.length; i++) {
          await client.messages.create({
            body: segments[i],
            from: process.env.TWILIO_PHONE_NUMBER,
            to: fromNumber,
          });
        }
      }
    }
  } catch (err) {
    console.error('[SMS Webhook Error]', err);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("We're having trouble right now. Please try again in a moment or email hello@journeytosteam.com.");
    res.type('text/xml').send(twiml.toString());
  }
});

/**
 * POST /api/sms/send
 * Send an outbound SMS message (from admin dashboard)
 * Body: { to: string, message: string }
 */
router.post('/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const client = getTwilioClient();
    if (!client) {
      return res.status(503).json({ error: 'SMS service not configured' });
    }

    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    res.json({ success: true, messageSid: result.sid });
  } catch (err) {
    console.error('[SMS Send Error]', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

/**
 * Split a message into SMS-friendly segments (160 chars)
 */
function splitSMSMessage(text, maxLength = 160) {
  if (text.length <= maxLength) return [text];

  const segments = [];
  const sentences = text.split(/(?<=[.!?\n])\s*/);
  let current = '';

  for (const sentence of sentences) {
    if ((current + ' ' + sentence).trim().length <= maxLength) {
      current = (current + ' ' + sentence).trim();
    } else {
      if (current) segments.push(current);
      // If single sentence is too long, split by words
      if (sentence.length > maxLength) {
        const words = sentence.split(' ');
        current = '';
        for (const word of words) {
          if ((current + ' ' + word).trim().length <= maxLength) {
            current = (current + ' ' + word).trim();
          } else {
            if (current) segments.push(current);
            current = word;
          }
        }
      } else {
        current = sentence;
      }
    }
  }
  if (current) segments.push(current);

  return segments;
}

module.exports = router;
