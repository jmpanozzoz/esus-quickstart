"use client";

export const runtime = "edge";

import { AlertTriangle, CheckCircle2, Download, Lock, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, FormError, TextInput } from "@/app/_components/Field";
import { Button, Card, PageHeader } from "@/app/_components/ui";
import { useAuth } from "@/lib/store";

// Password must be 12+ chars, upper + lower + number + special
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~\\]).{12,}$/;

function formatMemberSince(iso: string | undefined): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Profile section ────────────────────────────────────────────────────────

function ProfileSection() {
  const user = useAuth((s) => s.user);
  const hydrate = useAuth((s) => s.hydrate);
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Sync fields if user loads after mount
  useEffect(() => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
  }, [user?.firstName, user?.lastName]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: firstName.trim() || null, lastName: lastName.trim() || null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Update failed (${res.status})`);
        return;
      }
      const updated = await res.json();
      // Update the Zustand store so the sidebar name refreshes immediately.
      if (user) hydrate({ ...user, ...updated });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Display name</h2>
          <p className="text-xs text-neutral-500">How you appear across the app.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="First name">
            <TextInput
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); setSaved(false); }}
              placeholder="Jane"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Last name">
            <TextInput
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); setSaved(false); }}
              placeholder="Smith"
              autoComplete="family-name"
            />
          </Field>
        </div>

        {error && <FormError>{error}</FormError>}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Profile updated
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ── Account info section ───────────────────────────────────────────────────

function AccountInfoSection() {
  const user = useAuth((s) => s.user);

  return (
    <Card className="p-5 space-y-3">
      <h2 className="text-sm font-semibold text-neutral-900">Account info</h2>
      <div className="divide-y divide-neutral-100">
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-neutral-500">Email</span>
          <span className="font-mono text-sm text-neutral-800">{user?.email ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-neutral-500">Email verified</span>
          <span className="text-sm font-medium text-neutral-800">
            {user?.emailVerified ? "Yes" : "No"}
          </span>
        </div>
        <div className="flex items-center justify-between py-2.5">
          <span className="text-sm text-neutral-500">Member since</span>
          <span className="text-sm text-neutral-800">
            {formatMemberSince((user as (typeof user & { createdAt?: string }) | null)?.createdAt)}
          </span>
        </div>
      </div>
    </Card>
  );
}

// ── Change password section ────────────────────────────────────────────────

function ChangePasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function validate(): string | null {
    if (!currentPassword) return "Current password is required.";
    if (!PASSWORD_REGEX.test(newPassword)) {
      return "New password must be at least 12 characters with upper, lower, number, and a special character.";
    }
    if (newPassword !== confirmPassword) return "Passwords do not match.";
    return null;
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/password/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Change failed (${res.status})`);
        return;
      }
      setSaved(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Lock className="h-4 w-4" aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Change password</h2>
          <p className="text-xs text-neutral-500">Other sessions will be signed out after a change.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        <Field label="Current password" required>
          <TextInput
            type="password"
            required
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setSaved(false); }}
            autoComplete="current-password"
          />
        </Field>
        <Field
          label="New password"
          required
          hint="12+ characters with upper, lower, number, and a special character."
        >
          <TextInput
            type="password"
            required
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setSaved(false); }}
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password" required>
          <TextInput
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setSaved(false); }}
            autoComplete="new-password"
          />
        </Field>

        {error && <FormError>{error}</FormError>}
        {saved && (
          <p className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Password updated
          </p>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ── Delete account confirmation dialog ────────────────────────────────────

function DeleteAccountDialog({
  onConfirm,
  onCancel,
  isDeleting,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape" && !isDeleting) onCancel(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, isDeleting]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="delete-account-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-xl">
        <div className="flex items-start gap-3 p-6">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Trash2 className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 id="delete-account-dialog-title" className="text-base font-semibold text-neutral-900">
              Delete your account?
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              This action is permanent and cannot be undone. All your personal data,
              session tokens, and linked records will be permanently deleted.
            </p>
            <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              <strong>Warning:</strong> Once deleted, your account cannot be recovered.
              Make sure to export your health records before proceeding.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-neutral-100 px-6 py-4">
          <Button variant="secondary" size="sm" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting…" : "Yes, delete my account"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Danger zone section ────────────────────────────────────────────────────

function DangerZoneSection() {
  const router = useRouter();
  const reset = useAuth((s) => s.reset);
  const [showDialog, setShowDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/auth/me/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        // If endpoint not implemented yet, show support fallback
        if (res.status === 404 || res.status === 405) {
          setShowDialog(false);
          setDeleteError("Account self-deletion is not yet available. Please contact support.");
          return;
        }
        setDeleteError(body?.error ?? `Deletion failed (${res.status})`);
        setShowDialog(false);
        return;
      }
      // Clear session and redirect
      reset();
      await fetch("/api/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch {
      setDeleteError("Network error. Please try again.");
      setShowDialog(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-rose-200 bg-white overflow-hidden">
        <div className="flex items-center gap-2.5 border-b border-rose-200 bg-rose-50 px-5 py-3">
          <AlertTriangle className="h-4 w-4 text-rose-600" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-rose-800">Danger Zone</h2>
        </div>

        <div className="divide-y divide-neutral-100 px-5">
          {/* Data export */}
          <div className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">Export my data</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Download your health records from the{" "}
                <a href="/encounters" className="font-medium text-brand-700 hover:text-brand-800 underline">
                  Health Records
                </a>{" "}
                section, or{" "}
                <a
                  href="mailto:support@esus.health?subject=Data%20export%20request"
                  className="font-medium text-brand-700 hover:text-brand-800 underline"
                >
                  contact support
                </a>{" "}
                for a full GDPR data export.
              </p>
            </div>
            <a
              href="/encounters"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 hover:border-neutral-300"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              Go to records
            </a>
          </div>

          {/* Account deletion */}
          <div className="flex flex-col gap-1.5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-900">Delete my account</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                Permanently delete your account and all associated data. This cannot be undone.
              </p>
              {deleteError && (
                <p className="mt-1.5 text-xs text-rose-700">
                  {deleteError}{" "}
                  {deleteError.includes("contact support") && (
                    <a
                      href="mailto:support@esus.health?subject=Account%20deletion%20request"
                      className="font-medium underline hover:no-underline"
                    >
                      support@esus.health
                    </a>
                  )}
                </p>
              )}
            </div>
            <Button
              variant="danger"
              size="sm"
              className="shrink-0"
              onClick={() => { setDeleteError(null); setShowDialog(true); }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              Delete account
            </Button>
          </div>
        </div>
      </div>

      {showDialog && (
        <DeleteAccountDialog
          onConfirm={handleDelete}
          onCancel={() => setShowDialog(false)}
          isDeleting={isDeleting}
        />
      )}
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account details and security."
      />
      <div className="mx-auto max-w-2xl space-y-4">
        <AccountInfoSection />
        <ProfileSection />
        <ChangePasswordSection />
        <DangerZoneSection />
      </div>
    </div>
  );
}
