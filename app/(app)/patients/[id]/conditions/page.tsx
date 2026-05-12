import { ClipboardList, Plus } from "lucide-react";
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
  const bundle = await fhirSearch<Condition>("Condition", {
    subject: id,
    _count: 50,
    _sort: "-_lastUpdated",
  });
  const rows = entries(bundle);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} {rows.length === 1 ? "condition" : "conditions"} on file.
        </p>
        <Link
          href={`/patients/${id}/conditions/new`}
          className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add condition
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <ClipboardList className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-neutral-900">No conditions recorded</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Add a diagnosis to start the problem list. SNOMED/ICD codes are optional.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
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
                  <tr key={c.id} className="transition-colors hover:bg-brand-50/40">
                    <td className="px-4 py-3 font-medium text-neutral-900">{codeableText(c.code)}</td>
                    <td className="px-4 py-3 text-neutral-700">{codeableText(c.severity)}</td>
                    <td className="px-4 py-3 text-neutral-700">{formatDate(c.onsetDateTime)}</td>
                    <td className="px-4 py-3 text-neutral-700">{formatDate(c.recordedDate)}</td>
                    <td className="px-4 py-3">
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
