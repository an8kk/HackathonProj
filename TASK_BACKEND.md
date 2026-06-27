# Backend Task — Do This Now

## Your job

Build the database schema and API endpoints for the Bahandi Reporter write-off system.
The backend is already running via Docker. You just need to add real routes and a DB schema.

## Stack

- **Fastify 5** (Node.js/TypeScript) — `backend/src/`
- **PostgreSQL** — already running in Docker on port 5432
- **Zod** — already installed, use it for request validation
- No ORM — use the `postgres` npm package for queries (install it: `npm install postgres -w @hackathon/backend`)

## Step 1 — Create the DB schema

Create `backend/src/infrastructure/db/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS outlets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('sender', 'reviewer', 'owner')),
  pin TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID REFERENCES outlets(id),
  employee_id UUID REFERENCES employees(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  unit TEXT NOT NULL CHECK (unit IN ('штуки', 'граммы')),
  norm_waste_pct NUMERIC(5,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS write_off_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID REFERENCES shifts(id),
  employee_id UUID REFERENCES employees(id),
  product_id UUID REFERENCES products(id),
  type TEXT NOT NULL CHECK (type IN ('штучный', 'весовой')),
  quantity NUMERIC NOT NULL,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('DAMAGED', 'EXPIRED', 'OVERCOOKED', 'RAW_WASTE', 'OTHER')),
  stage TEXT CHECK (stage IN ('RAW', 'SEMI_FINISHED', 'READY')),
  photo_url TEXT,
  photo_hash TEXT,
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewer_id UUID REFERENCES employees(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS seed_data AS SELECT 1 WHERE FALSE; -- placeholder

-- Seed: one outlet, some products
INSERT INTO outlets (id, name, address) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Mega Silk Way', 'Алматы, пр. Розыбакиева 247')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, unit, norm_waste_pct) VALUES
  ('Говяжья котлета', 'граммы', 3.5),
  ('Булочка бургерная', 'штуки', 2.0),
  ('Картофель фри', 'граммы', 5.0),
  ('Куриная котлета', 'граммы', 3.0),
  ('Сыр', 'граммы', 2.5),
  ('Соус', 'граммы', 4.0),
  ('Листья салата', 'граммы', 8.0)
ON CONFLICT DO NOTHING;
```

Run this against the DB:
```bash
docker exec -i hackathonproj-postgres-1 psql -U hackathon -d hackathon < backend/src/infrastructure/db/schema.sql
```

## Step 2 — Add DB client

Create `backend/src/infrastructure/db/client.ts`:

```typescript
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL ?? 'postgres://hackathon:hackathon@localhost:5432/hackathon');

export { sql };
```

## Step 3 — Build these endpoints

### Products
- `GET /products` — list all products (id, name, unit, norm_waste_pct)

### Employees
- `POST /auth/login` — body: `{ pin: string }` → returns employee object or 401

### Write-off requests
- `GET /write-offs` — list all, support `?status=pending&employee_id=xxx`
- `POST /write-offs` — create new request (body below)
- `PATCH /write-offs/:id/review` — approve or reject (body: `{ status: 'approved'|'rejected', reviewer_id, reason? }`)

### POST /write-offs request body (Zod schema):
```typescript
const CreateWriteOffSchema = z.object({
  shift_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  product_id: z.string().uuid(),
  type: z.enum(['штучный', 'весовой']),
  quantity: z.number().positive(),
  reason_code: z.enum(['DAMAGED', 'EXPIRED', 'OVERCOOKED', 'RAW_WASTE', 'OTHER']),
  stage: z.enum(['RAW', 'SEMI_FINISHED', 'READY']).optional(),
  photo_url: z.string().url().optional(),
  photo_hash: z.string().optional(),
  comment: z.string().optional(),
});
```

### Shifts
- `POST /shifts` — start a shift: body `{ outlet_id, employee_id }` → returns shift with id
- `PATCH /shifts/:id/end` — end a shift

## Step 4 — Register routes in the HTTP server

Find `backend/src/infrastructure/http/build-http-server.ts` and register your route plugins there.

## Step 5 — Rebuild Docker after changes

```bash
docker compose up --build -d backend
```

Or for faster iteration without Docker:
```bash
cd backend && npm run dev
```
(needs `DATABASE_URL=postgres://hackathon:hackathon@localhost:5432/hackathon` in your shell)

## Done when

- `GET http://localhost:4000/products` returns a JSON array of products
- `POST http://localhost:4000/write-offs` with valid body returns the created record
- `PATCH http://localhost:4000/write-offs/:id/review` updates status

## Notes

- All responses should follow: `{ success: true, data: ... }` or `{ success: false, error: '...' }`
- No auth middleware needed yet — just PIN login endpoint
- CORS is already configured in the Fastify setup, don't touch it
- Read `CONTEXT.md` in this folder for full project context
