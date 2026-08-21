# Low-Level Design — Last-Mile Delivery Tracker

## 1. Module Map

```
src/
  app/                  # Next.js routes (UI + API)
  components/           # Shared UI
  lib/
    auth/               # JWT, password hashing, requireRole
    db.ts               # Prisma client singleton
    services/
      pricing.ts
      zones.ts
      assignment.ts
      orders.ts
      tracking.ts
      notifications.ts
    validators/         # Zod schemas
    geo.ts              # Haversine
  types/
prisma/
  schema.prisma
  seed.ts
```

## 2. Database Schema (LLD)

### 2.1 Enums

- `Role`: CUSTOMER | AGENT | ADMIN
- `OrderType`: B2B | B2C
- `PaymentType`: PREPAID | COD
- `RateScope`: INTRA | INTER
- `AgentStatus`: AVAILABLE | BUSY | OFFLINE
- `OrderStatus`: CREATED | ASSIGNED | PICKED_UP | IN_TRANSIT | OUT_FOR_DELIVERY | DELIVERED | FAILED | RESCHEDULED

### 2.2 Entities

**User**
- id, email (unique), passwordHash, name, phone, role
- Agent fields: agentStatus, currentLat, currentLng, homeZoneId?

**Zone**
- id, name, code (unique)

**Area**
- id, zoneId, name, pinCode (unique index), city
- Used for zone detection: match pickup/drop pin → area → zone

**RateCard**
- id, orderType (B2B|B2C), scope (INTRA|INTER),
- minWeightKg, maxWeightKg (nullable = open-ended),
- ratePerKg, flatRate (nullable; if set, used instead of per-kg for band)
- Unique-ish lookup by (orderType, scope, weight band)

**CodSurcharge**
- id, orderType, surchargeAmount (decimal)

**Order**
- id, orderNumber (unique), customerId, createdById
- pickup*: address, pin, lat?, lng?, zoneId
- drop*: address, pin, lat?, lng?, zoneId
- lengthCm, breadthCm, heightCm, actualWeightKg
- volumetricWeightKg, billableWeightKg
- orderType, paymentType
- baseCharge, codSurcharge, totalCharge
- chargeBreakdown (JSON) — frozen quote audit
- status, agentId?, scheduledDate?
- timestamps

**DeliveryAttempt**
- id, orderId, attemptNo, scheduledDate, agentId?, outcome?, notes

**TrackingEvent**
- id, orderId, fromStatus?, toStatus, actorId, actorRole, note?, createdAt
- Append-only; no updates/deletes in app layer

**NotificationLog**
- id, orderId, channel (EMAIL|SMS), recipient, subject?, body, status, createdAt

## 3. Pricing Engine (exact algorithm)

```
volumetricWeight = (L * B * H) / VOLUMETRIC_DIVISOR   # divisor from env, default 5000
billableWeight   = max(actualWeight, volumetricWeight)

pickupZone = resolveZone(pickupPin)
dropZone   = resolveZone(dropPin)
scope      = (pickupZone.id == dropZone.id) ? INTRA : INTER

rateRow = find RateCard where
  orderType == order.orderType
  AND scope == scope
  AND billableWeight >= minWeightKg
  AND (maxWeightKg IS NULL OR billableWeight <= maxWeightKg)
order by minWeightKg desc limit 1

baseCharge = rateRow.flatRate ?? (rateRow.ratePerKg * billableWeight)

codSurcharge = paymentType == COD
  ? CodSurcharge[orderType].surchargeAmount
  : 0

totalCharge = round(baseCharge + codSurcharge, 2)
```

Charge breakdown JSON stores: zones, scope, weights, rateCardId, rates applied, COD.

## 4. Zone Detection

1. Normalize PIN (trim).
2. `Area.findUnique({ where: { pinCode } })` → zone.
3. If missing → 400 `ZONE_NOT_FOUND` (admin must map area).
4. Optional lat/lng stored on order for assignment only (geocode stub or client-provided).

## 5. Auto-Assignment

```
candidates = Agent where role=AGENT AND agentStatus=AVAILABLE
if empty → error NO_AVAILABLE_AGENT

score(agent) = haversine(agent.lat/lng, pickup.lat/lng)
  fallback if no coords: prefer agent.homeZoneId == pickupZoneId, else 0

assign = min(score)
order.agentId = assign.id
order.status = ASSIGNED
agent.agentStatus = BUSY
append TrackingEvent
```

Manual assign: admin supplies agentId; same status transitions + busy flag.

## 6. Status State Machine

Legal transitions:

| From | To |
|------|-----|
| CREATED | ASSIGNED |
| ASSIGNED | PICKED_UP, FAILED (rare cancel-style fail) |
| PICKED_UP | IN_TRANSIT, FAILED |
| IN_TRANSIT | OUT_FOR_DELIVERY, FAILED |
| OUT_FOR_DELIVERY | DELIVERED, FAILED |
| FAILED | RESCHEDULED |
| RESCHEDULED | ASSIGNED |
| * | (Admin override may force any status; still logs event with note `ADMIN_OVERRIDE`) |

On DELIVERED → agent → AVAILABLE.  
On FAILED → notify customer; agent → AVAILABLE (eligible for reassignment).  
On RESCHEDULED → clear agentId until reassigned; create DeliveryAttempt.

## 7. API Contracts (REST)

### Auth
- `POST /api/auth/register` `{ name, email, password, phone, role? }` role default CUSTOMER; AGENT/ADMIN seed-only or admin-gated
- `POST /api/auth/login` → `{ token, user }`
- `GET /api/auth/me`

### Admin config
- `CRUD /api/admin/zones`
- `CRUD /api/admin/areas`
- `CRUD /api/admin/rate-cards`
- `CRUD /api/admin/cod-surcharges`
- `GET /api/admin/orders?status&zoneId&agentId`
- `PATCH /api/admin/orders/:id/status` override
- `POST /api/admin/orders/:id/assign` `{ agentId }` | `{ auto: true }`

### Orders
- `POST /api/orders/quote` → quote
- `POST /api/orders` confirm (customer or admin with customerId)
- `GET /api/orders` (role-scoped)
- `GET /api/orders/:id`
- `POST /api/orders/:id/reschedule` `{ scheduledDate }` (customer, status FAILED)

### Agent
- `GET /api/agent/orders`
- `PATCH /api/agent/orders/:id/status` `{ status, note? }`
- `PATCH /api/agent/location` `{ lat, lng, agentStatus? }`

## 8. Auth & RBAC

- Password: bcrypt
- Token: JWT HS256, payload `{ sub, role, email }`, expiry 7d
- `requireAuth` / `requireRole(...roles)` wrappers on handlers

## 9. Notifications

On every TrackingEvent insert → `NotificationService.notifyStatusChange`:
1. Load customer email/phone
2. Send email (Resend or SMTP); on missing keys, log as `STUBBED`
3. Optionally SMS; same stub pattern
4. Persist NotificationLog

## 10. Class / Function Responsibilities

| Symbol | Methods |
|--------|---------|
| `PricingService.calculate(input)` | Pure; returns QuoteResult |
| `ZoneService.resolvePin(pin)` | Area→Zone |
| `AssignmentService.autoAssign(orderId)` / `manualAssign(orderId, agentId)` | |
| `TrackingService.transition(orderId, to, actor, opts)` | Validates FSM, writes event, side-effects |
| `OrderService.quote` / `create` / `reschedule` | Orchestration |
| `NotificationService.send` | Channel dispatch + log |

## 11. UI Screens (LLD)

- `/login`, `/register`
- `/customer` — place order (quote preview), my orders, tracking, reschedule
- `/agent` — assigned list, status updater, location/availability
- `/admin` — zones, areas, rate cards, COD, orders board, assign/override

## 12. Seed Data

Demo admin, customer, 2 agents; 2 zones; areas with PINs; B2B/B2C intra/inter weight bands; COD surcharges — enough to run full happy path without manual config.
