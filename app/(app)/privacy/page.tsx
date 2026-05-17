"use client";

export const runtime = "edge";

import { ShieldCheck, ShieldOff, AlertTriangle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/app/_components/ui";

// ── FHIR Consent shape (minimal) ────────────────────────────────────

interface ConsentCoding {
  system?: string;
  code?: string;
  display?: string;
}

interface FhirConsent {
  resourceType: "Consent";
  id?: string;
  status?: string;
  scope?: { coding?: ConsentCoding[] };
  category?: { coding?: ConsentCoding[] }[];
  dateTime?: string;
  provision?: { type?: string };
}

interface FhirBundle {
  resourceType: "Bundle";
  total?: number;
  entry?: { resource: FhirConsent }[];
}

// ── Helpers ────────────────────────────────────────────────────────

function consentLabel(consent: FhirConsent): string {
  const coding = consent.scope?.coding?.[0] ?? consent.category?.[0]?.coding?.[0];
  if (coding?.display) return coding.display;
  if (coding?.code) {
    // FHIR scope codes → human label
    const map: Record<string, string> = {
      "patient-privacy": "Patient Privacy",
      "treatment": "Treatment",
      "research": "Research",
      "adr": "Advanced Directive",
    };
    return map[coding.code] ?? coding.code;
  }
  return "Consent";
}

function statusTone(status: string | undefined): "success" | "warning" | "danger" | "neutral" {
  if (status === "active") return "success";
  if (status === "proposed" || status === "draft") return "warning";
  if (status === "rejected" || status === "inactive" || status === "entered-in-error") return "danger";
  return "neutral";
}

function formatDate(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Confirmation dialog ────────────────────────────────────────────

interface RevokeDialogProps {
  consentLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isRevoking: boolean;
}

function RevokeDialog({ consentLabel: label, onConfirm, onCancel, isRevoking }: RevokeDialogProps) {
  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="revoke-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="revoke-dialog-title" className="text-base font-semibold text-neutral-900">
              Revoke consent?
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              You are about to revoke{" "}
              <span className="font-medium">{label}</span>.
            </p>
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>Warning:</strong> Revoking this consent means staff will no longer be able
              to access your records under this agreement. This action may affect your care.
              Contact your provider if you have questions.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isRevoking}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={isRevoking}>
            {isRevoking ? "Revoking…" : "Yes, revoke"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ──────────────────────────────────────────────────────────

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg">
      <ShieldOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      {message}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────

export default function PrivacyPage() {
  const [bundle, setBundle] = useState<FhirBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revoking, setRevoking] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchConsents = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/auth/me/consent");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setBundle(await res.json());
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : "Failed to load consents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConsents(); }, [fetchConsents]);

  async function handleRevoke(id: string) {
    setRevoking(true);
    try {
      const res = await fetch(`/api/auth/me/consent/${id}/revoke`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`);
      }
      setPendingId(null);
      setToast("Consent revoked successfully.");
      await fetchConsents();
    } catch (err) {
      setPendingId(null);
      setFetchError(err instanceof Error ? err.message : "Failed to revoke consent");
    } finally {
      setRevoking(false);
    }
  }

  const consents = bundle?.entry?.map((e) => e.resource) ?? [];

  const pendingConsent = pendingId ? consents.find((c) => c.id === pendingId) : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy & Consent"
        description="Review and manage the consents you have granted to this healthcare organisation."
      />

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
        <p>
          Revoking a consent means staff will no longer be able to access your records under that
          agreement. This may affect the care you receive. Contact your provider before revoking if
          you are unsure.
        </p>
      </div>

      {/* Content */}
      {loading ? (
        <ConsentSkeleton />
      ) : fetchError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {fetchError}{" "}
          <button
            type="button"
            onClick={fetchConsents}
            className="ml-1 font-medium underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : consents.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6" />}
          title="No active consents"
          description="You have not granted any consents yet, or all previous consents have already been revoked."
        />
      ) : (
        <ul className="space-y-3">
          {consents.map((consent) => {
            const id = consent.id ?? "";
            const label = consentLabel(consent);
            const isActive = consent.status === "active";
            return (
              <li key={id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-900">{label}</p>
                      <Badge tone={statusTone(consent.status)}>
                        {consent.status ?? "unknown"}
                      </Badge>
                    </div>
                    <p className="text-xs text-neutral-500">
                      Granted: {formatDate(consent.dateTime)}
                      {consent.provision?.type && (
                        <> · Type: <span className="capitalize">{consent.provision.type}</span></>
                      )}
                    </p>
                  </div>
                  {id && isActive && (
                    <Button
                      variant="danger"
                      size="sm"
                      className="shrink-0"
                      onClick={() => setPendingId(id)}
                    >
                      <ShieldOff className="h-3.5 w-3.5" aria-hidden="true" />
                      Revoke
                    </Button>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmation dialog */}
      {pendingId && pendingConsent && (
        <RevokeDialog
          consentLabel={consentLabel(pendingConsent)}
          onConfirm={() => handleRevoke(pendingId)}
          onCancel={() => { if (!revoking) setPendingId(null); }}
          isRevoking={revoking}
        />
      )}

      {/* Success toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function ConsentSkeleton() {
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Loading consents">
      {[1, 2, 3].map((i) => (
        <li key={i}>
          <Card className="flex animate-pulse flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-neutral-100" />
              <div className="h-3 w-56 rounded bg-neutral-100" />
            </div>
            <div className="h-7 w-20 rounded-lg bg-neutral-100" />
          </Card>
        </li>
      ))}
    </ul>
  );
}
