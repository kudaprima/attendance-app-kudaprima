import { getAuth, type UserRecord } from "firebase-admin/auth";

import {
  authEmulatorHost,
  authEmulatorPassword,
  authEmulatorProjectId,
  developmentAuthAccounts,
  type DevelopmentAuthAccount,
} from "./auth-emulator-accounts.js";

export async function assertAuthEmulatorIsAvailable(): Promise<void> {
  const endpoint =
    `http://${authEmulatorHost}/emulator/v1/projects/` +
    `${authEmulatorProjectId}/config`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    throw new Error(
      `Auth Emulator tidak tersedia di ${authEmulatorHost}. ` +
        "Jalankan pnpm emulators:profile terlebih dahulu.",
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
    return user; // Preserve password, disabled state and claims on existing accounts.
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

export async function seedAuthEmulatorAccounts(): Promise<void> {
  for (const account of developmentAuthAccounts) {
    const user = await upsertAccount(account);
    console.info(`Seeded ${account.role}: ${user.email} (${user.uid})`);
  }
}
