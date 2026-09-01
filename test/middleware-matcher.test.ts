import { describe, expect, it } from "bun:test";
import { config } from "../middleware";

/**
 * The matcher is an exclusion list: everything is gated unless it matches an
 * exemption, so a new authenticated route is protected without touching this
 * file. The exemptions used to match by PREFIX (N24) — `/verify` exempted
 * `/verify-payment` too.
 */
const matcher = new RegExp(`^${config.matcher[0]}$`);
const gated = (path: string) => matcher.test(path);

describe("middleware matcher (N24)", () => {
  it("gates ordinary app routes", () => {
    expect(gated("/dashboard")).toBe(true);
    expect(gated("/appointments/123")).toBe(true);
  });

  it("gates a route that merely starts like an exempt one", () => {
    expect(gated("/verify-payment")).toBe(true);
    expect(gated("/signup-complete")).toBe(true);
    expect(gated("/logindetails")).toBe(true);
  });

  it("still exempts the real auth pages and their subpaths", () => {
    expect(gated("/login")).toBe(false);
    expect(gated("/signup")).toBe(false);
    expect(gated("/verify")).toBe(false);
    expect(gated("/verify-mfa")).toBe(false);
    expect(gated("/forgot-password")).toBe(false);
    expect(gated("/reset-password")).toBe(false);
    expect(gated("/reset-password/step-2")).toBe(false);
  });

  it("still exempts Next internals and API routes from the auth gate", () => {
    expect(gated("/_next/static/chunk.js")).toBe(false);
    expect(gated("/_next/image")).toBe(false);
    expect(gated("/favicon.ico")).toBe(false);
    expect(gated("/api/auth/login")).toBe(false);
  });

  it("matches /api/* separately so the CSRF check still sees it", () => {
    expect(config.matcher).toContain("/api/:path*");
  });
});
