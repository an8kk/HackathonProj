# Teammate Context — Bahandi Burger Hackathon

> Last updated: 2026-06-27. Read this top to bottom before touching any code.

---

## What We're Building

An internal tool for **Bahandi Burger** employees to submit food write-off requests (списания). When a product is spoiled, damaged, or expired, a staff member opens the app, photographs the item, and Claude AI automatically identifies the product and suggests the reason code. They then confirm the details and submit.

**Three parts:**
| Part | Tech | Who | Status |
|------|------|-----|--------|
| Mobile app | Flutter (Dart) | Us | ✅ Built, being tested on device |
| Backend API | Fastify (TypeScript) | Us | ✅ Running via Docker |
| Web admin panel | Vite + React | Teammate | 🔲 Mostly skeleton |

---

## Repo Structure

```
HackathonProj/
├── mobile/          ← Flutter app (employee-facing)
├── backend/         ← Fastify API server
├── frontend/        ← Vite/React web admin (your area)
├── docker-compose.yml
├── .env             ← secrets go here, never commit
└── package.json     ← npm workspaces root
```

---

## How to Run Everything

### 1. Prerequisites
- Docker Desktop running
- Node.js 20+
- Flutter SDK (only needed if touching mobile)

### 2. Fill in `.env`
```
ANTHROPIC_API_KEY=sk-ant-...   ← get this from the team
```
All other values are already set with defaults.

### 3. Start backend + database
```bash
cd HackathonProj
docker compose up
```
This starts:
- PostgreSQL on port `5432`
- Fastify backend on port `4000`
- Vite frontend on port `5173`

### 4. Verify backend is alive
```
GET http://localhost:4000/health
→ { "status": "ok", "service": "hackathon-backend" }
```

---

## Backend API Endpoints

Base URL: `http://localhost:4000`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/inventory` | List inventory items |
| POST | `/photo-analysis/analyze` | AI photo analysis (Claude Haiku) |
| GET | `/write-offs` | List write-off submissions |
| POST | `/write-offs` | Create a write-off |

### `POST /photo-analysis/analyze`
```json
// Request
{
  "image_base64": "<base64 encoded image>",
  "media_type": "image/jpeg"
}

// Response
{
  "success": true,
  "data": {
    "is_food_waste": true,
    "detected_product": "Говяжья котлета",
    "condition": "Продукт пережарен, края обуглены",
    "suggested_reason": "quality",
    "warning": null
  }
}
```

**Mock mode**: If `ANTHROPIC_API_KEY` is empty in `.env`, the endpoint returns a hardcoded realistic response with a 1.2s fake delay — useful for UI testing without spending API credits.

---

## Mobile App (Flutter)

### Brand Colors
```dart
green   #198754   ← primary actions, active states
orange  #EA5E1F   ← accents, active nav items
charcoal #2B2A28  ← text
surface  #F8F8F8  ← backgrounds
```
Font: **Golos Text** (via google_fonts package)

### Screens
| Route | File | Description |
|-------|------|-------------|
| `/login` | `login_screen.dart` | PIN login (demo PIN: `1234`) |
| `/dashboard` | `dashboard_screen.dart` | Home, shows current shift |
| `/camera` | `camera_screen.dart` | Photo → AI analysis flow |
| `/new` | `new_writeoff_screen.dart` | 3-step write-off form |
| `/history` | `history_screen.dart` | Past submissions |

### Bottom Nav
Custom nav bar: **Главная** (home) — **green camera button** (center, raised) — **История**. The camera button opens `/camera`.

### Camera → Write-off Flow
1. User taps green camera button
2. `CameraScreen` opens — pick photo from camera or gallery
3. Photo is base64-encoded and sent to `POST /photo-analysis/analyze`
4. AI result card shows: detected product, condition, suggested reason, warning
5. "Использовать это фото" → navigates to `/new` with photo + analysis pre-filled
6. User reviews 3-step form and submits

### Running on Device
```powershell
# In HackathonProj/mobile/
$env:Path += ";C:\Users\PC\Desktop\Flutter\flutter\bin"

# For Chrome (quick dev):
flutter run -d chrome

# For physical Android phone (USB connected):
adb reverse tcp:4000 tcp:4000   ← run this first! routes backend through USB
flutter run -d <device-id>
flutter devices                  ← to find device-id
```

---

## Frontend / Web Admin (Your Area)

Located in `frontend/`. Runs on `http://localhost:5173` via Docker, or:
```bash
cd HackathonProj
npm run dev --workspace=@hackathon/frontend
```

The backend URL is available as `import.meta.env.VITE_API_BASE_URL` (set in `.env`).

### What Needs Building
The frontend is mostly a skeleton. Suggested screens for the admin panel:
- **Dashboard** — overview of today's write-offs, total waste value
- **Write-offs list** — table of all submissions with filters (date, product, reason)
- **Write-off detail** — shows photo + AI analysis + employee info
- **Inventory** — current stock levels, variance flags

The backend already has `/write-offs` and `/inventory` endpoints ready to consume.

---

## Database

PostgreSQL, credentials in `.env`. Schema not yet migrated — the backend connects but tables need to be created. The write-offs module exists at:
```
backend/src/modules/write-offs/
```

---

## Key Decisions Made

- **API key is server-side only** — Flutter never sees the Anthropic key. Mobile sends image to our backend, backend calls Claude, returns result. Never hardcode the key anywhere.
- **`camera` package removed** — was causing CMake/C++ build failures on Android. `image_picker` handles all camera/gallery needs.
- **ADB reverse for device testing** — phone connects to backend via USB tunnel, not WiFi. Run `adb reverse tcp:4000 tcp:4000` before `flutter run`.
- **Mock mode** — backend works without API key for UI demos.

---

## Files to Know

```
mobile/lib/
├── main.dart                    ← app entry point
├── theme.dart                   ← BahandiColors + bahandiTheme()
├── router.dart                  ← all routes (GoRouter)
├── screens/
│   ├── login_screen.dart
│   ├── dashboard_screen.dart
│   ├── camera_screen.dart       ← AI photo analysis
│   ├── new_writeoff_screen.dart ← 3-step form
│   └── history_screen.dart
└── widgets/
    └── scaffold_with_nav.dart   ← bottom nav bar

backend/src/modules/
├── photo-analysis/              ← Claude Haiku integration
├── write-offs/                  ← CRUD for submissions
└── inventory/                   ← stock tracking
```
