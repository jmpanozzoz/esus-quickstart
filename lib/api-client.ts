/**
 * Fully-typed client over the auto-generated OpenAPI paths.
 *
 * Two usage tracks live side-by-side in this repo:
 *
 *   1. Simple / didactic (server-side):
 *        `fhirSearch<Encounter>("Encounter", { _count: 50 })`
 *      Hand-rolled, short, easy to read. Use from server components.
 *
 *   2. Fully typed (any context, any endpoint):
 *        const { data } = await apiClient.GET("/fhir/Encounter", {
 *          params: { query: { _count: 50 } },
 *        });
 *      Returns a strongly-typed response — the auto-completion knows
 *      every query param, header, and response shape declared on the
 *      Esus API. Best when you start touching less-common endpoints.
 *
 * Regenerate the underlying types with `npm run generate-api` after
 * bumping the API.
 */
import createClient from "openapi-fetch";
import type { paths } from "./api-types";

const API = process.env.ESUS_API_URL;
const APP_ID = process.env.ESUS_APP_ID;
const CLIENT_ID = process.env.ESUS_API_KEY_CLIENT_ID;
const KEY_SECRET = process.env.ESUS_API_KEY_SECRET;

if (typeof window === "undefined" && (!API || !APP_ID || !CLIENT_ID || !KEY_SECRET)) {
  // Server-side only — env vars never reach the browser. The warning
  // fires at import time so a missing var surfaces on the first
  // request, not after a confusing 401.
  // eslint-disable-next-line no-console
  console.warn("[api-client] ESUS_* env vars missing — copy .env.example to .env.local");
}

/**
 * Server-side typed client. Talks directly to the Esus API with the
 * tenant's API key. Do not import from a `"use client"` module —
 * the credentials must not ship to the browser.
 *
 * For browser code, hit `/api/fhir/[...path]` (the proxy), which
 * forwards through this same client.
 */
export const apiClient = createClient<paths>({
  baseUrl: API,
  headers: {
    "X-Api-Key": CLIENT_ID && KEY_SECRET ? `${CLIENT_ID}:${KEY_SECRET}` : "",
    "X-App-Id": APP_ID ?? "",
  },
});

/**
 * Re-export the generated types so consumer code can refer to a
 * specific endpoint's request/response shape without importing the
 * 2.8 MB types file directly. Examples:
 *
 *   import type { components, paths } from "@/lib/api-client";
 *   type Encounter = paths["/fhir/Encounter/{id}"]["get"]["responses"]["200"]["content"]["application/fhir+json"];
 *
 * For most lists, the handcrafted aliases in `lib/fhir-encounter.ts`
 * / `lib/fhir-helpers.ts` are friendlier — drop into the generated
 * paths only when the handcrafted ones don't cover what you need.
 */
export type { paths, components, operations } from "./api-types";
