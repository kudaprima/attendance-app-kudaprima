import { MonitorCog, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Preferensi portal admin PT Kuda Prima.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorCog className="size-5 text-primary" />
              Tampilan
            </CardTitle>
            <CardDescription>
              Tema terang atau gelap dapat diubah melalui ikon pada header.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-5 text-primary" />
              Akses akun
            </CardTitle>
            <CardDescription>
              Hak akses mengikuti role dan status akun yang tersimpan di
              Firebase.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Kelola perubahan akun melalui menu Kelola User.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
