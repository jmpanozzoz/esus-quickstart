"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { slug: "", label: "Overview" },
  { slug: "conditions", label: "Conditions" },
  { slug: "observations", label: "Observations" },
  { slug: "medications", label: "Medications" },
  { slug: "encounters", label: "Encounters" },
];

export function PatientTabs({ patientId }: { patientId: string }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-4 overflow-x-auto border-b border-neutral-200 sm:mx-0">
      <ul className="flex gap-1 px-4 sm:px-0">
        {TABS.map((t) => {
          const href = t.slug ? `/patients/${patientId}/${t.slug}` : `/patients/${patientId}`;
          const active = t.slug ? pathname.endsWith(`/${t.slug}`) : pathname === `/patients/${patientId}`;
          return (
            <li key={t.slug || "overview"}>
              <Link
                href={href}
                className={`-mb-px block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
