"use client";

// `runtime = "edge"` applies to the route's *server* component (the
// shell that streams this client island), which Next.js still SSRs
// on each navigation. `@cloudflare/next-on-pages` rejects the build
// without it on any dynamic route.
export const runtime = "edge";

import Link from "next/link";
import { useMemo } from "react";
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

  const { todayStart, todayStartIso, todayEndIso } = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { todayStart: start, todayStartIso: start.toISOString(), todayEndIso: end.toISOString() };
  }, []);

  // One round-trip. Order matters: we read entries by index below.
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

  // Helper: pluck the i-th entry's resource bundle out of the batch
  // response, typed as a FHIR search Bundle of `T`.
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
  void todayStart; // kept for readability; only the ISO strings drive the keys

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Welcome, {user?.firstName ?? user?.email?.split("@")[0] ?? "back"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {user ? (
            <>
              Signed in as <span className="font-mono">{user.email}</span>
              {user.patientId ? <> · linked to Patient/{user.patientId.slice(0, 8)}…</> : null}
            </>
          ) : null}
        </p>
      </header>

      {ready ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Patients" value={patientCountBundle?.total ?? 0} href="/patients" />
          <StatCard label="Practitioners" value={practitionerCountBundle?.total ?? 0} href="/practitioners" />
          <StatCard label="Today's appointments" value={todayApptCountBundle?.total ?? 0} href="/appointments" />
          <StatCard
            label="Open encounters"
            value={openEncounterCountBundle?.total ?? 0}
            href="/encounters?status=in-progress"
          />
        </section>
      ) : (
        <StatCardsSkeleton />
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Today's schedule</h2>
          <Link href="/appointments" className="text-xs text-neutral-700 hover:text-neutral-900">
            View all →
          </Link>
        </div>
        {!ready ? (
          <TableSkeleton rows={3} />
        ) : upcomingToday.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
            <p className="font-medium text-neutral-900">Nothing scheduled today</p>
            <p className="mt-1 text-neutral-500">
              <Link href="/appointments/new" className="underline hover:text-neutral-700">
                Schedule an appointment
              </Link>
              .
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {upcomingToday.map((a) => {
              const pid = extractRef(a.participant, "Patient/");
              const prid = extractRef(a.participant, "Practitioner/");
              const patientName = (pid && patientNames.get(pid)) ?? pid ?? "—";
              const practitionerName = (prid && practitionerNames.get(prid)) ?? prid ?? "—";
              return (
                <li key={a.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900">
                      {formatTime(a.start)} · {patientName}
                    </p>
                    <p className="truncate text-xs text-neutral-500">
                      with {practitionerName}
                      {a.description ? ` · ${a.description}` : ""}
                    </p>
                  </div>
                  <span className={statusBadgeClass(a.status)}>{a.status ?? "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Recent patients</h2>
          <Link href="/patients" className="text-xs text-neutral-700 hover:text-neutral-900">
            View all →
          </Link>
        </div>
        {!ready ? (
          <TableSkeleton rows={3} />
        ) : !recentPatientsBundle || entries(recentPatientsBundle).length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
            <p className="font-medium text-neutral-900">No patients yet</p>
            <p className="mt-1 text-neutral-500">
              <Link href="/patients/new" className="underline hover:text-neutral-700">
                Create your first patient
              </Link>{" "}
              to populate the dashboard.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-lg border border-neutral-200 bg-white">
            {entries(recentPatientsBundle!).map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-neutral-900">{formatName(p.name)}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {formatGender(p.gender)} · {formatDate(p.birthDate)} ·{" "}
                    <code className="font-mono">{p.id?.slice(0, 8)}…</code>
                  </p>
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

function nameMap(bundle: FhirBundle<FhirResource & { name?: HumanName[] }> | undefined): Map<string, string> {
  if (!bundle) return new Map();
  return new Map(
    entries(bundle)
      .filter((p) => !!p.id)
      .map((p) => [p.id!, formatName(p.name)]),
  );
}

function StatCard({
  label,
  value,
  href,
  hint,
}: {
  label: string;
  value: number | string;
  href?: string;
  hint?: string;
}) {
  const body = (
    <div className="rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300">
      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-neutral-400">{hint}</p> : null}
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
