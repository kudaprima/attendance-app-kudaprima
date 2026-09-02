import { HttpsError } from "firebase-functions/v2/https";
import { describe, expect, it } from "vitest";

import { handleProvisionEmployeeProfile } from "../src/profile/provision-employee-profile.js";

describe("handleProvisionEmployeeProfile", () => {
  it("rejects unauthenticated requests before accessing persistence", async () => {
    await expect(
      handleProvisionEmployeeProfile({ data: {} }),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: "unauthenticated" });
  });

  it("rejects malformed commands before accessing persistence", async () => {
    await expect(
      handleProvisionEmployeeProfile({
        auth: { uid: "manager", token: { role: "admin" } },
        data: { authUid: "employee" },
      }),
    ).rejects.toMatchObject<Partial<HttpsError>>({ code: "invalid-argument" });
  });
});
