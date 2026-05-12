import { Activity } from "lucide-react";
import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import { type Encounter, classLabel, encounterStatusBadge } from "@/lib/fhir-encounter";
import { formatDateTime } from "@/lib/fhir-appointment";

export const runtime = "edge";

export default async function PatientEncountersPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fhirSearch<Encounter>("Encounter", {
    subject: id,
    _count: 50,
    _sort: "-_lastUpdated",
  });
  const rows = entries(bundle);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          <Activity className="h-5 w-5" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-neutral-900">No encounters yet</p>
        <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
          Open one to record a visit — every clinical resource below links back to it.
        </p>
        <Link
          href="/encounters/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          Open an encounter
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 bg-neutral-50/60">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            <th className="px-4 py-2.5">Started</th>
            <th className="px-4 py-2.5">Class</th>
            <th className="px-4 py-2.5">Type / Reason</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((e) => (
            <tr key={e.id} className="transition-colors hover:bg-brand-50/40">
              <td className="px-4 py-3 text-neutral-900">
                {formatDateTime(e.period?.start ?? e.meta?.lastUpdated)}
              </td>
              <td className="px-4 py-3 text-neutral-700">{classLabel(e.class)}</td>
              <td className="px-4 py-3 text-neutral-700">
                {e.type?.[0]?.text ?? e.reasonCode?.[0]?.text ?? "—"}
              </td>
              <td className="px-4 py-3">
                <span className={encounterStatusBadge(e.status)}>{e.status ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
