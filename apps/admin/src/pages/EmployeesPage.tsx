import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { Eye, EyeOff, Pencil, Search, Trash2, UserPlus } from "lucide-react";
import {
  createEmployeeCommandSchema,
  updateEmployeeCommandSchema,
  type EmploymentStatus,
  type UserRole,
} from "@kuda-prima/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";
import {
  createEmployee,
  updateEmployee,
  deleteEmployee,
  watchEmployees,
  employeeErrorMessage,
  type EmployeeEntry,
} from "@/features/employees/employee-repository";

const statusLabels: Record<EmploymentStatus, string> = {
  intern: "Magang",
  contract: "Kontrak",
  permanent: "Tetap",
};
const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  technician: "Teknisi",
};

interface EmployeeFormProps {
  readonly employee: EmployeeEntry | null;
  readonly onClose: () => void;
  readonly onSaved: (message: string) => void;
}

function EmployeeForm({
  employee,
  onClose,
  onSaved,
}: Readonly<EmployeeFormProps>) {
  const { user } = useCurrentAdminAuth();
  const isSelf = employee?.uid === user?.uid;
  const [jobTitle, setJobTitle] = useState(employee?.jobTitle ?? "");
  const [roleConfirmed, setRoleConfirmed] = useState(false);
  const submittedRequest = useRef<{ id: string; values: string } | null>(null);
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [active, setActive] = useState(employee?.active ?? true);
  const [employeeRole, setEmployeeRole] = useState<UserRole>(
    employee?.role ?? "technician",
  );
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? "contract",
  );
  const [startDate, setStartDate] = useState(
    employee?.employmentStartDate ?? "",
  );
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const values = JSON.stringify({
      fullName,
      email,
      active,
      employmentStatus,
      employeeRole,
      jobTitle,
      password,
      startDate,
    });
    if (submittedRequest.current?.values !== values) {
      submittedRequest.current = { id: crypto.randomUUID(), values };
    }
    const fields = {
      requestId: submittedRequest.current.id,
      role: employeeRole,
      jobTitle,
      fullName,
      email,
      active,
      employmentStatus,
    };
    const result = employee
      ? updateEmployeeCommandSchema.safeParse({
          ...fields,
          uid: employee.uid,
          expectedRevision: employee.revision,
          ...(password ? { password } : {}),
          ...(startDate ? { employmentStartDate: startDate } : {}),
        })
      : createEmployeeCommandSchema.safeParse({
          ...fields,
          password,
          role: employeeRole,
          employmentStartDate: startDate,
        });
    if (!result.success) {
      setError(
        "Lengkapi nama, email valid, Hak Akses, Jabatan (2–100 karakter), status, tanggal mulai kerja, dan kata sandi minimal 8 karakter.",
      );
      return;
    }
    if (employee && employee.role !== employeeRole && !roleConfirmed) {
      setError("Konfirmasi perubahan Hak Akses terlebih dahulu.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      if ("uid" in result.data) await updateEmployee(result.data);
      else await createEmployee(result.data);
      setPassword("");
      submittedRequest.current = null;
      onSaved(
        employee
          ? "Data karyawan berhasil diperbarui."
          : "Karyawan berhasil ditambahkan.",
      );
      onClose();
    } catch (error) {
      setError(employeeErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className="max-h-[88dvh] overflow-y-auto sm:max-w-4xl"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Karyawan" : "Tambah Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? "Perbarui data akun dan status karyawan."
              : "Daftarkan akun karyawan dan tentukan kata sandi untuk login."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={submit}>
          <fieldset disabled={busy} className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="employee-name">Nama lengkap</Label>
              <Input
                id="employee-name"
                required
                minLength={2}
                maxLength={120}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-email">Email</Label>
              <Input
                id="employee-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@kudaprima.com atau nama@gmail.com"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan alamat email resmi perusahaan (@kudaprima.com, @kudaprima.co.id) atau email organisasi/karyawan lainnya.
              </p>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="employee-password">
                {employee ? "Kata sandi baru (opsional)" : "Kata sandi"}
              </Label>
              <div className="relative">
                <Input
                  id="employee-password"
                  type={showPassword ? "text" : "password"}
                  required={!employee}
                  minLength={8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-11"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-1/2 right-1 -translate-y-1/2"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {employee
                  ? "Kosongkan untuk mempertahankan kata sandi saat ini."
                  : "Minimal 8 karakter. Kata sandi ini untuk aplikasi, bukan pengganti kata sandi Google."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
              <div className="space-y-2">
                <Label htmlFor="employee-active">Status akun</Label>
                <Select
                  value={String(active)}
                  onValueChange={(value) => setActive(value === "true")}
                  disabled={busy || isSelf}
                >
                  <SelectTrigger
                    id="employee-active"
                    className={
                      active
                        ? "w-full"
                        : "w-full bg-accent text-accent-foreground [&_svg]:text-accent-foreground"
                    }
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                    align="start"
                    avoidCollisions={false}
                  >
                    <SelectItem value="true">Aktif</SelectItem>
                    <SelectItem value="false">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employee-status">Status karyawan</Label>
                <Select
                  value={employmentStatus}
                  onValueChange={(value) =>
                    setEmploymentStatus(value as EmploymentStatus)
                  }
                  disabled={busy}
                >
                  <SelectTrigger id="employee-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                    align="start"
                    avoidCollisions={false}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="employee-role">Hak Akses</Label>
                <Select
                  value={employeeRole}
                  onValueChange={(value) => { setEmployeeRole(value as UserRole); setRoleConfirmed(false); }}
                  disabled={busy || isSelf}
                >
                  <SelectTrigger id="employee-role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    side="bottom"
                    sideOffset={4}
                    align="start"
                    avoidCollisions={false}
                  >
                    {Object.entries(roleLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            <div className="space-y-2">
              <Label htmlFor="employee-job-title">Jabatan</Label>
              <Input id="employee-job-title" required minLength={2} maxLength={100} value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} aria-describedby="job-title-help" />
              <p id="job-title-help" className="text-xs text-muted-foreground">Jabatan tidak menentukan Hak Akses. Gunakan huruf, angka, spasi, titik, koma, &amp;, /, (), atau tanda hubung.</p>
            </div>
            {employee && employee.role !== employeeRole && (
              <label className="flex gap-2 text-sm md:col-span-2">
                <input type="checkbox" checked={roleConfirmed} onChange={(event) => setRoleConfirmed(event.target.checked)} />
                Saya mengonfirmasi perubahan Hak Akses dari {roleLabels[employee.role]} menjadi {roleLabels[employeeRole]}. Akses portal dan sesi login akan berubah.
              </label>
            )}
            {isSelf && <p className="text-sm text-muted-foreground md:col-span-2">Hak Akses dan status akun sendiri tidak dapat diubah.</p>}
            <div className="space-y-2">
              <Label htmlFor="employee-start">Tanggal mulai bekerja</Label>
              <Input
                id="employee-start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {employee && (
                <p className="text-xs text-muted-foreground">
                  Tanggal mulai bekerja menentukan kelayakan kuota cuti tahunan (minimal 1 tahun masa kerja).
                </p>
              )}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter className="border-t pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Batal
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteEmployeeDialogProps {
  readonly employee: EmployeeEntry;
  readonly onClose: () => void;
  readonly onDeleted: () => void;
}

function DeleteEmployeeDialog({
  employee,
  onClose,
  onDeleted,
}: Readonly<DeleteEmployeeDialogProps>) {
  const [requestId] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      await deleteEmployee({
        uid: employee.uid,
        expectedRevision: employee.revision,
        requestId,
      });
      onDeleted();
      onClose();
    } catch (error) {
      setError(employeeErrorMessage(error));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus karyawan?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun login dan profil {employee.fullName} ({employee.email}) akan
            dihapus permanen. Riwayat presensi dan audit tetap disimpan sesuai
            masa retensi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <Button variant="outline" disabled={busy} onClick={onClose}>
            Batal
          </Button>
          <Button variant="destructive" disabled={busy} onClick={confirm}>
            {busy ? "Menghapus..." : "Hapus permanen"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function EmployeesPage() {
  const { role, user } = useCurrentAdminAuth();
  const canManageEmployees = role === "admin";
  const [directory, setDirectory] = useState<{
    uid: string | undefined;
    rows: EmployeeEntry[];
    loading: boolean;
    error: boolean;
  }>({ uid: user?.uid, rows: [], loading: true, error: false });
  const sameUser = directory.uid === user?.uid;
  const employees = sameUser ? directory.rows : [];
  const loading = !sameUser || directory.loading;
  const loadError = sameUser && directory.error;
  const [reload, setReload] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [editor, setEditor] = useState<{
    employee: EmployeeEntry | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<EmployeeEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const filteredEmployees = employees.filter((employee) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      employee.fullName.toLowerCase().includes(q) ||
      employee.employeeId.toLowerCase().includes(q) ||
      employee.email.toLowerCase().includes(q) ||
      (employee.jobTitle?.toLowerCase().includes(q) ?? false)
    );
  });

  useEffect(() => {
    return watchEmployees(
      (rows) => {
        setDirectory({ uid: user?.uid, rows, loading: false, error: false });
      },
      () => {
        setDirectory({ uid: user?.uid, rows: [], loading: false, error: true });
      },
    );
  }, [reload, user?.uid]);
  function renderContent() {
    if (loading) {
      return (
        <output className="block text-muted-foreground">
          Memuat karyawan...
        </output>
      );
    }

    if (loadError) {
      return (
        <div role="alert" className="space-y-3">
          <p>
            Data karyawan belum dapat dimuat. Periksa koneksi dan hak akses.
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setDirectory({
                uid: user?.uid,
                rows: [],
                loading: true,
                error: false,
              });
              setReload((value) => value + 1);
            }}
          >
            Coba Lagi
          </Button>
        </div>
      );
    }

    if (employees.length === 0) {
      return <p>Belum ada karyawan terdaftar.</p>;
    }

    if (filteredEmployees.length === 0) {
      return (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Tidak ada karyawan yang cocok dengan pencarian &quot;{searchQuery}&quot;.
        </p>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            {[
              "Employee ID",
              "Nama Lengkap",
              "Email",
              "Jabatan",
              "Status Karyawan",
              "Mulai Kerja",
              "Status Akun",
            ].map((label) => (
              <TableHead key={label}>{label}</TableHead>
            ))}
            {canManageEmployees && (
              <TableHead className="text-right">Aksi</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredEmployees.map((employee) => (
            <TableRow key={employee.uid}>
              <TableCell className="font-mono text-xs">
                {employee.employeeId}
              </TableCell>
              <TableCell className="font-medium">
                {employee.fullName}
              </TableCell>
              <TableCell>{employee.email}</TableCell>
              <TableCell>{employee.jobTitle?.trim() || "Belum diisi"}</TableCell>
              <TableCell>
                {statusLabels[employee.employmentStatus]}
              </TableCell>
              <TableCell>{employee.employmentStartDate}</TableCell>
              <TableCell>
                <Badge
                  variant={employee.active ? "default" : "secondary"}
                  className={
                    employee.active
                      ? undefined
                      : "bg-accent text-accent-foreground"
                  }
                >
                  {employee.active ? "Aktif" : "Nonaktif"}
                </Badge>
                {employee.managementAction && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Proses belum selesai
                  </p>
                )}
              </TableCell>
              {canManageEmployees && (
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={employee.managementAction === "delete"}
                      aria-label={`Edit ${employee.fullName}`}
                      onClick={() => setEditor({ employee })}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      disabled={employee.uid === user?.uid}
                      aria-label={`Hapus ${employee.fullName}`}
                      onClick={() => setDeleting(employee)}
                    >
                      <Trash2 className="size-3.5" />
                      Hapus
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Kelola Data User
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun dan status kepegawaian PT Kuda Prima.
          </p>
        </div>
        {canManageEmployees && (
          <Button
            onClick={() => {
              setNotice(null);
              setEditor({ employee: null });
            }}
          >
            <UserPlus className="size-4" />
            Tambah Karyawan
          </Button>
        )}
      </div>
      {notice && (
        <output className="block rounded-lg border bg-muted p-3 text-sm">
          {notice}
        </output>
      )}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Daftar Karyawan</CardTitle>
            <CardDescription>
              Akun aktif dan nonaktif. {filteredEmployees.length} dari {employees.length} karyawan terdaftar.
            </CardDescription>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama, ID, email, jabatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-sm"
              aria-label="Cari karyawan"
            />
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
      {canManageEmployees && editor && (
        <EmployeeForm
          employee={editor.employee}
          onClose={() => setEditor(null)}
          onSaved={setNotice}
        />
      )}
      {canManageEmployees && deleting && (
        <DeleteEmployeeDialog
          employee={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() =>
            setNotice("Akun dan profil karyawan berhasil dihapus.")
          }
        />
      )}
    </div>
  );
}
