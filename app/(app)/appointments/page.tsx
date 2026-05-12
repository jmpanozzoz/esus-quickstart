"use client";

export const runtime = "edge";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
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
import { useFhirBatch } from "@/lib/use-fhir";
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

  // One round-trip for the three queries this page needs (the page +
  // patient name map + practitioner name map). FHIR `batch` collapses
  // them into a single Edge Worker → API hop so the table renders
  // without the stair-stepped TTFB seen with parallel SWR calls.
  const apptQs = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("_count", "50");
    usp.set("_sort", "date");
    if (status === "upcoming") usp.set("date", `ge${new Date().toISOString()}`);
    else if (status !== "all") usp.set("status", status);
    return usp.toString();
  }, [status]);

  const batch = useFhirBatch(
    useMemo(
      () => [
        { method: "GET" as const, url: `Appointment?${apptQs}` },
        { method: "GET" as const, url: "Patient?_count=100" },
        { method: "GET" as const, url: "Practitioner?_count=100" },
      ],
      [apptQs],
    ),
  );

  const appointmentsBundle = batch.data?.entry?.[0]?.resource as FhirBundle<Appointment> | undefined;
  const patientsBundle = batch.data?.entry?.[1]?.resource as FhirBundle<NamedResource> | undefined;
  const practitionersBundle = batch.data?.entry?.[2]?.resource as FhirBundle<NamedResource> | undefined;

  const ready = !!batch.data;
  const patientNames = buildNameMap(patientsBundle);
  const practitionerNames = buildNameMap(practitionersBundle);

  const CANCELLED = new Set(["cancelled", "noshow", "entered-in-error"]);
  const rows = appointmentsBundle
    ? entries(appointmentsBundle).filter((a) => {
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

      {batch.error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load appointments: {batch.error.userMessage}
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
