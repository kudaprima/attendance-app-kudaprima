import { describe, expect, it } from "vitest";

import { developmentAuthAccounts } from "../src/development/auth-emulator-accounts.js";

describe("developmentAuthAccounts", () => {
  it("provides one unique identity for every supported role", () => {
    expect(
      developmentAuthAccounts.map((account) => account.role).sort(),
    ).toEqual(["admin", "supervisor", "technician"]);

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
