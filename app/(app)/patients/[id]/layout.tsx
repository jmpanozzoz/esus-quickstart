/**
 * Patient hub layout. Fetches the patient once and renders the banner +
 * tab nav so every per-resource child page reuses the same shell.
 * Children get the patient via the FHIR helper, not via props — keeps
 * each page independently fetchable while the layout owns the chrome.
 */
import { ChevronLeft, Mail, MapPin, Pencil, Phone } from "lucide-react";
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
      <Link
        href="/patients"
        className="inline-flex items-center gap-1 text-xs font-medium text-neutral-500 hover:text-brand-700"
      >
        <ChevronLeft className="h-3 w-3" aria-hidden="true" />
        Patients
      </Link>

      <header className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card sm:p-6">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700 sm:h-14 sm:w-14 sm:text-base">
            {initials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{formatName(patient.name)}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-500">
              <span>{formatGender(patient.gender)}</span>
              {age !== null ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{age} years</span>
                </>
              ) : null}
              {patient.birthDate ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Born {patient.birthDate}</span>
                </>
              ) : null}
              {patient.maritalStatus?.text ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{patient.maritalStatus.text}</span>
                </>
              ) : null}
              {patient.active === false ? (
                <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  Inactive
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Active
                </span>
              )}
            </div>
          </div>
          <div className="hidden shrink-0 flex-col items-end gap-2 text-xs text-neutral-500 sm:flex">
            <Link
              href={`/patients/${id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300"
            >
              <Pencil className="h-3 w-3" aria-hidden="true" />
              Edit
            </Link>
            <p className="text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{idLabel}</span>
              <br />
              <span className="font-mono text-neutral-700">{idValue}</span>
            </p>
            <p className="font-mono text-[11px] text-neutral-400">{patient.id?.slice(0, 8)}…</p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-neutral-100 pt-5 text-sm sm:grid-cols-3">
          <Detail icon={<Phone className="h-3.5 w-3.5" />} label="Phone" value={phone ?? "—"} />
          <Detail icon={<Mail className="h-3.5 w-3.5" />} label="Email" value={email ?? "—"} />
          <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Address" value={formatAddressLine(patient.address)} />
        </dl>

        {/* Mobile-only edit + identifier — the desktop right column is hidden below sm. */}
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-neutral-100 pt-4 text-[11px] text-neutral-500 sm:hidden">
          <p className="min-w-0 truncate">
            <span className="font-semibold uppercase tracking-wider text-neutral-400">{idLabel}</span>{" "}
            <span className="font-mono text-neutral-700">{idValue}</span>
          </p>
          <Link
            href={`/patients/${id}/edit`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300"
          >
            <Pencil className="h-3 w-3" aria-hidden="true" />
            Edit
          </Link>
        </div>
      </header>

      <PatientTabs patientId={id} />

      <section>{children}</section>
    </div>
  );
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        <span className="text-neutral-400">{icon}</span>
        {label}
      </dt>
      <dd className="mt-1 truncate text-neutral-800">{value}</dd>
    </div>
  );
}

function formatAddressLine(addr?: Address[]): string {
  if (!addr || addr.length === 0) return "—";
  const a = addr.find((x) => x.use === "home") ?? addr[0];
  const parts = [(a.line ?? []).join(" "), a.city, a.state, a.postalCode, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
