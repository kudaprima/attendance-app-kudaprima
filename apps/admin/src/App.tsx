import { useState } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LogOut,
  MapPin,
  Menu,
  QrCode,
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
import { AdminAuthGate } from "@/components/AdminAuthGate";
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { DistributionPage } from "@/pages/DistributionPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { ReportsPage } from "@/pages/ReportsPage";

export type AdminTab =
  | "Ringkasan"
  | "Persetujuan"
  | "Distribusi APK"
  | "Karyawan"
  | "Laporan";

const navigation = [
  { label: "Ringkasan" as AdminTab, icon: BriefcaseBusiness },
  { label: "Persetujuan" as AdminTab, icon: FileCheck2 },
  { label: "Distribusi APK" as AdminTab, icon: QrCode },
  { label: "Karyawan" as AdminTab, icon: Users },
  { label: "Laporan" as AdminTab, icon: CalendarDays },
];

export function AdminDashboard({
  user,
  role,
  onSignOut,
}: {
  user?: { email?: string | null; displayName?: string | null };
  role?: string | null;
  onSignOut?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("Ringkasan");
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

          <div className="ml-auto flex items-center gap-3">
            {role && (
              <Badge variant="secondary" className="capitalize">
                {role === "admin" ? "Administrator" : "Supervisor"}
              </Badge>
            )}
            {user?.email && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {user.email}
              </span>
            )}
            {onSignOut && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                onClick={onSignOut}
              >
                <LogOut className="size-3.5" />
                <span className="hidden sm:inline">Keluar</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="grid lg:grid-cols-[240px_1fr]">
        <aside className="hidden min-h-[calc(100vh-4rem)] border-r bg-background p-4 lg:block">
          <nav className="space-y-1" aria-label="Navigasi utama">
            {navigation.map(({ label, icon: Icon }) => (
              <Button
                className="w-full justify-start gap-2"
                key={label}
                variant={activeTab === label ? "secondary" : "ghost"}
                onClick={() => setActiveTab(label)}
              >
                <Icon className="size-4" />
                {label}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="space-y-6 p-4 lg:p-8">
          {activeTab === "Ringkasan" && (
            <>
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
                                  event.status === "normal"
                                    ? "default"
                                    : event.status === "late"
                                      ? "destructive"
                                      : "outline"
                                }
                              >
                                {event.eventType === "check_in" ? "Masuk" : "Pulang"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {event.locationType === "office" ? "Kantor" : "Lapangan"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {event.timeWib}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "Persetujuan" && <ApprovalsPage />}
          {activeTab === "Distribusi APK" && <DistributionPage />}
          {activeTab === "Karyawan" && <EmployeesPage />}
          {activeTab === "Laporan" && <ReportsPage />}
        </main>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const { user, role, signOut } = useCurrentAdminAuth();
  return (
    <AdminDashboard
      user={user ?? undefined}
      role={role}
      onSignOut={signOut}
    />
  );
}

export default function App({ bypassAuth = false }: { bypassAuth?: boolean }) {
  if (bypassAuth || import.meta.env.MODE === "test") {
    return (
      <AdminDashboard
        user={{
          email: "admin.dev@kudaprima.test",
          displayName: "Admin Development",
        }}
        role="admin"
      />
    );
  }

  return (
    <AdminAuthGate>
      <AuthenticatedApp />
    </AdminAuthGate>
  );
}
