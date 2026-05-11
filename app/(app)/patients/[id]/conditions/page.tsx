import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import {
  codeableText,
  type Condition,
  conditionStatusBadge,
} from "@/lib/fhir-clinical";
import { formatDate } from "@/lib/fhir-helpers";

export const runtime = "edge";

export default async function ConditionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fhirSearch<Condition>("Condition", { _count: 200, _sort: "-_lastUpdated" });
  const rows = entries(bundle).filter((c) => c.subject?.reference === `Patient/${id}`);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} {rows.length === 1 ? "condition" : "conditions"} on file.
        </p>
        <Link
          href={`/patients/${id}/conditions/new`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Add
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-neutral-900">No conditions recorded</p>
          <p className="mt-1 text-sm text-neutral-500">Add a diagnosis to start the problem list.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">Condition</th>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Onset</th>
                <th className="px-4 py-2.5">Recorded</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((c) => {
                const clinical = codeableText(c.clinicalStatus).toLowerCase();
                return (
                  <tr key={c.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{codeableText(c.code)}</td>
                    <td className="px-4 py-2.5 text-neutral-700">{codeableText(c.severity)}</td>
                    <td className="px-4 py-2.5 text-neutral-700">{formatDate(c.onsetDateTime)}</td>
                    <td className="px-4 py-2.5 text-neutral-700">{formatDate(c.recordedDate)}</td>
                    <td className="px-4 py-2.5">
                      <span className={conditionStatusBadge(clinical)}>{clinical === "—" ? "—" : clinical}</span>
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
