import { useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  Palmtree,
  ShieldCheck,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentAdminAuth } from "@/hooks/use-admin-auth";

interface ApprovalItem {
  id: string;
  applicantUid: string;
  employeeId: string;
  fullName: string;
  type: "overtime" | "annual_leave" | "sick_leave" | "permission";
  date: string;
  detail: string;
  durationOrDays: string;
  isOver8Hours?: boolean;
  status: "pending" | "approved" | "rejected";
}

const initialApprovals: ApprovalItem[] = [
  {
    id: "app-1",
    applicantUid: "dev-technician",
    employeeId: "KP-000001",
    fullName: "Teknisi Development",
    type: "overtime",
    date: "2026-09-07",
    detail: "Troubleshooting kabel fiber optic pelanggan di site Jakarta Barat",
    durationOrDays: "180 menit (3 jam)",
    isOver8Hours: false,
    status: "pending",
  },
  {
    id: "app-2",
    applicantUid: "dev-technician",
    employeeId: "KP-000001",
    fullName: "Teknisi Development",
    type: "sick_leave",
    date: "2026-09-08",
    detail: "Demam dan flu (Surat dokter menyusul)",
    durationOrDays: "1 hari",
    status: "pending",
  },
  {
    id: "app-3",
    applicantUid: "dev-supervisor",
    employeeId: "KP-000002",
    fullName: "Supervisor Development",
    type: "annual_leave",
    date: "2026-09-15 s.d 2026-09-17",
    detail: "Keperluan keluarga di luar kota (Masa kerja > 5 tahun, kuota cukup)",
    durationOrDays: "3 hari kerja",
    status: "pending",
  },
];

export function ApprovalsPage() {
  const { user } = useCurrentAdminAuth();
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals);

  const handleAction = (id: string, action: "approved" | "rejected") => {
    setApprovals((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: action } : item,
      ),
    );
  };

  const currentUid = user?.uid;

  const renderTable = (items: ApprovalItem[]) => {
    if (items.length === 0) {
      return (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          Tidak ada permohonan yang menunggu persetujuan pada kategori ini.
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Durasi / Periode</TableHead>
            <TableHead>Keterangan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Tindakan (Cross-Approval)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const isSelf = item.applicantUid === currentUid;
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <p className="font-medium text-sm">{item.fullName}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {item.employeeId}
                  </p>
                </TableCell>
                <TableCell className="text-sm">{item.date}</TableCell>
                <TableCell className="text-sm">
                  <span className="font-medium">{item.durationOrDays}</span>
                  {item.isOver8Hours && (
                    <Badge variant="destructive" className="ml-2 gap-1 text-[10px]">
                      <AlertTriangle className="size-3" /> &gt;8 Jam
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="max-w-xs text-xs text-muted-foreground">
                  {item.detail}
                </TableCell>
                <TableCell>
                  {item.status === "pending" && (
                    <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                      Menunggu
                    </Badge>
                  )}
                  {item.status === "approved" && (
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">
                      Disetujui
                    </Badge>
                  )}
                  {item.status === "rejected" && (
                    <Badge variant="destructive">Ditolak</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {item.status === "pending" ? (
                    isSelf ? (
                      <span className="text-xs italic text-muted-foreground">
                        🚫 Self-Approval dilarang
                      </span>
                    ) : (
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                          onClick={() => handleAction(item.id, "approved")}
                        >
                          <CheckCircle2 className="size-3.5 mr-1" />
                          Setujui
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-destructive hover:bg-destructive/10"
                          onClick={() => handleAction(item.id, "rejected")}
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Tolak
                        </Button>
                      </div>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground font-medium">
                      Selesai diproses
                    </span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  const overtimeItems = approvals.filter((i) => i.type === "overtime");
  const leaveItems = approvals.filter((i) => i.type === "annual_leave");
  const permissionItems = approvals.filter(
    (i) => i.type === "sick_leave" || i.type === "permission",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pusat Persetujuan (Approval Center)
        </h1>
        <p className="text-sm text-muted-foreground">
          Persetujuan pengajuan lembur, cuti, dan izin sakit karyawan dengan aturan <strong>Cross-Approval</strong>.
        </p>
      </div>

      <div className="rounded-lg bg-blue-50/70 p-4 border border-blue-200 text-xs text-blue-900 flex gap-3 items-center">
        <ShieldCheck className="size-5 shrink-0 text-blue-600" />
        <div>
          <strong>Aturan Tata Kelola PT Kuda Prima:</strong> Supervisor dan Admin memiliki hak operasional setara, tetapi <em>dilarang menyetujui pengajuannya sendiri</em>. Setiap permohonan harus disetujui oleh supervisor atau admin lain yang berbeda.
        </div>
      </div>

      <Card>
        <CardContent className="p-4 pt-6">
          <Tabs defaultValue="overtime" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overtime" className="gap-2">
                <Clock className="size-4" />
                Lembur ({overtimeItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="leave" className="gap-2">
                <Palmtree className="size-4" />
                Cuti Tahunan ({leaveItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
              <TabsTrigger value="permission" className="gap-2">
                <FileText className="size-4" />
                Izin & Sakit ({permissionItems.filter((i) => i.status === "pending").length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overtime" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Lembur hari kerja dimulai 17:01 WIB setelah check-out presensi harian.
              </div>
              {renderTable(overtimeItems)}
            </TabsContent>

            <TabsContent value="leave" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Hak cuti 12 hari/tahun berlaku setelah masa kerja minimal 1 tahun. Hari libur/akhir pekan tidak memotong kuota.
              </div>
              {renderTable(leaveItems)}
            </TabsContent>

            <TabsContent value="permission" className="space-y-2">
              <div className="text-xs text-muted-foreground mb-2">
                Izin sakit maksimal diajukan H+3. Surat dokter bersifat opsional.
              </div>
              {renderTable(permissionItems)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
