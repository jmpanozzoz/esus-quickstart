import { Sparkles } from "lucide-react";

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-10 text-center shadow-card">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">{description}</p>
    </div>
  );
}
