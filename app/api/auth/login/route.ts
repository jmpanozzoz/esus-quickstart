import { type EsusError, login } from "@/lib/esus";
import { setTokens } from "@/lib/session";
import { NextResponse } from "next/server";

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
    const tokens = await login(body.email, body.password);
    if ("mfaRequired" in tokens) {
      // For a quickstart we keep MFA out of scope. A real app would
      // POST to /v1/auth/mfa/verify with the user's TOTP code here.
      return NextResponse.json({ error: "MFA is enabled for this account — out of scope for the quickstart" }, { status: 400 });
    }
    await setTokens(tokens.accessToken, tokens.refreshToken, tokens.expiresIn);
    return NextResponse.json({ success: true });
  } catch (err) {
    const e = err as EsusError;
    const detail =
      typeof e.body === "object" && e.body && "issue" in e.body
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e.body as any).issue?.[0]?.diagnostics
        : undefined;
    return NextResponse.json({ error: detail ?? `Login failed (${e.status ?? 500})` }, { status: e.status ?? 500 });
  }
}
