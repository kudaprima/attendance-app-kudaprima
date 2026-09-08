import { describe, expect, it } from "vitest";

import {
  leaveRequestCommandSchema,
  overtimeRequestCommandSchema,
  updateContactProfileCommandSchema,
} from "../src/index.js";

describe("leaveRequestCommandSchema", () => {
  it("validates a complete leave request", () => {
    const result = leaveRequestCommandSchema.safeParse({
      employeeId: "KP-000001",
      type: "annual_leave",
      startDate: "2026-09-10",
      endDate: "2026-09-12",
      reason: "Cuti tahunan urusan keluarga",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid date format", () => {
    const result = leaveRequestCommandSchema.safeParse({
      employeeId: "KP-000001",
      type: "annual_leave",
      startDate: "10-09-2026",
      endDate: "2026-09-12",
      reason: "Cuti tahunan",
    });

    expect(result.success).toBe(false);
  });
});

describe("overtimeRequestCommandSchema", () => {
  it("validates overtime request with task description", () => {
    const result = overtimeRequestCommandSchema.safeParse({
      employeeId: "KP-000001",
      date: "2026-09-07",
      startedAt: "2026-09-07T17:01:00+07:00",
      endedAt: "2026-09-07T20:00:00+07:00",
      taskDescription: "Perbaikan perangkat jaringan di lokasi klien",
    });

    expect(result.success).toBe(true);
  });
});

describe("updateContactProfileCommandSchema", () => {
  it("allows updating phone and home address", () => {
    const result = updateContactProfileCommandSchema.safeParse({
      phone: "081234567890",
      homeAddress: "Jl. Daan Mogot No. 10, Jakarta Barat",
      birthDate: "1995-05-12",
      gender: "male",
    });

    expect(result.success).toBe(true);
  });
});
