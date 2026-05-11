/**
 * Appointment shape and helpers. Kept here so list / new / detail pages
 * share a single source of truth for status semantics and reference
 * extraction.
 */
import type { FhirResource } from "./fhir";
import type { HumanName } from "./fhir-helpers";

export type AppointmentStatus =
  | "proposed"
  | "pending"
  | "booked"
  | "arrived"
  | "fulfilled"
  | "cancelled"
  | "noshow"
  | "entered-in-error"
  | "checked-in"
  | "waitlist";

export interface Participant {
  actor?: { reference?: string; display?: string };
  status: string;
  type?: { text?: string }[];
}

export interface Appointment extends FhirResource {
  resourceType: "Appointment";
  status?: AppointmentStatus;
  description?: string;
  start?: string;
  end?: string;
  minutesDuration?: number;
  participant?: Participant[];
  reasonCode?: { text?: string }[];
  // The API resolves these for convenience on read.
  patientReferences?: ResolvedRef[];
  practitionerReferences?: ResolvedRef[];
}

export interface ResolvedRef {
  reference?: string;
  display?: string;
  name?: HumanName[];
}

export function extractRef(participants: Participant[] | undefined, prefix: "Patient/" | "Practitioner/"): string | null {
  if (!participants) return null;
  const hit = participants.find((p) => p.actor?.reference?.startsWith(prefix));
  return hit?.actor?.reference?.slice(prefix.length) ?? null;
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

export function statusTone(status?: AppointmentStatus): "neutral" | "positive" | "warning" | "danger" {
  switch (status) {
    case "booked":
    case "arrived":
    case "checked-in":
      return "positive";
    case "fulfilled":
      return "neutral";
    case "cancelled":
    case "noshow":
    case "entered-in-error":
      return "danger";
    case "pending":
    case "waitlist":
    case "proposed":
      return "warning";
    default:
      return "neutral";
  }
}

const TONE_CLS: Record<ReturnType<typeof statusTone>, string> = {
  neutral: "bg-neutral-100 text-neutral-700",
  positive: "bg-neutral-900 text-white",
  warning: "border border-neutral-300 text-neutral-600",
  danger: "bg-neutral-100 text-neutral-400 line-through",
};

export function statusBadgeClass(status?: AppointmentStatus): string {
  return `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${TONE_CLS[statusTone(status)]}`;
}

export function isUpcoming(start?: string): boolean {
  if (!start) return false;
  return new Date(start).getTime() >= Date.now();
}

export function isToday(start?: string): boolean {
  if (!start) return false;
  const d = new Date(start);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
