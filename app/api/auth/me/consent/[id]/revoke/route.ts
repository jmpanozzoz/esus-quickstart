/**
 * POST /api/auth/me/consent/[id]/revoke
 *
 * Proxies to POST /v1/auth/me/consent/:id/revoke on the Esus API.
 * The access token stays server-side; the browser only sees a 204 on
 * success or a JSON error body on failure.
 */
import { isApiError } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { revokeConsent } from "@/lib/esus";
import { NextResponse } from "next/server";

export const runtime = "edge";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await ctx.params;
    await revokeConsent(session.accessToken, id);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status || 500 });
    }
    return NextResponse.json({ error: "Failed to revoke consent" }, { status: 500 });
  }
}
