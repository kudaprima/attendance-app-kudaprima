import type { ProvisionEmployeeProfileCommand } from "@kuda-prima/contracts";
import { initializeApp } from "firebase-admin/app";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

import { ensureEmployeeProfile } from "../profile/employee-profile-service.js";

export interface ProductionAdminSeedAccount {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: "admin";
  readonly jobTitle: string;
  readonly employmentStatus: "permanent";
  readonly employmentStartDate: string;
}

export function getProductionInitialAdminAccounts(
  env: NodeJS.ProcessEnv = process.env,
): readonly ProductionAdminSeedAccount[] {
  return [
    {
      uid: env.ADMIN_1_UID?.trim() || "kp-admin-01",
      email: env.ADMIN_1_EMAIL?.trim() || "admin.utama@kudaprima.id",
      displayName:
        env.ADMIN_1_NAME?.trim() || "Admin Utama PT Kuda Prima",
      role: "admin",
      jobTitle: "Administrator Utama",
      employmentStatus: "permanent",
      employmentStartDate: "2020-01-01",
    },
    {
      uid: env.ADMIN_2_UID?.trim() || "kp-admin-02",
      email: env.ADMIN_2_EMAIL?.trim() || "admin.operasional@kudaprima.id",
      displayName:
        env.ADMIN_2_NAME?.trim() || "Admin Operasional PT Kuda Prima",
      role: "admin",
      jobTitle: "Administrator Operasional",
      employmentStatus: "permanent",
      employmentStartDate: "2020-01-01",
    },
  ];
}

function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === expectedCode
  );
}

async function upsertProductionAdminAuth(
  account: ProductionAdminSeedAccount,
  initialPassword: string,
): Promise<UserRecord> {
  const auth = getAuth();
  let user: UserRecord;

  try {
    user = await auth.getUserByEmail(account.email);
  } catch (error) {
    if (!hasErrorCode(error, "auth/user-not-found")) {
      throw error;
    }

    user = await auth.createUser({
      uid: account.uid,
      email: account.email,
      displayName: account.displayName,
      password: initialPassword,
      disabled: false,
      emailVerified: true,
    });
  }

  await auth.setCustomUserClaims(user.uid, { role: "admin" });
  return user;
}

async function main(): Promise<void> {
  if (process.env.CONFIRM_ONLINE_PRODUCTION_SEED !== "true") {
    throw new Error(
      "Safety guard: Set CONFIRM_ONLINE_PRODUCTION_SEED=true untuk menjalankan seeding awal ke Firebase Online.",
    );
  }

  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  delete process.env.FIRESTORE_EMULATOR_HOST;

  const projectId =
    process.env.FIREBASE_PROJECT_ID?.trim() || "kuda-prima-attandance-dev";
  const initialPassword =
    process.env.INITIAL_ADMIN_PASSWORD?.trim() || "KudaPrima#Admin2026";

  if (initialPassword.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD minimal harus 8 karakter.");
  }

  const app = initializeApp({ projectId });
  const database = getFirestore(app);
  const accounts = getProductionInitialAdminAccounts(process.env);

  console.info(
    `Memulai seeding awal Firebase Online pada project: ${projectId}`,
  );

  for (const account of accounts) {
    const authUser = await upsertProductionAdminAuth(account, initialPassword);
    const command: ProvisionEmployeeProfileCommand = {
      authUid: authUser.uid,
      email: account.email,
      fullName: account.displayName,
      role: "admin",
      jobTitle: account.jobTitle,
      employmentStatus: account.employmentStatus,
      employmentStartDate: account.employmentStartDate,
    };

    const result = await ensureEmployeeProfile(
      database,
      command,
      "production-initial-seeder",
    );
    console.info(
      `[OK] ${result.created ? "Created" : "Verified"} Admin: ${result.employeeId} | ${account.email} (${authUser.uid}) | Jabatan: ${account.jobTitle}`,
    );
  }

  const officeRef = database.doc("officeLocations/main");
  const officeSnap = await officeRef.get();
  if (!officeSnap.exists) {
    await officeRef.create({
      active: true,
      accuracyThresholdMeters: 50,
      latitude: -6.214737033753623,
      longitude: 106.76089760397757,
      name: "Kantor PT Kuda Prima",
      radiusMeters: 100,
      timeZone: "Asia/Jakarta",
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: "production-initial-seeder",
    });
    console.info("[OK] Seeded officeLocations/main (Kantor PT Kuda Prima)");
  } else {
    console.info(
      "[OK] Verified officeLocations/main sudah tersedia (dipertahankan).",
    );
  }

  console.info(
    "Seeding awal selesai: 2 akun Admin aktif (tanpa supervisor) + lokasi kantor siap digunakan.",
  );
}

const isDirectExecution =
  process.argv[1]?.endsWith("seed-production-online.js") ||
  process.argv[1]?.endsWith("seed-production-online.ts");

if (isDirectExecution) {
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
