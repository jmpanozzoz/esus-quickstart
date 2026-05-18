import { isApiError } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { currentPassword?: string; newPassword?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body.currentPassword || !body.newPassword) {
      return NextResponse.json(
        { error: "currentPassword and newPassword are required" },
        { status: 400 },
      );
    }

    const API = process.env.ESUS_API_URL;
    const APP_ID = process.env.ESUS_APP_ID;
    if (!API || !APP_ID) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const res = await fetch(`${API}/v1/auth/password/change`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": APP_ID,
        "Authorization": `Bearer ${session.accessToken}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      return NextResponse.json(
        { error: errBody?.message ?? "Password change failed" },
        { status: res.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status || 500 });
    }
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}
