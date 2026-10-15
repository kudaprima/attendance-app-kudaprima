import { describe, expect, it } from "vitest";

import { getProductionInitialAdminAccounts } from "../src/development/seed-production-online.js";

describe("production initial admin seed accounts", () => {
  it("returns strictly 2 admin accounts with zero supervisor roles or titles", () => {
    const accounts = getProductionInitialAdminAccounts({});

    expect(accounts).toHaveLength(2);
    for (const acc of accounts) {
      expect(acc.role).toBe("admin");
      expect(acc.jobTitle.toLowerCase()).not.toContain("supervisor");
      expect(acc.employmentStatus).toBe("permanent");
    }

    expect(accounts[0]?.email).toBe("admin.utama@kudaprima.id");
    expect(accounts[1]?.email).toBe("admin.operasional@kudaprima.id");
  });

  it("supports custom admin email and name overrides from environment variables", () => {
    const accounts = getProductionInitialAdminAccounts({
      ADMIN_1_EMAIL: "direktur@kudaprima.id",
      ADMIN_1_NAME: "Admin Direktur",
      ADMIN_2_EMAIL: "hrd@kudaprima.id",
      ADMIN_2_NAME: "Admin HRD",
    });

    expect(accounts[0]?.email).toBe("direktur@kudaprima.id");
    expect(accounts[0]?.displayName).toBe("Admin Direktur");
    expect(accounts[1]?.email).toBe("hrd@kudaprima.id");
    expect(accounts[1]?.displayName).toBe("Admin HRD");
  });
});
