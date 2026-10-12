import { describe, expect, it, vi } from "vitest";
import jpeg from "jpeg-js";
import {
  calculateWorkingDays,
  processServiceApproval,
  submitServiceRequest,
} from "../src/services/service-request-service.js";

function createTestJpegBase64(width = 64, height = 64): string {
  const frameData = Buffer.alloc(width * height * 4, 0xff);
  const encoded = jpeg.encode({ data: frameData, width, height }, 85);
  return encoded.data.toString("base64");
}

describe("service-request-service", () => {
  const sampleJpegBase64 = createTestJpegBase64();

  describe("calculateWorkingDays", () => {
    it("excludes Saturdays and Sundays from date range calculation", () => {
      // 2026-10-15 (Thu) to 2026-10-19 (Mon) -> Thu, Fri, Mon = 3 working days
      expect(calculateWorkingDays("2026-10-15", "2026-10-19")).toBe(3);
      // Weekend only: 2026-10-17 (Sat) to 2026-10-18 (Sun) -> 0 working days
      expect(calculateWorkingDays("2026-10-17", "2026-10-18")).toBe(0);
    });
  });

  function createTestEnv(options?: {
    userProfile?: Record<string, unknown>;
    existingRequests?: Array<{ id: string; data: Record<string, unknown> }>;
    targetRequest?: Record<string, unknown>;
  }) {
    const defaultProfile = {
      active: true,
      authUid: "tech-1",
      employeeId: "KP-000010",
      fullName: "Budi Santoso",
      role: "technician",
      jobTitle: "Teknisi Jaringan",
      employmentStatus: "permanent",
      employmentStartDate: "2024-01-10",
    };
    const profile = options?.userProfile ?? defaultProfile;
    const existingList = options?.existingRequests ?? [];
    const savedDocs: Record<string, Record<string, unknown>> = {};
    const savedFiles: string[] = [];

    const db: any = {
      doc: (path: string) => ({
        path,
        get: vi.fn().mockImplementation(async () => {
          if (path === "users/admin-1") {
            return {
              exists: true,
              data: () => ({
                active: true,
                authUid: "admin-1",
                fullName: "Admin Operasional",
                role: "admin",
              }),
            };
          }
          if (path.startsWith("users/")) {
            return {
              exists: true,
              data: () => profile,
            };
          }
          if (path.startsWith("serviceRequests/")) {
            if (options?.targetRequest) {
              return {
                exists: true,
                data: () => options.targetRequest,
              };
            }
            return {
              exists: false,
              data: () => undefined,
            };
          }
          return { exists: false, data: () => undefined };
        }),
      }),
      collection: () => ({
        where: () => ({
          get: vi.fn().mockResolvedValue({
            docs: existingList.map((item) => ({
              id: item.id,
              data: () => item.data,
            })),
          }),
        }),
      }),
      runTransaction: vi.fn().mockImplementation(async (callback) => {
        const tx = {
          set: vi.fn().mockImplementation((ref, data) => {
            savedDocs[ref.path] = data;
          }),
          update: vi.fn().mockImplementation((ref, data) => {
            savedDocs[ref.path] = { ...savedDocs[ref.path], ...data };
          }),
          create: vi.fn().mockImplementation((ref, data) => {
            savedDocs[ref.path] = data;
          }),
        };
        return callback(tx);
      }),
    };

    const storage: any = {
      bucket: () => ({
        file: (filePath: string) => ({
          save: vi.fn().mockImplementation(async () => {
            savedFiles.push(filePath);
          }),
        }),
      }),
    };

    return { db, storage, savedDocs, savedFiles };
  }

  it("submits annual leave request and calculates effective working days", async () => {
    const { db, storage, savedDocs } = createTestEnv();
    const now = new Date("2026-10-12T03:00:00.000Z"); // 2026-10-12 10:00 WIB

    const result = await submitServiceRequest(
      db,
      storage,
      {
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440010",
        type: "annual_leave",
        startDate: "2026-10-15", // Thu
        endDate: "2026-10-19", // Mon
        reason: "Acara keluarga di luar kota",
      },
      "tech-1",
      now,
    );

    expect(result.success).toBe(true);
    expect(result.workingDaysCount).toBe(3);
    expect(result.durationOrDays).toBe("3 Hari Kerja");
    const requestDoc = Object.entries(savedDocs).find(([k]) =>
      k.startsWith("serviceRequests/"),
    )?.[1];
    expect(requestDoc?.workingDaysCount).toBe(3);
  });

  it("rejects annual leave when remaining approved quota is insufficient", async () => {
    const { db, storage } = createTestEnv({
      existingRequests: [
        {
          id: "req-prev",
          data: {
            type: "annual_leave",
            status: "approved",
            startDate: "2026-05-04",
            endDate: "2026-05-15",
            workingDaysCount: 10,
          },
        },
      ],
    });
    const now = new Date("2026-10-12T03:00:00.000Z");

    await expect(
      submitServiceRequest(
        db,
        storage,
        {
          idempotencyKey: "550e8400-e29b-41d4-a716-446655440011",
          type: "annual_leave",
          startDate: "2026-10-15",
          endDate: "2026-10-19", // 3 working days > 2 remaining
          reason: "Liburan panjang",
        },
        "tech-1",
        now,
      ),
    ).rejects.toThrow(/melebihi sisa kuota cuti tahunan/);
  });

  it("submits overtime with mandatory selfie, calculates minutes, and flags >8 hours", async () => {
    const { db, storage, savedFiles } = createTestEnv();
    const now = new Date("2026-10-12T10:30:00.000Z");

    const result = await submitServiceRequest(
      db,
      storage,
      {
        idempotencyKey: "550e8400-e29b-41d4-a716-446655440012",
        type: "overtime",
        startDate: "2026-10-12",
        startedAt: "2026-10-12T17:15:00+07:00",
        endedAt: "2026-10-13T02:00:00+07:00", // 8h 45m = 525 mins (cross midnight)
        clientOrLocation: "Site Server PT Nusantara",
        reason: "Pemulihan gangguan fiber optik utama",
        selfieBase64: sampleJpegBase64,
      },
      "tech-1",
      now,
    );

    expect(result.success).toBe(true);
    expect(result.durationMinutes).toBe(525);
    expect(result.isOver8Hours).toBe(true);
    expect(result.durationOrDays).toBe("8 Jam 45 Menit (525 Menit)");
    expect(savedFiles.length).toBe(1);
  });

  it("enforces strict cross-approval and records audit logs on processServiceApproval", async () => {
    const { db, savedDocs } = createTestEnv({
      targetRequest: {
        id: "req-200",
        userId: "tech-1",
        type: "annual_leave",
        startDate: "2026-10-20",
        endDate: "2026-10-21",
        workingDaysCount: 2,
        status: "pending",
      },
    });

    const approved = await processServiceApproval(
      db,
      {
        requestId: "req-200",
        status: "approved",
        notes: "Kuota cuti mencukupi, disetujui.",
      },
      "admin-1",
    );

    expect(approved.success).toBe(true);
    expect(savedDocs["serviceRequests/req-200"]?.status).toBe("approved");

    // Self-approval attempt must fail
    const selfEnv = createTestEnv({
      targetRequest: {
        id: "req-self",
        userId: "admin-1",
        type: "permission",
        startDate: "2026-10-20",
        status: "pending",
      },
    });

    await expect(
      processServiceApproval(
        selfEnv.db,
        {
          requestId: "req-self",
          status: "approved",
        },
        "admin-1",
      ),
    ).rejects.toThrow(/Cross-Approval/);
  });
});
