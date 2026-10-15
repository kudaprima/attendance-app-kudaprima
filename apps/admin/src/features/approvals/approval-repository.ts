import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import {
  auth,
  firestore,
  functions,
  useFirebaseEmulators,
} from "@/lib/firebase";
import type {
  ProcessAttendanceApprovalCommand,
  ProcessServiceApprovalCommand,
} from "@kuda-prima/contracts";

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
  jobTitle?: string;
  type: "overtime" | "annual_leave" | "sick_leave" | "permission";
  date: string;
  startDate?: string;
  endDate?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  clientOrLocation?: string | null;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  adminNotes?: string | null;
  workingDaysCount?: number;
  durationMinutes?: number | null;
  durationOrDays?: string;
  isOver8Hours?: boolean;
  selfieStoragePath?: string | null;
  attachmentStoragePath?: string | null;
  createdAt?: string;
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
  if (useFirebaseEmulators) {
    const callable = httpsCallable<
      ProcessAttendanceApprovalCommand,
      { success: boolean }
    >(functions, "processAttendanceApproval");
    return callable(command);
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }

  await runTransaction(firestore, async (tx) => {
    const adminRef = doc(firestore, "users", currentUser.uid);
    const eventRef = doc(firestore, "attendanceEvents", command.eventId);
    const [adminSnap, eventSnap] = await Promise.all([
      tx.get(adminRef),
      tx.get(eventRef),
    ]);

    const adminData = adminSnap.data();
    if (!adminSnap.exists() || adminData?.active !== true || adminData?.role !== "admin") {
      throw new Error("Hanya Admin aktif yang dapat memproses persetujuan.");
    }
    if (!eventSnap.exists()) {
      throw new Error("Data presensi tidak ditemukan.");
    }
    const eventData = eventSnap.data();
    if (eventData?.userId === currentUser.uid) {
      throw new Error("Cross-approval: Admin tidak dapat menyetujui presensi milik sendiri.");
    }

    const nowIso = new Date().toISOString();
    const adminName =
      typeof adminData.fullName === "string" ? adminData.fullName : "Administrator";

    tx.update(eventRef, {
      approvalStatus: command.status,
      approvedBy: currentUser.uid,
      approvedByName: adminName,
      approvedAt: nowIso,
      approvalNotes: command.notes?.trim() || null,
      updatedAt: nowIso,
    });

    const auditRef = doc(collection(firestore, "auditLogs"));
    tx.set(auditRef, {
      action:
        command.status === "approved"
          ? "attendance_approved"
          : "attendance_rejected",
      actorUid: currentUser.uid,
      actorName: adminName,
      targetEventId: command.eventId,
      targetUserId: eventData?.userId ?? "",
      notes: command.notes?.trim() || null,
      createdAt: serverTimestamp(),
    });
  });

  return { data: { success: true } };
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
    jobTitle: typeof data.jobTitle === "string" ? data.jobTitle : undefined,
    type: (data.type as ServiceRequestEntry["type"]) || "permission",
    date: rawDate,
    startDate: typeof data.startDate === "string" ? data.startDate : undefined,
    endDate: typeof data.endDate === "string" ? data.endDate : undefined,
    startedAt: typeof data.startedAt === "string" ? data.startedAt : null,
    endedAt: typeof data.endedAt === "string" ? data.endedAt : null,
    clientOrLocation:
      typeof data.clientOrLocation === "string" ? data.clientOrLocation : null,
    reason: typeof data.reason === "string" ? data.reason : "",
    status: (data.status as ServiceRequestEntry["status"]) || "pending",
    approvedBy: typeof data.approvedBy === "string" ? data.approvedBy : null,
    approvedByName:
      typeof data.approvedByName === "string" ? data.approvedByName : null,
    approvedAt: typeof data.approvedAt === "string" ? data.approvedAt : null,
    adminNotes: typeof data.adminNotes === "string" ? data.adminNotes : null,
    workingDaysCount:
      typeof data.workingDaysCount === "number"
        ? data.workingDaysCount
        : undefined,
    durationMinutes:
      typeof data.durationMinutes === "number" ? data.durationMinutes : null,
    durationOrDays:
      typeof data.durationOrDays === "string" ? data.durationOrDays : undefined,
    isOver8Hours:
      typeof data.isOver8Hours === "boolean" ? data.isOver8Hours : undefined,
    selfieStoragePath:
      typeof data.selfieStoragePath === "string"
        ? data.selfieStoragePath
        : null,
    attachmentStoragePath:
      typeof data.attachmentStoragePath === "string"
        ? data.attachmentStoragePath
        : null,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : undefined,
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

export async function submitServiceApproval(
  command: ProcessServiceApprovalCommand,
) {
  if (useFirebaseEmulators) {
    const callable = httpsCallable<
      ProcessServiceApprovalCommand,
      { success: boolean; requestId: string; status: "approved" | "rejected" }
    >(functions, "processServiceApproval");
    return callable(command);
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Sesi berakhir. Silakan masuk kembali.");
  }

  await runTransaction(firestore, async (tx) => {
    const adminRef = doc(firestore, "users", currentUser.uid);
    const reqRef = doc(firestore, "serviceRequests", command.requestId);
    const [adminSnap, reqSnap] = await Promise.all([
      tx.get(adminRef),
      tx.get(reqRef),
    ]);

    const adminData = adminSnap.data();
    if (!adminSnap.exists() || adminData?.active !== true || adminData?.role !== "admin") {
      throw new Error("Hanya Admin aktif yang dapat memproses persetujuan.");
    }
    if (!reqSnap.exists()) {
      throw new Error("Pengajuan layanan tidak ditemukan.");
    }
    const reqData = reqSnap.data();
    if (reqData?.userId === currentUser.uid) {
      throw new Error("Cross-approval: Admin tidak dapat menyetujui pengajuan milik sendiri.");
    }

    const nowIso = new Date().toISOString();
    const adminName =
      typeof adminData.fullName === "string" ? adminData.fullName : "Administrator";

    tx.update(reqRef, {
      status: command.status,
      approvedBy: currentUser.uid,
      approvedByName: adminName,
      approvedAt: nowIso,
      adminNotes: command.notes?.trim() || null,
      updatedAt: nowIso,
    });

    const auditRef = doc(collection(firestore, "auditLogs"));
    tx.set(auditRef, {
      action:
        command.status === "approved"
          ? "service_request_approved"
          : "service_request_rejected",
      actorUid: currentUser.uid,
      actorName: adminName,
      targetRequestId: command.requestId,
      targetUserId: reqData?.userId ?? "",
      notes: command.notes?.trim() || null,
      createdAt: serverTimestamp(),
    });
  });

  return {
    data: {
      success: true,
      requestId: command.requestId,
      status: command.status,
    },
  };
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: "approved" | "rejected",
  _adminUid: string,
  _adminName: string,
  adminNotes?: string,
) {
  return submitServiceApproval({
    requestId,
    status,
    notes: adminNotes,
  });
}
