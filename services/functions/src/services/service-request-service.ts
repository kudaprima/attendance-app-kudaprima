import {
  processServiceApprovalCommandSchema,
  submitServiceRequestCommandSchema,
  type ProcessServiceApprovalCommand,
  type SubmitServiceRequestCommand,
} from "@kuda-prima/contracts";
import { type Firestore, FieldValue } from "firebase-admin/firestore";
import { type Storage } from "firebase-admin/storage";
import { HttpsError } from "firebase-functions/v2/https";
import { createHash, randomUUID } from "node:crypto";
import jpeg from "jpeg-js";

export interface ServiceCallableRequest {
  readonly auth?: {
    readonly uid: string;
    readonly token: Record<string, unknown>;
  };
  readonly data: unknown;
}

const WIB_OFFSET_MS = 7 * 3600000;
const ANNUAL_LEAVE_QUOTA_DAYS = 12;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function toWibDateString(date: Date): string {
  return new Date(date.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

export function calculateWorkingDays(
  startDateStr: string,
  endDateStr: string,
): number {
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let count = 0;
  const cursor = new Date(start.getTime());
  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function calculateCalendarDays(startDateStr: string, endDateStr: string): number {
  const start = new Date(`${startDateStr}T00:00:00.000Z`);
  const end = new Date(`${endDateStr}T00:00:00.000Z`);
  return Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
}

function hasCompletedOneYearTenure(
  employmentStartDate: string | undefined,
  referenceDateStr: string,
): boolean {
  if (!employmentStartDate) return false;
  const start = new Date(`${employmentStartDate}T00:00:00.000Z`);
  const ref = new Date(`${referenceDateStr}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(ref.getTime())) {
    return false;
  }
  const oneYearAnniversary = new Date(
    Date.UTC(
      start.getUTCFullYear() + 1,
      start.getUTCMonth(),
      start.getUTCDate(),
    ),
  );
  return ref.getTime() >= oneYearAnniversary.getTime();
}

function formatOvertimeDuration(durationMinutes: number): string {
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} Jam ${mins} Menit (${durationMinutes} Menit)`;
  }
  if (hours > 0) {
    return `${hours} Jam (${durationMinutes} Menit)`;
  }
  return `${mins} Menit`;
}

function decodeAndValidateJpeg(base64Input: string, label: string): Buffer {
  const cleanBase64 = base64Input.replace(
    /^data:image\/(jpeg|jpg);base64,/i,
    "",
  );
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleanBase64)) {
    throw new HttpsError(
      "invalid-argument",
      `${label} harus berupa gambar JPEG yang valid.`,
    );
  }
  const buffer = Buffer.from(cleanBase64, "base64");
  try {
    const decoded = jpeg.decode(buffer, {
      maxResolutionInMP: 12,
      maxMemoryUsageInMB: 64,
      tolerantDecoding: false,
    });
    if (decoded.width < 32 || decoded.height < 32) {
      throw new Error("Image dimensions too small");
    }
  } catch {
    throw new HttpsError(
      "invalid-argument",
      `${label} tidak valid. Gunakan foto JPEG hasil kamera yang jelas.`,
    );
  }
  return buffer;
}

async function getApprovedAnnualLeaveDaysUsed(
  database: Firestore,
  userId: string,
  yearPrefix: string,
  excludeRequestId?: string,
): Promise<number> {
  const snapshot = await database
    .collection("serviceRequests")
    .where("userId", "==", userId)
    .get();

  let usedDays = 0;
  for (const docSnap of snapshot.docs) {
    if (excludeRequestId && docSnap.id === excludeRequestId) continue;
    const data = docSnap.data();
    const startDate =
      typeof data.startDate === "string"
        ? data.startDate
        : typeof data.date === "string"
          ? data.date
          : "";
    if (
      data.type === "annual_leave" &&
      data.status === "approved" &&
      startDate.startsWith(yearPrefix)
    ) {
      const days =
        typeof data.workingDaysCount === "number"
          ? data.workingDaysCount
          : calculateWorkingDays(
              startDate,
              typeof data.endDate === "string" ? data.endDate : startDate,
            );
      usedDays += Math.max(days, 1);
    }
  }
  return usedDays;
}

export async function submitServiceRequest(
  database: Firestore,
  storage: Storage,
  command: SubmitServiceRequestCommand,
  userId: string,
  now: Date = new Date(),
) {
  const userDoc = await database.doc(`users/${userId}`).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData?.active) {
    throw new HttpsError(
      "permission-denied",
      "Profil karyawan tidak ditemukan atau akun sedang tidak aktif.",
    );
  }

  const effectiveEndDate =
    command.type === "overtime"
      ? command.startDate
      : (command.endDate ?? command.startDate);

  const payloadHash = sha256(
    JSON.stringify({
      type: command.type,
      startDate: command.startDate,
      endDate: effectiveEndDate,
      startedAt: command.startedAt ?? null,
      endedAt: command.endedAt ?? null,
      clientOrLocation: command.clientOrLocation ?? null,
      reason: command.reason,
    }),
  );

  const requestId = sha256(`${userId}:${command.idempotencyKey}`);
  const requestRef = database.doc(`serviceRequests/${requestId}`);
  const existingDoc = await requestRef.get();
  if (existingDoc.exists) {
    const existingData = existingDoc.data()!;
    if (existingData.payloadHash && existingData.payloadHash !== payloadHash) {
      throw new HttpsError(
        "already-exists",
        "Idempotency key sudah digunakan untuk data pengajuan yang berbeda.",
      );
    }
    return {
      success: true as const,
      requestId,
      status: (existingData.status as "pending" | "approved" | "rejected") ?? "pending",
      workingDaysCount: (existingData.workingDaysCount as number) ?? 0,
      durationMinutes: (existingData.durationMinutes as number | null) ?? null,
      durationOrDays: (existingData.durationOrDays as string) ?? "",
      isOver8Hours: Boolean(existingData.isOver8Hours),
    };
  }

  const todayWib = toWibDateString(now);
  let workingDaysCount = 0;
  let durationMinutes: number | null = null;
  let durationOrDays = "";
  let isOver8Hours = false;

  if (command.type === "overtime") {
    const startTime = new Date(command.startedAt!);
    const endTime = new Date(command.endedAt!);
    durationMinutes = Math.round(
      (endTime.getTime() - startTime.getTime()) / 60000,
    );
    if (durationMinutes < 15 || durationMinutes > 1440) {
      throw new HttpsError(
        "invalid-argument",
        "Durasi lembur harus antara 15 menit hingga maksimal 24 jam.",
      );
    }

    const startWib = new Date(startTime.getTime() + WIB_OFFSET_MS);
    const startDayOfWeek = startWib.getUTCDay();
    const isWeekend = startDayOfWeek === 0 || startDayOfWeek === 6;
    const startHourWib = startWib.getUTCHours();
    const startMinuteWib = startWib.getUTCMinutes();

    if (
      !isWeekend &&
      (startHourWib < 17 || (startHourWib === 17 && startMinuteWib < 1))
    ) {
      throw new HttpsError(
        "failed-precondition",
        "Pada hari kerja reguler (Senin-Jumat), lembur hanya dapat dimulai pukul 17:01 WIB ke atas setelah jam kerja selesai.",
      );
    }

    isOver8Hours = durationMinutes > 480;
    durationOrDays = formatOvertimeDuration(durationMinutes);
  } else {
    workingDaysCount = calculateWorkingDays(
      command.startDate,
      effectiveEndDate,
    );
    const calendarDays = calculateCalendarDays(
      command.startDate,
      effectiveEndDate,
    );

    if (command.type === "annual_leave") {
      if (userData.employmentStatus === "intern") {
        throw new HttpsError(
          "failed-precondition",
          "Karyawan berstatus magang belum berhak mengajukan cuti tahunan. Silakan gunakan Izin Khusus.",
        );
      }
      if (
        !hasCompletedOneYearTenure(
          userData.employmentStartDate as string | undefined,
          todayWib,
        )
      ) {
        throw new HttpsError(
          "failed-precondition",
          "Cuti tahunan hanya berlaku bagi karyawan dengan masa kerja minimal 1 tahun.",
        );
      }
      if (command.startDate <= todayWib) {
        throw new HttpsError(
          "failed-precondition",
          "Pengajuan cuti tahunan wajib dilakukan minimal H-1 sebelum tanggal mulai cuti.",
        );
      }
      if (workingDaysCount <= 0) {
        throw new HttpsError(
          "invalid-argument",
          "Rentang tanggal cuti harus mencakup minimal 1 hari kerja efektif (Senin-Jumat).",
        );
      }

      const yearPrefix = command.startDate.slice(0, 4);
      const usedDays = await getApprovedAnnualLeaveDaysUsed(
        database,
        userId,
        yearPrefix,
      );
      const remainingDays = Math.max(ANNUAL_LEAVE_QUOTA_DAYS - usedDays, 0);
      if (workingDaysCount > remainingDays) {
        throw new HttpsError(
          "failed-precondition",
          `Pengajuan cuti (${workingDaysCount} hari kerja) melebihi sisa kuota cuti tahunan Anda (${remainingDays} dari ${ANNUAL_LEAVE_QUOTA_DAYS} hari tersedia).`,
        );
      }
      durationOrDays = `${workingDaysCount} Hari Kerja`;
    } else if (command.type === "sick_leave") {
      const diffFromStartDays =
        calculateCalendarDays(command.startDate, todayWib) - 1;
      if (diffFromStartDays > 3) {
        throw new HttpsError(
          "failed-precondition",
          "Pengajuan izin sakit dapat dilakukan maksimal H+3 sejak tanggal mulai sakit.",
        );
      }
      const effectiveDays =
        workingDaysCount > 0 ? workingDaysCount : calendarDays;
      durationOrDays = `${effectiveDays} Hari`;
    } else {
      const effectiveDays =
        workingDaysCount > 0 ? workingDaysCount : calendarDays;
      durationOrDays = `${effectiveDays} Hari`;
    }
  }

  let selfieStoragePath: string | null = null;
  let attachmentStoragePath: string | null = null;
  const bucket = storage.bucket();

  if (command.selfieBase64) {
    const selfieBuffer = decodeAndValidateJpeg(
      command.selfieBase64,
      "Foto selfie lembur",
    );
    selfieStoragePath = `service-requests/${userId}/${requestId}-selfie-${randomUUID()}.jpg`;
    await bucket.file(selfieStoragePath).save(selfieBuffer, {
      contentType: "image/jpeg",
      resumable: false,
    });
  }

  if (command.attachmentBase64) {
    const attachmentBuffer = decodeAndValidateJpeg(
      command.attachmentBase64,
      "Foto lampiran pendukung",
    );
    attachmentStoragePath = `service-requests/${userId}/${requestId}-attachment-${randomUUID()}.jpg`;
    await bucket.file(attachmentStoragePath).save(attachmentBuffer, {
      contentType: "image/jpeg",
      resumable: false,
    });
  }

  const nowIso = now.toISOString();
  const auditId = `service-submit-${requestId}`;

  await database.runTransaction(async (transaction) => {
    transaction.set(requestRef, {
      id: requestId,
      requestId,
      userId,
      employeeId: userData.employeeId ?? "KP-000000",
      fullName: userData.fullName ?? "Karyawan",
      jobTitle: userData.jobTitle ?? "Teknisi Operasional",
      type: command.type,
      date: command.startDate,
      startDate: command.startDate,
      endDate: effectiveEndDate,
      startedAt: command.startedAt ?? null,
      endedAt: command.endedAt ?? null,
      clientOrLocation: command.clientOrLocation ?? null,
      reason: command.reason,
      status: "pending",
      workingDaysCount,
      durationMinutes,
      durationOrDays,
      isOver8Hours,
      selfieStoragePath,
      attachmentStoragePath,
      approvedBy: null,
      approvedByName: null,
      approvedAt: null,
      adminNotes: null,
      payloadHash,
      createdAt: nowIso,
    });

    transaction.set(database.doc(`auditLogs/${auditId}`), {
      action: "service_request_submitted",
      actor: userId,
      actorName: userData.fullName ?? "Karyawan",
      targetUserId: userId,
      requestId,
      requestType: command.type,
      startDate: command.startDate,
      endDate: effectiveEndDate,
      durationOrDays,
      status: "pending",
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true as const,
    requestId,
    status: "pending" as const,
    workingDaysCount,
    durationMinutes,
    durationOrDays,
    isOver8Hours,
  };
}

export async function processServiceApproval(
  database: Firestore,
  command: ProcessServiceApprovalCommand,
  adminUid: string,
): Promise<{
  success: true;
  requestId: string;
  status: "approved" | "rejected";
}> {
  const adminDoc = await database.doc(`users/${adminUid}`).get();
  const adminData = adminDoc.data();
  if (!adminDoc.exists || !adminData?.active || adminData?.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Hanya Administrator aktif yang berwenang memproses persetujuan layanan.",
    );
  }

  const requestRef = database.doc(`serviceRequests/${command.requestId}`);
  const requestDoc = await requestRef.get();
  if (!requestDoc.exists) {
    throw new HttpsError(
      "not-found",
      "Data permohonan layanan tidak ditemukan.",
    );
  }

  const requestData = requestDoc.data()!;

  if (requestData.userId === adminUid) {
    throw new HttpsError(
      "permission-denied",
      "Aturan Cross-Approval: Administrator dilarang menyetujui atau menolak pengajuan layanannya sendiri.",
    );
  }

  if (command.status === "approved" && requestData.type === "annual_leave") {
    const startDate =
      typeof requestData.startDate === "string"
        ? requestData.startDate
        : typeof requestData.date === "string"
          ? requestData.date
          : "";
    const endDate =
      typeof requestData.endDate === "string" ? requestData.endDate : startDate;
    const requestedDays =
      typeof requestData.workingDaysCount === "number" &&
      requestData.workingDaysCount > 0
        ? requestData.workingDaysCount
        : Math.max(calculateWorkingDays(startDate, endDate), 1);

    const yearPrefix = startDate.slice(0, 4);
    const usedDays = await getApprovedAnnualLeaveDaysUsed(
      database,
      requestData.userId as string,
      yearPrefix,
      command.requestId,
    );
    const remainingDays = Math.max(ANNUAL_LEAVE_QUOTA_DAYS - usedDays, 0);
    if (requestedDays > remainingDays) {
      throw new HttpsError(
        "failed-precondition",
        `Persetujuan ditolak: sisa kuota cuti tahunan karyawan (${remainingDays} hari) tidak mencukupi untuk pengajuan ini (${requestedDays} hari kerja).`,
      );
    }
  }

  const nowIso = new Date().toISOString();
  const auditId = `service-approval-${command.requestId}-${randomUUID()}`;

  await database.runTransaction(async (transaction) => {
    transaction.update(requestRef, {
      status: command.status,
      approvedBy: adminUid,
      approvedByName: adminData.fullName ?? "Administrator",
      approvedAt: nowIso,
      adminNotes: command.notes?.trim() || null,
    });

    transaction.create(database.doc(`auditLogs/${auditId}`), {
      action:
        command.status === "approved"
          ? "service_request_approved"
          : "service_request_rejected",
      actor: adminUid,
      actorName: adminData.fullName ?? "Administrator",
      targetUserId: requestData.userId,
      requestId: command.requestId,
      requestType: requestData.type,
      status: command.status,
      notes: command.notes?.trim() || null,
      timestamp: FieldValue.serverTimestamp(),
    });
  });

  return {
    success: true,
    requestId: command.requestId,
    status: command.status,
  };
}

export async function handleSubmitServiceRequest(
  request: ServiceCallableRequest,
  database: Firestore,
  storage: Storage,
) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autentikasi diperlukan.");
  }

  const parseResult = submitServiceRequestCommandSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Data pengajuan tidak valid: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return submitServiceRequest(
    database,
    storage,
    parseResult.data,
    request.auth.uid,
  );
}

export async function handleProcessServiceApproval(
  request: ServiceCallableRequest,
  database: Firestore,
) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autentikasi diperlukan.");
  }

  if (request.auth.token.role !== "admin") {
    throw new HttpsError(
      "permission-denied",
      "Hanya Administrator yang memiliki hak akses persetujuan layanan.",
    );
  }

  const parseResult = processServiceApprovalCommandSchema.safeParse(
    request.data,
  );
  if (!parseResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Data persetujuan tidak valid: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  return processServiceApproval(database, parseResult.data, request.auth.uid);
}
