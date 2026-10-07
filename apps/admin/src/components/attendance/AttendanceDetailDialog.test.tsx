import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  AttendanceDetailDialog,
  type AttendanceDetailItem,
} from "./AttendanceDetailDialog";

vi.mock("@/lib/firebase", () => ({
  storage: {},
}));

describe("AttendanceDetailDialog", () => {
  const mockItem: AttendanceDetailItem = {
    id: "att-001",
    eventId: "att-001",
    userId: "user-tech-1",
    employeeId: "KP-102938",
    fullName: "Ahmad Teknisi",
    eventType: "check_in",
    capturedAt: "2026-10-06T01:30:00.000Z",
    locationType: "field",
    distanceMeters: 450,
    latitude: -6.215,
    longitude: 106.761,
    accuracyMeters: 8,
    note: "Surat tugas perbaikan BTS di Kebon Jeruk",
    status: "late",
    approvalReasons: ["Terlambat", "Di Luar Lokasi (Lapangan)"],
    approvalStatus: "pending",
    photoUrl: "https://example.com/selfie.jpg",
  };

  it("renders employee details, location information, and coordinates correctly", () => {
    const onOpenChange = vi.fn();
    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={onOpenChange}
        item={mockItem}
      />,
    );

    expect(screen.getByText("Detail Rekaman Presensi")).toBeInTheDocument();
    expect(screen.getByText("Ahmad Teknisi")).toBeInTheDocument();
    expect(screen.getByText("KP-102938")).toBeInTheDocument();
    expect(screen.getByText("Absen Masuk")).toBeInTheDocument();
    expect(screen.getAllByText(/Terlambat/).length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/"Surat tugas perbaikan BTS di Kebon Jeruk"/),
    ).toBeInTheDocument();
    expect(screen.getByText("Presensi Lapangan")).toBeInTheDocument();

    // OpenStreetMap region and external Google Maps link
    expect(
      screen.getByRole("region", {
        name: /Peta lokasi presensi OpenStreetMap/i,
      }),
    ).toBeInTheDocument();
    const gmapsLink = screen.getByRole("link", {
      name: /Buka di Google Maps/i,
    });
    expect(gmapsLink).toHaveAttribute(
      "href",
      "https://www.google.com/maps/search/?api=1&query=-6.215,106.761",
    );
  });

  it("handles missing coordinates gracefully with a friendly message", () => {
    const itemWithoutCoords: AttendanceDetailItem = {
      ...mockItem,
      latitude: undefined,
      longitude: undefined,
    };

    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        item={itemWithoutCoords}
      />,
    );

    expect(
      screen.getByText("Koordinat GPS Tidak Tersedia"),
    ).toBeInTheDocument();
  });

  it("shows retention notice for attendance records older than 90 days", () => {
    // 120 days ago
    const oldDate = new Date(
      Date.now() - 120 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const archivedItem: AttendanceDetailItem = {
      ...mockItem,
      capturedAt: oldDate,
      photoUrl: undefined,
      photoStoragePath: "attendance_photos/old-photo.jpg",
    };

    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        item={archivedItem}
      />,
    );

    expect(screen.getByText("Foto Diarsipkan")).toBeInTheDocument();
    expect(
      screen.getByText(/kebijakan retensi data \(3 bulan\)/i),
    ).toBeInTheDocument();
  });

  it("opens and closes lightbox when user clicks on photo preview", () => {
    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        item={mockItem}
      />,
    );

    const photoButton = screen.getByRole("button", {
      name: /Perbesar foto presensi Ahmad Teknisi/i,
    });
    fireEvent.click(photoButton);

    // Lightbox modal should be visible
    expect(
      screen.getByRole("dialog", {
        name: /Tampilan foto penuh Ahmad Teknisi/i,
      }),
    ).toBeInTheDocument();

    const closeLightboxBtn = screen.getByRole("button", {
      name: /Tutup foto penuh/i,
    });
    fireEvent.click(closeLightboxBtn);

    expect(
      screen.queryByRole("dialog", {
        name: /Tampilan foto penuh Ahmad Teknisi/i,
      }),
    ).not.toBeInTheDocument();
  });

  it("allows admin to trigger approve and reject actions", () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={onOpenChange}
        item={mockItem}
        currentAdminUid="admin-different-uid"
        onApprove={onApprove}
        onReject={onReject}
      />,
    );

    const approveButton = screen.getByRole("button", {
      name: /Setujui Presensi/i,
    });
    const rejectButton = screen.getByRole("button", {
      name: /Tolak Presensi/i,
    });

    expect(approveButton).toBeInTheDocument();
    expect(rejectButton).toBeInTheDocument();

    fireEvent.click(approveButton);
    expect(onApprove).toHaveBeenCalledWith("att-001", "Ahmad Teknisi");
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(rejectButton);
    expect(onReject).toHaveBeenCalledWith("att-001", "Ahmad Teknisi");
  });

  it("enforces self-approval guardrail when logged-in admin matches record", () => {
    render(
      <AttendanceDetailDialog
        open={true}
        onOpenChange={vi.fn()}
        item={mockItem}
        currentAdminUid="user-tech-1"
        onApprove={vi.fn()}
        onReject={vi.fn()}
      />,
    );

    expect(screen.getByText(/Self-Approval dilarang/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Setujui Presensi/i }),
    ).not.toBeInTheDocument();
  });
});
