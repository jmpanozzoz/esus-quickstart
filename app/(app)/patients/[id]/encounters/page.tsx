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
      <div className="rounded-lg border border-dashed border-neutral-300 bg-white p-10 text-center">
        <p className="text-sm font-semibold text-neutral-900">No encounters yet</p>
        <p className="mt-1 text-sm text-neutral-500">
          <Link href="/encounters/new" className="underline hover:text-neutral-700">
            Open one
          </Link>{" "}
          to record a visit.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            <th className="px-4 py-2.5">Started</th>
            <th className="px-4 py-2.5">Class</th>
            <th className="px-4 py-2.5">Type / Reason</th>
            <th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((e) => (
            <tr key={e.id} className="hover:bg-neutral-50">
              <td className="px-4 py-2.5 text-neutral-900">
                {formatDateTime(e.period?.start ?? e.meta?.lastUpdated)}
              </td>
              <td className="px-4 py-2.5 text-neutral-700">{classLabel(e.class)}</td>
              <td className="px-4 py-2.5 text-neutral-700">
                {e.type?.[0]?.text ?? e.reasonCode?.[0]?.text ?? "—"}
              </td>
              <td className="px-4 py-2.5">
                <span className={encounterStatusBadge(e.status)}>{e.status ?? "—"}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
