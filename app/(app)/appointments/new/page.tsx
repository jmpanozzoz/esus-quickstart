import Link from "next/link";
import { entries, type FhirResource, fhirSearch } from "@/lib/fhir";
import { formatName, type HumanName } from "@/lib/fhir-helpers";
import { AppointmentForm } from "./AppointmentForm";

export const runtime = "edge";

interface NamedResource extends FhirResource {
  name?: HumanName[];
}

export default async function NewAppointmentPage() {
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
          <Link href="/appointments" className="hover:text-neutral-700">
            ← Appointments
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Schedule appointment</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Posts a FHIR <code className="font-mono">Appointment</code> with patient + practitioner participants.
        </p>
      </header>

      <AppointmentForm patients={patients} practitioners={practitioners} />
    </div>
  );
}
