import { ChevronRight } from "lucide-react";
import Link from "next/link";

export function SubFormHeader({
  patientId,
  backLabel,
  title,
  description,
}: {
  patientId: string;
  backLabel: string;
  title: string;
  description: string;
}) {
  return (
    <header className="space-y-2">
      <nav className="flex items-center gap-1 text-xs text-neutral-500" aria-label="Breadcrumb">
        <Link href={`/patients/${patientId}`} className="hover:text-brand-700">
          Patient
        </Link>
        <ChevronRight className="h-3 w-3 text-neutral-300" aria-hidden="true" />
        <Link href={`/patients/${patientId}/${backLabel}`} className="hover:text-brand-700">
          {backLabel.charAt(0).toUpperCase() + backLabel.slice(1)}
        </Link>
      </nav>
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
      <p className="text-sm text-neutral-500">{description}</p>
    </header>
  );
}
