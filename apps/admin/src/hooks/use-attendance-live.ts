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
    let unsubscribeSnapshot: (() => void) | null = null;

    const setupListener = () => {
      try {
        const eventsRef = collection(firestore, "attendanceEvents");
        const { start, end } = wibDayBounds(new Date());
        const q = query(
          eventsRef,
          where("capturedAt", ">=", start),
          where("capturedAt", "<", end),
          orderBy("capturedAt", "desc"),
        );

        unsubscribeSnapshot = onSnapshot(
          q,
          (snapshot) => {
            const items: AttendanceEventItem[] = [];
            const uniqueUsers = new Set<string>();
            let lateCount = 0;
            let fieldCount = 0;
            let pendingApprovalCount = 0;

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
              if (item.requiresApproval) {
                pendingApprovalCount += 1;
              }
            }

            setEvents(items);
            setKpis({
              presentToday: uniqueUsers.size,
              late: lateCount,
              field: fieldCount,
              pendingApproval: pendingApprovalCount,
            });
            setLoading(false);
          },
          (error) => {
            console.warn("Firestore attendanceEvents listener error:", error);
            setLoading(false);
          },
        );
      } catch (err) {
        console.warn("Firestore attendanceEvents setup error:", err);
        setLoading(false);
      }
    };

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      if (user) {
        setupListener();
      } else {
        setLoading(false);
      }
    });

    let day = wibDayBounds(new Date()).start;
    const dayTimer = setInterval(() => {
      const nextDay = wibDayBounds(new Date()).start;
      if (nextDay !== day && auth.currentUser) {
        day = nextDay;
        unsubscribeSnapshot?.();
        setupListener();
      }
    }, 30000);
    return () => {
      clearInterval(dayTimer);
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
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
