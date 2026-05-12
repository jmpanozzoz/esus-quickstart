"use client";

import { ArrowRight, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Login failed (${res.status})`);
        return;
      }
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back
      </Link>

      <header className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Welcome back</h1>
        <p className="text-sm text-neutral-600">
          Sign in to your Esus quickstart account.
        </p>
      </header>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-neutral-700">Email</span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-neutral-700">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <span>{loading ? "Signing in…" : "Sign in"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:text-brand-800">
          Create an account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
