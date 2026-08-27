"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench (Canvas with Modal Flow)
 * design-system: design.md · designed-as-app
 */

import React, { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Trash2,
  Users,
  PenTool,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Sparkles,
  Eye,
  X,
  Edit2,
  FileSignature,
} from "lucide-react";
import type { MasterDosen, WeekData, ScheduleEntry } from "@/types";
import SignaturePad from "@/components/SignaturePad";
import { useDialog } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  StatTile,
  EmptyState,
} from "@/components/shell";

interface DosenMasterPageProps {
  dosenList: MasterDosen[];
  onDosenListChange: (list: MasterDosen[]) => void;
  weeks?: WeekData[];
  scheduleTemplate?: ScheduleEntry[];
}

type FilterStatus = "all" | "has_signature" | "no_signature";
type SortOption = "name_asc" | "name_desc" | "status";

/** Generate initials from lecturer name (e.g., "Dr. Ir. Budi Santoso, M.T." -> "BS") */
function getInitials(name: string): string {
  if (!name) return "D";
  // Strip common academic titles
  const clean = name
    .replace(/(Prof\.|Dr\.|Ir\.|Drs\.|Dra\.|S\.[A-Za-z]+|M\.[A-Za-z]+|Ph\.D|M\.Sc|B\.Sc|M\.T\.|S\.T\.|M\.Kom|S\.Kom|M\.Si|S\.Si|M\.Pd|S\.Pd)/gi, "")
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .trim();

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic soft hue based on name */
function getAvatarColor(name: string): string {
  const colors = [
    "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60",
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800/60",
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60",
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60",
    "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60",
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

const DosenMasterPage: React.FC<DosenMasterPageProps> = ({
  dosenList,
  onDosenListChange,
  weeks = [],
  scheduleTemplate = [],
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name_asc");

  // Modal Dialog Form State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDosen, setEditingDosen] = useState<MasterDosen | null>(null);
  const [formName, setFormName] = useState("");
  const [formSignature, setFormSignature] = useState<string | null>(null);

  // Zoom preview modal for signature
  const [previewSigDosen, setPreviewSigDosen] = useState<MasterDosen | null>(null);

  // Active teaching lecturers calculation (from template & weeks)
  const activeLecturerCounts = useMemo(() => {
    const counts = new Map<string, number>();
    scheduleTemplate.forEach((s) => {
      if (s.defaultPengajar?.trim()) {
        const norm = s.defaultPengajar.trim().toLowerCase();
        counts.set(norm, (counts.get(norm) || 0) + 1);
      }
    });
    return counts;
  }, [scheduleTemplate]);

  // Statistics calculation
  const totalDosen = dosenList.length;
  const withSignatureCount = useMemo(
    () => dosenList.filter((d) => Boolean(d.signature && d.signature.trim())).length,
    [dosenList]
  );
  const withoutSignatureCount = totalDosen - withSignatureCount;
  const signaturePercentage =
    totalDosen > 0 ? Math.round((withSignatureCount / totalDosen) * 100) : 0;

  const activeTeachingCount = useMemo(() => {
    return dosenList.filter((d) =>
      activeLecturerCounts.has(d.name.trim().toLowerCase())
    ).length;
  }, [dosenList, activeLecturerCounts]);

  // Open modal for adding
  const handleOpenAdd = () => {
    setEditingDosen(null);
    setFormName("");
    setFormSignature(null);
    setIsDialogOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (dosen: MasterDosen) => {
    setEditingDosen(dosen);
    setFormName(dosen.name);
    setFormSignature(dosen.signature || null);
    setIsDialogOpen(true);
  };

  // Save form
  const handleSaveForm = () => {
    const trimmedName = formName.trim();
    if (!trimmedName) return;

    if (editingDosen) {
      // Update existing
      const updated = dosenList.map((d) =>
        d.id === editingDosen.id || (!d.id && d.name === editingDosen.name)
          ? { ...d, name: trimmedName, signature: formSignature || "" }
          : d
      );
      onDosenListChange(updated);
      setIsDialogOpen(false);
    } else {
      // Check duplicate
      if (
        dosenList.some(
          (d) => d.name.toLowerCase() === trimmedName.toLowerCase()
        )
      ) {
        showAlert(
          "Dosen Sudah Terdaftar",
          "Nama dosen tersebut sudah ada di daftar master data."
        );
        return;
      }

      onDosenListChange([
        ...dosenList,
        {
          id: Math.random().toString(36).substring(2, 9),
          name: trimmedName,
          signature: formSignature || "",
        },
      ]);
      setIsDialogOpen(false);
    }
  };

  // Delete handler
  const handleDelete = async (dosen: MasterDosen) => {
    const isConfirmed = await showConfirm(
      "Hapus Dosen",
      `Apakah Anda yakin ingin menghapus "${dosen.name}" dari master data dosen?\n\nTanda tangan yang tersimpan juga akan dihapus.`
    );
    if (!isConfirmed) return;

    onDosenListChange(dosenList.filter((d) => d.name !== dosen.name));
  };

  // Sync from weekly and template schedules
  const handleImportFromWeekly = async () => {
    const uniqueNames = new Set<string>();

    // Extract from weekly entries
    weeks.forEach((w) => {
      w.entries?.forEach((entry) => {
        if (entry.pengajar && entry.pengajar.trim()) {
          uniqueNames.add(entry.pengajar.trim());
        }
      });
    });

    // Extract from schedule templates
    scheduleTemplate.forEach((entry) => {
      if (entry.defaultPengajar && entry.defaultPengajar.trim()) {
        uniqueNames.add(entry.defaultPengajar.trim());
      }
    });

    const newNames = Array.from(uniqueNames).filter(
      (name) =>
        !dosenList.some((d) => d.name.toLowerCase() === name.toLowerCase())
    );

    if (newNames.length === 0) {
      showAlert(
        "Sinkronisasi Selesai",
        "Semua nama pengajar/dosen dari data jadwal sudah terdaftar di master data."
      );
      return;
    }

    const isConfirmed = await showConfirm(
      "Sinkronisasi Dosen",
      `Ditemukan ${newNames.length} nama pengajar baru dari data jadwal:\n\n${newNames.join(
        "\n"
      )}\n\nTambahkan mereka ke master data dosen?`
    );

    if (isConfirmed) {
      const updatedList = [
        ...dosenList,
        ...newNames.map((name) => ({
          id: Math.random().toString(36).substring(2, 9),
          name,
          signature: "",
        })),
      ];
      onDosenListChange(updatedList);
      showAlert(
        "Sinkronisasi Berhasil",
        `Berhasil menambahkan ${newNames.length} dosen baru.`
      );
    }
  };

  // Filtered and sorted data
  const filteredAndSortedDosen = useMemo(() => {
    let list = [...dosenList];

    // Status filter
    if (filterStatus === "has_signature") {
      list = list.filter((d) => Boolean(d.signature && d.signature.trim()));
    } else if (filterStatus === "no_signature") {
      list = list.filter((d) => !d.signature || !d.signature.trim());
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((d) => d.name.toLowerCase().includes(q));
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name, "id");
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name, "id");
      }
      if (sortBy === "status") {
        const aHas = Boolean(a.signature && a.signature.trim());
        const bHas = Boolean(b.signature && b.signature.trim());
        if (aHas === bHas) return a.name.localeCompare(b.name, "id");
        return aHas ? -1 : 1;
      }
      return 0;
    });

    return list;
  }, [dosenList, filterStatus, searchQuery, sortBy]);

  return (
    <PageShell>
      <PageHeader
        title="Master Data Dosen"
        meta={`${totalDosen} dosen terdaftar — tanda tangan digital otomatis terpasang pada BAP dan Daftar Hadir`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleImportFromWeekly}>
              <RefreshCw className="h-4 w-4" />
              <span>Ambil dari Jadwal</span>
            </Button>
            <Button variant="default" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              <span>Tambah Dosen</span>
            </Button>
          </div>
        }
      />

      {/* ── Stat Tiles Overview ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Total Dosen"
          value={totalDosen}
          meta="Terdaftar dalam sistem"
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          label="TTD Siap"
          value={withSignatureCount}
          meta={`${signaturePercentage}% dokumen siap cetak`}
        />
        <StatTile
          icon={<AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          label="Belum Ada TTD"
          value={withoutSignatureCount}
          meta="Perlu input tanda tangan"
        />
        <StatTile
          icon={<GraduationCap className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
          label="Jadwal Aktif"
          value={activeTeachingCount}
          meta="Pengajar semester ini"
        />
      </div>

      {/* ── Main Canvas Directory ───────────────────────────────── */}
      <Panel className="flex flex-col">
        <PanelHeader
          icon={<FileSignature className="h-4 w-4" />}
          title="Direktori Dosen & Tanda Tangan"
          meta="Daftar nama resmi beserta paraf digital pengesahan dokumen praktikum"
        />

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 border-b border-rule p-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama dosen atau gelar..."
              className="pl-9 pr-8"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Bersihkan pencarian"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Filter Pills & Sort */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Pills */}
            <div className="inline-flex rounded-control border border-rule bg-panel-2 p-0.5">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterStatus === "all"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Semua ({totalDosen})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("has_signature")}
                className={`rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterStatus === "has_signature"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Ada TTD ({withSignatureCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("no_signature")}
                className={`rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
                  filterStatus === "no_signature"
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Belum Ada ({withoutSignatureCount})
              </button>
            </div>

            {/* Sort Select */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-control border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring"
            >
              <option value="name_asc">Nama (A → Z)</option>
              <option value="name_desc">Nama (Z → A)</option>
              <option value="status">Status TTD</option>
            </select>
          </div>
        </div>

        {/* Lecturer Table */}
        <div className="overflow-x-auto">
          {filteredAndSortedDosen.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-rule">
                <tr>
                  <th className="py-3 pl-6 pr-3 w-16 text-center">No</th>
                  <th className="py-3 px-4">Dosen & Status Mengajar</th>
                  <th className="py-3 px-4 text-center w-40">Status TTD</th>
                  <th className="py-3 px-4 text-center w-44">Pratinjau Paraf</th>
                  <th className="py-3 pl-3 pr-6 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {filteredAndSortedDosen.map((d, index) => {
                  const hasSig = Boolean(d.signature && d.signature.trim());
                  const teachingSlots =
                    activeLecturerCounts.get(d.name.trim().toLowerCase()) || 0;
                  const initials = getInitials(d.name);
                  const avatarColor = getAvatarColor(d.name);

                  return (
                    <tr
                      key={d.name}
                      className="group transition-colors duration-150 hover:bg-panel-2/50"
                    >
                      {/* Number */}
                      <td className="py-3.5 pl-6 pr-3 text-center text-xs font-mono text-muted-foreground">
                        {index + 1}
                      </td>

                      {/* Lecturer Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Initials Avatar */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control border font-semibold text-xs transition-transform group-hover:scale-105 ${avatarColor}`}
                          >
                            {initials}
                          </div>

                          {/* Name & details */}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm leading-tight">
                              {d.name}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                              {teachingSlots > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] font-normal h-4.5 px-1.5 bg-primary/10 text-primary border-transparent"
                                >
                                  {teachingSlots} Jadwal Mengajar
                                </Badge>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  Belum terdaftar di jadwal
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Status TTD */}
                      <td className="py-3.5 px-4 text-center">
                        {hasSig ? (
                          <span className="inline-flex items-center gap-1.5 rounded-control bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-800/50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            Siap Digunakan
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(d)}
                            className="inline-flex items-center gap-1.5 rounded-control bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 transition-colors"
                          >
                            <PenTool className="h-3 w-3 shrink-0" />
                            + Tambah TTD
                          </button>
                        )}
                      </td>

                      {/* Signature Thumbnail */}
                      <td className="py-3.5 px-4 text-center">
                        {hasSig ? (
                          <button
                            type="button"
                            onClick={() => setPreviewSigDosen(d)}
                            title="Klik untuk memperbesar pratinjau tanda tangan"
                            className="group/sig inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white p-1 shadow-2xs hover:border-primary transition-all hover:scale-105"
                          >
                            <img
                              src={d.signature!}
                              alt={`Paraf ${d.name}`}
                              className="h-8 max-w-[120px] object-contain"
                            />
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(d)}
                            className="h-8 px-2 text-xs font-medium"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => handleDelete(d)}
                            aria-label={`Hapus ${d.name}`}
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <EmptyState
              icon={<Users className="h-8 w-8 text-muted-foreground" />}
              title={
                searchQuery
                  ? "Dosen tidak ditemukan"
                  : filterStatus !== "all"
                  ? "Tidak ada dosen dengan filter ini"
                  : "Belum ada data dosen"
              }
              description={
                searchQuery
                  ? `Tidak ada dosen yang cocok dengan kata kunci "${searchQuery}". Coba kata kunci lain atau bersihkan pencarian.`
                  : filterStatus !== "all"
                  ? "Ubah filter status tanda tangan untuk melihat data lainnya."
                  : "Tambahkan dosen secara manual atau sinkronkan otomatis dari data jadwal yang sudah diunggah."
              }
              actions={
                searchQuery ? (
                  <Button variant="outline" onClick={() => setSearchQuery("")}>
                    Bersihkan Pencarian
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleImportFromWeekly}>
                      <RefreshCw className="h-4 w-4" /> Ambil dari Jadwal
                    </Button>
                    <Button onClick={handleOpenAdd}>
                      <Plus className="h-4 w-4" /> Tambah Dosen Baru
                    </Button>
                  </div>
                )
              }
              variant="bare"
            />
          )}
        </div>
      </Panel>

      {/* ── Dialog Modal: Add / Edit Dosen ──────────────────────── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[540px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <PenTool className="h-4.5 w-4.5 text-primary" />
              <span>{editingDosen ? "Edit Data Dosen" : "Tambah Dosen Baru"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingDosen
                ? "Perbarui nama lengkap beserta gelar atau gambar tanda tangan digital pengesahan."
                : "Masukkan nama dosen beserta tanda tangan digital untuk dicetak pada dokumen BAP."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5 px-6 py-5">
            {/* Nama Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Nama Lengkap & Gelar <span className="text-destructive">*</span>
              </label>
              <Input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Contoh: Dr. Ir. Budi Santoso, M.T."
                className="w-full h-10 px-3 text-sm"
                autoFocus
              />
            </div>

            {/* Signature Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Tanda Tangan Digital (Paraf)
              </label>
              <div className="rounded-panel border border-rule bg-panel-2/50 p-4 flex flex-col items-center justify-center">
                <SignaturePad
                  label="Area Tanda Tangan"
                  value={formSignature}
                  onChange={setFormSignature}
                  width={380}
                  height={140}
                />
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Anda dapat menggambar langsung dengan mouse/touchscreen atau klik <strong>Import</strong> untuk mengunggah berkas foto/PNG tanda tangan.
              </p>
            </div>
          </DialogBody>

          <DialogFooter className="px-6 py-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveForm}
              disabled={!formName.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              <span>{editingDosen ? "Simpan Perubahan" : "Tambahkan Dosen"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Modal: Zoom Preview Signature ─────────────────── */}
      <Dialog
        open={Boolean(previewSigDosen)}
        onOpenChange={(open) => {
          if (!open) setPreviewSigDosen(null);
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">Pratinjau Tanda Tangan</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {previewSigDosen?.name}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="p-6 flex flex-col items-center justify-center">
            <div className="w-full flex flex-col items-center justify-center p-8 bg-white dark:bg-neutral-900 rounded-panel border border-rule shadow-inner">
              {previewSigDosen?.signature ? (
                <img
                  src={previewSigDosen.signature}
                  alt={`Tanda tangan ${previewSigDosen.name}`}
                  className="max-h-40 max-w-full object-contain"
                />
              ) : null}
            </div>
          </DialogBody>

          <DialogFooter className="px-6 py-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewSigDosen(null)}
            >
              Tutup
            </Button>
            <Button
              type="button"
              onClick={() => {
                const target = previewSigDosen;
                setPreviewSigDosen(null);
                if (target) handleOpenEdit(target);
              }}
            >
              <Edit2 className="h-4 w-4 mr-1" />
              <span>Ubah Tanda Tangan</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default DosenMasterPage;
