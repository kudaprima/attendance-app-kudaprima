import { describe, expect, it } from "vitest";

import {
  employeeIdSchema,
  provisionEmployeeProfileCommandSchema,
} from "../src/index.js";

describe("provisionEmployeeProfileCommandSchema", () => {
  const validCommand = {
    authUid: "employee-auth-uid",
    email: "employee@kudaprima.test",
    fullName: "Karyawan Development",
    role: "technician",
    jobTitle: "Teknisi Lapangan",
    employmentStatus: "contract",
    employmentStartDate: "2026-01-15",
  } as const;

  it("normalizes identity fields", () => {
    const result = provisionEmployeeProfileCommandSchema.parse({
      ...validCommand,
      email: " EMPLOYEE@KUDAPRIMA.TEST ",
      fullName: "  Karyawan Development  ",
    });

    expect(result.email).toBe("employee@kudaprima.test");
    expect(result.fullName).toBe("Karyawan Development");
  });

  it("rejects impossible employment dates", () => {
    const result = provisionEmployeeProfileCommandSchema.safeParse({
      ...validCommand,
      employmentStartDate: "2026-02-30",
    });

    expect(result.success).toBe(false);
  });
});

describe("employeeIdSchema", () => {
  it.each(["KP-000001", "KP-999999"])("accepts %s", (employeeId) => {
    expect(employeeIdSchema.safeParse(employeeId).success).toBe(true);
  });

  it.each(["KP-1", "kp-000001", "KP-1000000"])("rejects %s", (employeeId) => {
    expect(employeeIdSchema.safeParse(employeeId).success).toBe(false);
  });
});
