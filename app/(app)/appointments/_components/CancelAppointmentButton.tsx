"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelAppointmentButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onCancel() {
    if (!confirm("Cancel this appointment?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/fhir/Appointment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        alert(body?.issue?.[0]?.diagnostics ?? body?.error ?? `Cancel failed (${res.status})`);
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={busy}
      className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-100 disabled:opacity-50"
    >
      {busy ? "Cancelling…" : "Cancel"}
    </button>
  );
}
