# API Reference

Base URL: `/api`  
Auth: `Authorization: Bearer <jwt>` unless noted.

## Auth

### POST `/auth/register`
Body: `{ name, email, password, phone? }`  
Creates a **CUSTOMER**. Returns `{ token, user }`.

### POST `/auth/login`
Body: `{ email, password }` → `{ token, user }`

### GET `/auth/me`
Returns current user profile.

## Orders

### POST `/orders/quote`
Body (shared with create):
```json
{
  "pickupAddress": "…", "pickupPin": "110009",
  "pickupLat": 28.72, "pickupLng": 77.19,
  "dropAddress": "…", "dropPin": "110017",
  "dropLat": 28.52, "dropLng": 77.20,
  "lengthCm": 30, "breadthCm": 20, "heightCm": 15,
  "actualWeightKg": 2.5,
  "orderType": "B2C",
  "paymentType": "COD"
}
```
Response: `{ quote }` with zones, weights, breakdown, `totalCharge`.

### POST `/orders`
Same body. Admin must include `customerId`. Persists order with frozen `chargeBreakdown`.

### GET `/orders`
Role-scoped list. Admin query params: `status`, `zoneId`, `agentId`.

### GET `/orders/:id`
Detail + tracking timeline + attempts + recent notifications.

### POST `/orders/:id/reschedule`
Body: `{ scheduledDate: ISO-8601, notes? }` — only when status is `FAILED`.

## Admin

### POST `/admin/orders/:id/assign`
`{ "auto": true }` or `{ "agentId": "…" }`

### PATCH `/admin/orders/:id/status`
`{ "status": "…", "note": "…", "override": true }`

### Zones / Areas / Rate cards / COD
- `GET|POST /admin/zones` · `DELETE /admin/zones/:id`
- `GET|POST /admin/areas` · `DELETE /admin/areas/:id`
- `GET|POST /admin/rate-cards` · `PATCH|DELETE /admin/rate-cards/:id`
- `GET|POST /admin/cod-surcharges` (upsert by orderType)
- `GET /admin/users` → agents + customers

## Agent

### GET `/agent/orders`
### PATCH `/agent/orders/:id/status` — `{ status, note?, failureReason? }`
### PATCH `/agent/location` — `{ lat, lng, agentStatus? }`

## Health

### GET `/health` — `{ status: "ok" }`
