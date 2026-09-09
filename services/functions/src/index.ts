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
