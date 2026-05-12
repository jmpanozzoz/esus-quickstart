import { Pill, Plus } from "lucide-react";
import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import { type MedicationRequest, medicationDisplay, medicationStatusBadge } from "@/lib/fhir-clinical";
import { formatDate } from "@/lib/fhir-helpers";

export const runtime = "edge";

export default async function MedicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bundle = await fhirSearch<MedicationRequest>("MedicationRequest", {
    subject: id,
    _count: 50,
    _sort: "-_lastUpdated",
  });
  const rows = entries(bundle);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          {rows.length} {rows.length === 1 ? "prescription" : "prescriptions"} on file.
        </p>
        <Link
          href={`/patients/${id}/medications/new`}
          className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add prescription
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <Pill className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-neutral-900">No medications prescribed</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Add a prescription to start the medication list — dosage instructions are free-text or coded.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 bg-neutral-50/60">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">Medication</th>
                <th className="px-4 py-2.5">Dosage</th>
                <th className="px-4 py-2.5">Authored</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-neutral-900">{medicationDisplay(m)}</td>
                  <td className="px-4 py-3 text-neutral-700">{m.dosageInstruction?.[0]?.text ?? "—"}</td>
                  <td className="px-4 py-3 text-neutral-700">{formatDate(m.authoredOn ?? m.meta?.lastUpdated)}</td>
                  <td className="px-4 py-3">
                    <span className={medicationStatusBadge(m.status)}>{m.status ?? "—"}</span>
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
