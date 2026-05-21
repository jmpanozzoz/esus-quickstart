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
import { isApiError } from "@/lib/api-errors";
import { signup } from "@/lib/esus";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

// Required by @cloudflare/next-on-pages — every route handler ships
// as an edge worker. Plain `fetch` + `next/headers` cookies work in
// edge runtime; the only thing that wouldn't is node-only Node APIs
// (fs / Buffer's older shapes / etc.), which we don't use.
export const runtime = "edge";

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token }),
  });
  if (!res.ok) return false;
  const data = await res.json() as { success: boolean };
  return data.success === true;
}

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimit(`signup:${ip}`, 10, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 300) },
    });
  }

  let body: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    inviteToken?: string;
    turnstileToken?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  // Validate Turnstile when the secret is configured.
  // Fail-closed: missing token is rejected just like an invalid one.
  if (TURNSTILE_SECRET) {
    if (!body.turnstileToken) {
      return NextResponse.json({ error: "CAPTCHA token is required" }, { status: 400 });
    }
    const valid = await verifyTurnstile(body.turnstileToken);
    if (!valid) {
      return NextResponse.json({ error: "CAPTCHA verification failed" }, { status: 400 });
    }
  }

  try {
    const result = await signup(
      {
        email: body.email,
        password: body.password,
        ...(body.firstName ? { firstName: body.firstName } : {}),
        ...(body.lastName ? { lastName: body.lastName } : {}),
        ...(body.inviteToken ? { inviteToken: body.inviteToken } : {}),
      },
      body.turnstileToken,
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    // `ApiError` carries the parsed FHIR diagnostic + a friendly
    // fallback. Prefer the server's diagnostic when present (e.g.
    // "Email already registered"); otherwise fall back to the
    // kind-keyed `userMessage`.
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage, fieldErrors: err.fieldErrors },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Sign-up failed" }, { status: 500 });
  }
}
