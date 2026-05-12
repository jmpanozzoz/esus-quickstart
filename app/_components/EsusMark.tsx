import { cn } from "@/lib/utils";

/**
 * The Esus hexagonal mark — same path used in the landing page, favicon,
 * and `og-image.svg`. Single source of truth so swapping the brand mark
 * only touches one file. `fill="currentColor"` so callers control color
 * via Tailwind text classes.
 */
export function EsusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn("h-5 w-5", className)}
    >
      <path
        fillRule="evenodd"
        d="M64 6L112 34V94L64 122L16 94V34ZM36 44V56L64 72L92 56V44L64 28ZM36 72V84L64 100L92 84V72L64 56Z"
        fill="currentColor"
      />
    </svg>
  );
}
