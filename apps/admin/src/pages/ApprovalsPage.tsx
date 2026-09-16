import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FileText,
  MapPin,
  Palmtree,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";
import {
  submitAttendanceApproval,
  updateServiceRequestStatus,
  watchAttendanceApprovals,
  watchServiceRequests,
  type AttendanceApprovalEntry,
  type ServiceRequestEntry,
} from "@/features/approvals/approval-repository";

function formatWibDateTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return "-";
  }
}

export function ApprovalsPage() {
  const { user } = useCurrentAdminAuth();
  const currentUid = user?.uid;

  const [attendanceApprovals, setAttendanceApprovals] = useState<
    AttendanceApprovalEntry[]
  >([]);
  const [serviceRequests, setServiceRequests] = useState<ServiceRequestEntry[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "attendance" | "service";
    id: string;
    action: "approved" | "rejected";
    title: string;
    employeeName: string;
  } | null>(null);
  const [actionNotes, setActionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubAttendance = watchAttendanceApprovals(
      (items) => {
        setAttendanceApprovals(items);
        setLoading(false);
      },
      (err) => {
        console.warn("Error watching attendance approvals:", err);
        setLoading(false);
      },
    );

    const unsubServices = watchServiceRequests(
      (items) => {
        setServiceRequests(items);
      },
      (err) => {
        console.warn("Error watching service requests:", err);
      },
    );

    return () => {
      unsubAttendance();
      unsubServices();
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => {
      setNotice(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const openActionDialog = (
    type: "attendance" | "service",
    id: string,
    action: "approved" | "rejected",
    title: string,
    employeeName: string,
  ) => {
    setActionNotes("");
    setActionError(null);
    setConfirmDialog({
      type,
      id,
      action,
      title,
      employeeName,
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmDialog) return;
    setSubmitting(true);
    setActionError(null);

    try {
      if (confirmDialog.type === "attendance") {
        await submitAttendanceApproval({
          eventId: confirmDialog.id,
          status: confirmDialog.action,
          notes: actionNotes.trim() || undefined,
        });
        setNotice(
          `Presensi ${confirmDialog.employeeName} berhasil ${
            confirmDialog.action === "approved" ? "disetujui" : "ditolak"
          }.`,
        );
      } else {
        await updateServiceRequestStatus(
          confirmDialog.id,
          confirmDialog.action,
          currentUid ?? "admin",
          user?.email ?? "Administrator",
          actionNotes.trim() || undefined,
        );
        setNotice(
          `Pengajuan layanan ${confirmDialog.employeeName} berhasil ${
            confirmDialog.action === "approved" ? "disetujui" : "ditolak"
          }.`,
        );
      }
      setConfirmDialog(null);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Gagal memproses persetujuan.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const pendingAttendanceCount = attendanceApprovals.filter(
    (i) => i.approvalStatus === "pending",
  ).length;

  const overtimeItems = serviceRequests.filter((i) => i.type === "overtime");
  const leaveItems = serviceRequests.filter((i) => i.type === "annual_leave");
  const permissionItems = serviceRequests.filter(
    (i) => i.type === "sick_leave" || i.type === "permission",
  );

  const renderServiceTable = (items: ServiceRequestEntry[]) => {
    if (items.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Tidak ada permohonan yang menunggu persetujuan pada kategori ini.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Karyawan</TableHead>
            <TableHead>Tanggal / Periode</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Tindakan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelf = item.userId === currentUid;
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-sm">{item.fullName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.employeeId}
                  </p>
                </TableCell>
                <TableCell className="text-sm">
                  <span>{item.date}</span>
                  {item.isOver8Hours && (
                    <Badge
                      variant="destructive"
                      className="ml-2 gap-1 text-[10px]"
                    >
                      <AlertTriangle className="size-3" /> &gt;8 Jam
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {item.reason}
                  {item.adminNotes && (
                    <p className="mt-1 text-xs italic text-slate-500">
                      Catatan: {item.adminNotes}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  {item.status === "pending" && (
                    <Badge
                      variant="secondary"
                      className="bg-amber-100 text-amber-800 border-amber-200"
                    >
                      Menunggu
                    </Badge>
                  )}
                  {item.status === "approved" && (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-100 text-emerald-800 border-emerald-200"
                    >
                      Disetujui
                    </Badge>
                  )}
                  {item.status === "rejected" && (
                    <Badge variant="destructive">Ditolak</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.status === "pending" ? (
                    isSelf ? (
                      <span className="text-xs italic text-muted-foreground">
                        🚫 Self-Approval dilarang
                      </span>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          onClick={() =>
                            openActionDialog(
                              "service",
                              item.id,
                              "approved",
                              "Setujui Pengajuan",
                              item.fullName,
                            )
                          }
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-destructive hover:bg-destructive/10"
                          onClick={() =>
                            openActionDialog(
                              "service",
                              item.id,
                              "rejected",
                              "Tolak Pengajuan",
                              item.fullName,
                            )
                          }
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">
                      Selesai diproses
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pusat Persetujuan
        </h1>
        <p className="text-sm text-muted-foreground">
          Tinjau dan kelola antrean pengajuan cuti, sakit, serta izin karyawan dalam satu dasbor terpadu.
        </p>
      </div>

      <div className="rounded-lg bg-blue-50/70 p-4 border border-blue-200 text-xs text-blue-900 flex gap-3 items-center">
        <ShieldCheck className="size-5 shrink-0 text-blue-600" />
        <div>
          <strong>Aturan Tata Kelola &amp; Cross-Approval PT Kuda Prima:</strong> Administrator memiliki wewenang operasional persetujuan, namun{" "}
          <em>dilarang menyetujui presensi atau pengajuannya sendiri</em>. Setiap verifikasi harus diproses oleh Administrator lain yang berbeda guna menjamin transparansi dan integritas data.
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm transition-all"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{notice}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
            onClick={() => setNotice(null)}
          >
            Tutup
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4 pt-6">
          <Tabs defaultValue="attendance" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="attendance" className="gap-2">
                <CalendarCheck className="size-4" />
                Persetujuan Presensi ({pendingAttendanceCount})
              </TabsTrigger>
              <TabsTrigger value="overtime" className="gap-2">
                <Clock className="size-4" />
                Lembur (
                {overtimeItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="leave" className="gap-2">
                <Palmtree className="size-4" />
                Cuti Tahunan (
                {leaveItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="permission" className="gap-2">
                <FileText className="size-4" />
                Izin &amp; Sakit (
                {permissionItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="attendance" className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Presensi yang memerlukan persetujuan mencakup: keterlambatan (&gt;08:15 WIB), presensi di luar radius kantor / lapangan, serta presensi di luar jadwal / jam operasional.
              </div>

              {loading ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Memuat data presensi...
                </div>
              ) : attendanceApprovals.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                  Tidak ada permohonan yang menunggu persetujuan pada kategori ini.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Karyawan</TableHead>
                      <TableHead>Tipe &amp; Waktu</TableHead>
                      <TableHead>Lokasi</TableHead>
                      <TableHead>Alasan Approval</TableHead>
                      <TableHead>Catatan Presensi</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceApprovals.map((item) => {
                      const isSelf = item.userId === currentUid;
                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <p className="font-medium text-sm">{item.fullName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {item.employeeId}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium capitalize">
                              {item.eventType === "check_in"
                                ? "Absen Masuk"
                                : "Absen Keluar"}
                            </span>
                            <p className="text-muted-foreground">
                              {formatWibDateTime(item.capturedAt)}
                            </p>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-1">
                              <MapPin className="size-3 text-muted-foreground shrink-0" />
                              <span>
                                {item.locationType === "office"
                                  ? "Kantor Utama"
                                  : `Lapangan (${item.distanceMeters}m)`}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.approvalReasons.map((reason) => (
                                <Badge
                                  key={reason}
                                  variant="secondary"
                                  className={
                                    reason.includes("Terlambat")
                                      ? "bg-amber-100 text-amber-800 border-amber-200 text-[10px]"
                                      : reason.includes("Lapangan")
                                      ? "bg-blue-100 text-blue-800 border-blue-200 text-[10px]"
                                      : "bg-purple-100 text-purple-800 border-purple-200 text-[10px]"
                                  }
                                >
                                  {reason}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-xs text-muted-foreground">
                            {item.note || "-"}
                            {item.approvalNotes && (
                              <p className="mt-1 text-xs italic text-slate-500">
                                Catatan Admin: {item.approvalNotes}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {item.approvalStatus === "pending" && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-100 text-amber-800 border-amber-200"
                              >
                                Menunggu
                              </Badge>
                            )}
                            {item.approvalStatus === "approved" && (
                              <div>
                                <Badge
                                  variant="secondary"
                                  className="bg-emerald-100 text-emerald-800 border-emerald-200"
                                >
                                  Disetujui
                                </Badge>
                                {item.approvedByName && (
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    oleh {item.approvedByName}
                                  </p>
                                )}
                              </div>
                            )}
                            {item.approvalStatus === "rejected" && (
                              <div>
                                <Badge variant="destructive">Ditolak</Badge>
                                {item.approvedByName && (
                                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                                    oleh {item.approvedByName}
                                  </p>
                                )}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.approvalStatus === "pending" ? (
                              isSelf ? (
                                <span className="text-xs italic text-muted-foreground">
                                  🚫 Self-Approval dilarang
                                </span>
                              ) : (
                                <div className="flex justify-end gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                                    onClick={() =>
                                      openActionDialog(
                                        "attendance",
                                        item.id,
                                        "approved",
                                        "Setujui Presensi",
                                        item.fullName,
                                      )
                                    }
                                  >
                                    <CheckCircle2 className="size-3.5 mr-1" />
                                    Setujui
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      openActionDialog(
                                        "attendance",
                                        item.id,
                                        "rejected",
                                        "Tolak Presensi",
                                        item.fullName,
                                      )
                                    }
                                  >
                                    <XCircle className="size-3.5 mr-1" />
                                    Tolak
                                  </Button>
                                </div>
                              )
                            ) : (
                              <span className="text-xs text-muted-foreground font-medium">
                                Selesai diproses
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="overtime" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Lembur hari kerja dimulai 17:01 WIB setelah check-out presensi harian.
              </div>
              {renderServiceTable(overtimeItems)}
            </TabsContent>

            <TabsContent value="leave" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Hak cuti 12 hari/tahun berlaku setelah masa kerja minimal 1 tahun. Hari libur/akhir pekan tidak memotong kuota.
              </div>
              {renderServiceTable(leaveItems)}
            </TabsContent>

            <TabsContent value="permission" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Izin sakit maksimal diajukan H+3. Surat dokter bersifat opsional.
              </div>
              {renderServiceTable(permissionItems)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {confirmDialog && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !submitting) setConfirmDialog(null);
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{confirmDialog.title}</DialogTitle>
              <DialogDescription>
                Konfirmasi {confirmDialog.action === "approved" ? "persetujuan" : "penolakan"} untuk {confirmDialog.employeeName}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <Label htmlFor="action-notes">
                Catatan / Alasan {confirmDialog.action === "rejected" ? "(Wajib/Disarankan)" : "(Opsional)"}
              </Label>
              <Input
                id="action-notes"
                placeholder={
                  confirmDialog.action === "approved"
                    ? "Misal: Tugas dinas luar kantor terkonfirmasi"
                    : "Misal: Lokasi tidak sesuai surat tugas"
                }
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                disabled={submitting}
              />
            </div>

            {actionError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-xs text-destructive"
              >
                <ShieldAlert className="size-4 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={submitting}
                onClick={() => setConfirmDialog(null)}
              >
                Batal
              </Button>
              <Button
                type="button"
                variant={confirmDialog.action === "approved" ? "default" : "destructive"}
                disabled={submitting}
                onClick={handleConfirmAction}
              >
                {submitting
                  ? "Memproses..."
                  : confirmDialog.action === "approved"
                  ? "Ya, Setujui"
                  : "Ya, Tolak"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
