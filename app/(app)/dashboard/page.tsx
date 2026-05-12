"use client";

// `runtime = "edge"` applies to the route's *server* component (the
// shell that streams this client island), which Next.js still SSRs
// on each navigation. `@cloudflare/next-on-pages` rejects the build
// without it on any dynamic route.
export const runtime = "edge";

import {
  Activity,
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  Stethoscope,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { StatCardsSkeleton, TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirBundle, type FhirResource } from "@/lib/fhir";
import { type Appointment, extractRef, formatTime, isToday, statusBadgeClass } from "@/lib/fhir-appointment";
import { formatDate, formatGender, formatName, type HumanName } from "@/lib/fhir-helpers";
import { useAuth } from "@/lib/store";
import { useFhirBatch } from "@/lib/use-fhir";

interface Patient extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
}

/**
 * Performance-tuned dashboard.
 *
 * The original version made 8 sequential `await fhirSearch(...)` calls
 * server-side. The first refactor moved them to client-side SWR hooks
 * to unblock first paint, but cross-region the 8 concurrent requests
 * still stair-stepped to ~7s of fanned-out latency (instrumented via
 * the Performance API on demo.esus.health). The Edge Worker → DO NYC
 * upstream serialises HTTP/1.1 keepalive lanes under contention.
 *
 * Now everything goes through a single FHIR `Bundle` of type
 * `batch` (`POST /fhir`). One round-trip, all 8 sub-queries fan out
 * inside the API process. Stat cards + tables render together off
 * the same response — the header (welcome line) still paints
 * immediately from the Zustand-hydrated user.
 */
export default function DashboardPage() {
  const user = useAuth((s) => s.user);

  const { todayStartIso, todayEndIso } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { todayStartIso: start.toISOString(), todayEndIso: end.toISOString() };
  }, []);

  const batch = useFhirBatch(
    useMemo(
      () => [
        { method: "GET" as const, url: "Patient?_summary=count" },
        { method: "GET" as const, url: "Practitioner?_summary=count" },
        { method: "GET" as const, url: `Appointment?_summary=count&date=ge${todayStartIso}&date=lt${todayEndIso}` },
        { method: "GET" as const, url: "Encounter?_summary=count&status=in-progress" },
        { method: "GET" as const, url: "Patient?_count=5&_sort=-_lastUpdated" },
        { method: "GET" as const, url: `Appointment?date=ge${todayStartIso}&_count=5&_sort=date` },
        { method: "GET" as const, url: "Patient?_count=100" },
        { method: "GET" as const, url: "Practitioner?_count=100" },
      ],
      [todayStartIso, todayEndIso],
    ),
  );

  function entryAt<T extends FhirResource>(i: number): FhirBundle<T> | undefined {
    return batch.data?.entry?.[i]?.resource as FhirBundle<T> | undefined;
  }

  const patientCountBundle = entryAt(0);
  const practitionerCountBundle = entryAt(1);
  const todayApptCountBundle = entryAt(2);
  const openEncounterCountBundle = entryAt(3);
  const recentPatientsBundle = entryAt<Patient>(4);
  const todayApptsBundle = entryAt<Appointment>(5);
  const allPatientsBundle = entryAt<FhirResource & { name?: HumanName[] }>(6);
  const allPractitionersBundle = entryAt<FhirResource & { name?: HumanName[] }>(7);

  const ready = !!batch.data;
  const upcomingToday = (todayApptsBundle ? entries(todayApptsBundle) : []).filter((a) => isToday(a.start));
  const patientNames = nameMap(allPatientsBundle);
  const practitionerNames = nameMap(allPractitionersBundle);

  const greeting = greet();
  const displayName = user?.firstName ?? user?.email?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-brand-700">{greeting}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-900">
            Welcome back, {displayName}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {user ? (
              <>
                Signed in as <span className="font-mono text-neutral-700">{user.email}</span>
                {user.patientId ? <> · linked to Patient/{user.patientId.slice(0, 8)}…</> : null}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/patients/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300"
          >
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            New patient
          </Link>
          <Link
            href="/appointments/new"
            className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
            Schedule
          </Link>
        </div>
      </header>

      {ready ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Patients"
            value={patientCountBundle?.total ?? 0}
            href="/patients"
          />
          <StatCard
            icon={<Stethoscope className="h-4 w-4" />}
            label="Practitioners"
            value={practitionerCountBundle?.total ?? 0}
            href="/practitioners"
          />
          <StatCard
            icon={<CalendarDays className="h-4 w-4" />}
            label="Today's appointments"
            value={todayApptCountBundle?.total ?? 0}
            href="/appointments"
          />
          <StatCard
            icon={<Activity className="h-4 w-4" />}
            label="Open encounters"
            value={openEncounterCountBundle?.total ?? 0}
            href="/encounters?status=in-progress"
          />
        </section>
      ) : (
        <StatCardsSkeleton />
      )}

      <section className="space-y-3">
        <SectionHeader title="Today's schedule" href="/appointments" />
        {!ready ? (
          <TableSkeleton rows={3} />
        ) : upcomingToday.length === 0 ? (
          <EmptyTile
            title="Nothing scheduled today"
            description="Block out time for a patient — appointments are timezone-aware out of the box."
            cta={{ href: "/appointments/new", label: "Schedule an appointment" }}
          />
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
            {upcomingToday.map((a) => {
              const pid = extractRef(a.participant, "Patient/");
              const prid = extractRef(a.participant, "Practitioner/");
              const patientName = (pid && patientNames.get(pid)) ?? pid ?? "—";
              const practitionerName = (prid && practitionerNames.get(prid)) ?? prid ?? "—";
              return (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-brand-50/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-10 w-14 shrink-0 items-center justify-center rounded-lg bg-brand-50 font-mono text-xs font-semibold tabular-nums text-brand-700">
                      {formatTime(a.start)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-neutral-900">{patientName}</p>
                      <p className="truncate text-xs text-neutral-500">
                        with {practitionerName}
                        {a.description ? ` · ${a.description}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className={statusBadgeClass(a.status)}>{a.status ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <SectionHeader title="Recent patients" href="/patients" />
        {!ready ? (
          <TableSkeleton rows={3} />
        ) : !recentPatientsBundle || entries(recentPatientsBundle).length === 0 ? (
          <EmptyTile
            title="No patients yet"
            description="Create one from the console or POST to /fhir/Patient with your API key — it'll show up here."
            cta={{ href: "/patients/new", label: "Create your first patient" }}
          />
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
            {entries(recentPatientsBundle!).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-brand-50/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {initials(formatName(p.name))}
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/patients/${p.id}`}
                      className="block truncate font-medium text-neutral-900 hover:text-brand-700"
                    >
                      {formatName(p.name)}
                    </Link>
                    <p className="truncate text-xs text-neutral-500">
                      {formatGender(p.gender)} · {formatDate(p.birthDate)} ·{" "}
                      <code className="font-mono">{p.id?.slice(0, 8)}…</code>
                    </p>
                  </div>
                </div>
                <p className="shrink-0 text-xs text-neutral-500">{formatDate(p.meta?.lastUpdated)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function greet(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

function nameMap(bundle: FhirBundle<FhirResource & { name?: HumanName[] }> | undefined): Map<string, string> {
  if (!bundle) return new Map();
  return new Map(
    entries(bundle)
      .filter((p) => !!p.id)
      .map((p) => [p.id!, formatName(p.name)]),
  );
}

function SectionHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
      <Link
        href={href}
        className="group inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
      >
        View all
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </div>
  );
}

function EmptyTile({
  title,
  description,
  cta,
}: {
  title: string;
  description: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">{description}</p>
      {cta ? (
        <Link
          href={cta.href}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          {cta.label}
          <ArrowRight className="h-3 w-3" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  href,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  href?: string;
}) {
  const body = (
    <div className="group flex items-start justify-between gap-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-card transition-all hover:border-brand-200 hover:shadow-card-hover">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      </div>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
        {icon}
      </div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
