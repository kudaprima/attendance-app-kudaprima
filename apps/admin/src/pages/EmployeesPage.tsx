import { useEffect, useRef, useState, type FormEvent } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import {
  createEmployeeCommandSchema,
  updateEmployeeCommandSchema,
  type EmploymentStatus,
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

function EmployeeForm({
  employee,
  onClose,
  onSaved,
}: {
  employee: EmployeeEntry | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const submittedRequest = useRef<{ id: string; values: string } | null>(null);
  const [fullName, setFullName] = useState(employee?.fullName ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [password, setPassword] = useState("");
  const [active, setActive] = useState(employee?.active ?? true);
  const [employmentStatus, setEmploymentStatus] = useState<EmploymentStatus>(
    employee?.employmentStatus ?? "contract",
  );
  const [startDate, setStartDate] = useState(
    employee?.employmentStartDate ?? "",
  );
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    const values = JSON.stringify({
      fullName,
      email,
      active,
      employmentStatus,
      password,
      startDate,
    });
    if (submittedRequest.current?.values !== values) {
      submittedRequest.current = { id: crypto.randomUUID(), values };
    }
    const fields = {
      requestId: submittedRequest.current.id,
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
        })
      : createEmployeeCommandSchema.safeParse({
          ...fields,
          password,
          employmentStartDate: startDate,
        });
    if (!result.success) {
      setError(
        "Lengkapi nama, Gmail yang valid, status, tanggal mulai kerja, dan kata sandi minimal 8 karakter.",
      );
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
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
        showCloseButton={!busy}
      >
        <DialogHeader>
          <DialogTitle>
            {employee ? "Edit Karyawan" : "Tambah Karyawan"}
          </DialogTitle>
          <DialogDescription>
            {employee
              ? "Perbarui data akun dan status karyawan."
              : "Daftarkan Gmail karyawan dan tentukan kata sandi untuk login."}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <fieldset disabled={busy} className="space-y-4">
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
              <Label htmlFor="employee-email">Email Gmail</Label>
              <Input
                id="employee-email"
                type="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@gmail.com"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Gunakan alamat utama akun Google milik karyawan.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee-password">
                {employee ? "Kata sandi baru (opsional)" : "Kata sandi"}
              </Label>
              <Input
                id="employee-password"
                type="password"
                required={!employee}
                minLength={8}
                maxLength={128}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">
                {employee
                  ? "Kosongkan untuk mempertahankan kata sandi saat ini."
                  : "Minimal 8 karakter. Kata sandi ini untuk aplikasi, bukan pengganti kata sandi Google."}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="employee-active">Status akun</Label>
                <Select
                  value={String(active)}
                  onValueChange={(value) => setActive(value === "true")}
                  disabled={busy}
                >
                  <SelectTrigger id="employee-active" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!employee && (
              <div className="space-y-2">
                <Label htmlFor="employee-start">Tanggal mulai bekerja</Label>
                <Input
                  id="employee-start"
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
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

function DeleteEmployeeDialog({
  employee,
  onClose,
  onDeleted,
}: {
  employee: EmployeeEntry;
  onClose: () => void;
  onDeleted: () => void;
}) {
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
  const isAdmin = role === "admin";
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
  const [editor, setEditor] = useState<{
    employee: EmployeeEntry | null;
  } | null>(null);
  const [deleting, setDeleting] = useState<EmployeeEntry | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Master Data Karyawan
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola akun dan status kepegawaian PT Kuda Prima.
          </p>
        </div>
        {isAdmin && (
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
        <p role="status" className="rounded-lg border bg-muted p-3 text-sm">
          {notice}
        </p>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Daftar Karyawan</CardTitle>
          <CardDescription>
            Akun aktif dan nonaktif. {employees.length} karyawan terdaftar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p role="status">Memuat karyawan...</p>
          ) : loadError ? (
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
          ) : employees.length === 0 ? (
            <p>Belum ada karyawan terdaftar.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  {[
                    "Employee ID",
                    "Nama Lengkap",
                    "Email",
                    "Role",
                    "Status Karyawan",
                    "Mulai Kerja",
                    "Status Akun",
                  ].map((label) => (
                    <TableHead key={label}>{label}</TableHead>
                  ))}
                  {isAdmin && (
                    <TableHead className="text-right">Aksi</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.uid}>
                    <TableCell className="font-mono text-xs">
                      {employee.employeeId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {employee.fullName}
                    </TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>
                      {employee.role === "admin"
                        ? "Admin"
                        : employee.role === "supervisor"
                          ? "Supervisor"
                          : "Teknisi"}
                    </TableCell>
                    <TableCell>
                      {statusLabels[employee.employmentStatus]}
                    </TableCell>
                    <TableCell>{employee.employmentStartDate}</TableCell>
                    <TableCell>
                      <Badge
                        variant={employee.active ? "default" : "secondary"}
                      >
                        {employee.active ? "Aktif" : "Nonaktif"}
                      </Badge>
                      {employee.managementAction && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Proses belum selesai
                        </p>
                      )}
                    </TableCell>
                    {isAdmin && (
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
          )}
        </CardContent>
      </Card>
      {isAdmin && editor && (
        <EmployeeForm
          employee={editor.employee}
          onClose={() => setEditor(null)}
          onSaved={setNotice}
        />
      )}
      {isAdmin && deleting && (
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
