/**
 * Server-side proxy for GET /v1/auth/patient-invite/:token
 *
 * This is a public endpoint — no auth cookie required. It lets the
 * signup page validate an invite token and retrieve the pre-linked
 * email address without ever exposing ESUS_APP_ID to the browser.
 */
export const runtime = "edge";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;

  const apiUrl = process.env.ESUS_API_URL;
  const appId = process.env.ESUS_APP_ID;

  if (!apiUrl || !appId) {
    return Response.json(
      { error: "Server misconfiguration: missing ESUS_API_URL or ESUS_APP_ID" },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}/v1/auth/patient-invite/${encodeURIComponent(token)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": appId,
      },
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "Failed to reach authentication server" }, { status: 502 });
  }

  if (!res.ok) {
    // 404 = expired or invalid token; surface a friendly message.
    return Response.json(
      { error: "Invitation not found or expired" },
      { status: 404 },
    );
  }

  const data = await res.json();
  return Response.json(data);
}
