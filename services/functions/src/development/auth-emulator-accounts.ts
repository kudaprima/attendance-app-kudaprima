import type { EmploymentStatus, UserRole } from "@kuda-prima/contracts";

export const authEmulatorProjectId = "kuda-prima-attandance-dev";
export const authEmulatorHost = "127.0.0.1:9099";
export const firestoreEmulatorHost = "127.0.0.1:8080";
export const authEmulatorPassword = "KudaPrimaDev2026#";

export interface DevelopmentAuthAccount {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
  readonly employmentStatus: EmploymentStatus;
  readonly employmentStartDate: string;
}

export const developmentAuthAccounts = [
  {
    uid: "dev-technician",
    email: "technician.dev@kudaprima.test",
    displayName: "Teknisi Development",
    role: "technician",
    employmentStatus: "contract",
    employmentStartDate: "2025-01-01",
  },
  {
    uid: "dev-supervisor",
    email: "supervisor.dev@kudaprima.test",
    displayName: "Supervisor Development",
    role: "supervisor",
    employmentStatus: "permanent",
    employmentStartDate: "2020-01-01",
  },
  {
    uid: "dev-admin",
    email: "admin.dev@kudaprima.test",
    displayName: "Admin Development",
    role: "admin",
    employmentStatus: "permanent",
    employmentStartDate: "2020-01-01",
  },
] as const satisfies readonly DevelopmentAuthAccount[];
