"use client";

// `runtime = "edge"` applies to the route's *server* component (the
// shell that streams this client island), which Next.js still SSRs
// on each navigation. `@cloudflare/next-on-pages` rejects the build
// without it on any dynamic route.
export const runtime = "edge";

import Link from "next/link";
import { StatCardsSkeleton, TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirBundle, type FhirResource } from "@/lib/fhir";
import { type Appointment, extractRef, formatTime, isToday, statusBadgeClass } from "@/lib/fhir-appointment";
import { formatDate, formatGender, formatName, type HumanName } from "@/lib/fhir-helpers";
import { useAuth } from "@/lib/store";
import { useFhirSearch } from "@/lib/use-fhir";

interface Patient extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
}

/**
 * The old version of this page made 8 sequential `await fhirSearch(...)`
 * calls server-side before rendering. With api.esus.health TTFB at ~400ms
 * cross-region that meant the browser saw a blank screen for 1.5–2s.
 *
 * Now every query is a `useFhirSearch` hook — they fire in parallel on
 * mount, each with its own skeleton. The header (welcome line) paints
 * immediately from the Zustand-hydrated user; stat cards swap from
 * skeleton to numbers as their queries return; the "today's schedule"
 * and "recent patients" tables do the same.
 */
export default function DashboardPage() {
  const user = useAuth((s) => s.user);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const patientCount = useFhirSearch("Patient", { _summary: "count" });
  const practitionerCount = useFhirSearch("Practitioner", { _summary: "count" });
  const todayApptCount = useFhirSearch("Appointment", {
    _summary: "count",
    date: [`ge${todayStart.toISOString()}`, `lt${todayEnd.toISOString()}`],
  });
  const openEncounterCount = useFhirSearch("Encounter", {
    _summary: "count",
    status: "in-progress",
  });

  const recentPatients = useFhirSearch<Patient>("Patient", { _count: 5, _sort: "-_lastUpdated" });
  const todayAppts = useFhirSearch<Appointment>("Appointment", {
    date: `ge${todayStart.toISOString()}`,
    _count: 5,
    _sort: "date",
  });

  // Name lookups for the schedule rows. Pulled with `_count: 100` —
  // good enough for a small tenant; a real product would resolve names
  // via `_include` in a single call. Kept simple here for didactic
  // value; the speedup comes from running these in parallel.
  const allPatients = useFhirSearch<FhirResource & { name?: HumanName[] }>("Patient", { _count: 100 });
  const allPractitioners = useFhirSearch<FhirResource & { name?: HumanName[] }>("Practitioner", { _count: 100 });

  const upcomingToday = (todayAppts.data ? entries(todayAppts.data) : []).filter((a) => isToday(a.start));
  const patientNames = nameMap(allPatients.data);
  const practitionerNames = nameMap(allPractitioners.data);

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

      {patientCount.data && practitionerCount.data && todayApptCount.data && openEncounterCount.data ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Patients" value={patientCount.data.total ?? 0} href="/patients" />
          <StatCard label="Practitioners" value={practitionerCount.data.total ?? 0} href="/practitioners" />
          <StatCard label="Today's appointments" value={todayApptCount.data.total ?? 0} href="/appointments" />
          <StatCard
            label="Open encounters"
            value={openEncounterCount.data.total ?? 0}
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
        {!todayAppts.data ? (
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
        {!recentPatients.data ? (
          <TableSkeleton rows={3} />
        ) : entries(recentPatients.data).length === 0 ? (
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
            {entries(recentPatients.data).map((p) => (
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
