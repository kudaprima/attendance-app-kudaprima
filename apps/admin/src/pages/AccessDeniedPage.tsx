import { LogOut, ShieldBan } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AccessDeniedPageProps {
  email: string | null;
  role: string | null;
  isActive: boolean;
  onSignOut: () => Promise<void>;
}

export function AccessDeniedPage({
  email,
  role,
  isActive,
  onSignOut,
}: AccessDeniedPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md border-destructive/30 text-center shadow-lg">
        <CardHeader className="space-y-2">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/15 text-destructive">
            <ShieldBan className="size-6" />
          </div>
          <CardTitle className="text-xl text-destructive">
            Akses Ditolak
          </CardTitle>
          <CardDescription>
            {email} ({role || "Tanpa Role"})
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3 text-sm text-muted-foreground">
          {!isActive ? (
            <p>
              Akun Anda telah <strong>dinonaktifkan</strong> oleh pihak manajemen PT Kuda Prima. Hubungi Administrator jika terdapat kekeliruan data.
            </p>
          ) : role === "technician" ? (
            <p>
              Akun Anda terdaftar dengan peran <strong>Teknisi</strong>. Web Portal Administrasi ini hanya dapat diakses oleh peran <strong>Supervisor</strong> dan <strong>Admin</strong>.
              <br /><br />
              Untuk mencatat kehadiran masuk/pulang, cuti, atau pengajuan lembur, silakan gunakan <strong>Aplikasi Android Kuda Prima</strong>.
            </p>
          ) : (
            <p>
              Akun Anda belum memiliki hak akses manajerial yang valid di sistem PT Kuda Prima.
            </p>
          )}
        </CardContent>

        <CardFooter className="justify-center">
          <Button variant="outline" className="gap-2" onClick={onSignOut}>
            <LogOut className="size-4" />
            Keluar dari Akun Ini
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
