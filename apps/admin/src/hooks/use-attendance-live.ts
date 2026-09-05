import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  limit,
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
        const q = query(eventsRef, orderBy("createdAt", "desc"), limit(50));

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
      if (
        !user &&
        import.meta.env.MODE !== "test" &&
        (import.meta.env.DEV ||
          import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true")
      ) {
        signInWithEmailAndPassword(
          auth,
          "admin.dev@kudaprima.test",
          "KudaPrimaDev2026#",
        ).catch((err) => {
          console.warn("Auto-signin dev admin error:", err);
          setupListener();
        });
        return;
      }

      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
        unsubscribeSnapshot = null;
      }

      setupListener();
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  return { events, kpis, loading };
}
