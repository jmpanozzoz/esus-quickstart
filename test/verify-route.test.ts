import { beforeEach, describe, expect, it, mock } from "bun:test";

/**
 * `POST /api/auth/verify` provisions a FHIR Patient and links an app user to
 * it. The id it links used to come from the request body (N11), so verifying
 * your OWN email while naming someone else's id re-pointed THEIR account at a
 * record of your making. The id must come from the verification result.
 */
const linkCalls: { appUserId: string; patientId: string }[] = [];
let verifiedUserId: string | undefined = "user-of-the-verified-email";

mock.module("@/lib/esus", () => ({
  verifyEmail: async () => ({ success: true as const, userId: verifiedUserId }),
  linkUserToPatient: async (appUserId: string, patientId: string) => {
    linkCalls.push({ appUserId, patientId });
    return { id: appUserId, email: "x@test", patientId };
  },
}));

mock.module("@/lib/fhir", () => ({
  fhirCreate: async () => ({ resourceType: "Patient", id: "patient-new" }),
  fhirUpdate: async () => ({ resourceType: "Patient", id: "patient-new" }),
}));

mock.module("@/lib/rate-limit", () => ({
  getRequestIp: () => "203.0.113.1",
  rateLimit: () => ({ allowed: true }),
}));

const { POST } = await import("@/app/api/auth/verify/route");

function verifyRequest(body: Record<string, unknown>): Request {
  return new Request("https://app.test/api/auth/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/verify (N11)", () => {
  beforeEach(() => {
    linkCalls.length = 0;
    verifiedUserId = "user-of-the-verified-email";
  });

  it("links the user the verification resolved, not the one in the body", async () => {
    const res = await POST(
      verifyRequest({ email: "attacker@test", code: "123456", appUserId: "victim-app-user-id" }),
    );

    expect(res.status).toBe(200);
    expect(linkCalls).toHaveLength(1);
    expect(linkCalls[0]!.appUserId).toBe("user-of-the-verified-email");
    expect(linkCalls[0]!.appUserId).not.toBe("victim-app-user-id");
  });

  it("links nobody when the body is the only source of an id", async () => {
    // An API too old to return `userId`. Skipping the link is the correct
    // degradation; falling back to the body is what the finding was.
    verifiedUserId = undefined;

    const res = await POST(verifyRequest({ email: "attacker@test", code: "123456", appUserId: "victim-app-user-id" }));

    expect(res.status).toBe(200);
    expect(linkCalls).toHaveLength(0);
  });

  it("still requires email and code", async () => {
    const res = await POST(verifyRequest({ email: "a@test" }));
    expect(res.status).toBe(400);
  });
});
