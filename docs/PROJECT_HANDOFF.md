# Journey to STEAM — AI Chatbot MVP
## Complete Project Handoff Documentation

**Prepared for:** Journey to STEAM LLC  
**Project:** AI Chatbot MVP for Education Business  
**Date:** February 9, 2026  
**Version:** 1.0  

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [What Was Built](#2-what-was-built)
3. [Live Production URLs](#3-live-production-urls)
4. [Login Credentials](#4-login-credentials)
5. [Architecture Overview](#5-architecture-overview)
6. [Chat Widget — How It Works](#6-chat-widget--how-it-works)
7. [AI Conversation Engine](#7-ai-conversation-engine)
8. [SMS Integration (Twilio)](#8-sms-integration-twilio)
9. [Admin Dashboard Guide](#9-admin-dashboard-guide)
10. [Knowledge Base Management](#10-knowledge-base-management)
11. [Squarespace Integration](#11-squarespace-integration)
12. [Tech Stack & Dependencies](#12-tech-stack--dependencies)
13. [Security Features](#13-security-features)
14. [Environment Variables Reference](#14-environment-variables-reference)
15. [Deployment Guide](#15-deployment-guide)
16. [How to Deploy Updates](#16-how-to-deploy-updates)
17. [Monitoring & Troubleshooting](#17-monitoring--troubleshooting)
18. [Source Code & Repository](#18-source-code--repository)
19. [Known Limitations](#19-known-limitations)
20. [Future Improvements Roadmap](#20-future-improvements-roadmap)
21. [Deliverables Checklist](#21-deliverables-checklist)
22. [Support & Handoff](#22-support--handoff)

---

## 1. Project Overview

### What is this?
An AI-powered chatbot for **journeytosteam.com** that handles parent inquiries 24/7. Parents can ask about STEAM enrichment programs, pricing, schedules, birthday parties, and policies — and get instant, accurate answers powered by Anthropic's Claude AI.

### Three Components
1. **Chat Widget** — A small chat bubble that lives on your Squarespace website. Parents click it, type a question, and get an instant AI response.
2. **SMS Integration** — Parents can also text your Twilio phone number and get the same AI-powered responses via SMS.
3. **Admin Dashboard** — A web-based control panel where you can view conversations, manage leads, update the knowledge base, and track metrics.

### How the AI Works
The chatbot uses **Anthropic Claude** (not ChatGPT/OpenAI). Claude reads your knowledge base (programs, pricing, FAQs, policies) and answers questions based on that information. It has guardrails to prevent it from:
- Confirming enrollment or registration
- Processing payments or collecting financial info
- Giving medical advice
- Making promises outside your policies

When a question requires human help, the chatbot escalates — showing the parent a "Contact Team" button.

---

## 2. What Was Built

| Component | Description | Status |
|-----------|-------------|--------|
| **Embeddable Chat Widget** | Preact-based widget, single `<script>` tag install, mobile-responsive, branded purple/orange | ✅ Live |
| **AI Conversation Engine** | Claude Sonnet 4 integration with knowledge base, guardrails, context memory | ✅ Live |
| **SMS Integration** | Twilio webhook handler, unified AI brain for web+SMS | ✅ Code Ready |
| **Admin Dashboard** | React 19 + Tailwind CSS, conversations, leads, metrics, knowledge base CRUD | ✅ Live |
| **PostgreSQL Database** | Supabase-hosted, 4 tables, seeded with 50 knowledge base entries | ✅ Live |
| **Documentation** | Architecture, admin guide, deployment guide, KB guide, future improvements | ✅ Complete |

---

## 3. Live Production URLs

| Service | URL | Hosting |
|---------|-----|---------|
| **Backend API** | https://j2s-bot-production.up.railway.app | Railway |
| **Admin Dashboard** | https://frontend-ecru-three-90.vercel.app | Vercel |
| **Chat Widget JS** | https://widget-j2s.vercel.app/chat-widget.js | Vercel |
| **Health Check** | https://j2s-bot-production.up.railway.app/health | Railway |
| **Database** | Supabase PostgreSQL (aws-us-east-1) | Supabase |
| **Source Code** | https://github.com/hasan0v/J2S-Bot | GitHub |

---

## 4. Login Credentials

### Admin Dashboard
- **URL:** https://frontend-ecru-three-90.vercel.app
- **Email:** `admin@journeytosteam.com`
- **Password:** `J2SAdmin2026!`

> **Important:** Change this password immediately after your first login. Go to **Settings** in the dashboard sidebar → enter current password → set a new one.

---

## 5. Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                            │
│                                                              │
│   ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│   │ Chat Widget  │  │  SMS/Twilio  │  │  Admin Dashboard │    │
│   │  (Preact)    │  │  (Inbound)   │  │  (React 19)      │    │
│   │  ~32KB JS    │  │              │  │  Tailwind CSS     │    │
│   └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘    │
│          │                 │                    │              │
└──────────┼─────────────────┼────────────────────┼─────────────┘
           │                 │                    │
           ▼                 ▼                    ▼
┌──────────────────────────────────────────────────────────────┐
│                       API LAYER                              │
│                                                              │
│   ┌──────────────────────────────────────────────────────┐   │
│   │              Express.js Server (Node.js)              │   │
│   │                                                       │   │
│   │  /api/chat      → Claude AI + Knowledge Base          │   │
│   │  /api/sms       → Twilio webhook + SMS responses      │   │
│   │  /api/auth      → JWT login/logout/refresh             │   │
│   │  /api/admin     → Dashboard data (conversations,       │   │
│   │                    leads, metrics)                      │   │
│   │  /api/knowledge  → Knowledge base CRUD                 │   │
│   │                                                       │   │
│   │  Security: Helmet, CORS, Rate Limiting, XSS Filter    │   │
│   └──────────┬───────────────────────┬────────────────────┘   │
│              │                       │                        │
└──────────────┼───────────────────────┼────────────────────────┘
               │                       │
               ▼                       ▼
┌──────────────────────────┐  ┌─────────────────────────┐
│   Anthropic Claude API   │  │  PostgreSQL (Supabase)   │
│   Claude Sonnet 4        │  │                          │
│   Temperature: 0.7       │  │  Tables:                 │
│   Max tokens: 1024       │  │  • users                 │
│   Context: 20 messages   │  │  • conversations         │
│   Retries: 3x            │  │  • messages              │
│                          │  │  • knowledge_base        │
└──────────────────────────┘  └─────────────────────────┘
```

### How a Chat Message Flows

1. Parent types a message in the widget
2. Widget sends POST request to `/api/chat`
3. Server sanitizes input (XSS, length limit)
4. **Pre-guardrails** check for sensitive content (credit cards, medical)
5. Knowledge base entries are fetched and injected into Claude's prompt
6. Last 20 messages of conversation history are included for context
7. Claude generates a response based on your KB data
8. **Post-guardrails** verify the response doesn't violate rules
9. Lead information is extracted if parent shares name/email/phone
10. Message + response are saved to PostgreSQL
11. Response sent back to widget → displayed to parent

---

## 6. Chat Widget — How It Works

### What Parents See
- A **purple chat bubble** in the bottom-right corner of your website
- Clicking it opens a branded chat window with:
  - Journey to STEAM header with rocket icon
  - Welcome message with 4 quick-action buttons
  - Real-time typing indicator while AI thinks
  - Smooth animations and professional styling
  - Escalation banner when human help is needed

### Quick Action Buttons
When a parent first opens the chat, they see 4 buttons:
1. **What programs do you offer?**
2. **Tell me about pricing**
3. **What are your hours?**
4. **Birthday party information**

### Widget Features
| Feature | Description |
|---------|-------------|
| **Session persistence** | Conversation survives page refreshes (sessionStorage) |
| **History loading** | Previous messages load when widget reopens |
| **Auto-scroll** | Chat scrolls to newest message automatically |
| **Character counter** | Shows count when approaching 2,000 char limit |
| **Auto-grow input** | Text area expands as parent types longer messages |
| **Typing indicator** | 3-dot animation while Claude is thinking |
| **Escalation** | "Contact Team" button when AI can't handle the question |
| **Markdown rendering** | Bold, italic, lists render properly in bot responses |
| **Mobile responsive** | Full-screen on phones, floating window on desktop |

### Widget Embed Code
```html
<script 
  src="https://widget-j2s.vercel.app/chat-widget.js" 
  data-api-url="https://j2s-bot-production.up.railway.app">
</script>
```

### Design
- **Primary color:** Purple (#5B2D8E)
- **Accent color:** Orange (#F5A623)
- **Background:** Off-white (#F9F7F4)
- **Headings font:** Poppins
- **Body font:** Open Sans
- **Icons:** All single-color SVG (no colorful emojis)
- **Bundle size:** ~32KB (12KB gzipped) — no impact on page load

---

## 7. AI Conversation Engine

### Model Configuration
| Setting | Value |
|---------|-------|
| **AI Provider** | Anthropic (NOT OpenAI) |
| **Model** | Claude Sonnet 4 (`claude-sonnet-4-20250514`) |
| **Temperature** | 0.7 (balanced creativity/accuracy) |
| **Max tokens** | 1,024 per response |
| **Context window** | Last 20 messages (~3,000 tokens) |
| **Retry policy** | 3 attempts with exponential backoff |

### Knowledge Base Integration
The AI reads your knowledge base entries before every response. Entries are organized into 4 categories:
- **Programs** (18 entries) — After-school, camps, workshops, birthday parties
- **Pricing** (4 entries) — Costs, payment plans, sibling discounts
- **FAQs** (22 entries) — Common parent questions
- **Policies** (6 entries) — Registration, cancellation, safety

The AI will **only answer questions covered by your knowledge base**. If a parent asks something not in the KB, Claude says: *"I don't have specific information about that. Let me connect you with our team."*

### Guardrails (Safety Rules)
The AI is programmed to **never**:

| Rule | What it prevents |
|------|-----------------|
| **No enrollment confirmation** | Can't say "You're enrolled!" — always directs to registration page |
| **No payment processing** | Detects credit card numbers, SSNs — refuses and explains why |
| **No medical advice** | If parent mentions allergies/medical, adds disclaimer to consult doctor |
| **No promises outside policy** | Won't guarantee spots, custom pricing, or exceptions |
| **No competitor discussion** | Stays focused on Journey to STEAM |
| **No personal opinions** | Factual, friendly, on-brand responses only |

### Escalation Triggers
The AI automatically escalates to a human when it detects:
- Complaints or dissatisfaction
- Complex billing/refund issues
- Safety or emergency concerns
- Repeated questions it can't answer
- Explicit "talk to a person" requests
- Sensitive topics requiring human judgment

### Lead Capture
When a parent shares their name, email, or phone number in conversation, the system automatically extracts and saves it as a lead — visible in the admin dashboard.

---

## 8. SMS Integration (Twilio)

### How It Works
1. Parent texts your Twilio phone number
2. Twilio forwards the message to your backend via webhook
3. The same Claude AI engine processes the message (same knowledge base, same guardrails)
4. Response is formatted for SMS (no markdown, plain text)
5. Long responses are split at sentence boundaries (≤160 chars per segment)
6. Reply sent back to parent's phone via Twilio

### SMS Features
| Feature | Description |
|---------|-------------|
| **Unified AI** | Web chat and SMS share the exact same AI brain and knowledge base |
| **Thread tracking** | Each phone number gets a persistent conversation thread |
| **STOP compliance** | If parent texts STOP, UNSUBSCRIBE, CANCEL, or QUIT — they're opted out |
| **Message splitting** | Long AI responses are split into multiple SMS at sentence boundaries |
| **Plain text formatting** | Markdown is stripped — SMS gets clean readable text |
| **Signature validation** | Production mode validates Twilio webhook signatures for security |

### Setup Steps (Twilio)

#### Step 1: Get a Twilio Phone Number
1. Log in to https://console.twilio.com
2. If you don't have a number yet:
   - Go to **Phone Numbers** → **Buy a Number**
   - For US numbers, you'll need **A2P 10DLC registration** (see below)
   - Alternative: Buy a **Toll-Free number** (simpler verification process)
3. Note your **Account SID**, **Auth Token**, and **Phone Number**

#### Step 2: A2P 10DLC Registration (US Local Numbers)
US carriers require registration for application-to-person messaging:
1. Go to **Messaging** → **Trust Hub** → **A2P Registration**
2. **Register your Brand:**
   - Business name: Journey to STEAM
   - Business type: Small/Medium Business
   - Fill in EIN/Tax ID, address, website
   - Approval: minutes to a few days
3. **Create a Campaign:**
   - Use case: **Customer Care**
   - Sample messages: "Hi! I can help with info about our STEAM programs..."
   - Approval: hours to a few days
4. Link your phone number to the approved campaign

**Faster alternative:** Purchase a **Toll-Free number** instead — verification is simpler (1-3 business days via **Trust Hub** → **Toll-Free Verification**).

#### Step 3: Configure Webhook
1. Go to **Phone Numbers** → **Manage** → **Active Numbers**
2. Click your phone number
3. Scroll to **Messaging** section
4. Under **"A MESSAGE COMES IN"**:
   - Select: **Webhook**
   - URL: `https://j2s-bot-production.up.railway.app/api/sms/webhook`
   - Method: **HTTP POST**
5. Click **Save Configuration**

#### Step 4: Update Environment Variables
Make sure these are set in your Railway backend:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-auth-token-here
TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
```

#### Step 5: Test
Text your Twilio number from your phone. You should get an AI response within 5-10 seconds.

---

## 9. Admin Dashboard Guide

### Accessing the Dashboard
- **URL:** https://frontend-ecru-three-90.vercel.app
- **Login:** `admin@journeytosteam.com` / `J2SAdmin2026!`

### Dashboard Home
The main page shows at-a-glance metrics:

| Metric | Description |
|--------|-------------|
| **Conversations Today** | Number of new chat sessions started today |
| **This Week** | Conversations started in the current week |
| **This Month** | Conversations started in the current month |
| **Total Leads** | Number of parent contacts captured (name/email/phone) |
| **Escalation Rate** | Percentage of conversations that triggered human escalation |
| **30-Day Trend** | Bar chart showing daily conversation volume |

Metrics auto-refresh every 30 seconds. The trend chart updates every 60 seconds.

### Conversations Page
- View all conversations (web chat + SMS) in a table
- **Filter** by status: Active, Escalated, Ended
- **Filter** by channel: Web, SMS
- **Search** by parent name, email, or phone
- **Click any row** to see the full conversation thread with timestamps
- Auto-refreshes every 10 seconds

### Leads Page
- View all captured parent contact information
- Columns: Name, Email, Phone, Program Interest, Channel, Date
- **Sort** by any column
- **Search** by name, email, or phone
- **Export to CSV** — click the export button for a spreadsheet download

### Knowledge Base Page
- View all 50 knowledge base entries organized by category
- **Filter tabs:** All, Programs, Pricing, FAQs, Policies
- **Add Entry:** Click "+ Add Entry" → fill in category, question, answer → Save
- **Edit Entry:** Click the edit icon on any entry → modify → Save
- **Delete Entry:** Click the trash icon → confirm deletion
- **Toggle Active/Inactive:** Eye icon to enable/disable entries (useful for seasonal programs)
- Changes take effect immediately — the AI will use updated entries on the next conversation

### Settings Page
- **Change Password:** Enter current password → enter new password → confirm → Save

### Daily Admin Workflow (Recommended)
1. **Morning:** Check dashboard metrics — review any overnight escalations
2. **Review leads:** Follow up on new leads captured by the chatbot
3. **Check escalations:** Read escalated conversations, respond to parents who need human help
4. **Update KB:** If you notice the AI struggling with a topic, add a knowledge base entry for it
5. **Weekly:** Export leads to CSV for your CRM or email marketing

---

## 10. Knowledge Base Management

### How the AI Uses Your Knowledge Base
1. When a parent asks a question, your knowledge base entries are searched for relevant information
2. Matching entries are injected into Claude's context as reference material
3. Claude crafts a natural, conversational response based on your KB data
4. If no matching entry exists, Claude says it doesn't have that information and offers to connect with your team

### Categories

| Category | Purpose | Current Entries |
|----------|---------|----------------|
| **Programs** | After-school enrichment, summer camps, workshops, birthday parties, field trips | 18 |
| **Pricing** | Costs, payment plans, sibling discounts, scholarships, refund policies | 4 |
| **FAQs** | Common parent questions (what to bring, makeup sessions, ages, etc.) | 22 |
| **Policies** | Registration, cancellation, attendance, health/safety, media release | 6 |

### Adding a New Entry
1. Go to **Knowledge Base** in the dashboard
2. Click **"+ Add Entry"**
3. Select a **Category** (Programs, Pricing, FAQs, or Policies)
4. Enter the **Question/Title** (e.g., "What ages are your summer camps for?")
5. Enter the **Answer/Content** (be specific — include ages, dates, prices, locations)
6. Click **Save**
7. The AI will start using this entry immediately

### Writing Effective Entries

**Do:**
- Be specific with numbers: *"Summer camps run June 16 - August 8, 2026, Monday-Friday, 9am-3pm"*
- Include pricing: *"After-school enrichment: $245/month for 2 days/week, $395/month for 3 days/week"*
- Answer the full question: Don't just say "Yes" — explain the details
- Use plain language parents understand
- Include actionable next steps: *"Register at journeytosteam.com/register or call (555) 123-4567"*

**Don't:**
- Use internal jargon or abbreviations
- Leave information vague: *"Pricing varies"* — instead, list actual prices
- Duplicate entries (the AI gets confused with contradictory info)
- Include outdated information (remove or deactivate old entries)

### Managing Seasonal Content
Use the **Active/Inactive toggle** (eye icon) to manage seasonal programs:
- When summer camps end → deactivate summer camp entries
- When fall programs start → activate fall program entries
- This way you never lose old entries — just toggle them back on next year

### Example Entries

**Program Entry:**
- **Q:** What is the After-School STEAM Enrichment program?
- **A:** Our After-School STEAM Enrichment program is for grades K-5, running Tuesdays and Thursdays from 3:30-5:30pm during the school year. Students explore science, technology, engineering, arts, and math through hands-on projects. Topics rotate monthly. Cost: $245/month (2 days) or $395/month (3 days with Friday option). Register at journeytosteam.com/register.

**Pricing Entry:**
- **Q:** Do you offer sibling discounts?
- **A:** Yes! We offer a 10% sibling discount when you enroll 2 or more children in the same program. The discount applies to each additional child. Contact us at hello@journeytosteam.com to apply the sibling discount to your registration.

**FAQ Entry:**
- **Q:** Can my child just attend a few sessions?
- **A:** Our programs are designed as complete 8-week learning journeys where skills build progressively. Students get the most value from attending the full program, which is why we don't offer partial enrollment.

---

## 11. Squarespace Integration

### How to Embed the Chat Widget

1. Log in to your **Squarespace** account at squarespace.com
2. Go to **Settings** → **Developer Tools** → **Code Injection**
   - (Or: **Settings** → **Advanced** → **Code Injection**)
3. In the **Footer** section, paste this code:

```html
<script 
  src="https://widget-j2s.vercel.app/chat-widget.js" 
  data-api-url="https://j2s-bot-production.up.railway.app">
</script>
```

4. Click **Save**
5. Visit your website — you should see the purple chat bubble in the bottom-right corner

### What Happens
- A small purple circle with a chat icon appears in the bottom-right
- An orange notification dot pulses to attract attention
- Clicking it opens the branded chat window
- On mobile, the chat takes up most of the screen
- On desktop, it's a 390px floating panel

### Performance Impact
- **Zero performance impact** — the widget is only 32KB (12KB gzipped)
- It loads asynchronously after your page content
- All styles are scoped with `j2s-` prefix — won't interfere with your Squarespace theme
- No external CSS files — everything is bundled in one JS file

### Removing the Widget
Simply delete the `<script>` tag from Code Injection and save.

---

## 12. Tech Stack & Dependencies

### Overview

| Layer | Technology | Version |
|-------|-----------|---------|
| **Chat Widget** | Preact | 10.25.x |
| **Admin Dashboard** | React | 19.x |
| **Dashboard Styling** | Tailwind CSS | 3.4.17 |
| **Build Tool** | Vite | 6.x |
| **Backend** | Node.js + Express | 18+ / 4.x |
| **AI** | Anthropic Claude API | Sonnet 4 |
| **Database** | PostgreSQL | Supabase hosted |
| **SMS** | Twilio | Latest SDK |
| **Auth** | JWT (jsonwebtoken) | — |
| **Frontend Hosting** | Vercel | — |
| **Backend Hosting** | Railway | — |

### Backend Dependencies (13 packages)
| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Anthropic Claude AI API client |
| `bcrypt` | Password hashing (12 rounds) |
| `cors` | Cross-origin resource sharing |
| `dotenv` | Environment variable loading |
| `express` | HTTP server framework |
| `express-rate-limit` | API rate limiting |
| `helmet` | HTTP security headers |
| `jsonwebtoken` | JWT token creation/verification |
| `pg` | PostgreSQL database driver |
| `twilio` | Twilio SMS API client |
| `uuid` | Unique ID generation |
| `xss` | Input sanitization (XSS prevention) |

### Frontend Dependencies (3 packages)
| Package | Purpose |
|---------|---------|
| `react` | UI component framework |
| `react-dom` | React DOM rendering |
| `react-router-dom` | Client-side routing |

### Widget Dependencies (1 package)
| Package | Purpose |
|---------|---------|
| `preact` | Lightweight React alternative (~3KB) |

---

## 13. Security Features

| Feature | Implementation |
|---------|---------------|
| **Authentication** | JWT tokens — access (7-day) + refresh (30-day) |
| **Password hashing** | bcrypt with 12 salt rounds |
| **HTTP Security** | Helmet middleware (CSP, HSTS, XSS protection headers) |
| **CORS** | Configurable allowed origins |
| **Rate Limiting** | 100 requests/minute global, 5 login attempts per 15 minutes |
| **Input Sanitization** | XSS library on all user input, 2,000 character limit |
| **Body Size Limit** | 1MB max request body |
| **SQL Injection** | Parameterized queries (no string concatenation) |
| **Twilio Validation** | Webhook signature verification in production |
| **API Keys** | All secrets in environment variables, never in code |
| **Sensitive Data** | Credit card/SSN pattern detection → auto-reject |

---

## 14. Environment Variables Reference

These variables are configured on **Railway** (backend) and **Vercel** (frontend):

### Backend (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port (Railway sets automatically) | `3001` |
| `NODE_ENV` | Environment mode | `production` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key | `sk-ant-...` |
| `DATABASE_URL` | Supabase PostgreSQL connection string | `postgresql://...` |
| `TWILIO_ACCOUNT_SID` | Twilio account identifier | `AC...` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `...` |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | `+1234567890` |
| `JWT_SECRET` | Secret for signing access tokens | (random 256-bit string) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens | (random 256-bit string) |
| `CORS_ORIGIN` | Allowed frontend origins | `https://frontend-ecru-three-90.vercel.app,https://journeytosteam.com` |
| `DASHBOARD_URL` | Admin dashboard URL | `https://frontend-ecru-three-90.vercel.app` |

### Frontend (Vercel)

| Variable | Description | Value |
|----------|-------------|-------|
| `VITE_API_URL` | Backend API URL (build-time) | `https://j2s-bot-production.up.railway.app` |

> **Note:** `VITE_API_URL` is a build-time variable. If you change it, you must redeploy (rebuild) the frontend for the change to take effect.

---

## 15. Deployment Guide

### Current Infrastructure

```
GitHub (hasan0v/J2S-Bot)
    │
    ├── Railway (auto-deploys on push to main)
    │   └── Backend API server
    │
    ├── Vercel - "frontend" project
    │   └── Admin Dashboard (React app)
    │
    ├── Vercel - "widget" project  
    │   └── Chat Widget JS bundle
    │
    └── Supabase
        └── PostgreSQL database
```

### Initial Setup (Already Complete)

#### Database (Supabase)
1. Project created on Supabase (US East region)
2. Schema initialized via `seed.js` script (creates tables + indexes)
3. Admin user seeded: `admin@journeytosteam.com`
4. 50 knowledge base entries loaded from `docs/knowledge_base.json`

#### Backend (Railway)
1. Connected to GitHub repo `hasan0v/J2S-Bot`
2. Uses `railway.json` configuration (builds from `backend/` subdirectory)
3. All environment variables set in Railway dashboard
4. Health check configured at `/health`
5. Auto-restarts on failure (max 3 retries)

#### Frontend (Vercel)
1. `frontend/` deployed as separate Vercel project
2. `VITE_API_URL` baked into build
3. SPA routing configured (all paths serve `index.html`)

#### Widget (Vercel)
1. `widget/` deployed as separate Vercel project
2. Stable alias: `widget-j2s.vercel.app`
3. CORS headers configured for cross-origin loading
4. Single file output: `chat-widget.js` (CSS inlined)

---

## 16. How to Deploy Updates

### Updating the Backend
```bash
# Make changes to backend/ files
cd backend
git add .
git commit -m "Description of changes"
git push origin main
# Railway auto-deploys from GitHub — takes ~60 seconds
```

### Updating the Admin Dashboard
```bash
# Make changes to frontend/ files
cd frontend
npm run build
vercel --prod --yes
# Or push to GitHub and trigger Vercel deployment
```

### Updating the Chat Widget
```bash
# Make changes to widget/ files
cd widget
npm run build
vercel --prod --yes
vercel alias <new-deployment-url> widget-j2s.vercel.app
```

### Updating the Knowledge Base
No deployment needed — use the admin dashboard:
1. Login at https://frontend-ecru-three-90.vercel.app
2. Go to **Knowledge Base**
3. Add, edit, or delete entries
4. Changes take effect immediately on the next conversation

### Updating Environment Variables
**Backend (Railway):**
1. Go to https://railway.app → your project → **Variables** tab
2. Edit or add variables
3. Railway auto-redeploys with new values

**Frontend (Vercel):**
1. Go to https://vercel.com → "frontend" project → **Settings** → **Environment Variables**
2. Update `VITE_API_URL` if needed
3. **Must redeploy** for changes to take effect (it's a build-time variable)

---

## 17. Monitoring & Troubleshooting

### Health Check
Verify the backend is running:
```
GET https://j2s-bot-production.up.railway.app/health
→ Returns: {"status": "ok"}
```

### Railway Logs
1. Go to https://railway.app → your project
2. Click the service → **Logs** tab
3. View real-time logs for errors or issues

### Common Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Chat widget not appearing | Script not loading | Check browser console for errors; verify Squarespace Code Injection is saved |
| "Something went wrong" in chat | Backend down or API key issue | Check Railway health endpoint; verify `ANTHROPIC_API_KEY` is valid |
| Login fails (dashboard) | Wrong credentials or CORS | Verify credentials; check `CORS_ORIGIN` includes dashboard URL |
| AI gives wrong information | Knowledge base entry is incorrect or missing | Update the entry in the Knowledge Base dashboard page |
| AI says "I don't have that information" | No KB entry for that topic | Add a new knowledge base entry covering the topic |
| SMS not working | Twilio webhook not configured | Set webhook URL in Twilio console (see Section 8) |
| Slow AI responses | Claude API latency | Normal — responses take 2-5 seconds; if consistently slow, check Railway logs |
| Dashboard not loading | Vercel deployment issue | Check https://vercel.com dashboard for deployment status |

### Uptime Monitoring (Recommended)
Set up a free uptime monitor (e.g., UptimeRobot, Better Uptime) to ping:
- `https://j2s-bot-production.up.railway.app/health`
- Alert you if the backend goes down

---

## 18. Source Code & Repository

### GitHub Repository
- **URL:** https://github.com/hasan0v/J2S-Bot
- **Branch:** `main`
- **License:** Proprietary — Journey to STEAM LLC

### Project Structure
```
J2S-Bot/
├── backend/                    # Node.js Express API server
│   ├── src/
│   │   ├── server.js           # Main entry point
│   │   ├── db.js               # PostgreSQL connection pool
│   │   ├── seed.js             # Database schema + seed script
│   │   ├── update-kb.js        # Knowledge base update script
│   │   ├── routes/
│   │   │   ├── chat.js         # Chat endpoints
│   │   │   ├── sms.js          # SMS/Twilio endpoints
│   │   │   ├── auth.js         # Login/logout/refresh
│   │   │   ├── admin.js        # Dashboard data endpoints
│   │   │   └── knowledge.js    # Knowledge base CRUD
│   │   ├── services/
│   │   │   ├── claude.js       # Anthropic Claude integration
│   │   │   ├── conversation.js # Conversation management
│   │   │   └── guardrails.js   # AI safety guardrails
│   │   └── middleware/
│   │       └── auth.js         # JWT authentication
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # React admin dashboard
│   ├── src/
│   │   ├── App.jsx             # Route definitions
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ConversationsPage.jsx
│   │   │   ├── LeadsPage.jsx
│   │   │   ├── KnowledgeBasePage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── LoginPage.jsx
│   │   ├── components/
│   │   │   └── Layout.jsx      # Sidebar + header layout
│   │   └── services/
│   │       └── api.js          # API client with token management
│   ├── package.json
│   └── vercel.json
│
├── widget/                     # Embeddable chat widget
│   ├── src/
│   │   ├── index.jsx           # Widget component + mount logic
│   │   └── styles/
│   │       └── widget.css      # Scoped widget styles
│   ├── vite.config.js          # IIFE build configuration
│   ├── vercel.json
│   └── package.json
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── ADMIN_GUIDE.md
│   ├── DEPLOYMENT_GUIDE.md
│   ├── KNOWLEDGE_BASE_GUIDE.md
│   ├── FUTURE_IMPROVEMENTS.md
│   ├── Checklist.md
│   ├── PROJECT_HANDOFF.md      # ← This document
│   └── knowledge_base.json     # Initial KB data (50 entries)
│
├── railway.json                # Railway deployment config
└── README.md                   # Developer setup guide
```

---

## 19. Known Limitations

### Current Limitations
1. **No real-time WebSocket** — Dashboard uses polling (auto-refresh every 10-30 seconds), not instant updates
2. **Single admin user** — No multi-user or role-based access (one login only)
3. **English only** — AI responds in English; no multi-language support yet
4. **No file/image sharing** — Parents can only send text messages
5. **No appointment scheduling** — Chatbot can't book appointments directly
6. **No payment processing** — By design (guardrails prevent this)
7. **Polling-based dashboard** — Not real-time push notifications; refreshes automatically

### Open Items
| Item | Description | Impact |
|------|-------------|--------|
| Squarespace embed | Widget not yet embedded on live journeytosteam.com | Need Squarespace Code Injection access |
| Twilio webhook | SMS webhook not configured in Twilio console | SMS won't work until configured (see Section 8) |
| CORS tightening | Backend currently accepts requests from all origins (`*`) | Should be restricted to specific domains |
| Cross-device testing | Not tested on physical iOS Safari or Android Chrome | Widget uses responsive CSS that should work but untested |

---

## 20. Future Improvements Roadmap

### Phase 2 — High Priority (Months 2-3)
| Feature | Description | Estimated Effort |
|---------|-------------|-----------------|
| **Real-time WebSocket** | Replace polling with instant updates in dashboard | 2-3 days |
| **Multi-language support** | Spanish language responses for bilingual families | 3-4 days |
| **Conversation analytics** | Response times, satisfaction scores, topic breakdown | 3-4 days |
| **Automated follow-up** | Auto-email parents who expressed interest but didn't enroll | 2-3 days |
| **File/image sharing** | Parents can send photos, documents in chat | 2-3 days |

### Phase 3 — Medium Priority (Months 4-6)
| Feature | Description | Estimated Effort |
|---------|-------------|-----------------|
| **Multi-admin RBAC** | Multiple admin users with different permission levels | 3-4 days |
| **CRM integration** | Sync leads to HubSpot, Salesforce, or Mailchimp | 2-3 days |
| **Appointment scheduling** | Book sessions directly from chat (Calendly/Acuity integration) | 3-5 days |
| **A/B testing** | Test different welcome messages and quick actions | 2-3 days |
| **Voice calls** | Twilio voice integration for phone calls | 3-4 days |

### Phase 4 — Nice to Have (Month 7+)
| Feature | Description | Estimated Effort |
|---------|-------------|-----------------|
| **KB auto-suggestions** | AI suggests new KB entries based on unanswered questions | 2-3 days |
| **Parent accounts** | Parents can create accounts, view history, manage enrollment | 5-7 days |
| **Payment processing** | Stripe integration for online registration payments | 4-5 days |
| **WhatsApp Business** | Chat via WhatsApp in addition to web + SMS | 3-4 days |
| **Proactive engagement** | Pop-up messages based on page visited or time on site | 2-3 days |

---

## 21. Deliverables Checklist

Mapping to the original project requirements:

| # | Deliverable | Status | Details |
|---|-------------|--------|---------|
| 1 | Deployed, working chatbot on journeytosteam.com | ⚠️ Widget deployed, not yet embedded | Widget live at `widget-j2s.vercel.app`; needs Squarespace Code Injection paste |
| 2 | SMS number receiving and responding to texts | ⚠️ Code complete, webhook not configured | Twilio webhook URL ready; needs Twilio console setup |
| 3 | Admin dashboard with login | ✅ Complete | https://frontend-ecru-three-90.vercel.app |
| 4 | Source code (GitHub repo with README) | ✅ Complete | https://github.com/hasan0v/J2S-Bot |
| 5a | Doc: How to update knowledge base | ✅ Complete | Section 10 of this document + `KNOWLEDGE_BASE_GUIDE.md` |
| 5b | Doc: How to access dashboard + interpret metrics | ✅ Complete | Section 9 of this document + `ADMIN_GUIDE.md` |
| 5c | Doc: How to deploy updates | ✅ Complete | Section 16 of this document + `DEPLOYMENT_GUIDE.md` |
| 5d | Doc: Architecture diagram | ✅ Complete | Section 5 of this document + `ARCHITECTURE.md` |
| 5e | Doc: Environment variables + setup guide | ✅ Complete | Section 14 of this document + `README.md` |
| 6 | 30-minute handoff call | ❌ Pending | Schedule after deployment completion |
| 7 | List of suggested future improvements | ✅ Complete | Section 20 of this document + `FUTURE_IMPROVEMENTS.md` |

---

## 22. Support & Handoff

### Immediate Next Steps
1. **Embed widget on Squarespace** — Paste the script tag in Code Injection (Section 11)
2. **Configure Twilio** — Set up webhook URL in Twilio console (Section 8)
3. **Change admin password** — Log in and update from default credentials
4. **Review knowledge base** — Verify all 50 entries are accurate; add/edit as needed
5. **Schedule handoff call** — 30-minute walkthrough of everything

### Files Included in This Project
| Document | File Path | Purpose |
|----------|-----------|---------|
| This Document | `docs/PROJECT_HANDOFF.md` | Complete project documentation |
| Architecture | `docs/ARCHITECTURE.md` | Technical architecture details |
| Admin Guide | `docs/ADMIN_GUIDE.md` | Dashboard usage guide |
| Deployment Guide | `docs/DEPLOYMENT_GUIDE.md` | Deployment procedures |
| Knowledge Base Guide | `docs/KNOWLEDGE_BASE_GUIDE.md` | KB management guide |
| Future Improvements | `docs/FUTURE_IMPROVEMENTS.md` | Roadmap with 15 features |
| Checklist | `docs/Checklist.md` | 82-item requirements tracking |
| Developer README | `README.md` | Developer setup + API reference |

### 48-Hour Bug Fix Guarantee
Per the project agreement, any critical bugs reported within 48 hours of launch will be fixed at no additional cost.

---

*Document generated for Journey to STEAM LLC. All production URLs and credentials are current as of February 9, 2026.*
