import { getAccessToken } from "@/lib/session";
import Link from "next/link";
import { redirect } from "next/navigation";

export const runtime = "edge";

export default async function Home() {
  if (await getAccessToken()) redirect("/dashboard");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold text-neutral-900">Esus Quickstart</h1>
        <p className="mt-2 text-sm text-neutral-600">
          A minimal Next.js app showing the shape of an Esus BaaS integration: tenant auth, FHIR reads/writes via API key,
          and a simple sidebar shell to build on.
        </p>
      </header>

      <div className="space-y-2">
        <Link
          href="/signup"
          className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
        >
          <p className="font-medium text-neutral-900">Create an account →</p>
          <p className="mt-1 text-xs text-neutral-500">Walk through signup, email verification, login, and land on the dashboard.</p>
        </Link>
        <Link
          href="/login"
          className="block rounded-lg border border-neutral-200 bg-white p-4 transition-colors hover:border-neutral-300 hover:bg-neutral-100"
        >
          <p className="font-medium text-neutral-900">Log in →</p>
          <p className="mt-1 text-xs text-neutral-500">Already have an account? Skip ahead.</p>
        </Link>
      </div>

      <p className="text-xs text-neutral-500">
        Copy <code className="font-mono">.env.example</code> to <code className="font-mono">.env.local</code> and fill in
        your <code className="font-mono">ESUS_APP_ID</code> + API key.
      </p>
    </div>
  );
}
