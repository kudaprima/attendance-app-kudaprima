import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import { auth, firestore } from "@/lib/firebase";

export interface AttendanceEventItem {
  id: string;
  eventId: string;
  employeeId: string;
  fullName: string;
  eventType: "check_in" | "check_out" | "overtime_start" | "overtime_end";
  locationType: "office" | "field";
  distanceMeters: number;
  note: string | null;
  status: "normal" | "late" | "early_departure" | "non_working_day";
  requiresApproval: boolean;
  capturedAt: string;
  timeWib: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  photoStoragePath?: string;
  photoUrl?: string;
}

export interface AttendanceSummaryKPIs {
  presentToday: number;
  late: number;
  field: number;
  pendingApproval: number;
}

const WIB_OFFSET_HOURS_MS = 7 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DAY_CHECK_INTERVAL_MS = 30_000;

const wibTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function formatWibTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return wibTimeFormatter.format(date);
  } catch {
    return "-";
  }
}

function mapDocToAttendanceEventItem(
  doc: QueryDocumentSnapshot<DocumentData>,
): AttendanceEventItem {
  const data = doc.data();
  const capturedAt = typeof data.capturedAt === "string" ? data.capturedAt : "";
  return {
    id: doc.id,
    eventId: typeof data.eventId === "string" ? data.eventId : doc.id,
    employeeId:
      typeof data.employeeId === "string" ? data.employeeId : "KP-000000",
    fullName: typeof data.fullName === "string" ? data.fullName : "Karyawan",
    eventType:
      (data.eventType as AttendanceEventItem["eventType"]) || "check_in",
    locationType:
      (data.locationType as AttendanceEventItem["locationType"]) || "office",
    distanceMeters:
      typeof data.distanceMeters === "number" ? data.distanceMeters : 0,
    note: typeof data.note === "string" ? data.note : null,
    status: (data.status as AttendanceEventItem["status"]) || "normal",
    requiresApproval: Boolean(data.requiresApproval),
    capturedAt,
    timeWib: formatWibTime(capturedAt),
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

interface ProcessedEvents {
  items: AttendanceEventItem[];
  presentToday: number;
  late: number;
  field: number;
}

function processEventsSnapshot(
  snapshot: QuerySnapshot<DocumentData>,
): ProcessedEvents {
  const items: AttendanceEventItem[] = [];
  const uniqueUsers = new Set<string>();
  let lateCount = 0;
  let fieldCount = 0;

  for (const doc of snapshot.docs) {
    const item = mapDocToAttendanceEventItem(doc);
    items.push(item);

    if (item.eventType === "check_in") {
      uniqueUsers.add(item.employeeId);
    }
    if (item.status === "late") {
      lateCount += 1;
    }
    if (item.locationType === "field") {
      fieldCount += 1;
    }
  }

  items.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));

  return {
    items,
    presentToday: uniqueUsers.size,
    late: lateCount,
    field: fieldCount,
  };
}

function countPendingAttendance(snapshot: QuerySnapshot<DocumentData>): number {
  let count = 0;
  for (const doc of snapshot.docs) {
    const status = doc.data().approvalStatus;
    if (status !== "approved" && status !== "rejected") {
      count += 1;
    }
  }
  return count;
}

function countPendingServices(snapshot: QuerySnapshot<DocumentData>): number {
  let count = 0;
  for (const doc of snapshot.docs) {
    const status = doc.data().status;
    if (status === "pending" || !status) {
      count += 1;
    }
  }
  return count;
}

export function useAttendanceLiveFeed() {
  const [events, setEvents] = useState<AttendanceEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<AttendanceSummaryKPIs>({
    presentToday: 0,
    late: 0,
    field: 0,
    pendingApproval: 0,
  });

  useEffect(() => {
    let unsubscribeEvents: (() => void) | null = null;
    let unsubscribeAttendanceApprovals: (() => void) | null = null;
    let unsubscribeServiceRequests: (() => void) | null = null;

    let todayKPIs = { presentToday: 0, late: 0, field: 0 };
    let pendingAttendanceCount = 0;
    let pendingServiceCount = 0;

    const updateAllKPIs = () => {
      setKpis({
        presentToday: todayKPIs.presentToday,
        late: todayKPIs.late,
        field: todayKPIs.field,
        pendingApproval: pendingAttendanceCount + pendingServiceCount,
      });
    };

    const cleanupListeners = () => {
      if (unsubscribeEvents) {
        unsubscribeEvents();
        unsubscribeEvents = null;
      }
      if (unsubscribeAttendanceApprovals) {
        unsubscribeAttendanceApprovals();
        unsubscribeAttendanceApprovals = null;
      }
      if (unsubscribeServiceRequests) {
        unsubscribeServiceRequests();
        unsubscribeServiceRequests = null;
      }
    };

    const setupListeners = () => {
      try {
        const eventsRef = collection(firestore, "attendanceEvents");
        const { start, end } = wibDayBounds(new Date());
        const qEvents = query(
          eventsRef,
          where("capturedAt", ">=", start),
          where("capturedAt", "<", end),
          orderBy("capturedAt", "desc"),
        );

        unsubscribeEvents = onSnapshot(
          qEvents,
          (snapshot) => {
            const processed = processEventsSnapshot(snapshot);
            setEvents(processed.items);
            todayKPIs = {
              presentToday: processed.presentToday,
              late: processed.late,
              field: processed.field,
            };
            updateAllKPIs();
            setLoading(false);
          },
          () => {
            setLoading(false);
          },
        );

        const qApprovals = query(
          collection(firestore, "attendanceEvents"),
          where("requiresApproval", "==", true),
        );

        unsubscribeAttendanceApprovals = onSnapshot(
          qApprovals,
          (snapshot) => {
            pendingAttendanceCount = countPendingAttendance(snapshot);
            updateAllKPIs();
          },
          () => undefined,
        );

        const qServices = collection(firestore, "serviceRequests");
        unsubscribeServiceRequests = onSnapshot(
          qServices,
          (snapshot) => {
            pendingServiceCount = countPendingServices(snapshot);
            updateAllKPIs();
          },
          () => undefined,
        );
      } catch {
        setLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      cleanupListeners();

      if (user) {
        setupListeners();
      } else {
        setLoading(false);
      }
    });

    let day = wibDayBounds(new Date()).start;
    const dayTimer = window.setInterval(() => {
      const nextDay = wibDayBounds(new Date()).start;
      if (nextDay !== day && auth.currentUser) {
        day = nextDay;
        cleanupListeners();
        setupListeners();
      }
    }, DAY_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(dayTimer);
      unsubscribeAuth();
      cleanupListeners();
    };
  }, []);

  return { events, kpis, loading };
}

export function wibDayBounds(now: Date) {
  const day = new Date(now.getTime() + WIB_OFFSET_HOURS_MS)
    .toISOString()
    .slice(0, 10);
  const start = new Date(`${day}T00:00:00+07:00`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + ONE_DAY_MS).toISOString(),
  };
}
