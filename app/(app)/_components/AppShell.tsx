"use client";

/**
 * Client wrapper for the authenticated layout. The parent server layout
 * still calls `requireSession()` to gate the route (cookie validation
 * stays on the server), but it passes the fetched user down here as an
 * `initialUser` prop so the Zustand store hydrates immediately on
 * first render — no second `/v1/auth/me` round-trip from the client.
 *
 * After hydration, internal navigations between `(app)/*` pages don't
 * re-fetch the user (App Router keeps the layout mounted across route
 * changes). The Sidebar reads from the store instead of prop-drilling.
 */
import { useEffect, type ReactNode } from "react";
import type { MeResponse } from "@/lib/esus";
import { useAuth } from "@/lib/store";
import { Sidebar } from "./Sidebar";

export function AppShell({ initialUser, children }: { initialUser: MeResponse; children: ReactNode }) {
  const hydrate = useAuth((s) => s.hydrate);

  // `useState`-style "fire on first mount only". Re-running on every
  // render would be a no-op (same reference) but keeps the dep list
  // explicit for the linter.
  useEffect(() => {
    hydrate(initialUser);
  }, [hydrate, initialUser]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
