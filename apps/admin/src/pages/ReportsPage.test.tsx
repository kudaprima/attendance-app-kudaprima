import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  buildCsvString,
  generateOfficialPdfString,
  getDocumentFilenamePrefix,
} from "@/features/reports/report-exporters";
import {
  buildReportAggregate,
  type RawAttendanceRecord,
  type RawEmployeeRecord,
  type RawServiceRecord,
} from "@/features/reports/report-repository";
import { ReportsPage } from "./ReportsPage";

const sampleEmployees: RawEmployeeRecord[] = [
  {
    uid: "tech-1",
    employeeId: "KP-000001",
    fullName: "Budi Santoso",
    jobTitle: "Teknisi Lapangan",
    employmentStatus: "permanent",
    employmentStartDate: "2022-01-10",
    active: true,
  },
  {
    uid: "tech-2",
    employeeId: "KP-000002",
    fullName: "Andi Pratama",
    jobTitle: "Engineer Jaringan",
    employmentStatus: "contract",
    employmentStartDate: "2024-06-01",
    active: true,
  },
];

const currentYearMonth = new Date(Date.now() + 7 * 3600 * 1000)
  .toISOString()
  .slice(0, 7);

const sampleAttendance: RawAttendanceRecord[] = [
  {
    id: "att-1",
    userId: "tech-1",
    employeeId: "KP-000001",
    fullName: "Budi Santoso",
    eventType: "check_in",
    locationType: "field",
    distanceMeters: 420,
    status: "late",
    approvalStatus: "approved",
    // 08:25 WIB = 01:25 UTC -> 25 minutes after 08:00 WIB
    capturedAt: `${currentYearMonth}-05T01:25:00.000Z`,
    wibDate: `${currentYearMonth}-05`,
    wibTime: "08:25",
    note: "Instalasi perangkat klien",
  },
  {
    id: "att-2",
    userId: "tech-2",
    employeeId: "KP-000002",
    fullName: "Andi Pratama",
    eventType: "check_in",
    locationType: "office",
    distanceMeters: 15,
    status: "normal",
    approvalStatus: "not_required",
    capturedAt: `${currentYearMonth}-05T00:50:00.000Z`,
    wibDate: `${currentYearMonth}-05`,
    wibTime: "07:50",
    note: "",
  },
];

const sampleServices: RawServiceRecord[] = [
  {
    id: "srv-1",
    userId: "tech-1",
    employeeId: "KP-000001",
    fullName: "Budi Santoso",
    jobTitle: "Teknisi Lapangan",
    type: "overtime",
    startDate: `${currentYearMonth}-06`,
    endDate: `${currentYearMonth}-06`,
    workingDaysCount: 1,
    durationMinutes: 180,
    durationOrDays: "3 Jam (180 Menit)",
    clientOrLocation: "Site PT Maju Jaya",
    reason: "Maintenance server malam",
    status: "approved",
    approvedByName: "Admin Utama",
  },
  {
    id: "srv-2",
    userId: "tech-1",
    employeeId: "KP-000001",
    fullName: "Budi Santoso",
    jobTitle: "Teknisi Lapangan",
    type: "annual_leave",
    startDate: `${currentYearMonth}-10`,
    endDate: `${currentYearMonth}-12`,
    workingDaysCount: 3,
    durationMinutes: 0,
    durationOrDays: "3 Hari Kerja",
    clientOrLocation: "",
    reason: "Acara keluarga",
    status: "approved",
    approvedByName: "Admin Utama",
  },
  {
    id: "srv-3",
    userId: "tech-2",
    employeeId: "KP-000002",
    fullName: "Andi Pratama",
    jobTitle: "Engineer Jaringan",
    type: "annual_leave",
    startDate: `${currentYearMonth}-14`,
    endDate: `${currentYearMonth}-15`,
    workingDaysCount: 2,
    durationMinutes: 0,
    durationOrDays: "2 Hari Kerja",
    clientOrLocation: "",
    reason: "Urusi dokumen",
    status: "pending",
    approvedByName: "",
  },
];

vi.mock("@/features/reports/report-repository", async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import("@/features/reports/report-repository")
    >();
  return {
    ...actual,
    subscribeReportSources: (callbacks: {
      onUsers: (u: RawEmployeeRecord[]) => void;
      onAttendance: (a: RawAttendanceRecord[]) => void;
      onServices: (s: RawServiceRecord[]) => void;
    }) => {
      callbacks.onUsers(sampleEmployees);
      callbacks.onAttendance(sampleAttendance);
      callbacks.onServices(sampleServices);
      return () => {};
    },
  };
});

describe("ReportsPage and Exporters", () => {
  it("aggregates employee attendance recap, embeds PT Kuda Prima logo in PDF 1.4, and avoids payroll filing names", () => {
    expect(getDocumentFilenamePrefix("rekap_kehadiran")).toBe(
      "Rekap_Kehadiran_dan_Layanan_PT_Kuda_Prima",
    );
    expect(getDocumentFilenamePrefix("log_presensi")).toBe(
      "Log_Presensi_Harian_PT_Kuda_Prima",
    );
    expect(getDocumentFilenamePrefix("log_layanan")).toBe(
      "Log_Cuti_Izin_dan_Lembur_PT_Kuda_Prima",
    );

    const aggregate = buildReportAggregate({
      employees: sampleEmployees,
      attendanceEvents: sampleAttendance,
      serviceRequests: sampleServices,
      startDate: `${currentYearMonth}-01`,
      endDate: `${currentYearMonth}-28`,
      searchQuery: "",
    });

    expect(aggregate.recaps).toHaveLength(2);
    const budi = aggregate.recaps.find((r) => r.employeeId === "KP-000001")!;
    expect(budi.presentDays).toBe(1);
    expect(budi.lateCount).toBe(1);
    expect(budi.lateMinutes).toBe(25);
    expect(budi.fieldDays).toBe(1);
    expect(budi.overtimeMinutes).toBe(180);
    expect(budi.annualLeaveDays).toBe(3);

    const andi = aggregate.recaps.find((r) => r.employeeId === "KP-000002")!;
    expect(andi.annualLeaveDays).toBe(0);
    expect(andi.onTimeDays).toBe(1);

    const csv = buildCsvString({
      mode: "rekap_kehadiran",
      aggregate,
      periodLabel: `${currentYearMonth}-01 s/d ${currentYearMonth}-28`,
    });
    expect(csv).toContain(
      "PT KUDA PRIMA - LAPORAN REKAPITULASI KEHADIRAN & LAYANAN KARYAWAN",
    );
    expect(csv).toContain(
      "KP-000001,Budi Santoso,Teknisi Lapangan,Tetap,1,0,1,25,0,1,180,3,0,0",
    );

    const pdf = generateOfficialPdfString({
      mode: "rekap_kehadiran",
      aggregate,
      periodLabel: `${currentYearMonth}-01 s/d ${currentYearMonth}-28`,
      printedAtWib: "12 Okt 2026 11:40 WIB",
    });
    expect(pdf.startsWith("%PDF-1.4")).toBe(true);
    expect(pdf).toContain(
      "LAPORAN REKAPITULASI KEHADIRAN, CUTI & LEMBUR KARYAWAN",
    );
    // Verify embedded PT Kuda Prima logo XObject is present by default
    expect(pdf).toContain("/XObject << /ImLogo 5 0 R >>");
    expect(pdf).toContain("/Subtype /Image");
    expect(pdf).toContain("/ImLogo Do");
    expect(pdf).toContain("Budi Santoso");
    expect(pdf.trim().endsWith("%%EOF")).toBe(true);
  });

  it("renders ReportsPage with BrandLogo and triggers CSV and PDF exports with official filenames", async () => {
    render(<ReportsPage />);

    expect(
      screen.getByText("Laporan Rekapitulasi Kehadiran & Layanan"),
    ).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Nama, KP-000..., Jabatan");
    fireEvent.change(searchInput, { target: { value: "Engineer Jaringan" } });

    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
    expect(screen.getByText("Andi Pratama")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Reset Filter/i }));
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /Ekspor CSV \(Excel\)/i }),
    );
    expect(
      screen.getByText(
        /Rekap_Kehadiran_dan_Layanan_PT_Kuda_Prima_.*\.csv/i,
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Ekspor PDF Resmi/i }));
    await waitFor(() => {
      expect(
        screen.getByText(
          /Rekap_Kehadiran_dan_Layanan_PT_Kuda_Prima_.*\.pdf/i,
        ),
      ).toBeInTheDocument();
    });
  });
});
