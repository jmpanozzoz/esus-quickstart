/**
 * Security headers live here rather than in `middleware.ts` on purpose:
 * the middleware matcher is an explicit allow-list of authenticated
 * routes, so a page added later (or any public route) would silently get
 * no headers at all. `headers()` applies to every response.
 *
 * This is a boilerplate: whatever it ships is what every derived app
 * starts with, so the baseline has to be the safe one.
 */

/** Cloudflare Turnstile, for the signup widget. */
const TURNSTILE = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  // Next inlines its bootstrap and hydration payload, so 'unsafe-inline'
  // is required until the app adopts a nonce (which needs the response to
  // be rendered per-request). It is still worth shipping the rest of the
  // policy: `object-src`, `base-uri` and `frame-ancestors` below do real
  // work regardless.
  `script-src 'self' 'unsafe-inline' ${TURNSTILE}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // The browser only ever talks to this origin: the FHIR proxy under
  // /api/* is what reaches the Esus API, so the key stays server-side.
  "connect-src 'self'",
  `frame-src ${TURNSTILE}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Clickjacking: this app renders patient data behind one-click actions.
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Redundant with frame-ancestors for modern browsers, kept for old ones.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Authenticated pages render patient data; never let a shared proxy or
  // the back/forward cache hold onto them.
  { key: "Cache-Control", value: "no-store" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        // Everything except Next's build assets, which are content-hashed
        // and must stay cacheable.
        source: "/((?!_next/static|_next/image).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
