# Last-Mile Delivery Tracker

Multi-role logistics platform: configurable zone rate engine, nearest-agent auto-assignment, immutable tracking history, and email/SMS notifications.

**Design docs:** [docs/HLD.md](docs/HLD.md) · [docs/LLD.md](docs/LLD.md) · [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) · [docs/API.md](docs/API.md)

## Stack

- **Frontend + API:** Next.js 14 (App Router) + TypeScript + Tailwind
- **DB:** SQLite via Prisma (swap to PostgreSQL for production — see below)
- **Auth:** JWT (jose) + bcrypt, roles `CUSTOMER` | `AGENT` | `ADMIN`

## Quick start

```bash
cp .env.example .env
npm install
npx prisma db push
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Demo accounts (password `password123`)

| Role | Email |
|------|-------|
| Admin | `admin@lastmile.local` |
| Customer | `customer@lastmile.local` |
| Agent (North) | `agent1@lastmile.local` |
| Agent (South) | `agent2@lastmile.local` |

Seeded PINs: `110009`, `110054` (North), `110017`, `110016` (South), `122002`, `122010` (Gurgaon).

## Rate calculation logic

1. Resolve pickup/drop **PIN → Area → Zone** (admin-managed; no hardcoded zones).
2. `volumetricWeight = (L × B × H) / VOLUMETRIC_DIVISOR` (default **5000**).
3. `billableWeight = max(actualWeight, volumetricWeight)`.
4. `scope = INTRA` if same zone, else `INTER`.
5. Look up **RateCard** for `(orderType B2B|B2C, scope, weight band)`.
6. `baseCharge = flatRate ?? ratePerKg × billableWeight`.
7. If `COD`, add **CodSurcharge** for that order type.
8. Show quote; on confirm, persist **chargeBreakdown** JSON snapshot on the order.

## Auto-assignment

Among agents with `agentStatus = AVAILABLE`, score by **haversine** distance from agent location to pickup lat/lng. Fallback: prefer matching `homeZoneId`, then generic. Marks agent `BUSY`, order `ASSIGNED`, appends tracking event.

## Order lifecycle

`CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED | FAILED`  
`FAILED → RESCHEDULED → ASSIGNED → …`

Each change appends an immutable **TrackingEvent** (from, to, actor, timestamp, note). Admin can override any status (still logged).

Failed flow: notify customer → reschedule date → new **DeliveryAttempt** → reassign agent.

## API overview

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Customer register |
| POST | `/api/auth/login` | — | Login → JWT |
| GET | `/api/auth/me` | any | Current user |
| POST | `/api/orders/quote` | any | Price quote |
| POST | `/api/orders` | customer/admin | Confirm order |
| GET | `/api/orders` | role-scoped | List (+ admin filters) |
| GET | `/api/orders/:id` | role-scoped | Detail + timeline |
| POST | `/api/orders/:id/reschedule` | customer | After FAILED |
| POST | `/api/admin/orders/:id/assign` | admin | `{ auto:true }` or `{ agentId }` |
| PATCH | `/api/admin/orders/:id/status` | admin | Override status |
| CRUD | `/api/admin/zones`, `/areas`, `/rate-cards`, `/cod-surcharges` | admin | Config |
| GET | `/api/admin/users` | admin | Agents + customers |
| GET | `/api/agent/orders` | agent | Assigned |
| PATCH | `/api/agent/orders/:id/status` | agent | Lifecycle update |
| PATCH | `/api/agent/location` | agent | Lat/lng + availability |
| GET | `/api/health` | — | Health check |

Send `Authorization: Bearer <token>` on protected routes.

## Database schema

See `prisma/schema.prisma` and LLD §2. Core models: `User`, `Zone`, `Area`, `RateCard`, `CodSurcharge`, `Order`, `DeliveryAttempt`, `TrackingEvent`, `NotificationLog`.

```bash
npx prisma studio   # optional GUI
```

## PostgreSQL (production)

1. Set `DATABASE_URL` to your Postgres URL (Neon / Railway / Render).
2. In `prisma/schema.prisma`, set `provider = "postgresql"`.
3. `npx prisma db push && npm run seed`.

## Deploy

- **Railway / Render:** Deploy this repo as a Node web service, set env vars, build `npm run build`, start `npm run start`, run migrate/seed in release command.
- **Vercel:** Use Postgres (Neon); set env vars; build includes `prisma generate` (see `package.json` `postinstall`).

Hosted URL: add here after deploy.

## Notifications

Without SMTP/SMS env vars, messages are **STUBBED** to server logs and stored in `NotificationLog`. Configure SMTP (e.g. Brevo free tier) and optional SMS webhook for live sends.

## Scripts

```bash
npm run dev          # development
npm run build        # production build
npm run start        # start production server
npm run seed         # reset demo data
npm run db:push      # sync schema
```

## Project layout

```
docs/           HLD, LLD, system design
prisma/         schema + seed
src/app/        UI pages + /api routes
src/lib/        auth, services (pricing, zones, assignment, orders, tracking, notifications)
```
