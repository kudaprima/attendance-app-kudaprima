import type {
  AttendanceCommand,
  AttendanceEventRecord,
  AttendanceSubmissionResult,
} from "@kuda-prima/contracts";
import { type Firestore, FieldValue } from "firebase-admin/firestore";
import { type Storage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";

import { evaluateAttendanceSchedule } from "./attendance-policy-service.js";
import {
  evaluateGeofence,
  type OfficeLocationData,
} from "./geofence-service.js";

export class AttendanceValidationError extends Error {}
export class AttendanceMockLocationError extends Error {}
export class AttendanceScheduleError extends Error {}

export interface EmployeeProfileSnapshot {
  readonly active: boolean;
  readonly authUid: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly role: "technician" | "supervisor" | "admin";
}

export async function submitAttendanceCommand(
  database: Firestore,
  storage: Storage,
  command: AttendanceCommand,
  userId: string,
): Promise<AttendanceSubmissionResult> {
  // 1. Mock location defense
  if (command.isMocked) {
    throw new AttendanceMockLocationError(
      "Presensi diblokir: lokasi mock terdeteksi pada perangkat.",
    );
  }

  // 2. Fetch and validate employee profile
  const profileDoc = await database.doc(`users/${userId}`).get();
  if (!profileDoc.exists) {
    throw new AttendanceValidationError("Profil karyawan tidak ditemukan.");
  }
  const profile = profileDoc.data() as EmployeeProfileSnapshot;
  if (!profile.active) {
    throw new AttendanceValidationError("Akun karyawan tidak aktif.");
  }

  // 3. Idempotency verification: check if this command was already processed
  const existingEventsSnapshot = await database
    .collection("attendanceEvents")
    .where("userId", "==", userId)
    .where("idempotencyKey", "==", command.idempotencyKey)
    .limit(1)
    .get();

  if (!existingEventsSnapshot.empty) {
    const existing =
      existingEventsSnapshot.docs[0].data() as AttendanceEventRecord;
    return {
      eventId: existing.eventId,
      eventType: existing.eventType,
      status: existing.status,
      requiresApproval: existing.requiresApproval,
      locationType: existing.locationType,
      distanceMeters: existing.distanceMeters,
      capturedAt: existing.capturedAt,
      message: "Presensi telah berhasil dicatat sebelumnya (idempoten).",
    };
  }

  // 4. Fetch primary office configuration
  const officeDoc = await database.doc("officeLocations/main").get();
  if (!officeDoc.exists) {
    throw new AttendanceValidationError(
      "Konfigurasi kantor utama tidak ditemukan.",
    );
  }
  const office = officeDoc.data() as OfficeLocationData;

  // 5. Evaluate geofence & server-side location classification
  const geofence = evaluateGeofence(
    office,
    command.latitude,
    command.longitude,
    command.accuracyMeters,
  );

  // Field attendance validation: note is mandatory
  if (
    geofence.locationType === "field" &&
    (!command.note || command.note.trim().length === 0)
  ) {
    throw new AttendanceValidationError(
      "Catatan kegiatan wajib diisi untuk presensi lapangan.",
    );
  }

  // 6. Schedule and timing validation
  const capturedDate = new Date(command.capturedAt);
  if (Number.isNaN(capturedDate.getTime())) {
    throw new AttendanceValidationError("Format waktu capturedAt tidak valid.");
  }

  const schedule = evaluateAttendanceSchedule(command.eventType, capturedDate);
  if (!schedule.isAllowed) {
    throw new AttendanceScheduleError(
      schedule.reason ?? "Presensi di luar jadwal operasional.",
    );
  }

  const eventId = randomUUID();
  const photoStoragePath = `attendance-selfies/${userId}/${eventId}.jpg`;

  // 7. Store selfie to Firebase Storage
  if (command.photoBase64) {
    const cleanBase64 = command.photoBase64.replace(
      /^data:image\/\w+;base64,/,
      "",
    );
    const photoBuffer = Buffer.from(cleanBase64, "base64");
    const bucket = storage.bucket();
    const file = bucket.file(photoStoragePath);

    await file.save(photoBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: {
          eventId,
          userId,
          capturedAt: command.capturedAt,
        },
      },
      resumable: false,
    });
  }

  // 8. Write immutable attendance event to Firestore
  const eventRecord: Omit<AttendanceEventRecord, "createdAt"> & {
    createdAt: FieldValue;
  } = {
    eventId,
    userId: profile.authUid,
    employeeId: profile.employeeId,
    fullName: profile.fullName,
    role: profile.role,
    eventType: command.eventType,
    capturedAt: command.capturedAt,
    latitude: command.latitude,
    longitude: command.longitude,
    accuracyMeters: command.accuracyMeters,
    locationType: geofence.locationType,
    distanceMeters: Math.round(geofence.distanceMeters * 10) / 10,
    officeId: geofence.isInsideOffice ? "main" : null,
    note: command.note?.trim() ?? null,
    lowAccuracy: geofence.lowAccuracy,
    isMocked: false,
    status: schedule.status,
    requiresApproval: schedule.requiresApproval,
    photoStoragePath,
    idempotencyKey: command.idempotencyKey,
    createdAt: FieldValue.serverTimestamp(),
  };

  const batch = database.batch();
  batch.set(database.doc(`attendanceEvents/${eventId}`), eventRecord);

  // 9. Append immutable audit log
  const auditId = randomUUID();
  batch.set(database.doc(`auditLogs/${auditId}`), {
    action: "attendance_submitted",
    actor: userId,
    details: {
      eventId,
      eventType: command.eventType,
      status: schedule.status,
      locationType: geofence.locationType,
      requiresApproval: schedule.requiresApproval,
    },
    timestamp: FieldValue.serverTimestamp(),
  });

  await batch.commit();

  return {
    eventId,
    eventType: command.eventType,
    status: schedule.status,
    requiresApproval: schedule.requiresApproval,
    locationType: geofence.locationType,
    distanceMeters: Math.round(geofence.distanceMeters * 10) / 10,
    capturedAt: command.capturedAt,
    message:
      schedule.status === "late"
        ? "Presensi masuk tercatat (terlambat, memerlukan persetujuan supervisor)."
        : schedule.status === "early_departure"
          ? "Presensi pulang tercatat (pulang awal, memerlukan persetujuan supervisor)."
          : "Presensi berhasil dicatat.",
  };
}
