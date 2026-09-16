import { initializeApp } from "firebase-admin/app";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
initializeApp();

setGlobalOptions({
  region: "asia-southeast2",
  maxInstances: 10,
  memory: "256MiB",
  timeoutSeconds: 30,
});

export const health = onRequest((request, response) => {
  if (request.method !== "GET") {
    response.status(405).json({ error: "method_not_allowed" });
    return;
  }

  response.status(200).json({
    service: "kuda-prima-attendance",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

const enforceAppCheck = process.env.FUNCTIONS_EMULATOR !== "true";

export const provisionEmployeeProfile = onCall(
  { enforceAppCheck },
  async (request) => {
    const { handleProvisionEmployeeProfile } =
      await import("./profile/provision-employee-profile.js");
    return handleProvisionEmployeeProfile(request);
  },
);

export const submitAttendance = onCall({ enforceAppCheck }, async (request) => {
  const { handleSubmitAttendance } =
    await import("./attendance/submit-attendance.js");
  return handleSubmitAttendance(request);
});

export const processAttendanceApproval = onCall(
  { enforceAppCheck },
  async (request) => {
    const [{ getFirestore }, { handleProcessAttendanceApproval }] =
      await Promise.all([
        import("firebase-admin/firestore"),
        import("./attendance/attendance-approval-service.js"),
      ]);
    return handleProcessAttendanceApproval(request, getFirestore());
  },
);

function employeeCallable(action: "create" | "update" | "delete") {
  return onCall({ enforceAppCheck, timeoutSeconds: 60 }, async (request) => {
    const [{ getAuth }, { getFirestore }, { manageEmployee }] =
      await Promise.all([
        import("firebase-admin/auth"),
        import("firebase-admin/firestore"),
        import("./employees/employee-management-service.js"),
      ]);
    return manageEmployee(getFirestore(), getAuth(), action, request);
  });
}
export const createEmployee = employeeCallable("create");
export const updateEmployee = employeeCallable("update");
export const deleteEmployee = employeeCallable("delete");
