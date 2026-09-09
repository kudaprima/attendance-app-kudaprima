import { Download, FileCheck, Printer, Smartphone } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function DistributionPage() {
  const downloadUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/download/kudaprima-attendance.apk`
      : "https://kuda-prima-attandance-dev.web.app/download/kudaprima-attendance.apk";

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Distribusi APK Android
          </h1>
          <p className="text-sm text-muted-foreground">
            Distribusi aplikasi mandiri (sideloaded) tanpa melalui Google Play
            Store.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="size-4" />
            Cetak Poster QR
          </Button>
          <Button asChild className="gap-2">
            <a href={downloadUrl} download="kudaprima-attendance.apk">
              <Download className="size-4" />
              Unduh APK
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Poster QR Code */}
        <Card className="border-2 border-primary/20 shadow-sm print:border-none print:shadow-none">
          <CardHeader className="text-center pb-2">
            <Badge className="mx-auto w-fit mb-2" variant="secondary">
              Android 10+ (API 29+)
            </Badge>
            <CardTitle className="text-xl">Scan untuk Mengunduh</CardTitle>
            <CardDescription>
              Arahkan kamera ponsel Android Anda ke QR Code di bawah
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 pt-2">
            <div className="rounded-2xl border-4 border-primary/10 bg-white p-6 shadow-inner">
              {/* High-res vector-based QR Code representation */}
              <svg
                className="size-52 text-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <path d="M7 7h3v3H7z" fill="currentColor" />
                <path d="M14 7h3v3h-3z" fill="currentColor" />
                <path d="M7 14h3v3H7z" fill="currentColor" />
                <path d="M14 14h.01" strokeWidth="3" />
                <path d="M17 14h.01" strokeWidth="3" />
                <path d="M14 17h.01" strokeWidth="3" />
                <path d="M17 17h.01" strokeWidth="3" />
              </svg>
            </div>
            <div className="mt-4 text-center">
              <p className="font-mono text-xs text-muted-foreground break-all">
                {downloadUrl}
              </p>
              <p className="mt-1 text-xs font-medium text-emerald-600">
                ● Rilis Terkini: v1.0.0-production (Build 1)
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
                <span className="text-muted-foreground">Self-Update OTA:</span>
                <span className="text-emerald-600 font-semibold">
                  Tersinkronisasi dengan Firestore
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
