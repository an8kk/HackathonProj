# Full Product Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete Bahandi/Qamqor write-off automation product across Litestar backend, React admin/reviewer web, Flutter mobile sender app, inventory reconciliation, photo/AI validation, analytics/KPI, QR support, and iiko integration.

**Architecture:** Litestar is the source of truth. PostgreSQL stores all operational state, object storage stores photos, Redis/RQ-style workers handle slow AI/iiko sync work, and web/mobile clients consume a stable JSON API. iikoWeb is integrated for auth/session, stores, menu/reference data, OLAP/reports, transactions, and KPI; write-off act creation must use a confirmed private iiko endpoint or a small iikoFront/local bridge because the provided Postman collection does not document warehouse write-off act creation.

**Tech Stack:** Python 3.12, Litestar, SQLAlchemy 2, Alembic, PostgreSQL, Redis, httpx, Pillow, imagehash, Anthropic SDK, React/Vite/TypeScript, Flutter/Dart, Docker Compose, pytest, Vitest, Flutter test.

---

## Current State

- Backend branch: `feat/litestar-iiko-backend` has a Litestar in-memory backend foundation.
- Backend is not complete because persistence, real auth, background jobs, real AI adapter, and full iiko write-off sync are missing.
- Frontend builds but is mostly static Qamqor demo UI.
- Mobile has useful Flutter screens and local stores, but is not wired to backend.
- The linked iikoWeb Postman collection exposes stores, external menus, OLAP, guest checks, KPI. It does not expose a warehouse write-off act creation endpoint.

## Non-Negotiable Product Requirements

- Sender can create write-off requests from mobile and web.
- Photo is saved, hashed, metadata-validated, and AI-analyzed.
- Reviewer can approve/reject with audit trail.
- Approved write-off reduces internal inventory and attempts iiko sync.
- Inventory combines opening balances, supplies/orders, sales consumption, manual counts, and approved write-offs.
- Norms define acceptable waste by outlet/product/effective date.
- Analytics show employee/time/product/outlet patterns.
- KPI rewards transparent reporting plus low unexplained loss, not hiding waste.
- QR codes support outlet/product/shift/request flows.
- Admin panel manages users, outlets, products, norms, inventory, integrations, and audit.
- Everything boots through Docker Compose.

## Target File Structure

### Backend

- Create: `backend/src/bahandi_backend/db/base.py` — SQLAlchemy base and metadata.
- Create: `backend/src/bahandi_backend/db/session.py` — async engine/session factory.
- Create: `backend/src/bahandi_backend/db/models.py` — ORM tables.
- Create: `backend/src/bahandi_backend/db/migrations/env.py` — Alembic env.
- Create: `backend/src/bahandi_backend/db/migrations/versions/0001_initial_schema.py` — initial schema.
- Create: `backend/src/bahandi_backend/auth/` — login, JWT/session, role guards.
- Create: `backend/src/bahandi_backend/users/` — employees/users/outlets.
- Create: `backend/src/bahandi_backend/products/` — products, units, iiko mapping, QR token.
- Create: `backend/src/bahandi_backend/photos/` — photo storage, EXIF, hashes, AI job dispatch.
- Create: `backend/src/bahandi_backend/write_offs/` — create/review/audit workflow.
- Create: `backend/src/bahandi_backend/inventory/` — movements, balances, counts, reconciliation.
- Create: `backend/src/bahandi_backend/norms/` — waste norms and effective dating.
- Create: `backend/src/bahandi_backend/analytics/` — employee/outlet/product/time statistics.
- Create: `backend/src/bahandi_backend/kpi/` — KPI score computation.
- Create: `backend/src/bahandi_backend/qr/` — signed QR token generation/resolution.
- Create: `backend/src/bahandi_backend/integrations/iiko/` — iikoWeb client, sync jobs, bridge client.
- Create: `backend/src/bahandi_backend/workers/` — background job runner.
- Modify: `backend/src/bahandi_backend/app.py` — route registration only; remove fat logic.
- Modify: `backend/pyproject.toml` — add SQLAlchemy, Alembic, asyncpg, redis, PyJWT, imagehash, Anthropic.
- Modify: `backend/Dockerfile` — run migrations before app in container entrypoint.
- Create: `backend/tests/` — API, domain, integration-adapter tests.

### Frontend

- Modify: `frontend/src/shared/api/http-client.ts` — authenticated fetch client.
- Create: `frontend/src/shared/api/generated.ts` or `contract.ts` — API DTO types.
- Create: `frontend/src/shared/auth/` — session store and route guards.
- Modify: `frontend/src/pages/qamqor-landing/index.tsx` — login/role entry wired to backend.
- Modify: `frontend/src/pages/qamqor-employee/index.tsx` — web sender flow.
- Modify: `frontend/src/pages/qamqor-manager/index.tsx` and `frontend/src/pages/reviewer/index.tsx` — review queue.
- Modify: `frontend/src/pages/qamqor-dashboard/index.tsx` — real analytics data source.
- Create: `frontend/src/pages/admin/` — admin CRUD for users/outlets/products/norms/inventory/iiko.
- Modify: `frontend/src/shared/qamqor-data/datasource.ts` — switch from mock to API-backed datasource with mock fallback only in tests.
- Add tests under `frontend/test/` for login, review queue, admin norms, dashboard data loading.

### Mobile

- Create: `mobile/lib/api/api_client.dart` — backend HTTP client.
- Create: `mobile/lib/api/dto.dart` — typed request/response DTOs.
- Modify: `mobile/lib/store/auth_store.dart` — replace mock login with `/auth/login`.
- Modify: `mobile/lib/store/write_off_store.dart` — replace local-only store with backend sync queue.
- Modify: `mobile/lib/screens/new_writeoff_screen.dart` — submit real request.
- Modify: `mobile/lib/screens/camera_screen.dart` — upload photo to `/photos`.
- Modify: `mobile/lib/screens/history_screen.dart` — load `/write-offs?employee_id=...`.
- Modify: `mobile/lib/screens/dashboard_screen.dart` — use backend products/outlet/status.
- Create: `mobile/lib/screens/qr_scan_screen.dart` — scan outlet/product/shift/request QR.
- Add widget/unit tests under `mobile/test/`.

### Infra

- Modify: `docker-compose.yml` — add Redis and object storage if not using local volume.
- Create: `backend/entrypoint.sh` — run migrations, start Litestar.
- Create: `backend/.env.example` or root `.env.example` additions.
- Create: `.github/workflows/ci.yml` if CI is required.

---

## Chunk 1: Backend Database and Persistence

### Task 1: Add backend persistence dependencies

**Files:**
- Modify: `backend/pyproject.toml`
- Create: `backend/src/bahandi_backend/db/base.py`
- Create: `backend/src/bahandi_backend/db/session.py`
- Test: `backend/tests/test_db_session.py`

- [ ] **Step 1: Write failing test**

```python
from bahandi_backend.db.session import create_session_factory


def test_session_factory_builds_async_sessionmaker() -> None:
    factory = create_session_factory('sqlite+aiosqlite:///:memory:')
    assert factory.kw['expire_on_commit'] is False
```

- [ ] **Step 2: Run red test**

Run:
```bash
docker run --rm -v "C:/Users/Anek/HackathonProj/backend:/app" -w /app python:3.12-slim sh -c "pip install -e .[test] >/tmp/pip.log && pytest tests/test_db_session.py -q"
```
Expected: FAIL because `bahandi_backend.db.session` does not exist.

- [ ] **Step 3: Implement dependencies**

Add to `backend/pyproject.toml`:
```toml
"sqlalchemy[asyncio]>=2.0,<3",
"asyncpg>=0.30,<1",
"aiosqlite>=0.20,<1",
"alembic>=1.14,<2",
```

Create `backend/src/bahandi_backend/db/base.py`:
```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

Create `backend/src/bahandi_backend/db/session.py`:
```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine


def create_session_factory(database_url: str) -> async_sessionmaker[AsyncSession]:
    engine = create_async_engine(database_url, pool_pre_ping=True)
    return async_sessionmaker(engine, expire_on_commit=False)
```

- [ ] **Step 4: Run green test**

Run same test. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/src/bahandi_backend/db backend/tests/test_db_session.py
git commit -m "feat(backend): Add async database session foundation"
```

### Task 2: Create initial schema migration

**Files:**
- Create: `backend/src/bahandi_backend/db/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/src/bahandi_backend/db/migrations/env.py`
- Create: `backend/src/bahandi_backend/db/migrations/versions/0001_initial_schema.py`
- Test: `backend/tests/test_schema.py`

- [ ] **Step 1: Write failing schema test**

Test that metadata contains required tables:
```python
from bahandi_backend.db.base import Base
import bahandi_backend.db.models  # noqa: F401


def test_initial_schema_contains_core_tables() -> None:
    expected = {
        'outlets', 'employees', 'users', 'products', 'waste_norms', 'photos',
        'write_off_requests', 'inventory_movements', 'inventory_counts',
        'qr_tokens', 'audit_events', 'iiko_sync_jobs', 'iiko_mappings'
    }
    assert expected.issubset(set(Base.metadata.tables))
```

- [ ] **Step 2: Run red test**

Expected: FAIL missing tables.

- [ ] **Step 3: Implement ORM models**

Required tables and key fields:
- `outlets`: id, name, address, iiko_store_id, created_at.
- `employees`: id, outlet_id, name, role, pin_hash, active.
- `users`: id, employee_id, login, password_hash, role.
- `products`: id, name, unit, cost_per_unit, iiko_product_id, qr_token_id.
- `waste_norms`: id, outlet_id nullable, product_id, max_waste_pct, effective_from, effective_to.
- `photos`: id, storage_key, content_type, sha256_hash, perceptual_hash, exif_taken_at, uploaded_at, metadata_status, validation_errors_json, ai_analysis_json.
- `write_off_requests`: id, outlet_id, employee_id, product_id, photo_id, quantity, unit, reason_code, deduction_type, charged_employee_id nullable, comment, status, reviewer_id, reviewed_at, rejection_reason, iiko_sync_status.
- `inventory_movements`: id, outlet_id, product_id, movement_type, quantity, source_request_id nullable, external_source, created_at.
- `inventory_counts`: id, outlet_id, counted_by_id, counted_at, status.
- `inventory_count_lines`: id, count_id, product_id, counted_quantity.
- `qr_tokens`: id, token, entity_type, entity_id, expires_at nullable.
- `audit_events`: id, actor_id, entity_type, entity_id, action, payload_json, created_at.
- `iiko_mappings`: id, local_entity_type, local_entity_id, iiko_entity_type, iiko_entity_id.
- `iiko_sync_jobs`: id, entity_type, entity_id, operation, status, attempts, last_error, external_id, created_at, updated_at.

- [ ] **Step 4: Add Alembic migration**

Migration must create all tables, foreign keys, indexes for status/date/employee/product/outlet.

- [ ] **Step 5: Run green test and migration smoke**

Run:
```bash
docker run --rm -v "C:/Users/Anek/HackathonProj/backend:/app" -w /app python:3.12-slim sh -c "pip install -e .[test] >/tmp/pip.log && pytest tests/test_schema.py -q"
```
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/alembic.ini backend/src/bahandi_backend/db backend/tests/test_schema.py
git commit -m "feat(backend): Add write-off domain schema"
```

## Chunk 2: Backend Auth, Reference Data, and Admin CRUD

### Task 3: Replace in-memory auth with database-backed login

**Files:**
- Create: `backend/src/bahandi_backend/auth/routes.py`
- Create: `backend/src/bahandi_backend/auth/service.py`
- Create: `backend/src/bahandi_backend/auth/security.py`
- Modify: `backend/src/bahandi_backend/app.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] Write failing test: seed employee/user, `POST /auth/login` returns token, role, outlet.
- [ ] Run red test; expected FAIL because DB-backed auth not wired.
- [ ] Implement password/PIN hash with stdlib `hashlib.pbkdf2_hmac` or `argon2-cffi`.
- [ ] Return short-lived JWT plus user profile.
- [ ] Add role guard helpers: sender, reviewer, owner/admin.
- [ ] Run green test.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/auth backend/src/bahandi_backend/app.py backend/tests/test_auth_api.py
git commit -m "feat(backend): Add database-backed authentication"
```

### Task 4: Add outlets, employees, products, norms admin APIs

**Files:**
- Create: `backend/src/bahandi_backend/admin/routes.py`
- Create: `backend/src/bahandi_backend/users/routes.py`
- Create: `backend/src/bahandi_backend/products/routes.py`
- Create: `backend/src/bahandi_backend/norms/routes.py`
- Test: `backend/tests/test_admin_reference_data.py`

- [ ] Write failing tests for:
  - `GET /outlets`
  - `GET /employees?outlet_id=...`
  - `GET /products`
  - `POST /admin/products`
  - `POST /admin/norms`
  - `GET /norms?outlet_id=...&product_id=...`
- [ ] Run red tests.
- [ ] Implement CRUD with owner/admin role guard.
- [ ] Seed Bahandi demo data in `backend/src/bahandi_backend/db/seed.py`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/{admin,users,products,norms} backend/tests/test_admin_reference_data.py
git commit -m "feat(backend): Add reference data admin APIs"
```

## Chunk 3: Photo Storage, Metadata Validation, AI

### Task 5: Persist photo uploads and metadata validation

**Files:**
- Create: `backend/src/bahandi_backend/photos/routes.py`
- Create: `backend/src/bahandi_backend/photos/service.py`
- Create: `backend/src/bahandi_backend/photos/storage.py`
- Create: `backend/src/bahandi_backend/photos/metadata.py`
- Test: `backend/tests/test_photos_api.py`

- [ ] Write failing tests:
  - valid JPEG stores photo row and file
  - duplicate SHA-256 is rejected or flagged
  - future EXIF/taken_at is invalid
  - missing EXIF is warning
- [ ] Run red tests.
- [ ] Implement local object storage adapter with `storage/photos/{outlet_id}/{YYYY-MM-DD}/{photo_id}.jpg`.
- [ ] Implement EXIF extraction using Pillow.
- [ ] Implement SHA-256 and perceptual hash using `imagehash`.
- [ ] Store validation status and errors in DB.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/photos backend/tests/test_photos_api.py
git commit -m "feat(backend): Persist and validate write-off photos"
```

### Task 6: Add Anthropic photo analysis adapter

**Files:**
- Create: `backend/src/bahandi_backend/photos/ai.py`
- Modify: `backend/src/bahandi_backend/photos/service.py`
- Create: `backend/src/bahandi_backend/workers/jobs.py`
- Test: `backend/tests/test_photo_ai.py`

- [ ] Write failing test with fake AI client returning detected product/reason/confidence.
- [ ] Run red test.
- [ ] Implement `PhotoAnalyzer` protocol with `AnthropicPhotoAnalyzer` and `RuleBasedPhotoAnalyzer` fallback.
- [ ] Prompt must return JSON fields: `is_food_waste`, `detected_product`, `confidence`, `condition`, `suggested_reason`, `fraud_warnings`, `reviewer_note`.
- [ ] Do not block request creation on AI failure; store status `failed` with error.
- [ ] Run green test.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/photos backend/src/bahandi_backend/workers backend/tests/test_photo_ai.py
git commit -m "feat(backend): Add AI photo analysis adapter"
```

## Chunk 4: Write-Off Workflow and Inventory

### Task 7: Persist write-off creation workflow

**Files:**
- Create: `backend/src/bahandi_backend/write_offs/routes.py`
- Create: `backend/src/bahandi_backend/write_offs/service.py`
- Create: `backend/src/bahandi_backend/audit/service.py`
- Test: `backend/tests/test_write_offs_api.py`

- [ ] Write failing tests:
  - sender creates request with photo/product/outlet/comment >=10 chars
  - `WITH_DEDUCTION` requires charged employee
  - invalid photo metadata can still submit but reviewer sees warning unless hard duplicate
  - audit event is written on create
- [ ] Run red tests.
- [ ] Implement DB-backed create/list/detail.
- [ ] Add request statuses: `pending`, `approved`, `rejected`, `iiko_sync_failed`, `iiko_synced`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/write_offs backend/src/bahandi_backend/audit backend/tests/test_write_offs_api.py
git commit -m "feat(backend): Persist write-off requests"
```

### Task 8: Implement review workflow and inventory movements

**Files:**
- Modify: `backend/src/bahandi_backend/write_offs/service.py`
- Create: `backend/src/bahandi_backend/inventory/service.py`
- Create: `backend/src/bahandi_backend/inventory/routes.py`
- Test: `backend/tests/test_review_inventory.py`

- [ ] Write failing tests:
  - approve request creates negative `WRITE_OFF` movement
  - reject request does not create movement
  - reviewing twice returns 409
  - movement updates balance
- [ ] Run red tests.
- [ ] Implement atomic transaction: status update + audit + movement + iiko sync job enqueue.
- [ ] Implement `GET /inventory/movements`, `GET /inventory/balances`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/{write_offs,inventory} backend/tests/test_review_inventory.py
git commit -m "feat(backend): Link reviews to inventory movements"
```

### Task 9: Add supplies/orders/sales/counts reconciliation

**Files:**
- Modify: `backend/src/bahandi_backend/inventory/routes.py`
- Modify: `backend/src/bahandi_backend/inventory/service.py`
- Test: `backend/tests/test_inventory_reconciliation.py`

- [ ] Write failing tests for:
  - `POST /inventory/supplies`
  - `POST /inventory/counts`
  - sales consumption import creates `SALE` movements
  - reconciliation computes theoretical vs actual variance
- [ ] Run red tests.
- [ ] Implement movement types: `OPENING_BALANCE`, `SUPPLY`, `SALE`, `WRITE_OFF`, `COUNT_ADJUSTMENT`, `TRANSFER`.
- [ ] Implement `GET /inventory/reconciliation?outlet_id=&date_from=&date_to=`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/inventory backend/tests/test_inventory_reconciliation.py
git commit -m "feat(backend): Add inventory reconciliation"
```

## Chunk 5: iiko Integration

### Task 10: Implement iikoWeb reference/sales/KPI integration

**Files:**
- Create: `backend/src/bahandi_backend/integrations/iiko/client.py`
- Create: `backend/src/bahandi_backend/integrations/iiko/routes.py`
- Create: `backend/src/bahandi_backend/integrations/iiko/service.py`
- Test: `backend/tests/test_iiko_web_client.py`

- [ ] Write tests using `httpx.MockTransport` for:
  - login stores session cookies
  - stores list import maps iiko store IDs
  - external menu import maps products
  - guest checks create sales movements
  - KPI data endpoint response is normalized
- [ ] Run red tests.
- [ ] Implement endpoints from Postman:
  - `POST /api/auth/login`
  - `GET /api/stores/list`
  - `GET /api/stores/select/{id}`
  - `GET /api/store/get/{id}`
  - `GET /api/external-menu`
  - `GET /api/external-menu/{id}`
  - `POST /api/olap/init`
  - `GET /api/olap/fetch-status/{fetch_id}`
  - `POST /api/olap/fetch/{fetch_id}/json`
  - `GET /api/report/guestcheck`
  - `POST /api/kpi/dashboard/get-data`
- [ ] Add admin endpoint `POST /integrations/iiko/sync-reference-data`.
- [ ] Add admin endpoint `POST /integrations/iiko/import-sales?date=YYYY-MM-DD`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/integrations/iiko backend/tests/test_iiko_web_client.py
git commit -m "feat(backend): Integrate iikoWeb reference and sales data"
```

### Task 11: Complete write-off act sync path

**Files:**
- Modify: `backend/src/bahandi_backend/integrations/iiko/service.py`
- Create: `backend/src/bahandi_backend/integrations/iiko/bridge_client.py`
- Create: `backend/src/bahandi_backend/integrations/iiko/write_off_sink.py`
- Test: `backend/tests/test_iiko_write_off_sync.py`

- [ ] Confirm with Bahandi/iiko whether a hidden/private endpoint exists for warehouse write-off act creation.
- [ ] If private endpoint exists: write failing test for exact request body and success response mapping.
- [ ] If private endpoint does not exist: write failing test for bridge call `POST /bridge/write-off-acts`.
- [ ] Implement `WriteOffSink` protocol:
```python
class WriteOffSink(Protocol):
    async def create_write_off_act(self, command: CreateIikoWriteOffAct) -> IikoSyncResult: ...
```
- [ ] Implement `IikoWebWriteOffSink` only if endpoint is confirmed.
- [ ] Implement `IikoBridgeWriteOffSink` for iikoFront/local bridge fallback.
- [ ] Implement sync job retry with exponential backoff and idempotency key = write-off request ID.
- [ ] Store external document ID and raw error.
- [ ] Add admin endpoint `POST /integrations/iiko/sync-jobs/{id}/retry`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/integrations/iiko backend/tests/test_iiko_write_off_sync.py
git commit -m "feat(backend): Sync approved write-offs to iiko"
```

**Blocker note:** If neither a write-off act endpoint nor iikoFront bridge deployment is available, this requirement cannot be fully completed. In that case ship the sync job as `failed_external_capability_missing` and show it in admin panel, but do not claim full iiko write-off integration.

## Chunk 6: Norms, Analytics, KPI

### Task 12: Implement waste norms evaluation

**Files:**
- Modify: `backend/src/bahandi_backend/norms/service.py`
- Create: `backend/tests/test_norms.py`

- [ ] Write failing tests for effective date selection and outlet override.
- [ ] Run red tests.
- [ ] Implement norm lookup: outlet-specific active norm wins; global product norm fallback.
- [ ] Add endpoint `GET /norms/evaluation?outlet_id=&date_from=&date_to=`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/norms backend/tests/test_norms.py
git commit -m "feat(backend): Evaluate waste against norms"
```

### Task 13: Implement analytics endpoints

**Files:**
- Create: `backend/src/bahandi_backend/analytics/routes.py`
- Create: `backend/src/bahandi_backend/analytics/service.py`
- Test: `backend/tests/test_analytics.py`

- [ ] Write failing tests for:
  - employee leaderboard
  - hourly write-off heatmap
  - product waste totals
  - outlet variance summary
  - suspicious clusters by employee/product/time
- [ ] Run red tests.
- [ ] Implement SQL aggregation queries.
- [ ] Add endpoints:
  - `GET /analytics/summary`
  - `GET /analytics/employees`
  - `GET /analytics/products`
  - `GET /analytics/hourly`
  - `GET /analytics/investigations`
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/analytics backend/tests/test_analytics.py
git commit -m "feat(backend): Add operational analytics"
```

### Task 14: Implement KPI scoring

**Files:**
- Create: `backend/src/bahandi_backend/kpi/service.py`
- Create: `backend/src/bahandi_backend/kpi/routes.py`
- Test: `backend/tests/test_kpi.py`

- [ ] Write failing tests for KPI score components:
  - norm adherence
  - valid photo metadata rate
  - transparent reporting rate
  - unexplained inventory variance penalty
  - rejection/duplicate penalty
- [ ] Run red tests.
- [ ] Implement outlet/team score 0-100.
- [ ] Implement employee contribution signals, not punitive final salary logic.
- [ ] Add endpoint `GET /kpi/outlets` and `GET /kpi/employees`.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/kpi backend/tests/test_kpi.py
git commit -m "feat(backend): Add KPI scoring"
```

## Chunk 7: QR Support

### Task 15: Add signed QR token support

**Files:**
- Create: `backend/src/bahandi_backend/qr/service.py`
- Create: `backend/src/bahandi_backend/qr/routes.py`
- Test: `backend/tests/test_qr.py`

- [ ] Write failing tests for creating/resolving QR tokens.
- [ ] Run red tests.
- [ ] Implement opaque token format: `https://app.qamqor.kz/qr/{token}`.
- [ ] Token maps to entity types: `outlet`, `product`, `shift`, `write_off_request`.
- [ ] Add endpoints:
  - `POST /admin/qr-tokens`
  - `GET /qr/{token}`
- [ ] Run green tests.
- [ ] Commit:
```bash
git add backend/src/bahandi_backend/qr backend/tests/test_qr.py
git commit -m "feat(backend): Add QR token resolution"
```

## Chunk 8: Frontend API Wiring and Admin Panel

### Task 16: Add frontend API client and auth

**Files:**
- Modify: `frontend/src/shared/api/http-client.ts`
- Create: `frontend/src/shared/auth/session.ts`
- Create: `frontend/src/shared/auth/AuthProvider.tsx`
- Modify: `frontend/src/app/App.tsx`
- Test: `frontend/test/auth.test.tsx`

- [ ] Write failing test: login stores token and renders role-specific route.
- [ ] Run:
```bash
npm test -w @hackathon/frontend -- auth.test.tsx
```
Expected: FAIL.
- [ ] Implement API client with `Authorization: Bearer`.
- [ ] Implement session provider.
- [ ] Run green test.
- [ ] Commit:
```bash
git add frontend/src/shared/{api,auth} frontend/src/app/App.tsx frontend/test/auth.test.tsx
git commit -m "feat(frontend): Add API-backed auth session"
```

### Task 17: Wire reviewer queue

**Files:**
- Modify: `frontend/src/pages/reviewer/index.tsx`
- Modify: `frontend/src/widgets/write-offs-list/index.tsx`
- Test: `frontend/test/reviewer.test.tsx`

- [ ] Write failing test: pending requests load and approve button calls PATCH review endpoint.
- [ ] Run red test.
- [ ] Implement real data loading.
- [ ] Show photo, metadata status, AI result, deduction type, comment, employee, product.
- [ ] Add approve/reject flows with error display.
- [ ] Run green test.
- [ ] Commit:
```bash
git add frontend/src/pages/reviewer frontend/src/widgets/write-offs-list frontend/test/reviewer.test.tsx
git commit -m "feat(frontend): Wire reviewer queue to backend"
```

### Task 18: Wire admin panel

**Files:**
- Create: `frontend/src/pages/admin/index.tsx`
- Create: `frontend/src/pages/admin/{UsersTab,ProductsTab,NormsTab,InventoryTab,IikoTab}.tsx`
- Modify: `frontend/src/app/App.tsx`
- Test: `frontend/test/admin.test.tsx`

- [ ] Write failing tests for products/norms CRUD and iiko status display.
- [ ] Run red tests.
- [ ] Implement admin tabs.
- [ ] Display iiko unsupported write-off warning prominently until endpoint/bridge configured.
- [ ] Run green tests.
- [ ] Commit:
```bash
git add frontend/src/pages/admin frontend/src/app/App.tsx frontend/test/admin.test.tsx
git commit -m "feat(frontend): Add admin management panel"
```

### Task 19: Wire dashboard analytics

**Files:**
- Modify: `frontend/src/shared/qamqor-data/datasource.ts`
- Modify: `frontend/src/pages/qamqor-dashboard/index.tsx`
- Modify: `frontend/src/shared/qamqor-dashboard/views/*.tsx`
- Test: `frontend/test/dashboard-api.test.tsx`

- [ ] Write failing test: dashboard renders backend analytics summary.
- [ ] Run red test.
- [ ] Replace static mock source with API source.
- [ ] Keep mock only as explicit dev fixture used in tests.
- [ ] Add loading/error/empty states.
- [ ] Run green test.
- [ ] Commit:
```bash
git add frontend/src/shared/qamqor-data frontend/src/pages/qamqor-dashboard frontend/src/shared/qamqor-dashboard frontend/test/dashboard-api.test.tsx
git commit -m "feat(frontend): Wire dashboard analytics"
```

## Chunk 9: Mobile Backend Integration

### Task 20: Add Flutter API client

**Files:**
- Create: `mobile/lib/api/api_client.dart`
- Create: `mobile/lib/api/dto.dart`
- Modify: `mobile/pubspec.yaml`
- Test: `mobile/test/api_client_test.dart`

- [ ] Write failing Dart test for typed login request using fake `http.Client`.
- [ ] Run:
```bash
flutter test mobile/test/api_client_test.dart
```
Expected: FAIL.
- [ ] Implement API client with base URL config.
- [ ] Run green test.
- [ ] Commit:
```bash
git add mobile/lib/api mobile/pubspec.yaml mobile/test/api_client_test.dart
git commit -m "feat(mobile): Add backend API client"
```

### Task 21: Wire mobile auth and reference data

**Files:**
- Modify: `mobile/lib/store/auth_store.dart`
- Modify: `mobile/lib/store/write_off_store.dart`
- Modify: `mobile/lib/screens/login_screen.dart`
- Test: `mobile/test/auth_store_test.dart`

- [ ] Write failing tests for successful/failed PIN login.
- [ ] Run red test.
- [ ] Replace mock auth with `/auth/login`.
- [ ] Load outlets/products/employees after login.
- [ ] Preserve offline cached profile for reload.
- [ ] Run green test.
- [ ] Commit:
```bash
git add mobile/lib/store mobile/lib/screens/login_screen.dart mobile/test/auth_store_test.dart
git commit -m "feat(mobile): Wire login to backend"
```

### Task 22: Wire mobile photo/write-off submission

**Files:**
- Modify: `mobile/lib/screens/camera_screen.dart`
- Modify: `mobile/lib/screens/new_writeoff_screen.dart`
- Modify: `mobile/lib/store/write_off_store.dart`
- Test: `mobile/test/write_off_store_test.dart`

- [ ] Write failing test: photo upload then request create sends expected backend payload.
- [ ] Run red test.
- [ ] Upload photo to `/photos` as base64 or multipart.
- [ ] Submit `/write-offs` with backend IDs.
- [ ] Show validation warnings from backend.
- [ ] Add offline queue for failed sends with retry.
- [ ] Run green test.
- [ ] Commit:
```bash
git add mobile/lib/screens mobile/lib/store/write_off_store.dart mobile/test/write_off_store_test.dart
git commit -m "feat(mobile): Submit write-offs to backend"
```

### Task 23: Add mobile QR scanning

**Files:**
- Create: `mobile/lib/screens/qr_scan_screen.dart`
- Modify: `mobile/lib/router.dart`
- Modify: `mobile/lib/screens/new_writeoff_screen.dart`
- Test: `mobile/test/qr_flow_test.dart`

- [ ] Write failing test: resolved product QR preselects product.
- [ ] Run red test.
- [ ] Add scanner package, route, and resolver call to `GET /qr/{token}`.
- [ ] Support outlet/product/request tokens.
- [ ] Run green test.
- [ ] Commit:
```bash
git add mobile/lib/screens/qr_scan_screen.dart mobile/lib/router.dart mobile/test/qr_flow_test.dart
git commit -m "feat(mobile): Add QR-assisted write-off flow"
```

## Chunk 10: Infrastructure, QA, and Demo Readiness

### Task 24: Complete Docker Compose stack

**Files:**
- Modify: `docker-compose.yml`
- Create: `backend/entrypoint.sh`
- Modify: `.env.example`
- Test: compose smoke commands

- [ ] Add services: `postgres`, `redis`, `backend`, `worker`, `frontend`.
- [ ] Backend startup runs Alembic migrations then Litestar.
- [ ] Worker starts background job processor.
- [ ] Storage volume persists photos.
- [ ] Run:
```bash
docker compose config --quiet
docker compose build backend frontend
docker compose up -d postgres redis backend worker frontend
```
Expected: all containers healthy. If port 5432 conflicts locally, change host port to `${POSTGRES_PORT:-5433}:5432`.
- [ ] Smoke:
```bash
curl http://localhost:4000/health
curl http://localhost:5173
```
Expected: backend ok, frontend HTML.
- [ ] Commit:
```bash
git add docker-compose.yml backend/entrypoint.sh .env.example
git commit -m "build: Complete Docker Compose stack"
```

### Task 25: End-to-end acceptance test

**Files:**
- Create: `backend/tests/test_e2e_write_off_flow.py`
- Optional create: `frontend/test/e2e-smoke.test.tsx`

- [ ] Write backend E2E test:
  - login sender
  - upload photo
  - create write-off
  - login reviewer
  - approve
  - assert movement
  - assert iiko sync job status
  - assert analytics includes employee/product/outlet
- [ ] Run red if current behavior missing.
- [ ] Fix only real missing behavior.
- [ ] Run green.
- [ ] Commit:
```bash
git add backend/tests/test_e2e_write_off_flow.py
git commit -m "test: Cover write-off approval flow end to end"
```

### Task 26: Final verification gate

Run all commands fresh:

```bash
docker run --rm -v "C:/Users/Anek/HackathonProj/backend:/app" -w /app python:3.12-slim sh -c "pip install -e .[test] >/tmp/pip.log && pytest -q"
npm run lint -w @hackathon/frontend
npm test -w @hackathon/frontend
npm run build -w @hackathon/frontend
flutter test
flutter analyze
docker compose config --quiet
docker compose build backend frontend
```

Expected:
- Backend pytest: 0 failures.
- Frontend lint/test/build: exit 0.
- Flutter test/analyze: exit 0.
- Compose config/build: exit 0.

### Task 27: Final commit and push

- [ ] Check status:
```bash
git status --short --branch
```
- [ ] If all verification passed, commit any final files:
```bash
git add .
git commit -m "feat: Complete write-off automation product"
```
- [ ] Push branch:
```bash
git push -u origin feat/litestar-iiko-backend
```

## Definition of Done

- Sender mobile flow works against backend, including photo upload and request submission.
- Reviewer web flow approves/rejects real backend requests.
- Admin web flow manages outlets, employees, products, norms, inventory, and iiko settings.
- Photos are persisted and metadata-validated.
- AI analysis runs or stores explicit failure state.
- Approved write-offs create inventory movements.
- Inventory reconciliation uses supplies/orders/sales/counts/write-offs.
- Norm analytics and KPI endpoints return real DB-backed data.
- QR tokens resolve to backend entities and are used by mobile.
- iikoWeb imports reference/sales/KPI data.
- iiko write-off act sync uses confirmed private endpoint or bridge; otherwise the product must explicitly show `external_capability_missing` and cannot be called fully integrated.
- Docker Compose boots the whole stack.
- All backend, frontend, mobile, and compose verification commands pass.
