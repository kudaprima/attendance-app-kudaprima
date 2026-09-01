import { initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";

import {
  authEmulatorHost,
  authEmulatorPassword,
  authEmulatorProjectId,
  developmentAuthAccounts,
  type DevelopmentAuthAccount,
} from "./auth-emulator-accounts.js";

async function assertAuthEmulatorIsAvailable(): Promise<void> {
  const endpoint =
    `http://${authEmulatorHost}/emulator/v1/projects/` +
    `${authEmulatorProjectId}/config`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Auth Emulator tidak tersedia di ${authEmulatorHost}. ` +
        "Jalankan pnpm emulators:auth terlebih dahulu.",
      { cause: error },
    );
  }
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === expectedCode
  );
}

async function upsertAccount(
  account: DevelopmentAuthAccount,
): Promise<UserRecord> {
  const auth = getAuth();
  let user: UserRecord;

  try {
    user = await auth.getUserByEmail(account.email);
    user = await auth.updateUser(user.uid, {
      displayName: account.displayName,
      password: authEmulatorPassword,
      disabled: false,
      emailVerified: true,
    });
  } catch (error) {
    if (!hasErrorCode(error, "auth/user-not-found")) throw error;

    user = await auth.createUser({
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      password: authEmulatorPassword,
      disabled: false,
      emailVerified: true,
    });
  }

  await auth.setCustomUserClaims(user.uid, { role: account.role });
  return user;
}

async function main(): Promise<void> {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = authEmulatorHost;
  process.env.GCLOUD_PROJECT = authEmulatorProjectId;

  await assertAuthEmulatorIsAvailable();
  initializeApp({ projectId: authEmulatorProjectId });

  for (const account of developmentAuthAccounts) {
    const user = await upsertAccount(account);
    console.info(`Seeded ${account.role}: ${user.email} (${user.uid})`);
  }

  console.info(`Development password: ${authEmulatorPassword}`);
  console.info("Auth Emulator seed completed. No online project was modified.");
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
