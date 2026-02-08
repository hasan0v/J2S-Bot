# Knowledge Base Guide

The knowledge base is the foundation of the AI chatbot's accuracy. It provides the structured information that Claude uses to answer parent questions about Journey to STEAM programs, pricing, policies, and frequently asked questions.

---

## How It Works

When a parent sends a message, the backend:

1. Loads all **active** knowledge base entries from the database
2. Groups them by category (Programs, Pricing, FAQs, Policies)
3. Injects them into Claude's system prompt
4. Claude uses this information to formulate accurate, helpful responses

**If an entry is not in the knowledge base, Claude will not know about it.** The AI is instructed to say "I don't have that specific information" rather than guess.

---

## Categories

### Programs
Information about J2S classes, camps, workshops, and curriculum.

**What to include:**
- Program names and descriptions
- Age groups and grade levels
- Schedule information (days, times, duration)
- Subjects covered (robotics, coding, science experiments, etc.)
- Any prerequisites or requirements
- Location information

**Example entry:**
```
Title: After-School STEAM Program
Content: Our After-School STEAM Program is available for children ages 5-12 
(grades K-6). Sessions run Monday through Thursday from 3:30 PM to 5:30 PM. 
Each session includes hands-on activities in robotics, coding, engineering 
challenges, and science experiments. Programs run in 8-week sessions 
throughout the school year. No prior experience is required. All materials 
are provided. Maximum class size is 15 students per session.
```

### Pricing
Tuition, fees, payment plans, and discount information.

**What to include:**
- Program costs (per session, per semester, per class)
- Registration fees
- Payment plan options
- Sibling discounts or multi-session discounts
- Scholarship or financial aid availability
- Refund policies related to payment

**Example entry:**
```
Title: After-School Program Pricing
Content: After-School STEAM Program tuition is $250 per 8-week session. 
A one-time registration fee of $25 applies for new students. Multi-child 
discount: 10% off each additional sibling. We offer a 3-payment plan at 
no additional cost. Full payment is due before the session starts. 
Limited scholarships are available — contact us for details.
```

### FAQs
Common questions parents ask, with clear answers.

**What to include:**
- Questions about enrollment process
- What to bring / what's provided
- Makeup class policies
- Transportation or drop-off/pickup info
- Safety and supervision details
- Communication preferences

**Example entry:**
```
Title: What should my child bring?
Content: Students should wear comfortable clothes that can get messy. 
We provide all materials, tools, and safety equipment including lab coats 
and safety goggles. Students should bring a water bottle and a snack. 
We are a nut-free facility. Please label all personal items with your 
child's name.
```

### Policies
Enrollment, cancellation, safety, and other operational policies.

**What to include:**
- Enrollment/registration procedures
- Cancellation and refund policies
- Attendance and makeup policies
- Health and safety protocols
- Media/photo release information
- Code of conduct

**Example entry:**
```
Title: Cancellation Policy
Content: Cancellations made 7 or more days before a session begins 
receive a full refund minus a $25 administrative fee. Cancellations 
within 7 days receive a 50% refund. No refunds are given after the 
session has started, but credit may be applied to future sessions on 
a case-by-case basis. To cancel, email info@journeytosteam.com or 
call (555) 123-4567.
```

---

## Writing Effective Entries

### Do's
- **Be specific**: Include exact numbers (ages, prices, dates, times)
- **Be concise**: Aim for 50-200 words per entry. Claude works better with digestible chunks.
- **Use plain language**: Write as you'd explain it to a parent in conversation
- **Include actionable info**: Tell parents what to do next (call, email, visit website)
- **Keep it current**: Update entries immediately when information changes
- **One topic per entry**: Avoid combining multiple programs or policies in a single entry

### Don'ts
- **Don't use jargon**: Avoid internal acronyms or technical terms parents won't know
- **Don't leave outdated info**: Old dates, discontinued programs, or wrong prices cause trust issues
- **Don't add opinions**: Stick to facts. The AI can add warmth and personality on its own.
- **Don't duplicate entries**: One authoritative entry per topic prevents contradictions
- **Don't write novels**: Very long entries dilute the AI's attention. Split into multiple entries if needed.

---

## Seasonal Management

Use the **active/inactive toggle** to manage seasonal content:

| Season | Active Content |
|--------|----------------|
| **Fall** | After-school programs, fall break camps |
| **Winter** | Winter break camps, spring registration |
| **Spring** | After-school programs, summer camp registration |
| **Summer** | Summer camps, fall registration |

**Workflow:**
1. As a season approaches, create new entries for upcoming programs
2. Toggle old seasonal entries to **inactive** (don't delete — you'll reuse them next year)
3. Update returning entries with current dates, times, and pricing
4. Toggle them back to **active**

---

## Troubleshooting

### "The chatbot gave wrong information"
1. Check the knowledge base for the relevant entry
2. If the entry is incorrect, update it — the fix takes effect on the next conversation
3. If the entry is missing, create one — the AI was probably saying "I don't have that information"

### "The chatbot isn't mentioning our new program"
1. Create a knowledge base entry for the new program
2. Make sure the entry is set to **Active**
3. Test by starting a new chat session and asking about the program

### "The chatbot is mentioning an old program/price"
1. Find the outdated entry in the knowledge base
2. Either update the content or toggle it to **Inactive**
3. Changes take effect immediately for new conversations

### "The responses are too long/short"
The response length is controlled by the AI model's configuration (max 1024 tokens). The knowledge base content doesn't directly control response length, but shorter, more focused entries tend to produce more concise responses.

---

## Initial Setup Checklist

When setting up the knowledge base for the first time:

- [ ] List all current programs with descriptions, ages, schedules
- [ ] Document all pricing (tuition, fees, discounts)
- [ ] Write answers to the 10 most common parent questions
- [ ] Document enrollment process step-by-step
- [ ] Add cancellation and refund policies
- [ ] Add safety and supervision information
- [ ] Add contact information and office hours
- [ ] Review all entries for accuracy
- [ ] Test by chatting with the bot and asking about each topic
