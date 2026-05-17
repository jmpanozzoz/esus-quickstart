/**
 * GET /api/auth/me/consent
 *
 * Proxies to GET /v1/auth/me/Consent on the Esus API, returning the
 * patient's FHIR Consent bundle. The access token stays server-side.
 */
import { isApiError } from "@/lib/api-errors";
import { getSession } from "@/lib/auth";
import { getMyConsents } from "@/lib/esus";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const bundle = await getMyConsents(session.accessToken);
    return NextResponse.json(bundle);
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json({ error: err.userMessage }, { status: err.status || 500 });
    }
    return NextResponse.json({ error: "Failed to load consents" }, { status: 500 });
  }
}
