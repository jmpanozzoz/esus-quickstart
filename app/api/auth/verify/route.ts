import { isApiError } from "@/lib/api-errors";
import { linkUserToPatient, verifyEmail } from "@/lib/esus";
import { fhirCreate, fhirUpdate } from "@/lib/fhir";
import { getRequestIp, rateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

interface FhirPatient {
  resourceType: string;
  id?: string;
  name?: { use?: string; given?: string[]; family?: string }[];
}

export const runtime = "edge";

export async function POST(req: Request) {
  const ip = getRequestIp(req);
  const rl = rateLimit(`verify:${ip}`, 5, 5 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfter ?? 300) },
    });
  }

  let body: { email?: string; code?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.code) {
    return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  }

  try {
    const verified = await verifyEmail(body.email, body.code);

    // Auto-link: create a FHIR Patient and link the app user to it. This
    // ensures the FHIR proxy enforces patient scoping from the very first
    // authenticated request.
    //
    // The id comes from the verification RESULT. It used to come from
    // `body.appUserId`, which nothing tied to the address being verified:
    // anyone could verify their own email while passing a stranger's id and
    // have that account re-linked to a Patient of this request's making. An
    // API too old to return `userId` simply skips the link — the same
    // already-tolerated outcome as a failed link, and never a reason to
    // trust the body again.
    const appUserId = verified.userId;
    //
    // The three FHIR calls below are deliberately UNSCOPED (no
    // `fhirScopeFor`): this runs during verification, before a session
    // exists, and it is provisioning the very patient record the scope
    // would key on. Everywhere else — the proxy routes and every server
    // component — must pass a scope; see `fhirScopeFor` in `lib/auth.ts`.
    if (appUserId) {
      try {
        const patient = await fhirCreate<FhirPatient>("Patient", {
          resourceType: "Patient",
        });
        if (patient.id) {
          await linkUserToPatient(appUserId, patient.id);

          // Patch the Patient with the user's name so the EHR shows a real
          // name instead of "Unknown".
          if (body.firstName || body.lastName) {
            try {
              await fhirUpdate<FhirPatient>("Patient", patient.id, {
                resourceType: "Patient",
                id: patient.id,
                name: [
                  {
                    use: "official",
                    ...(body.firstName ? { given: [body.firstName] } : {}),
                    ...(body.lastName ? { family: body.lastName } : {}),
                  },
                ],
              });
            } catch {
              // Non-fatal — patient exists but has no name yet
            }
          }

          // Auto-create treatment consent so org staff can access this
          // patient's records. The BaaS consent check (ConsentGatingPolicy)
          // requires an active "treatment" consent for staff to read/write
          // PHI. Without it, the staff sees nothing.
          try {
            await fhirCreate("Consent", {
              resourceType: "Consent",
              scope: "treatment",
              patientId: patient.id,
              status: "active",
            });
          } catch {
            // Non-fatal — staff access degrades gracefully if consent
            // creation fails
          }

          return NextResponse.json({ success: true, patientId: patient.id });
        }
      } catch (linkErr) {
        // Non-fatal: log and continue. The user is verified; they'll just
        // remain unlinked until a background job or manual admin action
        // resolves it. Don't fail the verification flow over a linking error.
        console.error("[verify] Patient auto-link failed:", linkErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (isApiError(err)) {
      return NextResponse.json(
        { error: err.diagnostic ?? err.userMessage, fieldErrors: err.fieldErrors },
        { status: err.status || 500 },
      );
    }
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
