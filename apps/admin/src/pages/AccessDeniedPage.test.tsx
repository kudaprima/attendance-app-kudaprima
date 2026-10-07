import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccessDeniedPage } from "./AccessDeniedPage";

describe("AccessDeniedPage", () => {
  it("shows technician access denied message", () => {
    const handleSignOut = vi.fn();
    render(
      <AccessDeniedPage
        email="technician.dev@kudaprima.test"
        role="technician"
        isActive={true}
        onSignOut={handleSignOut}
      />,
    );

    expect(screen.getByText("Akses Ditolak")).toBeInTheDocument();
    expect(screen.getByText(/Teknisi/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Aplikasi Android Kuda Prima/i),
    ).toBeInTheDocument();
  });

  it("shows inactive account message when isActive is false", () => {
    const handleSignOut = vi.fn();
    render(
      <AccessDeniedPage
        email="ex.employee@kudaprima.test"
        role="admin"
        isActive={false}
        onSignOut={handleSignOut}
      />,
    );

    expect(screen.getByText("Akses Ditolak")).toBeInTheDocument();
    expect(screen.getByText(/dinonaktifkan/i)).toBeInTheDocument();
  });

  it("calls onSignOut when sign out button is clicked", () => {
    const handleSignOut = vi.fn();
    render(
      <AccessDeniedPage
        email="technician.dev@kudaprima.test"
        role="technician"
        isActive={true}
        onSignOut={handleSignOut}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /Keluar dari Akun Ini/i }),
    );
    expect(handleSignOut).toHaveBeenCalledTimes(1);
  });
});
