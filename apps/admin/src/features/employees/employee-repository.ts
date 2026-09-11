import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import type {
  CreateEmployeeCommand,
  UpdateEmployeeCommand,
  DeleteEmployeeCommand,
  EmploymentStatus,
  UserRole,
} from "@kuda-prima/contracts";
import { firestore, functions } from "@/lib/firebase";

export interface EmployeeEntry {
  uid: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
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
        snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            uid: doc.id,
            employeeId: data.employeeId,
            fullName: data.fullName,
            email: data.email,
            role: data.role,
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
export const createEmployee = (command: CreateEmployeeCommand) =>
  httpsCallable(functions, "createEmployee")(command);
export const updateEmployee = (command: UpdateEmployeeCommand) =>
  httpsCallable(functions, "updateEmployee")(command);
export const deleteEmployee = (command: DeleteEmployeeCommand) =>
  httpsCallable(functions, "deleteEmployee")(command);

export function employeeErrorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "functions/already-exists")
    return "Email atau permintaan sudah terdaftar. Periksa kembali daftar karyawan.";
  if (code === "functions/permission-denied")
    return "Hanya admin aktif yang dapat mengelola karyawan.";
  if (code === "functions/unauthenticated")
    return "Sesi berakhir. Silakan masuk kembali.";
  if (code === "functions/aborted")
    return "Data sedang diproses atau telah berubah. Coba kembali; bila masih gagal, tutup lalu buka form.";
  if (code === "functions/not-found")
    return "Karyawan tidak ditemukan. Muat ulang daftar.";
  if (code === "functions/invalid-argument")
    return "Periksa alamat Gmail, kata sandi minimal 8 karakter, dan kolom wajib.";
  if (code === "functions/failed-precondition")
    return "Operasi tidak dapat dilakukan. Selesaikan perubahan tertunda; akun admin sendiri tidak dapat dinonaktifkan atau dihapus.";
  return "Perubahan belum terkonfirmasi. Periksa koneksi lalu coba kembali.";
}
