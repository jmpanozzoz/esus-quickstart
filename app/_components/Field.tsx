/**
 * Form primitives. Every input on every form goes through here.
 *
 * Styling lives on the component, not on global element selectors. Why:
 *
 *   - Tailwind's Preflight (`@layer base`) zeroes `border-width` for all
 *     elements. Reading raw `input[type="..."]` selectors in `globals.css`
 *     fights that reset with cascade order — and on some inputs (notably
 *     `type="text"`) Preflight wins. Tailwind utility classes live in
 *     `@layer utilities`, which always defeats `@layer base`, so applying
 *     classes from inside the component sidesteps the cascade war.
 *
 *   - Variants (`size`, `intent`) are a per-call decision, not a per-page
 *     CSS class soup. The wrapper picks the right combination so callers
 *     stay declarative: `<TextInput intent="danger" />`.
 *
 *   - `aria-invalid` becomes a visual default: if the form-control layer
 *     marks a field invalid, the rose-tinted border appears automatically.
 *
 * Public API:
 *   <Field label hint required> – label + hint + required asterisk wrapper
 *   <TextInput>      – `<input>` for text/email/password/search/url/tel/date/time/etc.
 *   <Textarea>       – `<textarea>` with vertical resize
 *   <Select>         – `<select>` with custom chevron
 *   <NumberInput>    – `<input type="number">` (no spinner buttons)
 *   <Checkbox>       – `<input type="checkbox">` + label row
 *   <QuickPicks>     – pill row that pipes a value into a sibling input
 *   <PrimaryButton>, <SecondaryButton>
 *   <FormError>      – inline error pill
 *   <FormSection>    – titled section divider
 */
import { AlertCircle } from "lucide-react";
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// ── Shared class fragments ──────────────────────────────────────────────────
//
// These are the building blocks every form control composes. Keeping them as
// constants (not inline) makes a refactor of "the form look" exactly one edit.

/** Common to <input>, <select>, <textarea>: spacing, color, focus ring. */
const controlBase = [
  "block w-full rounded-lg border bg-white text-sm text-neutral-900",
  "px-3 py-2",
  "transition-colors",
  "placeholder:text-neutral-400",
  "hover:border-neutral-400",
  "focus:border-brand-500 focus:outline-none",
  "focus:ring-4 focus:ring-brand-100",
  "disabled:bg-neutral-100 disabled:text-neutral-500 disabled:cursor-not-allowed",
  "aria-[invalid=true]:border-rose-500",
  "aria-[invalid=true]:focus:ring-rose-100",
].join(" ");

const controlBorderDefault = "border-neutral-300";
const controlBorderDanger = "border-rose-400";

/** Single-line controls match `<input type=text>` height so they line up
 * inside `grid-cols-2`. Textarea opts out so it can grow vertically. */
const sizeMd = "min-h-[38px]";
const sizeSm = "min-h-[32px] text-xs px-2.5";

type ControlSize = "sm" | "md";
type ControlIntent = "default" | "danger";

/** Compose the right class string for a given size/intent without forcing
 * every callsite to spell it out. `intent="danger"` is also activated
 * automatically when `aria-invalid="true"` is passed — but kept as an
 * explicit prop for callers that don't want to flip aria. */
function controlClasses(opts: { size?: ControlSize; intent?: ControlIntent; className?: string }): string {
  return cn(
    controlBase,
    opts.intent === "danger" ? controlBorderDanger : controlBorderDefault,
    opts.size === "sm" ? sizeSm : sizeMd,
    opts.className,
  );
}

// ── <Field> ─────────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string;
  hint?: string;
  /** Adds the red asterisk next to the label. Does NOT add `required` on the
   * inner input — that stays the caller's responsibility so form-level
   * validation can decide whether to surface natively. */
  required?: boolean;
  /** Inline error text under the field. Sets the field group's tone red. */
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-neutral-700">
        {label}
        {required ? <span className="ml-0.5 text-rose-600">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="flex items-start gap-1 text-[11px] leading-relaxed text-rose-700">
          <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="block text-[11px] leading-relaxed text-neutral-500">{hint}</span>
      ) : null}
    </label>
  );
}

// ── <TextInput> ─────────────────────────────────────────────────────────────

// Omit the native HTML `size` attribute (a number, used for visible-char
// width on older browsers) so we can safely shadow it with our own
// `ControlSize` string prop without a TypeScript interface conflict.
export interface TextInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: ControlSize;
  intent?: ControlIntent;
}

export function TextInput({ size, intent, className, ...rest }: TextInputProps) {
  return <input {...rest} className={controlClasses({ size, intent, className })} />;
}

// ── <NumberInput> ───────────────────────────────────────────────────────────

export function NumberInput({ className, size, intent, ...rest }: TextInputProps) {
  // Hide the native spinner with `appearance-none` + Firefox-specific tweak,
  // because the up/down chevrons don't fit our visual language and a stepper
  // belongs on the `<QuickPicks>` row anyway.
  // `size` and `intent` are destructured so they don't end up in `rest` —
  // spreading our ControlSize string into the native <input size={number}>
  // attr causes a TS type error in strict-mode builds.
  return (
    <input
      type="number"
      {...rest}
      className={cn(
        controlClasses({ size, intent, className }),
        "appearance-none [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [-moz-appearance:textfield]",
      )}
    />
  );
}

// ── <Select> ────────────────────────────────────────────────────────────────

// Same `Omit<..., "size">` pattern: HTMLSelectElement also has size?: number.
export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: ControlSize;
  intent?: ControlIntent;
}

/** Inline SVG chevron — lucide `chevron-down` recoloured to neutral-500. */
const selectChevron = `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23737373' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`;

export function Select({ size, intent, className, style, ...rest }: SelectProps) {
  return (
    <select
      {...rest}
      style={{
        backgroundImage: selectChevron,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 0.6rem center",
        backgroundSize: "1rem",
        ...style,
      }}
      className={cn(
        controlClasses({ size, intent, className }),
        "appearance-none pr-9",
      )}
    />
  );
}

// ── <Textarea> ──────────────────────────────────────────────────────────────

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  intent?: ControlIntent;
}

export function Textarea({ rows = 3, intent, className, ...rest }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      {...rest}
      // No min-height pin — let it grow. `resize-y` so users can stretch it
      // but not break the page width by dragging horizontally.
      className={cn(
        controlBase,
        intent === "danger" ? controlBorderDanger : controlBorderDefault,
        "resize-y",
        className,
      )}
    />
  );
}

// ── <Checkbox> ──────────────────────────────────────────────────────────────

export function Checkbox({
  label,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className={cn("flex items-center gap-2 text-sm text-neutral-700", className)}>
      <input
        type="checkbox"
        {...rest}
        className="h-4 w-4 rounded border-neutral-300 accent-brand-600 focus:ring-2 focus:ring-brand-100 focus:ring-offset-0"
      />
      {label}
    </label>
  );
}

// ── <QuickPicks> ────────────────────────────────────────────────────────────
// Toggle-able chip row that drives a single text value. Tap an active chip
// to clear the value. Used directly under the input it augments.

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

// ── Buttons ─────────────────────────────────────────────────────────────────

export function PrimaryButton({
  children,
  loading,
  ...rest
}: InputHTMLAttributes<HTMLButtonElement> & { loading?: boolean; children: ReactNode }) {
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

export function SecondaryButton(props: InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300"
    />
  );
}

// ── <FormError> / <FormSection> ─────────────────────────────────────────────

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
