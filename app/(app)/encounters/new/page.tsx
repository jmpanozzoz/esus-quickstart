import Link from "next/link";
import { entries, fhirSearch } from "@/lib/fhir";
import { formatName, type HumanName } from "@/lib/fhir-helpers";
import { EncounterForm } from "./EncounterForm";

export const runtime = "edge";

interface NamedResource {
  id?: string;
  name?: HumanName[];
}

export default async function NewEncounterPage() {
  const [patientsBundle, practitionersBundle] = await Promise.all([
    fhirSearch<NamedResource>("Patient", { _count: 100, _sort: "family" }),
    fhirSearch<NamedResource>("Practitioner", { _count: 100, _sort: "family" }),
  ]);
  const patients = entries(patientsBundle).map((p) => ({ id: p.id!, label: formatName(p.name) }));
  const practitioners = entries(practitionersBundle).map((p) => ({
    id: p.id!,
    label: formatName(p.name),
  }));

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">
          <Link href="/encounters" className="hover:text-neutral-700">
            ← Encounters
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Open encounter</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A FHIR <code className="font-mono">Encounter</code> records an actual clinical interaction — the visit
          itself. Setting status to <em>in-progress</em> starts the period timer.
        </p>
      </header>

      <EncounterForm patients={patients} practitioners={practitioners} />
    </div>
  );
}
