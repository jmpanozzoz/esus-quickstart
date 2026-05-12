/**
 * Server-side FHIR client for the customer's backend (Next.js route
 * handlers + server components). Talks to /fhir/* on the Esus API using
 * an API key — the secret stays on the server, the browser never sees it.
 *
 * Use this from server components / route handlers. For browser code,
 * hit /api/fhir/[...path] (the proxy in app/api/fhir) which forwards
 * through this module so the same auth posture applies.
 *
 * All non-2xx responses throw an `ApiError` (see `lib/api-errors.ts`)
 * — same class the SWR hooks in `lib/use-fhir.ts` throw, so a single
 * error boundary or toast handler covers every code path.
 */

import { ApiError, fromResponse, networkError } from "./api-errors";

const API = process.env.ESUS_API_URL;
const APP_ID = process.env.ESUS_APP_ID;
const KEY_ID = process.env.ESUS_API_KEY_ID;
const KEY_SECRET = process.env.ESUS_API_KEY_SECRET;

/**
 * @deprecated Kept as a re-export so old call sites that referenced
 * `FhirError` still compile. New code should import `ApiError` from
 * `lib/api-errors` — it carries richer fields (`userMessage`,
 * `fieldErrors`, `kind`) and lines up with the SWR side.
 */
export type FhirError = ApiError;
export { ApiError };

export interface FhirBundle<T = FhirResource> {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  link?: { relation: string; url: string }[];
  entry?: { fullUrl?: string; resource: T }[];
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  meta?: { versionId?: string; lastUpdated?: string };
}

function authHeaders(): Record<string, string> {
  if (!API || !APP_ID || !KEY_ID || !KEY_SECRET) {
    throw new Error(
      "[fhir] Missing env: ESUS_API_URL / ESUS_APP_ID / ESUS_API_KEY_ID / ESUS_API_KEY_SECRET",
    );
  }
  return {
    "X-Api-Key": `${KEY_ID}:${KEY_SECRET}`,
    "X-App-Id": APP_ID,
    Accept: "application/fhir+json, application/json",
  };
}

type QueryParams = Record<string, string | number | string[] | undefined>;

async function request<T>(
  path: string,
  init: RequestInit & { query?: QueryParams } = {},
): Promise<T> {
  const { query, ...rest } = init;
  const qs = query
    ? "?" +
      new URLSearchParams(
        Object.entries(query).flatMap(([k, v]): [string, string][] => {
          if (v === undefined) return [];
          if (Array.isArray(v)) return v.map((x) => [k, String(x)]);
          return [[k, String(v)]];
        }),
      ).toString()
    : "";
  let res: Response;
  try {
    res = await fetch(`${API}${path}${qs}`, {
      ...rest,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
        ...(rest.headers as Record<string, string> | undefined),
      },
      cache: "no-store",
    });
  } catch (cause) {
    // DNS / TCP / CORS — no Response object. Funnel through the same
    // `ApiError` shape SWR throws so callers don't need to distinguish.
    throw networkError(cause);
  }
  if (!res.ok) throw await fromResponse(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export function fhirSearch<T extends FhirResource = FhirResource>(
  resourceType: string,
  params?: QueryParams,
): Promise<FhirBundle<T>> {
  return request<FhirBundle<T>>(`/fhir/${resourceType}`, { query: params });
}

export function fhirRead<T extends FhirResource = FhirResource>(
  resourceType: string,
  id: string,
): Promise<T> {
  return request<T>(`/fhir/${resourceType}/${id}`);
}

export function fhirCreate<T extends FhirResource = FhirResource>(
  resourceType: string,
  resource: Partial<T> & { resourceType: string },
): Promise<T> {
  return request<T>(`/fhir/${resourceType}`, {
    method: "POST",
    body: JSON.stringify(resource),
  });
}

export function fhirUpdate<T extends FhirResource = FhirResource>(
  resourceType: string,
  id: string,
  resource: Partial<T> & { resourceType: string; id: string },
): Promise<T> {
  return request<T>(`/fhir/${resourceType}/${id}`, {
    method: "PUT",
    body: JSON.stringify(resource),
  });
}

export function fhirPatch<T extends FhirResource = FhirResource>(
  resourceType: string,
  id: string,
  patch: Partial<T>,
): Promise<T> {
  return request<T>(`/fhir/${resourceType}/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export function fhirDelete(resourceType: string, id: string): Promise<void> {
  return request<void>(`/fhir/${resourceType}/${id}`, { method: "DELETE" });
}

export function entries<T extends FhirResource>(bundle: FhirBundle<T> | null | undefined): T[] {
  return bundle?.entry?.map((e) => e.resource) ?? [];
}
