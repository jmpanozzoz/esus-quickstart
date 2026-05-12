/**
 * Tiny SWR wrapper for the FHIR proxy. Pages call `useFhirSearch` /
 * `useFhirRead` instead of doing `await fhirSearch(...)` in a server
 * component, which is what made the original quickstart feel slow: a
 * server-side fetch blocked the HTML response until the FHIR call
 * returned, so the browser saw a blank page for ~1s before the first
 * byte of content.
 *
 * Going through SWR moves the fetch to the browser:
 *   - Page chrome (sidebar, header, skeleton) paints on first commit
 *   - Data arrives a moment later, fades into place
 *   - Re-navigation between pages reuses the cached bundle until
 *     `mutate()` invalidates it
 *
 * The proxy at `/api/fhir/[...path]` does the auth + API-key forward;
 * we just pass the same query string we'd pass to `fhirSearch`.
 */
"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { fromResponse, networkError, type ApiError } from "@/lib/api-errors";
import type { FhirBundle, FhirResource } from "@/lib/fhir";

async function fhirFetcher<T = unknown>(url: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: "include" });
  } catch (cause) {
    throw networkError(cause);
  }
  if (!res.ok) throw await fromResponse(res);
  return res.json() as Promise<T>;
}

/** Re-export so consumer pages can type-narrow inside `if (error)`. */
export type { ApiError };

function buildPath(resource: string, params?: Record<string, string | number | string[] | undefined>): string {
  const usp = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      if (Array.isArray(v)) for (const item of v) usp.append(k, String(item));
      else usp.set(k, String(v));
    }
  }
  const qs = usp.toString();
  return `/api/fhir/${resource}${qs ? `?${qs}` : ""}`;
}

export function useFhirSearch<T extends FhirResource = FhirResource>(
  resource: string,
  params?: Record<string, string | number | string[] | undefined>,
  options: SWRConfiguration<FhirBundle<T>, ApiError> = {},
) {
  const key = buildPath(resource, params);
  return useSWR<FhirBundle<T>, ApiError>(key, fhirFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    ...options,
  });
}

export function useFhirRead<T extends FhirResource = FhirResource>(
  resource: string,
  id: string | null | undefined,
  options: SWRConfiguration<T, ApiError> = {},
) {
  const key = id ? `/api/fhir/${resource}/${id}` : null;
  return useSWR<T, ApiError>(key, fhirFetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}
