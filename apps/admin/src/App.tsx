import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileCheck2,
  LogOut,
  PackageCheck,
  Settings,
  UserRoundCog,
} from "lucide-react";

import { AdminAuthGate } from "@/components/AdminAuthGate";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";
import { useAttendanceLiveFeed } from "@/hooks/use-attendance-live";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import { DistributionPage } from "@/pages/DistributionPage";
import { EmployeesPage } from "@/pages/EmployeesPage";
import { ReportsPage } from "@/pages/ReportsPage";
import { SettingsPage } from "@/pages/SettingsPage";

export type AdminTab =
  | "Kehadiran"
  | "Persetujuan"
  | "Version APK"
  | "Kelola User"
  | "Laporan"
  | "Pengaturan";

const navigation = [
  { label: "Kehadiran" as AdminTab, icon: CalendarDays },
  { label: "Persetujuan" as AdminTab, icon: FileCheck2 },
  { label: "Version APK" as AdminTab, icon: PackageCheck },
  { label: "Kelola User" as AdminTab, icon: UserRoundCog },
  { label: "Laporan" as AdminTab, icon: CalendarDays },
  { label: "Pengaturan" as AdminTab, icon: Settings },
];


function useWibClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(
    () =>
      new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
        timeZone: "Asia/Jakarta",
        timeZoneName: "short",
      }).format(now),
    [now],
  );
}

function AttendancePage({
  onNavigateToApprovals,
}: {
  onNavigateToApprovals?: () => void;
}) {
  const { events, kpis, loading } = useAttendanceLiveFeed();
  const summaryCards = [
    {
      label: "Hadir hari ini",
      value: kpis.presentToday.toString(),
      icon: CheckCircle2,
      tone: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Terlambat",
      value: kpis.late.toString(),
      icon: Clock3,
      tone: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "Menunggu persetujuan",
      value: kpis.pendingApproval.toString(),
      icon: FileCheck2,
      tone: "text-violet-600 dark:text-violet-400",
      onClick: onNavigateToApprovals,
      clickable: Boolean(onNavigateToApprovals),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kehadiran</h1>
        <p className="text-sm text-muted-foreground">
          Monitoring kehadiran karyawan secara real-time.
        </p>
      </div>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Indikator utama"
      >
        {summaryCards.map(({ label, value, icon: Icon, tone, onClick, clickable }) => (
          <Card
            key={label}
            onClick={onClick}
            className={
              clickable
                ? "cursor-pointer transition-all hover:border-violet-300 hover:shadow-sm"
                : undefined
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>
              <Icon className={tone} size={18} />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{value}</p>
              <p className="text-xs text-muted-foreground">
                {loading
                  ? "Memuat data..."
                  : clickable && Number(value) > 0
                    ? "Klik untuk memproses antrean persetujuan."
                    : "Data diperbarui secara real-time."}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Aktivitas terbaru</CardTitle>
          <CardDescription>
            Pantau linimasa absensi, pengajuan izin, dan rekam jejak operasional
            terkini.
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
                      ? "Memuat data kehadiran..."
                      : "Belum ada data kehadiran hari ini."}
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
                        {event.locationType === "office"
                          ? "Kantor"
                          : "Lapangan"}
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
    </div>
  );
}

export function AdminDashboard({
  jobTitle,
  onSignOut,
}: {
  user?: { email?: string | null; displayName?: string | null };
  role?: string | null;
  jobTitle?: string | null;
  onSignOut?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("Kehadiran");
  const currentTime = useWibClock();

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border">
          <div className="flex h-12 items-center gap-3 px-1 group-data-[collapsible=icon]:justify-center">
            <BrandLogo compact className="w-12 shrink-0" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-semibold">PT Kuda Prima</p>
              <p className="truncate text-xs text-muted-foreground">
                Portal Admin
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Menu utama</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map(({ label, icon: Icon }) => (
                  <SidebarMenuItem key={label}>
                    <SidebarMenuButton
                      tooltip={label}
                      isActive={activeTab === label}
                      onClick={() => setActiveTab(label)}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Logout"
                onClick={onSignOut}
                disabled={!onSignOut}
                className="text-destructive hover:text-destructive"
              >
                <LogOut aria-hidden="true" />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-muted/25">
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-background/95 px-4 py-2 backdrop-blur lg:px-6">
          <SidebarTrigger aria-label="Buka atau tutup sidebar" />

          <div className="order-3 w-full min-w-0 text-right sm:order-0 sm:ml-auto sm:w-auto">
            <p className="text-[11px] text-muted-foreground sm:text-xs">
              {currentTime}
            </p>
            <p className="text-xs font-medium sm:text-sm">
              Masuk sebagai {jobTitle?.trim() || "Belum diisi"}
            </p>
          </div>
          <div className="ml-auto sm:ml-0">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 space-y-6 p-4 lg:p-8">
          {activeTab === "Kehadiran" && (
            <AttendancePage
              onNavigateToApprovals={() => setActiveTab("Persetujuan")}
            />
          )}
          {activeTab === "Persetujuan" && <ApprovalsPage />}
          {activeTab === "Version APK" && <DistributionPage />}
          {activeTab === "Kelola User" && <EmployeesPage />}
          {activeTab === "Laporan" && <ReportsPage />}
          {activeTab === "Pengaturan" && <SettingsPage />}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AuthenticatedApp() {
  const { user, role, jobTitle, signOut } = useCurrentAdminAuth();
  return (
    <AdminDashboard user={user ?? undefined} role={role} jobTitle={jobTitle} onSignOut={signOut} />
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
        jobTitle="Administrator Sistem"
      />
    );
  }

  return (
    <AdminAuthGate>
      <AuthenticatedApp />
    </AdminAuthGate>
  );
}
