import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-md px-6 py-12">{children}</main>;
}
