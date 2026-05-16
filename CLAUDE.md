# Esus Quickstart — CLAUDE.md

## What this project is
A batteries-included Next.js 15 reference app for the **Esus BaaS API**. It covers:
- Multi-tenant authentication (signup / email-verify / login) against Esus
- Full FHIR R4 data plane: Patient, Practitioner, Appointment, Encounter, Condition, Observation, MedicationRequest
- A sidebar shell designed for rapid, clean, scalable medical-system development

## Tech stack

| Layer | Choice |
|-------|--------|
| Runtime | **Bun** |
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 — strict mode |
| Styling | Tailwind CSS 3 — custom design system, no component library |
| Icons | Lucide React |
| Data fetching | SWR 2 (client) / native `fetch` (server) |
| State | Zustand 5 (auth store only) |
| API client | openapi-fetch (typed against Esus OpenAPI schema) |
| Deployment | Cloudflare Pages (edge runtime throughout) |

## Language
All code, comments, commit messages, PR descriptions, and documentation must be written in **English**.

## Commands
```bash
bun dev              # local dev server
bun run build        # production build
bun run lint         # ESLint
bun run pages:build  # Cloudflare Pages build via @cloudflare/next-on-pages
bun run pages:deploy # pages:build + wrangler deploy
bun run generate-api # regenerate lib/api-types.ts from Esus OpenAPI schema
```

## Project structure
```
app/
  (auth)/            # unauthenticated routes: /, /signup, /verify, /login
  (app)/             # authenticated routes: /dashboard, /patients, /practitioners, /appointments, /encounters
    _components/     # app-shell UI: AppShell, Sidebar, ResourceTable, SearchBar, Skeleton, Field, ui.tsx
  api/               # Next.js route handlers (all edge runtime)
    auth/            # signup, login, verify, me, logout
    fhir/            # FHIR CRUD + batch proxy
  _components/       # root-level shared: EsusMark
lib/
  esus.ts            # Esus tenant auth helpers: signup, verify, login, getMe
  fhir.ts            # server-side FHIR CRUD + batch (API key read from env, never sent to browser)
  use-fhir.ts        # SWR hooks for client-side FHIR: useFhirSearch, useFhirRead, useFhirBatch, invalidateResource
  fhir-helpers.ts    # FHIR formatters: formatName, formatDate, formatAddress, unmaskPHI, etc.
  fhir-appointment.ts / fhir-encounter.ts / fhir-clinical.ts  # typed helpers per resource domain
  api-client.ts      # fully-typed openapi-fetch client
  api-types.ts       # auto-generated OpenAPI types — DO NOT edit manually
  api-errors.ts      # unified ApiError class used by all helpers
  auth.ts            # requireSession() / getSession() — server-side only
  session.ts         # httpOnly cookie read/write helpers
  store.ts           # Zustand auth store: useAuth()
  utils.ts           # cn() Tailwind class joiner
middleware.ts        # edge auth gate + token auto-refresh (runs before all app routes)
```

## Architecture

### Middleware (`middleware.ts`)
Edge gate that runs on every protected route before any rendering:
1. **Cookie check** — both cookies absent → redirect to `/login` immediately, no API call
2. **Auto-refresh** — access cookie expired but refresh cookie present → calls `POST /v1/auth/refresh` inline, writes new cookies, lets request through
3. **Refresh failure** → clears both cookies, redirects to `/login`

Protected paths: `/dashboard/*`, `/patients/*`, `/practitioners/*`, `/appointments/*`, `/encounters/*`

Downstream server components trust that middleware has already filtered the unauthenticated case. They do NOT re-check cookie presence.

### Authentication flow
1. Signup → `POST /api/auth/signup` → Esus sends 6-digit OTP email
2. Verify → `POST /api/auth/verify` → confirms email
3. Login → `POST /api/auth/login` → sets `esus_access` + `esus_refresh` httpOnly cookies
4. Session validation → `AppShell` calls `GET /api/auth/me` on mount, hydrates Zustand store
5. Logout → `POST /api/auth/logout` → `clearTokens()`, redirect to `/login`

Cookies: `httpOnly: true`, `sameSite: "lax"`, `secure: true` in production.

### FHIR service layer
- **Server-side** (`lib/fhir.ts`): sends `X-Api-Key: <CLIENT_ID>:<SECRET>` — API secret stays on server, never in browser
- **Browser proxy** (`app/api/fhir/[...path]/route.ts`): gated via `requireSession()`, then forwards to `lib/fhir.ts`
- **SWR hooks** (`lib/use-fhir.ts`): fetch through `/api/fhir/`, cache by URL, `keepPreviousData: true`
- **Batch** (`fhirBatch()`): collapses multiple reads into one round-trip — use for any fan-out of ≥3 concurrent reads
- After mutations: call `invalidateResource(resourceType)` to bust SWR cache

### Error handling
All helpers in `lib/` throw `ApiError`. Never throw plain `Error` from service layer code.

```typescript
err.status        // HTTP status
err.kind          // "network" | "unauthorized" | "forbidden" | "notFound" | "conflict" | "validation" | "server" | "unknown"
err.userMessage   // Always set — safe to surface in UI
err.fieldErrors   // Record<string, string> — per-field 422 errors
err.diagnostic    // Raw FHIR OperationOutcome diagnostic string
```

### Data loading patterns

| Context | How to load |
|---------|-------------|
| Server component / route handler | Call `fhirSearch()` / `fhirRead()` directly from `lib/fhir.ts` |
| Client component | Use `useFhirSearch()` / `useFhirRead()` / `useFhirBatch()` from `lib/use-fhir.ts` |
| After create/update/delete | Call `invalidateResource(resourceType)` to bust SWR cache |
| Multiple concurrent reads | Use `fhirBatch()` to collapse into one round-trip |

## UI / design system
- **No external component library** — no shadcn, no Radix, no MUI. All components are hand-built Tailwind.
- Base UI primitives: `app/(app)/_components/ui.tsx` (Button, Input, Label, Textarea, Select, Badge, etc.)
- Brand color: `brand-600` (#0891b2, cyan) — matches Esus admin console
- Neutral scale for text/borders; emerald / amber / rose for status tones
- Custom Tailwind shadows: `shadow-card`, `shadow-card-hover`
- Icons: `lucide-react` only
- Sidebar shell: desktop 256px expanded / tablet 64px icon rail / mobile off-canvas drawer
- Content area constrained by AppShell: `max-w-6xl mx-auto px-4 py-6`
- Loading states: always use `Skeleton` from `app/(app)/_components/Skeleton.tsx`

## Environment variables
```bash
ESUS_API_URL=                   # https://api.esus.health (prod) or http://localhost:3000 (local)
ESUS_APP_ID=                    # app_<32 hex> — public identifier, not a secret
ESUS_API_KEY_CLIENT_ID=         # M2M key client ID — server-only
ESUS_API_KEY_SECRET=            # M2M key secret — NEVER expose to browser (no NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_TURNSTILE_SITE_KEY= # optional Cloudflare Turnstile site key
```

## Code conventions
- TypeScript strict — no `any`, no unchecked casts
- Default to **server components**; add `"use client"` only when using hooks or browser APIs
- Every route handler exports `export const runtime = "edge"` (required for Cloudflare Pages)
- Use `@/` alias for all non-relative imports
- Throw `ApiError` (or let helpers throw it); never `new Error()` in service layer
- No database, no ORM — the app is stateless; all persistence is Esus BaaS
- No new component libraries — extend `ui.tsx` for new primitives
- Form mutations go through `POST /api/*` route handlers, not Server Actions
- `lib/api-types.ts` is auto-generated — run `bun run generate-api` after Esus API schema changes, never edit by hand

## Deployment (Cloudflare Pages)
- Build adapter: `@cloudflare/next-on-pages`
- All route handlers **must** export `runtime = "edge"` — no Node.js-only modules
- `wrangler.toml` pins `compatibility_date` and sets `nodejs_compat` flag (Node polyfills for crypto, buffer, etc.)
- Build artifacts: `.vercel/output/static`
- Secrets set in CF Pages dashboard under Environment variables (mark as "secret")
- `bun run pages:deploy` for manual deploys
