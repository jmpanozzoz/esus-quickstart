"use client";

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
        <Link href={`/patients/${p.id}`} className="font-medium text-neutral-900 hover:underline">
          {formatName(p.name)}
        </Link>
      ),
    },
    {
      header: "Document",
      cell: (p) => <span className="font-mono text-xs text-neutral-600">{primaryIdentifier(p.identifier)}</span>,
    },
    { header: "Gender", cell: (p) => formatGender(p.gender) },
    { header: "Birth date", cell: (p) => formatDate(p.birthDate) },
    {
      header: "Status",
      cell: (p) =>
        p.active === false ? (
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">Inactive</span>
        ) : (
          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[11px] text-white">Active</span>
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
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Patients</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {bundle ? (
              <>
                {bundle.total} {bundle.total === 1 ? "patient" : "patients"} in your tenant
                {q ? ` matching "${q}"` : ""}.
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
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + New
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load patients: {error.message}
        </div>
      ) : !bundle ? (
        <TableSkeleton />
      ) : (
        <ResourceTable
          rows={rows}
          columns={columns}
          emptyTitle={q ? `No patients match "${q}"` : "No patients yet"}
          emptyHint="Create one from the Esus console (or via POST /fhir/Patient with your API key)."
        />
      )}
    </div>
  );
}
