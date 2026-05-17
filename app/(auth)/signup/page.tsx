"use client";

import { AlertCircle, ArrowRight, Lock, MailCheck, UserCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface InviteInfo {
  email: string;
  patientId: string | null;
  expiresAt: string;
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Invite state
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  // null = not yet determined, true = valid, false = invalid/expired
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);

  // On mount, check for ?invite= param and validate it
  useEffect(() => {
    const token = params.get("invite");
    if (!token) return;

    setInviteToken(token);
    setInviteValid(null); // loading

    // Pre-fill email from URL param if present (server may also return it)
    const urlEmail = params.get("email");
    if (urlEmail) setEmail(urlEmail);

    fetch(`/api/auth/patient-invite/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          setInviteValid(false);
          setError("This invitation has expired or is invalid. You can still sign up below.");
          return;
        }
        const data: InviteInfo = await res.json();
        setInviteInfo(data);
        setEmail(data.email);
        setInviteValid(true);
      })
      .catch(() => {
        setInviteValid(false);
        setError("Could not validate the invitation link. Please try again.");
      });
  }, [params]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          ...(inviteToken && inviteValid ? { inviteToken } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? `Sign-up failed (${res.status})`);
        return;
      }
      const result = await res.json().catch(() => null);
      const appUserId: string | undefined = result?.appUserId;
      const emailVerificationRequired: boolean = result?.emailVerificationRequired ?? true;

      // Invite signup: email is already verified (token proves inbox access).
      // Skip the OTP step and go straight to login.
      if (!emailVerificationRequired) {
        router.push(`/login?email=${encodeURIComponent(email)}`);
        return;
      }

      // Normal signup: collect the 6-digit OTP on /verify.
      const verifyUrl = `/verify?email=${encodeURIComponent(email)}${appUserId ? `&appUserId=${encodeURIComponent(appUserId)}` : ""}`;
      router.push(verifyUrl);
    } finally {
      setLoading(false);
    }
  }

  // Determine if we're in an invite flow that is still loading
  const isInviteLoading = inviteToken !== null && inviteValid === null;

  return (
    <div className="flex flex-1 flex-col">
      <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:text-brand-800">
        <span aria-hidden="true">←</span> Back
      </Link>

      <header className="mt-8 space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">Create your account</h1>
        {!inviteToken && (
          <p className="text-sm text-neutral-600">
            We'll email a 6-digit code to confirm it's really you.
          </p>
        )}
      </header>

      {/* Invite loading state */}
      {isInviteLoading && (
        <div className="mt-6 flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-800">
          <svg className="h-4 w-4 animate-spin shrink-0 text-teal-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Validating your invitation…</span>
        </div>
      )}

      {/* Invite valid — show contextual banner */}
      {inviteValid === true && inviteInfo && (
        <div className="mt-6 rounded-xl border border-teal-200 bg-teal-50 px-4 py-4 space-y-2">
          <div className="flex items-center gap-2 text-teal-800">
            <MailCheck className="h-4 w-4 shrink-0 text-teal-600" aria-hidden="true" />
            <p className="text-sm font-medium">
              You've been invited to join this patient portal.
            </p>
          </div>
          <p className="text-xs text-teal-700 pl-6">
            {inviteInfo.patientId
              ? "Your health records are ready to view once you sign in."
              : "Complete your registration to access the portal."}
          </p>
          <div className="flex items-center gap-2 pl-6 pt-1">
            <UserCheck className="h-3.5 w-3.5 shrink-0 text-teal-500" aria-hidden="true" />
            <p className="text-[11px] text-teal-600">
              No email verification needed — your invitation confirms your inbox.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-neutral-700">Email</span>
          <div className="relative">
            <input
              type="email"
              required
              autoFocus={!inviteValid}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              readOnly={inviteValid === true}
              disabled={inviteValid === true || isInviteLoading}
              className={inviteValid === true ? "pr-8 text-neutral-500 bg-neutral-50 cursor-not-allowed" : ""}
            />
            {inviteValid === true && (
              <Lock
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400"
                aria-hidden="true"
              />
            )}
          </div>
          {inviteValid === true && (
            <p className="text-[11px] text-neutral-500">Provided by your care team — cannot be changed.</p>
          )}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-neutral-700">Password</span>
          <input
            type="password"
            required
            autoFocus={inviteValid === true}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={isInviteLoading}
          />
          <p className="text-[11px] leading-relaxed text-neutral-500">
            12+ characters with upper, lower, number, and a special character. We also check against known-breached lists.
          </p>
        </label>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || isInviteLoading}
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-brand-300"
        >
          <span>{loading ? "Creating…" : "Create account"}</span>
          {!loading && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />}
        </button>
      </form>

      <p className="mt-8 text-center text-xs text-neutral-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
