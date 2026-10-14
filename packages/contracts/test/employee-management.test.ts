import { describe, expect, it } from "vitest";
import {
  createEmployeeCommandSchema,
  updateEmployeeCommandSchema,
} from "../src/index.js";
const create = {
  requestId: "310c3458-a66e-4630-b8e6-5481f995f6ef",
  fullName: "Karyawan Uji",
  email: "sample@gmail.com",
  password: "SyntheticPass123!",
  active: true,
  role: "technician",
  jobTitle: "Teknisi Lapangan",
  employmentStatus: "contract",
  employmentStartDate: "2026-09-01",
};
describe("employee management commands", () => {
  it("normalizes corporate, organizational, and personal emails and accepts all requested employment statuses", () => {
    for (const employmentStatus of ["intern", "contract", "permanent"]) {
      expect(
        createEmployeeCommandSchema.parse({
          ...create,
          employmentStatus,
          email: " Banu_Aziz@KudaPrima.COM ",
        }).email,
      ).toBe("banu_aziz@kudaprima.com");
      expect(
        createEmployeeCommandSchema.parse({
          ...create,
          employmentStatus,
          email: " poppy@kudaprima.co.id ",
        }).email,
      ).toBe("poppy@kudaprima.co.id");
      expect(
        createEmployeeCommandSchema.parse({
          ...create,
          employmentStatus,
          email: " teknisi@sadikun.com ",
        }).email,
      ).toBe("teknisi@sadikun.com");
      expect(
        createEmployeeCommandSchema.parse({
          ...create,
          employmentStatus,
          email: " project@mutiaraepc.com ",
        }).email,
      ).toBe("project@mutiaraepc.com");
    }
  });
  it("rejects invalid email formats, malformed dates and short passwords", () => {
    for (const change of [
      { email: "not-an-email" },
      { email: "invalid@" },
      { employmentStartDate: "2026-02-30" },
      { password: "short" },
      { active: "true" },
    ]) {
      expect(
        createEmployeeCommandSchema.safeParse({ ...create, ...change }).success,
      ).toBe(false);
    }
  });
  it("accepts each supported role and rejects unknown roles", () => {
    for (const role of ["technician", "admin"]) {
      expect(
        createEmployeeCommandSchema.safeParse({ ...create, role }).success,
      ).toBe(true);
    }
    for (const rejectedRole of ["supervisor", "owner"]) {
      expect(
        createEmployeeCommandSchema.safeParse({ ...create, role: rejectedRole })
          .success,
      ).toBe(false);
    }
  });
  it("rejects a client employee ID", () => {
    expect(
      createEmployeeCommandSchema.safeParse({
        ...create,
        employeeId: "KP-000001",
      }).success,
    ).toBe(false);
  });
  it("allows keeping a password and forbids start date changes on edit", () => {
    const {
      password: _password,
      employmentStartDate: _start,
      ...editableFields
    } = create;
    const edit = { ...editableFields, uid: "employee", expectedRevision: 0 };
    expect(updateEmployeeCommandSchema.safeParse(edit).success).toBe(true);
    expect(
      updateEmployeeCommandSchema.safeParse({ ...edit, password: "" }).success,
    ).toBe(false);
    expect(
      updateEmployeeCommandSchema.safeParse({
        ...edit,
        role: "supervisor",
      }).success,
    ).toBe(false);
    expect(
      updateEmployeeCommandSchema.safeParse({
        ...edit,
        employmentStartDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });
});
