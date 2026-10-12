import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Eye,
  FileCheck2,
  LogOut,
  PackageCheck,
  Settings,
  UserRoundCog,
} from "lucide-react";

import { AdminAuthGate } from "@/components/AdminAuthGate";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AttendanceDetailDialog } from "@/components/attendance/AttendanceDetailDialog";
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
import { useCurrentAdminAuth, type UserRole } from "@/hooks/use-admin-auth";
import { useAttendanceLiveFeed } from "@/hooks/use-attendance-live";
import { ApprovalsPage } from "@/pages/ApprovalsPage";
import {
  DistributionPage,
  PublicApkDownloadPage,
} from "@/pages/DistributionPage";
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

const wibDateFormatter = new Intl.DateTimeFormat("id-ID", {
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
});

function useWibClock() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  return useMemo(() => wibDateFormatter.format(now), [now]);
}

function getSummaryCardDescription(
  loading: boolean,
  clickable: boolean | undefined,
  value: string,
): string {
  if (loading) {
    return "Memuat data...";
  }
  if (clickable && Number(value) > 0) {
    return "Klik untuk memproses antrean persetujuan.";
  }
  return "Data diperbarui secara real-time.";
}

function getEventStatusBadgeVariant(
  status: string,
): "default" | "destructive" | "outline" {
  if (status === "normal") {
    return "default";
  }
  if (status === "late") {
    return "destructive";
  }
  return "outline";
}

function getEventTypeText(eventType: string): string {
  if (eventType === "check_in") {
    return "Masuk";
  }
  return "Pulang";
}

function getLocationTypeText(locationType: string): string {
  if (locationType === "office") {
    return "Kantor";
  }
  return "Lapangan";
}

function getEmptyAttendanceMessage(loading: boolean): string {
  if (loading) {
    return "Memuat data kehadiran...";
  }
  return "Belum ada data kehadiran hari ini.";
}

type AttendanceLiveEvent = ReturnType<
  typeof useAttendanceLiveFeed
>["events"][number];

interface AttendanceTableBodyProps {
  readonly events: readonly AttendanceLiveEvent[];
  readonly loading: boolean;
  readonly onSelectEvent: (event: AttendanceLiveEvent) => void;
}

function AttendanceTableBody({
  events,
  loading,
  onSelectEvent,
}: Readonly<AttendanceTableBodyProps>) {
  if (events.length === 0) {
    return (
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={6}
            className="h-24 text-center text-muted-foreground"
          >
            {getEmptyAttendanceMessage(loading)}
          </TableCell>
        </TableRow>
      </TableBody>
    );
  }

  return (
    <TableBody>
      {events.map((event) => (
        <TableRow key={event.id}>
          <TableCell className="font-mono text-xs font-medium">
            {event.employeeId}
          </TableCell>
          <TableCell className="font-medium">{event.fullName}</TableCell>
          <TableCell>
            <Badge variant={getEventStatusBadgeVariant(event.status)}>
              {getEventTypeText(event.eventType)}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline">
              {getLocationTypeText(event.locationType)}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {event.timeWib}
          </TableCell>
          <TableCell className="text-right">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => onSelectEvent(event)}
              aria-label={`Detail presensi ${event.fullName}`}
            >
              <Eye className="size-3 mr-1" />
              Detail
            </Button>
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

interface AttendancePageProps {
  readonly onNavigateToApprovals?: () => void;
}

function AttendancePage({
  onNavigateToApprovals,
}: Readonly<AttendancePageProps>) {
  const { events, kpis, loading } = useAttendanceLiveFeed();
  const [selectedEvent, setSelectedEvent] = useState<
    (typeof events)[number] | null
  >(null);
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
        {summaryCards.map(
          ({ label, value, icon: Icon, tone, onClick, clickable }) => (
            <Card
              key={label}
              onClick={onClick}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onClick?.();
                      }
                    }
                  : undefined
              }
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
                  {getSummaryCardDescription(loading, clickable, value)}
                </p>
              </CardContent>
            </Card>
          ),
        )}
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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <AttendanceTableBody
              events={events}
              loading={loading}
              onSelectEvent={setSelectedEvent}
            />
          </Table>
        </CardContent>
      </Card>

      <AttendanceDetailDialog
        open={Boolean(selectedEvent)}
        onOpenChange={(open) => {
          if (!open) setSelectedEvent(null);
        }}
        item={selectedEvent}
      />
    </div>
  );
}

export interface AdminDashboardProps {
  readonly jobTitle?: string | null;
  readonly role?: UserRole | null;
  readonly onSignOut?: () => void;
}

function getDisplayJobTitle(
  jobTitle?: string | null,
  role?: UserRole | null,
): string {
  const trimmed = jobTitle?.trim();
  if (trimmed && trimmed !== "Belum diisi") {
    return trimmed;
  }
  if (role === "admin") {
    return "Administrator Sistem";
  }
  if (role === "technician") {
    return "Teknisi Operasional";
  }
  return "Administrator Sistem";
}

export function AdminDashboard({
  jobTitle,
  role,
  onSignOut,
}: Readonly<AdminDashboardProps>) {
  const [activeTab, setActiveTab] = useState<AdminTab>("Kehadiran");
  const currentTime = useWibClock();
  const displayJobTitle = getDisplayJobTitle(jobTitle, role);

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
              Masuk sebagai {displayJobTitle}
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
  const { jobTitle, role, signOut } = useCurrentAdminAuth();
  return (
    <AdminDashboard jobTitle={jobTitle} role={role} onSignOut={signOut} />
  );
}

interface AppProps {
  readonly bypassAuth?: boolean;
}

function isPublicApkDownloadRoute(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.location.pathname.startsWith("/download/");
}

export default function App({ bypassAuth = false }: Readonly<AppProps>) {
  if (isPublicApkDownloadRoute()) {
    return <PublicApkDownloadPage />;
  }

  if (bypassAuth || import.meta.env.MODE === "test") {
    return <AdminDashboard jobTitle="Administrator Sistem" role="admin" />;
  }

  return (
    <AdminAuthGate>
      <AuthenticatedApp />
    </AdminAuthGate>
  );
}
