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
import type { FhirBundle, FhirResource } from "@/lib/fhir";

async function fhirFetcher<T = unknown>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    // Surface the FHIR OperationOutcome diagnostic when present so the
    // page can render a useful message instead of "Error".
    let detail: string | undefined;
    try {
      const body = (await res.json()) as { issue?: Array<{ diagnostics?: string }> };
      detail = body.issue?.[0]?.diagnostics;
    } catch {
      // non-JSON body — fall through to statusText
    }
    throw new Error(detail ?? `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
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
  options: SWRConfiguration<FhirBundle<T>> = {},
) {
  const key = buildPath(resource, params);
  return useSWR<FhirBundle<T>>(key, fhirFetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
    ...options,
  });
}

export function useFhirRead<T extends FhirResource = FhirResource>(
  resource: string,
  id: string | null | undefined,
  options: SWRConfiguration<T> = {},
) {
  const key = id ? `/api/fhir/${resource}/${id}` : null;
  return useSWR<T>(key, fhirFetcher, {
    revalidateOnFocus: false,
    ...options,
  });
}
