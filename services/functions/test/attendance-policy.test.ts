import { describe, expect, it } from "vitest";

import {
  evaluateAttendanceSchedule,
  toJakartaTime,
} from "../src/attendance/attendance-policy-service.js";
import {
  distanceBetweenMeters,
  evaluateGeofence,
  type OfficeLocationData,
} from "../src/attendance/geofence-service.js";

describe("toJakartaTime", () => {
  it("correctly converts UTC to UTC+7 (Asia/Jakarta)", () => {
    // 2026-09-01 01:00:00 UTC is 08:00:00 WIB
    const utcDate = new Date("2026-09-01T01:00:00.000Z");
    const jakartaTime = toJakartaTime(utcDate);

    expect(jakartaTime.year).toBe(2026);
    expect(jakartaTime.month).toBe(9);
    expect(jakartaTime.day).toBe(1);
    expect(jakartaTime.hour).toBe(8);
    expect(jakartaTime.minute).toBe(0);
  });
});

describe("evaluateAttendanceSchedule", () => {
  it("rejects check_in before 07:00 WIB", () => {
    // 2026-09-01 (Tuesday) 06:55 WIB -> 23:55 UTC previous day
    const earlyDate = new Date("2026-08-31T23:55:00.000Z");
    const result = evaluateAttendanceSchedule("check_in", earlyDate);

    expect(result.isAllowed).toBe(false);
    expect(result.reason).toContain("07:00 WIB");
  });

  it("marks check_in as normal between 07:00 and 08:15 WIB", () => {
    // 2026-09-01 08:00 WIB -> 01:00 UTC
    const onTimeDate = new Date("2026-09-01T01:00:00.000Z");
    const result = evaluateAttendanceSchedule("check_in", onTimeDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("normal");
    expect(result.requiresApproval).toBe(false);
  });

  it("marks check_in as late after 08:15 WIB on weekdays and requires approval", () => {
    // 2026-09-01 08:20 WIB -> 01:20 UTC
    const lateDate = new Date("2026-09-01T01:20:00.000Z");
    const result = evaluateAttendanceSchedule("check_in", lateDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("late");
    expect(result.requiresApproval).toBe(true);
  });

  it("marks check_out as early departure before 17:00 WIB and requires approval", () => {
    // 2026-09-01 16:30 WIB -> 09:30 UTC
    const earlyOutDate = new Date("2026-09-01T09:30:00.000Z");
    const result = evaluateAttendanceSchedule("check_out", earlyOutDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("early_departure");
    expect(result.requiresApproval).toBe(true);
  });

  it("marks check_out as normal after 17:00 WIB", () => {
    // 2026-09-01 17:05 WIB -> 10:05 UTC
    const normalOutDate = new Date("2026-09-01T10:05:00.000Z");
    const result = evaluateAttendanceSchedule("check_out", normalOutDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("normal");
    expect(result.requiresApproval).toBe(false);
  });

  it("marks check_in on weekend (Saturday) as non_working_day and requires approval", () => {
    // 2026-09-05 (Saturday) 18:42 WIB -> 11:42 UTC
    const weekendDate = new Date("2026-09-05T11:42:00.000Z");
    const result = evaluateAttendanceSchedule("check_in", weekendDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("non_working_day");
    expect(result.requiresApproval).toBe(true);
    expect(result.reason).toContain("di luar hari kerja");
  });

  it("marks check_out on weekend (Sunday) as non_working_day and requires approval", () => {
    // 2026-09-06 (Sunday) 14:00 WIB -> 07:00 UTC
    const sundayDate = new Date("2026-09-06T07:00:00.000Z");
    const result = evaluateAttendanceSchedule("check_out", sundayDate);

    expect(result.isAllowed).toBe(true);
    expect(result.status).toBe("non_working_day");
    expect(result.requiresApproval).toBe(true);
  });
});

describe("geofence-service", () => {
  const office: OfficeLocationData = {
    active: true,
    accuracyThresholdMeters: 50,
    latitude: -6.214737033753623,
    longitude: 106.76089760397757,
    name: "Kantor PT Kuda Prima",
    radiusMeters: 100,
    timeZone: "Asia/Jakarta",
  };

  it("calculates zero distance for exact office coordinates", () => {
    const distance = distanceBetweenMeters(
      office.latitude,
      office.longitude,
      office.latitude,
      office.longitude,
    );
    expect(distance).toBeCloseTo(0, 1);
  });

  it("evaluates genuine sample inside radius as office", () => {
    const evalResult = evaluateGeofence(
      office,
      office.latitude,
      office.longitude,
      15,
    );

    expect(evalResult.locationType).toBe("office");
    expect(evalResult.isInsideOffice).toBe(true);
    expect(evalResult.lowAccuracy).toBe(false);
  });

  it("evaluates sample outside 100m radius as field", () => {
    // Move ~200m away
    const evalResult = evaluateGeofence(
      office,
      office.latitude + 0.002,
      office.longitude,
      15,
    );

    expect(evalResult.locationType).toBe("field");
    expect(evalResult.isInsideOffice).toBe(false);
  });

  it("evaluates sample with accuracy > 50m as lowAccuracy field", () => {
    const evalResult = evaluateGeofence(
      office,
      office.latitude,
      office.longitude,
      75,
    );

    expect(evalResult.locationType).toBe("field");
    expect(evalResult.lowAccuracy).toBe(true);
  });
});
