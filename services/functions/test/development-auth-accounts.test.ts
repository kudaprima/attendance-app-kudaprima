import { describe, expect, it } from "vitest";

import { developmentAuthAccounts } from "../src/development/auth-emulator-accounts.js";

describe("developmentAuthAccounts", () => {
  it("provides active accounts with distinct job titles for the two-role model", () => {
    expect(
      Array.from(
        new Set(developmentAuthAccounts.map((account) => account.role)),
      ).sort(),
    ).toEqual(["admin", "technician"]);

    expect(
      developmentAuthAccounts.filter((account) => account.role === "admin"),
    ).toHaveLength(2);

    expect(
      developmentAuthAccounts.every(
        (account) =>
          typeof account.jobTitle === "string" &&
          account.jobTitle.trim().length >= 2,
      ),
    ).toBe(true);

    expect(
      new Set(developmentAuthAccounts.map((account) => account.uid)).size,
    ).toBe(developmentAuthAccounts.length);
    expect(
      new Set(developmentAuthAccounts.map((account) => account.email)).size,
    ).toBe(developmentAuthAccounts.length);
  });

  it("uses reserved test-domain email addresses", () => {
    expect(
      developmentAuthAccounts.every((account) =>
        account.email.endsWith("@kudaprima.test"),
      ),
    ).toBe(true);
  });
});
