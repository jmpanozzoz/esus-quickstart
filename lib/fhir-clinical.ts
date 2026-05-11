/**
 * Shared types and helpers for the three per-patient clinical
 * resources: Condition (problem list / diagnoses), Observation (labs +
 * vitals), and MedicationRequest (prescriptions). They share a common
 * shape (subject + status + a coded "what") so the UI can lean on the
 * same renderers.
 */
import type { FhirResource } from "./fhir";

export interface CodeableConcept {
  text?: string;
  coding?: { display?: string; code?: string; system?: string }[];
}

export interface SubjectRef {
  reference?: string;
}

export function codeableText(c: CodeableConcept | undefined): string {
  if (!c) return "—";
  return c.text ?? c.coding?.[0]?.display ?? c.coding?.[0]?.code ?? "—";
}

export function refId(r: SubjectRef | undefined, prefix: string): string | null {
  if (!r?.reference?.startsWith(prefix)) return null;
  return r.reference.slice(prefix.length);
}

// ── Condition ───────────────────────────────────────────────────────────────

export type ConditionClinicalStatus =
  | "active"
  | "recurrence"
  | "relapse"
  | "inactive"
  | "remission"
  | "resolved";

export interface Condition extends FhirResource {
  resourceType: "Condition";
  clinicalStatus?: CodeableConcept;
  verificationStatus?: CodeableConcept;
  severity?: CodeableConcept;
  code: CodeableConcept;
  subject?: SubjectRef;
  onsetDateTime?: string;
  recordedDate?: string;
  note?: { text: string }[];
}

export const CONDITION_CLINICAL_OPTIONS: { code: ConditionClinicalStatus; label: string }[] = [
  { code: "active", label: "Active" },
  { code: "recurrence", label: "Recurrence" },
  { code: "relapse", label: "Relapse" },
  { code: "inactive", label: "Inactive" },
  { code: "remission", label: "Remission" },
  { code: "resolved", label: "Resolved" },
];

export const CONDITION_SEVERITY_OPTIONS = ["Mild", "Moderate", "Severe"];

export function conditionStatusBadge(s?: string): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]";
  if (s === "active" || s === "recurrence" || s === "relapse") return `${base} bg-neutral-900 text-white`;
  if (s === "resolved" || s === "remission") return `${base} bg-neutral-100 text-neutral-700`;
  if (s === "inactive") return `${base} border border-neutral-300 text-neutral-600`;
  return `${base} bg-neutral-100 text-neutral-600`;
}

// ── Observation ─────────────────────────────────────────────────────────────

export type ObservationStatus =
  | "registered"
  | "preliminary"
  | "final"
  | "amended"
  | "corrected"
  | "cancelled"
  | "entered-in-error"
  | "unknown";

export interface Observation extends FhirResource {
  resourceType: "Observation";
  status?: ObservationStatus;
  code: CodeableConcept;
  subject?: SubjectRef;
  effectiveDateTime?: string;
  valueQuantity?: { value?: number; unit?: string };
  valueString?: string;
  valueCodeableConcept?: CodeableConcept;
  note?: { text: string }[];
}

export function observationValue(o: Observation): string {
  if (o.valueQuantity?.value !== undefined) {
    const u = o.valueQuantity.unit ?? "";
    return `${o.valueQuantity.value}${u ? ` ${u}` : ""}`;
  }
  if (o.valueString) return o.valueString;
  if (o.valueCodeableConcept) return codeableText(o.valueCodeableConcept);
  return "—";
}

export function observationStatusBadge(s?: ObservationStatus): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]";
  if (s === "final" || s === "amended" || s === "corrected") return `${base} bg-neutral-900 text-white`;
  if (s === "preliminary" || s === "registered") return `${base} border border-neutral-300 text-neutral-600`;
  if (s === "cancelled" || s === "entered-in-error") return `${base} bg-neutral-100 text-neutral-400 line-through`;
  return `${base} bg-neutral-100 text-neutral-600`;
}

// Common quick-entry options for clinical vitals
export const OBSERVATION_QUICK: { label: string; unit?: string }[] = [
  { label: "Blood pressure", unit: "mmHg" },
  { label: "Heart rate", unit: "bpm" },
  { label: "Temperature", unit: "°C" },
  { label: "Weight", unit: "kg" },
  { label: "Height", unit: "cm" },
  { label: "Respiratory rate", unit: "/min" },
  { label: "SpO2", unit: "%" },
  { label: "Pain score", unit: "/10" },
];

// ── MedicationRequest ───────────────────────────────────────────────────────

export type MedicationRequestStatus =
  | "active"
  | "on-hold"
  | "cancelled"
  | "completed"
  | "stopped"
  | "draft"
  | "entered-in-error"
  | "unknown";

export interface MedicationRequest extends FhirResource {
  resourceType: "MedicationRequest";
  status?: MedicationRequestStatus;
  intent?: string;
  medicationCodeableConcept?: CodeableConcept;
  /** Some servers normalize `medicationCodeableConcept` to a Reference with a text. */
  medicationReference?: { reference?: string; display?: string; text?: string };
  subject?: SubjectRef;
  authoredOn?: string;
  reasonCode?: CodeableConcept[];
  dosageInstruction?: { text?: string; route?: CodeableConcept }[];
  note?: { text: string }[];
}

export function medicationDisplay(m: MedicationRequest): string {
  return (
    m.medicationCodeableConcept?.text ??
    m.medicationCodeableConcept?.coding?.[0]?.display ??
    m.medicationReference?.text ??
    m.medicationReference?.display ??
    "—"
  );
}

export function medicationStatusBadge(s?: MedicationRequestStatus): string {
  const base = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px]";
  if (s === "active") return `${base} bg-neutral-900 text-white`;
  if (s === "completed") return `${base} bg-neutral-100 text-neutral-700`;
  if (s === "on-hold" || s === "draft") return `${base} border border-neutral-300 text-neutral-600`;
  if (s === "cancelled" || s === "stopped" || s === "entered-in-error") return `${base} bg-neutral-100 text-neutral-400 line-through`;
  return `${base} bg-neutral-100 text-neutral-600`;
}
