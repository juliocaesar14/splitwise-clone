# AI_CONTEXT.md
> Source of truth for the Splitwise Clone project. Last updated after full interview session.
> Any developer or AI agent should be able to read this file and rebuild a near-identical app.

---

## 1. Product Understanding

### What is Splitwise?
Splitwise is a group expense tracking and debt settlement app. It allows users to:
- Form groups (trips, households, friend circles)
- Record shared expenses and split them in multiple ways
- Track who owes whom across groups
- Settle debts via cash or payment apps

### Real-World Usage Context
The builder uses Splitwise for:
- College trips (multi-day, multiple payers, complex splits, settle at the end)
- Canteen/mess hangouts (quick, casual, equal splits among friends)

This informed two core product truths:
1. Settlement is deferred — users don't pay back immediately, they settle at the end
2. The app must handle both casual (quick add) and complex (multi-split-type) flows

---

## 2. Product Scope

### Must Have (MVP)
- Auth: Email/password registration + Google OAuth login
- Groups: Create, manage, invite, remove members
- Expenses: Equal, unequal, percentage, share-based splits
- Real-time chat per expense (Pusher)
- Group-wise balances + global dashboard (individual + group)
- Settle debts: UPI deep link + manual confirmation
- Receipt photo upload (optional, per expense)
- Email notifications: signup, group invite, weekly/monthly digest
- Dark mode toggle
- Expense list sort: chronological OR date-grouped (user toggle)
- Dashboard: individual people + group balances on one screen (two sections)
- Simplify debts: within group only
- Multi-currency: off by default, toggled in group settings
- Friends via search (name/email/phone, min 3 chars)
- UPI ID in profile (optional) — links to UPI deep link on settle

### Out of Scope (Documented as Future)
- Recurring expenses
- Automated E2E tests (replaced by QA checklist)
- Real payment verification (UPI webhooks)
- CSV/PDF export
- Native mobile app (web is mobile-first responsive)
- Rate limiting middleware
- Cross-group debt simplification (NP-hard graph problem)
- Multi-payer per expense (use two separate expenses instead)

---

## 3. User Personas

| Persona | Behaviour |
|---|---|
| Organizer/Admin | Creates group, invites members, initiates settlement, can delete group |
| Primary Payer | Pays big transactions, records them as expenses |
| Passive Participant | Occasionally adds small expenses, views balances |

### Admin Rules
- Soft admin: can invite/remove members, edit group name/description, delete group
- Cannot edit or delete another user's expense
- If admin leaves without deleting, earliest joined member becomes admin automatically
- Single admin per group (no co-admins)

---

## 4. User Data Model

### Mandatory at Registration
- `name` (String)
- `email` (String, unique)
- `password` (bcrypt hashed)

### Optional (Profile Settings)
- `upi_id` (String) — if present, shown as UPI button in settle flow
- `phone` (String) — used for friend search
- `avatar_url` — auto-generated from initials via UI Avatars API at registration
- `preferred_currency` — defaults to INR
- `notification_preference` — WEEKLY | MONTHLY

### System Generated
- `id` (UUID, Prisma auto)
- `created_at`, `updated_at` (Prisma auto)

---

## 5. Database Schema

### `users`
```
id                    String    @id @default(uuid())
name                  String
email                 String    @unique
password_hash         String?
upi_id                String?
phone                 String?
avatar_url            String?
preferred_currency    String    @default("INR")
notification_pref     String    @default("WEEKLY")  // WEEKLY | MONTHLY
created_at            DateTime  @default(now())
updated_at            DateTime  @updatedAt
```

### `groups`
```
id                    String    @id @default(uuid())
name                  String
description           String?
created_by            String    // FK → users.id
is_one_on_one         Boolean   @default(false)
default_currency      String    @default("INR")
created_at            DateTime  @default(now())
updated_at            DateTime  @updatedAt
```

### `group_members`
```
id                    String    @id @default(uuid())
group_id              String    // FK → groups.id
user_id               String    // FK → users.id
nickname              String?
role                  String    @default("MEMBER")  // ADMIN | MEMBER
joined_at             DateTime  @default(now())
```

### `expenses`
```
id                    String    @id @default(uuid())
group_id              String    // FK → groups.id
title                 String
total_amount          Decimal   @db.Decimal(10, 2)
currency              String    @default("INR")
payer_id              String    // FK → users.id (who paid the bill)
created_by            String    // FK → users.id (who entered the data)
split_type            String    // EQUAL | UNEQUAL | PERCENTAGE | SHARE
notes                 String?   // expense category/comment
receipt_url           String?   // optional photo upload
created_at            DateTime  @default(now())
updated_at            DateTime  @updatedAt
```

### `expense_splits`
```
id                    String    @id @default(uuid())
expense_id            String    // FK → expenses.id
user_id               String    // FK → users.id
amount                Decimal   @db.Decimal(10, 2)  // resolved amount, never raw %
created_at            DateTime  @default(now())
```

### `settlements`
```
id                    String    @id @default(uuid())
group_id              String    // FK → groups.id
sender_id             String    // FK → users.id (who paid)
recipient_id          String    // FK → users.id (who received)
amount                Decimal   @db.Decimal(10, 2)
payment_method        String    // UPI | CASH | OTHER
upi_ref               String?
created_at            DateTime  @default(now())
```

### `messages`
```
id                    String    @id @default(uuid())
expense_id            String    // FK → expenses.id
user_id               String    // FK → users.id
content               String
created_at            DateTime  @default(now())
```

---

## 6. Balance Calculation Logic

### Approach: On-the-fly (Option A)
Never store balances. Calculate at query time by summing expenses and settlements.

### Formula
```
Balance(A owes B) = 
  SUM(expense_splits.amount WHERE user_id=A AND expense payer_id=B)
  - SUM(settlements.amount WHERE sender_id=A AND recipient_id=B)
```

### Rounding / Remainder Cent Problem
- All splits stored as Decimal(10,2)
- Known limitation: ₹100 / 3 = 33.33 × 3 = 99.99 (1 paise lost)
- MVP does NOT auto-assign remainder to first person
- Documented as known limitation
- Backend throws 400 if split amounts don't sum to total_amount (strict validation)

### Simplify Debts
- Available only within a single group
- NOT available across groups (NP-hard graph problem — deliberate exclusion)

---

## 7. Split Type Logic (Pure Functions — Testable)

```javascript
// EQUAL
splitEqually(totalAmount, members) {
  const share = (totalAmount / members.length).toFixed(2)
  // validate sum === totalAmount, adjust for remainder if needed
}

// UNEQUAL — backend validates sum of amounts === totalAmount, else 400
// PERCENTAGE — backend validates sum of % === 100, else 400
// SHARE — convert shares to ratio, multiply by totalAmount, store resolved Decimal
```

---

## 8. API Design

### Auth
| Method | Route | Description |
|---|---|---|
| POST | /api/auth/register | Email/password registration |
| POST | /api/auth/login | Email/password login |
| * | /api/auth/[...nextauth] | NextAuth Google OAuth handler |

### Users
| Method | Route | Description |
|---|---|---|
| GET | /api/users/me | Current user profile |
| PATCH | /api/users/me | Update profile (UPI, phone, avatar, notif pref) |
| GET | /api/users/search?q= | Find users (min 3 chars enforced server-side) |

### Groups
| Method | Route | Description |
|---|---|---|
| POST | /api/groups | Create group |
| GET | /api/groups | All groups for current user |
| GET | /api/groups/[id] | Single group detail |
| PATCH | /api/groups/[id] | Edit name/description (admin only) |
| DELETE | /api/groups/[id] | Delete group (admin only) |
| POST | /api/groups/[id]/members | Add member |
| DELETE | /api/groups/[id]/members/[userId] | Remove member (admin only) |

### Expenses
| Method | Route | Description |
|---|---|---|
| POST | /api/groups/[id]/expenses | Create expense |
| GET | /api/groups/[id]/expenses | List expenses in group |
| GET | /api/expenses/[id] | Expense detail + nested expense_splits array |
| PATCH | /api/expenses/[id] | Edit expense (creator only) |
| DELETE | /api/expenses/[id] | Delete expense (creator only) |

### Balances
| Method | Route | Description |
|---|---|---|
| GET | /api/groups/[id]/balances | Group-wise balance (on-the-fly calc) |
| GET | /api/users/me/balances | Global dashboard balance (all groups) |

### Settlements
| Method | Route | Description |
|---|---|---|
| POST | /api/groups/[id]/settlements | Record settlement |
| GET | /api/groups/[id]/settlements | List settlements in group |

### Messages
| Method | Route | Description |
|---|---|---|
| POST | /api/expenses/[id]/messages | Send message |
| GET | /api/expenses/[id]/messages | Fetch message history |

---

## 9. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 App Router | Modern RSC, monorepo, Vercel native |
| Backend | Next.js Route Handlers | No separate server, no CORS complexity |
| Database | PostgreSQL | Industry standard, Prisma pairing |
| ORM | Prisma | Type-safe, clean migrations |
| Auth | NextAuth.js (Auth.js) | Handles sessions, OAuth, cookies |
| Password | bcrypt | Industry standard hashing |
| Real-time | Pusher Channels | Works on Vercel serverless (WebSockets don't) |
| UI Library | shadcn/ui + Tailwind CSS | Modern, accessible, copy-paste components |
| Theming | next-themes | Dark mode toggle |
| Charts | Recharts | React-native, declarative, D3-backed |
| Email | Resend or Nodemailer | Signup/invite/digest emails |
| Deployment | Vercel | Next.js native, auto SSL, GitHub integration |
| DB Hosting | Railway or Supabase | Managed PostgreSQL |
| Avatar | UI Avatars API | Auto-generated initials avatar |

---

## 10. Frontend Structure

### Routes
```
/                          Landing (login + register tabs)
/auth/register             Register screen
/auth/login                Login screen
/dashboard                 Global balance: individual people + groups (one screen, two sections)
/groups                    All groups list
/groups/new                Create group form
/groups/[id]               Group detail: members, expenses (toggle: chrono/date-grouped), group balance
/groups/[id]/expenses/new  Add expense + split type selector + Recharts pie for percentage
/groups/[id]/settle        Settle up screen: who owes whom + UPI button
/expenses/[id]             Expense detail: split breakdown + real-time Pusher chat
/settings                  Profile: UPI ID, phone, currency, notification preference, dark mode
```

### Design System
- **Primary color**: Emerald-600
- **Dark mode**: next-themes toggle
- **Font**: Distinctive display font (not Inter/Roboto) — e.g. Geist or DM Sans
- **Mobile-first**: All layouts built for ~390px, scale up with `md:` / `lg:` prefixes
- **1-on-1 groups**: Visually distinct — smaller name, different color label

---

## 11. Real-time Chat Architecture

1. User opens `/expenses/[id]`
2. Frontend subscribes to Pusher channel: `expense-{id}`
3. User sends message → `POST /api/expenses/[id]/messages`
4. Route Handler saves to DB, triggers Pusher event `new-message`
5. All subscribers receive event, append message to UI
6. No page reload needed

---

## 12. UPI Settlement Flow

1. User taps "Settle Up" in `/groups/[id]/settle`
2. App shows amount owed and receiver's UPI ID (if set)
3. User taps UPI button → deep link fires: `upi://pay?pa={upi_id}&pn={name}&am={amount}`
4. UPI app opens on mobile (desktop shows fallback "Mark as Paid" button)
5. User completes payment externally
6. User returns to app, taps "I Paid"
7. App writes to `settlements` table
8. Balance recalculated on next dashboard load

---

## 13. Email Notification Plan

| Trigger | Type |
|---|---|
| New user registration | Immediate welcome email |
| Group invite | Immediate notification |
| Weekly digest | Cron: every Monday — "You owe X, Y owes you Z" |
| Monthly digest | Cron: 1st of month — same summary |

User sets preference (WEEKLY/MONTHLY) in settings. Cron handled via Vercel Cron Jobs or external scheduler.

---

## 14. Deployment Plan

1. Push code to GitHub (public repository)
2. Connect repo to Vercel
3. Provision PostgreSQL on Railway or Supabase
4. Set environment variables in Vercel:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
   - `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
   - `RESEND_API_KEY` (or SMTP credentials)
5. Run `prisma migrate deploy` on first deploy
6. Vercel auto-deploys on every push to `main`

---

## 15. Testing Plan

### Unit Tests (Non-negotiable)
- Balance calculation pure functions
- Split validation logic (equal, unequal, percentage, share)
- Remainder/rounding edge cases
- Run with Node.js scripts, no framework needed

### Manual API Testing
- Tool: Thunder Client or Postman
- Test each endpoint with valid + invalid payloads
- Verify 400 errors on bad split amounts

### QA Checklist (in README)
- [ ] Auth: Register → Logout → Login
- [ ] Google OAuth: Login with Google
- [ ] Groups: Create → Invite → Add/Remove member
- [ ] Expenses: Equal split → Verify balance
- [ ] Expenses: Unequal split → Verify 400 on bad sum
- [ ] Expenses: Percentage split → Verify pie chart renders
- [ ] Chat: Post message → Verify real-time update
- [ ] Settlements: Record payment → Verify balance decreases
- [ ] Partial settlement: Pay partial → Verify remainder shows
- [ ] Dark mode: Toggle and verify persistence
- [ ] Mobile: Test all flows on 390px viewport

---

## 16. Known Risks & Tradeoffs

| Risk | Decision |
|---|---|
| Remainder cent (₹100/3 = 99.99) | Known limitation, documented, not auto-fixed in MVP |
| No rate limiting | Skipped for 2-day deadline, noted as future improvement |
| Debt simplification is NP-hard across groups | Simplify only within group — deliberate architectural decision |
| Pusher free tier (200 concurrent, 200k msg/day) | Acceptable for MVP/demo scale |
| Vercel cold starts may add chat latency | Acceptable for serverless architecture |
| UPI deep link only works on mobile | Desktop shows "Mark as Paid" fallback button |
| On-the-fly balance calc slow at ~500+ expenses | Acceptable for MVP, mitigated by DB indexes on group_id/payer_id |
| No real payment verification | Optimistic manual confirmation (no webhook integration) |
| Recurring expenses | Cut from MVP, documented as future enhancement |
| Multi-payer per expense | Not supported — use two separate expenses |

---

## 17. Changes During Implementation

> This section must be updated continuously during the build.

| Date | Change | Reason |
|---|---|---|
| — | Initial schema locked | Post-interview |
| — | Receipt upload added as optional | User requirement during interview |
| — | `created_by` added to expenses | Audit trail requirement |
| — | `sender_id`/`recipient_id` renamed in settlements | Avoid confusion with `payer_id` in expenses |

---

## 18. Prompts & AI Responses

> This section logs key prompts used during development.

**Initial prompt**: Full interview prompt per assignment brief — AI asked 18 rounds of questions across product, schema, stack, API, testing, risks before generating any code.

**Key decisions made via interview**:
- On-the-fly balance calculation (vs ledger table)
- Single payer per expense
- Pusher over Socket.io (Vercel serverless constraint)
- NextAuth over custom JWT
- shadcn/ui + Tailwind + Recharts as UI stack
- Mobile-first layout strategy
