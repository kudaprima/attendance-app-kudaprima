import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { generateQrCodeMatrix } from "@/lib/qr-code";
import { DistributionPage } from "@/pages/DistributionPage";

describe("DistributionPage & ISO/IEC 18004 QR Code Generator", () => {
  it("generates a valid ISO/IEC 18004 QR matrix with 3 corner finder patterns and dark module", () => {
    const url =
      "https://kuda-prima-attandance-dev.web.app/download/kudaprima-attendance.apk";
    const matrix = generateQrCodeMatrix(url);

    // 75-byte URL uses Version 4 (size 33x33)
    expect(matrix.length).toBe(33);
    expect(matrix[0]?.length).toBe(33);

    // Top-left 7x7 finder outer corners & center (3,3) must be dark
    expect(matrix[0]?.[0]).toBe(true);
    expect(matrix[0]?.[6]).toBe(true);
    expect(matrix[6]?.[0]).toBe(true);
    expect(matrix[6]?.[6]).toBe(true);
    expect(matrix[3]?.[3]).toBe(true);
    // White ring inside finder (1,1) must be light
    expect(matrix[1]?.[1]).toBe(false);

    // Top-right 7x7 finder center
    expect(matrix[3]?.[33 - 4]).toBe(true);

    // Bottom-left 7x7 finder center
    expect(matrix[33 - 4]?.[3]).toBe(true);

    // Mandatory ISO/IEC 18004 Dark Module at (size - 8, 8)
    expect(matrix[33 - 8]?.[8]).toBe(true);
  });

  it("renders real QR Code SVG and updates dynamically when APK URL is edited", () => {
    render(<DistributionPage />);

    const qrSvg = screen.getByTestId("real-apk-qr-svg");
    expect(qrSvg).toBeInTheDocument();

    // Must contain hundreds of real dark module rects, not a static 8-element icon
    const initialRects = qrSvg.querySelectorAll("rect");
    expect(initialRects.length).toBeGreaterThan(200);

    const urlInput = screen.getByLabelText(
      /URL File APK \(Firebase Hosting \/ Rilis Internal\)/i,
    );
    fireEvent.change(urlInput, {
      target: { value: "https://kudaprima.id/apk/v1.apk" },
    });

    expect(screen.getByTestId("apk-download-url-display")).toHaveTextContent(
      "https://kudaprima.id/apk/v1.apk",
    );

    const resetBtn = screen.getByRole("button", { name: /Reset Default/i });
    fireEvent.click(resetBtn);
    expect(screen.getByTestId("apk-download-url-display")).toHaveTextContent(
      "/download/kudaprima-attendance.apk",
    );
  });
});
