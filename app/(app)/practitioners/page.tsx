"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ResourceTable, type Column } from "../_components/ResourceTable";
import { SearchBar } from "../_components/SearchBar";
import { TableSkeleton } from "../_components/Skeleton";
import { entries, type FhirResource } from "@/lib/fhir";
import {
  formatGender,
  formatName,
  primaryIdentifier,
  type HumanName,
  type Identifier,
} from "@/lib/fhir-helpers";
import { useFhirSearch } from "@/lib/use-fhir";

interface Practitioner extends FhirResource {
  resourceType: "Practitioner";
  name?: HumanName[];
  identifier?: Identifier[];
  gender?: string;
  active?: boolean;
  qualification?: { code?: { text?: string; coding?: { display?: string }[] } }[];
}

function formatQualification(q?: Practitioner["qualification"]): string {
  if (!q || q.length === 0) return "—";
  const first = q[0]?.code;
  return first?.text ?? first?.coding?.[0]?.display ?? "—";
}

export default function PractitionersPage() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? undefined;
  const params: Record<string, string | number> = { _count: 50, _sort: "-_lastUpdated" };
  if (q) params.name = q;
  const { data: bundle, isLoading, error } = useFhirSearch<Practitioner>("Practitioner", params);
  const rows = bundle ? entries(bundle) : [];

  const columns: Column<Practitioner>[] = [
    {
      header: "Name",
      cell: (p) => (
        <Link href={`/practitioners/${p.id}/edit`} className="font-medium text-neutral-900 hover:underline">
          {formatName(p.name)}
        </Link>
      ),
    },
    {
      header: "License",
      cell: (p) => <span className="font-mono text-xs text-neutral-600">{primaryIdentifier(p.identifier)}</span>,
    },
    { header: "Qualification", cell: (p) => formatQualification(p.qualification) },
    { header: "Gender", cell: (p) => formatGender(p.gender) },
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
          <h1 className="text-2xl font-semibold text-neutral-900">Practitioners</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {bundle ? (
              <>
                {bundle.total} {bundle.total === 1 ? "practitioner" : "practitioners"} in your tenant
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
            href="/practitioners/new"
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
          >
            + New
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Failed to load practitioners: {error.message}
        </div>
      ) : !bundle ? (
        <TableSkeleton />
      ) : (
        <ResourceTable
          rows={rows}
          columns={columns}
          emptyTitle={q ? `No practitioners match "${q}"` : "No practitioners yet"}
          emptyHint="Create one from the Esus console (or via POST /fhir/Practitioner with your API key)."
        />
      )}
    </div>
  );
}
