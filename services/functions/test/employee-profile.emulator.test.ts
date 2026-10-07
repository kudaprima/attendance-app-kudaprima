import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { readFile } from "node:fs/promises";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  EmployeeCounterError,
  EmployeeProfileConflictError,
  ensureEmployeeProfile,
} from "../src/profile/employee-profile-service.js";

const projectId = "demo-kuda-prima-tests";
const firestoreHost = "127.0.0.1";
const firestorePort = 18180;

let adminApp: App;
let adminDatabase: Firestore;
let testEnvironment: RulesTestEnvironment;

const baseProfile = {
  active: true,
  authUid: "rules-technician",
  birthDate: null,
  createdAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
  createdBy: "test-seeder",
  email: "rules-technician@kudaprima.test",
  employeeId: "KP-900001",
  employmentStartDate: "2025-01-01",
  employmentStatus: "contract",
  fullName: "Teknisi Rules",
  gender: null,
  homeAddress: null,
  jobTitle: "Teknisi Lapangan",
  phone: null,
  role: "technician",
  updatedAt: Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z")),
  updatedBy: "test-seeder",
} as const;

async function seedRuleProfiles(): Promise<void> {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await setDoc(doc(database, "users/rules-technician"), baseProfile);
    await setDoc(doc(database, "users/rules-inactive"), {
      ...baseProfile,
      active: false,
      authUid: "rules-inactive",
      email: "rules-inactive@kudaprima.test",
      employeeId: "KP-900002",
    });
    await setDoc(doc(database, "users/rules-manager"), {
      ...baseProfile,
      authUid: "rules-manager",
      email: "rules-manager@kudaprima.test",
      employeeId: "KP-900003",
      fullName: "Manager Rules",
      jobTitle: "Supervisor",
      role: "admin",
    });
    await setDoc(doc(database, "officeLocations/main"), {
      active: true,
      accuracyThresholdMeters: 50,
      latitude: -6.214737033753623,
      longitude: 106.76089760397757,
      name: "Kantor PT Kuda Prima",
      radiusMeters: 100,
      timeZone: "Asia/Jakarta",
    });
    await setDoc(doc(database, "attendanceEvents/event-technician"), {
      eventId: "event-technician",
      userId: "rules-technician",
      employeeId: "KP-900001",
      eventType: "check_in",
      locationType: "office",
      status: "normal",
      requiresApproval: false,
    });
  });
}

beforeAll(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = `${firestoreHost}:${firestorePort}`;
  const rules = await readFile(
    new URL("../../../firebase/firestore.rules", import.meta.url),
    "utf8",
  );
  testEnvironment = await initializeTestEnvironment({
    projectId,
    firestore: { host: firestoreHost, port: firestorePort, rules },
  });
  adminApp = initializeApp({ projectId }, "employee-profile-emulator-tests");
  adminDatabase = getFirestore(adminApp);
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
});

afterAll(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.cleanup();
  await deleteApp(adminApp);
});

describe("employee profile provisioning", () => {
  it("allocates sequential IDs and remains idempotent", async () => {
    const firstCommand = {
      authUid: "provision-technician",
      email: "provision-technician@kudaprima.test",
      fullName: "Teknisi Provisioning",
      jobTitle: "Teknisi Lapangan",
      role: "technician",
      employmentStatus: "contract",
      employmentStartDate: "2025-01-01",
    } as const;
    const secondCommand = {
      ...firstCommand,
      authUid: "provision-admin",
      email: "provision-admin@kudaprima.test",
      fullName: "Admin Provisioning",
      jobTitle: "Supervisor",
      role: "admin",
      employmentStatus: "permanent",
    } as const;

    const first = await ensureEmployeeProfile(
      adminDatabase,
      firstCommand,
      "provisioning-test",
    );
    const second = await ensureEmployeeProfile(
      adminDatabase,
      secondCommand,
      "provisioning-test",
    );
    const repeated = await ensureEmployeeProfile(
      adminDatabase,
      firstCommand,
      "provisioning-test",
    );

    expect(first).toEqual({ created: true, employeeId: "KP-000001" });
    expect(second).toEqual({ created: true, employeeId: "KP-000002" });
    expect(repeated).toEqual({ created: false, employeeId: "KP-000001" });

    const counter = await adminDatabase.doc("systemCounters/employeeId").get();
    const audit = await adminDatabase.collection("auditLogs").get();
    expect(counter.get("nextSequence")).toBe(3);
    expect(audit.size).toBe(2);
  });

  it("rejects conflicting data for an existing Auth UID", async () => {
    const command = {
      authUid: "conflicting-employee",
      email: "conflicting-employee@kudaprima.test",
      fullName: "Original Employee",
      jobTitle: "Teknisi Lapangan",
      role: "technician",
      employmentStatus: "contract",
      employmentStartDate: "2025-01-01",
    } as const;

    await ensureEmployeeProfile(adminDatabase, command, "provisioning-test");

    await expect(
      ensureEmployeeProfile(
        adminDatabase,
        { ...command, fullName: "Changed Employee" },
        "provisioning-test",
      ),
    ).rejects.toBeInstanceOf(EmployeeProfileConflictError);
  });

  it("rejects an invalid employee ID counter", async () => {
    await adminDatabase.doc("systemCounters/employeeId").set({
      nextSequence: 1_000_000,
    });

    await expect(
      ensureEmployeeProfile(
        adminDatabase,
        {
          authUid: "exhausted-counter-employee",
          email: "exhausted-counter-employee@kudaprima.test",
          fullName: "Exhausted Counter",
          jobTitle: "Teknisi Lapangan",
          role: "technician",
          employmentStatus: "contract",
          employmentStartDate: "2025-01-01",
        },
        "provisioning-test",
      ),
    ).rejects.toBeInstanceOf(EmployeeCounterError);
  });
});

describe("employee profile Firestore rules", () => {
  beforeEach(seedRuleProfiles);

  it("allows employees to read only their own profile", async () => {
    const ownerDatabase = testEnvironment
      .authenticatedContext("rules-technician", { role: "technician" })
      .firestore();

    await expect(
      assertSucceeds(getDoc(doc(ownerDatabase, "users/rules-technician"))),
    ).resolves.toBeDefined();
    await expect(
      assertFails(getDoc(doc(ownerDatabase, "users/rules-manager"))),
    ).resolves.toBeDefined();
  });

  it("allows an inactive employee to read their disabled status", async () => {
    const inactiveDatabase = testEnvironment
      .authenticatedContext("rules-inactive", { role: "technician" })
      .firestore();

    const snapshot = await assertSucceeds(
      getDoc(doc(inactiveDatabase, "users/rules-inactive")),
    );
    expect(snapshot.data()?.active).toBe(false);
  });

  it("allows active managers to read another employee profile", async () => {
    const managerDatabase = testEnvironment
      .authenticatedContext("rules-manager", { role: "admin" })
      .firestore();

    await expect(
      assertSucceeds(getDoc(doc(managerDatabase, "users/rules-technician"))),
    ).resolves.toBeDefined();
  });

  it("allows only validated self-service fields to change", async () => {
    const ownerDatabase = testEnvironment
      .authenticatedContext("rules-technician", { role: "technician" })
      .firestore();
    const reference = doc(ownerDatabase, "users/rules-technician");

    await expect(
      assertSucceeds(
        updateDoc(reference, {
          phone: "+628123456789",
          updatedAt: serverTimestamp(),
          updatedBy: "rules-technician",
        }),
      ),
    ).resolves.toBeDefined();
    await expect(
      assertFails(updateDoc(reference, { role: "admin" })),
    ).resolves.toBeDefined();
    for (const field of ["fullName", "birthDate", "gender"]) {
      await expect(
        assertFails(
          updateDoc(reference, {
            [field]: "changed",
            updatedAt: serverTimestamp(),
            updatedBy: "rules-technician",
          }),
        ),
      ).resolves.toBeDefined();
    }
  });

  it("denies profile updates from an inactive employee", async () => {
    const inactiveDatabase = testEnvironment
      .authenticatedContext("rules-inactive", { role: "technician" })
      .firestore();

    await expect(
      assertFails(
        updateDoc(doc(inactiveDatabase, "users/rules-inactive"), {
          fullName: "Inactive Employee Updated",
          updatedAt: serverTimestamp(),
          updatedBy: "rules-inactive",
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("denies client-side profile creation", async () => {
    const employeeDatabase = testEnvironment
      .authenticatedContext("unprovisioned-user", { role: "technician" })
      .firestore();

    await expect(
      assertFails(
        setDoc(doc(employeeDatabase, "users/unprovisioned-user"), {
          ...baseProfile,
          authUid: "unprovisioned-user",
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("allows active employees to read but not write office configuration", async () => {
    const employeeDatabase = testEnvironment
      .authenticatedContext("rules-technician", { role: "technician" })
      .firestore();
    const reference = doc(employeeDatabase, "officeLocations/main");

    await expect(assertSucceeds(getDoc(reference))).resolves.toBeDefined();
    await expect(
      assertFails(updateDoc(reference, { radiusMeters: 200 })),
    ).resolves.toBeDefined();
  });

  it("denies inactive employees from reading office configuration", async () => {
    const inactiveDatabase = testEnvironment
      .authenticatedContext("rules-inactive", { role: "technician" })
      .firestore();

    await expect(
      assertFails(getDoc(doc(inactiveDatabase, "officeLocations/main"))),
    ).resolves.toBeDefined();
  });

  it("allows active employee to read own attendanceEvents", async () => {
    const employeeDatabase = testEnvironment
      .authenticatedContext("rules-technician", { role: "technician" })
      .firestore();

    await expect(
      assertSucceeds(
        getDoc(doc(employeeDatabase, "attendanceEvents/event-technician")),
      ),
    ).resolves.toBeDefined();
  });

  it("denies active employee from reading another employee's attendanceEvents", async () => {
    const otherEmployeeDatabase = testEnvironment
      .authenticatedContext("rules-technician-2", { role: "technician" })
      .firestore();

    // First seed another technician's active profile
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/rules-technician-2"), {
        ...baseProfile,
        authUid: "rules-technician-2",
        email: "rules-technician-2@kudaprima.test",
        employeeId: "KP-900004",
      });
    });

    await expect(
      assertFails(
        getDoc(doc(otherEmployeeDatabase, "attendanceEvents/event-technician")),
      ),
    ).resolves.toBeDefined();
  });

  it("allows manager to read any employee's attendanceEvents", async () => {
    const managerDatabase = testEnvironment
      .authenticatedContext("rules-manager", { role: "admin" })
      .firestore();

    await expect(
      assertSucceeds(
        getDoc(doc(managerDatabase, "attendanceEvents/event-technician")),
      ),
    ).resolves.toBeDefined();
  });

  it("denies client-side write, creation, or update to attendanceEvents", async () => {
    const employeeDatabase = testEnvironment
      .authenticatedContext("rules-technician", { role: "technician" })
      .firestore();

    await expect(
      assertFails(
        setDoc(doc(employeeDatabase, "attendanceEvents/client-spoofed-event"), {
          eventId: "client-spoofed-event",
          userId: "rules-technician",
          eventType: "check_in",
        }),
      ),
    ).resolves.toBeDefined();

    await expect(
      assertFails(
        updateDoc(doc(employeeDatabase, "attendanceEvents/event-technician"), {
          status: "normal",
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("denies unauthenticated read to attendanceEvents", async () => {
    const unauthenticatedDatabase = testEnvironment
      .unauthenticatedContext()
      .firestore();

    await expect(
      assertFails(
        getDoc(doc(unauthenticatedDatabase, "attendanceEvents/event-technician")),
      ),
    ).resolves.toBeDefined();
  });
});
