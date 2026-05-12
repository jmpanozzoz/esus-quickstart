import { isApiError } from "@/lib/api-errors";
import { verifyEmail } from "@/lib/esus";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.code) {
    return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  }

  try {
    await verifyEmail(body.email, body.code);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage, fieldErrors: err.fieldErrors },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
