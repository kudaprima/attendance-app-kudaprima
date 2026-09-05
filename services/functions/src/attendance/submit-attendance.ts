import {
  attendanceCommandSchema,
  type AttendanceSubmissionResult,
} from "@kuda-prima/contracts";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError } from "firebase-functions/v2/https";

import {
  AttendanceMockLocationError,
  AttendanceScheduleError,
  AttendanceValidationError,
  submitAttendanceCommand,
} from "./attendance-submission-service.js";

interface CallableIdentity {
  readonly uid: string;
  readonly token: Record<string, unknown>;
}

export interface SubmitAttendanceRequest {
  readonly auth?: CallableIdentity;
  readonly data: unknown;
}

export async function handleSubmitAttendance(
  request: SubmitAttendanceRequest,
): Promise<AttendanceSubmissionResult> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autentikasi diperlukan.");
  }

  const parseResult = attendanceCommandSchema.safeParse(request.data);
  if (!parseResult.success) {
    throw new HttpsError(
      "invalid-argument",
      `Data presensi tidak valid: ${parseResult.error.issues.map((i) => i.message).join(", ")}`,
    );
  }

  const database = getFirestore();
  const storage = getStorage();

  try {
    return await submitAttendanceCommand(
      database,
      storage,
      parseResult.data,
      request.auth.uid,
    );
  } catch (error) {
    if (error instanceof AttendanceMockLocationError) {
      throw new HttpsError("permission-denied", error.message);
    }
    if (error instanceof AttendanceValidationError) {
      throw new HttpsError("invalid-argument", error.message);
    }
    if (error instanceof AttendanceScheduleError) {
      throw new HttpsError("failed-precondition", error.message);
    }
    throw error;
  }
}
