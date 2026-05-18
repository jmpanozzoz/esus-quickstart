import { isApiError } from "@/lib/api-errors";
import { resendVerification } from "@/lib/esus";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    await resendVerification(body.email);
    // API returns 202 regardless of whether the account exists (anti-enumeration)
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Failed to resend code" }, { status: 500 });
  }
}
