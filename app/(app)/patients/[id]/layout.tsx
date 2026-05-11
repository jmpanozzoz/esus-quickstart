/**
 * Patient hub layout. Fetches the patient once and renders the banner +
 * tab nav so every per-resource child page reuses the same shell.
 * Children get the patient via the FHIR helper, not via props — keeps
 * each page independently fetchable while the layout owns the chrome.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { type FhirError, fhirRead } from "@/lib/fhir";
import {
  ageFromBirthDate,
  findTelecom,
  formatGender,
  formatName,
  initials,
  primaryIdentifier,
  identifierLabel,
  type Address,
  type ContactPoint,
  type HumanName,
  type Identifier,
} from "@/lib/fhir-helpers";
import type { ReactNode } from "react";
import { PatientTabs } from "./_components/PatientTabs";

export const runtime = "edge";

interface Patient {
  resourceType: "Patient";
  id?: string;
  name?: HumanName[];
  identifier?: Identifier[];
  gender?: string;
  birthDate?: string;
  telecom?: ContactPoint[];
  address?: Address[];
  active?: boolean;
  maritalStatus?: { text?: string };
}

export default async function PatientLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let patient: Patient;
  try {
    patient = await fhirRead<Patient>("Patient", id);
  } catch (err) {
    const e = err as FhirError;
    if (e.status === 404) notFound();
    throw err;
  }

  const age = ageFromBirthDate(patient.birthDate);
  const phone = findTelecom(patient.telecom, "phone");
  const email = findTelecom(patient.telecom, "email");
  const idLabel = identifierLabel(patient.identifier?.[0]);
  const idValue = primaryIdentifier(patient.identifier);

  return (
    <div className="space-y-6">
      <p className="text-xs text-neutral-500">
        <Link href="/patients" className="hover:text-neutral-700">
          ← Patients
        </Link>
      </p>

      <header className="rounded-lg border border-neutral-200 bg-white p-6">
        <div className="flex items-start gap-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-base font-semibold text-white">
            {initials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold text-neutral-900">{formatName(patient.name)}</h1>
            <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-neutral-500">
              <span>{formatGender(patient.gender)}</span>
              {age !== null ? <span>{age} years</span> : null}
              {patient.birthDate ? <span>Born {patient.birthDate}</span> : null}
              {patient.maritalStatus?.text ? <span>{patient.maritalStatus.text}</span> : null}
              {patient.active === false ? (
                <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">Inactive</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 text-xs text-neutral-500">
            <Link
              href={`/patients/${id}/edit`}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              Edit
            </Link>
            <p>
              <span className="uppercase tracking-wider">{idLabel}</span>{" "}
              <span className="font-mono text-neutral-700">{idValue}</span>
            </p>
            <p className="font-mono">{patient.id?.slice(0, 8)}…</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-neutral-100 pt-5 text-sm sm:grid-cols-3">
          <Detail label="Phone" value={phone ?? "—"} />
          <Detail label="Email" value={email ?? "—"} />
          <Detail label="Address" value={formatAddressLine(patient.address)} />
        </dl>
      </header>

      <PatientTabs patientId={id} />

      <section>{children}</section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="mt-0.5 truncate text-neutral-800">{value}</dd>
    </div>
  );
}

function formatAddressLine(addr?: Address[]): string {
  if (!addr || addr.length === 0) return "—";
  const a = addr.find((x) => x.use === "home") ?? addr[0];
  const parts = [(a.line ?? []).join(" "), a.city, a.state, a.postalCode, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
