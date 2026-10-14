import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type {
  CreateEmployeeCommand,
  UpdateEmployeeCommand,
  DeleteEmployeeCommand,
  EmploymentStatus,
  UserRole,
} from "@kuda-prima/contracts";
import {
  auth,
  firestore,
  functions,
  useFirebaseEmulators,
} from "@/lib/firebase";

export interface EmployeeEntry {
  uid: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  jobTitle: string;
  employmentStatus: EmploymentStatus;
  employmentStartDate: string;
  active: boolean;
  revision: number;
  managementAction?: "create" | "update" | "delete";
}

export function watchEmployees(
  next: (employees: EmployeeEntry[]) => void,
  error: () => void,
) {
  return onSnapshot(
    query(collection(firestore, "users"), orderBy("employeeId")),
    (snapshot) => {
      next(
        snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            uid: docSnap.id,
            employeeId: data.employeeId,
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            jobTitle:
              typeof data.jobTitle === "string" ? data.jobTitle.trim() : "",
            employmentStatus: data.employmentStatus,
            employmentStartDate: data.employmentStartDate,
            active: data.active === true,
            revision: data.revision ?? 0,
            managementAction: data.managementAction,
          };
        }),
      );
    },
    error,
  );
}

function makeFunctionError(code: string, message: string): Error & { code: string } {
  const err = new Error(message) as Error & { code: string };
  err.code = code;
  return err;
}

export async function createEmployee(command: CreateEmployeeCommand) {
  if (useFirebaseEmulators) {
    return httpsCallable(functions, "createEmployee")(command);
  }

  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw makeFunctionError("functions/unauthenticated", "Sesi berakhir.");
  }

  const normalizedEmail = command.email.trim().toLowerCase();
  const secondaryApp = initializeApp(
    auth.app.options,
    `spark-create-emp-${Date.now()}`,
  );
  const secondaryAuth = getAuth(secondaryApp);

  let createdUid = "";
  try {
    try {
      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        normalizedEmail,
        command.password,
      );
      createdUid = credential.user.uid;
      await updateProfile(credential.user, {
        displayName: command.fullName.trim(),
      });
    } catch (err) {
      const authCode = (err as { code?: string })?.code ?? "";
      const errMessage = (err as { message?: string })?.message ?? "";
      if (
        authCode === "auth/email-already-in-use" ||
        errMessage.includes("EMAIL_EXISTS")
      ) {
        try {
          const recoveredCred = await signInWithEmailAndPassword(
            secondaryAuth,
            normalizedEmail,
            command.password,
          );
          createdUid = recoveredCred.user.uid;
          await updateProfile(recoveredCred.user, {
            displayName: command.fullName.trim(),
          });
        } catch {
          throw makeFunctionError(
            "functions/already-exists",
            "Email sudah terdaftar.",
          );
        }
      } else {
        throw makeFunctionError(
          "functions/invalid-argument",
          "Periksa email dan kata sandi minimal 8 karakter.",
        );
      }
    }
    await signOut(secondaryAuth);
  } finally {
    await deleteApp(secondaryApp).catch(() => undefined);
  }

  const employeeId = await runTransaction(firestore, async (tx) => {
    const userRef = doc(firestore, "users", createdUid);
    const existingUserSnap = await tx.get(userRef);
    if (existingUserSnap.exists()) {
      throw makeFunctionError(
        "functions/already-exists",
        "Email sudah terdaftar.",
      );
    }

    const counterRef = doc(firestore, "systemCounters", "employeeId");
    const counterSnap = await tx.get(counterRef);
    const nextSeq = counterSnap.exists()
      ? Number(counterSnap.data()?.nextSequence ?? 1)
      : 1;
    const formattedId = `KP-${String(nextSeq).padStart(6, "0")}`;

    tx.set(
      counterRef,
      {
        nextSequence: nextSeq + 1,
        updatedAt: serverTimestamp(),
        updatedBy: adminUser.uid,
      },
      { merge: true },
    );

    tx.set(userRef, {
      authUid: createdUid,
      employeeId: formattedId,
      fullName: command.fullName.trim(),
      email: normalizedEmail,
      role: command.role,
      jobTitle: command.jobTitle.trim() || "Teknisi Operasional",
      employmentStatus: command.employmentStatus,
      employmentStartDate: command.employmentStartDate,
      active: command.active,
      revision: 1,
      phone: null,
      birthDate: null,
      gender: null,
      homeAddress: null,
      createdAt: serverTimestamp(),
      createdBy: adminUser.uid,
      updatedAt: serverTimestamp(),
      updatedBy: adminUser.uid,
    });

    const auditRef = doc(collection(firestore, "auditLogs"));
    tx.set(auditRef, {
      action: "employee_created",
      actorUid: adminUser.uid,
      targetUid: createdUid,
      employeeId: formattedId,
      role: command.role,
      createdAt: serverTimestamp(),
    });

    return formattedId;
  });

  return { data: { uid: createdUid, employeeId } };
}

export async function updateEmployee(command: UpdateEmployeeCommand) {
  if (useFirebaseEmulators) {
    return httpsCallable(functions, "updateEmployee")(command);
  }

  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw makeFunctionError("functions/unauthenticated", "Sesi berakhir.");
  }

  if (
    command.uid === adminUser.uid &&
    (command.role !== "admin" || !command.active)
  ) {
    throw makeFunctionError(
      "functions/failed-precondition",
      "Akun sendiri tidak dapat diturunkan atau dinonaktifkan.",
    );
  }

  await runTransaction(firestore, async (tx) => {
    const userRef = doc(firestore, "users", command.uid);
    const snap = await tx.get(userRef);
    if (!snap.exists()) {
      throw makeFunctionError(
        "functions/not-found",
        "Karyawan tidak ditemukan.",
      );
    }

    const current = snap.data();
    const currentRevision = Number(current?.revision ?? 0);
    if (currentRevision !== command.expectedRevision) {
      throw makeFunctionError(
        "functions/aborted",
        "Data telah berubah. Muat ulang form.",
      );
    }

    tx.update(userRef, {
      fullName: command.fullName.trim(),
      email: command.email.trim().toLowerCase(),
      role: command.role,
      jobTitle: command.jobTitle.trim(),
      employmentStatus: command.employmentStatus,
      active: command.active,
      revision: currentRevision + 1,
      updatedAt: serverTimestamp(),
      updatedBy: adminUser.uid,
    });

    const auditRef = doc(collection(firestore, "auditLogs"));
    tx.set(auditRef, {
      action: "employee_updated",
      actorUid: adminUser.uid,
      targetUid: command.uid,
      role: command.role,
      active: command.active,
      createdAt: serverTimestamp(),
    });
  });

  return { data: { uid: command.uid } };
}

export async function deleteEmployee(command: DeleteEmployeeCommand) {
  if (useFirebaseEmulators) {
    return httpsCallable(functions, "deleteEmployee")(command);
  }

  const adminUser = auth.currentUser;
  if (!adminUser) {
    throw makeFunctionError("functions/unauthenticated", "Sesi berakhir.");
  }

  if (command.uid === adminUser.uid) {
    throw makeFunctionError(
      "functions/failed-precondition",
      "Akun sendiri tidak dapat dihapus.",
    );
  }

  const activeAdminsSnap = await getDocs(
    query(
      collection(firestore, "users"),
      where("role", "==", "admin"),
      where("active", "==", true),
    ),
  );
  const targetRef = doc(firestore, "users", command.uid);

  await runTransaction(firestore, async (tx) => {
    const snap = await tx.get(targetRef);
    if (!snap.exists()) {
      throw makeFunctionError(
        "functions/not-found",
        "Karyawan tidak ditemukan.",
      );
    }
    const data = snap.data();
    if (
      data?.role === "admin" &&
      data?.active === true &&
      activeAdminsSnap.size <= 2
    ) {
      throw makeFunctionError(
        "functions/failed-precondition",
        "Harus tersisa minimal dua Admin aktif.",
      );
    }

    tx.delete(targetRef);

    const auditRef = doc(collection(firestore, "auditLogs"));
    tx.set(auditRef, {
      action: "employee_deleted",
      actorUid: adminUser.uid,
      targetUid: command.uid,
      employeeId: data?.employeeId ?? "",
      createdAt: serverTimestamp(),
    });
  });

  return { data: { uid: command.uid } };
}

export function employeeErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "functions/already-exists")
    return "Email atau permintaan sudah terdaftar. Periksa kembali daftar karyawan.";
  if (code === "functions/permission-denied")
    return "Hanya Admin aktif yang dapat mengelola karyawan.";
  if (code === "functions/unauthenticated")
    return "Sesi berakhir. Silakan masuk kembali.";
  if (code === "functions/aborted")
    return "Data sedang diproses atau telah berubah. Coba kembali; bila masih gagal, tutup lalu buka form.";
  if (code === "functions/not-found")
    return "Karyawan tidak ditemukan. Muat ulang daftar.";
  if (code === "functions/invalid-argument")
    return "Periksa alamat email, Hak Akses, Jabatan, kata sandi minimal 8 karakter, dan kolom wajib.";
  if (code === "functions/failed-precondition")
    return "Operasi tidak dapat dilakukan. Selesaikan perubahan tertunda; akun sendiri tidak dapat diturunkan, dinonaktifkan, atau dihapus dan harus tersisa minimal dua Admin aktif.";
  return "Perubahan belum terkonfirmasi. Periksa koneksi lalu coba kembali.";
}
