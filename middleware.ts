/**
 * Edge gate + token auto-refresh for the authenticated app shell.
 *
 * Two responsibilities:
 *
 *   1. **Cheap auth gate**: if neither cookie is present, redirect to
 *      /login immediately. No API round-trip. This is what the layout's
 *      `requireSession()` used to do *blockingly* — now we do it at the
 *      edge so the HTML for protected routes never even renders without
 *      a cookie. Server components downstream don't need to repeat the
 *      check; they trust that this middleware already filtered the
 *      no-cookie case out.
 *
 *      The cookie's MERE PRESENCE is the gate (not its validity).
 *      Validating the access token signature would require an API call
 *      and re-introduce the 1-second blocking we're trying to remove.
 *      Validity is checked client-side by `<AppShell>` calling
 *      `/api/auth/me` on mount; if the call 401s, the client redirects.
 *
 *   2. **Auto-refresh**: when the access cookie has expired but the
 *      refresh cookie is alive, hit `/v1/auth/refresh` to mint a fresh
 *      pair and write them back as `Set-Cookie`. Page downstream sees a
 *      valid session without bouncing the user to /login.
 *
 *      If refresh ALSO fails (refresh token expired or revoked), clear
 *      both cookies and redirect to /login — a stale refresh token will
 *      keep failing on every request, so cleaning it up immediately
 *      avoids a loop where each nav re-attempts the same dead refresh.
 *
 *  Server components in Next 15 can READ cookies but cannot WRITE them
 *  mid-render. Middleware is the canonical place to set cookies before
 *  the route handler / server component runs.
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_NAMES,
  COOKIE_BASE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_NAMES,
  REFRESH_MAX_AGE,
} from "./lib/cookies";

/** First value present among the accepted names (prefixed, then bare). */
function readCookie(req: NextRequest, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = req.cookies.get(name)?.value;
    if (value) return value;
  }
  return undefined;
}

function loginRedirect(req: NextRequest, clearCookies = false): NextResponse {
  const url = req.nextUrl.clone();
  // Preserve where the user was trying to go so /login can `?next=...`.
  const nextParam = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/login";
  url.search = nextParam && nextParam !== "/login" ? `?next=${encodeURIComponent(nextParam)}` : "";
  const out = NextResponse.redirect(url);
  if (clearCookies) {
    for (const name of [...ACCESS_COOKIE_NAMES, ...REFRESH_COOKIE_NAMES]) out.cookies.delete(name);
  }
  return out;
}

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Rejects a state-changing request whose `Origin` names another site.
 *
 * `SameSite=Lax` already stops the classic cross-site POST, and it stays the
 * primary defence — this is the second layer it never had. It catches the
 * cases Lax does not: a sibling subdomain (same site, different origin) and
 * browsers that mishandle the attribute.
 *
 * Only a PRESENT and mismatched Origin is refused. Browsers always send it
 * on a state-changing request, so CSRF is covered; a server-to-server or
 * curl caller sends none and is left alone, which is what keeps this from
 * breaking every non-browser client of the proxy.
 *
 * The comparison is on HOST, and accepts the `Host` header as well as
 * `nextUrl`. Behind a proxy — this deploys to Cloudflare Workers — the two
 * can legitimately disagree on scheme or on the internal hostname, and a
 * false positive here does not degrade anything: it makes every login a 403.
 */
function crossOriginRefusal(req: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(req.method)) return null;
  const origin = req.headers.get("origin");
  if (!origin) return null;

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    // A malformed Origin is not something a browser sends.
    return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
  }

  const selfHosts = [req.nextUrl.host, req.headers.get("host")].filter(Boolean);
  if (selfHosts.includes(originHost)) return null;

  return NextResponse.json({ error: "Cross-origin request refused" }, { status: 403 });
}

export async function middleware(req: NextRequest) {
  // API routes are exempt from the auth gate — each handler runs its own
  // `requireSession()` — but not from the CSRF check.
  if (req.nextUrl.pathname.startsWith("/api/")) {
    return crossOriginRefusal(req) ?? NextResponse.next();
  }

  const refusal = crossOriginRefusal(req);
  if (refusal) return refusal;

  const access = readCookie(req, ACCESS_COOKIE_NAMES);
  const refreshToken = readCookie(req, REFRESH_COOKIE_NAMES);

  // Both cookies absent → unauthenticated; bounce to /login at the
  // edge before any HTML renders.
  if (!access && !refreshToken) {
    return loginRedirect(req);
  }

  // Access cookie present → let the request through. Validity is
  // verified client-side, deliberately not here.
  if (access) {
    return NextResponse.next();
  }

  // No access, have refresh → try to refresh in-line.
  const apiUrl = process.env.ESUS_API_URL;
  const appId = process.env.ESUS_APP_ID;
  if (!apiUrl || !appId) return NextResponse.next();

  try {
    const res = await fetch(`${apiUrl}/v1/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": appId,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) {
      // Refresh token rejected (expired, revoked, replay-detected).
      // Clear both cookies and bounce — leaving the bad refresh
      // around would re-fail on every nav.
      return loginRedirect(req, true);
    }
    const tokens = (await res.json()) as {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
    };
    const out = NextResponse.next();
    out.cookies.set(ACCESS_COOKIE, tokens.accessToken, { ...COOKIE_BASE, maxAge: tokens.expiresIn });
    out.cookies.set(REFRESH_COOKIE, tokens.refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_MAX_AGE });
    // A refresh that ran while the browser still held the pre-`__Host-`
    // cookies would otherwise leave both pairs in the jar, and the stale
    // one can win the next read.
    for (const name of [...ACCESS_COOKIE_NAMES, ...REFRESH_COOKIE_NAMES]) {
      if (name !== ACCESS_COOKIE && name !== REFRESH_COOKIE) out.cookies.delete(name);
    }
    return out;
  } catch {
    // Network blip — let the request through. The client-side
    // `/api/auth/me` check will catch a truly broken session.
    return NextResponse.next();
  }
}

export const config = {
  // Protect every route by default. Explicitly exempt:
  //   • Next.js internals (_next/*)
  //   • Static assets (favicon.ico, images)
  //   • Auth pages (login, signup, verify, forgot-password, reset-password)
  //   • API routes — each handler runs its own session check via requireSession()
  //
  // Inverting the matcher (exclusion-list instead of inclusion-list) means any
  // new authenticated route is protected automatically without updating this file.
  // Each exemption is anchored to a path-segment boundary — `(?:/|$)`.
  // Without it the alternation matched by PREFIX, so a future route like
  // `/verify-payment` or `/signup-complete` would inherit the exemption of
  // `/verify` / `/signup` and ship unauthenticated.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|(?:login|signup|verify|verify-mfa|forgot-password|reset-password)(?:/|$)|api/).*)",
    // `/api/*` is matched separately: the auth gate skips it, the
    // cross-origin check does not.
    "/api/:path*",
  ],
};
