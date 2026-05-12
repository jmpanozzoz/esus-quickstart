"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { invalidateResource } from "@/lib/use-fhir";
import {
  Field,
  FormError,
  FormSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextInput,
} from "../../_components/Field";

export interface PatientFormState {
  given: string;
  family: string;
  gender: "" | "male" | "female" | "other" | "unknown";
  birthDate: string;
  maritalStatus: string;

  idSystem: "national_id" | "passport" | "mrn" | "other";
  idValue: string;

  phone: string;
  email: string;

  addrLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  active: boolean;
}

const empty: PatientFormState = {
  given: "",
  family: "",
  gender: "",
  birthDate: "",
  maritalStatus: "",
  idSystem: "national_id",
  idValue: "",
  phone: "",
  email: "",
  addrLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  active: true,
};

const ID_SYSTEM_URI: Record<PatientFormState["idSystem"], string> = {
  national_id: "urn:oid:2.16.840.1.113883.4.1",
  passport: "http://hl7.org/fhir/sid/passport",
  mrn: "urn:esus:mrn",
  other: "urn:esus:identifier",
};

const ID_SYSTEM_LABEL: Record<PatientFormState["idSystem"], string> = {
  national_id: "National ID",
  passport: "Passport",
  mrn: "Medical Record Number",
  other: "Other",
};

export interface PatientFormProps {
  /** When set, the form is in edit mode — submits PUT /api/fhir/Patient/{id}. */
  patientId?: string;
  initialValues?: Partial<PatientFormState>;
}

export function PatientForm({ patientId, initialValues }: PatientFormProps = {}) {
  const router = useRouter();
  const mode: "create" | "edit" = patientId ? "edit" : "create";
  const [form, setForm] = useState<PatientFormState>({ ...empty, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof PatientFormState>(key: K, value: PatientFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const telecom: { system: string; value: string; use?: string }[] = [];
    if (form.phone) telecom.push({ system: "phone", value: form.phone, use: "mobile" });
    if (form.email) telecom.push({ system: "email", value: form.email });

    const address: Record<string, unknown>[] = [];
    if (form.addrLine || form.city || form.state || form.postalCode || form.country) {
      address.push({
        use: "home",
        ...(form.addrLine ? { line: [form.addrLine] } : {}),
        ...(form.city ? { city: form.city } : {}),
        ...(form.state ? { state: form.state } : {}),
        ...(form.postalCode ? { postalCode: form.postalCode } : {}),
        ...(form.country ? { country: form.country } : {}),
      });
    }

    const identifier: Record<string, unknown>[] = [];
    if (form.idValue) {
      identifier.push({
        use: "official",
        system: ID_SYSTEM_URI[form.idSystem],
        value: form.idValue,
        type: { text: ID_SYSTEM_LABEL[form.idSystem] },
      });
    }

    const resource = {
      active: form.active,
      name: [{ use: "official", family: form.family, given: form.given ? [form.given] : undefined }],
      ...(form.gender ? { gender: form.gender } : {}),
      ...(form.birthDate ? { birthDate: form.birthDate } : {}),
      ...(form.maritalStatus ? { maritalStatus: { text: form.maritalStatus } } : {}),
      ...(identifier.length ? { identifier } : {}),
      ...(telecom.length ? { telecom } : {}),
      ...(address.length ? { address } : {}),
    };

    try {
      const url = patientId ? `/api/fhir/Patient/${patientId}` : "/api/fhir/Patient";
      const method = patientId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const diag = body?.issue?.[0]?.diagnostics ?? body?.error ?? `${patientId ? "Save" : "Create"} failed (${res.status})`;
        setError(typeof diag === "string" ? diag : JSON.stringify(diag));
        return;
      }
      await invalidateResource("Patient");
      router.push(patientId ? `/patients/${patientId}` : "/patients");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      {mode === "edit" ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p>
            <strong className="font-semibold">Encrypted fields appear blank.</strong> Document number, phone, and email
            are stored encrypted and aren&apos;t shown here. Leave them blank to keep the current value, or type to
            replace.
          </p>
        </div>
      ) : null}

      <FormSection title="Identity">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Given name" required>
            <TextInput required autoFocus value={form.given} onChange={(e) => update("given", e.target.value)} />
          </Field>
          <Field label="Family name" required>
            <TextInput required value={form.family} onChange={(e) => update("family", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => update("gender", e.target.value as PatientFormState["gender"])}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
          <Field label="Birth date">
            <TextInput type="date" value={form.birthDate} onChange={(e) => update("birthDate", e.target.value)} />
          </Field>
          <Field label="Marital status">
            <TextInput
              placeholder="Single, Married, …"
              value={form.maritalStatus}
              onChange={(e) => update("maritalStatus", e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Document" hint="National ID, passport, or local medical record number.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
          <Field label="Type">
            <Select value={form.idSystem} onChange={(e) => update("idSystem", e.target.value as PatientFormState["idSystem"])}>
              <option value="national_id">National ID</option>
              <option value="passport">Passport</option>
              <option value="mrn">MRN</option>
              <option value="other">Other</option>
            </Select>
          </Field>
          <Field label="Number">
            <TextInput
              placeholder="Document number"
              value={form.idValue}
              onChange={(e) => update("idValue", e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Phone">
            <TextInput
              type="tel"
              placeholder="+1 555 123 4567"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <TextInput
              type="email"
              placeholder="patient@example.com"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Address">
        <Field label="Street">
          <TextInput value={form.addrLine} onChange={(e) => update("addrLine", e.target.value)} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City">
            <TextInput value={form.city} onChange={(e) => update("city", e.target.value)} />
          </Field>
          <Field label="State / Region">
            <TextInput value={form.state} onChange={(e) => update("state", e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Postal code">
            <TextInput value={form.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
          </Field>
          <Field label="Country">
            <TextInput value={form.country} onChange={(e) => update("country", e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => update("active", e.target.checked)}
          className="h-4 w-4 rounded"
        />
        Active
      </label>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <PrimaryButton type="submit" loading={saving}>
          {mode === "edit" ? "Save changes" : "Create patient"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
