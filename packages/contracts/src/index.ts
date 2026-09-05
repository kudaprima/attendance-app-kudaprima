import { z } from "zod";

export const userRoleSchema = z.enum(["technician", "supervisor", "admin"]);
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
  employmentStatus: employmentStatusSchema,
  employmentStartDate: calendarDateSchema,
});

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
  status: z.enum(["normal", "late", "early_departure"]),
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
  role: userRoleSchema,
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
  status: z.enum(["normal", "late", "early_departure"]),
  requiresApproval: z.boolean(),
  photoStoragePath: z.string(),
  idempotencyKey: z.string().uuid(),
});

export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>;
export type AttendanceEventRecord = z.infer<typeof attendanceEventRecordSchema>;
export type AttendanceEventType = z.infer<typeof attendanceEventTypeSchema>;
export type AttendanceSubmissionResult = z.infer<
  typeof attendanceSubmissionResultSchema
>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
export type OfficeLocation = z.infer<typeof officeLocationSchema>;
export type ProvisionEmployeeProfileCommand = z.infer<
  typeof provisionEmployeeProfileCommandSchema
>;
export type UserRole = z.infer<typeof userRoleSchema>;
