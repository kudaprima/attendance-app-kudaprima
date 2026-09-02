import { initializeApp } from "firebase-admin/app";

import {
  authEmulatorHost,
  authEmulatorPassword,
  authEmulatorProjectId,
} from "./auth-emulator-accounts.js";
import {
  assertAuthEmulatorIsAvailable,
  seedAuthEmulatorAccounts,
} from "./auth-emulator-seeder.js";

async function main(): Promise<void> {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
  process.env.GCLOUD_PROJECT = authEmulatorProjectId;

  await assertAuthEmulatorIsAvailable();
  initializeApp({ projectId: authEmulatorProjectId });
  await seedAuthEmulatorAccounts();

  console.info(`Development password: ${authEmulatorPassword}`);
  console.info("Auth Emulator seed completed. No online project was modified.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
