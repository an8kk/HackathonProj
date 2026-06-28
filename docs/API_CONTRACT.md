# Bahandi/Qamqor Backend API Contract

Base URL: `VITE_API_BASE_URL` / mobile `API_BASE_URL` (default `http://localhost:4000`).

All successful responses are wrapped: `{ "success": true, "data": <payload> }`.
Errors are `{ "success": false, "error": "<code>" }` with an HTTP status (400/401/404/409).

## Auth & authorization
- `POST /auth/login` body `{ "pin": "1111" }` → `data`: `{ id, name, role, active, outlet: {id,name,address,iiko_store_id}, outlet_id, token }`
  - Roles: `sender`, `reviewer`, `owner`. Seeded PINs: `1111` sender, `2222` reviewer, `9999` owner, `3333` sender (Dostyk).
  - `token` is a JWT (HS256). **All routes except `POST /auth/login`, `GET /health`, and `GET /media/...` require `Authorization: Bearer <token>`.** Missing/invalid → 401.
  - Role enforcement: `/admin/*` and `POST /admin/qr-tokens` → `owner`; `PATCH /write-offs/{id}/review` → `reviewer|owner`; `POST /write-offs` and `POST /photos` → `sender|reviewer|owner`; all other reads → any authenticated user. Wrong role → 403.

## Reference data
- `GET /outlets` → `[{id,name,address,iiko_store_id}]`
- `GET /employees?outlet_id=` → `[{id,name,role,active,outlet,outlet_id}]`
- `GET /products` → `[{id,name,unit,cost_per_unit,iiko_product_id}]` (unit ∈ `штуки|граммы|кг`)
- `GET /norms?outlet_id=&product_id=` → `[{id,product_id,outlet_id,max_waste_pct,effective_from,effective_to}]`
- Admin: `POST /admin/outlets`, `POST /admin/employees`, `POST /admin/products`, `POST /admin/norms` (201)

## Photos
- `POST /photos?outlet_id=` body `{ filename, content_base64, content_type, taken_at? (ISO) }` → 201
  - `data`: `{ id, filename, storage_key, content_type, sha256_hash, perceptual_hash, taken_at, uploaded_at, metadata_status, validation_errors[], ai_analysis }`
  - `metadata_status` ∈ `valid|warning|invalid`. Errors include `taken_at_is_in_future`, `missing_taken_at`, `duplicate_photo_hash`, `unsupported_content_type`.
- `POST /photo-analysis/analyze` body `{ image_base64, media_type }` → `data` AI analysis.
- `GET /photos/{id}` → full photo `data` (incl. `ai_analysis`, `metadata_status`, `validation_errors`) for reviewer evidence.
- `GET /media/{storage_key}` → raw image bytes (public; local backend only — S3 backend exposes object URLs). Use for `<img>` previews.

## Write-offs
- `POST /write-offs` (201) body:
  `{ outlet_id, employee_id, product_id, photo_id?, quantity>0, unit, reason_code, deduction_type, charged_employee_id?, comment(>=10 chars) }`
  - `reason_code` ∈ `DAMAGED|EXPIRED|OVERCOOKED|RAW_WASTE|DROPPED|OTHER`
  - `deduction_type` ∈ `NO_DEDUCTION|WITH_DEDUCTION` (WITH_DEDUCTION requires `charged_employee_id`)
- `GET /write-offs?status=&employee_id=` → list, newest first
- `GET /write-offs/{id}` → one
- `PATCH /write-offs/{id}/review` body `{ reviewer_id, decision: "approved"|"rejected", rejection_reason? }`
  - On approve: creates a negative `WRITE_OFF` inventory movement and attempts iiko sync.
  - `data.status` ∈ `pending|approved|rejected`; `data.iiko_sync`: `{ status, external_id, error }`
    where status ∈ `synced|failed|not_configured|capability_missing|pending`.

## Inventory
- `GET /inventory/movements` → `[{id,outlet_id,product_id,movement_type,quantity,source_request_id,external_source,created_at}]`
- `GET /inventory/balances` → `[{outlet_id,outlet_name,product_id,product_name,balance}]`
- `POST /inventory/supplies` (201) `{ outlet_id, product_id, quantity }`
- `POST /inventory/counts` (201) `{ outlet_id, counted_by_id?, lines:[{product_id,counted_quantity}] }` → `{count_id, adjustments[]}`
- `GET /inventory/reconciliation?outlet_id=` → `[{outlet_id,product_id,product_name,theoretical_balance,actual_balance,write_off_total,unexplained_variance}]`

## Analytics & KPI
- `GET /analytics/summary` → `{total_requests,pending,approved,rejected,approved_cost_value}`
- `GET /analytics/employees` → leaderboard `[{employee_id,employee_name,outlet_name,total_requests,approved,rejected,with_deduction,times_charged}]`
- `GET /analytics/products` → `[{product_id,product_name,write_off_count,quantity,cost_value}]`
- `GET /analytics/hourly` → `[{hour,count}]` (24 rows)
- `GET /analytics/investigations` → `[{employee_id,employee_name,product_id,product_name,reason_code,occurrences,severity}]`
- `GET /kpi/outlets` → `[{outlet_id,outlet_name,score,photo_validity_score,approval_score,variance_score,total_requests,bonus_eligible}]`

## QR
- `POST /admin/qr-tokens` (201) `{ entity_type: outlet|product|shift|write_off_request, entity_id, ttl_seconds? }` → `{token,url,...}`
- `GET /qr/{token}` → `{entity_type, entity_id}`

## Integrations (iiko)
- `GET /integrations/iiko/status` → `{ provider:"iiko Server API", purpose, configured, base_url, write_off_act_endpoint:"/resto/api/documents/import/writeoffDocument", write_off_act_endpoint_available, note }`
- iiko's only role is write-off acts: on approval the backend creates the act via the iiko Server `writeoffDocument` import, which transfers the data to iiko and deducts iiko inventory. A local `WRITE_OFF` inventory movement is recorded in parallel.

## Audit
- `GET /audit/events` → recent audit events.
