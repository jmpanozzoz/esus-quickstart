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
import type { MedicationRequestStatus } from "@/lib/fhir-clinical";

interface FormState {
  medication: string;
  status: MedicationRequestStatus;
  intent: "order" | "plan" | "proposal";
  dosage: string;
  reason: string;
  note: string;
}

export function MedicationForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    medication: "",
    status: "active",
    intent: "order",
    dosage: "",
    reason: "",
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
      status: form.status,
      intent: form.intent,
      medicationCodeableConcept: { text: form.medication },
      ...(form.dosage ? { dosageInstruction: [{ text: form.dosage }] } : {}),
      ...(form.reason ? { reasonCode: [{ text: form.reason }] } : {}),
      ...(form.note ? { note: [{ text: form.note }] } : {}),
    };

    try {
      const res = await fetch("/api/fhir/MedicationRequest", {
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
      router.push(`/patients/${patientId}/medications`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <FormSection title="Medication">
        <Field label="Medication" required hint='e.g. "Lisinopril 10 mg tablet"'>
          <TextInput
            required
            autoFocus
            value={form.medication}
            onChange={(e) => update("medication", e.target.value)}
          />
        </Field>
        <Field label="Dosage instructions" hint='Free-text, e.g. "1 tablet by mouth once daily"'>
          <TextInput value={form.dosage} onChange={(e) => update("dosage", e.target.value)} />
        </Field>
        <Field label="Reason">
          <TextInput
            placeholder="Indication for prescribing"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
          />
        </Field>
      </FormSection>

      <FormSection title="Order">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => update("status", e.target.value as MedicationRequestStatus)}>
              <option value="active">Active</option>
              <option value="on-hold">On hold</option>
              <option value="completed">Completed</option>
              <option value="stopped">Stopped</option>
              <option value="cancelled">Cancelled</option>
              <option value="draft">Draft</option>
            </Select>
          </Field>
          <Field label="Intent" required>
            <Select value={form.intent} onChange={(e) => update("intent", e.target.value as FormState["intent"])}>
              <option value="order">Order</option>
              <option value="plan">Plan</option>
              <option value="proposal">Proposal</option>
            </Select>
          </Field>
        </div>
        <Field label="Note">
          <TextInput value={form.note} onChange={(e) => update("note", e.target.value)} />
        </Field>
      </FormSection>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <PrimaryButton type="submit" loading={saving}>
          Prescribe
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
