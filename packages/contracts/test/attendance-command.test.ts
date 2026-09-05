import { describe, expect, it } from "vitest";

import {
  attendanceCommandSchema,
  attendanceSubmissionResultSchema,
  officeLocationSchema,
} from "../src/index.js";

describe("attendanceCommandSchema", () => {
  it("requires a field note outside the office at application level", () => {
    const result = attendanceCommandSchema.safeParse({
      eventType: "check_in",
      capturedAt: "2026-08-31T08:00:00+07:00",
      latitude: -6.2,
      longitude: 106.8,
      accuracyMeters: 12,
      locationType: "field",
      idempotencyKey: "7dfb5918-bf11-4706-8824-b3fc03f924db",
      photoBase64: "dGVzdC1waG90bw==",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a valid office check-in command with photo", () => {
    const result = attendanceCommandSchema.safeParse({
      eventType: "check_in",
      capturedAt: "2026-08-31T08:00:00+07:00",
      latitude: -6.214737,
      longitude: 106.760897,
      accuracyMeters: 10,
      locationType: "office",
      idempotencyKey: "7dfb5918-bf11-4706-8824-b3fc03f924db",
      photoBase64: "dGVzdC1waG90bw==",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a valid field check-in command with note and photo", () => {
    const result = attendanceCommandSchema.safeParse({
      eventType: "check_in",
      capturedAt: "2026-08-31T08:00:00+07:00",
      latitude: -6.2,
      longitude: 106.8,
      accuracyMeters: 10,
      locationType: "field",
      note: "Instalasi perangkat di lokasi klien",
      idempotencyKey: "7dfb5918-bf11-4706-8824-b3fc03f924db",
      photoBase64: "dGVzdC1waG90bw==",
    });

    expect(result.success).toBe(true);
  });

  it("validates attendanceSubmissionResult with non_working_day status", () => {
    const result = attendanceSubmissionResultSchema.safeParse({
      eventId: "evt-123",
      eventType: "check_in",
      status: "non_working_day",
      requiresApproval: true,
      locationType: "field",
      distanceMeters: 520,
      capturedAt: "2026-09-05T18:42:00+07:00",
      message: "Presensi tercatat di luar hari kerja.",
    });

    expect(result.success).toBe(true);
  });
});

describe("officeLocationSchema", () => {
  it("accepts the approved primary office configuration", () => {
    const result = officeLocationSchema.safeParse({
      active: true,
      accuracyThresholdMeters: 50,
      latitude: -6.214737033753623,
      longitude: 106.76089760397757,
      name: "Kantor PT Kuda Prima",
      radiusMeters: 100,
      timeZone: "Asia/Jakarta",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an invalid radius", () => {
    const result = officeLocationSchema.safeParse({
      active: true,
      accuracyThresholdMeters: 50,
      latitude: -6.214737033753623,
      longitude: 106.76089760397757,
      name: "Kantor PT Kuda Prima",
      radiusMeters: 0,
      timeZone: "Asia/Jakarta",
    });

    expect(result.success).toBe(false);
  });
});
