import { h, render } from 'preact';
import { useState, useEffect, useRef, useCallback } from 'preact/hooks';
import widgetCSS from './styles/widget.css?inline';

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

const RocketIcon = ({ size = 20, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C12 2 7 4 7 12c0 2.4.7 4.5 1.6 6.2L6 22l3.8-2.6c.7.4 1.5.6 2.2.6s1.5-.2 2.2-.6L18 22l-2.6-3.8C16.3 16.5 17 14.4 17 12c0-8-5-10-5-10zm0 14c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z"/>
  </svg>
);

const ProgramsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3zm0 14.27L3.55 13 3 13.18V17l9 5 9-5v-3.82l-.55-.18L12 17.27z"/>
  </svg>
);

const PricingIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM9 10H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z"/>
  </svg>
);

const PartyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 6c1.11 0 2-.9 2-2 0-.38-.1-.73-.29-1.03L12 0l-1.71 2.97c-.19.3-.29.65-.29 1.03 0 1.1.9 2 2 2zm4.6 9.99l-1.07-1.07-1.08 1.07c-1.3 1.3-3.58 1.31-4.89 0l-1.07-1.07-1.09 1.07C6.75 16.64 5.88 17 4.96 17c-.73 0-1.4-.23-1.96-.61V21c0 .55.45 1 1 1h16c.55 0 1-.45 1-1v-4.61c-.56.38-1.23.61-1.96.61-.92 0-1.79-.36-2.44-1.01zM18 9h-5V7h-2v2H6c-1.66 0-3 1.34-3 3v1.54c0 1.08.88 1.96 1.96 1.96.52 0 1.02-.2 1.38-.57l2.14-2.13 2.13 2.13c.74.74 2.03.74 2.77 0l2.14-2.13 2.13 2.13c.37.37.86.57 1.38.57 1.08 0 1.96-.88 1.96-1.96V12c.01-1.66-1.33-3-2.99-3z"/>
  </svg>
);

// ─── Message Component ───────────────────────────────────
function Message({ role, content, timestamp }) {
  const isUser = role === 'user';
  return (
    <div class={`j2s-message j2s-message-${isUser ? 'user' : 'bot'}`}>
      {!isUser && (
        <div class="j2s-msg-avatar" aria-hidden="true"><RocketIcon size={16} color="white" /></div>
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
      <div class="j2s-msg-avatar" aria-hidden="true"><RocketIcon size={16} color="white" /></div>
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
    { icon: ProgramsIcon, label: 'What programs do you offer?' },
    { icon: PricingIcon, label: 'Tell me about pricing' },
    { icon: CalendarIcon, label: 'What are your hours?' },
    { icon: PartyIcon, label: 'Birthday party information' },
  ];

  return (
    <div class="j2s-welcome">
      <div class="j2s-welcome-emoji"><RocketIcon size={44} color="var(--j2s-primary)" /></div>
      <h3>Welcome to Journey to STEAM!</h3>
      <p>Hi there! I can help with info about our STEAM enrichment programs, camps, birthday parties, and more.</p>
      <div class="j2s-quick-actions">
        {quickActions.map((q) => (
          <button
            key={q.label}
            class="j2s-quick-btn"
            onClick={() => onQuickAction(q.label)}
            aria-label={q.label}
          >
            <q.icon /> {q.label}
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
            <div class="j2s-header-avatar" aria-hidden="true"><RocketIcon size={22} color="white" /></div>
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
  // Inject widget CSS into the page
  if (!document.getElementById('j2s-chat-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'j2s-chat-widget-styles';
    style.textContent = widgetCSS;
    document.head.appendChild(style);
  }

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
