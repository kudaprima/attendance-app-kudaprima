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
  employmentStatus: "contract",
  employmentStartDate: "2026-09-01",
};
describe("employee management commands", () => {
  it("normalizes Gmail and accepts all requested employment statuses", () => {
    for (const employmentStatus of ["intern", "contract", "permanent"]) {
      expect(
        createEmployeeCommandSchema.parse({
          ...create,
          employmentStatus,
          email: " Sample@GMAIL.COM ",
        }).email,
      ).toBe("sample@gmail.com");
    }
  });
  it("rejects non-Gmail addresses, malformed dates and short passwords", () => {
    for (const change of [
      { email: "sample@example.com" },
      { email: "x@gmail.com.evil.test" },
      { employmentStartDate: "2026-02-30" },
      { password: "short" },
      { active: "true" },
    ]) {
      expect(
        createEmployeeCommandSchema.safeParse({ ...create, ...change }).success,
      ).toBe(false);
    }
  });
  it("rejects role assignment and client employee ID", () => {
    expect(
      createEmployeeCommandSchema.safeParse({ ...create, role: "admin" })
        .success,
    ).toBe(false);
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
      ...fields
    } = create;
    const edit = { ...fields, uid: "employee", expectedRevision: 0 };
    expect(updateEmployeeCommandSchema.safeParse(edit).success).toBe(true);
    expect(
      updateEmployeeCommandSchema.safeParse({ ...edit, password: "" }).success,
    ).toBe(false);
    expect(
      updateEmployeeCommandSchema.safeParse({
        ...edit,
        employmentStartDate: "2026-01-01",
      }).success,
    ).toBe(false);
  });
});
