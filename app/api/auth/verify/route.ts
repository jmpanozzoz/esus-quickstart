import { isApiError } from "@/lib/api-errors";
import { linkUserToPatient, verifyEmail } from "@/lib/esus";
import { fhirCreate } from "@/lib/fhir";
import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: { email?: string; code?: string; appUserId?: string };
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
        const patient = await fhirCreate("Patient", {
          resourceType: "Patient",
          active: true,
        });
        if (patient.id) {
          await linkUserToPatient(body.appUserId, patient.id);
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
