import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminAuthContext, type AdminAuthState } from "@/hooks/use-admin-auth";
import App from "./App";

const authValue: AdminAuthState = {
  user: { uid: "dev-admin" } as AdminAuthState["user"],
  role: "admin",
  jobTitle: "Administrator",
  isActive: true,
  loading: false,
  error: null,
  login: async () => undefined,
  loginGoogle: async () => undefined,
  resetPassword: async () => undefined,
  signOut: async () => undefined,
};

function renderApp() {
  return render(
    <AdminAuthContext.Provider value={authValue}>
      <TooltipProvider>
        <App />
      </TooltipProvider>
    </AdminAuthContext.Provider>,
  );
}

describe("App", () => {
  it("shows the attendance dashboard and the requested navigation", () => {
    renderApp();
    expect(
      screen.getByRole("heading", { name: "Kehadiran" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hadir hari ini")).toBeInTheDocument();
    expect(screen.getByText("Terlambat")).toBeInTheDocument();
    expect(screen.getByText("Menunggu persetujuan")).toBeInTheDocument();
    expect(screen.queryByText("Presensi lapangan")).not.toBeInTheDocument();
    for (const label of [
      "Kehadiran",
      "Persetujuan",
      "Version APK",
      "Kelola User",
      "Laporan",
      "Pengaturan",
      "Logout",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(
      screen.getByText("Masuk sebagai Administrator Sistem"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("admin.dev@kudaprima.test"),
    ).not.toBeInTheDocument();
  });

  it("opens the settings page from the sidebar", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Pengaturan" }));
    expect(
      screen.getByRole("heading", { name: "Pengaturan" }),
    ).toBeInTheDocument();
  });

  it("shows an empty approvals queue with the revised copy", () => {
    renderApp();
    fireEvent.click(screen.getByRole("button", { name: "Persetujuan" }));

    expect(
      screen.getByText(
        "Tinjau dan kelola antrean pengajuan cuti, sakit, serta izin karyawan dalam satu dasbor terpadu.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Lembur (0)" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Cuti Tahunan (0)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Izin & Sakit (0)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tidak ada permohonan yang menunggu persetujuan pada kategori ini.",
      ),
    ).toBeInTheDocument();
  });
});
