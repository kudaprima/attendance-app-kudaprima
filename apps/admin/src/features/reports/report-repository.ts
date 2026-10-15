import {
  collection,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export interface RawEmployeeRecord {
  readonly uid: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly jobTitle: string;
  readonly employmentStatus: string;
  readonly employmentStartDate: string;
  readonly active: boolean;
}

export interface RawAttendanceRecord {
  readonly id: string;
  readonly userId: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly eventType: "check_in" | "check_out" | "overtime_start" | "overtime_end";
  readonly locationType: "office" | "field";
  readonly distanceMeters: number;
  readonly status: "normal" | "late" | "early_departure" | "non_working_day";
  readonly approvalStatus: "pending" | "approved" | "rejected" | "not_required";
  readonly capturedAt: string;
  readonly wibDate: string;
  readonly wibTime: string;
  readonly note: string;
}

export interface RawServiceRecord {
  readonly id: string;
  readonly userId: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly jobTitle: string;
  readonly type: "annual_leave" | "sick_leave" | "permission" | "overtime";
  readonly startDate: string;
  readonly endDate: string;
  readonly workingDaysCount: number;
  readonly durationMinutes: number;
  readonly durationOrDays: string;
  readonly clientOrLocation: string;
  readonly reason: string;
  readonly status: "pending" | "approved" | "rejected";
  readonly approvedByName: string;
}

export interface EmployeePayrollRecap {
  readonly uid: string;
  readonly employeeId: string;
  readonly fullName: string;
  readonly jobTitle: string;
  readonly employmentStatus: string;
  readonly presentDays: number;
  readonly onTimeDays: number;
  readonly lateCount: number;
  readonly lateMinutes: number;
  readonly earlyDepartureCount: number;
  readonly fieldDays: number;
  readonly overtimeMinutes: number;
  readonly annualLeaveDays: number;
  readonly sickLeaveDays: number;
  readonly permissionDays: number;
  readonly pendingRequestsCount: number;
}

export interface ReportAggregateResult {
  readonly recaps: EmployeePayrollRecap[];
  readonly filteredAttendance: RawAttendanceRecord[];
  readonly filteredServices: RawServiceRecord[];
  readonly totals: {
    readonly totalEmployees: number;
    readonly totalPresentDays: number;
    readonly totalLateCount: number;
    readonly totalLateMinutes: number;
    readonly totalFieldDays: number;
    readonly totalOvertimeMinutes: number;
    readonly totalLeaveAndSickDays: number;
  };
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const WORK_START_MINUTES = 8 * 60; // 08:00 WIB

export function toWibDateAndTime(isoString: string): {
  wibDate: string;
  wibTime: string;
  minutesFromMidnight: number;
} {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return { wibDate: "", wibTime: "-", minutesFromMidnight: 0 };
  }
  const wibInstant = new Date(parsed.getTime() + WIB_OFFSET_MS);
  const isoWib = wibInstant.toISOString();
  const wibDate = isoWib.slice(0, 10);
  const wibTime = isoWib.slice(11, 16);
  const hours = Number(isoWib.slice(11, 13)) || 0;
  const minutes = Number(isoWib.slice(14, 16)) || 0;
  return {
    wibDate,
    wibTime,
    minutesFromMidnight: hours * 60 + minutes,
  };
}

function parseApprovalStatus(
  data: DocumentData,
): RawAttendanceRecord["approvalStatus"] {
  if (!data.requiresApproval) {
    return "not_required";
  }
  if (data.approvalStatus === "approved") {
    return "approved";
  }
  if (data.approvalStatus === "rejected") {
    return "rejected";
  }
  return "pending";
}

function mapUserDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): RawEmployeeRecord {
  const data = doc.data();
  return {
    uid: doc.id,
    employeeId:
      typeof data.employeeId === "string" ? data.employeeId : "KP-000000",
    fullName: typeof data.fullName === "string" ? data.fullName : "Karyawan",
    jobTitle:
      typeof data.jobTitle === "string" && data.jobTitle.trim().length > 0
        ? data.jobTitle.trim()
        : "Teknisi Operasional",
    employmentStatus:
      typeof data.employmentStatus === "string"
        ? data.employmentStatus
        : "contract",
    employmentStartDate:
      typeof data.employmentStartDate === "string"
        ? data.employmentStartDate
        : "",
    active: data.active !== false,
  };
}

function mapAttendanceDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): RawAttendanceRecord {
  const data = doc.data();
  const capturedAt = typeof data.capturedAt === "string" ? data.capturedAt : "";
  const { wibDate, wibTime } = toWibDateAndTime(capturedAt);
  const geofence = data.geofence as {
    locationType?: string;
    distanceMeters?: number;
  } | null;

  let locationType: "office" | "field" = "office";
  if (data.locationType === "field" || geofence?.locationType === "field") {
    locationType = "field";
  }

  const distanceMeters =
    typeof data.distanceMeters === "number"
      ? data.distanceMeters
      : typeof geofence?.distanceMeters === "number"
        ? geofence.distanceMeters
        : 0;

  return {
    id: doc.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    employeeId:
      typeof data.employeeId === "string" ? data.employeeId : "KP-000000",
    fullName: typeof data.fullName === "string" ? data.fullName : "Karyawan",
    eventType:
      (data.eventType as RawAttendanceRecord["eventType"]) || "check_in",
    locationType,
    distanceMeters: Math.round(distanceMeters),
    status: (data.status as RawAttendanceRecord["status"]) || "normal",
    approvalStatus: parseApprovalStatus(data),
    capturedAt,
    wibDate,
    wibTime,
    note: typeof data.note === "string" ? data.note : "",
  };
}

function parseLegacyMinutes(durationOrDays: string): number {
  const matchMinutes = /(\d+)\s*menit/i.exec(durationOrDays);
  if (matchMinutes) {
    return Number(matchMinutes[1]) || 0;
  }
  const matchHours = /(\d+)\s*jam/i.exec(durationOrDays);
  if (matchHours) {
    return (Number(matchHours[1]) || 0) * 60;
  }
  return 0;
}

function parseLegacyDays(durationOrDays: string): number {
  const matchDays = /(\d+)\s*hari/i.exec(durationOrDays);
  if (matchDays) {
    return Number(matchDays[1]) || 1;
  }
  return 1;
}

function mapServiceDoc(
  doc: QueryDocumentSnapshot<DocumentData>,
): RawServiceRecord {
  const data = doc.data();
  const startDate =
    typeof data.startDate === "string"
      ? data.startDate
      : typeof data.date === "string"
        ? data.date
        : "";
  const endDate =
    typeof data.endDate === "string" ? data.endDate : startDate;
  const durationOrDays =
    typeof data.durationOrDays === "string" ? data.durationOrDays : "";

  const workingDaysCount =
    typeof data.workingDaysCount === "number"
      ? data.workingDaysCount
      : parseLegacyDays(durationOrDays);

  const durationMinutes =
    typeof data.durationMinutes === "number"
      ? data.durationMinutes
      : parseLegacyMinutes(durationOrDays);

  let status: RawServiceRecord["status"] = "pending";
  if (data.status === "approved" || data.status === "rejected") {
    status = data.status;
  }

  return {
    id: doc.id,
    userId: typeof data.userId === "string" ? data.userId : "",
    employeeId:
      typeof data.employeeId === "string" ? data.employeeId : "KP-000000",
    fullName: typeof data.fullName === "string" ? data.fullName : "Karyawan",
    jobTitle: typeof data.jobTitle === "string" ? data.jobTitle : "",
    type: (data.type as RawServiceRecord["type"]) || "permission",
    startDate,
    endDate,
    workingDaysCount,
    durationMinutes,
    durationOrDays,
    clientOrLocation:
      typeof data.clientOrLocation === "string" ? data.clientOrLocation : "",
    reason: typeof data.reason === "string" ? data.reason : "",
    status,
    approvedByName:
      typeof data.approvedByName === "string" ? data.approvedByName : "",
  };
}

export function subscribeReportSources(callbacks: {
  onUsers: (users: RawEmployeeRecord[]) => void;
  onAttendance: (events: RawAttendanceRecord[]) => void;
  onServices: (services: RawServiceRecord[]) => void;
  onError?: (error: Error) => void;
}): () => void {
  const unsubUsers = onSnapshot(
    query(collection(firestore, "users"), orderBy("employeeId")),
    (snap) => callbacks.onUsers(snap.docs.map(mapUserDoc)),
    callbacks.onError,
  );

  const unsubAttendance = onSnapshot(
    query(collection(firestore, "attendanceEvents"), orderBy("capturedAt", "desc")),
    (snap) => callbacks.onAttendance(snap.docs.map(mapAttendanceDoc)),
    callbacks.onError,
  );

  const unsubServices = onSnapshot(
    collection(firestore, "serviceRequests"),
    (snap) => callbacks.onServices(snap.docs.map(mapServiceDoc)),
    callbacks.onError,
  );

  return () => {
    unsubUsers();
    unsubAttendance();
    unsubServices();
  };
}

function matchesSearchQuery(
  search: string,
  employeeId: string,
  fullName: string,
  jobTitle: string,
): boolean {
  if (!search) return true;
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;
  return (
    employeeId.toLowerCase().includes(normalized) ||
    fullName.toLowerCase().includes(normalized) ||
    jobTitle.toLowerCase().includes(normalized)
  );
}

function isWithinDateRange(
  targetDate: string,
  startDate: string,
  endDate: string,
): boolean {
  if (!targetDate) return false;
  if (startDate && targetDate < startDate) return false;
  if (endDate && targetDate > endDate) return false;
  return true;
}

export function buildReportAggregate(params: {
  employees: readonly RawEmployeeRecord[];
  attendanceEvents: readonly RawAttendanceRecord[];
  serviceRequests: readonly RawServiceRecord[];
  startDate: string;
  endDate: string;
  searchQuery: string;
}): ReportAggregateResult {
  const {
    employees,
    attendanceEvents,
    serviceRequests,
    startDate,
    endDate,
    searchQuery,
  } = params;

  const employeeMap = new Map<string, RawEmployeeRecord>();
  for (const emp of employees) {
    employeeMap.set(emp.employeeId, emp);
  }

  // Also ensure any employee referenced in events or services is included
  for (const ev of attendanceEvents) {
    if (!employeeMap.has(ev.employeeId)) {
      employeeMap.set(ev.employeeId, {
        uid: ev.userId || ev.employeeId,
        employeeId: ev.employeeId,
        fullName: ev.fullName,
        jobTitle: "Teknisi Operasional",
        employmentStatus: "contract",
        employmentStartDate: "",
        active: true,
      });
    }
  }

  for (const sr of serviceRequests) {
    if (!employeeMap.has(sr.employeeId)) {
      employeeMap.set(sr.employeeId, {
        uid: sr.userId || sr.employeeId,
        employeeId: sr.employeeId,
        fullName: sr.fullName,
        jobTitle: sr.jobTitle || "Teknisi Operasional",
        employmentStatus: "contract",
        employmentStartDate: "",
        active: true,
      });
    }
  }

  const filteredAttendance = attendanceEvents.filter((ev) => {
    const emp = employeeMap.get(ev.employeeId);
    const jobTitle = emp?.jobTitle ?? "";
    return (
      isWithinDateRange(ev.wibDate, startDate, endDate) &&
      matchesSearchQuery(searchQuery, ev.employeeId, ev.fullName, jobTitle)
    );
  });

  const filteredServices = serviceRequests
    .filter((sr) => {
      const emp = employeeMap.get(sr.employeeId);
      const jobTitle = sr.jobTitle || emp?.jobTitle || "";
      return (
        isWithinDateRange(sr.startDate, startDate, endDate) &&
        matchesSearchQuery(searchQuery, sr.employeeId, sr.fullName, jobTitle)
      );
    })
    .sort((a, b) => b.startDate.localeCompare(a.startDate));

  const sortedEmployees = Array.from(employeeMap.values())
    .filter((emp) =>
      matchesSearchQuery(
        searchQuery,
        emp.employeeId,
        emp.fullName,
        emp.jobTitle,
      ),
    )
    .sort((a, b) => a.employeeId.localeCompare(b.employeeId));

  const recaps: EmployeePayrollRecap[] = sortedEmployees.map((emp) => {
    const empAttendance = filteredAttendance.filter(
      (ev) =>
        ev.employeeId === emp.employeeId && ev.approvalStatus !== "rejected",
    );
    const empServices = filteredServices.filter(
      (sr) => sr.employeeId === emp.employeeId,
    );

    const presentDates = new Set<string>();
    const onTimeDates = new Set<string>();
    const fieldDates = new Set<string>();
    let lateCount = 0;
    let lateMinutes = 0;
    let earlyDepartureCount = 0;

    for (const ev of empAttendance) {
      if (ev.eventType === "check_in") {
        presentDates.add(ev.wibDate);
        if (ev.status === "normal") {
          onTimeDates.add(ev.wibDate);
        }
        if (ev.status === "late") {
          lateCount += 1;
          const { minutesFromMidnight } = toWibDateAndTime(ev.capturedAt);
          const diff = Math.max(minutesFromMidnight - WORK_START_MINUTES, 1);
          lateMinutes += diff;
        }
      }
      if (ev.eventType === "check_out" && ev.status === "early_departure") {
        earlyDepartureCount += 1;
      }
      if (ev.locationType === "field") {
        fieldDates.add(ev.wibDate);
      }
    }

    let overtimeMinutes = 0;
    let annualLeaveDays = 0;
    let sickLeaveDays = 0;
    let permissionDays = 0;
    let pendingRequestsCount = 0;

    for (const sr of empServices) {
      if (sr.status === "pending") {
        pendingRequestsCount += 1;
      }
      if (sr.status === "approved") {
        if (sr.type === "overtime") {
          overtimeMinutes += sr.durationMinutes;
        } else if (sr.type === "annual_leave") {
          annualLeaveDays += Math.max(sr.workingDaysCount, 1);
        } else if (sr.type === "sick_leave") {
          sickLeaveDays += Math.max(sr.workingDaysCount, 1);
        } else if (sr.type === "permission") {
          permissionDays += Math.max(sr.workingDaysCount, 1);
        }
      }
    }

    return {
      uid: emp.uid,
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      jobTitle: emp.jobTitle,
      employmentStatus: emp.employmentStatus,
      presentDays: presentDates.size,
      onTimeDays: onTimeDates.size,
      lateCount,
      lateMinutes,
      earlyDepartureCount,
      fieldDays: fieldDates.size,
      overtimeMinutes,
      annualLeaveDays,
      sickLeaveDays,
      permissionDays,
      pendingRequestsCount,
    };
  });

  let totalPresentDays = 0;
  let totalLateCount = 0;
  let totalLateMinutes = 0;
  let totalFieldDays = 0;
  let totalOvertimeMinutes = 0;
  let totalLeaveAndSickDays = 0;

  for (const r of recaps) {
    totalPresentDays += r.presentDays;
    totalLateCount += r.lateCount;
    totalLateMinutes += r.lateMinutes;
    totalFieldDays += r.fieldDays;
    totalOvertimeMinutes += r.overtimeMinutes;
    totalLeaveAndSickDays +=
      r.annualLeaveDays + r.sickLeaveDays + r.permissionDays;
  }

  return {
    recaps,
    filteredAttendance,
    filteredServices,
    totals: {
      totalEmployees: recaps.length,
      totalPresentDays,
      totalLateCount,
      totalLateMinutes,
      totalFieldDays,
      totalOvertimeMinutes,
      totalLeaveAndSickDays,
    },
  };
}
