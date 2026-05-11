import Link from "next/link";
import { PatientForm } from "./PatientForm";

export const runtime = "edge";

export default function NewPatientPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">
          <Link href="/patients" className="hover:text-neutral-700">
            ← Patients
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">New patient</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fields map 1:1 to the FHIR <code className="font-mono">Patient</code> resource. Server posts to{" "}
          <code className="font-mono">/fhir/Patient</code> with your API key.
        </p>
      </header>

      <PatientForm />
    </div>
  );
}
