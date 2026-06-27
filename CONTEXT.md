# Bahandi Reporter — Team Context

## What this project is

Hackathon case: mobile app for digitizing product write-off (списание) requests at Bahandi Burger outlets.
Employees submit write-offs from their phones → reviewer approves/rejects → syncs to iiko.

Full case brief: `C:\Users\PC\Desktop\Mentoria Hackathon\final\bahandi-reporter\HANDOFF.md`

---

## Repo structure

```
HackathonProj/
├── backend/        Fastify (Node.js/TypeScript) — API server, port 4000
├── frontend/       Vite + React — web admin/manager dashboard, port 5173
├── mobile/         Flutter — employee mobile app (IN PROGRESS)
├── docker-compose.yml
└── .env            copy of .env.example, already filled in
```

---

## Running the stack

Docker is the one-command way. Make sure Docker Desktop is open first.

```bash
cd HackathonProj
docker compose up --build -d
```

Services:
| Service | URL |
|---|---|
| Frontend (web admin) | http://localhost:5173 |
| Backend (API) | http://localhost:4000 |
| PostgreSQL | localhost:5432 |

To stop: `docker compose down`  
To see logs: `docker compose logs -f backend`

---

## Backend

**Stack:** Fastify 5, TypeScript, PostgreSQL (via `DATABASE_URL` env var), Zod for validation.

**Structure:**
```
backend/src/
├── main.ts                     entry point, port 4000
├── infrastructure/http/        Fastify server setup
└── modules/                    feature modules (add yours here)
```

**How to add an endpoint:**
1. Create a module folder under `backend/src/modules/your-feature/`
2. Register a Fastify route plugin
3. Wire it into `build-http-server.ts`

No ORM yet — use raw `pg` queries or add `postgres` / `drizzle-orm` if needed.

---

## Frontend (web admin panel)

**Stack:** Vite 6, React 19, TypeScript — Feature-Sliced Design (FSD) architecture.

```
frontend/src/
├── app/          App root, global styles
├── pages/        Route-level page components
├── widgets/      Composite UI blocks (e.g. VarianceSummary)
├── features/     User interactions (e.g. waste-photo-analysis — placeholder)
├── entities/     Domain models (e.g. inventory)
└── shared/       API client, reusable UI
```

**API base URL:** `VITE_API_BASE_URL` env var (default `http://localhost:4000`).  
HTTP client helper: `frontend/src/shared/api/http-client.ts` — use `buildApiUrl('/your-path')`.

**Current state:** basic dashboard shell ("Operations cockpit"), static mock data.  
**Your job:** wire real API calls, build out manager/admin views.

---

## Mobile (Flutter) — YOUR MAIN TASK

Location: `HackathonProj/mobile/` — currently empty, Flutter project being scaffolded.

**This is the employee-facing app.** Workers at outlets use this to:
- Submit write-off requests (штучный / весовой)
- Take photos of waste
- See their pending/approved history

**Brand:**
- Font: Golos Text (Google Fonts)
- Green: `#198754` (primary), `#0A6730` (hover/dark)
- Orange: `#EA5E1F` (active/accent)
- Charcoal: `#2B2A28` (text)
- Background: `#FEFEFE` / `#f8f8f8`
- Radius: 10px buttons, 16px cards, 32px large cards

**Screens to build (priority order):**
1. Login (employee PIN or email)
2. Dashboard — today's shift summary, quick "New write-off" CTA
3. New write-off form:
   - Step 1: product select + type (штучный = count, весовой = weight in grams)
   - Step 2: reason code + comment
   - Step 3: camera — take photo
   - Step 4: review + submit
4. History — list of submitted requests with status badges
5. (Later) Reviewer queue — approve/reject with reason

**API:** points to `http://localhost:4000` (use `10.0.2.2:4000` from Android emulator).

---

## DB schema (needs to be built)

Tables needed (create as migrations in `backend/`):

```sql
outlets         (id, name, address)
employees       (id, outlet_id, name, role: sender|reviewer|owner, pin)
shifts          (id, outlet_id, employee_id, started_at, ended_at)
products        (id, name, unit: штуки|граммы, norm_waste_pct)
write_off_requests (
  id, shift_id, employee_id, product_id,
  type: штучный|весовой,
  quantity,        -- штуки or граммы
  reason_code,     -- DAMAGED | EXPIRED | OVERCOOKED | RAW | OTHER
  stage,           -- RAW | SEMI | READY (for штучный)
  photo_url,
  photo_hash,      -- perceptual hash for duplicate detection
  comment,
  status: pending|approved|rejected,
  reviewer_id,
  reviewed_at,
  created_at
)
receipts        (id, outlet_id, employee_id, product_id, expected_qty, actual_qty, photo_url, created_at)
```

---

## Key business rules (from TZ)

- Every write-off is tied to a shift + employee — no anonymous submissions
- Two product types: **штучный** (by count, photo required) vs **весовой** (by weight, photo optional)
- Warn if weight > `norm_waste_pct` of shift intake
- Immutable log — submitted requests cannot be edited or deleted
- Photo: store perceptual hash for duplicate detection, check EXIF timestamp
- Reason codes: DAMAGED, EXPIRED, OVERCOOKED, RAW_WASTE, OTHER
- Stages (штучный only): RAW, SEMI_FINISHED, READY

---

## What's done / what's not

| Area | Status |
|---|---|
| Docker stack (postgres + backend + frontend) | ✅ Running |
| Fastify backend shell | ✅ Exists, no real routes yet |
| Vite frontend shell | ✅ Exists, static mock data |
| Flutter mobile app | 🔧 Being set up |
| DB schema / migrations | ❌ Not started |
| API endpoints | ❌ Not started |
| Auth | ❌ Not started |
| Write-off flow | ❌ Not started |

---

## Priorities for this session

1. **Backend:** Create DB schema (migrations), implement write-off CRUD endpoints
2. **Mobile:** Flutter app scaffold with Bahandi brand + write-off form + camera
3. **Frontend:** Wire VarianceSummary to real API data

Pick one lane and go deep — don't spread across all three.
