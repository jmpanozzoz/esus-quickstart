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
    <header className="space-y-1">
      <p className="text-xs text-neutral-500">
        <Link href={`/patients/${patientId}`} className="hover:text-neutral-700">
          ← Patient
        </Link>
        {" · "}
        <Link href={`/patients/${patientId}/${backLabel}`} className="hover:text-neutral-700">
          {backLabel.charAt(0).toUpperCase() + backLabel.slice(1)}
        </Link>
      </p>
      <h1 className="text-2xl font-semibold text-neutral-900">{title}</h1>
      <p className="text-sm text-neutral-500">{description}</p>
    </header>
  );
}
