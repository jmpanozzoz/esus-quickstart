/**
 * Reduces a caller-supplied redirect target to a same-origin path, or to a
 * fallback when it cannot.
 *
 * `?next=` is written by the middleware and by the app shell and read back
 * after login. Everything about it is attacker-controllable — it survives a
 * link the victim clicks — so it can never be handed to `router.push` as-is.
 * The failure modes worth naming, because a naive `startsWith("/")` check
 * catches none of them:
 *
 *   - `//evil.test`     — protocol-relative; a browser reads it as a HOST.
 *   - `/\evil.test`     — browsers normalise the backslash to `/`, same thing.
 *   - `https://evil...` — absolute URL.
 *   - `javascript:...`  — script execution on click.
 *
 * Only a path beginning with a single `/` followed by something that is not
 * another separator is accepted, and the query/fragment ride along.
 */
const DEFAULT_REDIRECT = "/";

export function safeRedirectPath(raw: string | null | undefined, fallback = DEFAULT_REDIRECT): string {
  if (!raw) return fallback;

  // A percent-encoded separator (`/%2fevil.test`) becomes one after the
  // browser decodes it, so decode before judging. A malformed escape is
  // reason enough to refuse.
  let candidate: string;
  try {
    candidate = decodeURIComponent(raw);
  } catch {
    return fallback;
  }

  candidate = candidate.trim();
  if (!candidate.startsWith("/")) return fallback;
  // `//host`, `/\host`, and any mix of the two.
  if (/^\/[/\\]/.test(candidate)) return fallback;
  // Control characters can be used to smuggle a line break past a naive
  // check further down the stack.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: that is the point
  if (/[\x00-\x1f\x7f]/.test(candidate)) return fallback;

  return candidate;
}
