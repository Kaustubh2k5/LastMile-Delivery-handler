# High-Level Design — Last-Mile Delivery Tracker

## 1. Purpose

A multi-role delivery management platform that quotes shipping charges from admin-configurable rate cards, assigns delivery agents (manual or nearest-available), tracks immutable order status history, and notifies customers on every lifecycle event.

## 2. Actors & Roles

| Role | Responsibilities |
|------|------------------|
| **Customer** | Register/login, place orders (quote → confirm), view tracking, reschedule failed deliveries |
| **Delivery Agent** | View assigned orders, update status along the delivery lifecycle |
| **Admin** | Manage zones/areas/rate cards/COD surcharges, create orders on behalf of customers, assign agents, filter/override orders |

## 3. System Context

```
┌─────────────┐     HTTPS/JSON      ┌──────────────────────────────┐
│  Web Client │ ◄─────────────────► │  Next.js App (UI + REST API) │
│ (Browsers)  │                     │  Role-gated pages + /api/*   │
└─────────────┘                     └──────────────┬───────────────┘
                                                   │
                    ┌──────────────────────────────┼────────────────┐
                    ▼                              ▼                ▼
             ┌────────────┐              ┌─────────────────┐  ┌────────────┐
             │ PostgreSQL │              │ Notification    │  │ File/logs  │
             │ (Prisma)   │              │ Email (+ SMS)   │  │ (dev stub) │
             └────────────┘              └─────────────────┘  └────────────┘
```

## 4. Logical Architecture

Layers (top → bottom):

1. **Presentation** — Next.js App Router pages for Customer / Agent / Admin dashboards.
2. **API** — REST handlers under `/api/*` with JWT auth + RBAC middleware.
3. **Domain services** — Pricing, Zone detection, Assignment, Order lifecycle, Notifications.
4. **Persistence** — Prisma repositories against PostgreSQL.
5. **Integrations** — Email (Resend/SMTP) and SMS (optional free-tier provider).

## 5. Core Flows

### 5.1 Quote & Order Creation

1. Client submits pickup/drop, dimensions, weight, order type, payment type.
2. **ZoneDetection** maps pickup/drop areas (PIN/area code) → zones.
3. **PricingEngine** computes volumetric weight, billable weight, looks up intra/inter rate card for B2B|B2C, adds COD surcharge.
4. Returns a **Quote** (charge breakdown). Client confirms → **Order** persisted with frozen charge snapshot.

### 5.2 Agent Assignment

- **Manual**: Admin picks agent for an order in assignable state.
- **Auto**: Among agents with `AVAILABLE` status, select nearest by haversine distance to pickup coordinates (fallback: same zone / least load).

### 5.3 Status Lifecycle

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → DELIVERED
                                                      └──────────► FAILED
FAILED → (customer reschedule) → RESCHEDULED → ASSIGNED → …
```

Every transition appends an immutable **TrackingEvent** (`from`, `to`, `actor`, `timestamp`, `note`).

### 5.4 Failed Delivery

1. Agent sets `FAILED` → event logged → customer notified.
2. Customer submits new preferred date → `DeliveryAttempt` + status `RESCHEDULED`.
3. System/admin reassigns agent for the new attempt.

## 6. Key Components

| Component | Responsibility |
|-----------|----------------|
| `AuthService` | Register, login, JWT issue/verify, role checks |
| `ZoneService` | CRUD zones/areas; resolve address → zone |
| `RateCardService` | Admin-configurable intra/inter rates per order type |
| `PricingService` | Pure calculation; no hardcoded commercial rates |
| `OrderService` | Quote, confirm, list/filter, admin override |
| `AssignmentService` | Manual + nearest-available auto-assign |
| `TrackingService` | Append-only history; enforce legal transitions |
| `NotificationService` | Email/SMS on status changes |

## 7. Data Store (Logical)

- **Identity**: User (role, credentials, optional agent location/availability)
- **Geo/pricing config**: Zone, Area, RateCard, CodSurcharge
- **Commerce**: Order (charge breakdown JSON), DeliveryAttempt
- **Audit**: TrackingEvent (immutable)
- **Ops**: NotificationLog

## 8. Deployment Topology

| Piece | Target |
|-------|--------|
| App (UI + API) | Vercel / Railway / Render |
| PostgreSQL | Neon / Railway / Render managed DB |
| Secrets | Host env (`DATABASE_URL`, `JWT_SECRET`, mail/SMS keys) |
| Local | `docker-compose` Postgres + `npm run dev` |

## 9. Non-Functional

- **Correctness**: Pricing is deterministic from stored rate cards; quote snapshot frozen on confirm.
- **Auditability**: Status never mutates without a tracking event.
- **Security**: JWT + RBAC; agents only update their assigned orders.
- **Observability**: Notification logs; order filters by status/zone/agent.

## 10. Out of Scope (intentional)

Real-time WebSocket maps, payment gateway settlement, multi-warehouse inventory, ML-based dispatch.
