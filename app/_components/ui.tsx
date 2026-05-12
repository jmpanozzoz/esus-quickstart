/**
 * Tiny UI primitives used across the quickstart. Pure presentation —
 * no state, no client features, safe to import from both server and
 * client components.
 *
 * Why local primitives instead of pulling shadcn/radix: the quickstart
 * is meant to be readable end-to-end without any "wait, where does
 * this Button come from?" excursions. Five primitives × ~20 lines
 * each fits on one screen.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

// ── Button ──────────────────────────────────────────────────────────
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonBase =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300",
  secondary:
    "bg-white text-neutral-800 ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50 hover:ring-neutral-300",
  ghost:
    "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3.5 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...rest}
    />
  );
}

// ── Card ────────────────────────────────────────────────────────────
interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function Card({ hoverable, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-neutral-200 bg-white shadow-card",
        hoverable && "transition-shadow hover:shadow-card-hover",
        className,
      )}
      {...rest}
    />
  );
}

// ── Badge ───────────────────────────────────────────────────────────
type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  success: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  danger: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Page header ─────────────────────────────────────────────────────
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-2">
      <div className="min-w-0 space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm text-neutral-500">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

// ── Empty state ─────────────────────────────────────────────────────
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white px-6 py-12 text-center">
      {icon && (
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-neutral-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
