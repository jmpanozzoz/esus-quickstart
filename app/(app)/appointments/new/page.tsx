import { ChevronLeft } from "lucide-react";
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
      <Link
        href="/appointments"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Appointments
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Schedule appointment</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Posts a FHIR <code className="font-mono text-neutral-700">Appointment</code> with patient and practitioner
          participants. Reminders run on the server&apos;s timezone-aware scheduler.
        </p>
      </header>

      <AppointmentForm patients={patients} practitioners={practitioners} />
    </div>
  );
}
