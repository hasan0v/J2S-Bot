# Journey to STEAM AI Chatbot MVP

An AI-powered chatbot for **journeytosteam.com** that handles parent inquiries 24/7 using Anthropic Claude AI, integrated into Squarespace via an embeddable widget, with SMS capabilities through Twilio, and an admin dashboard for conversation management.

---

## Quick Start

### Prerequisites
- **Node.js 18+** and npm
- **PostgreSQL** database (Supabase recommended)
- **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))
- **Twilio account** (for SMS - optional for initial setup)

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd J2S-Bot

# Install backend dependencies
cd backend && npm install

# Install frontend dashboard dependencies
cd ../frontend && npm install

# Install chat widget dependencies
cd ../widget && npm install
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your actual credentials
```

**Required variables:**
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (sk-ant-...) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Random 256-bit secret for JWT tokens |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (optional) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token (optional) |
| `TWILIO_PHONE_NUMBER` | Twilio phone number (optional) |

### 3. Initialize Database

```bash
cd backend
npm run seed
```

This creates:
- Admin user: `admin@journeytosteam.com` / `J2SAdmin2026!` (change immediately)
- Sample knowledge base entries for programs, pricing, FAQs, policies

### 4. Run Development Servers

```bash
# Terminal 1: Backend API
cd backend && npm run dev

# Terminal 2: Admin Dashboard
cd frontend && npm run dev

# Terminal 3: Chat Widget (for testing)
cd widget && npm run dev
```

- **Backend API:** http://localhost:3001
- **Admin Dashboard:** http://localhost:5173
- **Widget Test:** http://localhost:5174

---

## Project Structure

```
J2S-Bot/
├── backend/                    # Node.js/Express API server
│   ├── src/
│   │   ├── server.js           # Express app entry point
│   │   ├── seed.js             # Database seeding script
│   │   ├── models/
│   │   │   └── database.js     # PostgreSQL connection & schema
│   │   ├── routes/
│   │   │   ├── chat.js         # POST /api/chat - web chat endpoint
│   │   │   ├── sms.js          # POST /api/sms/webhook - Twilio webhook
│   │   │   ├── auth.js         # POST /api/auth/login - authentication
│   │   │   ├── admin.js        # GET /api/admin/* - dashboard data
│   │   │   └── knowledgeBase.js # CRUD /api/knowledge-base
│   │   ├── services/
│   │   │   ├── claude.js       # Anthropic Claude API integration
│   │   │   ├── guardrails.js   # Input/output safety filters
│   │   │   └── conversation.js # Conversation & lead management
│   │   └── middleware/
│   │       └── auth.js         # JWT authentication middleware
│   ├── .env.example            # Environment variable template
│   └── package.json
├── frontend/                   # React admin dashboard
│   ├── src/
│   │   ├── main.jsx            # React entry point
│   │   ├── App.jsx             # Router & route definitions
│   │   ├── components/
│   │   │   └── Layout.jsx      # Navigation layout wrapper
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx   # Admin login
│   │   │   ├── DashboardPage.jsx # Metrics overview
│   │   │   ├── ConversationsPage.jsx # Conversation browser
│   │   │   ├── LeadsPage.jsx   # Lead management & export
│   │   │   ├── KnowledgeBasePage.jsx # KB editor
│   │   │   └── SettingsPage.jsx # Account settings
│   │   ├── context/
│   │   │   └── AuthContext.jsx # Authentication state
│   │   ├── hooks/
│   │   │   └── usePolling.js   # Auto-refresh hook
│   │   └── services/
│   │       └── api.js          # API client with token refresh
│   └── package.json
├── widget/                     # Embeddable chat widget
│   ├── src/
│   │   ├── index.jsx           # Preact chat widget component
│   │   └── styles/
│   │       └── widget.css      # Scoped widget styles
│   ├── vite.config.js          # Build config (IIFE bundle)
│   └── package.json
└── docs/                       # Documentation
    ├── ARCHITECTURE.md
    ├── DEPLOYMENT_GUIDE.md
    ├── ADMIN_GUIDE.md
    ├── KNOWLEDGE_BASE_GUIDE.md
    └── FUTURE_IMPROVEMENTS.md
```

---

## API Endpoints

### Chat
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Send message, get AI response |
| POST | `/api/chat/lead` | Update lead info for session |
| POST | `/api/chat/end` | End a conversation |
| GET | `/api/chat/history/:sessionId` | Get conversation history |

### SMS (Twilio)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sms/webhook` | Twilio incoming SMS webhook |
| POST | `/api/sms/send` | Send outbound SMS |

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, get JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/password` | Change password |

### Admin (Requires JWT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/conversations` | List conversations |
| GET | `/api/admin/conversations/:id` | Get conversation detail |
| PUT | `/api/admin/conversations/:id/escalate` | Escalate conversation |
| PUT | `/api/admin/conversations/:id/end` | End conversation |
| GET | `/api/admin/leads` | List leads |
| GET | `/api/admin/leads/export` | Export leads CSV |
| GET | `/api/admin/metrics` | Dashboard metrics |
| GET | `/api/admin/trends` | 30-day conversation trends |

### Knowledge Base
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/knowledge-base` | Get active entries |
| GET | `/api/knowledge-base/all` | Get all entries (admin) |
| POST | `/api/knowledge-base` | Create entry (admin) |
| PUT | `/api/knowledge-base/:id` | Update entry (admin) |
| DELETE | `/api/knowledge-base/:id` | Delete entry (admin) |

### System
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

---

## Embedding the Chat Widget

Paste this in Squarespace → Settings → Advanced → Code Injection → Footer:

```html
<script src="https://widget-j2s.vercel.app/chat-widget.js" data-api-url="https://j2s-bot-production.up.railway.app"></script>
```

---

## License

Proprietary - Journey to STEAM LLC
