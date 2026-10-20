"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench
 * design-system: design.md · Superadmin Audit Trail & Activity Log
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  History,
  Search,
  Shield,
  KeyRound,
  UserPlus,
  Ban,
  Trash2,
  RefreshCw,
  Loader2,
  Calendar,
  AlertCircle,
  FileText,
  UserCheck,
  Info,
} from "lucide-react";
import {
  PageShell,
  PageHeader,
  PageSections,
  Panel,
  PanelHeader,
  PanelBody,
  StatTile,
  EmptyState,
} from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useDialog } from "@/context/DialogContext";

interface AuditLogItem {
  id: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  action: string;
  target?: string | null;
  details?: any;
  ipAddress?: string | null;
  createdAt: string;
}

export default function AdminAuditLogsPage() {
  const { showAlert } = useDialog();

  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");

  // Selected Log for JSON Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Gagal memuat data log audit.");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error(err);
      showAlert("Error", err.message || "Gagal memuat log audit.");
    } finally {
      setLoading(false);
    }
  }, [actionFilter, searchQuery, showAlert]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Metrics
  const stats = useMemo(() => {
    const total = logs.length;
    const creates = logs.filter((l) => l.action === "USER_CREATE").length;
    const resets = logs.filter((l) => l.action === "USER_RESET_PASSWORD").length;
    const statusChanges = logs.filter(
      (l) => l.action.includes("BAN") || l.action.includes("ROLE")
    ).length;

    return { total, creates, resets, statusChanges };
  }, [logs]);

  // Action badge renderer
  const renderActionBadge = (action: string) => {
    switch (action) {
      case "USER_CREATE":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <UserPlus className="size-3" />
            Buat Akun
          </span>
        );
      case "USER_RESET_PASSWORD":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
            <KeyRound className="size-3" />
            Reset Password
          </span>
        );
      case "USER_UPDATE_ROLE":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-brand-soft text-brand border border-brand/20">
            <Shield className="size-3" />
            Ubah Role
          </span>
        );
      case "USER_BAN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
            <Ban className="size-3" />
            Nonaktifkan
          </span>
        );
      case "USER_UNBAN":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <UserCheck className="size-3" />
            Aktifkan Kembali
          </span>
        );
      case "USER_DELETE":
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
            <Trash2 className="size-3" />
            Hapus Akun
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium bg-tile text-foreground border border-rule">
            <Info className="size-3" />
            {action}
          </span>
        );
    }
  };

  return (
    <PageShell>
      <PageHeader
        title="Audit Log & Jejak Riwayat"
        meta="Pencatatan riwayat aktivitas penting dan perubahan data sensitif sistem BAP"
        actions={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            disabled={loading}
            className="h-9 gap-1.5 rounded-control"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Segarkan Log</span>
          </Button>
        }
      />

      <PageSections>
        {/* Metric Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatTile
            label="Total Log Aktivitas"
            value={stats.total}
            meta="Riwayat tersimpan"
            icon={<History className="size-4" />}
          />
          <StatTile
            label="Pembuatan Akun"
            value={stats.creates}
            meta="Teknisi baru dibuat"
            icon={<UserPlus className="size-4" />}
          />
          <StatTile
            label="Reset Password"
            value={stats.resets}
            meta="Kredensial diatur ulang"
            icon={<KeyRound className="size-4" />}
          />
          <StatTile
            label="Perubahan Akses"
            value={stats.statusChanges}
            meta="Ganti role / status"
            icon={<Shield className="size-4" />}
          />
        </div>

        {/* Audit Logs Table Panel */}
        <Panel>
          <PanelHeader
            title="Daftar Rekam Jejak Sistem"
            meta="Daftar kronologis seluruh event administratif diurutkan dari yang terbaru"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[200px] sm:min-w-[240px]">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Cari user / target..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8.5 pl-8 text-xs"
                  />
                </div>

                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="h-8.5 rounded-control border border-rule bg-panel px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="all">Semua Tindakan</option>
                  <option value="USER_CREATE">Buat Akun</option>
                  <option value="USER_RESET_PASSWORD">Reset Password</option>
                  <option value="USER_UPDATE_ROLE">Ubah Role</option>
                  <option value="USER_BAN">Nonaktifkan Akun</option>
                  <option value="USER_UNBAN">Aktifkan Kembali</option>
                  <option value="USER_DELETE">Hapus Akun</option>
                </select>
              </div>
            }
          />

          <PanelBody className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="size-7 animate-spin text-primary" />
                <p className="mt-3 text-xs font-medium">Memuat log audit...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  variant="bare"
                  size="compact"
                  icon={<History className="size-6" />}
                  title="Belum ada catatan log"
                  description="Catatan riwayat akan otomatis muncul ketika ada aktivitas administratif pada sistem."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                    <tr>
                      <th className="px-5 py-3">Waktu</th>
                      <th className="px-4 py-3">Pelaksana (Admin)</th>
                      <th className="px-4 py-3">Tindakan</th>
                      <th className="px-4 py-3">Target Entitas</th>
                      <th className="px-4 py-3">Keterangan</th>
                      <th className="px-5 py-3 text-right">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-rule font-normal">
                    {logs.map((log) => {
                      const dateObj = new Date(log.createdAt);
                      const formattedDate = dateObj.toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      });
                      const formattedTime = dateObj.toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      });

                      return (
                        <tr
                          key={log.id}
                          className="transition-colors hover:bg-panel-2/40"
                        >
                          {/* Waktu */}
                          <td className="px-5 py-3.5 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                            <span className="font-semibold text-foreground block">
                              {formattedTime}
                            </span>
                            <span>{formattedDate}</span>
                          </td>

                          {/* Pelaksana */}
                          <td className="px-4 py-3.5">
                            <span className="font-medium text-foreground text-sm block">
                              {log.userName || "Sistem"}
                            </span>
                            <span className="text-xs text-muted-foreground font-mono">
                              {log.userEmail || "-"}
                            </span>
                          </td>

                          {/* Tindakan */}
                          <td className="px-4 py-3.5">
                            {renderActionBadge(log.action)}
                          </td>

                          {/* Target */}
                          <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground max-w-xs truncate">
                            {log.target || "-"}
                          </td>

                          {/* Keterangan */}
                          <td className="px-4 py-3.5 max-w-xs truncate text-muted-foreground">
                            {log.details
                              ? typeof log.details === "object"
                                ? JSON.stringify(log.details)
                                : String(log.details)
                              : "-"}
                          </td>

                          {/* Tombol Detail JSON */}
                          <td className="px-5 py-3.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedLog(log)}
                              className="h-7 text-xs rounded-control hover:bg-brand-soft hover:text-brand"
                            >
                              <span>Lihat Detail</span>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </PanelBody>
        </Panel>
      </PageSections>

      {/* Modal Detail JSON Log */}
      <Dialog open={Boolean(selectedLog)} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Log Audit</DialogTitle>
            <DialogDescription>
              Informasi lengkap peristiwa tercatat pada sistem.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <DialogBody className="space-y-3 font-mono text-xs">
              <div className="rounded-control bg-panel-2 p-3 space-y-1 text-muted-foreground border border-rule">
                <div>
                  <span className="text-foreground font-semibold">Tindakan:</span>{" "}
                  {selectedLog.action}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Pelaksana:</span>{" "}
                  {selectedLog.userName} ({selectedLog.userEmail})
                </div>
                <div>
                  <span className="text-foreground font-semibold">Target:</span>{" "}
                  {selectedLog.target}
                </div>
                <div>
                  <span className="text-foreground font-semibold">Waktu:</span>{" "}
                  {new Date(selectedLog.createdAt).toLocaleString("id-ID")}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-sans text-xs font-semibold text-foreground">
                  Payload / Details JSON:
                </span>
                <pre className="p-3 rounded-control bg-panel-2 border border-rule overflow-x-auto text-[11px] text-foreground font-mono whitespace-pre-wrap">
                  {JSON.stringify(selectedLog.details, null, 2) || "{}"}
                </pre>
              </div>
            </DialogBody>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedLog(null)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
