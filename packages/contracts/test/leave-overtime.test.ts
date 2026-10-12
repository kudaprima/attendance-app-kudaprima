import { describe, expect, it } from "vitest";

import {
  leaveRequestCommandSchema,
  overtimeRequestCommandSchema,
  processServiceApprovalCommandSchema,
  submitServiceRequestCommandSchema,
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

describe("submitServiceRequestCommandSchema", () => {
  it("validates a date-range annual leave request with optional attachment", () => {
    const result = submitServiceRequestCommandSchema.safeParse({
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440000",
      type: "annual_leave",
      startDate: "2026-10-15",
      endDate: "2026-10-17",
      reason: "Acara pernikahan keluarga di luar kota",
    });

    expect(result.success).toBe(true);
  });

  it("rejects leave request when endDate is before startDate", () => {
    const result = submitServiceRequestCommandSchema.safeParse({
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440001",
      type: "sick_leave",
      startDate: "2026-10-15",
      endDate: "2026-10-12",
      reason: "Istirahat demam tinggi",
    });

    expect(result.success).toBe(false);
  });

  it("validates overtime request with start/end time, location, and mandatory selfie", () => {
    const result = submitServiceRequestCommandSchema.safeParse({
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440002",
      type: "overtime",
      startDate: "2026-10-12",
      startedAt: "2026-10-12T17:15:00+07:00",
      endedAt: "2026-10-12T21:45:00+07:00",
      clientOrLocation: "Site Data Center PT Maju Jaya",
      reason: "Migrasi router core dan pengujian failover",
      selfieBase64: "dGVzdC1zZWxmaWUtYmFzZTY0",
    });

    expect(result.success).toBe(true);
  });

  it("rejects overtime request when mandatory selfie or location is missing", () => {
    const result = submitServiceRequestCommandSchema.safeParse({
      idempotencyKey: "550e8400-e29b-41d4-a716-446655440003",
      type: "overtime",
      startDate: "2026-10-12",
      startedAt: "2026-10-12T17:15:00+07:00",
      endedAt: "2026-10-12T19:00:00+07:00",
      reason: "Maintenance rutin",
    });

    expect(result.success).toBe(false);
  });
});

describe("processServiceApprovalCommandSchema", () => {
  it("validates approval decision with optional notes", () => {
    const result = processServiceApprovalCommandSchema.safeParse({
      requestId: "req-12345",
      status: "approved",
      notes: "Disetujui sesuai jadwal operasional.",
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
