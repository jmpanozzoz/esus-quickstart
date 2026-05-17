"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Field, FormError, TextInput } from "@/app/_components/Field";

// Password must be 12+ chars, upper + lower + number + special
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~\\]).{12,}$/;

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): string | null {
    if (!email) return "Email is required.";
    if (code.length !== 6) return "Enter the 6-digit code from your email.";
    if (!PASSWORD_REGEX.test(newPassword)) {
      return "Password must be at least 12 characters with upper, lower, number, and a special character.";
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
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        const errMsg: string = body?.error ?? `Reset failed (${res.status})`;
        const isExpired =
          res.status === 410 ||
          res.status === 400 ||
          errMsg.toLowerCase().includes("expired");
        setError(isExpired ? "__expired__" : errMsg);
        return;
      }
      router.push(`/login?email=${encodeURIComponent(email)}&reset=1`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/forgot-password" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back
      </Link>

      <header className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Set new password</h1>
        <p className="text-sm text-neutral-600">
          Enter the 6-digit code from your email and choose a new password.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email" required>
          <TextInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Reset code" required>
          <TextInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus={!!initialEmail}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg font-mono tracking-[0.4em]"
            placeholder="••••••"
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
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        <Field label="Confirm new password" required>
          <TextInput
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {error && error !== "__expired__" && <FormError>{error}</FormError>}
        {error === "__expired__" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
            Your reset code has expired.{" "}
            <Link href="/forgot-password" className="font-medium text-brand-700 hover:text-brand-800 underline-offset-2 hover:underline">
              Request a new one
            </Link>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <span>{loading ? "Resetting…" : "Reset password"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Already have your password?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
