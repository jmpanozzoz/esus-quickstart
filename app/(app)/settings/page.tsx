"use client";

export const runtime = "edge";

import { CheckCircle2, Lock, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Field, FormError, TextInput } from "@/app/_components/Field";
import { Card, PageHeader } from "@/app/_components/ui";
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
      </div>
    </div>
  );
}
