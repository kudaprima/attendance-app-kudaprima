import {
  createEmployeeCommandSchema,
  updateEmployeeCommandSchema,
  deleteEmployeeCommandSchema,
  type CreateEmployeeCommand,
  type UpdateEmployeeCommand,
  type DeleteEmployeeCommand,
} from "@kuda-prima/contracts";
import type { Auth } from "firebase-admin/auth";
import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";

export interface EmployeeManagementRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data: unknown;
}
type Action = "create" | "update" | "delete";
type Command =
  CreateEmployeeCommand | UpdateEmployeeCommand | DeleteEmployeeCommand;
export interface EmployeeManagementResult {
  uid: string;
  employeeId: string;
}
const hasCode = (error: unknown, code: string) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  error.code === code;

/** Auth and Firestore cannot share a transaction. Keep access disabled until both agree. */
export async function manageEmployee(
  database: Firestore,
  auth: Auth,
  action: Action,
  request: EmployeeManagementRequest,
): Promise<EmployeeManagementResult> {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Silakan masuk kembali.");
  const actorUid = request.auth.uid;
  const [actorSnapshot, actorAuth] = await Promise.all([
    database.doc(`users/${actorUid}`).get(),
    auth.getUser(actorUid).catch(() => null),
  ]);
  const actor = actorSnapshot.data();
  const tokensValidAfter = actorAuth?.tokensValidAfterTime
    ? Date.parse(actorAuth.tokensValidAfterTime) / 1000
    : Number.NaN;
  if (
    !actorAuth ||
    request.auth.token.role !== "admin" ||
    actorAuth.disabled ||
    actorAuth.customClaims?.role !== "admin" ||
    actor?.role !== "admin" ||
    actor.active !== true ||
    actor.authUid !== actorUid ||
    actor.email !== actorAuth.email ||
    request.auth.token.email !== actorAuth.email ||
    typeof request.auth.token.auth_time !== "number" ||
    !Number.isFinite(tokensValidAfter) ||
    request.auth.token.auth_time < tokensValidAfter
  ) {
    throw new HttpsError(
      "permission-denied",
      "Hanya admin aktif yang dapat mengelola karyawan.",
    );
  }
  const schema =
    action === "create"
      ? createEmployeeCommandSchema
      : action === "update"
        ? updateEmployeeCommandSchema
        : deleteEmployeeCommandSchema;
  const parsed = schema.safeParse(request.data);
  if (!parsed.success)
    throw new HttpsError(
      "invalid-argument",
      "Data tidak valid. Periksa Gmail, kata sandi, dan kolom wajib.",
    );
  const command: Command = parsed.data;
  const uid = "uid" in command ? command.uid : `employee-${command.requestId}`;
  if (
    uid === actorUid &&
    (action === "delete" || ("active" in command && !command.active))
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Akun admin yang sedang digunakan tidak dapat dinonaktifkan atau dihapus.",
    );
  }
  const profileRef = database.doc(`users/${uid}`);
  const auditRef = database.doc(`auditLogs/employee-${command.requestId}`);
  const lockRef = database.doc(`employeeManagementLocks/${uid}`);
  const owner = randomUUID();
  const prior = await database.runTransaction(async (tx) => {
    const audit = await tx.get(auditRef);
    if (audit.exists) {
      const data = audit.data()!;
      if (
        data.actorUid !== actorUid ||
        data.subjectUid !== uid ||
        data.action !== `employee_${action}`
      ) {
        throw new HttpsError(
          "already-exists",
          "ID permintaan telah digunakan.",
        );
      }
      return { uid, employeeId: data.subjectEmployeeId as string };
    }
    const lock = await tx.get(lockRef);
    if (lock.exists && lock.data()!.expiresAt > Date.now()) {
      throw new HttpsError(
        "aborted",
        "Karyawan sedang diproses. Tunggu lalu coba kembali.",
      );
    }
    tx.set(lockRef, { owner, expiresAt: Date.now() + 300_000 });
    return null;
  });
  if (prior) return prior;
  let accessPaused = false;
  try {
    let profile = (await profileRef.get()).data();
    if (action !== "create") {
      if (!profile)
        throw new HttpsError("not-found", "Karyawan tidak ditemukan.");
      if (
        (profile.revision ?? 0) !==
        (command as UpdateEmployeeCommand).expectedRevision
      ) {
        throw new HttpsError(
          "aborted",
          "Data telah berubah. Tutup form dan buka kembali.",
        );
      }
      if (profile.managementAction === "delete" && action !== "delete") {
        throw new HttpsError(
          "failed-precondition",
          "Selesaikan penghapusan sebelumnya terlebih dahulu.",
        );
      }
    }
    if ("email" in command) {
      try {
        const existing = await auth.getUserByEmail(command.email);
        if (existing.uid !== uid)
          throw new HttpsError(
            "already-exists",
            "Email sudah digunakan oleh akun lain.",
          );
      } catch (error) {
        if (!hasCode(error, "auth/user-not-found")) throw error;
      }
    }

    if (action === "create") {
      const create = command as CreateEmployeeCommand;
      if (
        profile &&
        (profile.createdBy !== actorUid ||
          profile.managementRequestId !== create.requestId)
      ) {
        throw new HttpsError(
          "already-exists",
          "Akun sudah terdaftar. Muat ulang daftar karyawan.",
        );
      }
      try {
        // Admin is the trusted provisioner of the employee's Gmail address. Verified
        // accounts retain the password provider when Google links the same email.
        await auth.createUser({
          uid,
          email: create.email,
          password: create.password,
          displayName: create.fullName,
          emailVerified: true,
          disabled: true,
        });
      } catch (error) {
        if (!hasCode(error, "auth/uid-already-exists")) throw error;
        const existing = await auth.getUser(uid);
        if (!existing.disabled || existing.email !== create.email)
          throw new HttpsError("already-exists", "Akun sudah terdaftar.");
        await auth.updateUser(uid, {
          password: create.password,
          displayName: create.fullName,
        });
      }
      accessPaused = true;
      if (!profile) {
        await database.runTransaction(async (tx) => {
          const counterRef = database.doc("systemCounters/employeeId");
          const counter = await tx.get(counterRef);
          const sequence = counter.data()?.nextSequence ?? 1;
          if (
            !Number.isSafeInteger(sequence) ||
            sequence < 1 ||
            sequence > 999999
          ) {
            throw new HttpsError(
              "resource-exhausted",
              "Nomor karyawan tidak tersedia.",
            );
          }
          tx.create(profileRef, {
            authUid: uid,
            employeeId: `KP-${String(sequence).padStart(6, "0")}`,
            fullName: create.fullName,
            email: create.email,
            role: "technician",
            employmentStatus: create.employmentStatus,
            employmentStartDate: create.employmentStartDate,
            active: false,
            revision: 0,
            birthDate: null,
            gender: null,
            phone: null,
            homeAddress: null,
            managementRequestId: create.requestId,
            managementAction: action,
            createdBy: actorUid,
            updatedBy: actorUid,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          });
          tx.set(
            counterRef,
            {
              nextSequence: sequence + 1,
              updatedBy: actorUid,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
          );
        });
        profile = (await profileRef.get()).data();
      }
      await auth.setCustomUserClaims(uid, { role: "technician" });
    } else {
      // First revoke access in rules, then change the Auth identity. On a partial
      // failure the row remains visible and inactive so an admin can retry safely.
      await profileRef.update({
        active: false,
        managementRequestId: command.requestId,
        managementAction: action,
      });
      accessPaused = true;
      try {
        await auth.updateUser(uid, { disabled: true });
        await auth.revokeRefreshTokens(uid);
      } catch (error) {
        if (action !== "delete" || !hasCode(error, "auth/user-not-found"))
          throw error;
      }
      if (action === "update" && profile!.managementAction === "create") {
        await auth.setCustomUserClaims(uid, {
          ...(await auth.getUser(uid)).customClaims,
          role: profile!.role,
        });
      }
    }

    if (action === "delete") {
      try {
        await auth.deleteUser(uid);
      } catch (error) {
        if (!hasCode(error, "auth/user-not-found")) throw error;
      }
    } else {
      const edit = command as CreateEmployeeCommand | UpdateEmployeeCommand;
      const current = await auth.getUser(uid);
      const changedEmail = current.email !== edit.email;
      await auth.updateUser(uid, {
        displayName: edit.fullName,
        email: edit.email,
        emailVerified: true,
        ...(edit.password ? { password: edit.password } : {}),
        ...(changedEmail
          ? {
              providersToUnlink: current.providerData
                .filter((p) => p.providerId !== "password")
                .map((p) => p.providerId),
            }
          : {}),
        disabled: !edit.active,
      });
    }
    const employeeId = profile!.employeeId as string;
    await database.runTransaction(async (tx) => {
      const lock = await tx.get(lockRef);
      if (lock.data()?.owner !== owner)
        throw new HttpsError("aborted", "Operasi perlu diulang.");
      if (action === "delete") tx.delete(profileRef);
      else {
        const edit = command as CreateEmployeeCommand | UpdateEmployeeCommand;
        tx.update(profileRef, {
          fullName: edit.fullName,
          email: edit.email,
          active: edit.active,
          employmentStatus: edit.employmentStatus,
          revision: (profile!.revision ?? 0) + 1,
          updatedBy: actorUid,
          updatedAt: FieldValue.serverTimestamp(),
          managementRequestId: FieldValue.delete(),
          managementAction: FieldValue.delete(),
        });
      }
      tx.create(auditRef, {
        action: `employee_${action}`,
        actorUid,
        subjectUid: uid,
        subjectEmployeeId: employeeId,
        passwordChanged:
          "password" in command && command.password !== undefined,
        createdAt: FieldValue.serverTimestamp(),
      });
      tx.delete(lockRef);
    });
    return { uid, employeeId };
  } catch (error) {
    // A lost transaction response may mean success. Never disable a committed user.
    const committed = await auditRef.get().catch(() => null);
    if (
      committed?.exists &&
      committed.data()!.actorUid === actorUid &&
      committed.data()!.subjectUid === uid &&
      committed.data()!.action === `employee_${action}`
    )
      return { uid, employeeId: committed.data()!.subjectEmployeeId };
    if (accessPaused && committed !== null) {
      await auth.updateUser(uid, { disabled: true }).catch(() => undefined);
      if (action === "create") {
        // No profile was committed: remove only this request's provisional Auth account.
        const provisional = await profileRef.get().catch(() => null);
        if (provisional && !provisional.exists)
          await auth.deleteUser(uid).catch(() => undefined);
      }
    }
    if (error instanceof HttpsError) throw error;
    if (hasCode(error, "auth/email-already-exists"))
      throw new HttpsError(
        "already-exists",
        "Email sudah digunakan oleh akun lain.",
      );
    if (
      hasCode(error, "auth/invalid-password") ||
      hasCode(error, "auth/password-does-not-meet-requirements")
    ) {
      throw new HttpsError(
        "invalid-argument",
        "Kata sandi tidak memenuhi kebijakan akun.",
      );
    }
    throw new HttpsError(
      "unavailable",
      "Perubahan belum selesai. Coba simpan kembali; akun tetap nonaktif sampai proses selesai.",
    );
  } finally {
    await database
      .runTransaction(async (tx) => {
        const lock = await tx.get(lockRef);
        if (lock.data()?.owner === owner) tx.delete(lockRef);
      })
      .catch(() => undefined);
  }
}
