# Deployment Guide

This guide explains how to deploy the J2S-Bot system to production using **Railway** (backend), **Vercel** (admin dashboard + widget), and **Supabase** (database).

---

## 1. Database — Supabase

### Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose the region closest to your users (likely `us-east-1`)
3. Set a strong database password — save it securely
4. Once the project is created, go to **Settings → Database → Connection string → URI**
5. Copy the connection string — it will look like:
   ```
   postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```

### Initialize Schema

You can either:

**Option A**: Run the seed script (creates tables + sample data):
```bash
DATABASE_URL="your-connection-string" node backend/src/seed.js
```

**Option B**: Run the SQL manually via Supabase SQL Editor — see the `CREATE TABLE` statements in [backend/src/models/database.js](../backend/src/models/database.js).

---

## 2. Backend — Railway

### Setup

1. Go to [railway.app](https://railway.app) and create a new project
2. Choose **Deploy from GitHub repo** and connect your repository
3. Set the **Root Directory** to `backend`
4. Set the **Start Command** to `npm start`

### Environment Variables

Set these in Railway's Variables tab:

| Variable | Value |
|----------|-------|
| `PORT` | `3001` (Railway assigns automatically) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Supabase connection string |
| `ANTHROPIC_API_KEY` | `sk-ant-api...` |
| `JWT_SECRET` | Generate: `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -hex 64` |
| `CORS_ORIGIN` | `https://frontend-ecru-three-90.vercel.app,https://www.journeytosteam.com,https://journeytosteam.com` |
| `TWILIO_ACCOUNT_SID` | Your Twilio SID |
| `TWILIO_AUTH_TOKEN` | Your Twilio token |
| `TWILIO_PHONE_NUMBER` | `+1XXXXXXXXXX` |

### Verify Deployment

After deploying, Railway will assign a URL like `https://j2s-bot-production.up.railway.app`.

Test the health endpoint:
```bash
curl https://j2s-bot-production.up.railway.app/health
```

Expected response:
```json
{"status": "ok", "database": "connected"}
```

### Run Seed (One-time)

Railway provides a shell — or you can run the seed script locally pointing to the production database:
```bash
DATABASE_URL="your-production-db-url" node backend/src/seed.js
```

---

## 3. Admin Dashboard — Vercel

### Setup

1. Go to [vercel.com](https://vercel.com) and import your GitHub project
2. Set the **Root Directory** to `frontend`
3. Vercel will auto-detect Vite and configure the build

### Environment Variables

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://j2s-bot-production.up.railway.app` |

### Vercel Configuration

Create or verify `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

This ensures client-side routing works for all dashboard pages.

### Verify

Visit `https://frontend-ecru-three-90.vercel.app` — you should see the login page. Log in with:
- Email: `admin@journeytosteam.com`
- Password: `J2SAdmin2026!`

**⚠️ Change the admin password immediately after first login via Settings page.**

---

## 4. Chat Widget — Vercel (or CDN)

### Build

```bash
cd widget
npm run build
```

This produces `dist/chat-widget.js` — a single IIFE file with CSS inlined.

### Deploy Options

**Option A: Vercel (Static)**

Deploy the widget as a separate Vercel project:
1. Import the same repo, set root directory to `widget`
2. Build command: `npm run build`
3. Output directory: `dist`

**Option B: CDN Upload**

Upload `dist/chat-widget.js` to any CDN (Cloudflare R2, AWS S3 + CloudFront, etc.).

### Embed in Squarespace

1. Go to **Squarespace → Settings → Advanced → Code Injection**
2. In the **Footer** section, paste:

```html
<script src="https://widget-j2s.vercel.app/chat-widget.js" data-api-url="https://j2s-bot-production.up.railway.app"></script>
```

The widget will automatically:
- Append a mount div to `<body>`
- Render the chat toggle button (bottom-right corner)
- Not conflict with Squarespace's existing styles

---

## 5. Twilio SMS Configuration

### Setup Webhook

1. Go to [twilio.com/console](https://www.twilio.com/console)
2. Navigate to **Phone Numbers → Manage → Active Numbers**
3. Click your number
4. Under **Messaging → A message comes in**:
   - Set webhook URL: `https://j2s-bot-production.up.railway.app/api/sms/webhook`
   - HTTP Method: **POST**
5. Save

### Test

Send an SMS to your Twilio number — you should receive an AI-powered response.

---

## 6. Custom Domain (Optional)

### Backend (Railway)
1. In Railway project settings, go to **Settings → Domains**
2. Add your custom domain (e.g., `api.journeytosteam.com`)
3. Add the CNAME record to your DNS provider

### Dashboard (Vercel)
1. In Vercel project settings, go to **Domains**
2. Add your domain (e.g., `admin.journeytosteam.com`)
3. Follow Vercel's DNS configuration instructions

---

## 7. Post-Deployment Checklist

- [ ] Health endpoint returns `{"status": "ok", "database": "connected"}`
- [ ] Admin login works with seed credentials
- [ ] Admin password changed from default
- [ ] Chat widget loads on test page
- [ ] Chat widget sends and receives messages
- [ ] SMS webhook receives and responds to messages
- [ ] Dashboard shows metrics from test conversations
- [ ] Leads page shows extracted contact info
- [ ] Knowledge base entries match your actual programs
- [ ] CORS_ORIGIN includes all production domains
- [ ] SSL/HTTPS active on all endpoints
- [ ] Rate limiting active (test 100+ rapid requests)

---

## Monitoring

### Railway
- View logs in the Railway dashboard → Deployments → Logs
- Set up alerts for deployment failures

### Supabase
- Monitor database usage in Supabase dashboard → Reports
- Set up alerts for high connection counts

### Application Health
- Hit `/health` endpoint periodically (use UptimeRobot, Better Uptime, etc.)
- Monitor for `{"database": "disconnected"}` responses
