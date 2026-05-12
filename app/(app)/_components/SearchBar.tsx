"use client";

import { Search } from "lucide-react";

/**
 * Native form post. Submitting (Enter or click) navigates to the same
 * page with `?q=...`. No client JS state — server reads the param and
 * threads it into the FHIR query.
 */
export function SearchBar({ q, placeholder }: { q?: string; placeholder: string }) {
  return (
    <form className="flex w-full items-center gap-2 sm:w-auto">
      <div className="relative flex-1 sm:flex-none">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          className="!pl-8 !text-sm sm:!w-64"
        />
      </div>
      <button
        type="submit"
        className="inline-flex h-[38px] shrink-0 items-center justify-center rounded-lg bg-neutral-900 px-3 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
      >
        Search
      </button>
    </form>
  );
}
