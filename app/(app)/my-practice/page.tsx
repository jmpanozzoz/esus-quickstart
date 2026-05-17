"use client";

export const runtime = "edge";

import { Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirResource } from "@/lib/fhir";
import {
  findTelecom,
  formatGender,
  formatName,
  identifierLabel,
  primaryIdentifier,
  type ContactPoint,
  type HumanName,
  type Identifier,
} from "@/lib/fhir-helpers";
import { useAuth } from "@/lib/store";
import { useFhirBatch } from "@/lib/use-fhir";

interface Practitioner extends FhirResource {
  resourceType: "Practitioner";
  name?: HumanName[];
  identifier?: Identifier[];
  gender?: string;
  active?: boolean;
  telecom?: ContactPoint[];
  qualification?: {
    code?: { text?: string; coding?: { display?: string }[] };
  }[];
}

interface Patient extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  gender?: string;
  birthDate?: string;
  active?: boolean;
}

function formatQualification(q?: Practitioner["qualification"]): string {
  if (!q || q.length === 0) return "—";
  const first = q[0]?.code;
  return first?.text ?? first?.coding?.[0]?.display ?? "—";
}

export default function MyPracticePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  // Redirect non-practitioners once the store has hydrated.
  useEffect(() => {
    if (user !== null && !user.practitionerId) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const practitionerId = user?.practitionerId ?? null;

  const requests = useMemo(
    () =>
      practitionerId
        ? [
            { method: "GET" as const, url: `Practitioner/${practitionerId}` },
            { method: "GET" as const, url: "Patient?_count=50&_sort=-_lastUpdated" },
          ]
        : [],
    [practitionerId],
  );

  const { data, isLoading, error } = useFhirBatch(requests, {
    // Don't fire if there's no practitionerId yet (pre-hydration or non-practitioner).
    isPaused: () => !practitionerId,
  });

  // Extract results positionally from the batch response.
  const practitioner =
    practitionerId && data?.entry?.[0]?.resource
      ? (data.entry[0].resource as unknown as Practitioner)
      : undefined;

  const patientsBundle =
    practitionerId && data?.entry?.[1]?.resource
      ? (data.entry[1].resource as unknown as { entry?: { resource: Patient }[]; total?: number })
      : undefined;

  const patients = patientsBundle ? entries(patientsBundle as Parameters<typeof entries>[0]) as Patient[] : [];

  // Show nothing while user store is not yet hydrated.
  if (user === null) {
    return (
      <div className="space-y-6">
        <header>
          <div className="h-8 w-48 animate-pulse rounded bg-neutral-100" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-neutral-100" />
        </header>
        <TableSkeleton />
      </div>
    );
  }

  // Shouldn't normally render — redirect fires above — but guards the rest.
  if (!user.practitionerId) return null;

  const displayName = formatName(practitioner?.name);
  const phone = findTelecom(practitioner?.telecom, "phone");
  const email = findTelecom(practitioner?.telecom, "email");

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">My practice</h1>
          <p className="mt-1 text-sm text-neutral-500">Your professional profile and patients under your care.</p>
        </div>
      </header>

      {/* Practitioner profile card */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Professional profile</h2>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Failed to load profile: {error.message}
          </div>
        ) : isLoading || !practitioner ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 animate-pulse rounded-full bg-neutral-100" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-40 animate-pulse rounded bg-neutral-100" />
                <div className="h-3.5 w-56 animate-pulse rounded bg-neutral-100" />
                <div className="h-3.5 w-32 animate-pulse rounded bg-neutral-100" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700">
                <Stethoscope className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold text-neutral-900">{displayName}</h3>
                  {practitioner.active === false ? (
                    <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                      Inactive
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      Active
                    </span>
                  )}
                </div>

                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                  {practitioner.qualification && practitioner.qualification.length > 0 && (
                    <>
                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          Qualification
                        </dt>
                        <dd className="mt-0.5 text-neutral-700">{formatQualification(practitioner.qualification)}</dd>
                      </div>
                    </>
                  )}

                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Gender</dt>
                    <dd className="mt-0.5 text-neutral-700">{formatGender(practitioner.gender)}</dd>
                  </div>

                  {practitioner.identifier && practitioner.identifier.length > 0 && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                        {identifierLabel(practitioner.identifier[0])}
                      </dt>
                      <dd className="mt-0.5 font-mono text-xs text-neutral-700">
                        {primaryIdentifier(practitioner.identifier)}
                      </dd>
                    </div>
                  )}

                  {phone && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Phone</dt>
                      <dd className="mt-0.5 text-neutral-700">{phone}</dd>
                    </div>
                  )}

                  {email && (
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">Email</dt>
                      <dd className="mt-0.5 text-neutral-700">{email}</dd>
                    </div>
                  )}

                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">FHIR ID</dt>
                    <dd className="mt-0.5 font-mono text-xs text-neutral-500">{practitioner.id}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Patients under care */}
      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Patients under my care</h2>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            Failed to load patients: {error.message}
          </div>
        ) : isLoading || !patientsBundle ? (
          <TableSkeleton rows={4} />
        ) : patients.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
            <p className="text-sm font-medium text-neutral-900">No patients yet</p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              Patients in this tenant will appear here once they are created.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
            {patients.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm transition-colors hover:bg-brand-50/40"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                    {patientInitials(p.name)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-neutral-900">{formatName(p.name)}</p>
                    <p className="truncate text-xs text-neutral-500">
                      {formatGender(p.gender)}
                      {p.birthDate ? ` · ${p.birthDate.slice(0, 10)}` : ""}
                      {" · "}
                      <code className="font-mono">{p.id?.slice(0, 8)}…</code>
                    </p>
                  </div>
                </div>
                {p.active === false ? (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                    Inactive
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    Active
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function patientInitials(names?: HumanName[]): string {
  if (!names || names.length === 0) return "?";
  const n = names.find((x) => x.use === "official") ?? names[0];
  const first = (n?.given?.[0]?.[0] ?? "").toUpperCase();
  const last = (n?.family?.[0] ?? "").toUpperCase();
  return (first + last) || "?";
}
