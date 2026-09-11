import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  it("renders login inputs and submit button", () => {
    const handleLogin = vi.fn();
    render(
      <LoginPage onLogin={handleLogin} loading={false} errorMessage={null} />,
    );

    expect(screen.getByLabelText("Email Perusahaan")).toBeInTheDocument();
    expect(screen.getByLabelText("Kata Sandi")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
  });

  it("submits email and password on form submit", async () => {
    const handleLogin = vi.fn().mockResolvedValue(undefined);
    render(
      <LoginPage onLogin={handleLogin} loading={false} errorMessage={null} />,
    );

    fireEvent.change(screen.getByLabelText("Email Perusahaan"), {
      target: { value: "admin.dev@kudaprima.test" },
    });
    fireEvent.change(screen.getByLabelText("Kata Sandi"), {
      target: { value: "KudaPrimaDev2026#" },
    });
    fireEvent.click(screen.getByTestId("login-submit-button"));

    expect(handleLogin).toHaveBeenCalledWith(
      "admin.dev@kudaprima.test",
      "KudaPrimaDev2026#",
    );
  });

  it("displays error message when provided", () => {
    render(
      <LoginPage
        onLogin={vi.fn()}
        loading={false}
        errorMessage="Akun tidak ditemukan."
      />,
    );

    expect(screen.getByText("Akun tidak ditemukan.")).toBeInTheDocument();
  });
});
