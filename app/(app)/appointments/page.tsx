"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirBundle, type FhirResource } from "@/lib/fhir";
import {
  type Appointment,
  extractRef,
  formatDateTime,
  isUpcoming,
  statusBadgeClass,
} from "@/lib/fhir-appointment";
import { formatName, type HumanName } from "@/lib/fhir-helpers";
import { useFhirSearch } from "@/lib/use-fhir";
import { CancelAppointmentButton } from "./_components/CancelAppointmentButton";

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

function buildNameMap(bundle: FhirBundle<NamedResource> | undefined): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of bundle?.entry ?? []) {
    if (e.resource.id) map.set(e.resource.id, formatName(e.resource.name));
  }
  return map;
}

export default function AppointmentsPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "upcoming";

  const params: Record<string, string | number | undefined> = {
    _count: 50,
    _sort: "date",
  };
  if (status === "upcoming") {
    params.date = `ge${new Date().toISOString()}`;
  } else if (status !== "all") {
    params.status = status;
  }

  // Three queries fire in parallel; the table only renders once all
  // three resolve so we can render the joined names without "—" flicker.
  // Skeleton stays put until then.
  const appointments = useFhirSearch<Appointment>("Appointment", params);
  const patients = useFhirSearch<NamedResource>("Patient", { _count: 100 });
  const practitioners = useFhirSearch<NamedResource>("Practitioner", { _count: 100 });

  const ready = !!appointments.data && !!patients.data && !!practitioners.data;
  const patientNames = buildNameMap(patients.data);
  const practitionerNames = buildNameMap(practitioners.data);

  const CANCELLED = new Set(["cancelled", "noshow", "entered-in-error"]);
  const rows = appointments.data
    ? entries(appointments.data).filter((a) => {
        if (status !== "upcoming") return true;
        if (!isUpcoming(a.start)) return false;
        return !CANCELLED.has(a.status ?? "");
      })
    : [];

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Appointments</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {ready ? (
              <>
                {rows.length} {rows.length === 1 ? "appointment" : "appointments"}
                {status !== "all" ? ` (${status})` : ""}.
              </>
            ) : (
              "Loading…"
            )}
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

      {appointments.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load appointments: {appointments.error.message}
        </div>
      ) : !ready ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
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
