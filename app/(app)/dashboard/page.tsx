import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { fhirSearch, entries, type FhirResource } from "@/lib/fhir";
import { type Appointment, extractRef, formatTime, isToday, statusBadgeClass } from "@/lib/fhir-appointment";
import { formatDate, formatGender, formatName, type HumanName } from "@/lib/fhir-helpers";

export const runtime = "edge";

interface Patient extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
}

async function tryCount(
  resourceType: string,
  params: Record<string, string | number | string[] | undefined> = {},
): Promise<number> {
  try {
    const b = await fhirSearch(resourceType, { _summary: "count", ...params });
    return b.total ?? 0;
  } catch {
    return 0;
  }
}

export default async function DashboardPage() {
  const { user } = await requireSession();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  const emptyBundle = { resourceType: "Bundle" as const, type: "searchset" as const, total: 0, entry: [] };

  const [
    patientCount,
    practitionerCount,
    todayApptCount,
    openEncounterCount,
    recentPatients,
    todayAppts,
    allPatientsBundle,
    practitionersBundle,
  ] = await Promise.all([
    tryCount("Patient"),
    tryCount("Practitioner"),
    tryCount("Appointment", { date: [`ge${todayStart.toISOString()}`, `lt${todayEnd.toISOString()}`] }),
    tryCount("Encounter", { status: "in-progress" }),
    fhirSearch<Patient>("Patient", { _count: 5, _sort: "-_lastUpdated" }).catch(() => emptyBundle),
    fhirSearch<Appointment>("Appointment", {
      date: `ge${todayStart.toISOString()}`,
      _count: 5,
      _sort: "date",
    }).catch(() => emptyBundle),
    fhirSearch<{ id?: string; name?: HumanName[] }>("Patient", { _count: 100 }).catch(() => emptyBundle),
    fhirSearch<{ id?: string; name?: HumanName[] }>("Practitioner", { _count: 100 }).catch(() => emptyBundle),
  ]);

  const recent = entries(recentPatients);
  const upcomingToday = entries(todayAppts).filter((a) => isToday(a.start));
  const patientNames = new Map<string, string>(
    entries(allPatientsBundle)
      .filter((p) => !!p.id)
      .map((p) => [p.id!, formatName(p.name)]),
  );
  const practitionerNames = new Map<string, string>(
    entries(practitionersBundle)
      .filter((p) => !!p.id)
      .map((p) => [p.id!, formatName(p.name)]),
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Welcome, {user.firstName ?? user.email.split("@")[0]}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Signed in as <span className="font-mono">{user.email}</span>
          {user.patientId ? <> · linked to Patient/{user.patientId.slice(0, 8)}…</> : null}
        </p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Patients" value={patientCount} href="/patients" />
        <StatCard label="Practitioners" value={practitionerCount} href="/practitioners" />
        <StatCard label="Today's appointments" value={todayApptCount} href="/appointments" />
        <StatCard label="Open encounters" value={openEncounterCount} href="/encounters?status=in-progress" />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Today's schedule</h2>
          <Link href="/appointments" className="text-xs text-neutral-700 hover:text-neutral-900">
            View all →
          </Link>
        </div>
        {upcomingToday.length === 0 ? (
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
        {recent.length === 0 ? (
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
            {recent.map((p) => (
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
