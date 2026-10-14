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
import { createHash, randomUUID } from "node:crypto";
import { assertActiveAdmin, requireTwoOtherAdmins, withAccessManagementLock } from "./access-management.js";

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
  if (!request.auth) throw new HttpsError("unauthenticated", "Silakan masuk kembali.");
  return withAccessManagementLock(database, () => manageEmployeeLocked(database, auth, action, request));
}

async function manageEmployeeLocked(
  database: Firestore,
  auth: Auth,
  action: Action,
  request: EmployeeManagementRequest,
): Promise<EmployeeManagementResult> {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Silakan masuk kembali.");
  const actorUid = request.auth.uid;
  await assertActiveAdmin(database, auth, request.auth);
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
      "Data tidak valid. Periksa alamat email, Hak Akses, Jabatan, kata sandi, dan kolom wajib.",
    );
  const command: Command = parsed.data;
  const uid = "uid" in command ? command.uid : `employee-${command.requestId}`;
  if (
    uid === actorUid &&
    (action === "delete" || ("active" in command && !command.active) || ("role" in command && command.role !== "admin"))
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Akun sendiri tidak dapat diturunkan hak aksesnya, dinonaktifkan, atau dihapus.",
    );
  }
  const profileRef = database.doc(`users/${uid}`);
  const auditRef = database.doc(`auditLogs/employee-${command.requestId}`);
  const lockRef = database.doc(`employeeManagementLocks/${uid}`);
  const owner = randomUUID();
  const fingerprint = createHash("sha256").update(JSON.stringify(
    Object.fromEntries(Object.entries(command).filter(([key]) => key !== "password").sort(([a], [b]) => a.localeCompare(b)))
  )).digest("hex");
  const requestRef = database.doc(`employeeManagementRequests/${command.requestId}`);
  const prior = await database.runTransaction(async (tx) => {
    const audit = await tx.get(auditRef);
    if (audit.exists) {
      const data = audit.data()!;
      if (
        data.actorUid !== actorUid ||
        data.subjectUid !== uid ||
        data.action !== `employee_${action}` || data.commandFingerprint !== fingerprint
      ) {
        throw new HttpsError(
          "already-exists",
          "ID permintaan telah digunakan.",
        );
      }
      return { uid, employeeId: data.subjectEmployeeId as string };
    }
    const savedRequest = await tx.get(requestRef);
    if (savedRequest.exists && (savedRequest.get("fingerprint") !== fingerprint || savedRequest.get("actorUid") !== actorUid || savedRequest.get("uid") !== uid || savedRequest.get("action") !== action)) {
      throw new HttpsError("already-exists", "ID permintaan telah digunakan dengan data berbeda.");
    }
    const lock = await tx.get(lockRef);
    if (lock.exists && lock.data()!.expiresAt > Date.now()) {
      throw new HttpsError(
        "aborted",
        "Karyawan sedang diproses. Tunggu lalu coba kembali.",
      );
    }
    if (!savedRequest.exists) tx.create(requestRef, { fingerprint, actorUid, uid, action, createdAt: FieldValue.serverTimestamp() });
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
    if (profile?.role === "admin" && (action === "delete" || ("role" in command && (command.role !== "admin" || !command.active)))) {
      await requireTwoOtherAdmins(database, auth, uid);
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
          profile.managementRequestId !== create.requestId ||
          profile.role !== create.role)
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
            role: create.role,
            jobTitle: create.jobTitle,
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
      await auth.setCustomUserClaims(uid, { role: create.role });
    } else {
      // First revoke access in rules, then change the Auth identity. On a partial
      // failure the row remains visible and inactive so a manager can retry safely.
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
      await auth.setCustomUserClaims(uid, { ...current.customClaims, role: edit.role });
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
          role: edit.role,
          jobTitle: edit.jobTitle,
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
        commandFingerprint: fingerprint,
        previousRole: action === "create" ? null : profile!.role,
        newRole: "role" in command ? command.role : null,
        jobTitleChanged: "jobTitle" in command && command.jobTitle !== profile!.jobTitle,
        changedFields: action === "delete" ? ["deleted"] : Object.entries(command).filter(([key, value]) => !["password", "requestId", "uid", "expectedRevision"].includes(key) && profile![key] !== value).map(([key]) => key),
        revision: (profile!.revision ?? 0) + 1,
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
      committed.data()!.action === `employee_${action}` && committed.data()!.commandFingerprint === fingerprint
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
