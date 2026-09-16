import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { initializeApp, deleteApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";
import { getMetadata, ref } from "firebase/storage";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import jpeg from "jpeg-js";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AttendanceCommand } from "@kuda-prima/contracts";
import { submitAttendanceCommand } from "../src/attendance/attendance-submission-service.js";

const projectId = "demo-kuda-prima-tests";
let app: App;
let database: Firestore;
let storage: Storage;
let environment: RulesTestEnvironment;
const now = new Date("2026-09-08T10:00:00Z");
const photo = jpeg
  .encode({ width: 32, height: 32, data: Buffer.alloc(32 * 32 * 4, 180) }, 70)
  .data.toString("base64");
const command = (
  changes: Partial<AttendanceCommand> = {},
): AttendanceCommand => ({
  eventType: "check_in",
  capturedAt: "2026-09-08T01:00:00.000Z",
  latitude: -6.214737033753623,
  longitude: 106.76089760397757,
  accuracyMeters: 10,
  locationType: "office",
  idempotencyKey: randomUUID(),
  photoBase64: photo,
  isMocked: false,
  ...changes,
});
const submit = (data: AttendanceCommand, uid = "employee") =>
  submitAttendanceCommand(database, storage, data, uid, now);

beforeAll(async () => {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18180";
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = "127.0.0.1:19299";
  environment = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 18180,
      rules: await readFile(
        new URL("../../../firebase/firestore.rules", import.meta.url),
        "utf8",
      ),
    },
    storage: {
      host: "127.0.0.1",
      port: 19299,
      rules: await readFile(
        new URL("../../../firebase/storage.rules", import.meta.url),
        "utf8",
      ),
    },
  });
  app = initializeApp(
    { projectId, storageBucket: `${projectId}.appspot.com` },
    "attendance-tests",
  );
  database = getFirestore(app);
  storage = getStorage(app);
}, 30000);
beforeEach(async () => {
  await environment.clearFirestore();
  await storage.bucket().deleteFiles({ force: true });
  await database.doc("users/employee").set({
    active: true,
    authUid: "employee",
    employeeId: "KP-900001",
    fullName: "Synthetic Employee",
    role: "technician",
  });
  await database.doc("users/manager").set({
    active: true,
    authUid: "manager",
    employeeId: "KP-900002",
    fullName: "Synthetic Manager",
    role: "supervisor",
  });
  await database.doc("officeLocations/main").set({
    active: true,
    radiusMeters: 100,
    accuracyThresholdMeters: 50,
    latitude: -6.214737033753623,
    longitude: 106.76089760397757,
    timeZone: "Asia/Jakarta",
  });
});
afterAll(async () => {
  await environment.clearFirestore();
  await storage.bucket().deleteFiles({ force: true });
  await environment.cleanup();
  await deleteApp(app);
});

describe("attendance transactions", () => {
  it("concurrent retries persist exactly one event, audit and selfie", async () => {
    const data = command();
    const results = await Promise.all(
      Array.from({ length: 5 }, () => submit(data)),
    );
    expect(new Set(results.map((result) => result.eventId)).size).toBe(1);
    expect((await database.collection("attendanceEvents").get()).size).toBe(1);
    expect((await database.collection("auditLogs").get()).size).toBe(1);
    expect((await storage.bucket().getFiles())[0]).toHaveLength(1);
  }, 30000);
  it("concurrent check-ins with different keys cannot create a second event", async () => {
    const results = await Promise.allSettled([
      submit(command()),
      submit(command()),
    ]);
    expect(
      results.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    expect((await storage.bucket().getFiles())[0]).toHaveLength(1);
  }, 30000);
  it("rejects checkout without checkin, backwards time and duplicate checkout", async () => {
    await expect(submit(command({ eventType: "check_out" }))).rejects.toThrow(
      "Urutan",
    );
    await submit(command());
    await expect(
      submit(
        command({ eventType: "check_out", capturedAt: "2026-09-08T00:59:00Z" }),
      ),
    ).rejects.toThrow("setelah");
    await submit(
      command({ eventType: "check_out", capturedAt: now.toISOString() }),
    );
    await expect(
      submit(
        command({ eventType: "check_out", capturedAt: now.toISOString() }),
      ),
    ).rejects.toThrow("Urutan");
  });
  it("rejects changed payload reuse and replays a committed request after TTL", async () => {
    const data = command();
    const recorded = await submit(data);
    await expect(submit({ ...data, latitude: 0 })).rejects.toThrow(
      "data berbeda",
    );
    expect(
      (
        await submitAttendanceCommand(
          database,
          storage,
          data,
          "employee",
          new Date("2026-09-10"),
        )
      ).eventId,
    ).toBe(recorded.eventId);
  });
  it("rejects stale, future, mocked, invalid selfies and unfinished overtime", async () => {
    for (const changes of [
      { capturedAt: "2026-09-07T21:59:59Z" },
      { capturedAt: "2026-09-08T10:05:01Z" },
      { isMocked: true },
      { photoBase64: Buffer.from("not a photo").toString("base64") },
      { eventType: "overtime_start" as const },
    ])
      await expect(submit(command(changes))).rejects.toThrow();
    expect((await database.collection("attendanceEvents").get()).empty).toBe(
      true,
    );
    expect((await storage.bucket().getFiles())[0]).toHaveLength(0);
  });
  it("requires a field note determined by the backend", async () => {
    await expect(submit(command({ latitude: 0 }))).rejects.toThrow("Catatan");
    const result = await submit(
      command({ latitude: 0, note: "Synthetic site visit" }),
    );
    expect(result.locationType).toBe("field");
    expect(result.requiresApproval).toBe(true);
  });
  it("bootstraps daily state from existing history without changing events", async () => {
    await database.doc("attendanceEvents/legacy").set({
      userId: "employee",
      eventType: "check_in",
      capturedAt: "2026-09-08T01:00:00.000Z",
    });
    await expect(submit(command())).rejects.toThrow("Urutan");
    await submit(
      command({ eventType: "check_out", capturedAt: now.toISOString() }),
    );
    expect(
      (await database.doc("attendanceEvents/legacy").get()).data(),
    ).toEqual({
      userId: "employee",
      eventType: "check_in",
      capturedAt: "2026-09-08T01:00:00.000Z",
    });
  });
  it("rejects inactive users, including replay", async () => {
    const data = command();
    await submit(data);
    await database.doc("users/employee").update({ active: false });
    await expect(submit(data)).rejects.toThrow("tidak aktif");
  });
  it("storage denies inactive owner/manager and other employees", async () => {
    const result = await submit(command());
    const path = (
      await database.doc(`attendanceEvents/${result.eventId}`).get()
    ).data()!.photoStoragePath;
    const photoRef = (uid: string, role: string) =>
      ref(
        environment
          .authenticatedContext(uid, { role })
          .storage(`gs://${projectId}.appspot.com`),
        path,
      );
    await assertSucceeds(getMetadata(photoRef("employee", "technician")));
    await assertSucceeds(getMetadata(photoRef("manager", "supervisor")));
    await assertFails(getMetadata(photoRef("manager", "technician")));
    await database.doc("users/employee").update({ active: false });
    await database.doc("users/manager").update({ active: false });
    await assertFails(getMetadata(photoRef("employee", "technician")));
    await assertFails(getMetadata(photoRef("manager", "supervisor")));
  });
});
