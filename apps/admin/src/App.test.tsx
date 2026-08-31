import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import App from "./App";

describe("App", () => {
  it("shows the attendance dashboard", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { name: "Ringkasan presensi" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Hadir hari ini")).toBeInTheDocument();
  });
});
