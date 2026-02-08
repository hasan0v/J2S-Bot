import { h, render } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import './styles/widget.css';

// ─── API Service ──────────────────────────────────────────
const API_URL = (() => {
  const script = document.querySelector('script[data-api-url]');
  return script?.getAttribute('data-api-url') || 'http://localhost:3001';
})();

function generateSessionId() {
  const stored = sessionStorage.getItem('j2s_session_id');
  if (stored) return stored;
  const id = 'web_' + crypto.randomUUID?.() || 'web_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
  sessionStorage.setItem('j2s_session_id', id);
  return id;
}

async function sendMessage(message, sessionId) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

async function fetchHistory(sessionId) {
  try {
    const res = await fetch(`${API_URL}/api/chat/history/${sessionId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.messages || [];
  } catch {
    return [];
  }
}

// ─── Simple Markdown Renderer ─────────────────────────────
function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^[-•]\s+(.+)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ─── Time Formatter ───────────────────────────────────────
function formatTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ─── SVG Icons ────────────────────────────────────────────
const ChatIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);

// ─── Message Component ───────────────────────────────────
function Message({ role, content, timestamp }) {
  const isUser = role === 'user';
  return (
    <div class={`j2s-message j2s-message-${isUser ? 'user' : 'bot'}`}>
      {!isUser && (
        <div class="j2s-msg-avatar" aria-hidden="true">🚀</div>
      )}
      <div>
        <div
          class="j2s-bubble"
          dangerouslySetInnerHTML={{ __html: isUser ? content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : renderMarkdown(content) }}
        />
        <div class="j2s-msg-time">{formatTime(timestamp)}</div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ────────────────────────────────────
function TypingIndicator() {
  return (
    <div class="j2s-message j2s-message-bot">
      <div class="j2s-msg-avatar" aria-hidden="true">🚀</div>
      <div class="j2s-bubble">
        <div class="j2s-typing" role="status" aria-label="Assistant is typing">
          <div class="j2s-typing-dot" />
          <div class="j2s-typing-dot" />
          <div class="j2s-typing-dot" />
        </div>
      </div>
    </div>
  );
}

// ─── Welcome Screen ──────────────────────────────────────
function WelcomeScreen({ onQuickAction }) {
  const quickActions = [
    '� What programs do you offer?',
    '💰 Tell me about pricing',
    '📅 What are your hours?',
    '🎂 Birthday party information',
  ];

  return (
    <div class="j2s-welcome">
      <div class="j2s-welcome-emoji">🚀</div>
      <h3>Welcome to Journey to STEAM!</h3>
      <p>Hi there! I can help with info about our STEAM enrichment programs, camps, birthday parties, and more.</p>
      <div class="j2s-quick-actions">
        {quickActions.map((q) => (
          <button
            key={q}
            class="j2s-quick-btn"
            onClick={() => onQuickAction(q.replace(/^[^\s]+\s/, ''))}
            aria-label={q}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Chat Widget ────────────────────────────────────
function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [escalation, setEscalation] = useState(false);
  const [showNotification, setShowNotification] = useState(true);
  const [sessionId] = useState(generateSessionId);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Load conversation history on first open
  useEffect(() => {
    if (isOpen && !historyLoaded) {
      fetchHistory(sessionId).then((history) => {
        if (history.length > 0) {
          setMessages(history);
        }
        setHistoryLoaded(true);
      });
    }
  }, [isOpen, historyLoaded, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const toggleChat = useCallback(() => {
    if (isOpen) {
      setIsClosing(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 200);
    } else {
      setIsOpen(true);
      setShowNotification(false);
    }
  }, [isOpen]);

  const handleSend = useCallback(async (overrideMessage) => {
    const msg = (overrideMessage || input).trim();
    if (!msg || isLoading) return;

    setInput('');
    setError(null);

    // Add user message
    const userMsg = { role: 'user', content: msg, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const result = await sendMessage(msg, sessionId);
      const botMsg = { role: 'assistant', content: result.response, timestamp: new Date().toISOString() };
      setMessages((prev) => [...prev, botMsg]);

      if (result.escalation) {
        setEscalation(true);
      }
    } catch (err) {
      console.error('[Chat Widget Error]', err);
      if (err.name === 'AbortError') {
        setError("Response is taking longer than expected. Please try again.");
      } else {
        setError("Hmm, something went wrong. Please try again!");
      }
      // Add error as bot message for context
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm having trouble connecting right now. Please try again in a moment, or email us at hello@journeytosteam.com.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, sessionId]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    // Auto-grow textarea
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }, []);

  const handleEscalation = useCallback(() => {
    window.open('mailto:hello@journeytosteam.com?subject=Chat%20Escalation%20-%20Need%20Help', '_blank');
  }, []);

  const charCount = input.length;
  const isOverLimit = charCount > 2000;
  const showWelcome = messages.length === 0 && !isLoading;

  return (
    <div class="j2s-widget-container" id="j2s-chat-widget-root">
      {/* Toggle Button */}
      <button
        class={`j2s-toggle-btn ${isOpen ? 'j2s-open' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
        aria-expanded={isOpen}
      >
        {isOpen ? <CloseIcon /> : <ChatIcon />}
        {showNotification && !isOpen && <div class="j2s-notification-dot" />}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div
          class={`j2s-chat-window ${isClosing ? 'j2s-closing' : ''}`}
          role="dialog"
          aria-label="Chat with Journey to STEAM"
        >
          {/* Header */}
          <div class="j2s-chat-header">
            <div class="j2s-header-avatar" aria-hidden="true">🚀</div>
            <div class="j2s-header-info">
              <h2 class="j2s-header-title">Journey to STEAM</h2>
              <p class="j2s-header-subtitle">Ask us anything about our programs!</p>
            </div>
            <button class="j2s-close-btn" onClick={toggleChat} aria-label="Close chat">
              <CloseIcon />
            </button>
          </div>

          {/* Messages */}
          <div class="j2s-messages" ref={messagesContainerRef} role="log" aria-live="polite">
            {showWelcome && <WelcomeScreen onQuickAction={handleSend} />}

            {messages.map((msg, i) => (
              <Message key={i} {...msg} />
            ))}

            {isLoading && <TypingIndicator />}

            {error && <div class="j2s-error-msg" role="alert">{error}</div>}

            <div ref={messagesEndRef} />
          </div>

          {/* Escalation Banner */}
          {escalation && (
            <div class="j2s-escalation-banner">
              <p>💬 Would you like to speak with a team member?</p>
              <button class="j2s-escalation-btn" onClick={handleEscalation}>
                Contact Team
              </button>
            </div>
          )}

          {/* Input Area */}
          <div class="j2s-input-area">
            <div class="j2s-input-wrapper">
              <textarea
                ref={inputRef}
                class="j2s-input"
                value={input}
                onInput={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                rows={1}
                maxLength={2000}
                disabled={isLoading}
                aria-label="Message input"
              />
              {charCount > 1500 && (
                <span class={`j2s-char-count ${isOverLimit ? 'j2s-over-limit' : ''}`}>
                  {charCount}/2000
                </span>
              )}
            </div>
            <button
              class="j2s-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || isOverLimit}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>

          {/* Powered By */}
          <div class="j2s-powered">
            Powered by Journey to STEAM
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Mount Widget ─────────────────────────────────────────
function mountWidget() {
  // Create mount container
  let container = document.getElementById('j2s-chat-widget-mount');
  if (!container) {
    container = document.createElement('div');
    container.id = 'j2s-chat-widget-mount';
    document.body.appendChild(container);
  }
  render(<ChatWidget />, container);
}

// Mount when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountWidget);
} else {
  mountWidget();
}
