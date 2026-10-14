import { initializeApp, deleteApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { manageEmployee } from "../src/employees/employee-management-service.js";

const projectId = "demo-kuda-prima-tests";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:19099";
process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:18180";
const app = initializeApp({ projectId }, "employee-management-tests");
const auth = getAuth(app);
const database = getFirestore(app);
const identity = {
  uid: "test-admin",
  token: {
    role: "admin",
    email: "admin@kudaprima.test",
    auth_time: Math.floor(Date.now() / 1000),
  },
};
const input = (changes = {}) => ({
  requestId: randomUUID(),
  fullName: "Synthetic Employee",
  email: `employee${randomUUID().replaceAll("-", "")}@gmail.com`,
  password: "SyntheticPass123!",
  active: true,
  role: "technician",
  jobTitle: "Teknisi Lapangan",
  employmentStatus: "contract",
  employmentStartDate: "2026-09-01",
  ...changes,
});
const create = (data = input()) =>
  manageEmployee(database, auth, "create", { auth: identity, data });
const edit = (uid: string, changes: Record<string, unknown> = {}) =>
  manageEmployee(database, auth, "update", {
    auth: identity,
    data: {
      requestId: randomUUID(),
      uid,
      expectedRevision: 1,
      fullName: "Updated Employee",
      email: "updatedemployee@gmail.com",
      active: true,
      role: "technician",
      jobTitle: "Teknisi Senior",
      employmentStatus: "permanent",
      ...changes,
    },
  });
async function authRest(method: string, body: object) {
  const response = await fetch(
    `http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:${method}?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error?.message ?? "Auth Emulator error");
  return data;
}
const loginPassword = (email: string, password = "SyntheticPass123!") =>
  authRest("signInWithPassword", { email, password, returnSecureToken: true });
function loginGoogle(email: string, sub = "synthetic-google-sub") {
  // Unsigned Google token is accepted only by the isolated Auth Emulator.
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const token = `${encode({ alg: "none", typ: "JWT" })}.${encode({ sub, email, email_verified: true, aud: projectId, iss: "https://accounts.google.com", iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
  return authRest("signInWithIdp", {
    requestUri: "http://localhost",
    postBody: new URLSearchParams({
      id_token: token,
      providerId: "google.com",
    }).toString(),
    returnSecureToken: true,
  });
}
async function clear() {
  for (const url of [
    `http://127.0.0.1:19099/emulator/v1/projects/${projectId}/accounts`,
    `http://127.0.0.1:18180/emulator/v1/projects/${projectId}/databases/(default)/documents`,
  ]) {
    const response = await fetch(url, { method: "DELETE" });
    if (!response.ok) throw new Error("Isolated emulator cleanup failed");
  }
}
beforeAll(async () => {
  await clear();
});
beforeEach(async () => {
  vi.restoreAllMocks();
  await clear();
  await auth.createUser({
    uid: identity.uid,
    email: "admin@kudaprima.test",
    password: "SyntheticAdmin123!",
  });
  await auth.setCustomUserClaims(identity.uid, { role: "admin" });
  identity.token.role = "admin";
  identity.token.auth_time = Math.floor(Date.now() / 1000);
  await database.doc(`users/${identity.uid}`).set({
    authUid: identity.uid,
    email: "admin@kudaprima.test",
    role: "admin",
    jobTitle: "Administrator",
    active: true,
    employeeId: "KP-900001",
    revision: 0,
  });
});
afterAll(async () => {
  vi.restoreAllMocks();
  await clear();
  await deleteApp(app);
});

describe("admin employee lifecycle", () => {
  it("creates a Gmail password account, sequential profile and password-free audit; retry is idempotent", async () => {
    const data = input();
    const first = await create(data);
    expect(await create(data)).toEqual(first);
    expect(first.employeeId).toBe("KP-000001");
    expect((await create()).employeeId).toBe("KP-000002");
    const profile = (await database.doc(`users/${first.uid}`).get()).data()!;
    expect(profile).toMatchObject({
      email: data.email,
      fullName: data.fullName,
      active: true,
      employmentStatus: "contract",
      employmentStartDate: data.employmentStartDate,
      role: "technician",
    });
    expect(JSON.stringify(profile)).not.toContain(data.password);
    expect(
      JSON.stringify(
        (await database.collection("auditLogs").get()).docs.map((d) =>
          d.data(),
        ),
      ),
    ).not.toContain(data.password);
    expect((await loginPassword(data.email)).localId).toBe(first.uid);
    expect((await auth.getUser(first.uid)).customClaims?.role).toBe(
      "technician",
    );
  });
  it("keeps the same UID and password after the first Google login", async () => {
    const data = input();
    const result = await create(data);
    expect((await loginGoogle(data.email)).localId).toBe(result.uid);
    expect((await loginPassword(data.email)).localId).toBe(result.uid);
    expect(
      (await auth.getUser(result.uid)).providerData
        .map((p) => p.providerId)
        .sort(),
    ).toEqual(["google.com", "password"]);
  });
  it.each(["technician", "admin"] as const)(
    "creates an account with the selected %s role",
    async (role) => {
      const data = input({ role });
      const result = await create(data);
      expect(
        (await database.doc(`users/${result.uid}`).get()).data()?.role,
      ).toBe(role);
      expect((await auth.getUser(result.uid)).customClaims?.role).toBe(role);
    },
  );
  it("updates only allowed fields, unlinks the old Google identity and preserves the password", async () => {
    const data = input();
    const result = await create(data);
    await loginGoogle(data.email, "old-google");
    await edit(result.uid);
    expect(
      (await database.doc(`users/${result.uid}`).get()).data(),
    ).toMatchObject({
      fullName: "Updated Employee",
      email: "updatedemployee@gmail.com",
      employmentStatus: "permanent",
      employmentStartDate: data.employmentStartDate,
      role: "technician",
      jobTitle: "Teknisi Senior",
      revision: 2,
    });
    expect(
      (await auth.getUser(result.uid)).providerData.map((p) => p.providerId),
    ).not.toContain("google.com");
    await expect(loginPassword(data.email)).rejects.toThrow();
    expect(
      (await loginGoogle("updatedemployee@gmail.com", "new-google")).localId,
    ).toBe(result.uid);
    expect((await loginPassword("updatedemployee@gmail.com")).localId).toBe(
      result.uid,
    );
    expect((await loginGoogle(data.email, "old-google")).localId).not.toBe(
      result.uid,
    );
  });
  it("changes the application password, then disables both login methods", async () => {
    const data = input();
    const result = await create(data);
    await edit(result.uid, {
      email: data.email,
      password: "ReplacementPass123!",
    });
    await expect(loginPassword(data.email)).rejects.toThrow();
    expect(
      (await loginPassword(data.email, "ReplacementPass123!")).localId,
    ).toBe(result.uid);
    await edit(result.uid, {
      expectedRevision: 2,
      email: data.email,
      active: false,
    });
    expect(
      (await database.doc(`users/${result.uid}`).get()).data()?.active,
    ).toBe(false);
    await expect(
      loginPassword(data.email, "ReplacementPass123!"),
    ).rejects.toThrow();
    await expect(loginGoogle(data.email)).rejects.toThrow();
  });
  it("creates inactive accounts and can activate them later", async () => {
    const data = input({ active: false, employmentStatus: "intern" });
    const result = await create(data);
    await expect(loginPassword(data.email)).rejects.toThrow();
    await edit(result.uid, { email: data.email, active: true });
    expect((await loginPassword(data.email)).localId).toBe(result.uid);
  });
  it("rejects duplicate email on create and edit without disabling the existing accounts", async () => {
    const data = input();
    await create(data);
    await expect(create(input({ email: data.email }))).rejects.toMatchObject({
      code: "already-exists",
    });
    const second = await create();
    await expect(edit(second.uid, { email: data.email })).rejects.toMatchObject(
      { code: "already-exists" },
    );
    expect((await auth.getUser(second.uid)).disabled).toBe(false);
  });
  it("rejects supervisor, unauthenticated, technician, inactive and stale-claim callers", async () => {
    await expect(
      manageEmployee(database, auth, "create", { data: input() }),
    ).rejects.toMatchObject({ code: "unauthenticated" });
    await expect(
      manageEmployee(database, auth, "create", {
        auth: { ...identity, token: { role: "technician" } },
        data: input(),
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await auth.setCustomUserClaims(identity.uid, { role: "supervisor" });
    await database.doc(`users/${identity.uid}`).update({ role: "supervisor" });
    identity.token.role = "supervisor";
    await expect(create(input({ role: "admin" }))).rejects.toMatchObject({
      code: "permission-denied",
    });
    await auth.setCustomUserClaims(identity.uid, { role: "admin" });
    await database.doc(`users/${identity.uid}`).update({ role: "admin" });
    identity.token.role = "admin";
    await database.doc(`users/${identity.uid}`).update({ active: false });
    await expect(create()).rejects.toMatchObject({ code: "permission-denied" });
    await database.doc(`users/${identity.uid}`).update({ active: true });
    await auth.setCustomUserClaims(identity.uid, { role: "technician" });
    await expect(create()).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("rejects invalid email, unknown roles and malformed dates at the backend", async () => {
    for (const data of [
      input({ email: "not-an-email" }),
      input({ role: "owner" }),
      input({ role: "supervisor" }),
      input({ employmentStartDate: "2026-02-30" }),
    ]) {
      await expect(create(data)).rejects.toMatchObject({
        code: "invalid-argument",
      });
    }
  });
  it("rejects stale revisions and self-deactivation/deletion", async () => {
    const result = await create();
    await expect(
      edit(result.uid, { expectedRevision: 0 }),
    ).rejects.toMatchObject({ code: "aborted" });
    await expect(
      edit(identity.uid, { expectedRevision: 0, active: false }),
    ).rejects.toMatchObject({ code: "failed-precondition" });
    await expect(
      manageEmployee(database, auth, "delete", {
        auth: identity,
        data: {
          uid: identity.uid,
          requestId: randomUUID(),
          expectedRevision: 0,
        },
      }),
    ).rejects.toMatchObject({ code: "failed-precondition" });
  });
  it("serializes concurrent updates so one revision wins", async () => {
    const result = await create();
    const outcomes = await Promise.allSettled([
      edit(result.uid),
      edit(result.uid),
    ]);
    expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
  }, 30000);
  it("recovers provisional creation from the employee editor after a claims failure", async () => {
    const data = input();
    vi.spyOn(auth, "setCustomUserClaims").mockRejectedValueOnce(
      new Error("Synthetic claims failure"),
    );
    await expect(create(data)).rejects.toMatchObject({ code: "unavailable" });
    const uid = `employee-${data.requestId}`;
    expect((await database.doc(`users/${uid}`).get()).data()?.active).toBe(
      false,
    );
    await expect(create({ ...data, role: "admin" })).rejects.toMatchObject({
      code: "already-exists",
    });
    await edit(uid, { email: data.email, expectedRevision: 0 });
    expect((await auth.getUser(uid)).customClaims?.role).toBe("technician");
    expect((await loginPassword(data.email)).localId).toBe(uid);
  });
  it("rejects a revoked admin session and a mismatched token email", async () => {
    await expect(
      manageEmployee(database, auth, "create", {
        auth: { ...identity, token: { ...identity.token, auth_time: 1 } },
        data: input(),
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
    await expect(
      manageEmployee(database, auth, "create", {
        auth: {
          ...identity,
          token: { ...identity.token, email: "old@kudaprima.test" },
        },
        data: input(),
      }),
    ).rejects.toMatchObject({ code: "permission-denied" });
  });
  it("keeps an interrupted update inactive and can retry without changing the employee ID", async () => {
    const result = await create();
    const original = auth.updateUser.bind(auth);
    let fail = true;
    vi.spyOn(auth, "updateUser").mockImplementation(async (uid, properties) => {
      if (properties.email && fail) {
        fail = false;
        throw new Error("Synthetic transient failure");
      }
      return original(uid, properties);
    });
    await expect(edit(result.uid)).rejects.toMatchObject({
      code: "unavailable",
    });
    expect(
      (await database.doc(`users/${result.uid}`).get()).data()?.active,
    ).toBe(false);
    expect((await auth.getUser(result.uid)).disabled).toBe(true);
    expect(await edit(result.uid)).toEqual(result);
    expect((await auth.getUser(result.uid)).disabled).toBe(false);
  });
  it("deletes Auth and profile, preserves attendance/audit and permits a lost-response retry", async () => {
    const data = input();
    const result = await create(data);
    await database
      .doc("attendanceEvents/immutable-example")
      .set({ userId: result.uid, fullName: data.fullName });
    const request = {
      auth: identity,
      data: { uid: result.uid, expectedRevision: 1, requestId: randomUUID() },
    };
    await manageEmployee(database, auth, "delete", request);
    expect(await manageEmployee(database, auth, "delete", request)).toEqual(
      result,
    );
    expect((await database.doc(`users/${result.uid}`).get()).exists).toBe(
      false,
    );
    await expect(auth.getUser(result.uid)).rejects.toMatchObject({
      code: "auth/user-not-found",
    });
    await expect(loginPassword(data.email)).rejects.toThrow();
    expect(
      (await database.doc("attendanceEvents/immutable-example").get()).data(),
    ).toEqual({ userId: result.uid, fullName: data.fullName });
    expect((await database.collection("auditLogs").get()).size).toBe(2);
  });
  it("does not report success if Auth deletion fails and supports retry", async () => {
    const result = await create();
    const request = {
      auth: identity,
      data: { uid: result.uid, expectedRevision: 1, requestId: randomUUID() },
    };
    vi.spyOn(auth, "deleteUser").mockRejectedValueOnce(
      new Error("Synthetic failure"),
    );
    await expect(
      manageEmployee(database, auth, "delete", request),
    ).rejects.toMatchObject({ code: "unavailable" });
    expect(
      (await database.doc(`users/${result.uid}`).get()).data()?.active,
    ).toBe(false);
    await manageEmployee(database, auth, "delete", request);
    expect((await database.doc(`users/${result.uid}`).get()).exists).toBe(
      false,
    );
  });
});
