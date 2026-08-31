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

export type AttendanceCommand = z.infer<typeof attendanceCommandSchema>;
export type AttendanceEventType = z.infer<typeof attendanceEventTypeSchema>;
export type EmploymentStatus = z.infer<typeof employmentStatusSchema>;
export type UserRole = z.infer<typeof userRoleSchema>;
