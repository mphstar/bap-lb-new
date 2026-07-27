"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Archive,
  Trash2,
  RotateCcw,
  Calendar,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Database,
  History,
  FileArchive,
  ArrowRight,
} from "lucide-react";
import type { Archive as ArchiveType } from "@/types";
import { useDialog } from "@/context/DialogContext";
import {
  PageShell,
  PageHeader,
  PanelHeader,
  StatTile,
} from "@/components/shell";

export default function ArchivesPage(props?: any) {
  const { showConfirm } = useDialog();
  const [archives, setArchives] = useState<ArchiveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [archiveName, setArchiveName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isArchiving, setIsArchiving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null); // For loading state during delete/restore
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Fetch archives list on mount
  useEffect(() => {
    fetchArchives();
  }, []);

  const fetchArchives = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/archives");
      if (res.ok) {
        const data = await res.json();
        setArchives(data);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Gagal mengambil daftar arsip." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Terjadi kesalahan koneksi internet." });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateArchive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archiveName.trim()) return;

    const confirmMsg =
      "Apakah Anda yakin? Seluruh data aktif saat ini (Jadwal Template, Data Mingguan, Nilai, Ujian, Catatan, Mahasiswa, dan Dosen beserta tanda tangannya) akan diarsipkan dan dikosongkan dari database aktif. Anda dapat memulihkannya kembali kapan saja.";
    const isConfirmed = await showConfirm("Arsip & Bersihkan Database", confirmMsg);
    if (!isConfirmed) return;

    try {
      setIsArchiving(true);
      setMessage(null);
      const res = await fetch("/api/archives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: archiveName }),
      });

      if (res.ok) {
        setArchiveName("");
        setMessage({
          type: "success",
          text: "Data berhasil diarsipkan! Database dibersihkan. Memuat ulang halaman...",
        });
        // Reload entire browser state to refresh Context Providers
        setTimeout(() => {
          window.location.href = "/template";
        }, 1500);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Gagal membuat arsip." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Gagal menghubungkan ke server." });
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    const confirmMsg = `Apakah Anda yakin ingin memulihkan arsip "${name}"?\n\nPERINGATAN: Seluruh data aktif saat ini akan digantikan oleh data dari arsip. Sistem akan secara otomatis membuat cadangan baru dari data aktif Anda sebelum proses pemulihan dijalankan.`;
    const isConfirmed = await showConfirm("Pulihkan Arsip", confirmMsg);
    if (!isConfirmed) return;

    try {
      setActionId(id);
      setMessage(null);
      const res = await fetch(`/api/archives/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });

      if (res.ok) {
        setMessage({
          type: "success",
          text: "Arsip berhasil dipulihkan! Halaman akan dimuat ulang...",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1500);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Gagal memulihkan arsip." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmMsg = `Apakah Anda yakin ingin menghapus arsip "${name}" secara permanen?\n\nTindakan ini tidak dapat dibatalkan!`;
    const isConfirmed = await showConfirm("Hapus Arsip Permanen", confirmMsg);
    if (!isConfirmed) return;

    try {
      setActionId(id);
      setMessage(null);
      const res = await fetch(`/api/archives/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setArchives((prev) => prev.filter((a) => a.id !== id));
        setMessage({ type: "success", text: `Arsip "${name}" berhasil dihapus.` });
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Gagal menghapus arsip." });
      }
    } catch (e) {
      setMessage({ type: "error", text: "Terjadi kesalahan jaringan." });
    } finally {
      setActionId(null);
    }
  };

  // Format Date String nicely
  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const date = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
      "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${date} ${month} ${year}, ${hours}:${minutes}`;
  };

  // Filter archives based on search
  const filteredArchives = useMemo(() => {
    if (!searchQuery.trim()) return archives;
    const q = searchQuery.toLowerCase();
    return archives.filter((a) => a.name.toLowerCase().includes(q));
  }, [archives, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = archives.length;
    const autoBackup = archives.filter(a => a.name.includes("Cadangan sebelum")).length;
    const manual = total - autoBackup;
    return { total, autoBackup, manual };
  }, [archives]);

  return (
    <PageShell>
      <PageHeader
        title="Arsip Data"
        meta="Snapshot workspace sebelum memulai semester baru"
      />

      <div className="mb-6 grid grid-cols-3 gap-4">
        <StatTile icon={<Database />} label="Total arsip" value={stats.total} />
        <StatTile icon={<Archive />} label="Manual" value={stats.manual} />
        <StatTile icon={<Clock />} label="Cadangan" value={stats.autoBackup} />
      </div>

      {message && (
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-control border p-4 text-sm ${
            message.type === "success"
              ? "border-rule bg-panel text-foreground"
              : "border-destructive/30 bg-destructive/5 text-destructive"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          ) : (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          )}
          <div className="space-y-1">
            <span className="font-semibold">{message.type === "success" ? "Berhasil" : "Kesalahan"}</span>
            <p className="text-xs opacity-90">{message.text}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Archive Form Card */}
        <div className="lg:col-span-1">
          <div className="bg-panel rounded-panel border border-rule overflow-hidden">
            <PanelHeader
              icon={<Archive />}
              title="Mulai semester baru"
              meta="Mengosongkan workspace aktif dan mencadangkannya ke riwayat arsip."
            />

            <div className="p-5 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                  <span>Peringatan Sistem</span>
                </div>
                <p className="text-[11px] leading-relaxed opacity-90">
                  Semua tabel aktif akan di-reset (Jadwal, Mahasiswa, Dosen, Nilai, Ujian, Catatan). Pastikan Anda memberikan nama arsip yang jelas agar mudah diidentifikasi kembali.
                </p>
              </div>

              <form onSubmit={handleCreateArchive} className="space-y-4 pt-1">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Nama Arsip / Semester
                  </label>
                  <input
                    type="text"
                    value={archiveName}
                    onChange={(e) => setArchiveName(e.target.value)}
                    placeholder="Contoh: Semester Ganjil 2025/2026"
                    className="w-full border border-input rounded-xl px-3.5 py-2.5 text-sm bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
                    disabled={isArchiving}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isArchiving || !archiveName.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                >
                  {isArchiving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Memproses Pengarsipan...</span>
                    </>
                  ) : (
                    <>
                      <Archive size={16} />
                      <span>Arsipkan & Bersihkan</span>
                      <ArrowRight size={14} className="ml-1" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Archives History List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-panel rounded-panel border border-rule flex flex-col overflow-hidden">
            {/* Header with Search */}
            <div className="p-5 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2 text-base">
                  <History size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Riwayat Arsip Semester
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gunakan tombol Restore untuk memulihkan database ke periode terkait.
                </p>
              </div>

              {archives.length > 0 && (
                <div className="relative w-full sm:w-60">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari nama arsip..."
                    className="w-full border rounded-xl pl-9 pr-3 py-1.5 text-xs bg-background focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:outline-none transition-colors"
                  />
                </div>
              )}
            </div>

            {/* List Body */}
            <div className="hm-scroll-x flex-1 overflow-x-auto min-h-[350px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Loader2 className="size-8 animate-spin text-indigo-600 dark:text-indigo-400 mb-2" />
                  <span className="text-sm font-medium">Menghubungkan ke database arsip...</span>
                </div>
              ) : filteredArchives.length > 0 ? (
                <div className="divide-y">
                  {filteredArchives.map((archive, index) => {
                    const isAutoBackup = archive.name.includes("Cadangan sebelum");
                    return (
                      <div
                        key={archive.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2.5 rounded-xl mt-0.5 shrink-0 ${
                            isAutoBackup 
                              ? "bg-amber-100/60 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400" 
                              : "bg-indigo-100/60 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400"
                          }`}>
                            <FileArchive className="size-5" />
                          </div>
                          <div className="space-y-1 min-w-0">
                            <h4 className="font-bold text-sm text-foreground truncate max-w-sm sm:max-w-md" title={archive.name}>
                              {archive.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="size-3 shrink-0" />
                                {formatDateTime(archive.createdAt)}
                              </span>
                              <span className="h-3 w-px bg-border hidden xs:inline" />
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isAutoBackup
                                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30"
                                  : "bg-indigo-100 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/30"
                              }`}>
                                {isAutoBackup ? "Sistem Backup" : "Arsip Semester"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleRestore(archive.id, archive.name)}
                            disabled={actionId !== null}
                            className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white px-3.5 py-2 rounded-xl font-bold shadow-md shadow-emerald-600/10 transition-colors disabled:opacity-50 disabled:scale-100"
                            title="Pulihkan data dari arsip ini"
                          >
                            {actionId === archive.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <RotateCcw size={13} />
                            )}
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => handleDelete(archive.id, archive.name)}
                            disabled={actionId !== null}
                            className="inline-flex items-center justify-center text-muted-foreground hover:text-red-600 hover:bg-red-500/10 p-2 rounded-xl transition-colors disabled:opacity-50"
                            title="Hapus arsip secara permanen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                  <Archive size={40} className="mb-2 opacity-30 text-indigo-500" />
                  <p className="text-sm font-semibold">Tidak ada arsip ditemukan</p>
                  <p className="text-xs mt-1 text-muted-foreground">
                    {searchQuery ? "Gunakan kata kunci pencarian lainnya" : "Mulai dengan membuat arsip pertama Anda."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
