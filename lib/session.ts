/**
 * Cookie helpers that store the Esus tokens on the customer's own
 * domain. We use `httpOnly` so the access token can't be read by JS
 * (XSS doesn't yield a working token) and `sameSite=lax` so the
 * cookie rides on top-level navigations from your domain.
 *
 * The names are deliberately scoped (`esus_access`, `esus_refresh`)
 * to avoid collisions with the host app's own auth, and carry the
 * `__Host-` prefix in production — see `lib/cookies.ts`.
 */
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  ACCESS_COOKIE_NAMES,
  COOKIE_BASE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_NAMES,
  REFRESH_MAX_AGE,
} from "./cookies";

export async function setTokens(accessToken: string, refreshToken: string, expiresIn: number): Promise<void> {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, { ...COOKIE_BASE, maxAge: expiresIn });
  // The API's refresh endpoint issues a new refresh token on every call
  // (rotation), so an active user's window slides forward automatically.
  // 7 days limits the blast radius of a stolen cookie compared to the
  // API's maximum 30-day server-side TTL.
  jar.set(REFRESH_COOKIE, refreshToken, { ...COOKIE_BASE, maxAge: REFRESH_MAX_AGE });
}

export async function clearTokens(): Promise<void> {
  const jar = await cookies();
  // Clear every name, prefixed and bare — a logout that leaves the legacy
  // cookie behind leaves a working session behind.
  for (const name of [...ACCESS_COOKIE_NAMES, ...REFRESH_COOKIE_NAMES]) jar.delete(name);
}

export async function getAccessToken(): Promise<string | null> {
  const jar = await cookies();
  for (const name of ACCESS_COOKIE_NAMES) {
    const value = jar.get(name)?.value;
    if (value) return value;
  }
  return null;
}
