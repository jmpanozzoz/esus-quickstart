/**
 * Small primitives used by the create/edit forms so every form has the
 * same spacing, labels, and focus ring. Inputs/selects inherit border +
 * focus styles from `globals.css` — no per-component `className` needed.
 */
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-neutral-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </span>
      {children}
      {hint ? <span className="block text-[11px] leading-relaxed text-neutral-500">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function Textarea({ className, rows = 3, ...rest }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={rows} {...rest} className={cn("resize-y", className)} />;
}

/**
 * Row of toggle-able chips that drive a single text value. Tapping an
 * active chip clears the value (lets the user reset to free-text). Used
 * inside `<Field>` directly below the input it augments.
 */
export function QuickPicks({
  value,
  onPick,
  options,
}: {
  value: string;
  onPick: (next: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onPick(active ? "" : opt)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-brand-600 text-white shadow-card"
                : "bg-white text-neutral-700 ring-1 ring-inset ring-neutral-200 hover:bg-brand-50 hover:text-brand-700 hover:ring-brand-200",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function PrimaryButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
    >
      {loading ? "Saving…" : children}
    </button>
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300"
    />
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export function FormSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">{title}</h2>
        {hint ? <p className="mt-1 text-xs text-neutral-500">{hint}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
