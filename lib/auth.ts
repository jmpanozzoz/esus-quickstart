/**
 * Auth helpers for server-side code (route handlers + server
 * components).
 *
 *   `getSession()`    — non-redirecting. Returns the validated
 *                       session, or `null` when the cookie is
 *                       absent / invalid / expired. Use from API
 *                       route handlers that need to return 401
 *                       JSON (not bounce the browser).
 *
 *   `requireSession()` — strict. Calls `getSession()` and redirects
 *                       to /login when it returns null. Use from
 *                       server components that want to fail closed
 *                       in the rare case middleware was bypassed.
 *
 * The authenticated app shell (`/(app)/layout.tsx`) no longer calls
 * `requireSession()` — middleware (`middleware.ts`) is the cheap
 * cookie gate at the edge, and `<AppShell>` does the real validation
 * client-side via `/api/auth/me`. This removes the ~1 s SSR-blocking
 * round-trip that used to delay every page-load HTML response.
 */
import { ApiError, isApiError } from "@/lib/api-errors";
import { me, type MeResponse } from "@/lib/esus";
import { getAccessToken } from "@/lib/session";
import { redirect } from "next/navigation";

export interface Session {
  accessToken: string;
  user: MeResponse;
}

export async function getSession(): Promise<Session | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;
  try {
    const user = await me(accessToken);
    return { accessToken, user };
  } catch (err) {
    if (isApiError(err) && err.status === 401) return null;
    // Network / 5xx — propagate so the caller can decide. Server
    // components should typically `try/catch` and render an error
    // boundary; API routes should re-throw to surface a 5xx upstream.
    throw err;
  }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

// Re-export so legacy code that imported the deprecated `EsusError`
// alias keeps compiling.
export { ApiError };
