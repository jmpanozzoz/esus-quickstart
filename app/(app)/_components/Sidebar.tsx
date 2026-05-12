"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/store";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/appointments", label: "Appointments" },
  { href: "/encounters", label: "Encounters" },
  { href: "/patients", label: "Patients" },
  { href: "/practitioners", label: "Practitioners" },
];

export function Sidebar() {
  const pathname = usePathname();
  // Reads from the Zustand store hydrated by `<AppShell>`. If the
  // store hasn't been populated yet (very brief first-paint window),
  // render conservatively — the user block just stays empty for that
  // frame rather than crashing on `user.email`.
  const user = useAuth((s) => s.user);
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-neutral-200 bg-white">
      <div className="px-5 py-5">
        <Link href="/dashboard" className="text-base font-semibold text-neutral-900">
          Quickstart
        </Link>
        <p className="mt-0.5 text-[11px] uppercase tracking-wider text-neutral-500">Esus BaaS demo</p>
      </div>

      <nav className="flex-1 px-2">
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block rounded-md px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-neutral-900 text-white"
                      : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-neutral-200 px-4 py-4">
        <p className="truncate text-xs font-medium text-neutral-900">
          {user?.firstName ?? user?.email ?? " "}
        </p>
        <p className="truncate text-[11px] text-neutral-500">{user?.email ?? " "}</p>
        <form action="/api/auth/logout" method="POST" className="mt-3">
          <button
            type="submit"
            className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
