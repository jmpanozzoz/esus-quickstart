import type { ReactNode } from "react";

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  width?: string;
}

interface Props<T> {
  rows: T[];
  columns: Column<T>[];
  emptyTitle: string;
  emptyHint?: string;
  emptyAction?: ReactNode;
}

export function ResourceTable<T extends { id?: string }>({
  rows,
  columns,
  emptyTitle,
  emptyHint,
  emptyAction,
}: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center shadow-card">
        <p className="text-sm font-medium text-neutral-900">{emptyTitle}</p>
        {emptyHint ? <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">{emptyHint}</p> : null}
        {emptyAction ? <div className="mt-4 flex justify-center">{emptyAction}</div> : null}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 bg-neutral-50/60">
          <tr>
            {columns.map((c) => (
              <th
                key={c.header}
                className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-500"
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row, i) => (
            <tr key={row.id ?? i} className="transition-colors hover:bg-brand-50/40">
              {columns.map((c, j) => (
                <td key={j} className="px-4 py-3 align-middle text-neutral-800">
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
