import type { ProvisionEmployeeProfileCommand } from "@kuda-prima/contracts";
import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { ensureEmployeeProfile } from "../profile/employee-profile-service.js";
import {
  authEmulatorHost,
  authEmulatorPassword,
  authEmulatorProjectId,
  developmentAuthAccounts,
  firestoreEmulatorHost,
} from "./auth-emulator-accounts.js";
import {
  assertAuthEmulatorIsAvailable,
  seedAuthEmulatorAccounts,
} from "./auth-emulator-seeder.js";

async function assertFirestoreEmulatorIsAvailable(): Promise<void> {
  try {
    const response = await fetch(`http://${firestoreEmulatorHost}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Firestore Emulator tidak tersedia di ${firestoreEmulatorHost}. ` +
        "Jalankan pnpm emulators:profile terlebih dahulu.",
      { cause: error },
    );
  }
}

async function main(): Promise<void> {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
  process.env.FIRESTORE_EMULATOR_HOST = firestoreEmulatorHost;
  process.env.GCLOUD_PROJECT = authEmulatorProjectId;

  await Promise.all([
    assertAuthEmulatorIsAvailable(),
    assertFirestoreEmulatorIsAvailable(),
  ]);

  const app = initializeApp({ projectId: authEmulatorProjectId });
  await seedAuthEmulatorAccounts();

  const database = getFirestore(app);
  for (const account of developmentAuthAccounts) {
    const command: ProvisionEmployeeProfileCommand = {
      authUid: account.uid,
      email: account.email,
      fullName: account.displayName,
      role: account.role,
      employmentStatus: account.employmentStatus,
      employmentStartDate: account.employmentStartDate,
    };
    const result = await ensureEmployeeProfile(
      database,
      command,
      "development-seeder",
    );
    console.info(
      `${result.created ? "Created" : "Verified"} profile ` +
        `${result.employeeId} (${account.uid})`,
    );
  }

  await database.doc("officeLocations/main").set({
    active: true,
    accuracyThresholdMeters: 50,
    latitude: -6.214737033753623,
    longitude: 106.76089760397757,
    name: "Kantor PT Kuda Prima",
    radiusMeters: 100,
    timeZone: "Asia/Jakarta",
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: "development-seeder",
  });
  console.info("Seeded primary office location (officeLocations/main)");

  console.info(`Development password: ${authEmulatorPassword}`);
  console.info(
    "Auth and profile seed completed. No online project was modified.",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
