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
import { useAttendanceLiveFeed } from "@/hooks/use-attendance-live";

const navigation = [
  { label: "Ringkasan", icon: BriefcaseBusiness },
  { label: "Karyawan", icon: Users },
  { label: "Presensi", icon: Clock3 },
  { label: "Persetujuan", icon: FileCheck2 },
  { label: "Kalender kerja", icon: CalendarDays },
  { label: "Audit", icon: AlertTriangle },
];

function App() {
  const { events, kpis, loading } = useAttendanceLiveFeed();

  const summaryCards = [
    {
      label: "Hadir hari ini",
      value: kpis.presentToday.toString(),
      icon: CheckCircle2,
      tone: "text-emerald-600",
    },
    {
      label: "Terlambat",
      value: kpis.late.toString(),
      icon: Clock3,
      tone: "text-amber-600",
    },
    {
      label: "Presensi lapangan",
      value: kpis.field.toString(),
      icon: MapPin,
      tone: "text-blue-600",
    },
    {
      label: "Menunggu persetujuan",
      value: kpis.pendingApproval.toString(),
      icon: FileCheck2,
      tone: "text-violet-600",
    },
  ];

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
                    {loading ? "Memuat data..." : "Sinkronisasi real-time"}
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
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {loading
                          ? "Memuat data presensi..."
                          : "Belum ada data presensi hari ini."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="font-mono text-xs font-medium">
                          {event.employeeId}
                        </TableCell>
                        <TableCell className="font-medium">
                          {event.fullName}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              event.eventType === "check_in"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {event.eventType === "check_in"
                              ? "Masuk"
                              : "Pulang"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs">
                              {event.locationType === "office"
                                ? "Kantor PT Kuda Prima"
                                : `Lapangan (${event.distanceMeters} m)`}
                            </span>
                            {event.note && (
                              <span className="text-xs text-muted-foreground italic">
                                &ldquo;{event.note}&rdquo;
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span>{event.timeWib}</span>
                            {event.status === "late" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Terlambat
                              </Badge>
                            )}
                            {event.status === "early_departure" && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Pulang Awal
                              </Badge>
                            )}
                            {event.status === "non_working_day" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-900 border border-amber-300"
                              >
                                Luar Hari Kerja
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
