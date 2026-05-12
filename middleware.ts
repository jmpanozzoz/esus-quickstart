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

const ACCESS = "esus_access";
const REFRESH = "esus_refresh";

function loginRedirect(req: NextRequest, clearCookies = false): NextResponse {
  const url = req.nextUrl.clone();
  // Preserve where the user was trying to go so /login can `?next=...`.
  const nextParam = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/login";
  url.search = nextParam && nextParam !== "/login" ? `?next=${encodeURIComponent(nextParam)}` : "";
  const out = NextResponse.redirect(url);
  if (clearCookies) {
    out.cookies.delete(ACCESS);
    out.cookies.delete(REFRESH);
  }
  return out;
}

export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS)?.value;
  const refreshToken = req.cookies.get(REFRESH)?.value;

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
    const secure = process.env.NODE_ENV === "production";
    out.cookies.set(ACCESS, tokens.accessToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: tokens.expiresIn,
    });
    out.cookies.set(REFRESH, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return out;
  } catch {
    // Network blip — let the request through. The client-side
    // `/api/auth/me` check will catch a truly broken session.
    return NextResponse.next();
  }
}

export const config = {
  // Only run on authenticated surfaces. Auth pages (/, /signup, /login,
  // /verify) and the API routes don't need this middleware — they
  // either are the auth flow itself or run their own session check.
  matcher: ["/dashboard/:path*", "/patients/:path*", "/practitioners/:path*", "/appointments/:path*", "/encounters/:path*"],
};
