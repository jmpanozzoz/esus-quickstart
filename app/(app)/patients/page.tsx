"use client";

export const runtime = "edge";

import { Plus, Users } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResourceTable, type Column } from "../_components/ResourceTable";
import { SearchBar } from "../_components/SearchBar";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirResource } from "@/lib/fhir";
import {
  formatDate,
  formatGender,
  formatName,
  primaryIdentifier,
  type HumanName,
  type Identifier,
} from "@/lib/fhir-helpers";
import { useFhirSearch } from "@/lib/use-fhir";

interface Patient extends FhirResource {
  resourceType: "Patient";
  name?: HumanName[];
  identifier?: Identifier[];
  gender?: string;
  birthDate?: string;
  active?: boolean;
}

export default function PatientsPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;
  const params: Record<string, string | number> = { _count: 50, _sort: "-_lastUpdated" };
  if (q) params.name = q;
  const { data: bundle, isLoading, error } = useFhirSearch<Patient>("Patient", params);
  const rows = bundle ? entries(bundle) : [];

  const columns: Column<Patient>[] = [
    {
      header: "Name",
      cell: (p) => (
        <Link href={`/patients/${p.id}`} className="font-medium text-neutral-900 hover:text-brand-700">
          {formatName(p.name)}
        </Link>
      ),
    },
    {
      header: "Document",
      cell: (p) => <span className="font-mono text-xs text-neutral-600">{primaryIdentifier(p.identifier)}</span>,
    },
    { header: "Gender", cell: (p) => <span className="text-neutral-700">{formatGender(p.gender)}</span> },
    { header: "Birth date", cell: (p) => <span className="text-neutral-700">{formatDate(p.birthDate)}</span> },
    {
      header: "Status",
      cell: (p) =>
        p.active === false ? (
          <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
            Inactive
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
            Active
          </span>
        ),
    },
    {
      header: "ID",
      cell: (p) => <code className="font-mono text-xs text-neutral-500">{p.id?.slice(0, 8)}…</code>,
      width: "140px",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Patients</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {bundle ? (
              <>
                {bundle.total} {bundle.total === 1 ? "patient" : "patients"} in your tenant
                {q ? <> matching &ldquo;<span className="text-neutral-700">{q}</span>&rdquo;</> : null}.
              </>
            ) : isLoading ? (
              "Loading…"
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SearchBar q={q} placeholder="Search by name…" />
          <Link
            href="/patients/new"
            className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New patient
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load patients: {error.message}
        </div>
      ) : !bundle ? (
        <TableSkeleton />
      ) : (
        <ResourceTable
          rows={rows}
          columns={columns}
          emptyTitle={q ? `No patients match "${q}"` : "No patients yet"}
          emptyHint={
            q
              ? "Try a partial name, or clear the search to see everyone."
              : "Create one from the console or POST /fhir/Patient with your API key."
          }
          emptyAction={
            !q ? (
              <Link
                href="/patients/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                Create your first patient
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
