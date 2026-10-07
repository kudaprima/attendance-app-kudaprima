import {
  processAttendanceApprovalCommandSchema,
  type ProcessAttendanceApprovalCommand,
} from "@kuda-prima/contracts";
import { type Firestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { randomUUID } from "node:crypto";

export interface ApprovalCallableRequest {
  readonly auth?: {
    readonly uid: string;
    readonly token: Record<string, unknown>;
  };
  readonly data: unknown;
}

export async function processAttendanceApproval(
  database: Firestore,
  command: ProcessAttendanceApprovalCommand,
  adminUid: string,
): Promise<{ success: true; eventId: string; status: "approved" | "rejected" }> {
  // Verify that the caller is an active Admin
  const adminDoc = await database.doc(`users/${adminUid}`).get();
  const adminData = adminDoc.data();
  if (!adminDoc.exists || !adminData?.active || adminData?.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Hanya Administrator aktif yang berwenang memproses persetujuan presensi.",
    );
  }

  const eventRef = database.doc(`attendanceEvents/${command.eventId}`);
  const eventDoc = await eventRef.get();
  if (!eventDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Data presensi yang diminta tidak ditemukan.",
    );
  }

  const eventData = eventDoc.data()!;

  // Cross-Approval Invariant: Admin cannot approve/reject their own attendance
  if (eventData.userId === adminUid) {
    throw new HttpsError(
      "permission-denied",
      "Aturan Cross-Approval: Administrator dilarang menyetujui atau menolak presensinya sendiri.",
    );
  }

  const nowIso = new Date().toISOString();
  const approvalAuditId = `approval-${command.eventId}-${randomUUID()}`;

  await database.runTransaction(async (transaction) => {
    transaction.update(eventRef, {
      approvalStatus: command.status,
      approvedBy: adminUid,
      approvedByName: adminData.fullName ?? "Administrator",
      approvedAt: nowIso,
      approvalNotes: command.notes?.trim() ?? null,
    });

    transaction.create(database.doc(`auditLogs/${approvalAuditId}`), {
      action:
        command.status === "approved"
          ? "attendance_approved"
          : "attendance_rejected",
      actor: adminUid,
      actorName: adminData.fullName ?? "Administrator",
      targetUserId: eventData.userId,
      eventId: command.eventId,
      status: command.status,
      notes: command.notes?.trim() ?? null,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    eventId: command.eventId,
    status: command.status,
  };
}

export async function handleProcessAttendanceApproval(
  request: ApprovalCallableRequest,
  database: Firestore,
) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autentikasi diperlukan.");
  }

  if (request.auth.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Hanya Administrator yang memiliki hak akses persetujuan presensi.",
    );
  }

  const parseResult = processAttendanceApprovalCommandSchema.safeParse(
    request.data,
  );
  if (!parseResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Data persetujuan tidak valid: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return processAttendanceApproval(database, parseResult.data, request.auth.uid);
}
