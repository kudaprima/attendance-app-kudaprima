import type { Auth } from "firebase-admin/auth";
import type { Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";

/** Serialize all privileged account mutations, including migration and provisioning. */
export async function withAccessManagementLock<T>(database: Firestore, work: () => Promise<T>): Promise<T> {
  const ref = database.doc("systemCounters/accessManagement");
  const owner = randomUUID();
  await database.runTransaction(async (tx) => {
    const state = (await tx.get(ref)).data();
    if (state?.owner && state.expiresAt > Date.now()) {
      throw new HttpsError("aborted", "Pengelolaan akses sedang berjalan. Coba kembali.");
    }
    tx.set(ref, { owner, expiresAt: Date.now() + 300_000 });
  });
  try {
    return await work();
  } finally {
    await database.runTransaction(async (tx) => {
      if ((await tx.get(ref)).data()?.owner === owner) tx.delete(ref);
    }).catch(() => undefined);
  }
}

export async function assertActiveAdmin(database: Firestore, auth: Auth, identity?: { uid: string; token: Record<string, unknown> }) {
  if (!identity) throw new HttpsError("unauthenticated", "Silakan masuk kembali.");
  const [snapshot, account] = await Promise.all([
    database.doc(`users/${identity.uid}`).get(),
    auth.getUser(identity.uid).catch(() => null),
  ]);
  const profile = snapshot.data();
  const validAfter = account?.tokensValidAfterTime ? Date.parse(account.tokensValidAfterTime) / 1000 : NaN;
  if (!account || account.disabled || identity.token.role !== "admin" ||
      account.customClaims?.role !== "admin" || profile?.role !== "admin" ||
      profile.active !== true || profile.authUid !== identity.uid ||
      profile.email !== account.email || identity.token.email !== account.email ||
      typeof identity.token.auth_time !== "number" || !Number.isFinite(validAfter) ||
      identity.token.auth_time < validAfter) {
    throw new HttpsError("permission-denied", "Hanya Admin aktif yang dapat mengelola karyawan.");
  }
}

/** Call only while holding the global lock. Job titles never contribute to access. */
export async function requireTwoOtherAdmins(database: Firestore, auth: Auth, excludedUid: string) {
  const profiles = await database.collection("users").where("role", "==", "admin").get();
  let count = 0;
  for (const row of profiles.docs) {
    const profile = row.data();
    if (row.id === excludedUid || profile.active !== true || profile.authUid !== row.id) continue;
    const account = await auth.getUser(row.id).catch(() => null);
    if (account && !account.disabled && account.customClaims?.role === "admin" && account.email === profile.email) count++;
  }
  if (count < 2) throw new HttpsError("failed-precondition", "Minimal dua Admin aktif harus tetap tersedia.");
}
