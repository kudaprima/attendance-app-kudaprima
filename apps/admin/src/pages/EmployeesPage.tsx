import { Ban, UserCheck, Users } from "lucide-react";

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
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";

interface EmployeeEntry {
  id: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: "technician" | "supervisor" | "admin";
  employmentStatus: "permanent" | "contract" | "intern";
  startDate: string;
  active: boolean;
}

const mockEmployees: EmployeeEntry[] = [
  {
    id: "dev-admin",
    employeeId: "KP-000000",
    fullName: "Admin Development",
    email: "admin.dev@kudaprima.test",
    role: "admin",
    employmentStatus: "permanent",
    startDate: "2020-01-01",
    active: true,
  },
  {
    id: "dev-supervisor",
    employeeId: "KP-000002",
    fullName: "Supervisor Development",
    email: "supervisor.dev@kudaprima.test",
    role: "supervisor",
    employmentStatus: "permanent",
    startDate: "2020-01-01",
    active: true,
  },
  {
    id: "dev-technician",
    employeeId: "KP-000001",
    fullName: "Teknisi Development",
    email: "technician.dev@kudaprima.test",
    role: "technician",
    employmentStatus: "contract",
    startDate: "2025-01-01",
    active: true,
  },
];

export function EmployeesPage() {
  const { role } = useCurrentAdminAuth();
  const isAdmin = role === "admin";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Data Karyawan
          </h1>
          <p className="text-sm text-muted-foreground">
            Direktori profil dan status kepegawaian PT Kuda Prima (~60
            staf/teknisi).
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2">
            <Users className="size-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Karyawan Aktif</CardTitle>
          <CardDescription>
            Karyawan dinonaktifkan akan memasuki masa retensi data 3 bulan
            sebelum kontak/profil dibersihkan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status Kerja</TableHead>
                <TableHead>Mulai Kerja</TableHead>
                <TableHead>Status Akun</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs font-semibold">
                    {emp.employeeId}
                  </TableCell>
                  <TableCell className="font-medium">{emp.fullName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {emp.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={emp.role === "admin" ? "default" : "secondary"}
                    >
                      {emp.role === "admin"
                        ? "Admin"
                        : emp.role === "supervisor"
                          ? "Supervisor"
                          : "Teknisi"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm capitalize">
                    {emp.employmentStatus === "permanent"
                      ? "Tetap"
                      : emp.employmentStatus === "contract"
                        ? "Kontrak"
                        : "Magang"}
                  </TableCell>
                  <TableCell className="text-sm">{emp.startDate}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                      <UserCheck className="size-3.5" /> Aktif
                    </span>
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                      >
                        <Ban className="size-3.5 mr-1" />
                        Nonaktifkan
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
