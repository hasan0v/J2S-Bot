### Pre-Processing (before message reaches Claude)
| Guard | Action | Severity |
|-------|--------|----------|
| **Flood detection** | 15 msg/min per session | Blocks |
| **Garbage/gibberish** | Empty, repeated chars, special-char spam | Blocks |
| **Prompt injection** | 30+ patterns: "ignore instructions", jailbreaks, DAN mode, role-play, system prompt extraction | Blocks |
| **Credit card numbers** | Visa, MC, Amex, Discover patterns | Blocks |
| **SSN detection** | XXX-XX-XXXX with valid range check | Blocks |
| **Bank account/routing** | Account numbers in context | Blocks |
| **Password sharing** | "my password is..." patterns | Blocks |
| **Violence/weapons** | Guns, threats, self-harm + crisis line (988) | Blocks |
| **Sexual content** | Zero tolerance (children's platform) | Blocks |
| **Drug references** | Substance mentions | Blocks |
| **Hate speech** | Racial, discriminatory content | Blocks |
| **Profanity/abuse** | Heavy profanity, direct threats | Blocks |
| **Malicious URLs** | Any non-journeytosteam.com links | Blocks |
| **Competitor mentions** | Code Ninjas, Kumon, etc. | Flags (not blocked) |
| **Off-topic** | Crypto, politics, recipes, dating | Flags |
| **Medical keywords** | ADHD, allergies, therapy, etc. | Adds disclaimer |

### Post-Processing (validates Claude's response)
| Guard | Action |
|-------|--------|
| **Enrollment confirmation** | 25 phrases detected → response replaced entirely |
| **PII echo-back** | Card digits or SSN repeated → response stripped |
| **Contact accuracy** | Wrong email/phone/website → corrected inline |
| **Hallucination** | Fake addresses, hours, stats, promises → flagged + escalated |
| **Competitor in response** | AI mentions a competitor → escalated |
| **Inappropriate tone** | "shut up", "not my problem", etc. → response replaced |
| **Escalation triggers** | Expanded to 10 categories including safety, media, partnerships |



**System prompt:** Massively upgraded with 6 numbered guardrail sections, explicit forbidden phrases, correct contact info, and anti-jailbreak rules

