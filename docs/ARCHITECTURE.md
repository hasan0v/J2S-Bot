# Architecture Documentation

## System Overview

The J2S-Bot system is a 3-tier architecture: client-facing chat interfaces (web widget + SMS), an API middleware layer, and a PostgreSQL persistence layer with Anthropic Claude AI as the intelligence engine.

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Chat Widget   │  │ SMS/Twilio   │  │ Admin Panel  │  │
│  │ (Preact IIFE) │  │ (Webhooks)   │  │ (React SPA)  │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼───────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                  API Layer (Express.js)                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ /api/chat │ │ /api/sms │ │ /api/auth│ │ /api/admin│  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
│       │             │            │              │        │
│  ┌────▼─────────────▼────────────▼──────────────▼────┐  │
│  │              Services Layer                        │  │
│  │  ┌──────────┐  ┌───────────┐  ┌────────────────┐  │  │
│  │  │ claude.js│  │guardrails │  │ conversation.js│  │  │
│  │  │ (AI)     │  │ (safety)  │  │ (data access)  │  │  │
│  │  └────┬─────┘  └───────────┘  └───────┬────────┘  │  │
│  └───────┼────────────────────────────────┼───────────┘  │
└──────────┼────────────────────────────────┼──────────────┘
           │                                │
           ▼                                ▼
┌──────────────────┐            ┌───────────────────────┐
│ Anthropic Claude │            │ PostgreSQL (Supabase)  │
│ Sonnet 4         │            │ ┌─────────────────┐   │
│                  │            │ │ users            │   │
│ - System prompt  │            │ │ conversations    │   │
│ - context (20msg)│            │ │ messages         │   │
│ - temp 0.7       │            │ │ knowledge_base   │   │
│ - 1024 max tokens│            │ └─────────────────┘   │
└──────────────────┘            └───────────────────────┘
```

---

## Data Flow

### Chat Message Flow

```
User types message
       │
       ▼
POST /api/chat { sessionId, message }
       │
       ▼
┌─────────────────────────────────┐
│ 1. Sanitize input (XSS, trim)  │
│ 2. Pre-guardrails check        │
│    - Block credit card numbers  │
│    - Block SSN patterns         │
│    - Redirect medical topics    │
│ 3. Find/create conversation    │
│ 4. Save user message to DB     │
│ 5. Load last 20 messages       │
│ 6. Build system prompt + KB    │
│ 7. Call Claude API             │
│ 8. Post-guardrails check       │
│    - Detect escalation triggers │
│ 9. Save bot message to DB      │
│ 10. Extract lead info (email,  │
│     phone, name)               │
│ 11. Update conversation lead   │
└─────────────────────────────────┘
       │
       ▼
Response: { message, sessionId, escalated?, leadDetected? }
```

### SMS Message Flow

```
Parent sends SMS
       │
       ▼
Twilio forwards to POST /api/sms/webhook
       │
       ▼
┌─────────────────────────────────┐
│ 1. Validate Twilio signature    │
│ 2. Check opt-out keywords       │
│ 3. Process through Claude       │
│    (same pipeline as chat)      │
│ 4. Format reply (strip markdown)│
│ 5. Split if > 160 chars         │
│ 6. Respond via TwiML + API      │
└─────────────────────────────────┘
       │
       ▼
SMS reply sent to parent
```

---

## Database Schema

### Tables

#### `users`
Admin users for dashboard access.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK, auto-generated |
| email | VARCHAR(255) | Unique, not null |
| password_hash | VARCHAR(255) | bcrypt (12 rounds) |
| name | VARCHAR(255) | Display name |
| role | VARCHAR(50) | Default: 'admin' |
| created_at | TIMESTAMP | Auto-set |

#### `conversations`
One per user session (web or SMS).

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| session_id | VARCHAR(255) | Unique, indexed |
| channel | VARCHAR(20) | 'web' or 'sms' |
| status | VARCHAR(20) | 'active', 'ended', 'escalated' |
| lead_name | VARCHAR(255) | Extracted from messages |
| lead_email | VARCHAR(255) | Extracted from messages |
| lead_phone | VARCHAR(50) | Extracted from messages |
| lead_program_interest | VARCHAR(255) | Detected program interest |
| escalated_at | TIMESTAMP | When escalated |
| ended_at | TIMESTAMP | When ended |
| created_at | TIMESTAMP | Session start |
| updated_at | TIMESTAMP | Last activity |

#### `messages`
Every message in every conversation.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| conversation_id | UUID | FK → conversations |
| role | VARCHAR(20) | 'user' or 'assistant' |
| content | TEXT | Message content |
| metadata | JSONB | Channel info, guardrail flags |
| created_at | TIMESTAMP | Message timestamp |

#### `knowledge_base`
Content the AI references in responses.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| category | VARCHAR(100) | programs, pricing, faqs, policies |
| title | VARCHAR(255) | Entry title |
| content | TEXT | Full content |
| is_active | BOOLEAN | Default: true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### Indexes
- `idx_conversations_session_id` on conversations(session_id)
- `idx_conversations_status` on conversations(status)
- `idx_conversations_channel` on conversations(channel)
- `idx_messages_conversation_id` on messages(conversation_id)
- `idx_messages_created_at` on messages(created_at)
- `idx_knowledge_base_category` on knowledge_base(category)

---

## Security Architecture

### Authentication
- JWT-based with access tokens (7-day expiry) and refresh tokens (30-day expiry)
- Passwords hashed with bcrypt (12 salt rounds)
- Login rate-limited: 5 attempts per 15 minutes per IP

### API Security
- **Helmet.js**: Security headers (CSP, HSTS, etc.)
- **CORS**: Whitelist of allowed origins configured via `CORS_ORIGIN` env var
- **Rate Limiting**: 100 requests per minute per IP
- **Input Sanitization**: XSS library strips HTML/JS, input capped at 2000 chars
- **Output Sanitization**: Credit card / SSN patterns blocked before reaching AI
- **Twilio Webhook Validation**: Signature verification on SMS endpoints
- **Parameterized Queries**: All SQL uses parameterized queries (no string concatenation)

### Data Privacy
- No PII stored beyond lead contact info (name, email, phone)
- Conversation data retained for admin review
- No credit card or SSN data accepted or stored

---

## AI Configuration

### Model
- **Model**: `claude-sonnet-4-20250514` (Claude Sonnet 4)
- **Temperature**: 0.7 (balanced creativity/consistency)
- **Max Tokens**: 1024 per response

### Context Management
- System prompt dynamically built with knowledge base entries
- Last 20 messages included in context, trimmed to ~3000 tokens
- Context grouped by conversation session

### Guardrails
**Pre-processing** (before AI call):
- Credit card number detection (blocks message)
- SSN pattern detection (blocks message)
- Medical topic detection (redirects to appropriate resources)

**Post-processing** (after AI response):
- Escalation trigger detection in both user message and AI response
- Triggers: enrollment confirmation, special needs mentions, complaints, "talk to human", scheduling requests

### Retry Strategy
- 3 attempts with exponential backoff (1s → 2s → 4s)
- Fallback response if all retries fail

---

## Technology Decisions

| Choice | Rationale |
|--------|-----------|
| **Preact** for widget | ~3KB vs React's ~40KB; widget must be <150KB total |
| **IIFE build** for widget | Single `<script>` tag embedding, no module system needed |
| **`j2s-` CSS prefix** | Prevents style conflicts with Squarespace's CSS |
| **Express.js** | Simple, mature, well-documented for REST APIs |
| **`pg` driver** (not ORM) | Lightweight, full SQL control, fewer dependencies |
| **JWT** (not sessions) | Stateless auth, no server-side session storage needed |
| **Polling** (not WebSocket) | Simpler deployment, sufficient for admin dashboard use case |
| **PostgreSQL** | Structured data, JSONB for flexible metadata, Supabase managed hosting |
