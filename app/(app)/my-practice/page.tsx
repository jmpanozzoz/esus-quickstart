"use client";

export const runtime = "edge";

import { Calendar, Search, Stethoscope, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirBundle, type FhirResource } from "@/lib/fhir";
import {
  type Appointment,
  extractRef,
  formatDateTime,
  isToday,
  statusBadgeClass,
} from "@/lib/fhir-appointment";
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
import { useAuth, isStaffUser } from "@/lib/store";
import { useFhirBatch, useFhirSearch } from "@/lib/use-fhir";

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

function patientInitials(names?: HumanName[]): string {
  if (!names || names.length === 0) return "?";
  const n = names.find((x) => x.use === "official") ?? names[0];
  const first = (n?.given?.[0]?.[0] ?? "").toUpperCase();
  const last = (n?.family?.[0] ?? "").toUpperCase();
  return first + last || "?";
}

// ─── Debounce hook ───────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export default function MyPracticePage() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 350);
  const searchRef = useRef<HTMLInputElement>(null);

  // Redirect non-staff users without a practitionerId to the dashboard.
  // Staff users without a practitionerId are handled below with a setup card.
  useEffect(() => {
    if (user !== null && !user.practitionerId && !isStaffUser(user)) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  const practitionerId = user?.practitionerId ?? null;

  // ── Batch: practitioner profile ──────────────────────────────────────────
  const batchRequests = useMemo(
    () =>
      practitionerId
        ? [{ method: "GET" as const, url: `Practitioner/${practitionerId}` }]
        : [],
    [practitionerId],
  );

  const { data: batchData, isLoading: batchLoading, error: batchError } = useFhirBatch(
    batchRequests,
    { isPaused: () => !practitionerId },
  );

  // ── Patient search (debounced, independent SWR key) ──────────────────────
  const patientParams = useMemo<Record<string, string | number>>(() => {
    const p: Record<string, string | number> = { _count: 20, _sort: "-_lastUpdated" };
    if (debouncedSearch.trim()) p.name = debouncedSearch.trim();
    return p;
  }, [debouncedSearch]);

  const {
    data: patientsBundle,
    isLoading: patientsLoading,
    error: patientsError,
  } = useFhirSearch<Patient>("Patient", patientParams, {
    isPaused: () => !practitionerId,
  });

  // ── Appointments: today's ────────────────────────────────────────────────
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, []);
  const todayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  }, []);

  const apptParams = useMemo<Record<string, string | number>>(
    () => ({
      date: `ge${todayStart}`,
      "date:end": `le${todayEnd}`,
      // Scope to this practitioner's appointments only
      ...(practitionerId ? { practitioner: practitionerId } : {}),
      _count: 10,
      _sort: "date",
    }),
    [todayStart, todayEnd, practitionerId],
  );

  const {
    data: apptBundle,
    isLoading: apptLoading,
    error: apptError,
  } = useFhirSearch<Appointment>("Appointment", apptParams, {
    isPaused: () => !practitionerId,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const practitioner =
    practitionerId && batchData?.entry?.[0]?.resource
      ? (batchData.entry[0].resource as unknown as Practitioner)
      : undefined;

  const patients = patientsBundle ? (entries(patientsBundle as Parameters<typeof entries>[0]) as Patient[]) : [];

  const allAppointments = apptBundle
    ? (entries(apptBundle as Parameters<typeof entries>[0]) as Appointment[])
    : [];

  // Filter to today's appointments for this practitioner specifically
  const todayAppointments = allAppointments.filter((a) => isToday(a.start));

  const isLoading = batchLoading;

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  }, []);

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

  // Staff without practitioner: show a setup card instead of the full page.
  if (!user.practitionerId) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 max-w-md">
          <h2 className="text-lg font-semibold mb-2">Set up your practitioner profile</h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Your account has staff access but no practitioner profile yet. Ask your administrator to link your account to a Practitioner record.
          </p>
          <a href="/practitioners/new" className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700">
            Create practitioner profile →
          </a>
        </div>
      </div>
    );
  }

  const displayName = formatName(practitioner?.name);
  const phone = findTelecom(practitioner?.telecom, "phone");
  const email = findTelecom(practitioner?.telecom, "email");

  return (
    <div className="space-y-8">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            {isLoading || !practitioner ? "My practice" : `Dr. ${displayName}`}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your professional profile, patients under your care, and today&apos;s schedule.
          </p>
        </div>

        {/* Stats row */}
        {!isLoading && practitioner && (
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-card">
              <Users className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              <span className="font-medium text-neutral-900">
                {patientsBundle?.total ?? "—"}
              </span>
              <span className="text-neutral-500">patients</span>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm shadow-card">
              <Calendar className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              <span className="font-medium text-neutral-900">
                {apptLoading ? "—" : todayAppointments.length}
              </span>
              <span className="text-neutral-500">today</span>
            </div>
          </div>
        )}
      </header>

      {/* ── Two-column desktop layout ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[320px_1fr]">

        {/* Left column: profile card + today's appointments */}
        <div className="space-y-6">

          {/* ── Practitioner profile card ────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Professional profile
            </h2>

            {batchError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                Failed to load profile: {batchError.message}
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

                    <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-sm">
                      {practitioner.qualification && practitioner.qualification.length > 0 && (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Qualification
                          </dt>
                          <dd className="mt-0.5 text-neutral-700">
                            {formatQualification(practitioner.qualification)}
                          </dd>
                        </div>
                      )}

                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          Gender
                        </dt>
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
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Phone
                          </dt>
                          <dd className="mt-0.5 text-neutral-700">{phone}</dd>
                        </div>
                      )}

                      {email && (
                        <div>
                          <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                            Email
                          </dt>
                          <dd className="mt-0.5 text-neutral-700">{email}</dd>
                        </div>
                      )}

                      <div>
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                          FHIR ID
                        </dt>
                        <dd className="mt-0.5 font-mono text-xs text-neutral-500">{practitioner.id}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Today's appointments ─────────────────────────────────────── */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Today&apos;s appointments
            </h2>

            {apptError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                Failed to load appointments: {apptError.message}
              </div>
            ) : apptLoading ? (
              <TableSkeleton rows={3} />
            ) : todayAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-8 text-center shadow-card">
                <Calendar className="mx-auto mb-2 h-6 w-6 text-neutral-300" aria-hidden="true" />
                <p className="text-sm font-medium text-neutral-900">No appointments today</p>
                <p className="mt-1 text-xs text-neutral-500">
                  Your schedule is clear for the rest of the day.
                </p>
                <Link
                  href="/appointments/new"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
                >
                  Schedule an appointment
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
                {todayAppointments.map((a) => {
                  const pid = extractRef(a.participant, "Patient/");
                  return (
                    <li key={a.id} className="px-4 py-3 text-sm transition-colors hover:bg-brand-50/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-neutral-900">{formatDateTime(a.start)}</p>
                          {pid ? (
                            <Link
                              href={`/patients/${pid}`}
                              className="mt-0.5 truncate text-xs text-brand-600 hover:underline"
                            >
                              Patient #{pid.slice(0, 8)}…
                            </Link>
                          ) : (
                            <p className="mt-0.5 text-xs text-neutral-400">No patient linked</p>
                          )}
                          {(a.description ?? a.reasonCode?.[0]?.text) && (
                            <p className="mt-0.5 truncate text-xs text-neutral-500">
                              {a.description ?? a.reasonCode?.[0]?.text}
                            </p>
                          )}
                        </div>
                        <span className={statusBadgeClass(a.status)}>{a.status ?? "—"}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Right column: patient search + list */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Patients under my care
            </h2>
            {patientsBundle && (
              <span className="text-xs text-neutral-400">
                {patientsBundle.total ?? patients.length} total
              </span>
            )}
          </div>

          {/* Search input */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
              aria-hidden="true"
            />
            <input
              ref={searchRef}
              type="search"
              value={searchInput}
              onChange={handleSearchChange}
              placeholder="Search patients by name…"
              className="w-full !pl-9 !text-sm"
            />
          </div>

          {/* Patient list */}
          {patientsError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              Failed to load patients: {patientsError.message}
            </div>
          ) : patientsLoading && patients.length === 0 ? (
            <TableSkeleton rows={4} />
          ) : patients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
              {debouncedSearch ? (
                <>
                  <p className="text-sm font-medium text-neutral-900">
                    No patients match &ldquo;{debouncedSearch}&rdquo;
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                    Try a partial name or clear the search to see everyone.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="mt-3 text-xs font-medium text-brand-600 hover:underline"
                  >
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-neutral-900">No patients yet</p>
                  <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
                    Patients in this tenant will appear here once they are created.
                  </p>
                </>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
              {patients.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/patients/${p.id}`}
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
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
