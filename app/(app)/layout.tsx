/**
 * Authenticated app shell.
 *
 *   Server side: `requireSession()` is the single auth gate for every
 *   page under `(app)/*`. Cookies stay on the server, no token is
 *   ever exposed to the browser. If the session is dead, redirect to
 *   /login before any markup is rendered.
 *
 *   Client side: `<AppShell>` receives the user we already fetched
 *   and hydrates the Zustand store with it. Pages under here are
 *   then `"use client"` + SWR — page chrome (sidebar, header) paints
 *   immediately on each navigation, data flies in async with
 *   skeletons. No more "blank screen until everything resolves".
 */
import { requireSession } from "@/lib/auth";
import type { ReactNode } from "react";
import { AppShell } from "./_components/AppShell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();
  return <AppShell initialUser={user}>{children}</AppShell>;
}
