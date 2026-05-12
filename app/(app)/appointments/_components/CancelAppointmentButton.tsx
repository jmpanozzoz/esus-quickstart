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
      className="inline-flex items-center rounded-md bg-white px-2.5 py-1 text-xs font-medium text-rose-600 ring-1 ring-inset ring-rose-200 transition-colors hover:bg-rose-50 hover:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy ? "Cancelling…" : "Cancel"}
    </button>
  );
}
