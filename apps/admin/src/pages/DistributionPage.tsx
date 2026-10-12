import {
  Check,
  Copy,
  Download,
  FileCheck,
  Link2,
  Printer,
  QrCode,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import { useMemo, useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateQrCodeMatrix } from "@/lib/qr-code";

const QUIET_ZONE_MODULES = 4;

function getDefaultDownloadUrl(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/download/kudaprima-attendance.apk`;
  }
  return "https://kuda-prima-attandance-dev.web.app/download/kudaprima-attendance.apk";
}

export function DistributionPage() {
  const defaultUrl = useMemo(() => getDefaultDownloadUrl(), []);
  const [targetUrl, setTargetUrl] = useState<string>(defaultUrl);
  const [copied, setCopied] = useState(false);

  const effectiveUrl = targetUrl.trim() || defaultUrl;
  const qrMatrix = useMemo(
    () => generateQrCodeMatrix(effectiveUrl),
    [effectiveUrl],
  );
  const matrixSize = qrMatrix.length;
  const viewBoxSize = matrixSize + QUIET_ZONE_MODULES * 2;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyUrl = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(effectiveUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleResetUrl = () => {
    setTargetUrl(defaultUrl);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Distribusi APK Android
          </h1>
          <p className="text-sm text-muted-foreground">
            Distribusi aplikasi mandiri (sideloaded) dengan QR Code standar
            ISO/IEC 18004 yang permanen, bebas biaya, dan berjalan 100% lokal.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            onClick={handlePrint}
          >
            <Printer className="size-4" />
            Cetak Poster QR
          </Button>
          <Button asChild className="gap-2">
            <a href={effectiveUrl} download="kudaprima-attendance.apk">
              <Download className="size-4" />
              Unduh APK
            </a>
          </Button>
        </div>
      </div>

      {/* Pengaturan Tautan Unduhan APK (Disembunyikan saat cetak poster) */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="size-4 text-primary" />
            Konfigurasi Tautan Unduhan APK
          </CardTitle>
          <CardDescription>
            QR Code di bawah dihasilkan secara matematis langsung di browser
            tanpa layanan pihak ketiga, sehingga tidak akan pernah kedaluwarsa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="apk-download-url-input">
                URL File APK (Firebase Hosting / Rilis Internal)
              </Label>
              <Input
                id="apk-download-url-input"
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder={defaultUrl}
                className="font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={handleCopyUrl}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
                {copied ? "Tersalin" : "Salin URL"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={handleResetUrl}
              >
                <RotateCcw className="size-4" />
                Reset Default
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Poster QR Code Resmi */}
        <Card className="border-2 border-primary/20 shadow-sm print:border-2 print:border-slate-300 print:shadow-none">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-2 flex justify-center">
              <BrandLogo className="w-32" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 mb-1">
              <Badge variant="secondary">Android 10+ (API 29+)</Badge>
              <Badge
                variant="outline"
                className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                <QrCode className="mr-1 size-3" />
                QR Permanen (ISO 18004)
              </Badge>
            </div>
            <CardTitle className="text-xl">Scan untuk Mengunduh APK</CardTitle>
            <CardDescription>
              Arahkan kamera ponsel atau Google Lens ke QR Code resmi di bawah
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 pt-2">
            <div className="rounded-2xl border-4 border-primary/15 bg-white p-4 shadow-inner">
              <svg
                data-testid="real-apk-qr-svg"
                role="img"
                aria-label={`QR Code unduhan APK PT Kuda Prima: ${effectiveUrl}`}
                className="size-60"
                viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
                shapeRendering="crispEdges"
              >
                <title>QR Code Unduhan APK PT Kuda Prima</title>
                <rect
                  x={0}
                  y={0}
                  width={viewBoxSize}
                  height={viewBoxSize}
                  fill="#ffffff"
                />
                {qrMatrix.map((row, rIdx) =>
                  row.map((isDark, cIdx) =>
                    isDark ? (
                      <rect
                        key={`${rIdx}-${cIdx}`}
                        x={cIdx + QUIET_ZONE_MODULES}
                        y={rIdx + QUIET_ZONE_MODULES}
                        width={1}
                        height={1}
                        fill="#0f172a"
                      />
                    ) : null,
                  ),
                )}
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p
                data-testid="apk-download-url-display"
                className="font-mono text-xs text-muted-foreground break-all"
              >
                {effectiveUrl}
              </p>
              <p className="mt-1.5 text-xs font-medium text-emerald-600">
                ● Rilis Terkini: v1.0.0-production (Build 1) • Bebas Kedaluwarsa
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Petunjuk Instalasi & Informasi Teknis */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Smartphone className="size-5 text-primary" />
                Panduan Pemasangan di Android
              </CardTitle>
              <CardDescription>
                Langkah memasang aplikasi di ponsel teknisi/karyawan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  1
                </div>
                <p>
                  Pindai QR code menggunakan kamera ponsel atau buka browser
                  Chrome lalu unduh file{" "}
                  <strong>kudaprima-attendance.apk</strong>.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  2
                </div>
                <p>
                  Jika muncul peringatan <em>"File ini mungkin berbahaya"</em>,
                  pilih <strong>Tetap Download</strong> karena ini adalah
                  aplikasi internal resmi PT Kuda Prima.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  3
                </div>
                <p>
                  Buka file yang diunduh. Jika diminta izin sistem, aktifkan
                  opsi <strong>"Izinkan dari sumber ini"</strong> (Install
                  unknown apps) pada pengaturan ponsel.
                </p>
              </div>
              <div className="flex gap-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary text-xs">
                  4
                </div>
                <p>
                  Tekan <strong>Pasang / Install</strong>, kemudian buka
                  aplikasi dan izinkan akses <strong>Kamera</strong> dan{" "}
                  <strong>Lokasi</strong> saat presensi.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="size-5 text-primary" />
                Integritas & Metadata Paket
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Nama Paket:</span>
                <span className="font-mono">com.kudaprima.attendance</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Target Platform:</span>
                <span>Android 10.0+ (API 29 hingga 34)</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">
                  Tipe Penandatanganan:
                </span>
                <span>Kuda Prima Enterprise Keystore</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-muted-foreground">Generator QR:</span>
                <span className="text-emerald-600 font-semibold">
                  Lokal Permanen (ISO/IEC 18004 Level L)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
