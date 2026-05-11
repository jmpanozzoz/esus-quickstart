import Link from "next/link";
import { entries, fhirSearch, type FhirResource } from "@/lib/fhir";
import {
  type Appointment,
  extractRef,
  formatDateTime,
  isUpcoming,
  statusBadgeClass,
} from "@/lib/fhir-appointment";
import { formatName, type HumanName } from "@/lib/fhir-helpers";
import { CancelAppointmentButton } from "./_components/CancelAppointmentButton";

export const runtime = "edge";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "booked", label: "Booked" },
  { value: "fulfilled", label: "Fulfilled" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

interface NamedResource extends FhirResource {
  id?: string;
  name?: HumanName[];
}

function buildNameMap(bundle: { entry?: { resource: NamedResource }[] } | null | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of bundle?.entry ?? []) {
    if (e.resource.id) map.set(e.resource.id, formatName(e.resource.name));
  }
  return map;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "upcoming" } = await searchParams;

  const params: Record<string, string | number | undefined> = {
    _count: 50,
    _sort: "date",
  };
  if (status === "upcoming") {
    params.date = `ge${new Date().toISOString()}`;
  } else if (status !== "all") {
    params.status = status;
  }

  const [appointmentsBundle, patientsBundle, practitionersBundle] = await Promise.all([
    fhirSearch<Appointment>("Appointment", params),
    fhirSearch<NamedResource>("Patient", { _count: 100 }),
    fhirSearch<NamedResource>("Practitioner", { _count: 100 }),
  ]);

  const patientNames = buildNameMap(patientsBundle);
  const practitionerNames = buildNameMap(practitionersBundle);

  const CANCELLED = new Set(["cancelled", "noshow", "entered-in-error"]);
  const rows = entries(appointmentsBundle).filter((a) => {
    if (status !== "upcoming") return true;
    if (!isUpcoming(a.start)) return false;
    return !CANCELLED.has(a.status ?? "");
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Appointments</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length} {rows.length === 1 ? "appointment" : "appointments"}
            {status !== "all" ? ` (${status})` : ""}.
          </p>
        </div>
        <Link
          href="/appointments/new"
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + New
        </Link>
      </header>

      <nav className="flex gap-1 border-b border-neutral-200">
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <Link
              key={t.value}
              href={t.value === "upcoming" ? "/appointments" : `/appointments?status=${t.value}`}
              className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
                active
                  ? "border-neutral-900 text-neutral-900"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
          <p className="font-medium text-neutral-900">
            No appointments {status === "upcoming" ? "upcoming" : `with status "${status}"`}.
          </p>
          <p className="mt-1 text-neutral-500">
            <Link href="/appointments/new" className="underline hover:text-neutral-700">
              Schedule one
            </Link>{" "}
            to populate this list.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-4 py-2.5">Practitioner</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((a) => {
                const pid = extractRef(a.participant, "Patient/");
                const prid = extractRef(a.participant, "Practitioner/");
                const patientName = (pid && patientNames.get(pid)) ?? "—";
                const practitionerName = (prid && practitionerNames.get(prid)) ?? "—";
                return (
                  <tr key={a.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 text-neutral-900">{formatDateTime(a.start)}</td>
                    <td className="px-4 py-2.5">
                      {pid ? (
                        <Link href={`/patients/${pid}`} className="text-neutral-800 hover:underline">
                          {patientName}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-neutral-800">{practitionerName}</td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {a.description ?? a.reasonCode?.[0]?.text ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={statusBadgeClass(a.status)}>{a.status ?? "—"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {a.id && a.status !== "cancelled" && a.status !== "fulfilled" ? (
                        <CancelAppointmentButton id={a.id} />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
