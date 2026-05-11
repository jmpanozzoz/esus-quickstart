import Link from "next/link";
import { PractitionerForm } from "./PractitionerForm";

export const runtime = "edge";

export default function NewPractitionerPage() {
  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">
          <Link href="/practitioners" className="hover:text-neutral-700">
            ← Practitioners
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">New practitioner</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fields map 1:1 to the FHIR <code className="font-mono">Practitioner</code> resource. Server posts to{" "}
          <code className="font-mono">/fhir/Practitioner</code> with your API key.
        </p>
      </header>

      <PractitionerForm />
    </div>
  );
}
