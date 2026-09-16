import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { firestore, functions } from "@/lib/firebase";
import type { ProcessAttendanceApprovalCommand } from "@kuda-prima/contracts";

export interface AttendanceApprovalEntry {
  id: string;
  eventId: string;
  userId: string;
  employeeId: string;
  fullName: string;
  eventType: "check_in" | "check_out";
  capturedAt: string;
  locationType: "office" | "field";
  distanceMeters: number;
  status: "normal" | "late" | "early_departure" | "non_working_day";
  approvalReasons: string[];
  approvalStatus: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
  note?: string | null;
}

export interface ServiceRequestEntry {
  id: string;
  userId: string;
  employeeId: string;
  fullName: string;
  type: "overtime" | "annual_leave" | "sick_leave" | "permission";
  date: string;
  startDate?: string;
  endDate?: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  adminNotes?: string | null;
  durationOrDays?: string;
  isOver8Hours?: boolean;
}

export function watchAttendanceApprovals(
  next: (items: AttendanceApprovalEntry[]) => void,
  error: (err: Error) => void,
) {
  const q = query(
    collection(firestore, "attendanceEvents"),
    where("requiresApproval", "==", true),
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: AttendanceApprovalEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        const reasons: string[] = Array.isArray(data.approvalReasons)
          ? data.approvalReasons
          : [];
        if (reasons.length === 0) {
          if (data.status === "late") reasons.push("Terlambat");
          if (data.status === "early_departure") reasons.push("Pulang Lebih Awal");
          if (data.status === "non_working_day") reasons.push("Di Luar Hari Kerja");
          if (data.locationType === "field") reasons.push("Di Luar Lokasi (Lapangan)");
        }

        const rawStatus = data.approvalStatus;
        const approvalStatus: "pending" | "approved" | "rejected" =
          rawStatus === "approved" || rawStatus === "rejected"
            ? rawStatus
            : "pending";

        return {
          id: doc.id,
          eventId: data.eventId || doc.id,
          userId: data.userId || "",
          employeeId: data.employeeId || "KP-000000",
          fullName: data.fullName || "Karyawan",
          eventType: data.eventType || "check_in",
          capturedAt: data.capturedAt || "",
          locationType: data.locationType || "office",
          distanceMeters: data.distanceMeters ?? 0,
          status: data.status || "normal",
          approvalReasons: reasons,
          approvalStatus,
          approvedBy: data.approvedBy ?? null,
          approvedByName: data.approvedByName ?? null,
          approvedAt: data.approvedAt ?? null,
          approvalNotes: data.approvalNotes ?? null,
          note: data.note ?? null,
        };
      });

      // Sort descending by capturedAt
      items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
      next(items);
    },
    (err) => error(err),
  );
}

export async function submitAttendanceApproval(
  command: ProcessAttendanceApprovalCommand,
) {
  const callable = httpsCallable<
    ProcessAttendanceApprovalCommand,
    { success: boolean }
  >(functions, "processAttendanceApproval");
  return callable(command);
}

export function watchServiceRequests(
  next: (items: ServiceRequestEntry[]) => void,
  error: (err: Error) => void,
) {
  const q = collection(firestore, "serviceRequests");
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ServiceRequestEntry[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || "",
          employeeId: data.employeeId || "",
          fullName: data.fullName || "",
          type: data.type || "permission",
          date: data.date || data.startDate || "",
          startDate: data.startDate,
          endDate: data.endDate,
          reason: data.reason || "",
          status: data.status || "pending",
          approvedBy: data.approvedBy,
          approvedByName: data.approvedByName,
          approvedAt: data.approvedAt,
          adminNotes: data.adminNotes,
          durationOrDays: data.durationOrDays,
          isOver8Hours: data.isOver8Hours,
        };
      });
      items.sort((a, b) => b.date.localeCompare(a.date));
      next(items);
    },
    (err) => error(err),
  );
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
  adminUid: string,
  adminName: string,
  adminNotes?: string,
) {
  const ref = doc(firestore, "serviceRequests", requestId);
  await updateDoc(ref, {
    status,
    approvedBy: adminUid,
    approvedByName: adminName,
    approvedAt: new Date().toISOString(),
    adminNotes: adminNotes ?? null,
  });
}
