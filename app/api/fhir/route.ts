/**
 * Browser → server FHIR **batch** proxy. The `[...path]` route next
 * door handles single-resource CRUD; this one handles the root
 * `POST /fhir` that takes a `Bundle` of type `batch` and returns a
 * `Bundle` of responses.
 *
 * Why a separate file: Next's catch-all `[...path]` requires at least
 * one segment, so a request to `/api/fhir` (no resource type) doesn't
 * match it.
 */
import { isApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth";
import { fhirBatch, type BatchRequest } from "@/lib/fhir";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  await requireSession();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  // Accept either the raw FHIR Bundle shape (resourceType + entry) or
  // the shorthand `{ requests: BatchRequest[] }` for callers that
  // prefer to build the array client-side.
  let requests: BatchRequest[];
  if (Array.isArray((body as { requests?: BatchRequest[] }).requests)) {
    requests = (body as { requests: BatchRequest[] }).requests;
  } else if (Array.isArray((body as { entry?: { request: BatchRequest }[] }).entry)) {
    requests = (body as { entry: { request: BatchRequest }[] }).entry.map((e) => e.request);
  } else {
    return NextResponse.json({ error: "Expected { requests: BatchRequest[] }" }, { status: 400 });
  }
  try {
    const bundle = await fhirBatch(requests);
    return NextResponse.json(bundle);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        err.outcome ?? {
          resourceType: "OperationOutcome",
          issue: [{ severity: "error", diagnostics: err.userMessage }],
        },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Batch request failed" }, { status: 500 });
  }
}
