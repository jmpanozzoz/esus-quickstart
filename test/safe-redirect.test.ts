import { describe, expect, it } from "bun:test";
import { safeRedirectPath } from "../lib/safe-redirect";

describe("safeRedirectPath (N30)", () => {
  it("keeps a local path, with query and fragment", () => {
    expect(safeRedirectPath("/appointments")).toBe("/appointments");
    expect(safeRedirectPath("/appointments?tab=past#top")).toBe("/appointments?tab=past#top");
  });

  it("refuses a protocol-relative URL", () => {
    // Reads as a HOST to a browser, not a path — the classic bypass of a
    // naive startsWith("/") check.
    expect(safeRedirectPath("//evil.test")).toBe("/");
    expect(safeRedirectPath("//evil.test/phish")).toBe("/");
  });

  it("refuses a backslash separator", () => {
    // Browsers normalise `\` to `/`, so `/\evil.test` is `//evil.test`.
    expect(safeRedirectPath("/\\evil.test")).toBe("/");
    expect(safeRedirectPath("/\\/evil.test")).toBe("/");
  });

  it("refuses an absolute URL whatever the scheme", () => {
    expect(safeRedirectPath("https://evil.test")).toBe("/");
    expect(safeRedirectPath("http://evil.test")).toBe("/");
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/");
    expect(safeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe("/");
  });

  it("refuses a percent-encoded separator", () => {
    // `/%2fevil.test` becomes `//evil.test` once decoded.
    expect(safeRedirectPath("/%2fevil.test")).toBe("/");
    expect(safeRedirectPath("/%5cevil.test")).toBe("/");
  });

  it("refuses a malformed escape rather than guessing", () => {
    expect(safeRedirectPath("/%")).toBe("/");
  });

  it("refuses control characters", () => {
    expect(safeRedirectPath("/ok\nSet-Cookie: x=1")).toBe("/");
    expect(safeRedirectPath("/ok\r\n/evil")).toBe("/");
  });

  it("falls back when there is nothing to redirect to", () => {
    expect(safeRedirectPath(null)).toBe("/");
    expect(safeRedirectPath(undefined)).toBe("/");
    expect(safeRedirectPath("")).toBe("/");
  });

  it("honours the caller's fallback", () => {
    expect(safeRedirectPath("//evil.test", "/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath(null, "/dashboard")).toBe("/dashboard");
  });
});
