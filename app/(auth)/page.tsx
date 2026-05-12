import { ArrowRight, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EsusMark } from "../_components/EsusMark";
import { getAccessToken } from "@/lib/session";

export const runtime = "edge";

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Tenant auth",
    body: "Signup, email verification, and session cookies handled end-to-end through /v1/auth.",
  },
  {
    icon: Sparkles,
    title: "FHIR data plane",
    body: "Read and write Patient, Encounter, Observation, MedicationRequest, and the rest of the FHIR R4 surface.",
  },
  {
    icon: KeyRound,
    title: "Server-side API key",
    body: "The tenant key stays on the Edge; the browser only sees signed httpOnly cookies.",
  },
];

export default async function Home() {
  if (await getAccessToken()) redirect("/dashboard");

  return (
    <div className="flex flex-1 flex-col">
      {/* Brand mark + tagline */}
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-card">
          <EsusMark className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight text-neutral-900">Esus Health</p>
          <p className="text-[11px] uppercase tracking-[0.15em] text-brand-700">Quickstart</p>
        </div>
      </div>

      <div className="mt-10 space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-neutral-900">
          Build on Esus
          <br />
          in an afternoon.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-neutral-600">
          A real-world reference Next.js app — tenant auth, FHIR reads &amp; writes, server-side API keys, and a clean shell
          to fork from. Sign up to see it in motion.
        </p>
      </div>

      <div className="mt-8 space-y-2">
        <Link
          href="/signup"
          className="group inline-flex w-full items-center justify-between rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          <span>Create an account</span>
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
        <Link
          href="/login"
          className="inline-flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-800 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
        >
          <span>Log in</span>
          <ArrowRight className="h-4 w-4 text-neutral-400" />
        </Link>
      </div>

      <ul className="mt-10 space-y-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-neutral-900">{title}</p>
              <p className="text-xs text-neutral-500">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-auto pt-10 text-[11px] text-neutral-400">
        Setup: copy <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-neutral-600">.env.example</code> to{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-neutral-600">.env.local</code> and fill in your{" "}
        <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-neutral-600">ESUS_APP_ID</code> + API key.
      </p>
    </div>
  );
}
