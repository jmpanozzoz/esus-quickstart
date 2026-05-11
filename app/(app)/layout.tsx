/**
 * Authenticated app shell — sidebar + main content. The `requireSession`
 * call here is the single auth gate for /dashboard, /patients,
 * /practitioners, etc. Individual pages don't repeat it.
 */
import { requireSession } from "@/lib/auth";
import type { ReactNode } from "react";
import { Sidebar } from "./_components/Sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireSession();
  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
