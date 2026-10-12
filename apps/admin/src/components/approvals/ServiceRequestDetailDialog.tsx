import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Palmtree,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";

import { AttendancePhotoView } from "@/components/attendance/AttendancePhotoView";
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
import { Separator } from "@/components/ui/separator";
import type { ServiceRequestEntry } from "@/features/approvals/approval-repository";

export interface ServiceRequestDetailDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly item: ServiceRequestEntry | null;
  readonly currentAdminUid?: string;
  readonly onApprove?: (id: string, employeeName: string) => void;
  readonly onReject?: (id: string, employeeName: string) => void;
}

function getServiceTypeTitle(type: ServiceRequestEntry["type"]): string {
  if (type === "annual_leave") return "Cuti Tahunan";
  if (type === "sick_leave") return "Izin Sakit";
  if (type === "overtime") return "Pengajuan Lembur";
  return "Izin Keperluan Khusus";
}

function formatWibTimeRange(
  startedAt?: string | null,
  endedAt?: string | null,
): string {
  if (!startedAt || !endedAt) return "-";
  try {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return "-";
    }
    const formatter = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "short",
    });
    return `${formatter.format(start)} – ${formatter.format(end)} WIB`;
  } catch {
    return "-";
  }
}

function formatPeriodDisplay(item: ServiceRequestEntry): string {
  const start = item.startDate || item.date;
  const end = item.endDate || start;
  if (start === end) return start;
  return `${start} s/d ${end}`;
}

export function ServiceRequestDetailDialog({
  open,
  onOpenChange,
  item,
  currentAdminUid,
  onApprove,
  onReject,
}: Readonly<ServiceRequestDetailDialogProps>) {
  if (!item) return null;

  const isSelf = Boolean(currentAdminUid && item.userId === currentAdminUid);
  const canProcess = item.status === "pending" && Boolean(onApprove && onReject);
  const typeTitle = getServiceTypeTitle(item.type);
  const hasMedia = Boolean(item.selfieStoragePath || item.attachmentStoragePath);

  const renderStatusBadge = () => {
    if (item.status === "approved") {
      return (
        <Badge
          variant="secondary"
          className="bg-emerald-100 text-emerald-800 border-emerald-200"
        >
          Disetujui
        </Badge>
      );
    }
    if (item.status === "rejected") {
      return <Badge variant="destructive">Ditolak</Badge>;
    }
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 border-amber-200"
      >
        Menunggu Persetujuan
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto backdrop-blur-md bg-background/95">
        <DialogHeader>
          <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
            <div>
              <DialogTitle className="text-xl flex items-center gap-2">
                {item.type === "overtime" && (
                  <Clock className="size-5 text-primary" />
                )}
                {item.type === "annual_leave" && (
                  <Palmtree className="size-5 text-primary" />
                )}
                {(item.type === "sick_leave" || item.type === "permission") && (
                  <FileText className="size-5 text-primary" />
                )}
                Detail {typeTitle}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Informasi pengajuan layanan karyawan, kalkulasi durasi/hari
                kerja, dan bukti lampiran.
              </DialogDescription>
            </div>
            {renderStatusBadge()}
          </div>
        </DialogHeader>

        <Separator className="my-1" />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 py-2">
          <div
            className={
              hasMedia
                ? "md:col-span-6 space-y-4"
                : "md:col-span-12 space-y-4"
            }
          >
            <div className="rounded-xl border bg-slate-50/80 backdrop-blur-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Identitas Pemohon
                  </p>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {item.fullName}
                  </h3>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.employeeId}
                    {item.jobTitle ? ` • ${item.jobTitle}` : ""}
                  </p>
                </div>
                <Badge variant="outline" className="font-semibold">
                  {typeTitle}
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="size-3.5" />
                    Tanggal / Periode
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {formatPeriodDisplay(item)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Clock className="size-3.5" />
                    Durasi / Hari Efektif
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-semibold text-slate-800">
                      {item.durationOrDays || "1 Hari"}
                    </span>
                    {item.isOver8Hours && (
                      <Badge
                        variant="destructive"
                        className="gap-1 text-[10px] px-1.5 py-0"
                      >
                        <AlertTriangle className="size-3" /> &gt;8 Jam
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {item.type === "overtime" && (
                <>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3.5" />
                        Rentang Waktu Lembur
                      </p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {formatWibTimeRange(item.startedAt, item.endedAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Building2 className="size-3.5" />
                        Lokasi / Klien
                      </p>
                      <p className="font-semibold text-slate-800 mt-0.5">
                        {item.clientOrLocation || "Lapangan / Kantor"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="text-xs space-y-1">
                <p className="text-muted-foreground font-medium">
                  Alasan / Deskripsi Tugas:
                </p>
                <p className="rounded-lg bg-white p-2.5 border text-slate-700 leading-relaxed">
                  {item.reason || "-"}
                </p>
              </div>

              {(item.approvedByName || item.adminNotes) && (
                <>
                  <Separator />
                  <div className="text-xs space-y-1">
                    <p className="text-muted-foreground font-medium flex items-center gap-1">
                      <UserCheck className="size-3.5" />
                      Keputusan Admin
                    </p>
                    {item.approvedByName && (
                      <p className="text-slate-700">
                        Diproses oleh:{" "}
                        <span className="font-semibold">
                          {item.approvedByName}
                        </span>
                      </p>
                    )}
                    {item.adminNotes && (
                      <p className="rounded-lg bg-white p-2 border italic text-slate-600">
                        &ldquo;{item.adminNotes}&rdquo;
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {hasMedia && (
            <div className="md:col-span-6 space-y-4">
              {item.selfieStoragePath && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">
                    Foto Selfie Kehadiran Lembur
                  </p>
                  <AttendancePhotoView
                    photoStoragePath={item.selfieStoragePath}
                    capturedAt={item.createdAt || item.date}
                    employeeName={`${item.fullName} (Selfie Lembur)`}
                  />
                </div>
              )}
              {item.attachmentStoragePath && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-slate-700">
                    Lampiran Dokumen / Surat Pendukung
                  </p>
                  <AttendancePhotoView
                    photoStoragePath={item.attachmentStoragePath}
                    capturedAt={item.createdAt || item.date}
                    employeeName={`${item.fullName} (Lampiran ${typeTitle})`}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between items-center gap-2 pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Tutup
          </Button>

          {canProcess && isSelf && (
            <div className="flex items-center gap-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
              <ShieldAlert className="size-4 shrink-0 text-amber-600" />
              <span>
                Self-Approval dilarang: Anda tidak dapat memproses pengajuan
                sendiri.
              </span>
            </div>
          )}

          {canProcess && !isSelf && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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
                Tolak
              </Button>
              <Button
                type="button"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => {
                  onOpenChange(false);
                  onApprove?.(item.id, item.fullName);
                }}
              >
                <CheckCircle2 className="size-4 mr-1.5" />
                Setujui Pengajuan
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
