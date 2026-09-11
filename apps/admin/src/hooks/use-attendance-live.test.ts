import { describe, expect, it } from "vitest";
import { wibDayBounds } from "./use-attendance-live";

describe("WIB monitoring window", () => {
  it("changes days at 17:00 UTC and handles year boundaries", () => {
    expect(wibDayBounds(new Date("2026-12-31T16:59:59Z"))).toEqual({
      start: "2026-12-30T17:00:00.000Z",
      end: "2026-12-31T17:00:00.000Z",
    });
    expect(wibDayBounds(new Date("2026-12-31T17:00:00Z"))).toEqual({
      start: "2026-12-31T17:00:00.000Z",
      end: "2027-01-01T17:00:00.000Z",
    });
  });
});
