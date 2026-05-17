/**
 * Browser → server FHIR proxy. Client components hit /api/fhir/<...> and
 * this route forwards to the Esus FHIR endpoint with the server-side
 * API key, so the secret stays in the Next runtime.
 *
 * Add an auth check here (`requireSession()`) so an unauthenticated
 * tab can't use the proxy as an open relay against your tenant data.
 */
import { isApiError } from "@/lib/api-errors";
import { requireSession } from "@/lib/auth";
import { fhirCreate, fhirDelete, fhirPatch, fhirRead, fhirSearch, fhirUpdate } from "@/lib/fhir";
import { NextResponse } from "next/server";

export const runtime = "edge";

type Ctx = { params: Promise<{ path: string[] }> };

function asObj(req: Request): Record<string, string> {
  const params: Record<string, string> = {};
  const url = new URL(req.url);
  for (const [k, v] of url.searchParams.entries()) params[k] = v;
  return params;
}

function errResponse(err: unknown) {
  if (isApiError(err)) {
    // Forward the FHIR `OperationOutcome` verbatim when present so the
    // SWR client-side fetcher can parse the same `diagnostics` /
    // `expression` fields it normally would. Status mirrors the upstream.
    //
    // For 403s, also surface `diagnostic` at the top level so developers
    // inspecting the raw response body immediately see the patient-scope
    // reason (e.g. "Patient-scoped token: access restricted to the linked
    // patient") instead of having to drill into issue[0].diagnostics.
    const body =
      err.outcome ?? { resourceType: "OperationOutcome", issue: [{ severity: "error", diagnostics: err.userMessage }] };
    const extra = err.status === 403 && err.diagnostic ? { diagnostic: err.diagnostic } : {};
    return NextResponse.json({ ...body, ...extra }, { status: err.status || 500 });
  }
  return NextResponse.json({ error: "fhir request failed" }, { status: 500 });
}

export async function GET(req: Request, ctx: Ctx) {
  const session = await requireSession();
  const { path } = await ctx.params;
  const [resourceType, id] = path;
  const opts = session.user.patientId ? { appUserId: session.user.id } : undefined;
  try {
    let params = asObj(req);
    // For Patient searches without an explicit _id filter, scope to the session
    // user's own patient so the API's patient-scope guard doesn't 403 the request.
    if (resourceType === "Patient" && !id && opts && !params._id && !params.id) {
      params = { ...params, _id: session.user.patientId! };
    }
    const data = id
      ? await fhirRead(resourceType, id, opts)
      : await fhirSearch(resourceType, params, opts);
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function POST(req: Request, ctx: Ctx) {
  await requireSession();
  const { path } = await ctx.params;
  const [resourceType] = path;
  try {
    const body = await req.json();
    const data = await fhirCreate(resourceType, body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return errResponse(err);
  }
}

export async function PUT(req: Request, ctx: Ctx) {
  await requireSession();
  const { path } = await ctx.params;
  const [resourceType, id] = path;
  try {
    const body = await req.json();
    const data = await fhirUpdate(resourceType, id, body);
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function PATCH(req: Request, ctx: Ctx) {
  await requireSession();
  const { path } = await ctx.params;
  const [resourceType, id] = path;
  try {
    const body = await req.json();
    const data = await fhirPatch(resourceType, id, body);
    return NextResponse.json(data);
  } catch (err) {
    return errResponse(err);
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  await requireSession();
  const { path } = await ctx.params;
  const [resourceType, id] = path;
  try {
    await fhirDelete(resourceType, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return errResponse(err);
  }
}
