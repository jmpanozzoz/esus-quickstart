"use client";

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
} from "../../../../_components/Field";
import {
  CONDITION_CLINICAL_OPTIONS,
  CONDITION_SEVERITY_OPTIONS,
  type ConditionClinicalStatus,
} from "@/lib/fhir-clinical";

interface FormState {
  code: string;
  clinicalStatus: ConditionClinicalStatus;
  severity: string;
  onsetDateTime: string;
  recordedDate: string;
  note: string;
}

export function ConditionForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<FormState>({
    code: "",
    clinicalStatus: "active",
    severity: "",
    onsetDateTime: "",
    recordedDate: today,
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const resource = {
      subjectId: patientId,
      code: { text: form.code },
      clinicalStatus: { text: form.clinicalStatus },
      ...(form.severity ? { severity: { text: form.severity } } : {}),
      ...(form.onsetDateTime ? { onsetDateTime: form.onsetDateTime } : {}),
      ...(form.recordedDate ? { recordedDate: form.recordedDate } : {}),
      ...(form.note ? { note: [{ text: form.note }] } : {}),
    };

    try {
      const res = await fetch("/api/fhir/Condition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resource),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const diag = body?.issue?.[0]?.diagnostics ?? body?.error ?? `Create failed (${res.status})`;
        setError(typeof diag === "string" ? diag : JSON.stringify(diag));
        return;
      }
      router.push(`/patients/${patientId}/conditions`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <FormSection title="Condition">
        <Field label="Condition" required hint='e.g. "Type 2 diabetes", "Hypertension"'>
          <TextInput required autoFocus value={form.code} onChange={(e) => update("code", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Clinical status" required>
            <Select
              value={form.clinicalStatus}
              onChange={(e) => update("clinicalStatus", e.target.value as ConditionClinicalStatus)}
            >
              {CONDITION_CLINICAL_OPTIONS.map((o) => (
                <option key={o.code} value={o.code}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Severity">
            <Select value={form.severity} onChange={(e) => update("severity", e.target.value)}>
              <option value="">—</option>
              {CONDITION_SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Timeline">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Onset" hint="When the patient started experiencing this.">
            <TextInput
              type="date"
              value={form.onsetDateTime}
              onChange={(e) => update("onsetDateTime", e.target.value)}
            />
          </Field>
          <Field label="Recorded" hint="When this was documented in the chart.">
            <TextInput
              type="date"
              value={form.recordedDate}
              onChange={(e) => update("recordedDate", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Note">
          <TextInput value={form.note} onChange={(e) => update("note", e.target.value)} />
        </Field>
      </FormSection>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <PrimaryButton type="submit" loading={saving}>
          Add condition
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
