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
} from "../../_components/Field";
import { ENCOUNTER_CLASS_OPTIONS, type EncounterStatus } from "@/lib/fhir-encounter";

export interface Option {
  id: string;
  label: string;
}

interface FormState {
  patientId: string;
  practitionerId: string;
  class: string;
  status: EncounterStatus;
  type: string;
  reason: string;
}

const empty: FormState = {
  patientId: "",
  practitionerId: "",
  class: "AMB",
  status: "in-progress",
  type: "",
  reason: "",
};

export function EncounterForm({ patients, practitioners }: { patients: Option[]; practitioners: Option[] }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(empty);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const resource = {
      status: form.status,
      class: form.class,
      subjectId: form.patientId,
      ...(form.type ? { type: [{ text: form.type }] } : {}),
      ...(form.reason ? { reasonCode: [{ text: form.reason }] } : {}),
      ...(form.practitionerId
        ? {
            participant: [
              {
                individual: { reference: `Practitioner/${form.practitionerId}` },
              },
            ],
          }
        : {}),
    };

    try {
      const res = await fetch("/api/fhir/Encounter", {
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
      router.push("/encounters");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      <FormSection title="Participants">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Patient" required>
            <Select
              required
              value={form.patientId}
              onChange={(e) => update("patientId", e.target.value)}
              autoFocus
            >
              <option value="">Select a patient…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Practitioner">
            <Select value={form.practitionerId} onChange={(e) => update("practitionerId", e.target.value)}>
              <option value="">—</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Visit">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Class" required hint="Where / how the encounter is happening.">
            <Select value={form.class} onChange={(e) => update("class", e.target.value)}>
              {ENCOUNTER_CLASS_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label} ({c.code})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status" required>
            <Select
              value={form.status}
              onChange={(e) => update("status", e.target.value as EncounterStatus)}
            >
              <option value="planned">Planned</option>
              <option value="arrived">Arrived</option>
              <option value="triaged">Triaged</option>
              <option value="in-progress">In progress</option>
              <option value="finished">Finished</option>
              <option value="cancelled">Cancelled</option>
            </Select>
          </Field>
        </div>
        <Field label="Type" hint='e.g. "Annual physical", "Follow-up", "Tele-consult".'>
          <TextInput value={form.type} onChange={(e) => update("type", e.target.value)} />
        </Field>
        <Field label="Reason">
          <TextInput
            placeholder="Chief complaint, referral reason, …"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
          />
        </Field>
      </FormSection>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <PrimaryButton type="submit" loading={saving}>
          Open encounter
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
