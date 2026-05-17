"use client";

import { ArrowRight, MailCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Field, FormError, TextInput } from "@/app/_components/Field";

const RESEND_COOLDOWN = 60; // seconds
const SESSION_EMAIL_KEY = "esus_verify_email";

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();
  const initialEmail = params.get("email") ?? "";
  const appUserId = params.get("appUserId") ?? "";
  const firstName = params.get("firstName") ?? "";
  const lastName = params.get("lastName") ?? "";

  // Resolve email: URL param takes precedence; fall back to sessionStorage
  // so direct navigation to /verify still works.
  const resolvedEmail = (() => {
    if (initialEmail) return initialEmail;
    try {
      return sessionStorage.getItem(SESSION_EMAIL_KEY) ?? "";
    } catch {
      return "";
    }
  })();

  const [email, setEmail] = useState(resolvedEmail);

  // Persist email to sessionStorage whenever it comes from URL params.
  useEffect(() => {
    if (initialEmail) {
      try {
        sessionStorage.setItem(SESSION_EMAIL_KEY, initialEmail);
      } catch {
        // ignore (private mode, storage full, etc.)
      }
    }
  }, [initialEmail]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Resend state
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback(() => {
    setResendCooldown(RESEND_COOLDOWN);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  async function onResend() {
    if (resendCooldown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Resend failed (${res.status})`);
        return;
      }
      setResendSuccess(true);
      startCooldown();
    } finally {
      setResendLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          code,
          appUserId: appUserId || undefined,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Verification failed (${res.status})`);
        return;
      }
      router.push(`/login?email=${encodeURIComponent(email)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/signup" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back
      </Link>

      <header className="mt-8 space-y-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <MailCheck className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Confirm your email</h1>
        <p className="text-sm text-neutral-600">
          Paste the 6-digit code we just sent to{" "}
          {email ? (
            <span className="font-medium text-neutral-800">{email}</span>
          ) : (
            "your inbox"
          )}
          .
        </p>
        <p className="text-xs text-neutral-500">
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

        <Field label="Verification code" required>
          <TextInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus={!!resolvedEmail}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg font-mono tracking-[0.4em]"
            placeholder="••••••"
          />
        </Field>

        {error && <FormError>{error}</FormError>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <span>{loading ? "Verifying…" : "Verify email"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      {/* Resend section */}
      <div className="mt-6 flex flex-col items-center gap-2">
        {resendSuccess && (
          <p className="text-xs text-teal-700 font-medium">Code resent — check your inbox.</p>
        )}
        <button
          type="button"
          onClick={onResend}
          disabled={resendCooldown > 0 || resendLoading || !email}
          className="text-xs font-medium text-brand-700 hover:text-brand-800 disabled:cursor-not-allowed disabled:text-neutral-400"
        >
          {resendLoading
            ? "Sending…"
            : resendCooldown > 0
              ? `Resend code (${resendCooldown}s)`
              : "Resend code"}
        </button>
      </div>

      <p className="mt-6 text-center text-xs text-neutral-500">
        Already verified?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  );
}
