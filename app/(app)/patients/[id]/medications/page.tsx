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
          {rows.length} {rows.length === 1 ? "prescription" : "prescriptions"}.
        </p>
        <Link
          href={`/patients/${id}/medications/new`}
          className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          + Add
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-neutral-900">No medications prescribed</p>
          <p className="mt-1 text-sm text-neutral-500">Add a prescription to start the medication list.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-2.5">Medication</th>
                <th className="px-4 py-2.5">Dosage</th>
                <th className="px-4 py-2.5">Authored</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5 font-medium text-neutral-900">{medicationDisplay(m)}</td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {m.dosageInstruction?.[0]?.text ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-neutral-700">
                    {formatDate(m.authoredOn ?? m.meta?.lastUpdated)}
                  </td>
                  <td className="px-4 py-2.5">
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
