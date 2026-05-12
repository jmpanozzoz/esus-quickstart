"use client";

export const runtime = "edge";

import { Plus, Stethoscope } from "lucide-react";
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
        <Link href={`/practitioners/${p.id}/edit`} className="font-medium text-neutral-900 hover:text-brand-700">
          {formatName(p.name)}
        </Link>
      ),
    },
    {
      header: "License",
      cell: (p) => <span className="font-mono text-xs text-neutral-600">{primaryIdentifier(p.identifier)}</span>,
    },
    { header: "Qualification", cell: (p) => <span className="text-neutral-700">{formatQualification(p.qualification)}</span> },
    { header: "Gender", cell: (p) => <span className="text-neutral-700">{formatGender(p.gender)}</span> },
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
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Practitioners</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {bundle ? (
              <>
                {bundle.total} {bundle.total === 1 ? "practitioner" : "practitioners"} in your tenant
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
            href="/practitioners/new"
            className="inline-flex h-[38px] items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New practitioner
          </Link>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          Failed to load practitioners: {error.message}
        </div>
      ) : !bundle ? (
        <TableSkeleton />
      ) : (
        <ResourceTable
          rows={rows}
          columns={columns}
          emptyTitle={q ? `No practitioners match "${q}"` : "No practitioners yet"}
          emptyHint={
            q
              ? "Try a partial name, or clear the search to see everyone."
              : "Create one from the console or POST /fhir/Practitioner with your API key."
          }
          emptyAction={
            !q ? (
              <Link
                href="/practitioners/new"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-xs font-medium text-white shadow-card transition-colors hover:bg-brand-700"
              >
                <Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />
                Add your first practitioner
              </Link>
            ) : undefined
          }
        />
      )}
    </div>
  );
}
