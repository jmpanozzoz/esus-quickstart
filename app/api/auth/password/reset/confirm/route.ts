import { isApiError } from "@/lib/api-errors";
import { confirmPasswordReset } from "@/lib/esus";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string; code?: string; newPassword?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.code || !body.newPassword) {
    return NextResponse.json(
      { error: "email, code, and newPassword are required" },
      { status: 400 },
    );
  }

  try {
    await confirmPasswordReset(body.email, body.code, body.newPassword);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage, fieldErrors: err.fieldErrors },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Password reset failed" }, { status: 500 });
  }
}
