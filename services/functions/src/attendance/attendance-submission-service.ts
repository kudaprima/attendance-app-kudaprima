import type {
  AttendanceCommand,
  AttendanceEventRecord,
  AttendanceSubmissionResult,
} from "@kuda-prima/contracts";
import { type Firestore, FieldValue } from "firebase-admin/firestore";
import { type Storage } from "firebase-admin/storage";
import { createHash, randomUUID } from "node:crypto";
import jpeg from "jpeg-js";
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
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const dayWib = (date: Date) =>
  new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
const resultOf = (
  event: AttendanceEventRecord,
): AttendanceSubmissionResult => ({
  eventId: event.eventId,
  eventType: event.eventType,
  status: event.status,
  requiresApproval: event.requiresApproval,
  locationType: event.locationType,
  distanceMeters: event.distanceMeters,
  capturedAt: event.capturedAt,
  message: event.requiresApproval
    ? "Absen tercatat dan memerlukan persetujuan supervisor/admin."
    : "Absen berhasil dicatat.",
});

export async function submitAttendanceCommand(
  database: Firestore,
  storage: Storage,
  command: AttendanceCommand,
  userId: string,
  now: Date = new Date(),
  actorRole?: string,
): Promise<AttendanceSubmissionResult> {
  if (command.isMocked)
    throw new AttendanceMockLocationError(
      "Presensi diblokir: lokasi mock terdeteksi pada perangkat.",
    );
  if (!["check_in", "check_out"].includes(command.eventType)) {
    throw new AttendanceScheduleError("Pencatatan lembur belum tersedia.");
  }
  const profileRef = database.doc(`users/${userId}`);
  const checkProfile = (profile: EmployeeProfileSnapshot | undefined) => {
    if (
      !profile ||
      !profile.active ||
      profile.authUid !== userId ||
      (actorRole !== undefined && actorRole !== profile.role) ||
      !["technician", "supervisor", "admin"].includes(profile.role)
    ) {
      throw new AttendanceValidationError(
        "Profil karyawan tidak tersedia atau akun tidak aktif.",
      );
    }
    return profile;
  };
  checkProfile(
    (await profileRef.get()).data() as EmployeeProfileSnapshot | undefined,
  );
  const captured = new Date(command.capturedAt);
  if (Number.isNaN(captured.getTime()))
    throw new AttendanceValidationError("Format waktu capturedAt tidak valid.");
  const normalized = { ...command, capturedAt: captured.toISOString() };
  const payloadHash = hash(JSON.stringify(normalized));
  const eventId = hash(`${userId}:${command.idempotencyKey}`);
  const eventRef = database.doc(`attendanceEvents/${eventId}`);
  const checkReplay = (data: FirebaseFirestore.DocumentData) => {
    if (data.payloadHash && data.payloadHash !== payloadHash)
      throw new AttendanceValidationError(
        "Idempotency key sudah digunakan untuk data berbeda.",
      );
    return resultOf(data as AttendanceEventRecord);
  };
  const existing = await eventRef.get();
  if (existing.exists) return checkReplay(existing.data()!);
  const age = now.getTime() - captured.getTime();
  if (age > 12 * 3600000 || age < -5 * 60000) {
    throw new AttendanceValidationError(
      "Waktu absen harus dalam 12 jam terakhir dan tidak lebih dari 5 menit di masa depan.",
    );
  }
  const schedule = evaluateAttendanceSchedule(command.eventType, captured);
  if (!schedule.isAllowed)
    throw new AttendanceScheduleError(
      schedule.reason ?? "Di luar jadwal presensi.",
    );
  const cleanBase64 = command.photoBase64.replace(
    /^data:image\/jpeg;base64,/,
    "",
  );
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64))
    throw new AttendanceValidationError("Selfie harus berupa JPEG yang valid.");
  const photo = Buffer.from(cleanBase64, "base64");
  try {
    const decoded = jpeg.decode(photo, {
      maxResolutionInMP: 12,
      maxMemoryUsageInMB: 64,
      tolerantDecoding: false,
    });
    if (decoded.width < 32 || decoded.height < 32)
      throw new Error("Image too small");
  } catch {
    throw new AttendanceValidationError(
      "Selfie tidak valid. Ambil foto ulang menggunakan kamera.",
    );
  }
  const officeRef = database.doc("officeLocations/main");
  const day = dayWib(captured);
  const stateRef = database.doc(`attendanceDays/${hash(`${userId}:${day}`)}`);
  // A unique upload per attempt means cleanup can never delete another request's selfie.
  const photoStoragePath = `attendance-selfies/${userId}/${eventId}-${randomUUID()}.jpg`;
  const file = storage.bucket().file(photoStoragePath);
  const cleanupUnusedPhoto = async () => {
    // A timeout may mean the transaction committed. Read before deleting; on an
    // unavailable database retain the object for future retention reconciliation.
    try {
      const recorded = await eventRef.get();
      if (recorded.data()?.photoStoragePath !== photoStoragePath)
        await file.delete({ ignoreNotFound: true });
    } catch {
      console.warn("Attendance upload cleanup deferred", { eventId });
    }
  };
  try {
    await file.save(photo, {
      resumable: false,
      metadata: {
        contentType: "image/jpeg",
        metadata: { eventId, userId, capturedAt: normalized.capturedAt },
      },
    });
    const result = await database.runTransaction(async (transaction) => {
      const profile = checkProfile(
        (await transaction.get(profileRef)).data() as
          EmployeeProfileSnapshot | undefined,
      );
      const replay = await transaction.get(eventRef);
      if (replay.exists) return checkReplay(replay.data()!);
      const office = (await transaction.get(officeRef)).data() as
        OfficeLocationData | undefined;
      if (
        !office?.active ||
        office.radiusMeters <= 0 ||
        office.radiusMeters > 100
      ) {
        throw new AttendanceValidationError(
          "Konfigurasi kantor utama tidak valid atau tidak aktif.",
        );
      }
      const geofence = evaluateGeofence(
        office,
        command.latitude,
        command.longitude,
        command.accuracyMeters,
      );
      if (
        geofence.locationType === "field" &&
        (command.note?.trim().length ?? 0) < 3
      ) {
        throw new AttendanceValidationError(
          "Catatan kegiatan wajib diisi untuk presensi lapangan (minimal 3 karakter).",
        );
      }
      const state = await transaction.get(stateRef);
      let lastType = state.data()?.lastEventType as string | undefined;
      let lastCaptured = state.data()?.capturedAt as string | undefined;
      if (!state.exists) {
        // Migrate daily state lazily without rewriting historical immutable events.
        const legacy = await transaction.get(
          database.collection("attendanceEvents").where("userId", "==", userId),
        );
        const prior = legacy.docs
          .map((doc) => doc.data())
          .filter((event) => {
            const time = new Date(event.capturedAt);
            return !Number.isNaN(time.getTime()) && dayWib(time) === day;
          })
          .sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt));
        const replayLegacy = prior.find(
          (event) => event.idempotencyKey === command.idempotencyKey,
        );
        if (replayLegacy) return checkReplay(replayLegacy);
        lastType = prior[0]?.eventType;
        lastCaptured = prior[0]?.capturedAt;
      }
      if (
        (command.eventType === "check_in" && lastType) ||
        (command.eventType === "check_out" && lastType !== "check_in")
      ) {
        throw new AttendanceScheduleError(
          "Urutan absen tidak valid. Satu Absen Masuk dan Absen Keluar diperbolehkan per hari WIB.",
        );
      }
      if (lastCaptured && captured.getTime() <= Date.parse(lastCaptured)) {
        throw new AttendanceScheduleError(
          "Absen Keluar harus dilakukan setelah Absen Masuk.",
        );
      }
      const event = {
        eventId,
        userId,
        employeeId: profile.employeeId,
        fullName: profile.fullName,
        role: profile.role,
        eventType: command.eventType,
        capturedAt: normalized.capturedAt,
        latitude: command.latitude,
        longitude: command.longitude,
        accuracyMeters: command.accuracyMeters,
        locationType: geofence.locationType,
        distanceMeters: Math.round(geofence.distanceMeters * 10) / 10,
        officeId: geofence.locationType === "office" ? "main" : null,
        note: command.note?.trim() ?? null,
        lowAccuracy: geofence.lowAccuracy,
        isMocked: false,
        status: schedule.status,
        requiresApproval: schedule.requiresApproval,
        photoStoragePath,
        idempotencyKey: command.idempotencyKey,
        payloadHash,
        createdAt: FieldValue.serverTimestamp(),
      };
      transaction.create(eventRef, event);
      transaction.set(stateRef, {
        userId,
        dayWib: day,
        lastEventType: command.eventType,
        capturedAt: normalized.capturedAt,
        eventId,
      });
      transaction.create(database.doc(`auditLogs/attendance-${eventId}`), {
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
      return resultOf(event);
    });
    await cleanupUnusedPhoto();
    return result;
  } catch (error) {
    await cleanupUnusedPhoto();
    throw error;
  }
}
