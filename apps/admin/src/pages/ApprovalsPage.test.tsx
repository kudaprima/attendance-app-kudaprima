import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApprovalsPage } from "./ApprovalsPage";
import type { AttendanceApprovalEntry } from "@/features/approvals/approval-repository";

const mocks = vi.hoisted(() => ({
  attendanceItems: [] as AttendanceApprovalEntry[],
  serviceItems: [] as any[],
  submitApproval: vi.fn(),
  updateServiceStatus: vi.fn(),
  nextAttendance: undefined as
    undefined | ((items: AttendanceApprovalEntry[]) => void),
  nextService: undefined as undefined | ((items: any[]) => void),
}));

vi.mock("@/hooks/use-admin-auth", () => ({
  useCurrentAdminAuth: () => ({
    role: "admin",
    user: { uid: "admin-1", email: "admin@kudaprima.test" },
  }),
}));

vi.mock("@/features/approvals/approval-repository", () => ({
  watchAttendanceApprovals: (
    next: (items: AttendanceApprovalEntry[]) => void,
  ) => {
    mocks.nextAttendance = next;
    next(mocks.attendanceItems);
    return vi.fn();
  },
  watchServiceRequests: (next: (items: any[]) => void) => {
    mocks.nextService = next;
    next(mocks.serviceItems);
    return vi.fn();
  },
  submitAttendanceApproval: mocks.submitApproval,
  updateServiceRequestStatus: mocks.updateServiceStatus,
}));

describe("ApprovalsPage", () => {
  const sampleEvent: AttendanceApprovalEntry = {
    id: "evt-1",
    eventId: "evt-1",
    userId: "tech-1",
    employeeId: "KP-000001",
    fullName: "Teknisi Lapangan",
    eventType: "check_in",
    capturedAt: "2026-09-08T01:30:00.000Z",
    locationType: "field",
    distanceMeters: 450,
    status: "late",
    approvalReasons: ["Terlambat", "Di Luar Lokasi (Lapangan)"],
    approvalStatus: "pending",
    note: "Perbaikan kabel jaringan",
  };

  const selfEvent: AttendanceApprovalEntry = {
    id: "evt-self",
    eventId: "evt-self",
    userId: "admin-1",
    employeeId: "KP-000002",
    fullName: "Admin Login",
    eventType: "check_in",
    capturedAt: "2026-09-08T01:45:00.000Z",
    locationType: "office",
    distanceMeters: 10,
    status: "late",
    approvalReasons: ["Terlambat"],
    approvalStatus: "pending",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.attendanceItems = [sampleEvent, selfEvent];
    mocks.serviceItems = [];
    mocks.submitApproval.mockResolvedValue({ data: { success: true } });
  });

  it("renders the 4 approval tabs and anomaly attendance records", () => {
    render(<ApprovalsPage />);

    expect(
      screen.getByRole("tab", { name: /Persetujuan Presensi/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Lembur/i })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Cuti Tahunan/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: /Izin & Sakit/i }),
    ).toBeInTheDocument();

    expect(screen.getByText("Teknisi Lapangan")).toBeInTheDocument();
    expect(screen.getAllByText("Terlambat").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Di Luar Lokasi (Lapangan)")).toBeInTheDocument();
    expect(screen.getByText("Perbaikan kabel jaringan")).toBeInTheDocument();
  });

  it("enforces cross-approval by disabling self-approval for logged in admin", () => {
    render(<ApprovalsPage />);

    // tech-1 event has action buttons
    expect(
      screen.getByRole("button", { name: /Setujui/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tolak/i })).toBeInTheDocument();

    // admin-1 self event has notice
    expect(screen.getByText(/Self-Approval dilarang/i)).toBeInTheDocument();
  });

  it("opens confirmation modal and submits approval for technician", async () => {
    render(<ApprovalsPage />);

    fireEvent.click(screen.getByRole("button", { name: /Setujui/i }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Setujui Presensi/i)).toBeInTheDocument();

    const notesInput = screen.getByLabelText(/Catatan \/ Alasan/i);
    fireEvent.change(notesInput, {
      target: { value: "Tugas luar kantor terkonfirmasi" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Ya, Setujui/i }));

    await waitFor(() =>
      expect(mocks.submitApproval).toHaveBeenCalledWith({
        eventId: "evt-1",
        status: "approved",
        notes: "Tugas luar kantor terkonfirmasi",
      }),
    );
  });

  it("opens attendance detail dialog when Detail button is clicked", () => {
    render(<ApprovalsPage />);

    const detailButtons = screen.getAllByRole("button", { name: /Detail/i });
    expect(detailButtons.length).toBeGreaterThanOrEqual(1);

    fireEvent.click(detailButtons[0]);

    expect(screen.getByText("Detail Rekaman Presensi")).toBeInTheDocument();
    expect(
      screen.getAllByText("Teknisi Lapangan").length,
    ).toBeGreaterThanOrEqual(2);
  });
});
