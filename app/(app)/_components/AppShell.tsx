"use client";

/**
 * Client-side authenticated shell.
 *
 * Pairs with the cheap edge gate in `middleware.ts`: if you got here
 * with a valid-looking cookie, this component verifies it with the
 * API (one `/api/auth/me` round-trip in parallel with the JS bundle
 * load) and hydrates the Zustand auth store. If the cookie turns
 * out to be invalid (401), it forces a redirect to /login — the only
 * place that signs the user out for real.
 *
 * The Sidebar and pages read user data from the Zustand store, so
 * everything paints the chrome immediately with placeholders and
 * fills in once `/api/auth/me` returns. No SSR-blocking call; HTML
 * for protected routes ships at the same speed as the unauthenticated
 * /login page.
 */
import { AlertCircle, Menu, RefreshCw } from "lucide-react";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { fromResponse, networkError } from "@/lib/api-errors";
import type { MeResponse } from "@/lib/esus";
import { useAuth } from "@/lib/store";
import { EsusMark } from "../../_components/EsusMark";
import { Sidebar } from "./Sidebar";

async function fetchSession(): Promise<MeResponse | null> {
  let res: Response;
  try {
    res = await fetch("/api/auth/me", { credentials: "include", cache: "no-store" });
  } catch (cause) {
    throw networkError(cause);
  }
  if (res.status === 401) return null;
  if (!res.ok) throw await fromResponse(res);
  return (await res.json()) as MeResponse;
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const loadSession = useCallback(() => {
    let cancelled = false;
    setSessionError(null);
    fetchSession()
      .then((user) => {
        if (cancelled) return;
        if (!user) {
          // Cookie was missing or invalid by the time the call landed.
          // Middleware already redirects when both cookies are absent,
          // so this branch covers the edge case where the access
          // cookie expired between middleware and this fetch AND the
          // refresh attempt failed silently.
          const next = encodeURIComponent(window.location.pathname + window.location.search);
          window.location.replace(`/login?next=${next}`);
          return;
        }
        hydrate(user);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Network / 5xx — show an error banner so the user isn't stuck
        // on a permanently empty shell with no feedback.
        const message =
          err instanceof Error ? err.message : "Could not load your session.";
        setSessionError(message);
      });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  useEffect(() => {
    return loadSession();
    // retryKey changes when the user clicks "Retry", triggering a re-run
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadSession, retryKey]);

  // `h-screen overflow-hidden` pins the shell to the viewport; <main>
  // is the only scrollable region. Without this the sidebar grew
  // vertically on tall pages and trailed off the bottom.
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Session error banner — shown when /api/auth/me fails with a
            network or server error. Lets the user retry or go to login. */}
        {sessionError && (
          <div className="flex shrink-0 items-start gap-3 border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />
            <div className="flex flex-1 flex-wrap items-center gap-x-3 gap-y-1">
              <span>Failed to load your session. {sessionError}</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRetryKey((k) => k + 1)}
                  className="inline-flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  Retry
                </button>
                <a
                  href="/login"
                  className="font-medium underline-offset-2 hover:underline"
                >
                  Go to sign in
                </a>
              </div>
            </div>
          </div>
        )}
        {/* Mobile top bar — only visible on small screens. The sidebar
            is off-canvas there, so this gives the user a way to summon
            it (and a visible brand mark while they're at it). */}
        <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileNavOpen}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
              <EsusMark className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold tracking-tight text-neutral-900">Quickstart</span>
          </div>
          <div className="w-9" aria-hidden="true" />
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
