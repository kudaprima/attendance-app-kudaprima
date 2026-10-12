import brandLogoUrl from "../../../../../assets/branding/pt-kuda-prima-logo.png";
import type {
  EmployeePayrollRecap,
  RawServiceRecord,
  ReportAggregateResult,
} from "./report-repository";

export type ReportTabMode = "rekap_kehadiran" | "log_presensi" | "log_layanan";

export interface PdfLogoJpegAsset {
  readonly bytes: Uint8Array;
  readonly width: number;
  readonly height: number;
}

// Minimal valid 1x1 RGB JPEG fallback for headless test environments (jsdom) without Canvas 2D
const FALLBACK_1X1_JPEG_BYTES = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01,
  0x01, 0x00, 0x60, 0x00, 0x60, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08,
  0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a,
  0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d,
  0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22,
  0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34,
  0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0,
  0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x01, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11,
  0x01, 0x03, 0x11, 0x01, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01,
  0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4,
  0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04, 0x03, 0x05, 0x05,
  0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05,
  0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
  0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24,
  0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26,
  0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44,
  0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
  0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76,
  0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92,
  0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6,
  0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba,
  0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5,
  0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8,
  0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff,
  0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
  0xfb, 0xd2, 0x8a, 0x28, 0x03, 0xff, 0xd9,
]);

let cachedLogoAsset: PdfLogoJpegAsset | null = null;

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i += 1) {
    bytes[i] = binaryString.charCodeAt(i) & 0xff;
  }
  return bytes;
}

export function preloadBrandLogoForPdf(): Promise<PdfLogoJpegAsset> {
  if (cachedLogoAsset) {
    return Promise.resolve(cachedLogoAsset);
  }
  const fallbackAsset: PdfLogoJpegAsset = {
    bytes: FALLBACK_1X1_JPEG_BYTES,
    width: 320,
    height: 100,
  };
  if (typeof document === "undefined" || typeof Image === "undefined") {
    return Promise.resolve(fallbackAsset);
  }

  // In headless test environments (e.g., jsdom) where Canvas 2D is unavailable, resolve immediately
  try {
    const probeCanvas = document.createElement("canvas");
    if (typeof probeCanvas.getContext !== "function" || !probeCanvas.getContext("2d")) {
      return Promise.resolve(fallbackAsset);
    }
  } catch {
    return Promise.resolve(fallbackAsset);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (asset: PdfLogoJpegAsset) => {
      if (settled) return;
      settled = true;
      resolve(asset);
    };

    const timer = window.setTimeout(() => finish(fallbackAsset), 800);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const targetWidth = img.naturalWidth > 0 ? img.naturalWidth : 360;
        const targetHeight = img.naturalHeight > 0 ? img.naturalHeight : 110;
        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          finish({
            bytes: FALLBACK_1X1_JPEG_BYTES,
            width: targetWidth,
            height: targetHeight,
          });
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetWidth, targetHeight);
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.94);
        const base64Part = dataUrl.split(",")[1];
        if (!base64Part) {
          finish({
            bytes: FALLBACK_1X1_JPEG_BYTES,
            width: targetWidth,
            height: targetHeight,
          });
          return;
        }
        cachedLogoAsset = {
          bytes: base64ToUint8Array(base64Part),
          width: targetWidth,
          height: targetHeight,
        };
        finish(cachedLogoAsset);
      } catch {
        finish(fallbackAsset);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(fallbackAsset);
    };
    img.src = brandLogoUrl;
  });
}

export function getDocumentFilenamePrefix(mode: ReportTabMode): string {
  if (mode === "log_presensi") {
    return "Log_Presensi_Harian_PT_Kuda_Prima";
  }
  if (mode === "log_layanan") {
    return "Log_Cuti_Izin_dan_Lembur_PT_Kuda_Prima";
  }
  return "Rekap_Kehadiran_dan_Layanan_PT_Kuda_Prima";
}

export function getReportModeLabel(mode: ReportTabMode): string {
  if (mode === "log_presensi") {
    return "Log Presensi Harian";
  }
  if (mode === "log_layanan") {
    return "Log Cuti, Izin & Lembur";
  }
  return "Rekapitulasi Kehadiran & Layanan";
}

function sanitizeCsvCell(value: string | number): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerFileDownload(
  content: BlobPart,
  mimeType: string,
  filename: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const hasCreateObjectUrl =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function";

  const href = hasCreateObjectUrl
    ? URL.createObjectURL(blob)
    : `data:${mimeType};charset=utf-8,${encodeURIComponent(typeof content === "string" ? content : "")}`;

  const link = document.createElement("a");
  link.setAttribute("href", href);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (hasCreateObjectUrl && typeof URL.revokeObjectURL === "function") {
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
  }
}

export function formatEmploymentStatusLabel(status: string): string {
  if (status === "permanent") return "Tetap";
  if (status === "contract") return "Kontrak";
  if (status === "intern") return "Magang";
  return status;
}

export function formatServiceTypeLabel(
  type: RawServiceRecord["type"],
): string {
  if (type === "annual_leave") return "Cuti Tahunan";
  if (type === "sick_leave") return "Izin Sakit";
  if (type === "overtime") return "Lembur";
  return "Izin Khusus";
}

export function formatApprovalStatusLabel(status: string): string {
  if (status === "approved") return "Disetujui";
  if (status === "rejected") return "Ditolak";
  if (status === "not_required") return "Otomatis Valid";
  return "Menunggu";
}

export function buildCsvString(params: {
  mode: ReportTabMode;
  aggregate: ReportAggregateResult;
  periodLabel: string;
}): string {
  const { mode, aggregate, periodLabel } = params;
  const metaHeader = [
    ["PT KUDA PRIMA - LAPORAN REKAPITULASI KEHADIRAN & LAYANAN KARYAWAN"],
    [`Jenis Dokumen: ${getReportModeLabel(mode)}`],
    [`Periode Laporan: ${periodLabel}`],
    [],
  ];

  if (mode === "log_presensi") {
    const headers = [
      "Tanggal WIB",
      "Jam WIB",
      "Employee ID",
      "Nama Karyawan",
      "Jenis Presensi",
      "Tipe Lokasi",
      "Jarak Kantor (m)",
      "Status Jadwal",
      "Status Persetujuan",
      "Catatan",
    ];
    const rows = aggregate.filteredAttendance.map((ev) => [
      ev.wibDate,
      ev.wibTime,
      ev.employeeId,
      ev.fullName,
      ev.eventType === "check_in" ? "Absen Masuk" : "Absen Pulang",
      ev.locationType === "office" ? "Kantor" : "Lapangan",
      ev.distanceMeters,
      ev.status,
      formatApprovalStatusLabel(ev.approvalStatus),
      ev.note || "-",
    ]);
    return [...metaHeader, headers, ...rows]
      .map((row) => row.map(sanitizeCsvCell).join(","))
      .join("\r\n");
  }

  if (mode === "log_layanan") {
    const headers = [
      "Tanggal Mulai",
      "Tanggal Selesai",
      "Employee ID",
      "Nama Karyawan",
      "Jabatan",
      "Jenis Pengajuan",
      "Durasi / Hari Kerja",
      "Klien / Lokasi",
      "Alasan / Deskripsi Tugas",
      "Status Approval",
      "Disetujui Oleh",
    ];
    const rows = aggregate.filteredServices.map((sr) => [
      sr.startDate,
      sr.endDate,
      sr.employeeId,
      sr.fullName,
      sr.jobTitle || "-",
      formatServiceTypeLabel(sr.type),
      sr.durationOrDays || `${sr.workingDaysCount} Hari`,
      sr.clientOrLocation || "-",
      sr.reason || "-",
      formatApprovalStatusLabel(sr.status),
      sr.approvedByName || "-",
    ]);
    return [...metaHeader, headers, ...rows]
      .map((row) => row.map(sanitizeCsvCell).join(","))
      .join("\r\n");
  }

  const headers = [
    "Employee ID",
    "Nama Karyawan",
    "Jabatan",
    "Status Kerja",
    "Hari Hadir",
    "Tepat Waktu (Hari)",
    "Terlambat (Kali)",
    "Total Keterlambatan (Menit)",
    "Pulang Awal (Kali)",
    "Presensi Lapangan (Hari)",
    "Lembur Disetujui (Menit)",
    "Cuti Tahunan Disetujui (Hari)",
    "Izin Sakit Disetujui (Hari)",
    "Izin Khusus Disetujui (Hari)",
  ];

  const rows = aggregate.recaps.map((r: EmployeePayrollRecap) => [
    r.employeeId,
    r.fullName,
    r.jobTitle,
    formatEmploymentStatusLabel(r.employmentStatus),
    r.presentDays,
    r.onTimeDays,
    r.lateCount,
    r.lateMinutes,
    r.earlyDepartureCount,
    r.fieldDays,
    r.overtimeMinutes,
    r.annualLeaveDays,
    r.sickLeaveDays,
    r.permissionDays,
  ]);

  return [...metaHeader, headers, ...rows]
    .map((row) => row.map(sanitizeCsvCell).join(","))
    .join("\r\n");
}

export function exportReportCsv(params: {
  mode: ReportTabMode;
  aggregate: ReportAggregateResult;
  periodLabel: string;
  fileSlug: string;
}): string {
  const csvBody = buildCsvString(params);
  const bomCsv = `\uFEFF${csvBody}`;
  const filename = `${getDocumentFilenamePrefix(params.mode)}_${params.fileSlug}.csv`;
  triggerFileDownload(bomCsv, "text/csv;charset=utf-8", filename);
  return filename;
}

function escapePdfText(input: string): string {
  return input
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, Math.max(maxChars - 2, 1))}..`;
}

interface PdfTableColumn {
  readonly header: string;
  readonly width: number;
  readonly maxChars: number;
}

function getColumnsAndRowsForMode(
  mode: ReportTabMode,
  aggregate: ReportAggregateResult,
): {
  title: string;
  columns: PdfTableColumn[];
  rows: string[][];
} {
  if (mode === "log_presensi") {
    return {
      title: "LAPORAN RINCIAN LOG PRESENSI HARIAN KARYAWAN",
      columns: [
        { header: "Tanggal", width: 68, maxChars: 12 },
        { header: "Jam WIB", width: 52, maxChars: 8 },
        { header: "ID Karyawan", width: 72, maxChars: 12 },
        { header: "Nama Lengkap", width: 145, maxChars: 26 },
        { header: "Jenis", width: 62, maxChars: 10 },
        { header: "Lokasi", width: 78, maxChars: 14 },
        { header: "Status Jadwal", width: 85, maxChars: 15 },
        { header: "Approval", width: 75, maxChars: 13 },
        { header: "Catatan Lapangan", width: 145, maxChars: 26 },
      ],
      rows: aggregate.filteredAttendance.map((ev) => [
        ev.wibDate,
        ev.wibTime,
        ev.employeeId,
        ev.fullName,
        ev.eventType === "check_in" ? "Masuk" : "Pulang",
        `${ev.locationType === "office" ? "Kantor" : "Lapangan"} (${ev.distanceMeters}m)`,
        ev.status,
        formatApprovalStatusLabel(ev.approvalStatus),
        ev.note || "-",
      ]),
    };
  }

  if (mode === "log_layanan") {
    return {
      title: "LAPORAN RINCIAN PENGAJUAN CUTI, IZIN SAKIT & LEMBUR",
      columns: [
        { header: "Mulai", width: 68, maxChars: 11 },
        { header: "Selesai", width: 68, maxChars: 11 },
        { header: "ID Karyawan", width: 70, maxChars: 12 },
        { header: "Nama Lengkap", width: 130, maxChars: 23 },
        { header: "Jenis Layanan", width: 85, maxChars: 15 },
        { header: "Durasi / Hari", width: 85, maxChars: 15 },
        { header: "Lokasi / Klien", width: 100, maxChars: 18 },
        { header: "Alasan / Tugas", width: 110, maxChars: 20 },
        { header: "Status", width: 66, maxChars: 12 },
      ],
      rows: aggregate.filteredServices.map((sr) => [
        sr.startDate,
        sr.endDate,
        sr.employeeId,
        sr.fullName,
        formatServiceTypeLabel(sr.type),
        sr.durationOrDays || `${sr.workingDaysCount} Hari`,
        sr.clientOrLocation || "-",
        sr.reason || "-",
        formatApprovalStatusLabel(sr.status),
      ]),
    };
  }

  return {
    title: "LAPORAN REKAPITULASI KEHADIRAN, CUTI & LEMBUR KARYAWAN",
    columns: [
      { header: "ID Karyawan", width: 68, maxChars: 11 },
      { header: "Nama Karyawan", width: 138, maxChars: 24 },
      { header: "Jabatan", width: 110, maxChars: 19 },
      { header: "Status", width: 56, maxChars: 10 },
      { header: "Hadir", width: 48, maxChars: 8 },
      { header: "Tepat", width: 48, maxChars: 8 },
      { header: "Telat (Mnt)", width: 68, maxChars: 11 },
      { header: "Lapangan", width: 58, maxChars: 9 },
      { header: "Lembur", width: 68, maxChars: 11 },
      { header: "Cuti", width: 42, maxChars: 6 },
      { header: "Sakit", width: 42, maxChars: 6 },
      { header: "Izin", width: 36, maxChars: 6 },
    ],
    rows: aggregate.recaps.map((r) => [
      r.employeeId,
      r.fullName,
      r.jobTitle,
      formatEmploymentStatusLabel(r.employmentStatus),
      `${r.presentDays} hr`,
      `${r.onTimeDays} hr`,
      `${r.lateCount}x (${r.lateMinutes}m)`,
      `${r.fieldDays} hr`,
      `${r.overtimeMinutes} mnt`,
      `${r.annualLeaveDays} hr`,
      `${r.sickLeaveDays} hr`,
      `${r.permissionDays} hr`,
    ]),
  };
}

function encodeAscii(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i += 1) {
    bytes[i] = str.charCodeAt(i) & 0xff;
  }
  return bytes;
}

function concatUint8Arrays(chunks: readonly Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const chunk of chunks) {
    totalLength += chunk.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

export function generateOfficialPdfBytes(params: {
  mode: ReportTabMode;
  aggregate: ReportAggregateResult;
  periodLabel: string;
  printedAtWib: string;
  logo?: PdfLogoJpegAsset;
}): Uint8Array {
  const { mode, aggregate, periodLabel, printedAtWib } = params;
  const logo = params.logo ??
    cachedLogoAsset ?? {
      bytes: FALLBACK_1X1_JPEG_BYTES,
      width: 320,
      height: 100,
    };
  const { title, columns, rows } = getColumnsAndRowsForMode(mode, aggregate);

  const pageWidth = 842; // A4 Landscape width in pt
  const pageHeight = 595; // A4 Landscape height in pt
  const marginX = 30;
  const tableWidth = 782;
  const rowsPerPage = 15;

  // Compute aspect-preserved logo dimensions inside the letterhead (max height 36 pt, max width 115 pt)
  const rawAspect = logo.width > 0 && logo.height > 0 ? logo.width / logo.height : 3.2;
  const logoDrawHeight = 36;
  const logoDrawWidth = Math.min(Math.round(logoDrawHeight * rawAspect), 118);

  const effectiveRows =
    rows.length > 0
      ? rows
      : [["-", "Tidak ada data pada periode ini", "-", "-", "-", "-", "-", "-", "-"]];

  const pageChunks: string[][][] = [];
  for (let i = 0; i < effectiveRows.length; i += rowsPerPage) {
    pageChunks.push(effectiveRows.slice(i, i + rowsPerPage));
  }

  const pageStreams: string[] = pageChunks.map((chunk, pageIndex) => {
    const ops: string[] = [];

    // 1. Official Letterhead (Kop Dokumen Resmi PT Kuda Prima)
    // White header box with embedded PT Kuda Prima Logo on the left
    ops.push("1 1 1 rg");
    ops.push(`${marginX} 520 ${tableWidth} 50 re f`);

    // Draw embedded PT Kuda Prima Logo XObject (/ImLogo) at top-left
    ops.push(
      `q ${logoDrawWidth} 0 0 ${logoDrawHeight} ${marginX + 6} 528 cm /ImLogo Do Q`,
    );

    // Company Name, Report Title & Metadata next to the logo
    const titleX = marginX + logoDrawWidth + 20;
    ops.push("0.157 0.224 0.537 rg"); // #283989 Brand Navy
    ops.push(
      `BT /F2 13 Tf ${titleX} 552 Td (${escapePdfText("PT KUDA PRIMA")}) Tj ET`,
    );
    ops.push("0.12 0.16 0.22 rg");
    ops.push(
      `BT /F2 10.5 Tf ${titleX} 538 Td (${escapePdfText(title)}) Tj ET`,
    );
    ops.push("0.38 0.43 0.50 rg");
    ops.push(
      `BT /F1 8.5 Tf ${titleX} 525 Td (${escapePdfText(`Periode: ${periodLabel}   |   Dicetak: ${printedAtWib}   |   Halaman ${pageIndex + 1} dari ${pageChunks.length}`)}) Tj ET`,
    );

    // Dual Brand Divider Line under Letterhead (#283989 Navy + #F25923 Orange)
    ops.push("0.157 0.224 0.537 rg");
    ops.push(`${marginX} 517 ${Math.round(tableWidth * 0.72)} 3 re f`);
    ops.push("0.949 0.349 0.137 rg");
    ops.push(
      `${marginX + Math.round(tableWidth * 0.72)} 517 ${tableWidth - Math.round(tableWidth * 0.72)} 3 re f`,
    );

    // 2. Summary KPI Strip
    const kpiItems = [
      `Total Karyawan: ${aggregate.totals.totalEmployees} Orang`,
      `Total Kehadiran: ${aggregate.totals.totalPresentDays} Hari`,
      `Total Keterlambatan: ${aggregate.totals.totalLateCount}x (${aggregate.totals.totalLateMinutes} Menit)`,
      `Total Lembur Disetujui: ${aggregate.totals.totalOvertimeMinutes} Menit`,
      `Total Cuti/Sakit/Izin: ${aggregate.totals.totalLeaveAndSickDays} Hari`,
    ];
    ops.push("0.969 0.980 0.988 rg");
    ops.push(`${marginX} 488 ${tableWidth} 22 re f`);
    ops.push("0.82 0.86 0.90 RG 0.6 w");
    ops.push(`${marginX} 488 ${tableWidth} 22 re S`);
    ops.push("0.15 0.20 0.30 rg");
    ops.push(
      `BT /F2 8.5 Tf ${marginX + 10} 496 Td (${escapePdfText(kpiItems.join("     |     "))}) Tj ET`,
    );

    // 3. Table Header Row
    const tableTopY = 458;
    const rowHeight = 20;
    ops.push("0.157 0.224 0.537 rg");
    ops.push(`${marginX} ${tableTopY} ${tableWidth} 22 re f`);

    let cursorX = marginX + 6;
    ops.push("1 1 1 rg");
    for (const col of columns) {
      ops.push(
        `BT /F2 8 Tf ${cursorX} ${tableTopY + 7} Td (${escapePdfText(col.header)}) Tj ET`,
      );
      cursorX += col.width;
    }

    // 4. Table Body Rows
    chunk.forEach((row, rowIndex) => {
      const rowY = tableTopY - (rowIndex + 1) * rowHeight;
      if (rowIndex % 2 === 1) {
        ops.push("0.965 0.975 0.988 rg");
        ops.push(`${marginX} ${rowY} ${tableWidth} ${rowHeight} re f`);
      }
      ops.push("0.88 0.90 0.93 RG 0.4 w");
      ops.push(`${marginX} ${rowY} ${tableWidth} ${rowHeight} re S`);

      let cellX = marginX + 6;
      ops.push("0.12 0.16 0.22 rg");
      columns.forEach((col, colIdx) => {
        const rawCell = row[colIdx] ?? "-";
        const text = truncateText(rawCell, col.maxChars);
        ops.push(
          `BT /F1 8 Tf ${cellX} ${rowY + 6} Td (${escapePdfText(text)}) Tj ET`,
        );
        cellX += col.width;
      });
    });

    // 5. Footer & Official Signature Block on the last page
    ops.push("0.45 0.50 0.56 rg");
    ops.push(
      `BT /F1 7.5 Tf ${marginX} 34 Td (${escapePdfText("Dokumen resmi ini dihasilkan secara otomatis dari Sistem Presensi & Layanan PT Kuda Prima (Event Presensi & Audit Log Immutable).")}) Tj ET`,
    );

    if (pageIndex === pageChunks.length - 1) {
      const signX = pageWidth - marginX - 190;
      ops.push("0.15 0.20 0.30 rg");
      ops.push(
        `BT /F2 8.5 Tf ${signX} 92 Td (${escapePdfText("Mengetahui & Menyetujui,")}) Tj ET`,
      );
      ops.push(
        `BT /F1 8 Tf ${signX} 80 Td (${escapePdfText("HR / Administrator PT Kuda Prima")}) Tj ET`,
      );
      ops.push("0.20 0.25 0.35 RG 0.7 w");
      ops.push(`${signX} 42 ${signX + 165} 42 l S`);
      ops.push(
        `BT /F1 7.5 Tf ${signX} 31 Td (${escapePdfText("Tanda Tangan & Stempel Resmi")}) Tj ET`,
      );
    }

    return ops.join("\n");
  });

  // Object layout:
  // 1: Catalog
  // 2: Pages
  // 3: Font F1 (Helvetica)
  // 4: Font F2 (Helvetica-Bold)
  // 5: XObject ImLogo (Official PT Kuda Prima JPEG Image)
  // For each page i: Page object = 6 + i*2, Content stream = 7 + i*2
  const objectBuffers: Uint8Array[] = [];
  const pageObjectIds: number[] = [];

  for (let i = 0; i < pageStreams.length; i += 1) {
    pageObjectIds.push(6 + i * 2);
  }

  objectBuffers.push(
    encodeAscii("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"),
  );
  objectBuffers.push(
    encodeAscii(
      `2 0 obj\n<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>\nendobj\n`,
    ),
  );
  objectBuffers.push(
    encodeAscii(
      "3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n",
    ),
  );
  objectBuffers.push(
    encodeAscii(
      "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n",
    ),
  );

  // Object 5: Embedded PT Kuda Prima Logo Image XObject (/ImLogo)
  const logoHeader = encodeAscii(
    `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`,
  );
  const logoFooter = encodeAscii("\nendstream\nendobj\n");
  objectBuffers.push(concatUint8Arrays([logoHeader, logo.bytes, logoFooter]));

  pageStreams.forEach((stream, i) => {
    const pageObjId = 6 + i * 2;
    const contentObjId = 7 + i * 2;
    objectBuffers.push(
      encodeAscii(
        `${pageObjId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << /ImLogo 5 0 R >> >> /Contents ${contentObjId} 0 R >>\nendobj\n`,
      ),
    );
    objectBuffers.push(
      encodeAscii(
        `${contentObjId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
      ),
    );
  });

  const headerChunk = encodeAscii("%PDF-1.4\n");
  const allChunks: Uint8Array[] = [headerChunk];
  const offsets: number[] = [0];
  let currentByteOffset = headerChunk.length;

  for (const objBuf of objectBuffers) {
    offsets.push(currentByteOffset);
    allChunks.push(objBuf);
    currentByteOffset += objBuf.length;
  }

  const xrefOffset = currentByteOffset;
  let trailerStr = `xref\n0 ${objectBuffers.length + 1}\n`;
  trailerStr += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    const padded = String(offsets[i]).padStart(10, "0");
    trailerStr += `${padded} 00000 n \n`;
  }
  trailerStr += `trailer\n<< /Size ${objectBuffers.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  allChunks.push(encodeAscii(trailerStr));
  return concatUint8Arrays(allChunks);
}

export function generateOfficialPdfString(params: {
  mode: ReportTabMode;
  aggregate: ReportAggregateResult;
  periodLabel: string;
  printedAtWib: string;
  logo?: PdfLogoJpegAsset;
}): string {
  const bytes = generateOfficialPdfBytes(params);
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return out;
}

export async function exportReportPdf(params: {
  mode: ReportTabMode;
  aggregate: ReportAggregateResult;
  periodLabel: string;
  fileSlug: string;
}): Promise<string> {
  const logo = await preloadBrandLogoForPdf();
  const printedAtWib = new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());

  const pdfBytes = generateOfficialPdfBytes({
    mode: params.mode,
    aggregate: params.aggregate,
    periodLabel: params.periodLabel,
    printedAtWib: `${printedAtWib} WIB`,
    logo,
  });

  const filename = `${getDocumentFilenamePrefix(params.mode)}_${params.fileSlug}.pdf`;
  triggerFileDownload(
    pdfBytes.buffer as ArrayBuffer,
    "application/pdf",
    filename,
  );
  return filename;
}
