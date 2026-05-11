/**
 * Auto-refresh access tokens before they hit a server component.
 *
 * The access cookie's maxAge mirrors the JWT TTL (15 min by default).
 * The refresh cookie lives 30 days. Once the access cookie expires the
 * browser drops it; this middleware sees "no access, have refresh",
 * calls POST /v1/auth/refresh, and writes the new pair so the page
 * downstream sees a fresh token without bouncing the user to /login.
 *
 * Why middleware (not a server-component helper): server components in
 * Next 15 can READ cookies but cannot WRITE them mid-render. Middleware
 * is the canonical place to set cookies before the route handler /
 * server component runs.
 */
import { type NextRequest, NextResponse } from "next/server";

const ACCESS = "esus_access";
const REFRESH = "esus_refresh";

export async function middleware(req: NextRequest) {
  const access = req.cookies.get(ACCESS)?.value;
  const refreshToken = req.cookies.get(REFRESH)?.value;

  if (access || !refreshToken) {
    return NextResponse.next();
  }

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
    if (!res.ok) return NextResponse.next();
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
    return NextResponse.next();
  }
}

export const config = {
  // Only run on authenticated surfaces. Auth pages (/, /signup, /login,
  // /verify) and the API routes don't need this middleware — they
  // either are the auth flow itself or run their own session check.
  matcher: ["/dashboard/:path*", "/patients/:path*", "/practitioners/:path*", "/appointments/:path*", "/encounters/:path*"],
};
