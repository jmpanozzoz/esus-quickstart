"use client";

export const runtime = "edge";

import { Activity, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirBundle, type FhirResource } from "@/lib/fhir";
import { formatDateTime } from "@/lib/fhir-appointment";
import {
  classLabel,
  encounterStatusBadge,
  patientRefId,
  practitionerRefId,
  type Encounter,
} from "@/lib/fhir-encounter";
import { formatName, type HumanName } from "@/lib/fhir-helpers";
import { useFhirBatch } from "@/lib/use-fhir";

const STATUS_TABS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in-progress", label: "In progress" },
  { value: "planned", label: "Planned" },
  { value: "finished", label: "Finished" },
  { value: "cancelled", label: "Cancelled" },
];

interface NamedResource extends FhirResource {
  id?: string;
  name?: HumanName[];
}

function nameMap(bundle: FhirBundle<NamedResource> | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of bundle?.entry ?? []) {
    if (e.resource.id) m.set(e.resource.id, formatName(e.resource.name));
  }
  return m;
}

export default function EncountersPage() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const encQs = useMemo(() => {
    const usp = new URLSearchParams();
    usp.set("_count", "50");
    usp.set("_sort", "-_lastUpdated");
    if (status !== "all") usp.set("status", status);
    return usp.toString();
  }, [status]);

  // One round-trip for the three queries this page needs — see the
  // dashboard's comment for the why behind FHIR batch.
  const batch = useFhirBatch(
    useMemo(
      () => [
        { method: "GET" as const, url: `Encounter?${encQs}` },
        { method: "GET" as const, url: "Patient?_count=100" },
        { method: "GET" as const, url: "Practitioner?_count=100" },
      ],
      [encQs],
    ),
  );

  const encountersBundle = batch.data?.entry?.[0]?.resource as FhirBundle<Encounter> | undefined;
  const patientsBundle = batch.data?.entry?.[1]?.resource as FhirBundle<NamedResource> | undefined;
  const practitionersBundle = batch.data?.entry?.[2]?.resource as FhirBundle<NamedResource> | undefined;

  const ready = !!batch.data;
  const rows = encountersBundle ? entries(encountersBundle) : [];
  const patientNames = nameMap(patientsBundle);
  const practitionerNames = nameMap(practitionersBundle);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Encounters</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {ready ? (
              <>
                {rows.length} {rows.length === 1 ? "encounter" : "encounters"}
                {status !== "all" ? ` · ${status}` : ""}.
              </>
            ) : (
              "Loading…"
            )}
          </p>
        </div>
        <Link
          href="/encounters/new"
          className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          New encounter
        </Link>
      </header>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-neutral-200 px-4 sm:mx-0 sm:px-0">
        {STATUS_TABS.map((t) => {
          const active = status === t.value;
          return (
            <Link
              key={t.value}
              href={t.value === "all" ? "/encounters" : `/encounters?status=${t.value}`}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {batch.error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load encounters: {batch.error.userMessage}
        </div>
      ) : !ready ? (
        <TableSkeleton />
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
          <p className="text-sm font-medium text-neutral-900">No encounters yet</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Open an encounter to start charting — every observation, condition, and medication is linked back to it.
          </p>
          <Link
            href="/encounters/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <Activity className="h-3.5 w-3.5" aria-hidden="true" />
            Open your first encounter
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">Started</th>
                <th className="px-4 py-2.5">Patient</th>
                <th className="px-4 py-2.5">Practitioner</th>
                <th className="px-4 py-2.5">Class</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((e) => {
                const pid = patientRefId(e);
                const prid = practitionerRefId(e);
                const patientName = (pid && patientNames.get(pid)) ?? pid ?? "—";
                const practitionerName = (prid && practitionerNames.get(prid)) ?? prid ?? "—";
                return (
                  <tr key={e.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3 text-neutral-900">
                      {formatDateTime(e.period?.start ?? e.meta?.lastUpdated)}
                    </td>
                    <td className="px-4 py-3">
                      {pid ? (
                        <Link href={`/patients/${pid}`} className="font-medium text-neutral-900 hover:text-brand-700">
                          {patientName}
                        </Link>
                      ) : (
                        <span className="text-neutral-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-neutral-700">{practitionerName}</td>
                    <td className="px-4 py-3 text-neutral-700">{classLabel(e.class)}</td>
                    <td className="px-4 py-3 text-neutral-700">
                      {e.type?.[0]?.text ?? e.reasonCode?.[0]?.text ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={encounterStatusBadge(e.status)}>{e.status ?? "—"}</span>
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
