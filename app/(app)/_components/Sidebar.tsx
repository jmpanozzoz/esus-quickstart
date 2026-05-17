"use client";

/**
 * Three-mode sidebar:
 *
 *  - **Desktop (>= 1025px)**: full sidebar by default; user can collapse
 *    to a 60px icon rail via the hover-revealed edge handle. Preference
 *    is persisted in localStorage.
 *  - **Tablet (768–1024px)**: forced icon rail; no toggle. The handle
 *    is hidden because there's no preference to remember.
 *  - **Mobile (<= 767px)**: sidebar is hidden in flow; a top bar in
 *    `<AppShell>` exposes a menu button that opens a drawer overlay
 *    on top of the content with a dimmed backdrop.
 *
 *  This mirrors the console (`esus-admin/src/components/app/Sidebar.tsx`)
 *  pattern so the two surfaces feel related. We deliberately skip
 *  Radix Tooltip — `title` attributes are good enough for an icon rail.
 */
import {
  Activity,
  CalendarDays,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  LayoutDashboard,
  type LucideIcon,
  LogOut,
  Settings,
  ShieldCheck,
  Stethoscope,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { EsusMark } from "../../_components/EsusMark";
import { useAuth, isStaffUser } from "@/lib/store";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true, this item is hidden for staff users (who have no patient consents). */
  hideForStaff?: boolean;
}

const NAV: NavItem[] = [
  { href: "/dashboard",     label: "Dashboard",     icon: LayoutDashboard },
  { href: "/appointments",  label: "Appointments",  icon: CalendarDays },
  { href: "/encounters",    label: "Encounters",    icon: Activity },
  { href: "/patients",      label: "Patients",      icon: Users },
  { href: "/practitioners", label: "Practitioners", icon: Stethoscope },
  // Only show Privacy to non-staff users (patients have consents to manage)
  { href: "/privacy",       label: "Privacy",       icon: ShieldCheck, hideForStaff: true },
  { href: "/settings",      label: "Settings",      icon: Settings },
];

const MY_PRACTICE_ENTRY = { href: "/my-practice", label: "My practice", icon: Stethoscope };

const NARROW_BP = "(max-width: 1024px)";
const MOBILE_BP = "(max-width: 767px)";
const COLLAPSED_KEY = "esus-quickstart-sidebar-collapsed";

function initialsOf(user: { firstName?: string | null; email: string }): string {
  const name = user.firstName?.trim();
  if (name) return name.slice(0, 2).toUpperCase();
  return user.email.slice(0, 2).toUpperCase();
}

export interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuth((s) => s.user);

  const [userCollapsed, setUserCollapsed] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      setUserCollapsed(localStorage.getItem(COLLAPSED_KEY) === "1");
    } catch {
      // localStorage unavailable (private mode, etc.) — defaults fine.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mqlNarrow = window.matchMedia(NARROW_BP);
    const mqlMobile = window.matchMedia(MOBILE_BP);
    const syncNarrow = () => setNarrow(mqlNarrow.matches);
    const syncMobile = () => {
      const m = mqlMobile.matches;
      setIsMobile(m);
      if (!m) setMobileOpen(false);
    };
    syncNarrow();
    syncMobile();
    mqlNarrow.addEventListener("change", syncNarrow);
    mqlMobile.addEventListener("change", syncMobile);
    return () => {
      mqlNarrow.removeEventListener("change", syncNarrow);
      mqlMobile.removeEventListener("change", syncMobile);
    };
  }, [setMobileOpen]);

  // Close drawer on Escape and on every route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  useEffect(() => {
    if (!isMobile || !mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobile, mobileOpen, setMobileOpen]);

  function toggleCollapsed() {
    const next = !userCollapsed;
    setUserCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
  }

  // Desktop/tablet in-flow rendering. On mobile the in-flow aside is hidden
  // (the drawer below handles it). On tablet `narrow` forces the rail.
  const collapsed = narrow || userCollapsed;

  return (
    <>
      {/* In-flow sidebar — hidden on mobile (handled by drawer). */}
      <aside
        className={cn(
          "group relative hidden h-full shrink-0 flex-col border-r border-neutral-200 bg-white transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[60px]" : "w-64",
        )}
      >
        <SidebarBody collapsed={collapsed} pathname={pathname} user={user} hydrated={hydrated} />

        {/* Desktop-only hover edge handle to toggle collapsed. */}
        {!narrow && (
          <div aria-hidden="true" className="absolute top-0 -right-px h-full w-3 cursor-pointer z-10">
            <span className="absolute right-0 top-0 h-full w-px bg-neutral-200 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label={userCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={userCollapsed ? "Expand" : "Collapse"}
              className="absolute left-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-content-center rounded-full border border-neutral-200 bg-white text-neutral-500 opacity-0 shadow-card transition-opacity duration-150 hover:border-neutral-300 hover:text-neutral-800 group-hover:opacity-100"
            >
              {userCollapsed ? <ChevronsRight className="h-3 w-3" /> : <ChevronsLeft className="h-3 w-3" />}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile drawer overlay. */}
      {isMobile && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
          />
          <aside
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-neutral-200 bg-white shadow-xl transition-transform duration-200 ease-out",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
            aria-hidden={!mobileOpen}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarBody collapsed={false} pathname={pathname} user={user} hydrated={hydrated} />
          </aside>
        </>
      )}
    </>
  );
}

function SidebarBody({
  collapsed,
  pathname,
  user,
  hydrated,
}: {
  collapsed: boolean;
  pathname: string;
  user: ReturnType<typeof useAuth.getState>["user"];
  hydrated: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2.5 py-5",
          collapsed ? "justify-center px-0" : "px-5",
        )}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 outline-none focus-visible:rounded-lg"
          aria-label="Esus Quickstart home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white shadow-card">
            <EsusMark className="h-4 w-4" />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-sm font-semibold tracking-tight text-neutral-900">Esus Quickstart</span>
              <span className="block text-[10px] uppercase tracking-[0.12em] text-neutral-500">
                BaaS reference app
              </span>
            </span>
          )}
        </Link>
      </div>

      <nav
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overflow-x-hidden pt-2",
          collapsed ? "px-[10px]" : "px-3",
        )}
      >
        {!collapsed && (
          <p className="px-2.5 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Platform
          </p>
        )}
        <ul className="space-y-0.5">
          {[...NAV.filter((item) => !(item.hideForStaff && isStaffUser(user))), ...(isStaffUser(user) ? [MY_PRACTICE_ENTRY] : [])].map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  // Disable prefetch: Next 15 default-prefetches every visible
                  // <Link>, which fires one full RSC SSR per sidebar entry on
                  // viewport (7+ background requests post-login). Cross-region
                  // those compete with the page's own data fetches and starve
                  // them on the Edge → API hop. Click-time fetch is fast
                  // enough because the layout is already mounted.
                  prefetch={false}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition-colors",
                    collapsed ? "h-9 w-9 justify-center" : "h-9 gap-2.5 px-2.5",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                  )}
                >
                  {active && !collapsed && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-brand-600" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-colors",
                      active ? "text-brand-600" : "text-neutral-400 group-hover:text-neutral-700",
                    )}
                    aria-hidden="true"
                  />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <UserMenu collapsed={collapsed} user={user} hydrated={hydrated} />
    </>
  );
}

function UserMenu({
  collapsed,
  user,
  hydrated,
}: {
  collapsed: boolean;
  user: ReturnType<typeof useAuth.getState>["user"];
  hydrated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Skeleton state — no user loaded yet. Always reserves the row's
  // height (~60px) so the drawer/sidebar doesn't visually jump when
  // the user data lands. The `hydrated` flag just controls whether we
  // animate the pulse (avoids SSR hydration mismatch).
  if (!user) {
    return (
      <div
        className={cn(
          "shrink-0 border-t border-neutral-200",
          collapsed ? "flex justify-center p-2" : "p-2",
        )}
        aria-hidden="true"
      >
        {collapsed ? (
          <div className={cn("h-9 w-9 rounded-full bg-neutral-100", hydrated && "animate-pulse")} />
        ) : (
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <div className={cn("h-8 w-8 shrink-0 rounded-full bg-neutral-100", hydrated && "animate-pulse")} />
            <div className="flex-1 space-y-1.5">
              <div className={cn("h-2.5 w-20 rounded bg-neutral-100", hydrated && "animate-pulse")} />
              <div className={cn("h-2 w-28 rounded bg-neutral-100", hydrated && "animate-pulse")} />
            </div>
          </div>
        )}
      </div>
    );
  }

  const displayName = user.firstName?.trim() || user.email.split("@")[0];

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative shrink-0 border-t border-neutral-200",
        collapsed ? "flex justify-center p-2" : "p-2",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={collapsed ? user.email : undefined}
        className={cn(
          "flex items-center rounded-lg transition-colors hover:bg-neutral-100",
          collapsed ? "h-10 w-10 justify-center" : "h-11 w-full gap-2.5 px-2",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full bg-brand-100 font-semibold text-brand-700",
            collapsed ? "h-7 w-7 text-[11px]" : "h-8 w-8 text-xs",
          )}
        >
          {initialsOf(user)}
        </span>
        {!collapsed && (
          <>
            <span className="flex min-w-0 flex-1 flex-col items-start leading-tight">
              <span className="w-full truncate text-xs font-medium text-neutral-900">{displayName}</span>
              <span className="w-full truncate text-[10px] text-neutral-500">{user.email}</span>
            </span>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden="true" />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            "absolute bottom-full z-30 mb-1.5 w-60 rounded-xl border border-neutral-200 bg-white p-1.5 shadow-card-hover",
            collapsed ? "left-full ml-1.5" : "left-2 right-2 w-auto",
          )}
        >
          <div className="flex items-center gap-2.5 px-2 py-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initialsOf(user)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-neutral-900">{displayName}</p>
              <p className="truncate text-xs text-neutral-500">{user.email}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-neutral-100" />
          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
