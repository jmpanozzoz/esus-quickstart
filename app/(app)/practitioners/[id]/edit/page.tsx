import Link from "next/link";
import { type FhirResource, fhirRead } from "@/lib/fhir";
import { PractitionerForm, type PractitionerFormState } from "../../new/PractitionerForm";

export const runtime = "edge";

type Practitioner = FhirResource & {
  resourceType: "Practitioner";
  name?: { use?: string; family?: string; given?: string[] }[];
  identifier?: { use?: string; system?: string; value?: string }[];
  gender?: "male" | "female" | "other" | "unknown";
  telecom?: { system?: string; value?: string; use?: string }[];
  address?: { line?: string[]; city?: string; state?: string; postalCode?: string; country?: string }[];
  qualification?: { code?: { text?: string } }[];
  active?: boolean;
};

function buildInitial(p: Practitioner): Partial<PractitionerFormState> {
  const name = p.name?.find((n) => n.use === "official") ?? p.name?.[0];
  const addr = p.address?.[0];
  return {
    given: name?.given?.[0] ?? "",
    family: name?.family ?? "",
    gender: p.gender ?? "",
    qualification: p.qualification?.[0]?.code?.text ?? "",
    // PHI fields come back as `***ENCRYPTED***` — leave blank, the form
    // banner tells the user "blank = keep current value".
    licenseNumber: "",
    phone: "",
    email: "",
    addrLine: addr?.line?.join(" ") ?? "",
    city: addr?.city ?? "",
    state: addr?.state ?? "",
    postalCode: addr?.postalCode ?? "",
    country: addr?.country ?? "",
    active: p.active !== false,
  };
}

export default async function EditPractitionerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const practitioner = await fhirRead<Practitioner>("Practitioner", id);

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs text-neutral-500">
          <Link href="/practitioners" className="hover:text-neutral-700">
            ← Practitioners
          </Link>
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-neutral-900">Edit practitioner</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sends <code className="font-mono">PUT /fhir/Practitioner/{id.slice(0, 8)}…</code> with the fields you change.
        </p>
      </header>

      <PractitionerForm practitionerId={id} initialValues={buildInitial(practitioner)} />
    </div>
  );
}
