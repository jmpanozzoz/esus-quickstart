import { fhirRead } from "@/lib/fhir";
import {
  formatAddress,
  formatGender,
  identifierLabel,
  primaryIdentifier,
  unmaskPHI,
  type Address,
  type ContactPoint,
  type Identifier,
} from "@/lib/fhir-helpers";

export const runtime = "edge";

interface Patient {
  resourceType: "Patient";
  id?: string;
  identifier?: Identifier[];
  gender?: string;
  birthDate?: string;
  telecom?: ContactPoint[];
  address?: Address[];
  maritalStatus?: { text?: string };
  active?: boolean;
  meta?: { lastUpdated?: string; versionId?: string };
}

export default async function PatientOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await fhirRead<Patient>("Patient", id);

  const phones = (patient.telecom ?? []).filter((t) => t.system === "phone");
  const emails = (patient.telecom ?? []).filter((t) => t.system === "email");

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Demographics">
        <Row label="Gender" value={formatGender(patient.gender)} />
        <Row label="Birth date" value={patient.birthDate ?? "—"} />
        <Row label="Marital status" value={patient.maritalStatus?.text ?? "—"} />
      </Card>

      <Card title="Identifiers">
        {(patient.identifier ?? []).length === 0 ? (
          <p className="text-sm text-neutral-500">No identifiers on file.</p>
        ) : (
          <ul className="space-y-2">
            {(patient.identifier ?? []).map((ident, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-neutral-500">{identifierLabel(ident)}</span>
                <span className="font-mono text-neutral-800">{primaryIdentifier([ident])}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Contact">
        {phones.length === 0 && emails.length === 0 ? (
          <p className="text-sm text-neutral-500">No contact info on file.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {phones.map((p, i) => (
              <li key={`p${i}`} className="flex items-baseline justify-between gap-3">
                <span className="text-neutral-500">Phone {p.use ? `(${p.use})` : ""}</span>
                <span className="text-neutral-800">{unmaskPHI(p.value)}</span>
              </li>
            ))}
            {emails.map((e, i) => (
              <li key={`e${i}`} className="flex items-baseline justify-between gap-3">
                <span className="text-neutral-500">Email {e.use ? `(${e.use})` : ""}</span>
                <span className="text-neutral-800">{unmaskPHI(e.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Address">
        <p className="text-sm text-neutral-800">{formatAddress(patient.address)}</p>
      </Card>

      <Card title="Resource">
        <Row label="FHIR ID" value={<code className="font-mono text-xs">{patient.id}</code>} />
        <Row label="Version" value={patient.meta?.versionId ?? "—"} />
        <Row label="Last updated" value={patient.meta?.lastUpdated?.slice(0, 19).replace("T", " ") ?? "—"} />
        <Row label="Status" value={patient.active === false ? "Inactive" : "Active"} />
      </Card>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-card">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-800">{value}</span>
    </div>
  );
}
