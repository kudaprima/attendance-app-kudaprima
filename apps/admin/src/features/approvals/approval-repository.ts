import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
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
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  photoStoragePath?: string;
  photoUrl?: string;
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

function extractApprovalReasons(data: DocumentData): string[] {
  const reasons: string[] = Array.isArray(data.approvalReasons)
    ? [...data.approvalReasons]
    : [];
  if (reasons.length === 0) {
    if (data.status === "late") reasons.push("Terlambat");
    if (data.status === "early_departure") reasons.push("Pulang Lebih Awal");
    if (data.status === "non_working_day") reasons.push("Di Luar Hari Kerja");
    if (data.locationType === "field")
      reasons.push("Di Luar Lokasi (Lapangan)");
  }
  return reasons;
}

function parseApprovalStatus(
  rawStatus: unknown,
): "pending" | "approved" | "rejected" {
  if (rawStatus === "approved" || rawStatus === "rejected") {
    return rawStatus;
  }
  return "pending";
}

function mapDocToAttendanceApproval(
  snapshotDoc: QueryDocumentSnapshot<DocumentData>,
): AttendanceApprovalEntry {
  const data = snapshotDoc.data();
  const reasons = extractApprovalReasons(data);
  const approvalStatus = parseApprovalStatus(data.approvalStatus);

  return {
    id: snapshotDoc.id,
    eventId: typeof data.eventId === "string" ? data.eventId : snapshotDoc.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    employeeId:
      typeof data.employeeId === "string" ? data.employeeId : "KP-000000",
    fullName: typeof data.fullName === "string" ? data.fullName : "Karyawan",
    eventType:
      (data.eventType as AttendanceApprovalEntry["eventType"]) || "check_in",
    capturedAt: typeof data.capturedAt === "string" ? data.capturedAt : "",
    locationType:
      (data.locationType as AttendanceApprovalEntry["locationType"]) ||
      "office",
    distanceMeters:
      typeof data.distanceMeters === "number" ? data.distanceMeters : 0,
    status: (data.status as AttendanceApprovalEntry["status"]) || "normal",
    approvalReasons: reasons,
    approvalStatus,
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : null,
    approvedByName:
      typeof data.approvedByName === "string" ? data.approvedByName : null,
    approvedAt: typeof data.approvedAt === "string" ? data.approvedAt : null,
    approvalNotes:
      typeof data.approvalNotes === "string" ? data.approvalNotes : null,
    note: typeof data.note === "string" ? data.note : null,
    latitude: typeof data.latitude === "number" ? data.latitude : undefined,
    longitude: typeof data.longitude === "number" ? data.longitude : undefined,
    accuracyMeters:
      typeof data.accuracyMeters === "number" ? data.accuracyMeters : undefined,
    photoStoragePath:
      typeof data.photoStoragePath === "string"
        ? data.photoStoragePath
        : undefined,
    photoUrl: typeof data.photoUrl === "string" ? data.photoUrl : undefined,
  };
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
      const items = snapshot.docs.map(mapDocToAttendanceApproval);
      items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
      next(items);
    },
    error,
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

function mapDocToServiceRequest(
  snapshotDoc: QueryDocumentSnapshot<DocumentData>,
): ServiceRequestEntry {
  const data = snapshotDoc.data();
  const rawDate =
    typeof data.date === "string"
      ? data.date
      : typeof data.startDate === "string"
        ? data.startDate
        : "";

  return {
    id: snapshotDoc.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    employeeId: typeof data.employeeId === "string" ? data.employeeId : "",
    fullName: typeof data.fullName === "string" ? data.fullName : "",
    type: (data.type as ServiceRequestEntry["type"]) || "permission",
    date: rawDate,
    startDate: typeof data.startDate === "string" ? data.startDate : undefined,
    endDate: typeof data.endDate === "string" ? data.endDate : undefined,
    reason: typeof data.reason === "string" ? data.reason : "",
    status: (data.status as ServiceRequestEntry["status"]) || "pending",
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : null,
    approvedByName:
      typeof data.approvedByName === "string" ? data.approvedByName : null,
    approvedAt: typeof data.approvedAt === "string" ? data.approvedAt : null,
    adminNotes: typeof data.adminNotes === "string" ? data.adminNotes : null,
    durationOrDays:
      typeof data.durationOrDays === "string" ? data.durationOrDays : undefined,
    isOver8Hours:
      typeof data.isOver8Hours === "boolean" ? data.isOver8Hours : undefined,
  };
}

export function watchServiceRequests(
  next: (items: ServiceRequestEntry[]) => void,
  error: (err: Error) => void,
) {
  const q = collection(firestore, "serviceRequests");
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(mapDocToServiceRequest);
      items.sort((a, b) => b.date.localeCompare(a.date));
      next(items);
    },
    error,
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
