import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PractitionerForm } from "./PractitionerForm";

export const runtime = "edge";

export default function NewPractitionerPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/practitioners"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Practitioners
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">New practitioner</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Fields map 1:1 to the FHIR <code className="font-mono text-neutral-700">Practitioner</code> resource. The
          server posts to <code className="font-mono text-neutral-700">/fhir/Practitioner</code> with your API key.
        </p>
      </header>

      <PractitionerForm />
    </div>
  );
}
