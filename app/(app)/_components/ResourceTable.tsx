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
}

export function ResourceTable<T extends { id?: string }>({ rows, columns, emptyTitle, emptyHint }: Props<T>) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-sm">
        <p className="font-medium text-neutral-900">{emptyTitle}</p>
        {emptyHint ? <p className="mt-1 text-neutral-500">{emptyHint}</p> : null}
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50">
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
            <tr key={row.id ?? i} className="hover:bg-neutral-50">
              {columns.map((c, j) => (
                <td key={j} className="px-4 py-2.5 text-neutral-800">
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
