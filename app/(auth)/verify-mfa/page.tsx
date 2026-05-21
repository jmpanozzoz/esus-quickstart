"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, FormError, TextInput } from "@/app/_components/Field";

export default function VerifyMfaPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        if (res.status === 400 && body?.error?.includes("expired")) {
          // MFA token expired — send the user back to login
          router.push("/login?notice=mfa_expired");
          return;
        }
        setError(body?.error ?? `Verification failed (${res.status})`);
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/login" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back to sign in
      </Link>

      <header className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Two-factor authentication</h1>
        <p className="text-sm text-neutral-600">
          Enter the 6-digit code from your authenticator app.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Authentication code" required>
          <TextInput
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            autoComplete="one-time-code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="000000"
          />
        </Field>

        {error && <FormError>{error}</FormError>}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <span>{loading ? "Verifying…" : "Verify"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>
    </div>
  );
}
