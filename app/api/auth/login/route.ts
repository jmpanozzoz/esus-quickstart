import { isApiError } from "@/lib/api-errors";
import { login } from "@/lib/esus";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { setTokens } from "@/lib/session";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 60) },
    });
  }
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
    const tokens = await login(body.email, body.password);
    if ("mfaRequired" in tokens) {
      // Store the short-lived mfaToken in an httpOnly cookie so the MFA verify
      // step can use it without exposing it to client JS.
      const res = NextResponse.json({ mfaRequired: true });
      res.cookies.set("esus_mfa_token", tokens.mfaToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: tokens.expiresIn,
      });
      return res;
    }
    await setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage, fieldErrors: err.fieldErrors },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
