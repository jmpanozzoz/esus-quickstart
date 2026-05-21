/**
 * Cookie helpers that store the Esus tokens on the customer's own
 * domain. We use `httpOnly` so the access token can't be read by JS
 * (XSS doesn't yield a working token) and `sameSite=lax` so the
 * cookie rides on top-level navigations from your domain.
 *
 * The names are deliberately scoped (`esus_access`, `esus_refresh`)
 * to avoid collisions with the host app's own auth.
 */
import { cookies } from "next/headers";

const ACCESS_COOKIE = "esus_access";
const REFRESH_COOKIE = "esus_refresh";

export async function setTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: expiresIn,
  });
  jar.set(REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // 7 days. The API's refresh endpoint issues a new refresh token on
    // every call (rotation), so an active user's window slides forward
    // automatically. 7 days limits the blast radius of a stolen cookie
    // compared to the API's maximum 30-day server-side TTL.
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearTokens(): Promise<void> {
  const jar = await cookies();
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(ACCESS_COOKIE)?.value ?? null;
}
