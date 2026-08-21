# System Design Write-up — Last-Mile Delivery Tracker

## Overview

This platform manages last-mile logistics for B2B and B2C shipments: configurable zone pricing, intelligent agent assignment, immutable status tracking, and customer notifications. The system is a Next.js application exposing a REST API and role-based UIs (customer, delivery agent, admin) over PostgreSQL via Prisma.

## Rate Calculation Engine

Pricing is a pure, admin-configurable engine with no commercial constants in code except the volumetric divisor (default 5000, env-overridable).

On quote or order create, the engine:

1. Resolves pickup and drop postal areas to zones.
2. Computes volumetric weight as \(L \times B \times H \div 5000\) (cm → kg).
3. Sets billable weight to the maximum of actual and volumetric weight.
4. Classifies the lane as **intra-zone** (same zone) or **inter-zone** (different zones).
5. Selects the matching **rate card** row for the order type (B2B or B2C), lane scope, and weight band.
6. Computes base charge from flat rate or rate-per-kg × billable weight.
7. Adds a **COD surcharge** from the per-order-type surcharge table when payment is COD.

The API returns a full charge breakdown before confirmation. On confirm, the breakdown is persisted on the order so later rate-card edits cannot rewrite historical charges. This mirrors carrier “quote then book” behaviour and keeps finance/audit trails correct.

## Zone Detection Approach

Zones are first-class admin entities. **Areas** (named localities with unique PIN codes) map many-to-one onto zones. Detection is a deterministic PIN lookup: normalize the PIN, find the area, read its zone. If either pickup or drop PIN is unmapped, order creation fails with a clear error so operations can fix master data rather than silently misprice.

Latitude/longitude on the order are optional and used for proximity assignment, not for pricing. This separation matches industry practice: commercial rating is stable against PIN/zone matrices, while live GPS serves dispatch.

Admins maintain zones, attach areas, and configure separate intra/inter rate cards for B2B and B2C plus COD surcharges—entirely through APIs/UI, never hardcoding.

## Auto-Assignment Logic

Agents expose availability (`AVAILABLE` / `BUSY` / `OFFLINE`) and an optional current location. Auto-assignment:

1. Loads all agents marked AVAILABLE.
2. Scores each by haversine distance from the agent’s current coordinates to the order’s pickup coordinates.
3. If coordinates are missing, falls back to preferring agents whose home zone matches the pickup zone, then least current load.
4. Assigns the best candidate, sets order status to ASSIGNED, marks the agent BUSY, and appends a tracking event noting system assignment.

Admins may instead assign a specific agent. Both paths share the same status and audit machinery so overrides remain explainable.

## Failed Delivery Handling

The status lifecycle is a constrained state machine. Agents progress orders through Picked Up → In Transit → Out for Delivery → Delivered, or mark Failed at appropriate points. Every transition writes an **immutable tracking event** (previous status, new status, actor, timestamp, note). The order’s current status is denormalized for filtering; the event log is the source of truth for the customer timeline.

On failure:

1. Status becomes FAILED; the customer is emailed (and SMS when configured).
2. The agent returns to AVAILABLE.
3. The customer chooses a new date via reschedule; the system records a **delivery attempt**, moves status to RESCHEDULED, and clears the prior assignee.
4. Admin or auto-assignment places a new agent for the retry; tracking continues without erasing prior events.

## Summary

Configurable zone rate cards, PIN-based zone detection, nearest-available dispatch, and append-only tracking with a dedicated failed-delivery reschedule path form a compact but production-shaped last-mile core suitable for demonstration and extension.
