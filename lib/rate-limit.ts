/**
 * Simple in-process sliding-window rate limiter for edge/Node.js route handlers.
 *
 * Works correctly in single-instance deployments (standard Next.js, single
 * Cloudflare Worker instance per colo). In truly distributed deployments
 * replace with Upstash Redis (`@upstash/ratelimit`) or rely on Cloudflare
 * Rate Limiting rules at the infrastructure level.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const existing = store.get(key);

  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  existing.count += 1;
  if (existing.count > maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  return { allowed: true };
}

/**
 * Returns the best available client IP from the request headers.
 * Prefers `cf-connecting-ip` (Cloudflare-injected, cannot be spoofed by the
 * client) then falls back to the first entry of `x-forwarded-for`.
 */
export function getRequestIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}
