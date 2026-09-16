import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  authChanged: undefined as any,
  profileChanged: undefined as any,
  profileError: undefined as any,
}));
vi.mock("@/lib/firebase", () => ({
  auth: {},
  firestore: {},
  useFirebaseEmulators: true,
}));
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_: unknown, callback: unknown) => {
    mocks.authChanged = callback;
    return vi.fn();
  },
  signInWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  onSnapshot: (_: unknown, next: unknown, error: unknown) => {
    mocks.profileChanged = next;
    mocks.profileError = error;
    return vi.fn();
  },
}));
import { useAdminAuth } from "./use-admin-auth";
const user = {
  uid: "manager",
  email: "manager@kudaprima.test",
  getIdTokenResult: async () => ({ claims: { role: "admin" } }),
};
const profile = {
  active: true,
  authUid: "manager",
  email: user.email,
  role: "admin",
  jobTitle: "Supervisor",
};
beforeEach(() => {
  mocks.authChanged = undefined;
  mocks.profileChanged = undefined;
  mocks.profileError = undefined;
});
describe("manager auth verification", () => {
  it("denies missing profile and read failures", async () => {
    const { result } = renderHook(useAdminAuth);
    await act(async () => {
      await mocks.authChanged(user);
    });
    act(() =>
      mocks.profileChanged({ exists: () => false, data: () => undefined }),
    );
    expect(result.current.isActive).toBe(false);
    act(() => mocks.profileError(new Error("offline")));
    expect(result.current.isActive).toBe(false);
  });
  it("reacts to deactivation and mismatched claims while signed in", async () => {
    const { result } = renderHook(useAdminAuth);
    await act(async () => {
      await mocks.authChanged(user);
    });
    act(() =>
      mocks.profileChanged({ exists: () => true, data: () => profile }),
    );
    await waitFor(() => expect(result.current.isActive).toBe(true));
    act(() =>
      mocks.profileChanged({
        exists: () => true,
        data: () => ({ ...profile, active: false }),
      }),
    );
    expect(result.current.isActive).toBe(false);
    act(() =>
      mocks.profileChanged({
        exists: () => true,
        data: () => ({ ...profile, role: "technician" }),
      }),
    );
    expect(result.current.isActive).toBe(false);
  });
});
