/**
 * Session cookie names and attributes, in one place so the middleware and
 * the server helpers cannot drift apart.
 *
 * In production the names carry the `__Host-` prefix. The prefix is a
 * browser-enforced contract: the cookie must be `Secure`, `Path=/`, and
 * carry no `Domain`. That last part is the point — without it, any
 * subdomain (including one an attacker gets hold of, or a stray staging
 * host) can set a `Domain=.example.com` cookie of the same name and
 * overwrite the session. `__Host-` makes that impossible at the browser.
 *
 * The prefix cannot be used over plain HTTP, so local development keeps
 * the bare names and both are read back.
 */
const SECURE_COOKIES = process.env.NODE_ENV === "production";

const BARE_ACCESS = "esus_access";
const BARE_REFRESH = "esus_refresh";

export const ACCESS_COOKIE = SECURE_COOKIES ? `__Host-${BARE_ACCESS}` : BARE_ACCESS;
export const REFRESH_COOKIE = SECURE_COOKIES ? `__Host-${BARE_REFRESH}` : BARE_REFRESH;

/**
 * Every name a session cookie may go by. Reads must try all of them: a
 * browser holding a bare cookie from before this change still has a valid
 * session, and dropping it would log everyone out on deploy.
 */
export const ACCESS_COOKIE_NAMES = [ACCESS_COOKIE, BARE_ACCESS];
export const REFRESH_COOKIE_NAMES = [REFRESH_COOKIE, BARE_REFRESH];

export const COOKIE_BASE = {
  httpOnly: true,
  sameSite: "lax",
  secure: SECURE_COOKIES,
  // `__Host-` requires exactly this path and no domain.
  path: "/",
} as const;

/** 7 days. Rotation slides an active user's window forward. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;
