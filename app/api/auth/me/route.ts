/**
 * Browser-side session check.
 *
 * The access cookie is `httpOnly` so JS can't read it directly to call
 * `/v1/auth/me` on the Esus API. This route is the thin proxy: it
 * reads the cookie server-side, hits `/v1/auth/me` with the bearer
 * token, and returns the body verbatim to the client.
 *
 *   200 + MeResponse   → caller is signed in
 *   401                → caller is signed out (cookie missing / expired)
 *
 * `<AppShell>` calls this on mount to hydrate the Zustand auth store.
 * It replaces the SSR-blocking `requireSession()` the layout used to
 * do, so HTML for protected routes can ship instantly while the
 * session check happens in parallel with bundle load.
 */
import { isApiError } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(session.user);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status || 500 });
    }
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let body: { firstName?: string; lastName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const API = process.env.ESUS_API_URL;
    const APP_ID = process.env.ESUS_APP_ID;
    if (!API || !APP_ID) {
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    const res = await fetch(`${API}/v1/auth/me/profile`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": APP_ID,
        "Authorization": `Bearer ${session.accessToken}`,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      return NextResponse.json(
        { error: errBody?.message ?? "Profile update failed" },
        { status: res.status },
      );
    }
    const updated = await res.json();
    return NextResponse.json(updated);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status || 500 });
    }
    return NextResponse.json({ error: "Profile update failed" }, { status: 500 });
  }
}
