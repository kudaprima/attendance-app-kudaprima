import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  LogIn,
  LogOut,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AttendanceMap } from "./AttendanceMap";
import { AttendancePhotoView } from "./AttendancePhotoView";

export interface AttendanceDetailItem {
  id: string;
  eventId?: string;
  userId?: string;
  employeeId: string;
  fullName: string;
  eventType: "check_in" | "check_out" | "overtime_start" | "overtime_end";
  capturedAt: string;
  locationType: "office" | "field";
  distanceMeters: number;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  note?: string | null;
  status: "normal" | "late" | "early_departure" | "non_working_day";
  photoStoragePath?: string | null;
  photoUrl?: string | null;
  approvalReasons?: string[];
  approvalStatus?: "pending" | "approved" | "rejected";
  approvedByName?: string | null;
  approvedAt?: string | null;
  approvalNotes?: string | null;
}

export interface AttendanceDetailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item: AttendanceDetailItem | null;
  readonly currentAdminUid?: string;
  readonly onApprove?: (id: string, employeeName: string) => void;
  readonly onReject?: (id: string, employeeName: string) => void;
}

function formatWibDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "full",
      timeStyle: "medium",
    }).format(date);
  } catch {
    return "-";
  }
}

function getStatusBadge(status: AttendanceDetailItem["status"]) {
  if (status === "late") {
    return (
      <Badge
        variant="destructive"
        className="gap-1 bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-300/40 text-xs font-normal"
      >
        <Clock className="size-3" /> Terlambat
      </Badge>
    );
  }
  if (status === "early_departure") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-300/40 text-xs font-normal"
      >
        <Clock className="size-3" /> Pulang Awal
      </Badge>
    );
  }
  if (status === "non_working_day") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-300/40 text-xs font-normal"
      >
        <Calendar className="size-3" /> Di Luar Hari Kerja
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-300/40 text-xs font-normal"
    >
      <CheckCircle2 className="size-3" /> Tepat Waktu
    </Badge>
  );
}

function getApprovalBadge(status?: "pending" | "approved" | "rejected") {
  if (status === "approved") {
    return (
      <Badge
        variant="secondary"
        className="gap-1 bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 text-xs"
      >
        <ShieldCheck className="size-3" /> Disetujui
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="gap-1 text-xs">
        <ShieldAlert className="size-3" /> Ditolak
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="gap-1 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 text-xs"
    >
      <Clock className="size-3" /> Menunggu Persetujuan
    </Badge>
  );
}

function getEventLabel(eventType: AttendanceDetailItem["eventType"]): string {
  if (eventType === "check_in") return "Absen Masuk";
  if (eventType === "check_out") return "Absen Keluar";
  if (eventType === "overtime_start") return "Mulai Lembur";
  return "Selesai Lembur";
}

export function AttendanceDetailDialog({
  open,
  onOpenChange,
  item,
  currentAdminUid,
  onApprove,
  onReject,
}: Readonly<AttendanceDetailDialogProps>) {
  if (!item) return null;

  const isSelf = Boolean(
    currentAdminUid && item.userId && currentAdminUid === item.userId,
  );
  const isPending = item.approvalStatus === "pending";
  const hasApprovalControls = Boolean(onApprove && onReject && isPending);
  const eventLabel = getEventLabel(item.eventType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-semibold">
                  Detail Rekaman Presensi
                </DialogTitle>
                {getStatusBadge(item.status)}
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                ID Event: <span className="font-mono">{item.id}</span>
              </DialogDescription>
            </div>

            {item.approvalStatus && (
              <div className="flex items-center gap-1.5">
                {getApprovalBadge(item.approvalStatus)}
              </div>
            )}
          </div>
        </DialogHeader>

        {/* 2-Column Responsive Body */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 py-2">
          {/* Left Column: Photo & Details (5 cols on desktop) */}
          <div className="md:col-span-5 space-y-4">
            {/* Selfie Photo */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Verifikasi Wajah / Selfie
              </p>
              <AttendancePhotoView
                photoStoragePath={item.photoStoragePath}
                photoUrl={item.photoUrl}
                capturedAt={item.capturedAt}
                employeeName={item.fullName}
              />
            </div>

            {/* Employee & Event Metadata */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3 text-xs">
              <div className="flex items-start gap-2.5">
                <User className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Karyawan</p>
                  <p className="font-medium text-foreground">{item.fullName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {item.employeeId}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                {item.eventType === "check_in" ? (
                  <LogIn className="size-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <LogOut className="size-4 text-secondary mt-0.5 shrink-0" />
                )}
                <div className="space-y-0.5">
                  <p className="text-muted-foreground">Aktivitas Presensi</p>
                  <p className="font-medium text-foreground">{eventLabel}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatWibDateTime(item.capturedAt)}
                  </p>
                </div>
              </div>

              {item.note && (
                <div className="flex items-start gap-2.5 pt-1 border-t border-border/40">
                  <FileText className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="text-muted-foreground">Catatan Karyawan</p>
                    <p className="text-foreground italic">"{item.note}"</p>
                  </div>
                </div>
              )}

              {/* Approval Reasons if any */}
              {item.approvalReasons && item.approvalReasons.length > 0 && (
                <div className="pt-2 border-t border-border/40 space-y-1.5">
                  <p className="text-muted-foreground font-medium">
                    Alasan Memerlukan Approval:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {item.approvalReasons.map((reason) => (
                      <Badge
                        key={reason}
                        variant="secondary"
                        className="text-[10px] bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200"
                      >
                        {reason}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Approval history if processed */}
              {item.approvedByName && (
                <div className="pt-2 border-t border-border/40 space-y-0.5 text-[11px]">
                  <p className="text-muted-foreground">
                    Diproses oleh:{" "}
                    <span className="font-medium text-foreground">
                      {item.approvedByName}
                    </span>
                  </p>
                  {item.approvalNotes && (
                    <p className="text-muted-foreground italic">
                      Catatan Admin: {item.approvalNotes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Visual Map & Location Details (7 cols on desktop) */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Peta Lokasi &amp; Geofencing (OpenStreetMap)
              </p>
              <AttendanceMap
                latitude={item.latitude}
                longitude={item.longitude}
                accuracyMeters={item.accuracyMeters}
                distanceMeters={item.distanceMeters}
                locationType={item.locationType}
                employeeName={item.fullName}
                capturedAtWib={formatWibDateTime(item.capturedAt)}
              />
            </div>

            {/* Geofence summary card */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-secondary" />
                  Status Lokasi Presensi
                </span>
                <Badge
                  variant={
                    item.locationType === "office" ? "secondary" : "outline"
                  }
                  className="text-[11px]"
                >
                  {item.locationType === "office"
                    ? "Dalam Radius Kantor"
                    : "Presensi Lapangan"}
                </Badge>
              </div>

              <p className="text-muted-foreground text-[11px]">
                {item.locationType === "office"
                  ? `Karyawan berada di dalam radius presensi kantor (jarak ${Math.round(item.distanceMeters)}m dari titik pusat).`
                  : `Karyawan berada di luar perimeter kantor (${Math.round(item.distanceMeters)}m). Presensi lapangan otomatis ditandai untuk peninjauan admin.`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <DialogFooter className="border-t border-border/50 pt-4 flex flex-row items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>

          {hasApprovalControls && (
            <div className="flex items-center gap-2">
              {isSelf ? (
                <span className="text-xs italic text-muted-foreground">
                  🚫 Self-Approval dilarang
                </span>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => {
                      onOpenChange(false);
                      onReject?.(item.id, item.fullName);
                    }}
                  >
                    <XCircle className="size-4 mr-1.5" />
                    Tolak Presensi
                  </Button>
                  <Button
                    type="button"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => {
                      onOpenChange(false);
                      onApprove?.(item.id, item.fullName);
                    }}
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    Setujui Presensi
                  </Button>
                </>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
