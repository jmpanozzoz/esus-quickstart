import Link from "next/link";
import { entries, fhirSearch, type FhirResource } from "@/lib/fhir";
import {
  type Encounter,
  classLabel,
  encounterStatusBadge,
  patientRefId,
  practitionerRefId,
} from "@/lib/fhir-encounter";
import { formatDateTime } from "@/lib/fhir-appointment";
import { formatName, type HumanName } from "@/lib/fhir-helpers";

export const runtime = "edge";

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

function nameMap(bundle: { entry?: { resource: NamedResource }[] } | null | undefined): Map<string, string> {
  const m = new Map<string, string>();
  for (const e of bundle?.entry ?? []) {
    if (e.resource.id) m.set(e.resource.id, formatName(e.resource.name));
  }
  return m;
}

export default async function EncountersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status = "all" } = await searchParams;
  const params: Record<string, string | number | undefined> = { _count: 50, _sort: "-_lastUpdated" };
  if (status !== "all") params.status = status;

  const [encountersBundle, patientsBundle, practitionersBundle] = await Promise.all([
    fhirSearch<Encounter>("Encounter", params),
    fhirSearch<NamedResource>("Patient", { _count: 100 }),
    fhirSearch<NamedResource>("Practitioner", { _count: 100 }),
  ]);

  const rows = entries(encountersBundle);
  const patientNames = nameMap(patientsBundle);
  const practitionerNames = nameMap(practitionersBundle);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Encounters</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {rows.length} {rows.length === 1 ? "encounter" : "encounters"}
            {status !== "all" ? ` (${status})` : ""}.
          </p>
        </div>
        <Link
          href="/encounters/new"
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
              href={t.value === "all" ? "/encounters" : `/encounters?status=${t.value}`}
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

      {rows.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
          <p className="font-medium text-neutral-900">No encounters yet</p>
          <p className="mt-1 text-neutral-500">
            <Link href="/encounters/new" className="underline hover:text-neutral-700">
              Open one
            </Link>{" "}
            to populate this list.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50">
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
                  <tr key={e.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 text-neutral-900">
                      {formatDateTime(e.period?.start ?? e.meta?.lastUpdated)}
                    </td>
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
                    <td className="px-4 py-2.5 text-neutral-700">{classLabel(e.class)}</td>
                    <td className="px-4 py-2.5 text-neutral-700">
                      {e.type?.[0]?.text ?? e.reasonCode?.[0]?.text ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
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
