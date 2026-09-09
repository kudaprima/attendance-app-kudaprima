import { useState } from "react";
import { Download, FileSpreadsheet } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface PayrollSummary {
  employeeId: string;
  fullName: string;
  presentDays: number;
  onTimeDays: number;
  lateMinutes: number;
  fieldDays: number;
  overtimeMinutes: number;
  leaveDays: number;
  sickDays: number;
}

const mockSummaries: PayrollSummary[] = [
  {
    employeeId: "KP-000001",
    fullName: "Teknisi Development",
    presentDays: 5,
    onTimeDays: 5,
    lateMinutes: 0,
    fieldDays: 3,
    overtimeMinutes: 180,
    leaveDays: 0,
    sickDays: 1,
  },
  {
    employeeId: "KP-000002",
    fullName: "Supervisor Development",
    presentDays: 5,
    onTimeDays: 4,
    lateMinutes: 25,
    fieldDays: 0,
    overtimeMinutes: 60,
    leaveDays: 0,
    sickDays: 0,
  },
];

export function ReportsPage() {
  const [downloading, setDownloading] = useState(false);

  const exportCSV = () => {
    setDownloading(true);
    const headers = [
      "Employee ID",
      "Nama Karyawan",
      "Hari Hadir",
      "Tepat Waktu",
      "Keterlambatan (Menit)",
      "Presensi Lapangan",
      "Lembur (Menit)",
      "Cuti Tahunan",
      "Izin Sakit",
    ];

    const rows = mockSummaries.map((s) => [
      s.employeeId,
      `"${s.fullName}"`,
      s.presentDays,
      s.onTimeDays,
      s.lateMinutes,
      s.fieldDays,
      s.overtimeMinutes,
      s.leaveDays,
      s.sickDays,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `laporan_presensi_kuda_prima_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Laporan Presensi & Payroll
          </h1>
          <p className="text-sm text-muted-foreground">
            Rekapitulasi kehadiran, keterlambatan, lembur, dan izin untuk
            penggajian.
          </p>
        </div>
        <Button className="gap-2" onClick={exportCSV} disabled={downloading}>
          <Download className="size-4" />
          {downloading ? "Mengekspor..." : "Ekspor CSV Payroll"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-5 text-primary" />
            Rekap Periode Berjalan (September 2026)
          </CardTitle>
          <CardDescription>
            Data terhitung otomatis dari event presensi immutable yang tercatat
            di sistem.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead className="text-center">Hadir</TableHead>
                <TableHead className="text-center">Tepat Waktu</TableHead>
                <TableHead className="text-center">Terlambat</TableHead>
                <TableHead className="text-center">Lapangan</TableHead>
                <TableHead className="text-center">Lembur</TableHead>
                <TableHead className="text-center">Cuti</TableHead>
                <TableHead className="text-center">Sakit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockSummaries.map((s) => (
                <TableRow key={s.employeeId}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {s.employeeId}
                  </TableCell>
                  <TableCell className="font-medium">{s.fullName}</TableCell>
                  <TableCell className="text-center">
                    {s.presentDays} hari
                  </TableCell>
                  <TableCell className="text-center text-emerald-600 font-medium">
                    {s.onTimeDays}
                  </TableCell>
                  <TableCell className="text-center text-amber-600">
                    {s.lateMinutes} mnt
                  </TableCell>
                  <TableCell className="text-center">{s.fieldDays}</TableCell>
                  <TableCell className="text-center text-blue-600 font-medium">
                    {s.overtimeMinutes} mnt
                  </TableCell>
                  <TableCell className="text-center">{s.leaveDays}</TableCell>
                  <TableCell className="text-center">{s.sickDays}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
