# AYAN KHAN — Prowider Mini Lead Distribution System

Full Stack Developer Assignment — Next.js + PostgreSQL lead distribution platform.

---

## Tech Stack

- **Frontend + API**: Next.js 14 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Real-time**: Server-Sent Events (SSE)
- **Transactions**: Serializable isolation + `SELECT FOR UPDATE`

---

## Setup Instructions

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd ayan-khan
npm install
```

### 2. Configure Database

```bash
cp .env.example .env
# Edit .env and set your DATABASE_URL
```

Options for free PostgreSQL:
- [Neon](https://neon.tech) — recommended for Vercel
- [Supabase](https://supabase.com)
- [Railway](https://railway.app)

### 3. Push Schema & Generate Client

```bash
npx prisma generate
npx prisma db push
```

### 4. Seed the Database

Either via CLI:
```bash
node prisma/seed.js
```

Or via the app: go to `/test-tools` → click **Seed Database**

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
```

Set `DATABASE_URL` in Vercel environment variables.

After deployment, visit `/test-tools` and click **Seed Database**.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Home — overview and allocation rules |
| `/request-service` | Customer lead submission form |
| `/dashboard` | Live provider dashboard (SSE real-time) |
| `/test-tools` | Webhook simulation, idempotency test, concurrency test |

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/services` | List all services |
| `POST` | `/api/leads` | Create lead + auto-assign providers |
| `GET` | `/api/providers` | Dashboard data |
| `GET` | `/api/sse` | SSE stream for real-time updates |
| `POST` | `/api/webhook` | Quota reset webhook (idempotent) |
| `POST` | `/api/seed` | Seed initial data |
| `POST` | `/api/test` | Generate 10 concurrent leads |

---

## Allocation Algorithm

```
For each new lead:
1. Identify mandatory providers for the service:
   - Service 1 → Provider 1
   - Service 2 → Provider 5
   - Service 3 → Provider 1 + Provider 4

2. Assign mandatory providers (skip if over monthly quota)

3. Fill remaining slots (to total = 3) from pool using round-robin:
   - Pool pointers stored in AllocationState table
   - Pointer advanced atomically with SELECT ... FOR UPDATE
   - Providers over quota are skipped in the rotation
   - Pointer persists across server restarts
```

---

## Concurrency Handling

- All lead creation runs in a `SERIALIZABLE` Prisma transaction
- `AllocationState` rows are locked with `SELECT ... FOR UPDATE` before reading/updating the round-robin pointer
- This prevents two concurrent requests from advancing the pointer simultaneously or assigning the same provider slot twice
- PostgreSQL unique constraint on `(phone, serviceId)` prevents duplicate leads at DB level
- PostgreSQL unique constraint on `(leadId, providerId)` prevents duplicate assignments

---

## Webhook Idempotency

1. Each webhook call must include a unique `eventId` string
2. On receipt, the system attempts to insert a `WebhookEvent` record with that ID
3. If the ID already exists → returns `{ idempotent: true }`, no quota reset
4. If the ID is new → processes quota reset and records the event atomically in one transaction
5. Concurrent duplicate calls are handled by catching Prisma's `P2002` (unique constraint violation)

---

## Real-Time Dashboard

- Dashboard connects to `/api/sse` (Server-Sent Events)
- When a new lead is created, the POST `/api/leads` handler calls `broadcast({ type: 'NEW_LEAD' })`
- All connected SSE clients receive the event and re-fetch `/api/providers`
- No page refresh needed — dashboard updates within ~1 second
- SSE auto-reconnects on disconnect

---

## What We Tested & Verified

- ✅ Duplicate lead prevention (same phone + service)
- ✅ Exactly 3 providers per lead
- ✅ Mandatory provider rules per service
- ✅ Round-robin fair distribution persisted in DB
- ✅ Monthly quota respected (providers over 10 skipped)
- ✅ Concurrent lead creation via `Promise.all(10 leads)`
- ✅ Webhook idempotency (same eventId called 3× = 1 reset)
- ✅ Real-time SSE dashboard update
- ✅ Allocation state survives server restart (DB-persisted)
