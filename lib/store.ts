/**
 * Client-side stores for the authenticated app shell.
 *
 * Why this exists: the original quickstart server-renders every page,
 * which means every navigation blocks on `requireSession()` +
 * `fhirSearch()` round-trips before the browser sees any HTML. That's
 * fine pedagogically (it shows the simplest possible BaaS integration)
 * but feels slow over Esus's cross-region path (CF edge → DO NYC1).
 *
 * The refactor: the layout still fetches the user server-side once,
 * but it embeds the response into the page so this Zustand store can
 * pick it up on hydration. After that, navigation between `(app)/*`
 * pages doesn't re-fetch the user — the store already has it. Pages
 * use SWR to fetch their own data client-side, so the chrome paints
 * immediately with a skeleton while the request flies.
 */
import { create } from "zustand";
import type { MeResponse } from "@/lib/esus";

interface AuthState {
  user: MeResponse | null;
  /** Set once during the very first client mount, from the SSR bootstrap. */
  hydrate: (user: MeResponse) => void;
  /** Called by the logout button — also fires the API logout via /api/auth/logout. */
  reset: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  hydrate: (user) => set({ user }),
  reset: () => set({ user: null }),
}));
