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
import { OBSERVATION_QUICK, type ObservationStatus } from "@/lib/fhir-clinical";

interface FormState {
  code: string;
  status: ObservationStatus;
  value: string;
  unit: string;
  effectiveDateTime: string;
  note: string;
}

function nowIsoLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ObservationForm({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    code: "",
    status: "final",
    value: "",
    unit: "",
    effectiveDateTime: nowIsoLocal(),
    note: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function pickQuick(label: string, unit: string | undefined) {
    setForm((f) => ({ ...f, code: label, unit: unit ?? "" }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    // If the user typed a number with a unit, send as valueQuantity (the
    // FHIR-blessed shape for vitals). Otherwise fall back to valueString
    // so free-text like "Slightly elevated" still saves.
    const numeric = form.value && form.unit && !Number.isNaN(Number(form.value));
    const value = numeric
      ? { valueQuantity: { value: Number(form.value), unit: form.unit } }
      : form.value
        ? { valueString: form.unit ? `${form.value} ${form.unit}` : form.value }
        : {};

    const resource = {
      subjectId: patientId,
      status: form.status,
      code: { text: form.code },
      ...(form.effectiveDateTime ? { effectiveDateTime: new Date(form.effectiveDateTime).toISOString() } : {}),
      ...value,
      ...(form.note ? { note: [{ text: form.note }] } : {}),
    };

    try {
      const res = await fetch("/api/fhir/Observation", {
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
      router.push(`/patients/${patientId}/observations`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <FormSection title="Quick entry">
        <div className="flex flex-wrap gap-1.5">
          {OBSERVATION_QUICK.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => pickQuick(q.label, q.unit)}
              className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-100"
            >
              {q.label}
            </button>
          ))}
        </div>
      </FormSection>

      <FormSection title="Observation">
        <Field label="What" required hint='e.g. "Blood pressure", "Weight". Free-text for v1.'>
          <TextInput required value={form.code} onChange={(e) => update("code", e.target.value)} />
        </Field>
        <div className="grid grid-cols-[1fr_140px] gap-3">
          <Field label="Value" required>
            <TextInput
              required
              placeholder='120/80, 36.5, "Within range"'
              value={form.value}
              onChange={(e) => update("value", e.target.value)}
            />
          </Field>
          <Field label="Unit">
            <TextInput
              placeholder="mmHg, kg, …"
              value={form.unit}
              onChange={(e) => update("unit", e.target.value)}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Effective" required>
            <TextInput
              type="datetime-local"
              required
              value={form.effectiveDateTime}
              onChange={(e) => update("effectiveDateTime", e.target.value)}
            />
          </Field>
          <Field label="Status" required>
            <Select value={form.status} onChange={(e) => update("status", e.target.value as ObservationStatus)}>
              <option value="final">Final</option>
              <option value="preliminary">Preliminary</option>
              <option value="registered">Registered</option>
              <option value="amended">Amended</option>
              <option value="corrected">Corrected</option>
              <option value="cancelled">Cancelled</option>
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
          Save observation
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
