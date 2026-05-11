import { type EsusError, verifyEmail } from "@/lib/esus";
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
    const e = err as EsusError;
    const detail =
      typeof e.body === "object" && e.body && "issue" in e.body
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e.body as any).issue?.[0]?.diagnostics
        : undefined;
    return NextResponse.json({ error: detail ?? `Verification failed (${e.status ?? 500})` }, { status: e.status ?? 500 });
  }
}
