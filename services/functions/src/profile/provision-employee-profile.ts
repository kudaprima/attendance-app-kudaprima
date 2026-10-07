import {
  provisionEmployeeProfileCommandSchema,
} from "@kuda-prima/contracts";
import { getAuth, type UserRecord } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import {
  EmployeeCounterError,
  EmployeeProfileConflictError,
  ensureEmployeeProfile,
} from "./employee-profile-service.js";

import { assertActiveAdmin, withAccessManagementLock } from "../employees/access-management.js";

interface CallableIdentity {
  readonly uid: string;
  readonly token: Record<string, unknown>;
}

export interface ProvisionEmployeeProfileRequest {
  readonly auth?: CallableIdentity;
  readonly data: unknown;
}


function hasErrorCode(error: unknown, expectedCode: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === expectedCode
  );
}

export async function handleProvisionEmployeeProfile(
  request: ProvisionEmployeeProfileRequest,
): Promise<{ created: boolean; employeeId: string }> {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const commandResult = provisionEmployeeProfileCommandSchema.safeParse(
    request.data,
  );
  if (!commandResult.success) {
    throw new HttpsError("invalid-argument", "Profile data is invalid.");
  }

  const database = getFirestore();
  return withAccessManagementLock(database, async () => {
  await assertActiveAdmin(database, getAuth(), request.auth);
  let authUser: UserRecord;
  try {
    authUser = await getAuth().getUser(commandResult.data.authUid);
  } catch (error) {
    if (hasErrorCode(error, "auth/user-not-found")) {
      throw new HttpsError("not-found", "The Auth account does not exist.");
    }
    throw error;
  }
  if (authUser.email?.trim().toLowerCase() !== commandResult.data.email) {
    throw new HttpsError(
      "failed-precondition",
      "The Auth account email does not match the profile.",
    );
  }

  try {
    const result = await ensureEmployeeProfile(
      database,
      commandResult.data,
      request.auth!.uid,
      false,
    );
    const profileRef = database.doc("users/" + commandResult.data.authUid);
    const profile = (await profileRef.get()).data()!;
    if (profile.managementAction) throw new HttpsError("failed-precondition", "Selesaikan pengelolaan akun terlebih dahulu.");
    const targetActive = profile.provisioningTargetActive ?? (result.created ? !authUser.disabled : profile.active);
    await profileRef.update({ active: false, provisioningTargetActive: targetActive });
    await getAuth().updateUser(authUser.uid, { disabled: true });
    await getAuth().revokeRefreshTokens(authUser.uid);
    await getAuth().setCustomUserClaims(commandResult.data.authUid, {
      ...authUser.customClaims,
      role: commandResult.data.role,
    });
    await getAuth().updateUser(authUser.uid, { disabled: !targetActive });
    await profileRef.update({ active: targetActive, provisioningTargetActive: FieldValue.delete() });
    return result;
  } catch (error) {
    if (error instanceof EmployeeProfileConflictError) {
      throw new HttpsError("already-exists", error.message);
    }
    if (error instanceof EmployeeCounterError) {
      throw new HttpsError("internal", error.message);
    }
    throw error;
  }
  });
}
