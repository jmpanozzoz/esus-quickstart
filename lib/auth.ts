/**
 * Auth helpers for server components. `requireSession()` is the single
 * place every protected page reaches for: it reads the cookie, hits
 * /v1/auth/me to validate, and redirects to /login if anything fails.
 * Layouts compose this so individual pages don't repeat the gate.
 */
import { type EsusError, me, type MeResponse } from "@/lib/esus";
import { getAccessToken } from "@/lib/session";
import { redirect } from "next/navigation";

export interface Session {
  accessToken: string;
  user: MeResponse;
}

export async function requireSession(): Promise<Session> {
  const accessToken = await getAccessToken();
  if (!accessToken) redirect("/login");
  try {
    const user = await me(accessToken);
    return { accessToken, user };
  } catch (err) {
    const e = err as EsusError;
    if (e.status === 401) redirect("/login");
    throw err;
  }
}
