/**
 * Server-side proxy to Esus's /v1/auth/signup. We do this on the
 * server (not direct from the browser) for two reasons:
 *
 *   1. Keeps `ESUS_APP_ID` server-only — the browser never sees it.
 *      You COULD ship it client-side (it's not a secret) but
 *      keeping every BaaS call on the server lets you swap to a
 *      different transport later without rewriting the frontend.
 *
 *   2. When you add Cloudflare Turnstile, the bypass + verification
 *      logic lives here, not scattered in client components.
 */
import { type EsusError, signup } from "@/lib/esus";
import { NextResponse } from "next/server";

// Required by @cloudflare/next-on-pages — every route handler ships
// as an edge worker. Plain `fetch` + `next/headers` cookies work in
// edge runtime; the only thing that wouldn't is node-only Node APIs
// (fs / Buffer's older shapes / etc.), which we don't use.
export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  try {
    const result = await signup({ email: body.email, password: body.password });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const e = err as EsusError;
    const detail =
      typeof e.body === "object" && e.body && "issue" in e.body
        ? // Esus returns FHIR OperationOutcome; surface the first diagnostic.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e.body as any).issue?.[0]?.diagnostics
        : undefined;
    return NextResponse.json({ error: detail ?? `Sign-up failed (${e.status ?? 500})` }, { status: e.status ?? 500 });
  }
}
