/**
 * Tiny presentation helpers for FHIR resources. Kept separate from
 * lib/fhir.ts so the transport layer doesn't pull in formatting code.
 */

export interface HumanName {
  use?: string;
  family?: string;
  given?: string[];
  text?: string;
}

export function formatName(names?: HumanName[]): string {
  if (!names || names.length === 0) return "—";
  const n = names.find((x) => x.use === "official") ?? names[0];
  if (n.text) return n.text;
  const given = (n.given ?? []).join(" ");
  return [given, n.family].filter(Boolean).join(" ") || "—";
}

export function initials(names?: HumanName[]): string {
  if (!names || names.length === 0) return "?";
  const n = names.find((x) => x.use === "official") ?? names[0];
  const first = (n.given?.[0]?.[0] ?? "").toUpperCase();
  const last = (n.family?.[0] ?? "").toUpperCase();
  return (first + last) || "?";
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export function formatGender(g?: string): string {
  if (!g) return "—";
  return g.charAt(0).toUpperCase() + g.slice(1);
}

export function ageFromBirthDate(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

export interface Identifier {
  use?: string;
  system?: string;
  value?: string;
  type?: { text?: string; coding?: { display?: string }[] };
}

/** API encrypts PHI fields at rest and returns this marker. Display masked. */
export function unmaskPHI(value: string | null | undefined): string {
  if (value === undefined || value === null || value === "") return "—";
  if (value === "***ENCRYPTED***") return "•••";
  return value;
}

export function primaryIdentifier(ids?: Identifier[]): string {
  if (!ids || ids.length === 0) return "—";
  const official = ids.find((x) => x.use === "official") ?? ids[0];
  return unmaskPHI(official.value);
}

const ID_SYSTEM_TO_LABEL: Record<string, string> = {
  "urn:oid:2.16.840.1.113883.4.1": "National ID",
  "http://hl7.org/fhir/sid/passport": "Passport",
  "urn:esus:mrn": "MRN",
  "urn:esus:practitioner-license": "License",
};

export function identifierLabel(id?: Identifier): string {
  if (!id) return "ID";
  return (
    id.type?.text ??
    id.type?.coding?.[0]?.display ??
    (id.system ? ID_SYSTEM_TO_LABEL[id.system] : undefined) ??
    "ID"
  );
}

export interface ContactPoint {
  system?: string;
  value?: string;
  use?: string;
}

export function findTelecom(telecom?: ContactPoint[], system?: string): string | null {
  if (!telecom) return null;
  const hit = telecom.find((t) => t.system === system);
  if (!hit?.value) return null;
  return hit.value === "***ENCRYPTED***" ? "•••" : hit.value;
}

export interface Address {
  use?: string;
  line?: string[];
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export function formatAddress(addr?: Address[]): string {
  if (!addr || addr.length === 0) return "—";
  const a = addr.find((x) => x.use === "home") ?? addr[0];
  const parts = [(a.line ?? []).join(" "), a.city, a.state, a.postalCode, a.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}
