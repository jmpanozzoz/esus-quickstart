import { isApiError } from "@/lib/api-errors";
import { linkUserToPatient, verifyEmail } from "@/lib/esus";
import { type FhirResource, fhirCreate, fhirUpdate } from "@/lib/fhir";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string; code?: string; appUserId?: string; firstName?: string; lastName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.email || !body.code) {
    return NextResponse.json({ error: "email and code are required" }, { status: 400 });
  }

  try {
    await verifyEmail(body.email, body.code);

    // Auto-link: if appUserId was provided at signup, create a FHIR Patient
    // and link the app user to it. This ensures the FHIR proxy enforces
    // patient scoping from the very first authenticated request.
    if (body.appUserId) {
      try {
        const patient = await fhirCreate<FhirResource>("Patient", {
          resourceType: "Patient",
        });
        if (patient.id) {
          await linkUserToPatient(body.appUserId, patient.id);

          // Patch the Patient with the user's name so the EHR shows a real
          // name instead of "Unknown".
          if (body.firstName || body.lastName) {
            try {
              await fhirUpdate<FhirResource>("Patient", patient.id, {
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
