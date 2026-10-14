import { z } from "zod";

export const userRoleSchema = z.enum(["technician", "admin"]);
// Historical snapshots are immutable and may retain a retired role.
export const historicalUserRoleSchema = z.enum(["technician", "supervisor", "admin"]);
export const jobTitleSchema = z.string().trim().min(2, "Jabatan wajib diisi, minimal 2 karakter.").max(100, "Jabatan maksimal 100 karakter.").regex(/^[\p{L}\p{M}\p{N} .,\u0026/()-]+$/u, "Jabatan mengandung karakter yang tidak diizinkan.");
export const employmentStatusSchema = z.enum([
  "intern",
  "contract",
  "permanent",
]);
export const attendanceEventTypeSchema = z.enum([
  "check_in",
  "check_out",
  "overtime_start",
  "overtime_end",
]);
export const attendanceLocationTypeSchema = z.enum(["office", "field"]);

export const officeLocationSchema = z.object({
  active: z.boolean(),
  accuracyThresholdMeters: z.number().positive().max(1000),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  name: z.string().trim().min(2).max(120),
  radiusMeters: z.number().positive().max(1000),
  timeZone: z.literal("Asia/Jakarta"),
});

export const employeeIdSchema = z.string().regex(/^KP-\d{6}$/);

const calendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().startsWith(value)
    );
  }, "Tanggal kalender tidak valid.");

export const provisionEmployeeProfileCommandSchema = z.object({
  authUid: z.string().trim().min(1).max(128),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  fullName: z.string().trim().min(2).max(120),
  role: userRoleSchema,
  jobTitle: jobTitleSchema,
  employmentStatus: employmentStatusSchema,
  employmentStartDate: calendarDateSchema,
});

export const employeeEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Format email tidak valid."));
export const employeeGmailSchema = employeeEmailSchema;
const employeePasswordSchema = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(128);
const managedEmployeeFields = {
  fullName: z.string().trim().min(2).max(120),
  email: employeeEmailSchema,
  active: z.boolean(),
  employmentStatus: employmentStatusSchema,
};
export const createEmployeeCommandSchema = z
  .object({
    ...managedEmployeeFields,
    requestId: z.uuid(),
    password: employeePasswordSchema,
    role: userRoleSchema,
    jobTitle: jobTitleSchema,
    employmentStartDate: calendarDateSchema,
  })
  .strict();
export const updateEmployeeCommandSchema = z
  .object({
    ...managedEmployeeFields,
    role: userRoleSchema,
    jobTitle: jobTitleSchema,
    requestId: z.uuid(),
    uid: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[^/]+$/),
    expectedRevision: z.number().int().nonnegative(),
    password: employeePasswordSchema.optional(),
    employmentStartDate: calendarDateSchema.optional(),
  })
  .strict();
export const deleteEmployeeCommandSchema = z
  .object({
    requestId: z.uuid(),
    uid: z
      .string()
      .min(1)
      .max(128)
      .regex(/^[^/]+$/),
    expectedRevision: z.number().int().nonnegative(),
  })
  .strict();
export type CreateEmployeeCommand = z.infer<typeof createEmployeeCommandSchema>;
export type UpdateEmployeeCommand = z.infer<typeof updateEmployeeCommandSchema>;
export type DeleteEmployeeCommand = z.infer<typeof deleteEmployeeCommandSchema>;

export const attendanceCommandSchema = z
  .object({
    eventType: attendanceEventTypeSchema,
    capturedAt: z.string().datetime({ offset: true }),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180),
    accuracyMeters: z.number().positive(),
    locationType: attendanceLocationTypeSchema,
    note: z.string().trim().max(500).optional(),
    idempotencyKey: z.string().uuid(),
    photoBase64: z.string().min(1).max(2_000_000),
    isMocked: z.boolean().default(false),
  })
  .superRefine((command, context) => {
    if (command.locationType === "field" && !command.note) {
      context.addIssue({
        code: "custom",
        message: "Catatan wajib untuk presensi lapangan.",
        path: ["note"],
      });
    }
  });

export const attendanceSubmissionResultSchema = z.object({
  eventId: z.string(),
  eventType: attendanceEventTypeSchema,
  status: z.enum(["normal", "late", "early_departure", "non_working_day"]),
  requiresApproval: z.boolean(),
  locationType: attendanceLocationTypeSchema,
  distanceMeters: z.number(),
  capturedAt: z.string(),
  message: z.string(),
});

export const attendanceEventRecordSchema = z.object({
  eventId: z.string(),
  userId: z.string(),
  employeeId: employeeIdSchema,
  fullName: z.string(),
  role: historicalUserRoleSchema,
  eventType: attendanceEventTypeSchema,
  capturedAt: z.string().datetime({ offset: true }),
  serverTimestamp: z.string().datetime({ offset: true }).optional(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number(),
  locationType: attendanceLocationTypeSchema,
  distanceMeters: z.number(),
  officeId: z.string().nullable(),
  note: z.string().nullable(),
  lowAccuracy: z.boolean(),
  isMocked: z.boolean(),
  status: z.enum(["normal", "late", "early_departure", "non_working_day"]),
  requiresApproval: z.boolean(),
  approvalReasons: z.array(z.string()).optional(),
  approvalStatus: z.enum(["pending", "approved", "rejected"]).nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  approvedByName: z.string().nullable().optional(),
  approvedAt: z.string().datetime({ offset: true }).nullable().optional(),
  approvalNotes: z.string().nullable().optional(),
  photoStoragePath: z.string(),
  idempotencyKey: z.string().uuid(),
});

export const approvalStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const processAttendanceApprovalCommandSchema = z.object({
  eventId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(500).optional(),
});
export type ProcessAttendanceApprovalCommand = z.infer<
  typeof processAttendanceApprovalCommandSchema
>;

export const leaveRequestTypeSchema = z.enum([
  "annual_leave",
  "sick_leave",
  "special_permission",
]);

export const leaveRequestCommandSchema = z.object({
  employeeId: employeeIdSchema,
  type: leaveRequestTypeSchema,
  startDate: calendarDateSchema,
  endDate: calendarDateSchema,
  reason: z.string().trim().min(3).max(500),
  attachmentUrl: z.string().url().optional().nullable(),
});

export const overtimeRequestCommandSchema = z.object({
  employeeId: employeeIdSchema,
  date: calendarDateSchema,
  startedAt: z.string().datetime({ offset: true }),
  endedAt: z.string().datetime({ offset: true }),
  taskDescription: z.string().trim().min(3).max(500),
});

export const serviceRequestTypeSchema = z.enum([
  "annual_leave",
  "sick_leave",
  "permission",
  "overtime",
]);

export const submitServiceRequestCommandSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    type: serviceRequestTypeSchema,
    startDate: calendarDateSchema,
    endDate: calendarDateSchema.optional(),
    startedAt: z.string().datetime({ offset: true }).optional(),
    endedAt: z.string().datetime({ offset: true }).optional(),
    clientOrLocation: z.string().trim().min(2).max(160).optional(),
    reason: z
      .string()
      .trim()
      .min(3, "Alasan/deskripsi wajib diisi minimal 3 karakter.")
      .max(500),
    selfieBase64: z.string().min(1).max(2_000_000).optional(),
    attachmentBase64: z.string().min(1).max(2_000_000).optional(),
  })
  .superRefine((command, context) => {
    if (command.type === "overtime") {
      if (!command.startedAt) {
        context.addIssue({
          code: "custom",
          message: "Waktu mulai lembur wajib diisi.",
          path: ["startedAt"],
        });
      }
      if (!command.endedAt) {
        context.addIssue({
          code: "custom",
          message: "Waktu selesai lembur wajib diisi.",
          path: ["endedAt"],
        });
      }
      if (command.startedAt && command.endedAt) {
        const startMs = new Date(command.startedAt).getTime();
        const endMs = new Date(command.endedAt).getTime();
        if (endMs <= startMs) {
          context.addIssue({
            code: "custom",
            message: "Waktu selesai lembur harus setelah waktu mulai.",
            path: ["endedAt"],
          });
        }
      }
      if (!command.clientOrLocation) {
        context.addIssue({
          code: "custom",
          message: "Nama klien atau lokasi kerja lembur wajib diisi.",
          path: ["clientOrLocation"],
        });
      }
      if (!command.selfieBase64) {
        context.addIssue({
          code: "custom",
          message: "Foto selfie verifikasi wajib untuk pengajuan lembur.",
          path: ["selfieBase64"],
        });
      }
    } else if (command.endDate && command.endDate < command.startDate) {
      context.addIssue({
        code: "custom",
        message: "Tanggal selesai tidak boleh sebelum tanggal mulai.",
        path: ["endDate"],
      });
    }
  });

export const processServiceApprovalCommandSchema = z.object({
  requestId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  notes: z.string().trim().max(500).optional(),
});

export const updateContactProfileCommandSchema = z.object({
  phone: z.string().trim().max(30).optional().nullable(),
  homeAddress: z.string().trim().max(500).optional().nullable(),
});

export type ApprovalStatus = z.infer<typeof approvalStatusSchema>;
export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>;
export type AttendanceEventRecord = z.infer<typeof attendanceEventRecordSchema>;
export type AttendanceEventType = z.infer<typeof attendanceEventTypeSchema>;
export type AttendanceSubmissionResult = z.infer<
  typeof attendanceSubmissionResultSchema
>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
export type LeaveRequestCommand = z.infer<typeof leaveRequestCommandSchema>;
export type LeaveRequestType = z.infer<typeof leaveRequestTypeSchema>;
export type OfficeLocation = z.infer<typeof officeLocationSchema>;
export type OvertimeRequestCommand = z.infer<
  typeof overtimeRequestCommandSchema
>;
export type ProcessServiceApprovalCommand = z.infer<
  typeof processServiceApprovalCommandSchema
>;
export type ProvisionEmployeeProfileCommand = z.infer<
  typeof provisionEmployeeProfileCommandSchema
>;
export type ServiceRequestType = z.infer<typeof serviceRequestTypeSchema>;
export type SubmitServiceRequestCommand = z.infer<
  typeof submitServiceRequestCommandSchema
>;
export type UpdateContactProfileCommand = z.infer<
  typeof updateContactProfileCommandSchema
>;
export type UserRole = z.infer<typeof userRoleSchema>;
