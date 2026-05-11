import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import { codeableText, type Observation, observationStatusBadge, observationValue } from "@/lib/fhir-clinical";
import { formatDateTime } from "@/lib/fhir-appointment";

export const runtime = "edge";

export default async function ObservationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fhirSearch<Observation>("Observation", { _count: 200, _sort: "-_lastUpdated" });
  const rows = entries(bundle).filter((o) => o.subject?.reference === `Patient/${id}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} {rows.length === 1 ? "observation" : "observations"} on file.
        </p>
        <Link
          href={`/patients/${id}/observations/new`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Add
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-neutral-900">No observations recorded</p>
          <p className="mt-1 text-sm text-neutral-500">Record vitals or lab results from here.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">When</th>
                <th className="px-4 py-2.5">What</th>
                <th className="px-4 py-2.5">Value</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 text-neutral-900">
                    {formatDateTime(o.effectiveDateTime ?? o.meta?.lastUpdated)}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-800">{codeableText(o.code)}</td>
                  <td className="px-4 py-2.5 font-medium text-neutral-900">{observationValue(o)}</td>
                  <td className="px-4 py-2.5">
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
