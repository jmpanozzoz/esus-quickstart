/**
 * Centralized error type + parser for every Esus API call.
 *
 * Lives between `lib/fhir.ts` (server-side, used by route handlers and
 * server components that still SSR-fetch) and `lib/use-fhir.ts`
 * (client-side, used by SWR hooks). Both throw the same `ApiError`
 * shape so error boundaries / toasts only need to know one class.
 *
 * Anatomy of the Esus error envelope (FHIR `OperationOutcome`):
 *
 *   {
 *     "resourceType": "OperationOutcome",
 *     "issue": [{
 *       "severity": "error",
 *       "code": "forbidden" | "throttled" | "invalid" | …,
 *       "diagnostics": "Insufficient permissions: read on Patient"
 *     }]
 *   }
 *
 * `code` is what we key user-friendly messages off — `diagnostics` is
 * a fallback when the code is generic or missing.
 */

export type ApiErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "notFound"
  | "conflict"
  | "validation"
  | "rateLimited"
  | "server"
  | "unknown";

export interface FhirIssue {
  severity?: string;
  code?: string;
  diagnostics?: string;
  expression?: string[];
  location?: string[];
}

export interface FhirOperationOutcome {
  resourceType?: "OperationOutcome";
  issue?: FhirIssue[];
}

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly outcome?: FhirOperationOutcome;
  readonly diagnostic?: string;
  /** Field-level errors keyed by JSON path (FHIR `expression` / `location`). */
  readonly fieldErrors: Record<string, string>;

  constructor(opts: {
    status: number;
    kind: ApiErrorKind;
    message: string;
    outcome?: FhirOperationOutcome;
    diagnostic?: string;
    fieldErrors?: Record<string, string>;
  }) {
    super(opts.message);
    this.name = "ApiError";
    this.status = opts.status;
    this.kind = opts.kind;
    this.outcome = opts.outcome;
    this.diagnostic = opts.diagnostic;
    this.fieldErrors = opts.fieldErrors ?? {};
  }

  /** Stable user-facing message — never undefined. */
  get userMessage(): string {
    return USER_MESSAGES[this.kind] ?? this.diagnostic ?? this.message;
  }
}

const USER_MESSAGES: Record<ApiErrorKind, string> = {
  network: "Can't reach the server. Check your connection and try again.",
  unauthorized: "Your session expired. Sign in again to continue.",
  forbidden: "You don't have permission to perform that action.",
  notFound: "The resource you're looking for doesn't exist.",
  conflict: "This conflicts with the current state — refresh and try again.",
  validation: "Please check the form and try again.",
  rateLimited: "Too many requests. Wait a moment before retrying.",
  server: "The server hit an error. We've been notified — try again shortly.",
  unknown: "Something went wrong. Please try again.",
};

function statusToKind(status: number): ApiErrorKind {
  if (status === 0) return "network";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "notFound";
  if (status === 409) return "conflict";
  if (status === 422 || status === 400) return "validation";
  if (status === 429) return "rateLimited";
  if (status >= 500) return "server";
  return "unknown";
}

/**
 * Build an `ApiError` from a non-2xx `Response`. Reads the body as
 * JSON, pulls the FHIR diagnostic + field errors out, and falls back
 * to `statusText` when the body isn't a parsable OperationOutcome.
 *
 * Network-level failures (DNS, CORS preflight, browser offline) don't
 * have a Response — use `networkError()` for those.
 */
export async function fromResponse(res: Response): Promise<ApiError> {
  let outcome: FhirOperationOutcome | undefined;
  let diagnostic: string | undefined;
  const fieldErrors: Record<string, string> = {};

  try {
    const body = await res.clone().json();
    if (body && typeof body === "object" && Array.isArray((body as FhirOperationOutcome).issue)) {
      outcome = body as FhirOperationOutcome;
      const first = outcome.issue?.[0];
      diagnostic = first?.diagnostics;
      for (const issue of outcome.issue ?? []) {
        const paths: string[] = [];
        for (const p of issue.expression ?? []) paths.push(p.replace(/^#\//, ""));
        for (const p of issue.location ?? []) paths.push(p);
        const msg = issue.diagnostics ?? "Invalid";
        for (const p of paths) if (p) fieldErrors[p] = msg;
      }
    }
  } catch {
    // non-JSON body — keep statusText
  }

  const kind = statusToKind(res.status);
  return new ApiError({
    status: res.status,
    kind,
    message: diagnostic ?? `${res.status} ${res.statusText || "Error"}`,
    outcome,
    diagnostic,
    fieldErrors,
  });
}

/** Build an `ApiError` for a TypeError thrown by `fetch` (no Response). */
export function networkError(cause?: unknown): ApiError {
  return new ApiError({
    status: 0,
    kind: "network",
    message: cause instanceof Error ? cause.message : "Network error",
  });
}

/**
 * Type guard for the un-typed `unknown` that SWR / try-catch hands you.
 * Use at error-boundary sites so you can read `.userMessage` /
 * `.fieldErrors` without an `as ApiError` cast.
 */
export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}
