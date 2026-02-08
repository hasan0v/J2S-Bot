# Admin Dashboard Guide

The admin dashboard at `https://your-admin-domain.com` provides a central interface for managing conversations, leads, knowledge base content, and system settings.

---

## Login

Navigate to the dashboard URL and enter your credentials:

- **Default Email**: `admin@journeytosteam.com`
- **Default Password**: `J2SAdmin2026!`

⚠️ **Change the default password immediately** via Settings after first login.

---

## Dashboard (Home)

The main dashboard shows key metrics at a glance:

| Metric | Description |
|--------|-------------|
| **Conversations Today** | Number of chat sessions started today |
| **This Week** | Sessions started in the last 7 days |
| **This Month** | Sessions started in the last 30 days |
| **Total Leads** | All conversations where contact info was captured |
| **Escalation Rate** | Percentage of conversations that were escalated |
| **Avg Response Time** | Average AI response time in seconds |

Below the metrics is a **30-day conversation trend chart** showing daily conversation volumes.

Dashboard data auto-refreshes every 30 seconds.

---

## Conversations

View and manage all customer conversations.

### Filtering
- **Status**: Active, Ended, or Escalated conversations
- **Channel**: Web (chat widget) or SMS
- **Search**: Search by lead name, email, or phone number

### Conversation Detail
Click any conversation row to open the full message thread in a modal:
- Messages are displayed in chronological order
- User messages appear in gray, bot responses in blue
- Status badges: 🟢 Active, ⚪ Ended, 🔴 Escalated
- Timestamps show relative time ("2 minutes ago")

### Actions
- **Escalate**: Mark a conversation as needing human attention. This is a one-way action.
- **End**: Mark a conversation as concluded.

Conversations auto-refresh every 10 seconds to show new activity.

---

## Leads

The leads page shows all conversations where the AI detected contact information.

### Information Captured
- **Name**: Extracted from "my name is..." patterns
- **Email**: Detected email addresses
- **Phone**: Detected phone numbers (normalized to E.164)
- **Program Interest**: Detected mentions of specific J2S programs
- **Source Channel**: Web or SMS

### Sorting
Click any column header to sort by that field.

### Export
Click **Export CSV** to download all leads as a spreadsheet-compatible CSV file. This includes all leads regardless of current filter/pagination.

---

## Knowledge Base

The knowledge base is the content that powers the AI's responses. The AI uses these entries as reference material when answering parent questions.

### Categories
- **Programs**: Information about J2S classes, camps, and workshops
- **Pricing**: Tuition, fees, payment plans, discounts
- **FAQs**: Common questions and answers
- **Policies**: Enrollment, cancellation, safety policies

### Managing Entries

#### Create New Entry
1. Click **Add Entry**
2. Select a category
3. Enter a descriptive title
4. Write the content (plain text)
5. Click **Save**

#### Edit Entry
1. Click the **Edit** (pencil icon) button on any entry
2. Modify the fields
3. Click **Save**

#### Toggle Active/Inactive
- Click the **Toggle** button to activate or deactivate an entry
- Inactive entries are NOT included in the AI's system prompt
- Use this to seasonally enable/disable content (e.g., summer camp info)

#### Delete Entry
- Click the **Delete** (trash icon) button
- This permanently removes the entry

### Best Practices
- Keep entries concise and factual
- Update pricing immediately when it changes
- Add new FAQ entries when you notice recurring questions in conversations
- Use the active/inactive toggle for seasonal programs rather than deleting

---

## Settings

### Change Password
1. Enter your current password
2. Enter your new password (minimum 8 characters)
3. Confirm the new password
4. Click **Change Password**

### Account Information
View your email and role. Account management is handled at the database level.

---

## Tips

1. **Monitor escalated conversations daily** — these represent parents who need human follow-up
2. **Export leads weekly** — import into your CRM or email marketing tool
3. **Review conversations** to spot patterns and improve knowledge base content
4. **Update the knowledge base** whenever programs, pricing, or policies change
5. **Check the dashboard** for unusual patterns (spike in escalations may indicate a knowledge base gap)
