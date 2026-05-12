"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  FormError,
  FormSection,
  PrimaryButton,
  SecondaryButton,
  Select,
  TextInput,
} from "../../_components/Field";

export interface PractitionerFormState {
  given: string;
  family: string;
  gender: "" | "male" | "female" | "other" | "unknown";
  qualification: string;

  licenseNumber: string;

  phone: string;
  email: string;

  addrLine: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;

  active: boolean;
}

const empty: PractitionerFormState = {
  given: "",
  family: "",
  gender: "",
  qualification: "",
  licenseNumber: "",
  phone: "",
  email: "",
  addrLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  active: true,
};

export interface PractitionerFormProps {
  practitionerId?: string;
  initialValues?: Partial<PractitionerFormState>;
}

export function PractitionerForm({ practitionerId, initialValues }: PractitionerFormProps = {}) {
  const router = useRouter();
  const mode: "create" | "edit" = practitionerId ? "edit" : "create";
  const [form, setForm] = useState<PractitionerFormState>({ ...empty, ...initialValues });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof PractitionerFormState>(key: K, value: PractitionerFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const telecom: { system: string; value: string; use?: string }[] = [];
    if (form.phone) telecom.push({ system: "phone", value: form.phone, use: "work" });
    if (form.email) telecom.push({ system: "email", value: form.email, use: "work" });

    const address: Record<string, unknown>[] = [];
    if (form.addrLine || form.city || form.state || form.postalCode || form.country) {
      address.push({
        use: "work",
        ...(form.addrLine ? { line: [form.addrLine] } : {}),
        ...(form.city ? { city: form.city } : {}),
        ...(form.state ? { state: form.state } : {}),
        ...(form.postalCode ? { postalCode: form.postalCode } : {}),
        ...(form.country ? { country: form.country } : {}),
      });
    }

    const identifier: Record<string, unknown>[] = [];
    if (form.licenseNumber) {
      identifier.push({
        use: "official",
        system: "urn:esus:practitioner-license",
        value: form.licenseNumber,
        type: { text: "License" },
      });
    }

    const resource = {
      active: form.active,
      name: [{ use: "official", family: form.family, given: form.given ? [form.given] : undefined }],
      ...(form.gender ? { gender: form.gender } : {}),
      ...(identifier.length ? { identifier } : {}),
      ...(telecom.length ? { telecom } : {}),
      ...(address.length ? { address } : {}),
      ...(form.qualification ? { qualification: [{ code: { text: form.qualification } }] } : {}),
    };

    try {
      const url = practitionerId ? `/api/fhir/Practitioner/${practitionerId}` : "/api/fhir/Practitioner";
      const method = practitionerId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const diag =
          body?.issue?.[0]?.diagnostics ?? body?.error ?? `${practitionerId ? "Save" : "Create"} failed (${res.status})`;
        setError(typeof diag === "string" ? diag : JSON.stringify(diag));
        return;
      }
      router.push("/practitioners");
      router.refresh();
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
            <strong className="font-semibold">Encrypted fields appear blank.</strong> License number, phone, and email
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Qualification" hint='e.g. "Cardiologist", "RN, BSN"'>
            <TextInput value={form.qualification} onChange={(e) => update("qualification", e.target.value)} />
          </Field>
          <Field label="Gender">
            <Select value={form.gender} onChange={(e) => update("gender", e.target.value as PractitionerFormState["gender"])}>
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="License" hint="Professional license / colegiatura number.">
        <Field label="License number">
          <TextInput value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} />
        </Field>
      </FormSection>

      <FormSection title="Contact">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Work phone">
            <TextInput type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </Field>
          <Field label="Work email">
            <TextInput type="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </Field>
        </div>
      </FormSection>

      <FormSection title="Work address">
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
          {mode === "edit" ? "Save changes" : "Create practitioner"}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
