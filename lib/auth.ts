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
import type { FhirCallOptions } from "@/lib/fhir";
import { getAccessToken } from "@/lib/session";
import { isStaffUser } from "@/lib/store";
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

/**
 * Patient scope for a FHIR call made on behalf of `session`.
 *
 * **Pass the result to every `lib/fhir` call — reads, writes and batches
 * alike.** The proxy talks to the API with a machine-to-machine API key
 * whose privilege is the whole tenant. `X-App-User-Id` is what narrows a
 * call down to one patient, so omitting it does not mean "no scope", it
 * means *full-tenant access*: an end user could read and write every
 * patient in the organization.
 *
 * For non-staff users we always send the header, even when the account has
 * no linked patient yet. The API is fail-closed on that case (an unknown,
 * non-member or unlinked app user is denied PHI outright), so sending it is
 * always safer than leaving it off.
 *
 * Staff users (a practitioner, or a role the tenant marked `isStaff`) read
 * across the organization by design, subject to consent-based ABAC on the
 * API side, so they get no patient scope here.
 */
export function fhirScopeFor(session: Session): FhirCallOptions | undefined {
  if (isStaffUser(session.user)) return undefined;
  return { appUserId: session.user.id };
}

// Re-export so legacy code that imported the deprecated `EsusError`
// alias keeps compiling.
export { ApiError };
