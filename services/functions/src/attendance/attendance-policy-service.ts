import type { AttendanceEventType } from "@kuda-prima/contracts";

export interface AttendanceScheduleEvaluation {
  readonly status: "normal" | "late" | "early_departure" | "non_working_day";
  readonly requiresApproval: boolean;
  readonly isAllowed: boolean;
  readonly reason?: string;
}

export interface JakartaTimeComponents {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
  readonly second: number;
  readonly weekday: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
}

export function toJakartaTime(date: Date): JakartaTimeComponents {
  // Asia/Jakarta is strictly UTC+7 without daylight saving time
  const jakartaOffsetMs = 7 * 60 * 60 * 1000;
  const jakartaDate = new Date(date.getTime() + jakartaOffsetMs);

  return {
    year: jakartaDate.getUTCFullYear(),
    month: jakartaDate.getUTCMonth() + 1,
    day: jakartaDate.getUTCDate(),
    hour: jakartaDate.getUTCHours(),
    minute: jakartaDate.getUTCMinutes(),
    second: jakartaDate.getUTCSeconds(),
    weekday: jakartaDate.getUTCDay(),
  };
}

export function evaluateAttendanceSchedule(
  eventType: AttendanceEventType,
  capturedAt: Date,
): AttendanceScheduleEvaluation {
  const time = toJakartaTime(capturedAt);
  const isWeekday = time.weekday >= 1 && time.weekday <= 5; // Monday to Friday

  // If performed on weekends (Saturday / Sunday), it is outside standard working days
  if (!isWeekday) {
    return {
      status: "non_working_day",
      requiresApproval: true,
      isAllowed: true,
      reason:
        "Presensi dilakukan di luar hari kerja operasional (akhir pekan). Memerlukan persetujuan Admin.",
    };
  }

  if (eventType === "check_in") {
    // Check-in opens at 07:00 WIB
    if (time.hour < 7) {
      return {
        status: "normal",
        requiresApproval: false,
        isAllowed: false,
        reason: "Presensi masuk baru dibuka pukul 07:00 WIB.",
      };
    }

    // Late if after 08:15 WIB on weekdays (or after regular work hours like 18:42)
    const isLate = time.hour > 8 || (time.hour === 8 && time.minute > 15);
    if (isLate) {
      return {
        status: "late",
        requiresApproval: true,
        isAllowed: true,
        reason:
          "Presensi masuk melebihi batas toleransi 08:15 WIB. Memerlukan persetujuan.",
      };
    }

    return {
      status: "normal",
      requiresApproval: false,
      isAllowed: true,
    };
  }

  if (eventType === "check_out") {
    // Early departure if before 17:00 WIB on weekdays
    const isEarly = isWeekday && time.hour < 17;
    if (isEarly) {
      return {
        status: "early_departure",
        requiresApproval: true,
        isAllowed: true,
      };
    }

    return {
      status: "normal",
      requiresApproval: false,
      isAllowed: true,
    };
  }

  // Overtime events
  return {
    status: "normal",
    requiresApproval: false,
    isAllowed: true,
  };
}
