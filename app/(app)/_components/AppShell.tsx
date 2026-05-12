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
import { Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
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

  useEffect(() => {
    let cancelled = false;
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
      .catch(() => {
        // Network / 5xx — swallow. The user can retry by reloading.
        // Sidebar will keep showing placeholders; pages that need
        // user info should render gracefully against `user === null`.
      });
    return () => {
      cancelled = true;
    };
  }, [hydrate]);

  // `h-screen overflow-hidden` pins the shell to the viewport; <main>
  // is the only scrollable region. Without this the sidebar grew
  // vertically on tall pages and trailed off the bottom.
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar mobileOpen={mobileNavOpen} setMobileOpen={setMobileNavOpen} />
      <div className="flex min-w-0 flex-1 flex-col">
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
