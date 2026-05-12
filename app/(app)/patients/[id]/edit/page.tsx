import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { type FhirResource, fhirRead } from "@/lib/fhir";
import { PatientForm, type PatientFormState } from "../../new/PatientForm";

export const runtime = "edge";

type Patient = FhirResource & {
  resourceType: "Patient";
  name?: { use?: string; family?: string; given?: string[] }[];
  identifier?: { use?: string; system?: string; value?: string }[];
  gender?: "male" | "female" | "other" | "unknown";
  birthDate?: string;
  maritalStatus?: { text?: string };
  telecom?: { system?: string; value?: string; use?: string }[];
  address?: { line?: string[]; city?: string; state?: string; postalCode?: string; country?: string }[];
  active?: boolean;
};

const SYSTEM_TO_FORM: Record<string, PatientFormState["idSystem"]> = {
  "urn:oid:2.16.840.1.113883.4.1": "national_id",
  "http://hl7.org/fhir/sid/passport": "passport",
  "urn:esus:mrn": "mrn",
};

function buildInitial(p: Patient): Partial<PatientFormState> {
  const name = p.name?.find((n) => n.use === "official") ?? p.name?.[0];
  const ident = p.identifier?.find((i) => i.use === "official") ?? p.identifier?.[0];
  const addr = p.address?.find((a) => true) ?? p.address?.[0];
  return {
    given: name?.given?.[0] ?? "",
    family: name?.family ?? "",
    gender: p.gender ?? "",
    birthDate: p.birthDate ?? "",
    maritalStatus: p.maritalStatus?.text ?? "",
    idSystem: ident?.system ? (SYSTEM_TO_FORM[ident.system] ?? "other") : "national_id",
    // PHI values come back as `***ENCRYPTED***`. Leave the input blank
    // so the user can leave it untouched (preserved on PUT) or replace.
    idValue: "",
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

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await fhirRead<Patient>("Patient", id);

  return (
    <div className="space-y-6">
      <Link
        href={`/patients/${id}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Patient
      </Link>

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Edit patient</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Sends <code className="font-mono text-neutral-700">PUT /fhir/Patient/{id.slice(0, 8)}…</code> with the fields
          you change. Untouched fields stay as they are.
        </p>
      </header>

      <PatientForm patientId={id} initialValues={buildInitial(patient)} />
    </div>
  );
}
