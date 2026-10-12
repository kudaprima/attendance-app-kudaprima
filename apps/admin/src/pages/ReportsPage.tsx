import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  Clock,
  Download,
  FileSpreadsheet,
  FileText,
  Printer,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  exportReportCsv,
  exportReportPdf,
  formatApprovalStatusLabel,
  formatEmploymentStatusLabel,
  formatServiceTypeLabel,
  preloadBrandLogoForPdf,
  type ReportTabMode,
} from "@/features/reports/report-exporters";
import {
  buildReportAggregate,
  subscribeReportSources,
  type EmployeePayrollRecap,
  type RawAttendanceRecord,
  type RawEmployeeRecord,
  type RawServiceRecord,
} from "@/features/reports/report-repository";

function getCurrentWibMonthBounds(): {
  monthValue: string;
  startDate: string;
  endDate: string;
} {
  const now = new Date(Date.now() + 7 * 3600 * 1000);
  const year = now.getUTCFullYear();
  const monthIndex = now.getUTCMonth();
  const monthStr = String(monthIndex + 1).padStart(2, "0");
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  const lastDayStr = String(lastDay).padStart(2, "0");
  return {
    monthValue: `${year}-${monthStr}`,
    startDate: `${year}-${monthStr}-01`,
    endDate: `${year}-${monthStr}-${lastDayStr}`,
  };
}

function getMonthBoundsFromMonthValue(monthValue: string): {
  startDate: string;
  endDate: string;
} | null {
  const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const lastDayStr = String(lastDay).padStart(2, "0");
  return {
    startDate: `${match[1]}-${match[2]}-01`,
    endDate: `${match[1]}-${match[2]}-${lastDayStr}`,
  };
}

function formatDurationMinutesLabel(minutes: number): string {
  if (minutes <= 0) return "0 mnt";
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours > 0 && rem > 0) {
    return `${hours}j ${rem}m (${minutes} mnt)`;
  }
  if (hours > 0) {
    return `${hours} jam (${minutes} mnt)`;
  }
  return `${minutes} mnt`;
}

function getApprovalBadgeVariant(
  status: string,
): "default" | "destructive" | "outline" {
  if (status === "approved" || status === "not_required") {
    return "default";
  }
  if (status === "rejected") {
    return "destructive";
  }
  return "outline";
}

interface AttendanceRecapTableProps {
  readonly recaps: readonly EmployeePayrollRecap[];
  readonly loading: boolean;
}

function AttendanceRecapTable({
  recaps,
  loading,
}: Readonly<AttendanceRecapTableProps>) {
  if (recaps.length === 0) {
    const emptyText = loading
      ? "Memuat data rekapitulasi karyawan..."
      : "Tidak ada data karyawan yang sesuai dengan filter periode/pencarian.";
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        {emptyText}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee ID</TableHead>
          <TableHead>Nama & Jabatan</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-center">Hadir</TableHead>
          <TableHead className="text-center">Tepat Waktu</TableHead>
          <TableHead className="text-center">Terlambat</TableHead>
          <TableHead className="text-center">Lapangan</TableHead>
          <TableHead className="text-center">Lembur (Approved)</TableHead>
          <TableHead className="text-center">Cuti</TableHead>
          <TableHead className="text-center">Sakit</TableHead>
          <TableHead className="text-center">Izin</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recaps.map((r) => (
          <TableRow key={r.employeeId}>
            <TableCell className="font-mono text-xs font-semibold">
              {r.employeeId}
            </TableCell>
            <TableCell>
              <div className="font-medium">{r.fullName}</div>
              <div className="text-xs text-muted-foreground">{r.jobTitle}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline" className="text-xs">
                {formatEmploymentStatusLabel(r.employmentStatus)}
              </Badge>
            </TableCell>
            <TableCell className="text-center font-medium">
              {r.presentDays} hari
            </TableCell>
            <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-medium">
              {r.onTimeDays}
            </TableCell>
            <TableCell className="text-center text-amber-600 dark:text-amber-400">
              {r.lateCount}x ({r.lateMinutes} mnt)
            </TableCell>
            <TableCell className="text-center">{r.fieldDays}</TableCell>
            <TableCell className="text-center text-primary font-medium">
              {formatDurationMinutesLabel(r.overtimeMinutes)}
            </TableCell>
            <TableCell className="text-center font-medium">
              {r.annualLeaveDays} hr
            </TableCell>
            <TableCell className="text-center">{r.sickLeaveDays} hr</TableCell>
            <TableCell className="text-center">{r.permissionDays} hr</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface AttendanceLogTableProps {
  readonly items: readonly RawAttendanceRecord[];
}

function AttendanceLogTable({ items }: Readonly<AttendanceLogTableProps>) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Belum ada log presensi pada rentang tanggal ini.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tanggal & Jam (WIB)</TableHead>
          <TableHead>Employee ID</TableHead>
          <TableHead>Nama Karyawan</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Lokasi & Jarak</TableHead>
          <TableHead>Status Jadwal</TableHead>
          <TableHead>Approval</TableHead>
          <TableHead>Catatan</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((ev) => (
          <TableRow key={ev.id}>
            <TableCell className="font-mono text-xs">
              {ev.wibDate} • {ev.wibTime} WIB
            </TableCell>
            <TableCell className="font-mono text-xs font-semibold">
              {ev.employeeId}
            </TableCell>
            <TableCell className="font-medium">{ev.fullName}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {ev.eventType === "check_in" ? "Absen Masuk" : "Absen Pulang"}
              </Badge>
            </TableCell>
            <TableCell className="text-xs">
              {ev.locationType === "office" ? "Kantor" : "Lapangan"} (
              {ev.distanceMeters} m)
            </TableCell>
            <TableCell className="text-xs font-medium">{ev.status}</TableCell>
            <TableCell>
              <Badge variant={getApprovalBadgeVariant(ev.approvalStatus)}>
                {formatApprovalStatusLabel(ev.approvalStatus)}
              </Badge>
            </TableCell>
            <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
              {ev.note || "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

interface ServiceRequestsLogTableProps {
  readonly items: readonly RawServiceRecord[];
}

function ServiceRequestsLogTable({
  items,
}: Readonly<ServiceRequestsLogTableProps>) {
  if (items.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Belum ada pengajuan cuti, izin, atau lembur pada rentang tanggal ini.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Periode Tanggal</TableHead>
          <TableHead>Employee ID</TableHead>
          <TableHead>Nama Karyawan</TableHead>
          <TableHead>Jenis Layanan</TableHead>
          <TableHead>Durasi / Hari Kerja</TableHead>
          <TableHead>Lokasi / Klien</TableHead>
          <TableHead>Alasan / Tugas</TableHead>
          <TableHead>Status Approval</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((sr) => {
          const period =
            sr.startDate === sr.endDate
              ? sr.startDate
              : `${sr.startDate} s/d ${sr.endDate}`;
          return (
            <TableRow key={sr.id}>
              <TableCell className="font-mono text-xs">{period}</TableCell>
              <TableCell className="font-mono text-xs font-semibold">
                {sr.employeeId}
              </TableCell>
              <TableCell className="font-medium">{sr.fullName}</TableCell>
              <TableCell>
                <Badge variant="outline">
                  {formatServiceTypeLabel(sr.type)}
                </Badge>
              </TableCell>
              <TableCell className="text-xs font-semibold">
                {sr.durationOrDays || `${sr.workingDaysCount} Hari`}
              </TableCell>
              <TableCell className="text-xs">
                {sr.clientOrLocation || "-"}
              </TableCell>
              <TableCell className="max-w-[220px] truncate text-xs text-muted-foreground">
                {sr.reason || "-"}
              </TableCell>
              <TableCell>
                <Badge variant={getApprovalBadgeVariant(sr.status)}>
                  {formatApprovalStatusLabel(sr.status)}
                </Badge>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

export function ReportsPage() {
  const initialBounds = useMemo(() => getCurrentWibMonthBounds(), []);
  const [monthFilter, setMonthFilter] = useState(initialBounds.monthValue);
  const [startDate, setStartDate] = useState(initialBounds.startDate);
  const [endDate, setEndDate] = useState(initialBounds.endDate);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] =
    useState<ReportTabMode>("rekap_kehadiran");

  const [employees, setEmployees] = useState<RawEmployeeRecord[]>([]);
  const [attendanceEvents, setAttendanceEvents] = useState<
    RawAttendanceRecord[]
  >([]);
  const [serviceRequests, setServiceRequests] = useState<RawServiceRecord[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    void preloadBrandLogoForPdf();
    const unsubscribe = subscribeReportSources({
      onUsers: (users) => {
        setEmployees(users);
        setLoading(false);
      },
      onAttendance: (events) => {
        setAttendanceEvents(events);
        setLoading(false);
      },
      onServices: (services) => {
        setServiceRequests(services);
        setLoading(false);
      },
      onError: () => {
        setLoading(false);
      },
    });
    return () => unsubscribe();
  }, []);

  const aggregate = useMemo(
    () =>
      buildReportAggregate({
        employees,
        attendanceEvents,
        serviceRequests,
        startDate,
        endDate,
        searchQuery,
      }),
    [
      employees,
      attendanceEvents,
      serviceRequests,
      startDate,
      endDate,
      searchQuery,
    ],
  );

  const periodLabel = `${startDate} s/d ${endDate}`;
  const fileSlug = `${startDate}_sd_${endDate}`;

  const handleMonthChange = (value: string) => {
    setMonthFilter(value);
    const bounds = getMonthBoundsFromMonthValue(value);
    if (bounds) {
      setStartDate(bounds.startDate);
      setEndDate(bounds.endDate);
    }
  };

  const handleResetFilters = () => {
    setMonthFilter(initialBounds.monthValue);
    setStartDate(initialBounds.startDate);
    setEndDate(initialBounds.endDate);
    setSearchQuery("");
  };

  const handleExportCsv = () => {
    const filename = exportReportCsv({
      mode: activeTab,
      aggregate,
      periodLabel,
      fileSlug,
    });
    setFeedbackMessage(`Berhasil mengunduh dokumen CSV: ${filename}`);
    window.setTimeout(() => setFeedbackMessage(null), 4_500);
  };

  const handleExportPdf = async () => {
    const filename = await exportReportPdf({
      mode: activeTab,
      aggregate,
      periodLabel,
      fileSlug,
    });
    setFeedbackMessage(
      `Berhasil mengunduh dokumen PDF Resmi berlogo PT Kuda Prima: ${filename}`,
    );
    window.setTimeout(() => setFeedbackMessage(null), 4_500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3.5">
          <div className="hidden sm:flex items-center justify-center rounded-xl border bg-card p-2 shadow-xs">
            <BrandLogo compact />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Laporan Rekapitulasi Kehadiran & Layanan
            </h1>
            <p className="text-sm text-muted-foreground">
              Rekapitulasi real-time kehadiran, keterlambatan, lembur, serta cuti
              dan izin karyawan beserta ekspor CSV (Excel) & PDF Resmi berlogo PT
              Kuda Prima.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={() => window.print()}
          >
            <Printer className="size-4" />
            Cetak
          </Button>
          <Button
            type="button"
            variant="outline"
            className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
            onClick={handleExportCsv}
          >
            <Download className="size-4" />
            Ekspor CSV (Excel)
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => {
              void handleExportPdf();
            }}
          >
            <FileText className="size-4" />
            Ekspor PDF Resmi
          </Button>
        </div>
      </div>

      {feedbackMessage && (
        <output className="block rounded-lg border bg-emerald-500/10 border-emerald-500/20 p-3 text-sm font-medium text-emerald-700 dark:text-emerald-400">
          {feedbackMessage}
        </output>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
            <div className="space-y-1.5">
              <Label htmlFor="report-month-picker" className="text-xs">
                Pilih Bulan Cepat
              </Label>
              <Input
                id="report-month-picker"
                type="month"
                value={monthFilter}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-start-date" className="text-xs">
                Tanggal Mulai
              </Label>
              <Input
                id="report-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-end-date" className="text-xs">
                Tanggal Selesai
              </Label>
              <Input
                id="report-end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-employee-search" className="text-xs">
                Cari Karyawan / ID / Jabatan
              </Label>
              <div className="relative">
                <Search className="size-4 text-muted-foreground absolute left-2.5 top-2.5" />
                <Input
                  id="report-employee-search"
                  placeholder="Nama, KP-000..., Jabatan"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Button
                type="button"
                variant="ghost"
                className="w-full gap-1.5 text-xs"
                onClick={handleResetFilters}
              >
                <RotateCcw className="size-3.5" />
                Reset Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Total Karyawan</span>
              <Users className="size-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl">
              {aggregate.totals.totalEmployees} Orang
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Periode {periodLabel}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Total Kehadiran & Lapangan</span>
              <CalendarRange className="size-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl">
              {aggregate.totals.totalPresentDays} Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Termasuk {aggregate.totals.totalFieldDays} hari tugas lapangan
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Akumulasi Keterlambatan</span>
              <Clock className="size-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl">
              {aggregate.totals.totalLateCount}x (
              {aggregate.totals.totalLateMinutes} mnt)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Dihitung dari check-in berstatus terlambat
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center justify-between text-xs">
              <span>Lembur & Cuti/Izin (Approved)</span>
              <FileSpreadsheet className="size-4 text-primary" />
            </CardDescription>
            <CardTitle className="text-2xl">
              {formatDurationMinutesLabel(
                aggregate.totals.totalOvertimeMinutes,
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Total Cuti/Sakit/Izin Disetujui:{" "}
            {aggregate.totals.totalLeaveAndSickDays} Hari
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as ReportTabMode)}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[580px]">
          <TabsTrigger value="rekap_kehadiran">
            Rekap Kehadiran ({aggregate.recaps.length})
          </TabsTrigger>
          <TabsTrigger value="log_presensi">
            Log Presensi ({aggregate.filteredAttendance.length})
          </TabsTrigger>
          <TabsTrigger value="log_layanan">
            Log Cuti & Lembur ({aggregate.filteredServices.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rekap_kehadiran">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileSpreadsheet className="size-5 text-primary" />
                Rekapitulasi Kehadiran, Cuti & Lembur Karyawan ({periodLabel})
              </CardTitle>
              <CardDescription>
                Data dihitung otomatis secara real-time dari koleksi{" "}
                <code>users</code>, <code>attendanceEvents</code>, dan{" "}
                <code>serviceRequests</code> (lembur/cuti yang telah disetujui
                Admin).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceRecapTable
                recaps={aggregate.recaps}
                loading={loading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log_presensi">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarRange className="size-5 text-primary" />
                Rincian Log Presensi Masuk & Pulang ({periodLabel})
              </CardTitle>
              <CardDescription>
                Daftar seluruh event presensi masuk dan pulang pada periode
                terpilih. Klik tombol Ekspor CSV atau PDF di atas untuk mengunduh
                rincian log ini.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AttendanceLogTable items={aggregate.filteredAttendance} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="log_layanan">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="size-5 text-primary" />
                Rincian Pengajuan Cuti, Izin Sakit & Lembur ({periodLabel})
              </CardTitle>
              <CardDescription>
                Daftar permohonan layanan karyawan beserta durasi hari kerja
                efektif / menit lembur dan status persetujuannya.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ServiceRequestsLogTable items={aggregate.filteredServices} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
