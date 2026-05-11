# Esus Quickstart

Batteries-included Next.js 15 sample for the [Esus BaaS API](https://esus.health) — tenant auth, FHIR data plane, and a clean sidebar shell to build on.

```
Browser  ──>  Next.js (this app)  ──>  Esus API
                │
                ├─ httpOnly cookies (esus_access, esus_refresh)
                └─ X-Api-Key + X-App-Id for backend FHIR reads
```

End-user tokens never touch the browser. The API key never touches the browser. Everything FHIR-related goes through a generic proxy (`app/api/fhir/[...path]`) you can adapt or replace.

## What's inside

| Page | What it does |
|---|---|
| `/` | Landing — redirects to `/dashboard` if already signed in |
| `/signup` `/verify` `/login` | Tenant-auth flow against `/v1/auth/*` |
| `/dashboard` | Authenticated home — shows the user's own FHIR observations (`/v1/auth/me/Observation`) |
| `/patients` | Lists `Patient` via the FHIR data plane with search |
| `/practitioners` | Lists `Practitioner` with search |

| Module | Use it for |
|---|---|
| `lib/esus.ts` | Tenant auth helpers (signup, verify, login, `/me`) |
| `lib/fhir.ts` | Generic `fhirSearch / fhirRead / fhirCreate / fhirUpdate / fhirDelete` over `/fhir/*` with API-key auth |
| `lib/auth.ts` | `requireSession()` — the single auth gate used by the `(app)` layout |
| `lib/session.ts` | httpOnly cookie helpers |
| `app/api/auth/*` | Route handlers proxying the auth flow |
| `app/api/fhir/[...path]` | Browser → server FHIR proxy (forwards with API key, requires a session) |

Add a new resource (e.g. `Encounter`) in three lines:

```tsx
import { fhirSearch, entries } from "@/lib/fhir";
const bundle = await fhirSearch("Encounter", { _count: 50 });
const rows = entries(bundle);
```

## Setup

### 1. Register a tenant app in the Esus console

`/onboarding` (or `/apps` → "Create app") gives you a **public ID** like `app_a3f1b9…`. On the same app, open the **API keys** tab and create a key — the secret is shown **once**, copy it now.

### 2. Configure

```bash
cp .env.example .env.local
```

```bash
ESUS_API_URL=https://api.esus.health        # or http://localhost:3000 for local dev
ESUS_APP_ID=app_a3f1b9…                     # from the app's Overview tab
ESUS_API_KEY_ID=…                           # API key client id
ESUS_API_KEY_SECRET=…                       # the secret shown at creation
```

### 3. Run

```bash
npm install
PORT=3001 npm run dev      # 3001 because :3000 is usually the API
```

Open http://localhost:3001 → create an account → read the 6-digit code from your inbox → log in → dashboard.

For **local email** during dev, run [Mailpit](https://github.com/axllent/mailpit):

```bash
docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit
```

Point the Esus API's SMTP at `localhost:1025`, then read messages at http://localhost:8025.

### 4. Link the test user to a Patient (optional)

Right after signup the user has no `patientId`, so `/dashboard` shows an empty observations panel. From the Esus console: **Apps → your app → App users → click the user → Link FHIR resource**, paste a Patient UUID, save. Reload `/dashboard`.

## Architecture notes

- **Tokens stay server-side.** Access + refresh tokens are written to httpOnly cookies on *your* domain by `/api/auth/login`. An XSS on this app does not yield a working token.
- **`ESUS_APP_ID` is server-only.** Not a secret, but routing every BaaS call through route handlers means changing transport later doesn't touch the frontend.
- **API key is server-only and gated.** `lib/fhir.ts` runs only on the server. The browser proxy at `/api/fhir/[...path]` calls `requireSession()` first so an unauthenticated tab can't use it as an open relay.
- **Two route groups**: `(auth)` is unauthenticated and centered (signup/login/verify/landing). `(app)` runs `requireSession()` in its layout and renders the sidebar.

## Deploy to Cloudflare Pages

```bash
npm run pages:build
npm run pages:deploy           # uses wrangler — runs first deploy interactively
```

Set the same `.env.local` variables in **Pages → Settings → Environment variables** (mark `ESUS_API_KEY_SECRET` as a secret).

Edge runtime is enabled on every server file (`export const runtime = "edge"`), so the build is Pages-native.

## What's NOT in here (on purpose)

- **MFA.** When `POST /v1/auth/login` returns `{ mfaRequired, mfaToken }`, post the TOTP code to `/v1/auth/mfa/verify`.
- **Token refresh.** When the access token expires, call `POST /v1/auth/refresh` with the refresh cookie. We just redirect to `/login` on 401.
- **Google sign-in.** Redirect users to `${ESUS_API_URL}/v1/auth/google/start?app_id=${ESUS_APP_ID}&next=${return_url}`.
- **Cloudflare Turnstile.** If your app has Turnstile enabled, render the widget on `/signup` and forward `cf-turnstile-token` from the route handler. `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is reserved in `.env.example` for that.
- **Detail pages / writes.** The list pages are read-only. The `fhirCreate / fhirUpdate / fhirDelete` helpers are in place so you can add forms.

## License

MIT.
