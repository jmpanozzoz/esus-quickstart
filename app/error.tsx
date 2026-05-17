"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to an error reporting service in production
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-neutral-900">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-600">
            An unexpected error occurred. You can try again or go back to the dashboard.
          </p>
          {error.digest && (
            <p className="text-xs text-neutral-400">Error ID: {error.digest}</p>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex w-full items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-card transition-colors hover:bg-brand-700 sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50 hover:ring-neutral-300 sm:w-auto"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
