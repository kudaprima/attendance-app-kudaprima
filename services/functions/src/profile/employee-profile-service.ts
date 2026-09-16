import type { ProvisionEmployeeProfileCommand } from "@kuda-prima/contracts";
import { FieldValue, type Firestore } from "firebase-admin/firestore";

const employeeCounterPath = "systemCounters/employeeId";
const maximumEmployeeSequence = 999_999;
const employeeIdPattern = /^KP-\d{6}$/;

export interface ProvisioningResult {
  readonly created: boolean;
  readonly employeeId: string;
}

export class EmployeeProfileConflictError extends Error {
  constructor() {
    super("A different profile already exists for this Auth UID.");
    this.name = "EmployeeProfileConflictError";
  }
}

export class EmployeeCounterError extends Error {
  constructor() {
    super("The employee ID counter is invalid or exhausted.");
    this.name = "EmployeeCounterError";
  }
}

function formatEmployeeId(sequence: number): string {
  return `KP-${sequence.toString().padStart(6, "0")}`;
}

function existingProfileMatches(
  existing: FirebaseFirestore.DocumentData,
  command: ProvisionEmployeeProfileCommand,
): boolean {
  return (
    existing.authUid === command.authUid &&
    existing.email === command.email &&
    existing.fullName === command.fullName &&
    existing.role === command.role &&
    existing.jobTitle === command.jobTitle &&
    existing.employmentStatus === command.employmentStatus &&
    existing.employmentStartDate === command.employmentStartDate &&
    typeof existing.employeeId === "string" &&
    employeeIdPattern.test(existing.employeeId)
  );
}

export async function ensureEmployeeProfile(
  database: Firestore,
  command: ProvisionEmployeeProfileCommand,
  actorUid: string,
  initiallyActive = true,
): Promise<ProvisioningResult> {
  const profileReference = database.doc(`users/${command.authUid}`);
  const counterReference = database.doc(employeeCounterPath);
  const auditReference = database.collection("auditLogs").doc();

  return database.runTransaction(async (transaction) => {
    const existingSnapshot = await transaction.get(profileReference);

    if (existingSnapshot.exists) {
      const existing = existingSnapshot.data();
      if (!existing || !existingProfileMatches(existing, command)) {
        throw new EmployeeProfileConflictError();
      }

      return {
        created: false,
        employeeId: existing.employeeId as string,
      };
    }

    const counterSnapshot = await transaction.get(counterReference);
    const sequence = counterSnapshot.exists
      ? counterSnapshot.get("nextSequence")
      : 1;

    if (
      !Number.isSafeInteger(sequence) ||
      sequence < 1 ||
      sequence > maximumEmployeeSequence
    ) {
      throw new EmployeeCounterError();
    }

    const employeeId = formatEmployeeId(sequence);
    const serverTimestamp = FieldValue.serverTimestamp();

    transaction.set(profileReference, {
      active: initiallyActive,
      authUid: command.authUid,
      birthDate: null,
      createdAt: serverTimestamp,
      createdBy: actorUid,
      email: command.email,
      employeeId,
      employmentStartDate: command.employmentStartDate,
      employmentStatus: command.employmentStatus,
      fullName: command.fullName,
      gender: null,
      homeAddress: null,
      phone: null,
      role: command.role,
      jobTitle: command.jobTitle,
      updatedAt: serverTimestamp,
      updatedBy: actorUid,
    });
    transaction.set(
      counterReference,
      {
        nextSequence: sequence + 1,
        updatedAt: serverTimestamp,
        updatedBy: actorUid,
      },
      { merge: true },
    );
    transaction.set(auditReference, {
      action: "employee_profile_provisioned",
      actorUid,
      createdAt: serverTimestamp,
      subjectEmployeeId: employeeId,
      subjectUid: command.authUid,
    });

    return { created: true, employeeId };
  });
}
