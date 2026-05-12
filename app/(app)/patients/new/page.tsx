import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PatientForm } from "./PatientForm";

export const runtime = "edge";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Patients
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">New patient</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fields map 1:1 to the FHIR <code className="font-mono text-neutral-700">Patient</code> resource. The server
          posts to <code className="font-mono text-neutral-700">/fhir/Patient</code> with your API key.
        </p>
      </header>

      <PatientForm />
    </div>
  );
}
