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
    <nav className="border-b border-neutral-200">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const href = t.slug ? `/patients/${patientId}/${t.slug}` : `/patients/${patientId}`;
          const active = t.slug ? pathname.endsWith(`/${t.slug}`) : pathname === `/patients/${patientId}`;
          return (
            <li key={t.slug || "overview"}>
              <Link
                href={href}
                className={`-mb-px block border-b-2 px-3 py-2 text-sm transition-colors ${
                  active
                    ? "border-neutral-900 text-neutral-900"
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
