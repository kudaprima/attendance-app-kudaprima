import { deleteApp, initializeApp as initializeClientApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth as getClientAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  getFirestore as getClientFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

export interface ProductionAdminSeedAccount {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly employeeId: string;
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
      displayName: env.ADMIN_1_NAME?.trim() || "Admin Utama PT Kuda Prima",
      employeeId: "KP-000001",
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
      employeeId: "KP-000002",
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
  const apiKey =
    process.env.FIREBASE_API_KEY?.trim() ||
    "AIzaSyCHBQ1Wzk3F9WIqVVaGRwxcXWXTNv-YmN0";
  const initialPassword =
    process.env.INITIAL_ADMIN_PASSWORD?.trim() || "KudaPrima#Admin2026";

  if (initialPassword.length < 8) {
    throw new Error("INITIAL_ADMIN_PASSWORD minimal harus 8 karakter.");
  }

  const app = initializeClientApp(
    {
      apiKey,
      authDomain: `${projectId}.firebaseapp.com`,
      projectId,
    },
    "spark-production-seeder",
  );

  const auth = getClientAuth(app);
  const database = getClientFirestore(app);
  const accounts = getProductionInitialAdminAccounts(process.env);

  console.info(
    `Memulai seeding awal Firebase Online (Spark Mode) pada project: ${projectId}`,
  );

  try {
    for (const account of accounts) {
      let uid = "";
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          account.email,
          initialPassword,
        );
        uid = cred.user.uid;
        await updateProfile(cred.user, { displayName: account.displayName });
      } catch (err) {
        if (!hasErrorCode(err, "auth/email-already-in-use")) {
          throw err;
        }
        const cred = await signInWithEmailAndPassword(
          auth,
          account.email,
          initialPassword,
        );
        uid = cred.user.uid;
      }

      const userRef = doc(database, "users", uid);
      const existingSnap = await getDoc(userRef);
      if (!existingSnap.exists()) {
        await setDoc(userRef, {
          authUid: uid,
          employeeId: account.employeeId,
          fullName: account.displayName,
          email: account.email,
          role: "admin",
          jobTitle: account.jobTitle,
          employmentStatus: account.employmentStatus,
          employmentStartDate: account.employmentStartDate,
          active: true,
          revision: 1,
          phone: null,
          birthDate: null,
          gender: null,
          homeAddress: null,
          createdAt: serverTimestamp(),
          createdBy: "production-initial-seeder",
          updatedAt: serverTimestamp(),
          updatedBy: "production-initial-seeder",
        });
        console.info(
          `[OK] Created Admin: ${account.employeeId} | ${account.email} (${uid}) | Jabatan: ${account.jobTitle}`,
        );
      } else {
        console.info(
          `[OK] Verified Admin: ${account.employeeId} | ${account.email} (${uid}) | Jabatan: ${account.jobTitle}`,
        );
      }
    }

    // While signed in as the second bootstrap admin (isManager() == true), seed systemCounters & officeLocations/main
    const counterRef = doc(database, "systemCounters", "employeeId");
    const counterSnap = await getDoc(counterRef);
    if (!counterSnap.exists()) {
      await setDoc(counterRef, {
        nextSequence: 3,
        updatedAt: serverTimestamp(),
        updatedBy: "production-initial-seeder",
      });
      console.info("[OK] Seeded systemCounters/employeeId (nextSequence: 3)");
    }

    const officeRef = doc(database, "officeLocations", "main");
    const officeSnap = await getDoc(officeRef);
    if (!officeSnap.exists()) {
      await setDoc(officeRef, {
        active: true,
        accuracyThresholdMeters: 50,
        latitude: -6.214737033753623,
        longitude: 106.76089760397757,
        name: "Kantor PT Kuda Prima",
        radiusMeters: 100,
        timeZone: "Asia/Jakarta",
        updatedAt: serverTimestamp(),
        updatedBy: "production-initial-seeder",
      });
      console.info("[OK] Seeded officeLocations/main (Kantor PT Kuda Prima)");
    } else {
      console.info(
        "[OK] Verified officeLocations/main sudah tersedia (dipertahankan).",
      );
    }

    await signOut(auth);
    console.info(
      "Seeding awal selesai: 2 akun Admin aktif (tanpa supervisor) + lokasi kantor siap digunakan.",
    );
  } finally {
    await deleteApp(app).catch(() => undefined);
  }
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
