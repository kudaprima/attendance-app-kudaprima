import {
  AlertTriangle,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  MapPin,
  Menu,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const summaryCards = [
  {
    label: "Hadir hari ini",
    value: "0",
    icon: CheckCircle2,
    tone: "text-emerald-600",
  },
  { label: "Terlambat", value: "0", icon: Clock3, tone: "text-amber-600" },
  {
    label: "Presensi lapangan",
    value: "0",
    icon: MapPin,
    tone: "text-blue-600",
  },
  {
    label: "Menunggu persetujuan",
    value: "0",
    icon: FileCheck2,
    tone: "text-violet-600",
  },
];

const navigation = [
  { label: "Ringkasan", icon: BriefcaseBusiness },
  { label: "Karyawan", icon: Users },
  { label: "Presensi", icon: Clock3 },
  { label: "Persetujuan", icon: FileCheck2 },
  { label: "Kalender kerja", icon: CalendarDays },
  { label: "Audit", icon: AlertTriangle },
];

function App() {
  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="flex h-16 items-center gap-3 px-4 lg:px-6">
          <Button
            className="lg:hidden"
            size="icon"
            variant="outline"
            aria-label="Buka navigasi"
          >
            <Menu />
          </Button>
          <div className="grid size-9 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">
            KP
          </div>
          <div>
            <p className="font-semibold leading-tight">PT Kuda Prima</p>
            <p className="text-xs text-muted-foreground">Attendance Admin</p>
          </div>
          <Badge className="ml-auto" variant="secondary">
            Development
          </Badge>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r bg-background p-4 lg:block">
          <nav className="space-y-1" aria-label="Navigasi utama">
            {navigation.map(({ label, icon: Icon }, index) => (
              <Button
                className="w-full justify-start"
                key={label}
                variant={index === 0 ? "secondary" : "ghost"}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="space-y-6 p-4 lg:p-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Ringkasan presensi
            </h1>
            <p className="text-sm text-muted-foreground">
              Kondisi operasional PT Kuda Prima untuk hari ini.
            </p>
          </div>

          <section
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
            aria-label="Indikator utama"
          >
            {summaryCards.map(({ label, value, icon: Icon, tone }) => (
              <Card key={label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{label}</CardTitle>
                  <Icon className={tone} size={18} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-semibold">{value}</p>
                  <p className="text-xs text-muted-foreground">
                    Data emulator belum tersedia
                  </p>
                </CardContent>
              </Card>
            ))}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Aktivitas terbaru</CardTitle>
              <CardDescription>
                Event asli bersifat immutable; koreksi dicatat sebagai event dan
                audit terpisah.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Aktivitas</TableHead>
                    <TableHead>Lokasi</TableHead>
                    <TableHead>Waktu WIB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="h-24 text-center text-muted-foreground"
                    >
                      Belum ada data presensi.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

export default App;
