import { describe, expect, it } from "vitest";

import { attendanceCommandSchema, officeLocationSchema } from "../src/index.js";

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
    });

    expect(result.success).toBe(false);
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
