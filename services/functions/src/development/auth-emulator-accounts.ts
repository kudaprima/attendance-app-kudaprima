import type { UserRole } from "@kuda-prima/contracts";

export const authEmulatorProjectId = "kuda-prima-attandance-dev";
export const authEmulatorHost = "127.0.0.1:9099";
export const authEmulatorPassword = "KudaPrimaDev2026#";

export interface DevelopmentAuthAccount {
  readonly uid: string;
  readonly email: string;
  readonly displayName: string;
  readonly role: UserRole;
}

export const developmentAuthAccounts = [
  {
    uid: "dev-technician",
    email: "technician.dev@kudaprima.test",
    displayName: "Teknisi Development",
    role: "technician",
  },
  {
    uid: "dev-supervisor",
    email: "supervisor.dev@kudaprima.test",
    displayName: "Supervisor Development",
    role: "supervisor",
  },
  {
    uid: "dev-admin",
    email: "admin.dev@kudaprima.test",
    displayName: "Admin Development",
    role: "admin",
  },
] as const satisfies readonly DevelopmentAuthAccount[];
