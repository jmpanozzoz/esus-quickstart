/**
 * Encounter shape and helpers. An Encounter represents an actual
 * clinical interaction (a visit), distinct from an Appointment which
 * is the *scheduled* event. In FHIR an arrived appointment typically
 * becomes an encounter with status "in-progress".
 */
import type { FhirResource } from "./fhir";

export type EncounterStatus =
  | "planned"
  | "arrived"
  | "triaged"
  | "in-progress"
  | "onleave"
  | "finished"
  | "cancelled";

export interface EncounterParticipant {
  individual?: { reference?: string; display?: string };
  type?: { text?: string }[];
  period?: { start?: string; end?: string };
}

export interface Encounter extends FhirResource {
  resourceType: "Encounter";
  status?: EncounterStatus;
  class?: { code?: string; display?: string } | string;
  type?: { text?: string }[];
  subject?: { reference?: string; display?: string };
  participant?: EncounterParticipant[];
  reasonCode?: { text?: string }[];
  period?: { start?: string; end?: string };
}

/**
 * Common FHIR Encounter class codes (v3 ActCode). We expose only the
 * ones a generic clinic app needs.
 */
export const ENCOUNTER_CLASS_OPTIONS: { code: string; label: string }[] = [
  { code: "AMB", label: "Ambulatory" },
  { code: "EMER", label: "Emergency" },
  { code: "IMP", label: "Inpatient" },
  { code: "HH", label: "Home health" },
  { code: "VR", label: "Virtual" },
  { code: "FLD", label: "Field" },
];

export function classCode(c: Encounter["class"]): string | undefined {
  if (!c) return undefined;
  if (typeof c === "string") return c;
  return c.code;
}

export function classLabel(c: Encounter["class"]): string {
  const code = classCode(c);
  if (!code) return "—";
  const match = ENCOUNTER_CLASS_OPTIONS.find((o) => o.code === code);
  return match?.label ?? code;
}

export function patientRefId(enc: Encounter): string | null {
  const ref = enc.subject?.reference;
  if (!ref?.startsWith("Patient/")) return null;
  return ref.slice("Patient/".length);
}

export function practitionerRefId(enc: Encounter): string | null {
  const p = enc.participant?.find((x) => x.individual?.reference?.startsWith("Practitioner/"));
  return p?.individual?.reference?.slice("Practitioner/".length) ?? null;
}

const TONE_CLS: Record<string, string> = {
  active: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200",
  done: "bg-neutral-100 text-neutral-700",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  off: "bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-200 line-through",
};

export function encounterStatusBadge(status?: EncounterStatus): string {
  let tone: keyof typeof TONE_CLS = "pending";
  if (status === "in-progress" || status === "arrived" || status === "triaged") tone = "active";
  else if (status === "finished") tone = "done";
  else if (status === "cancelled") tone = "off";
  return `inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONE_CLS[tone]}`;
}
