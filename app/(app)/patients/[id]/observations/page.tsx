import { Activity, Plus } from "lucide-react";
import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import { codeableText, type Observation, observationStatusBadge, observationValue } from "@/lib/fhir-clinical";
import { formatDateTime } from "@/lib/fhir-appointment";

export const runtime = "edge";

export default async function ObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fhirSearch<Observation>("Observation", {
    subject: id,
    _count: 50,
    _sort: "-_lastUpdated",
  });
  const rows = entries(bundle);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} {rows.length === 1 ? "observation" : "observations"} on file.
        </p>
        <Link
          href={`/patients/${id}/observations/new`}
          className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Record observation
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Activity className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-neutral-900">No observations recorded</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Record vitals or lab results — values can be numeric, coded, or free-text.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">What</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((o) => (
                <tr key={o.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-4 py-3 text-neutral-900">
                    {formatDateTime(o.effectiveDateTime ?? o.meta?.lastUpdated)}
                  </td>
                  <td className="px-4 py-3 text-neutral-800">{codeableText(o.code)}</td>
                  <td className="px-4 py-3 font-medium text-neutral-900">{observationValue(o)}</td>
                  <td className="px-4 py-3">
                    <span className={observationStatusBadge(o.status)}>{o.status ?? "—"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
