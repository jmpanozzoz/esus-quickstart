/**
 * Tiny wrapper around the Esus BaaS HTTP API. Reads ESUS_API_URL +
 * ESUS_APP_ID from the environment so route handlers never have to
 * hard-code them. Throws an Error on non-2xx with the response body
 * attached — the route handler decides what to surface to the user.
 *
 * Intentionally NOT a published SDK. The whole point of this repo
 * is to show what an integration looks like at the HTTP level so a
 * customer can adapt it to their own stack (axios, fetch, ofetch,
 * whatever).
 */

const API = process.env.ESUS_API_URL;
const APP_ID = process.env.ESUS_APP_ID;
const CLIENT_ID = process.env.ESUS_API_KEY_CLIENT_ID;
const KEY_SECRET = process.env.ESUS_API_KEY_SECRET;

import { ApiError, fromResponse, networkError } from "./api-errors";

/**
 * @deprecated Use `ApiError` from `lib/api-errors`. Kept as a re-export
 * so old call sites compile while we migrate.
 */
export type EsusError = ApiError;
export { ApiError };

async function call<T>(path: string, init: RequestInit & { auth?: string } = {}): Promise<T> {
  // Validate at call time (not import time) so the Next.js build phase
  // can collect page data without crashing when env vars aren't present.
  // The first real request will surface a clear error if vars are missing.
  if (!API || !APP_ID) {
    throw new Error(
      `[esus] Missing required env: ${!API ? "ESUS_API_URL" : "ESUS_APP_ID"}. ` +
        "Copy .env.example to .env.local and fill in the values.",
    );
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Id": APP_ID,
    ...(init.headers as Record<string, string> | undefined),
  };
  if (init.auth) headers["Authorization"] = `Bearer ${init.auth}`;

  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { ...init, headers, cache: "no-store" });
  } catch (cause) {
    throw networkError(cause);
  }
  if (!res.ok) throw await fromResponse(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// ── Tenant auth ─────────────────────────────────────────────────────────────

export interface SignupBody {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  inviteToken?: string;
}

export interface SignupResult {
  appUserId: string;
  emailVerificationRequired: boolean;
}

export function signup(body: SignupBody, turnstileToken?: string): Promise<SignupResult> {
  const headers: Record<string, string> = {};
  if (turnstileToken) headers["cf-turnstile-token"] = turnstileToken;
  return call<SignupResult>("/v1/auth/signup", { method: "POST", body: JSON.stringify(body), headers });
}

export function verifyEmail(email: string, code: string): Promise<{ success: true }> {
  return call("/v1/auth/email/verify", {
    method: "POST",
    body: JSON.stringify({ email, code }),
  });
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
}

export function login(email: string, password: string): Promise<TokenResponse> {
  return call<TokenResponse>("/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function refresh(refreshToken: string): Promise<TokenResponse> {
  return call<TokenResponse>("/v1/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refreshToken }),
  });
}

export interface AppRole {
  name: string;
  /** When true, this role bypasses patient scoping — set by the tenant
   *  when creating the role. The BaaS never hardcodes which role names
   *  are staff; it's entirely tenant-defined. */
  isStaff?: boolean;
  permissions: { resource: string; action: string }[];
}

export interface MeResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  mfaEnabled: boolean;
  patientId: string | null;
  practitionerId: string | null;
  roles: AppRole[];
}

export function me(accessToken: string): Promise<MeResponse> {
  return call<MeResponse>("/v1/auth/me", { auth: accessToken });
}

// ── FHIR self-scoped reads ─────────────────────────────────────────────────

export interface FhirBundle<T = unknown> {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry?: { resource: T }[];
}

export function myObservations(accessToken: string): Promise<FhirBundle> {
  return call<FhirBundle>("/v1/auth/me/Observation", { auth: accessToken });
}

// ── Server-admin: patient linking ────────────────────────────────────────────

/**
 * Links an app user to a FHIR Patient resource. Must be called from a
 * server-side route handler — uses the API key credentials from env vars,
 * which must never be exposed to the browser.
 */
export async function linkUserToPatient(
  appUserId: string,
  patientId: string,
): Promise<{ id: string; email: string; patientId: string }> {
  if (!API || !APP_ID || !CLIENT_ID || !KEY_SECRET) {
    throw new Error(
      "[esus] Missing env: ESUS_API_URL / ESUS_APP_ID / ESUS_API_KEY_CLIENT_ID / ESUS_API_KEY_SECRET",
    );
  }
  let res: Response;
  try {
    res = await fetch(`${API}/v1/auth/users/${appUserId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": `${CLIENT_ID}:${KEY_SECRET}`,
        "X-App-Id": APP_ID,
      },
      body: JSON.stringify({ patientId }),
      cache: "no-store",
    });
  } catch (cause) {
    throw networkError(cause);
  }
  if (!res.ok) throw await fromResponse(res);
  return (await res.json()) as { id: string; email: string; patientId: string };
}
