import { describe, expect, it, vi } from "vitest";
import {
  processAttendanceApproval,
  handleProcessAttendanceApproval,
} from "../src/attendance/attendance-approval-service.js";
import { HttpsError } from "firebase-functions/v2/https";

describe("processAttendanceApproval", () => {
  const mockAdminData = {
    active: true,
    authUid: "admin-1",
    fullName: "Admin Utama",
    role: "admin",
  };

  const mockEventData = {
    eventId: "evt-100",
    userId: "user-tech-1",
    employeeId: "KP-100001",
    fullName: "Teknisi Lapangan",
    requiresApproval: true,
    approvalStatus: "pending",
  };

  function createMockDb(overrides?: {
    adminExists?: boolean;
    adminData?: Record<string, unknown>;
    eventExists?: boolean;
    eventData?: Record<string, unknown>;
  }) {
    const adminExists = overrides?.adminExists ?? true;
    const adminData = overrides?.adminData ?? mockAdminData;
    const eventExists = overrides?.eventExists ?? true;
    const eventData = overrides?.eventData ?? mockEventData;

    const updatedEvent: Record<string, unknown> = {};
    const createdLogs: Record<string, unknown> = {};

    const db: any = {
      doc: (path: string) => {
        if (path.startsWith("users/")) {
          return {
            get: vi.fn().mockResolvedValue({
              exists: adminExists,
              data: () => adminData,
            }),
          };
        }
        if (path.startsWith("attendanceEvents/")) {
          return {
            get: vi.fn().mockResolvedValue({
              exists: eventExists,
              data: () => eventData,
            }),
            update: vi.fn().mockImplementation((fields) => {
              Object.assign(updatedEvent, fields);
            }),
          };
        }
        if (path.startsWith("auditLogs/")) {
          return {
            create: vi.fn().mockImplementation((fields) => {
              Object.assign(createdLogs, fields);
            }),
          };
        }
        return {};
      },
      runTransaction: vi.fn().mockImplementation(async (cb) => {
        const tx = {
          update: vi.fn().mockImplementation((ref, fields) => {
            Object.assign(updatedEvent, fields);
          }),
          create: vi.fn().mockImplementation((ref, fields) => {
            Object.assign(createdLogs, fields);
          }),
        };
        return cb(tx);
      }),
    };

    return { db, updatedEvent, createdLogs };
  }

  it("successfully approves an employee attendance event", async () => {
    const { db, updatedEvent, createdLogs } = createMockDb();
    const result = await processAttendanceApproval(
      db,
      {
        eventId: "evt-100",
        status: "approved",
        notes: "Lokasi dan jam kerja terverifikasi",
      },
      "admin-1",
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("approved");
    expect(updatedEvent.approvalStatus).toBe("approved");
    expect(updatedEvent.approvedBy).toBe("admin-1");
    expect(updatedEvent.approvedByName).toBe("Admin Utama");
    expect(updatedEvent.approvalNotes).toBe("Lokasi dan jam kerja terverifikasi");
    expect(createdLogs.action).toBe("attendance_approved");
  });

  it("successfully rejects an employee attendance event with reason notes", async () => {
    const { db, updatedEvent, createdLogs } = createMockDb();
    const result = await processAttendanceApproval(
      db,
      {
        eventId: "evt-100",
        status: "rejected",
        notes: "Foto selfie tidak sesuai",
      },
      "admin-1",
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe("rejected");
    expect(updatedEvent.approvalStatus).toBe("rejected");
    expect(createdLogs.action).toBe("attendance_rejected");
  });

  it("enforces Cross-Approval invariant: admin cannot approve their own attendance", async () => {
    // Event belongs to admin-1
    const { db } = createMockDb({
      eventData: {
        ...mockEventData,
        userId: "admin-1",
      },
    });

    await expect(
      processAttendanceApproval(
        db,
        {
          eventId: "evt-100",
          status: "approved",
        },
        "admin-1",
      ),
    ).rejects.toThrow(/Cross-Approval/);
  });

  it("rejects non-admin caller", async () => {
    const { db } = createMockDb({
      adminData: {
        ...mockAdminData,
        role: "technician",
      },
    });

    await expect(
      processAttendanceApproval(
        db,
        {
          eventId: "evt-100",
          status: "approved",
        },
        "admin-1",
      ),
    ).rejects.toThrow(/Hanya Administrator/);
  });

  it("rejects approval for non-existent event", async () => {
    const { db } = createMockDb({
      eventExists: false,
    });

    await expect(
      processAttendanceApproval(
        db,
        {
          eventId: "evt-unknown",
          status: "approved",
        },
        "admin-1",
      ),
    ).rejects.toThrow(/tidak ditemukan/);
  });

  it("validates handleProcessAttendanceApproval auth context", async () => {
    const { db } = createMockDb();

    // No auth
    await expect(
      handleProcessAttendanceApproval({ auth: undefined, data: {} }, db),
    ).rejects.toThrow(HttpsError);

    // Non-admin auth role
    await expect(
      handleProcessAttendanceApproval(
        {
          auth: { uid: "tech-1", token: { role: "technician" } },
          data: { eventId: "evt-100", status: "approved" },
        },
        db,
      ),
    ).rejects.toThrow(HttpsError);
  });
});
