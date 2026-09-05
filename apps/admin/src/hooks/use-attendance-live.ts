import { useEffect, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { firestore } from "@/lib/firebase";

export interface AttendanceEventItem {
  id: string;
  eventId: string;
  employeeId: string;
  fullName: string;
  eventType: "check_in" | "check_out" | "overtime_start" | "overtime_end";
  locationType: "office" | "field";
  distanceMeters: number;
  note: string | null;
  status: "normal" | "late" | "early_departure";
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
    try {
      const eventsRef = collection(firestore, "attendanceEvents");
      const q = query(eventsRef, orderBy("createdAt", "desc"), limit(50));

      const unsubscribe = onSnapshot(
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
        (_error) => {
          // In isolated test/offline environment without emulator
          setLoading(false);
        },
      );

      return () => unsubscribe();
    } catch {
      queueMicrotask(() => setLoading(false));
    }
  }, []);

  return { events, kpis, loading };
}
