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

import useSWR, { mutate as globalMutate, type SWRConfiguration } from "swr";
import { fromResponse, networkError, type ApiError } from "@/lib/api-errors";
import type { BatchRequest, BatchResponseBundle, FhirBundle, FhirResource } from "@/lib/fhir";

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

async function batchFetcher(requests: BatchRequest[]): Promise<BatchResponseBundle> {
  let res: Response;
  try {
    res = await fetch("/api/fhir", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requests }),
    });
  } catch (cause) {
    throw networkError(cause);
  }
  if (!res.ok) throw await fromResponse(res);
  return res.json() as Promise<BatchResponseBundle>;
}

/**
 * Fan a list of FHIR sub-requests through a SINGLE round-trip and let
 * SWR cache the whole batch under one key. Use when a page would
 * otherwise fire ≥3 parallel `useFhirSearch` hooks against the same
 * tenant — the dashboard's 8-call fan-out is the canonical case.
 *
 * The returned bundle has one entry per request in the same order;
 * each entry's `resource` is the typed body (e.g. a search Bundle for
 * a GET, the created resource for a POST). Callers can map positionally
 * or write a helper that pairs labels with the request list.
 */
export function useFhirBatch(
  requests: BatchRequest[],
  options: SWRConfiguration<BatchResponseBundle, ApiError> = {},
) {
  // Stable key: stringify the request list. SWR dedupes identical
  // batches across components / re-renders. If the input order or
  // params change the key changes and SWR re-fetches.
  const key = `batch:${JSON.stringify(requests)}`;
  return useSWR<BatchResponseBundle, ApiError>(key, () => batchFetcher(requests), {
    revalidateOnFocus: false,
    keepPreviousData: true,
    ...options,
  });
}

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

/**
 * Bust every SWR cache entry that touches the given resource type.
 *
 * After a successful POST/PUT/PATCH, calling this from the form's
 * submit handler is what gets the new row into the next list-page
 * render. Without it, SWR sees the cached `/api/fhir/Appointment?…`
 * key from a previous visit and serves the stale bundle on
 * `router.push("/appointments")` — `revalidateOnFocus: false` +
 * `keepPreviousData: true` make the cache extra sticky on purpose
 * (avoids flicker on tab switches), so creates have to invalidate
 * explicitly.
 *
 * Matches both list keys (`/api/fhir/{Resource}…`) and the dashboard's
 * `batch:` keys (whose JSON body usually mentions the resource name).
 */
export function invalidateResource(resource: string): Promise<unknown> {
  return globalMutate(
    (key) =>
      typeof key === "string" &&
      (key.startsWith(`/api/fhir/${resource}`) || (key.startsWith("batch:") && key.includes(`"${resource}`))),
  );
}
