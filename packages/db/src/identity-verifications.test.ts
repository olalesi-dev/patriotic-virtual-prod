import { expect, test } from "bun:test";
import { identityVerifications } from "./identity-verifications";

test("identityVerifications table has correct structure", () => {
  expect(identityVerifications).toBeDefined();
  expect(identityVerifications.id).toBeDefined();
  expect(identityVerifications.patientId).toBeDefined();
  expect(identityVerifications.appointmentId).toBeDefined();
  expect(identityVerifications.provider).toBeDefined();
  expect(identityVerifications.jobId).toBeDefined();
  expect(identityVerifications.status).toBeDefined();
  expect(identityVerifications.verifiedAt).toBeDefined();
  expect(identityVerifications.failureReason).toBeDefined();
  expect(identityVerifications.createdAt).toBeDefined();
});
