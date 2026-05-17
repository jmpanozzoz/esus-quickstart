"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import Link from "next/link";
import { Suspense, useState } from "react";
import { Field, FormError, TextInput } from "@/app/_components/Field";

function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/password/reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Request failed (${res.status})`);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back to sign in
      </Link>

      <header className="mt-8 space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MailCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Reset your password</h1>
        <p className="text-sm text-neutral-600">
          Enter your email and we'll send you a reset code.
        </p>
      </header>

      {sent ? (
        <div className="mt-8 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 space-y-3">
          <p className="text-sm font-medium text-teal-800">Check your email for a reset code</p>
          <p className="text-xs text-teal-700">
            We sent a 6-digit code to{" "}
            <span className="font-medium">{email}</span>. It expires in 15 minutes.
          </p>
          <p className="text-xs text-teal-700">
            Running locally? Mailpit captures every email at{" "}
            <a
              className="font-medium text-brand-700 hover:text-brand-800"
              href="http://localhost:8025"
              target="_blank"
              rel="noreferrer"
            >
              localhost:8025
            </a>
            .
          </p>
          <Link
            href={`/reset-password?email=${encodeURIComponent(email)}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
          >
            Enter the code <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Field label="Email" required>
            <TextInput
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </Field>

          {error && <FormError>{error}</FormError>}

          <button
            type="submit"
            disabled={loading}
            className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
          >
            <span>{loading ? "Sending…" : "Send reset code"}</span>
            {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
          </button>
        </form>
      )}

      <p className="mt-8 text-center text-xs text-neutral-500">
        Remembered your password?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
