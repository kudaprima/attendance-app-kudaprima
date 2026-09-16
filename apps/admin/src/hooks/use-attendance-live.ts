import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  where,
  onSnapshot,
  orderBy,
  query,
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
}

export interface AttendanceSummaryKPIs {
  presentToday: number;
  late: number;
  field: number;
  pendingApproval: number;
}

function formatWibTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    // Convert to Asia/Jakarta (UTC+7)
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "-";
  }
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
        // 1. Listen to today's attendance events
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
            const items: AttendanceEventItem[] = [];
            const uniqueUsers = new Set<string>();
            let lateCount = 0;
            let fieldCount = 0;

            for (const doc of snapshot.docs) {
              const data = doc.data();
              const item: AttendanceEventItem = {
                id: doc.id,
                eventId: data.eventId || doc.id,
                employeeId: data.employeeId || "KP-000000",
                fullName: data.fullName || "Karyawan",
                eventType: data.eventType || "check_in",
                locationType: data.locationType || "office",
                distanceMeters: data.distanceMeters ?? 0,
                note: data.note ?? null,
                status: data.status || "normal",
                requiresApproval: data.requiresApproval ?? false,
                capturedAt: data.capturedAt || "",
                timeWib: formatWibTime(data.capturedAt || ""),
              };
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
            setEvents(items);
            todayKPIs = {
              presentToday: uniqueUsers.size,
              late: lateCount,
              field: fieldCount,
            };
            updateAllKPIs();
            setLoading(false);
          },
          (error) => {
            console.warn("Firestore attendanceEvents listener error:", error);
            setLoading(false);
          },
        );

        // 2. Listen to pending attendance approvals across all dates
        const qApprovals = query(
          collection(firestore, "attendanceEvents"),
          where("requiresApproval", "==", true),
        );

        unsubscribeAttendanceApprovals = onSnapshot(
          qApprovals,
          (snapshot) => {
            let count = 0;
            for (const doc of snapshot.docs) {
              const data = doc.data();
              const status = data.approvalStatus;
              if (status !== "approved" && status !== "rejected") {
                count += 1;
              }
            }
            pendingAttendanceCount = count;
            updateAllKPIs();
          },
          (error) => {
            console.warn("Firestore attendance approvals count error:", error);
          },
        );

        // 3. Listen to pending service requests (leave, sick, permission, overtime)
        const qServices = collection(firestore, "serviceRequests");
        unsubscribeServiceRequests = onSnapshot(
          qServices,
          (snapshot) => {
            let count = 0;
            for (const doc of snapshot.docs) {
              const data = doc.data();
              const status = data.status;
              if (status === "pending" || !status) {
                count += 1;
              }
            }
            pendingServiceCount = count;
            updateAllKPIs();
          },
          (error) => {
            console.warn("Firestore service requests count error:", error);
          },
        );
      } catch (err) {
        console.warn("Firestore attendance setup error:", err);
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
    const dayTimer = setInterval(() => {
      const nextDay = wibDayBounds(new Date()).start;
      if (nextDay !== day && auth.currentUser) {
        day = nextDay;
        cleanupListeners();
        setupListeners();
      }
    }, 30000);

    return () => {
      clearInterval(dayTimer);
      unsubscribeAuth();
      cleanupListeners();
    };
  }, []);

  return { events, kpis, loading };
}

export function wibDayBounds(now: Date) {
  const day = new Date(now.getTime() + 7 * 3600000).toISOString().slice(0, 10);
  const start = new Date(`${day}T00:00:00+07:00`);
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 86400000).toISOString(),
  };
}
