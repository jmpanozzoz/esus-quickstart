"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Field,
  FormError,
  FormSection,
  PrimaryButton,
  QuickPicks,
  SecondaryButton,
  Select,
  Textarea,
  TextInput,
} from "../../_components/Field";

const COMMON_REASONS = [
  "Annual check-up",
  "Follow-up",
  "New consultation",
  "Acute visit",
  "Lab review",
  "Procedure",
  "Telehealth",
] as const;

export interface Option {
  id: string;
  label: string;
}

interface FormState {
  patientId: string;
  practitionerId: string;
  date: string;
  time: string;
  durationMin: number;
  reason: string;
  description: string;
}

function defaultState(): FormState {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    patientId: "",
    practitionerId: "",
    date: tomorrow.toISOString().slice(0, 10),
    time: "10:00",
    durationMin: 30,
    reason: "",
    description: "",
  };
}

export function AppointmentForm({
  patients,
  practitioners,
}: {
  patients: Option[];
  practitioners: Option[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(defaultState);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const start = new Date(`${form.date}T${form.time}:00`);
    const end = new Date(start.getTime() + form.durationMin * 60_000);

    const resource = {
      status: "booked",
      start: start.toISOString(),
      end: end.toISOString(),
      minutesDuration: form.durationMin,
      ...(form.description ? { description: form.description } : {}),
      ...(form.reason ? { reasonCode: [{ text: form.reason }] } : {}),
      participant: [
        { actor: { reference: `Patient/${form.patientId}` }, status: "accepted", required: "required" },
        {
          actor: { reference: `Practitioner/${form.practitionerId}` },
          status: "accepted",
          required: "required",
        },
      ],
    };

    try {
      const res = await fetch("/api/fhir/Appointment", {
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
      router.push("/appointments");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-3xl space-y-8">
      <FormSection title="Participants">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
          <Field label="Practitioner" required>
            <Select
              required
              value={form.practitionerId}
              onChange={(e) => update("practitionerId", e.target.value)}
            >
              <option value="">Select a practitioner…</option>
              {practitioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="When">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Date" required>
            <TextInput type="date" required value={form.date} onChange={(e) => update("date", e.target.value)} />
          </Field>
          <Field label="Time" required>
            <TextInput type="time" required value={form.time} onChange={(e) => update("time", e.target.value)} />
          </Field>
          <Field label="Duration (min)" required>
            <Select
              value={String(form.durationMin)}
              onChange={(e) => update("durationMin", Number(e.target.value))}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
              <option value="90">90</option>
            </Select>
          </Field>
        </div>
      </FormSection>

      <FormSection title="Reason for visit" hint="What's the appointment about? Tap a common reason or type your own.">
        <Field label="Reason">
          <TextInput
            placeholder="Annual check-up, follow-up, …"
            value={form.reason}
            onChange={(e) => update("reason", e.target.value)}
          />
          <QuickPicks value={form.reason} onPick={(v) => update("reason", v)} options={COMMON_REASONS} />
        </Field>

        <Field label="Notes" hint="Surfaced as the appointment description — visible to the patient on confirmation.">
          <Textarea
            placeholder="Anything the practitioner should know before the visit?"
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </Field>
      </FormSection>

      {error ? <FormError>{error}</FormError> : null}

      <div className="flex gap-3 border-t border-neutral-200 pt-6">
        <PrimaryButton type="submit" loading={saving}>
          Schedule
        </PrimaryButton>
        <SecondaryButton type="button" onClick={() => router.back()}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
