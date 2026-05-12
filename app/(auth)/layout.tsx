import type { ReactNode } from "react";

/**
 * Auth-flow shell: landing, login, signup, verify. Centered narrow
 * column on a soft brand-tinted gradient so the unauthenticated
 * surface looks distinct from the dense authenticated app.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-brand-50/50 via-white to-white">
      {/* Decorative glow — pure CSS, no asset to load */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-gradient-to-b from-brand-100/40 to-transparent"
        aria-hidden="true"
      />
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-10 md:py-16">{children}</main>
    </div>
  );
}
