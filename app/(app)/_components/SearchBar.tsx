/**
 * Server-component-friendly search input. Posts to the same page with
 * `?q=...`; the page reads it and threads it into the FHIR query.
 * No client JS required — submit on Enter works out of the box.
 */
export function SearchBar({ q, placeholder }: { q?: string; placeholder: string }) {
  return (
    <form className="flex gap-2">
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="w-72 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-800"
      >
        Search
      </button>
    </form>
  );
}
