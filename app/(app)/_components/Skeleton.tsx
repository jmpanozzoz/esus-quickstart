/**
 * Tiny skeleton primitives shared across `(app)/*` pages. Used by SWR
 * pages while the first fetch is in flight — keeps the chrome alive
 * and the user oriented instead of staring at a blank panel.
 *
 * Same animation tokens the console uses — slow pulse, muted gray,
 * `prefers-reduced-motion` respected via Tailwind's `motion-reduce`
 * variant.
 */
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-neutral-100 motion-reduce:animate-none", className)}
      {...props}
    />
  );
}

/** Table-shaped skeleton — 5 rows by default, matches `<ResourceTable>` rhythm. */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-card">
      <div className="border-b border-neutral-100 bg-neutral-50/60 px-4 py-2.5">
        <Skeleton className="h-3 w-24" />
      </div>
      <ul className="divide-y divide-neutral-100">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-16" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Dashboard-style 4-up stat skeleton row. */
export function StatCardsSkeleton() {
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-card">
          <Skeleton className="mb-2 h-3 w-16" />
          <Skeleton className="h-7 w-12" />
        </div>
      ))}
    </section>
  );
}
