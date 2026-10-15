import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmployeesPage } from "./EmployeesPage";
import type { EmployeeEntry } from "@/features/employees/employee-repository";
const mocks = vi.hoisted(() => ({
  role: "admin",
  rows: [] as EmployeeEntry[],
  next: undefined as undefined | ((rows: EmployeeEntry[]) => void),
  error: undefined as undefined | (() => void),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  unsubscribe: vi.fn(),
}));
vi.mock("@/hooks/use-admin-auth", () => ({
  useCurrentAdminAuth: () => ({ role: mocks.role, user: { uid: "admin" } }),
}));
vi.mock("@/features/employees/employee-repository", () => ({
  watchEmployees: (
    next: (rows: EmployeeEntry[]) => void,
    error: () => void,
  ) => {
    mocks.next = next;
    mocks.error = error;
    next(mocks.rows);
    return mocks.unsubscribe;
  },
  createEmployee: mocks.create,
  updateEmployee: mocks.update,
  deleteEmployee: mocks.remove,
  employeeErrorMessage: () =>
    "Perubahan belum terkonfirmasi. Periksa koneksi lalu coba kembali.",
}));
const employee: EmployeeEntry = {
  uid: "employee",
  employeeId: "KP-000001",
  fullName: "Karyawan Uji",
  email: "sample@gmail.com",
  role: "technician",
  jobTitle: "Teknisi Lapangan",
  employmentStatus: "contract",
  employmentStartDate: "2025-01-01",
  active: false,
  revision: 4,
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = "admin";
  mocks.rows = [employee];
  mocks.create.mockResolvedValue({});
  mocks.update.mockResolvedValue({});
  mocks.remove.mockResolvedValue({});
});
function fillCreate(email = "newemployee@gmail.com") {
  fireEvent.change(screen.getByLabelText("Nama lengkap"), {
    target: { value: "Karyawan Baru" },
  });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText("Jabatan"), {
    target: { value: "Teknisi Lapangan" },
  });
  fireEvent.change(screen.getByLabelText("Kata sandi"), {
    target: { value: "SyntheticPass123!" },
  });
  fireEvent.change(screen.getByLabelText("Tanggal mulai bekerja"), {
    target: { value: "2026-09-01" },
  });
}
describe("employee management UI", () => {
  it("shows real account status and follows live database updates", () => {
    const view = render(<EmployeesPage />);
    expect(screen.getByText("Nonaktif")).toHaveClass("text-accent-foreground");
    act(() => mocks.next?.([{ ...employee, active: true }]));
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    act(() => mocks.next?.([]));
    expect(
      screen.getByText("Belum ada karyawan terdaftar."),
    ).toBeInTheDocument();
    view.unmount();
    expect(mocks.unsubscribe).toHaveBeenCalled();
  });
  it("creates only after validation and clears the password when the dialog closes", async () => {
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tambah Karyawan" }));
    expect(screen.getByRole("dialog")).toHaveClass(
      "max-h-[88dvh]",
      "sm:max-w-4xl",
    );
    expect(screen.getByLabelText("Hak Akses")).toHaveTextContent("Teknisi");
    const passwordInput = screen.getByLabelText("Kata sandi");
    expect(passwordInput).toHaveAttribute("type", "password");
    fireEvent.click(
      screen.getByRole("button", { name: "Tampilkan kata sandi" }),
    );
    expect(passwordInput).toHaveAttribute("type", "text");
    fireEvent.click(
      screen.getByRole("button", { name: "Sembunyikan kata sandi" }),
    );
    expect(passwordInput).toHaveAttribute("type", "password");
    fillCreate("newemployee@kudaprima.com");
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(mocks.create).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    fireEvent.change(passwordInput, { target: { value: "SyntheticPass123!" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: "Karyawan Baru",
          email: "newemployee@kudaprima.com",
          password: "SyntheticPass123!",
          active: true,
          role: "technician",
          jobTitle: "Teknisi Lapangan",
          employmentStatus: "contract",
          employmentStartDate: "2026-09-01",
        }),
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Tambah Karyawan" }));
    expect(screen.getByLabelText("Kata sandi")).toHaveValue("");
  });
  it("edits permitted fields including employment start date and omits a blank password", async () => {
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Karyawan Uji" }));
    expect(
      screen.getByLabelText("Tanggal mulai bekerja"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Kata sandi baru (opsional)")).toHaveValue("");
    expect(screen.getByLabelText("Status akun")).toHaveClass(
      "text-accent-foreground",
    );
    fireEvent.change(screen.getByLabelText("Nama lengkap"), {
      target: { value: "Nama Baru" },
    });
    fireEvent.change(screen.getByLabelText("Tanggal mulai bekerja"), {
      target: { value: "2024-01-15" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    const data = mocks.update.mock.calls[0][0];
    expect(data).toMatchObject({
      uid: "employee",
      fullName: "Nama Baru",
      active: false,
      expectedRevision: 4,
      employmentStartDate: "2024-01-15",
    });
    expect(data).not.toHaveProperty("password");
  });
  it("opens role choices below the trigger and saves the selected role", async () => {
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tambah Karyawan" }));
    fireEvent.keyDown(screen.getByLabelText("Hak Akses"), { key: "Enter" });
    const choices = await screen.findByRole("listbox");
    expect(choices).toHaveAttribute("data-side", "bottom");
    fireEvent.click(screen.getByRole("option", { name: "Admin" }));
    fillCreate();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: "admin", jobTitle: "Teknisi Lapangan" }),
      ),
    );
  });
  it("requires delete confirmation and keeps the dialog open on failure", async () => {
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Hapus Karyawan Uji" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Hapus Karyawan Uji" }));
    mocks.remove.mockRejectedValueOnce(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: "Hapus permanen" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Hapus permanen" }));
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    );
    expect(mocks.remove.mock.calls[0][0]).toEqual(
      mocks.remove.mock.calls[1][0],
    );
  });

  it("keeps a retry ID for unchanged data and replaces it when the edit changes", async () => {
    mocks.update.mockRejectedValue(new Error("Synthetic connection failure"));
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Edit Karyawan Uji" }));
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Simpan" })).toBeEnabled(),
    );
    expect(mocks.update.mock.calls[0][0].requestId).toBe(
      mocks.update.mock.calls[1][0].requestId,
    );
    fireEvent.change(screen.getByLabelText("Kata sandi baru (opsional)"), {
      target: { value: "DifferentPass123!" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledTimes(3));
    expect(mocks.update.mock.calls[2][0].requestId).not.toBe(
      mocks.update.mock.calls[1][0].requestId,
    );
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Simpan" })).toBeEnabled(),
    );
  });
  it("prevents duplicate submissions while saving", async () => {
    let finish!: () => void;
    mocks.create.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(<EmployeesPage />);
    fireEvent.click(screen.getByRole("button", { name: "Tambah Karyawan" }));
    fillCreate();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    fireEvent.click(screen.getByRole("button", { name: "Menyimpan..." }));
    expect(mocks.create).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
    await act(async () => finish());
  });
  it("keeps technicians from employee management actions", () => {
    mocks.role = "technician";
    render(<EmployeesPage />);
    expect(
      screen.queryByRole("button", { name: "Tambah Karyawan" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Karyawan Uji" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Hapus Karyawan Uji" }),
    ).not.toBeInTheDocument();
  });
  it("shows load failures and can reload the directory", () => {
    render(<EmployeesPage />);
    act(() => mocks.error?.());
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Data karyawan belum dapat dimuat",
    );
    expect(screen.queryByText("sample@gmail.com")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Coba Lagi" }));
    expect(screen.getByText("sample@gmail.com")).toBeInTheDocument();
  });

  it("omits 'Hak Akses' from table column headers", () => {
    render(<EmployeesPage />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).not.toContain("Hak Akses");
    expect(headers).toContain("Jabatan");
    expect(headers).toContain("Nama Lengkap");
    expect(headers).toContain("Employee ID");
  });

  it("filters employees flexibly using search input", () => {
    const secondEmployee: EmployeeEntry = {
      uid: "employee2",
      employeeId: "KP-000002",
      fullName: "Budi Santoso",
      email: "budi@gmail.com",
      role: "technician",
      jobTitle: "Supervisor Lapangan",
      employmentStatus: "permanent",
      employmentStartDate: "2024-05-01",
      active: true,
      revision: 1,
    };
    mocks.rows = [employee, secondEmployee];
    render(<EmployeesPage />);

    expect(screen.getByText("Karyawan Uji")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();

    const searchInput = screen.getByLabelText("Cari karyawan");

    // Search by Name
    fireEvent.change(searchInput, { target: { value: "Budi" } });
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.queryByText("Karyawan Uji")).not.toBeInTheDocument();

    // Search by Employee ID
    fireEvent.change(searchInput, { target: { value: "KP-000001" } });
    expect(screen.getByText("Karyawan Uji")).toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();

    // Search by Job Title
    fireEvent.change(searchInput, { target: { value: "Supervisor" } });
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.queryByText("Karyawan Uji")).not.toBeInTheDocument();

    // Search non-existent
    fireEvent.change(searchInput, { target: { value: "NonExistent" } });
    expect(screen.queryByText("Karyawan Uji")).not.toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
    expect(screen.getByText(/Tidak ada karyawan yang cocok/)).toBeInTheDocument();
  });
});
