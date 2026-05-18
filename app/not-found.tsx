import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-5xl font-bold text-brand-600">404</p>
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Page not found
          </h1>
          <p className="text-sm text-neutral-600">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
