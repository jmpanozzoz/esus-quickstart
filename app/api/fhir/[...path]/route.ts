/**
 * Browser → server FHIR proxy. Client components hit /api/fhir/<...> and
 * this route forwards to the Esus FHIR endpoint with the server-side
 * API key, so the secret stays in the Next runtime.
 *
 * Add an auth check here (`requireSession()`) so an unauthenticated
 * tab can't use the proxy as an open relay against your tenant data.
 */
import { requireSession } from "@/lib/auth";
import {
  type FhirError,
  fhirCreate,
  fhirDelete,
  fhirPatch,
  fhirRead,
  fhirSearch,
  fhirUpdate,
} from "@/lib/fhir";
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
  const e = err as FhirError;
  return NextResponse.json(e.body ?? { error: "fhir request failed" }, { status: e.status ?? 500 });
}

export async function GET(req: Request, ctx: Ctx) {
  await requireSession();
  const { path } = await ctx.params;
  const [resourceType, id] = path;
  try {
    const data = id ? await fhirRead(resourceType, id) : await fhirSearch(resourceType, asObj(req));
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
