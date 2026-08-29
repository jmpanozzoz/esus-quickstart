import { isApiError } from "@/lib/api-errors";
import { mfaVerify } from "@/lib/esus";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { setTokens } from "@/lib/session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "edge";

const MFA_TOKEN_COOKIE = "esus_mfa_token";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimit(`mfa-verify:${ip}`, 5, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 300) },
    });
  }

  const jar = await cookies();
  const mfaToken = jar.get(MFA_TOKEN_COOKIE)?.value;
  if (!mfaToken) {
    return NextResponse.json(
      { error: "MFA session expired or missing. Please sign in again." },
      { status: 400 },
    );
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.code) {
    return NextResponse.json({ error: "code is required" }, { status: 400 });
  }

  try {
    const tokens = await mfaVerify(mfaToken, body.code);
    // Consume the MFA token — it's single-use
    jar.delete(MFA_TOKEN_COOKIE);
    await setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "MFA verification failed" }, { status: 500 });
  }
}
