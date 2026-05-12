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
import { useEffect, type ReactNode } from "react";
import { fromResponse, networkError } from "@/lib/api-errors";
import type { MeResponse } from "@/lib/esus";
import { useAuth } from "@/lib/store";
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
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
