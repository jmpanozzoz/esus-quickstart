/**
 * Authenticated app shell.
 *
 * The gate moved out of this server layout. Previously this file
 * called `requireSession()` synchronously, which meant every HTML
 * response for `(app)/*` blocked on a ~1 s `/v1/auth/me` round-trip
 * to api.esus.health before any byte left the Edge Worker. That made
 * the quickstart feel ~1 s slower than the Astro console even though
 * they share the same API.
 *
 * Now:
 *   1. `middleware.ts` is the cheap edge gate — redirects to /login
 *      when neither cookie is present, auto-refreshes when only the
 *      access cookie is gone. No API call when both are still valid.
 *   2. `<AppShell>` is a client component that fetches `/api/auth/me`
 *      on mount and hydrates the Zustand auth store. HTML for this
 *      layout ships immediately; the user info (and the redirect on
 *      truly invalid cookies) lands a moment later, in parallel with
 *      JS bundle load.
 */
import type { ReactNode } from "react";
import { AppShell } from "./_components/AppShell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
