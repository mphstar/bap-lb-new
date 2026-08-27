"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench (Canvas with Modal Flow)
 * design-system: design.md · designed-as-app
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Trash2,
  Check,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  Users,
  GraduationCap,
  WifiOff,
  Filter,
  X,
  UserPlus,
  Edit2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Building,
} from "lucide-react";
import type { MasterStudent, ScheduleEntry, WeekData } from "@/types";
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

interface FilterOption {
  value: string;
  text: string;
}

interface FilterData {
  statuses: FilterOption[];
  jurusan: FilterOption[];
  semesters: FilterOption[];
  golongan: FilterOption[];
}

interface SimMahasiswa {
  no: number;
  nim: string;
  nama: string;
}

interface StudentMasterPageProps {
  studentMaster: MasterStudent[];
  onStudentMasterChange: (master: MasterStudent[]) => void;
  weeks?: WeekData[];
  scheduleTemplate?: ScheduleEntry[];
}

/** Numeric-aware sort comparator */
const compareOption = (a: string, b: string) => {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "id");
};

/** Generate initials from student name */
function getInitials(name: string): string {
  if (!name) return "M";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic soft avatar hue */
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

const selectClass =
  "w-full rounded-control border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-ring";

const StudentMasterPage: React.FC<StudentMasterPageProps> = ({
  studentMaster,
  onStudentMasterChange,
  weeks = [],
  scheduleTemplate = [],
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Search & Filter state for Saved Master
  const [masterSearch, setMasterSearch] = useState("");
  const [filterProdi, setFilterProdi] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterGolongan, setFilterGolongan] = useState("");

  // Add / Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<MasterStudent | null>(null);
  const [formNim, setFormNim] = useState("");
  const [formName, setFormName] = useState("");
  const [formProdi, setFormProdi] = useState("");
  const [formSemester, setFormSemester] = useState("");
  const [formGolongan, setFormGolongan] = useState("");

  // SIM Polije Import Modal State
  const [isSimModalOpen, setIsSimModalOpen] = useState(false);
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [simStatus, setSimStatus] = useState("");
  const [simJurusan, setSimJurusan] = useState("");
  const [simSemester, setSimSemester] = useState("");
  const [simGolongan, setSimGolongan] = useState("");

  const [searchResults, setSearchResults] = useState<SimMahasiswa[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());

  // === Load SIM Polije filter options ===
  const loadFilterOptions = useCallback(async () => {
    setFilterLoading(true);
    setFilterError(null);
    try {
      const res = await fetch("/api/sim-polije/options");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setFilterData(json.data || json);
    } catch (err: any) {
      setFilterError(err.message);
    } finally {
      setFilterLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // === Search mahasiswa from SIM Polije ===
  const searchMahasiswa = useCallback(async () => {
    if (!simStatus || !simJurusan || !simSemester || !simGolongan) {
      setSearchError("Harap pilih semua opsi filter terlebih dahulu.");
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedNims(new Set());

    try {
      const params = new URLSearchParams({
        Status: simStatus,
        Jurusan: simJurusan,
        Semester: simSemester,
        AB: simGolongan,
      });
      const res = await fetch(`/api/sim-polije/mahasiswa?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setSearchResults(json.data || []);
      if ((json.data || []).length === 0) {
        setSearchError("Tidak ada mahasiswa ditemukan untuk filter ini.");
      }
    } catch (err: any) {
      setSearchError(err.message);
    } finally {
      setSearchLoading(false);
    }
  }, [simStatus, simJurusan, simSemester, simGolongan]);

  // === Toggle SIM selections ===
  const toggleSelect = (nim: string) => {
    setSelectedNims((prev) => {
      const next = new Set(prev);
      if (next.has(nim)) next.delete(nim);
      else next.add(nim);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const addable = searchResults.filter(
      (s) => !studentMaster.some((m) => m.nim === s.nim)
    );
    if (selectedNims.size === addable.length && addable.length > 0) {
      setSelectedNims(new Set());
    } else {
      setSelectedNims(new Set(addable.map((s) => s.nim)));
    }
  };

  // === Add selected from SIM to master ===
  const addSelectedToMaster = () => {
    const toAdd = searchResults.filter(
      (s) => selectedNims.has(s.nim) && !studentMaster.some((m) => m.nim === s.nim)
    );
    if (toAdd.length === 0) return;

    const activeProdiText =
      filterData?.jurusan?.find((j) => j.value === simJurusan)?.text || simJurusan;
    const activeSemesterText =
      filterData?.semesters?.find((s) => s.value === simSemester)?.text || simSemester;
    const activeGolonganText =
      filterData?.golongan?.find((g) => g.value === simGolongan)?.text || simGolongan;

    const newMaster = [
      ...studentMaster,
      ...toAdd.map((s) => ({
        nim: s.nim,
        name: s.nama,
        prodi: activeProdiText,
        semester: activeSemesterText,
        golongan: activeGolonganText,
      })),
    ];
    onStudentMasterChange(newMaster);
    setSelectedNims(new Set());
    setIsSimModalOpen(false);
    showAlert(
      "Berhasil Menambahkan",
      `Berhasil mengimpor ${toAdd.length} mahasiswa ke master data.`
    );
  };

  // === Add all from SIM to master ===
  const addAllToMaster = () => {
    const toAdd = searchResults.filter(
      (s) => !studentMaster.some((m) => m.nim === s.nim)
    );
    if (toAdd.length === 0) return;

    const activeProdiText =
      filterData?.jurusan?.find((j) => j.value === simJurusan)?.text || simJurusan;
    const activeSemesterText =
      filterData?.semesters?.find((s) => s.value === simSemester)?.text || simSemester;
    const activeGolonganText =
      filterData?.golongan?.find((g) => g.value === simGolongan)?.text || simGolongan;

    const newMaster = [
      ...studentMaster,
      ...toAdd.map((s) => ({
        nim: s.nim,
        name: s.nama,
        prodi: activeProdiText,
        semester: activeSemesterText,
        golongan: activeGolonganText,
      })),
    ];
    onStudentMasterChange(newMaster);
    setSelectedNims(new Set());
    setIsSimModalOpen(false);
    showAlert(
      "Berhasil Menambahkan",
      `Berhasil mengimpor seluruh (${toAdd.length}) mahasiswa ke master data.`
    );
  };

  // === Sync from weekly schedule entries ===
  const syncFromWeekly = () => {
    if (!weeks || weeks.length === 0) {
      showAlert("Sinkronisasi Gagal", "Tidak ada data mingguan untuk disinkronkan.");
      return;
    }

    const seen = new Map<string, MasterStudent>();
    studentMaster.forEach((m) => {
      seen.set(m.nim, m);
    });

    let addedCount = 0;
    weeks.forEach((week) => {
      week.entries.forEach((entry: any) => {
        const tmpl = scheduleTemplate?.find((t) => t.id === entry.scheduleId);
        (entry.students || []).forEach((s: any) => {
          if (s.name?.trim() && s.nim?.trim() && !seen.has(s.nim.trim())) {
            seen.set(s.nim.trim(), {
              nim: s.nim.trim(),
              name: s.name.trim(),
              prodi: tmpl?.prodi || "",
              semester: tmpl?.semester || "",
              golongan: tmpl?.golongan || "",
            });
            addedCount++;
          }
        });
      });
    });

    if (addedCount === 0) {
      showAlert(
        "Sinkronisasi Selesai",
        "Semua mahasiswa dari data mingguan sudah terdaftar di master data."
      );
      return;
    }

    const newMaster = Array.from(seen.values());
    onStudentMasterChange(newMaster);
    showAlert(
      "Sinkronisasi Berhasil",
      `Berhasil menambahkan ${addedCount} mahasiswa dari data mingguan.`
    );
  };

  // === Modal Add / Edit Student Form Handlers ===
  const handleOpenAdd = () => {
    setEditingStudent(null);
    setFormNim("");
    setFormName("");
    setFormProdi(filterProdi || "");
    setFormSemester(filterSemester || "");
    setFormGolongan(filterGolongan || "");
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (student: MasterStudent) => {
    setEditingStudent(student);
    setFormNim(student.nim);
    setFormName(student.name);
    setFormProdi(student.prodi || "");
    setFormSemester(student.semester || "");
    setFormGolongan(student.golongan || "");
    setIsEditModalOpen(true);
  };

  const handleSaveStudent = () => {
    const trimmedNim = formNim.trim();
    const trimmedName = formName.trim();
    if (!trimmedNim || !trimmedName) return;

    if (editingStudent) {
      // If editing existing student
      const isDuplicate =
        trimmedNim.toLowerCase() !== editingStudent.nim.toLowerCase() &&
        studentMaster.some((m) => m.nim.toLowerCase() === trimmedNim.toLowerCase());

      if (isDuplicate) {
        showAlert(
          "NIM Sudah Terdaftar",
          `NIM "${trimmedNim}" sudah digunakan oleh mahasiswa lain.`
        );
        return;
      }

      const updated = studentMaster.map((m) =>
        m.nim === editingStudent.nim
          ? {
              nim: trimmedNim,
              name: trimmedName,
              prodi: formProdi.trim(),
              semester: formSemester.trim(),
              golongan: formGolongan.trim(),
            }
          : m
      );
      onStudentMasterChange(updated);
      setIsEditModalOpen(false);
    } else {
      // If adding new student
      if (
        studentMaster.some(
          (m) => m.nim.toLowerCase() === trimmedNim.toLowerCase()
        )
      ) {
        showAlert(
          "NIM Sudah Terdaftar",
          `Nomor Induk Mahasiswa (NIM) "${trimmedNim}" sudah terdaftar di master data.`
        );
        return;
      }

      onStudentMasterChange([
        ...studentMaster,
        {
          nim: trimmedNim,
          name: trimmedName,
          prodi: formProdi.trim(),
          semester: formSemester.trim(),
          golongan: formGolongan.trim(),
        },
      ]);
      setIsEditModalOpen(false);
    }
  };

  // === Delete Student ===
  const removeFromMaster = async (student: MasterStudent) => {
    const isConfirmed = await showConfirm(
      "Hapus Mahasiswa",
      `Apakah Anda yakin ingin menghapus mahasiswa "${student.name}" (${student.nim}) dari master data?`
    );
    if (!isConfirmed) return;
    onStudentMasterChange(studentMaster.filter((m) => m.nim !== student.nim));
  };

  const clearAllMaster = async () => {
    const isConfirmed = await showConfirm(
      "Hapus Seluruh Master Mahasiswa",
      "Apakah Anda yakin ingin mengosongkan seluruh master data mahasiswa? Tindakan ini tidak dapat dibatalkan."
    );
    if (!isConfirmed) return;
    onStudentMasterChange([]);
  };

  // === Statistics & Filter Derived Options ===
  const prodiOptions = useMemo(
    () =>
      Array.from(
        new Set(studentMaster.map((m) => m.prodi).filter(Boolean) as string[])
      ).sort(compareOption),
    [studentMaster]
  );

  const semesterOptions = useMemo(
    () =>
      Array.from(
        new Set(studentMaster.map((m) => m.semester).filter(Boolean) as string[])
      ).sort(compareOption),
    [studentMaster]
  );

  const golonganOptions = useMemo(
    () =>
      Array.from(
        new Set(studentMaster.map((m) => m.golongan).filter(Boolean) as string[])
      ).sort(compareOption),
    [studentMaster]
  );

  const totalMahasiswa = studentMaster.length;
  const completeInfoCount = useMemo(
    () =>
      studentMaster.filter(
        (m) => Boolean(m.prodi?.trim()) && Boolean(m.golongan?.trim())
      ).length,
    [studentMaster]
  );
  const completePercentage =
    totalMahasiswa > 0 ? Math.round((completeInfoCount / totalMahasiswa) * 100) : 0;
  const uniqueProdiCount = prodiOptions.length;

  // Active scheduled students count in weekly entries
  const scheduledCount = useMemo(() => {
    const nimsInSchedule = new Set<string>();
    weeks.forEach((w) => {
      w.entries.forEach((e: any) => {
        (e.students || []).forEach((s: any) => {
          if (s.nim) nimsInSchedule.add(s.nim.trim());
        });
      });
    });
    return studentMaster.filter((m) => nimsInSchedule.has(m.nim.trim())).length;
  }, [weeks, studentMaster]);

  // === Filtered Master Data ===
  const filteredMaster = useMemo(() => {
    const q = masterSearch.trim().toLowerCase();
    return studentMaster.filter((m) => {
      if (filterProdi && (m.prodi || "") !== filterProdi) return false;
      if (filterSemester && (m.semester || "") !== filterSemester) return false;
      if (filterGolongan && (m.golongan || "") !== filterGolongan) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.nim.toLowerCase().includes(q) ||
        (m.prodi && m.prodi.toLowerCase().includes(q)) ||
        (m.semester && m.semester.toLowerCase().includes(q)) ||
        (m.golongan && m.golongan.toLowerCase().includes(q))
      );
    });
  }, [studentMaster, masterSearch, filterProdi, filterSemester, filterGolongan]);

  const activeFilterCount =
    (filterProdi ? 1 : 0) + (filterSemester ? 1 : 0) + (filterGolongan ? 1 : 0);
  const isNarrowed = activeFilterCount > 0 || masterSearch.trim().length > 0;

  const resetMasterFilters = () => {
    setFilterProdi("");
    setFilterSemester("");
    setFilterGolongan("");
    setMasterSearch("");
  };

  const addableResults = searchResults.filter(
    (s) => !studentMaster.some((m) => m.nim === s.nim)
  );

  return (
    <PageShell>
      <PageHeader
        title="Master Data Mahasiswa"
        meta={`${totalMahasiswa} mahasiswa terdaftar — basis data presensi mingguan dan form penilaian`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {weeks && weeks.length > 0 && (
              <Button variant="outline" onClick={syncFromWeekly}>
                <RefreshCw className="h-4 w-4" />
                <span>Sinkron Mingguan</span>
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsSimModalOpen(true)}>
              <Download className="h-4 w-4" />
              <span>Import SIM Polije</span>
            </Button>
            <Button variant="default" onClick={handleOpenAdd}>
              <Plus className="h-4 w-4" />
              <span>Tambah Mahasiswa</span>
            </Button>
          </div>
        }
      />

      {/* ── Stat Tiles Overview ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={<Users className="h-4 w-4 text-primary" />}
          label="Total Mahasiswa"
          value={totalMahasiswa}
          meta="Terdaftar dalam sistem"
        />
        <StatTile
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
          label="Lengkap Prodi & Gol"
          value={completeInfoCount}
          meta={`${completePercentage}% data terisi lengkap`}
        />
        <StatTile
          icon={<Building className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
          label="Program Studi"
          value={uniqueProdiCount}
          meta={`${prodiOptions.length} prodi aktif`}
        />
        <StatTile
          icon={<GraduationCap className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
          label="Terjadwal di BAP"
          value={scheduledCount}
          meta="Ada di log presensi sesi"
        />
      </div>

      {/* ── Main Canvas: Saved Master Table ─────────────────────── */}
      <Panel className="flex flex-col">
        <PanelHeader
          icon={<GraduationCap className="h-4 w-4" />}
          title="Direktori Mahasiswa"
          meta={
            isNarrowed
              ? `Menampilkan ${filteredMaster.length} dari ${totalMahasiswa} mahasiswa`
              : `${totalMahasiswa} mahasiswa terdaftar`
          }
          action={
            studentMaster.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllMaster}
                className="text-muted-foreground hover:text-destructive text-xs"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Hapus Semua
              </Button>
            ) : null
          }
        />

        {/* Search & Filter Toolbar */}
        <div className="space-y-3 border-b border-rule p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
            {/* Search Input */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                placeholder="Cari NIM atau nama mahasiswa..."
                className="pl-9 pr-8"
              />
              {masterSearch && (
                <button
                  type="button"
                  onClick={() => setMasterSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Bersihkan pencarian"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Prodi */}
            <select
              value={filterProdi}
              onChange={(e) => setFilterProdi(e.target.value)}
              className={selectClass}
            >
              <option value="">Semua Program Studi</option>
              {prodiOptions.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>

            {/* Filter Semester */}
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className={selectClass}
            >
              <option value="">Semua Smt</option>
              {semesterOptions.map((o) => (
                <option key={o} value={o}>
                  Semester {o}
                </option>
              ))}
            </select>

            {/* Filter Golongan */}
            <select
              value={filterGolongan}
              onChange={(e) => setFilterGolongan(e.target.value)}
              className={selectClass}
            >
              <option value="">Semua Gol</option>
              {golonganOptions.map((o) => (
                <option key={o} value={o}>
                  Golongan {o}
                </option>
              ))}
            </select>
          </div>

          {/* Active Filter Chips / Reset */}
          {isNarrowed && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 shrink-0" />
              <span>
                Menampilkan{" "}
                <span className="font-semibold text-foreground">
                  {filteredMaster.length}
                </span>{" "}
                dari{" "}
                <span className="font-semibold text-foreground">
                  {totalMahasiswa}
                </span>{" "}
                mahasiswa
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={resetMasterFilters}
                className="ml-auto text-xs h-7 text-primary hover:text-primary"
              >
                <X className="h-3 w-3 mr-1" />
                Bersihkan Filter
              </Button>
            </div>
          )}
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          {filteredMaster.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-panel-2/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-rule">
                <tr>
                  <th className="py-3 pl-6 pr-3 w-16 text-center">No</th>
                  <th className="py-3 px-4">Mahasiswa & NIM</th>
                  <th className="py-3 px-4">Program Studi</th>
                  <th className="py-3 px-4 text-center w-24">Semester</th>
                  <th className="py-3 px-4 text-center w-24">Golongan</th>
                  <th className="py-3 pl-3 pr-6 text-right w-28">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rule">
                {filteredMaster.map((m, idx) => {
                  const initials = getInitials(m.name);
                  const avatarColor = getAvatarColor(m.name);

                  return (
                    <tr
                      key={m.nim}
                      className="group transition-colors duration-150 hover:bg-panel-2/50"
                    >
                      {/* No */}
                      <td className="py-3.5 pl-6 pr-3 text-center text-xs font-mono text-muted-foreground">
                        {idx + 1}
                      </td>

                      {/* Mahasiswa Name & NIM */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {/* Initials Avatar */}
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-control border font-semibold text-xs transition-transform group-hover:scale-105 ${avatarColor}`}
                          >
                            {initials}
                          </div>

                          {/* Details */}
                          <div className="min-w-0">
                            <p className="font-medium text-foreground text-sm leading-tight">
                              {m.name}
                            </p>
                            <span className="font-mono text-xs text-muted-foreground mt-0.5 inline-block">
                              {m.nim}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Program Studi */}
                      <td className="py-3.5 px-4">
                        {m.prodi ? (
                          <span
                            className="inline-flex items-center rounded-md bg-panel-2 border border-rule px-2.5 py-1 text-xs text-foreground font-medium max-w-[20rem] truncate"
                            title={m.prodi}
                          >
                            {m.prodi}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* Semester */}
                      <td className="py-3.5 px-4 text-center">
                        {m.semester ? (
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal bg-panel-2 text-foreground border-rule"
                          >
                            Smt {m.semester}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>

                      {/* Golongan */}
                      <td className="py-3.5 px-4 text-center">
                        {m.golongan ? (
                          <Badge
                            variant="secondary"
                            className="text-xs font-normal bg-primary/10 text-primary border-transparent"
                          >
                            Gol {m.golongan}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(m)}
                            className="h-8 px-2 text-xs font-medium"
                          >
                            <Edit2 className="h-3.5 w-3.5 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => removeFromMaster(m)}
                            aria-label={`Hapus ${m.name}`}
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
              variant="bare"
              icon={<GraduationCap className="h-8 w-8 text-muted-foreground" />}
              title={
                isNarrowed ? "Mahasiswa tidak ditemukan" : "Belum ada data mahasiswa"
              }
              description={
                isNarrowed
                  ? "Tidak ada data mahasiswa yang cocok dengan kriteria pencarian dan filter."
                  : "Tambahkan mahasiswa secara manual, sinkronkan dari data jadwal mingguan, atau import langsung dari SIM Polije."
              }
              actions={
                isNarrowed ? (
                  <Button variant="outline" onClick={resetMasterFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Bersihkan Filter
                  </Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsSimModalOpen(true)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Import SIM Polije
                    </Button>
                    <Button onClick={handleOpenAdd}>
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah Mahasiswa
                    </Button>
                  </div>
                )
              }
            />
          )}
        </div>
      </Panel>

      {/* ── Dialog Modal: Add / Edit Mahasiswa ──────────────────── */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <UserPlus className="h-4.5 w-4.5 text-primary" />
              <span>
                {editingStudent ? "Edit Data Mahasiswa" : "Tambah Mahasiswa Baru"}
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingStudent
                ? "Perbarui informasi identitas, program studi, semester, atau golongan mahasiswa."
                : "Masukkan identitas mahasiswa untuk ditambahkan ke dalam basis data master."}
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 px-6 py-5">
            {/* NIM & Nama */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  NIM <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={formNim}
                  onChange={(e) => setFormNim(e.target.value)}
                  placeholder="Contoh: E41210001"
                  className="font-mono text-sm"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Nama Lengkap <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Nama Lengkap Mahasiswa"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Program Studi */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                Program Studi
              </label>
              <Input
                type="text"
                value={formProdi}
                onChange={(e) => setFormProdi(e.target.value)}
                placeholder="Contoh: Teknik Informatika / Manajemen Informatika"
                className="text-sm"
              />
            </div>

            {/* Semester & Golongan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Semester
                </label>
                <Input
                  type="text"
                  value={formSemester}
                  onChange={(e) => setFormSemester(e.target.value)}
                  placeholder="Contoh: 4"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                  Golongan
                </label>
                <Input
                  type="text"
                  value={formGolongan}
                  onChange={(e) => setFormGolongan(e.target.value)}
                  placeholder="Contoh: A / B / Internasional"
                  className="text-sm"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter className="px-6 py-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleSaveStudent}
              disabled={!formNim.trim() || !formName.trim()}
            >
              <Check className="h-4 w-4 mr-1" />
              <span>{editingStudent ? "Simpan Perubahan" : "Tambahkan"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Modal: Import dari SIM Polije ─────────────────── */}
      <Dialog open={isSimModalOpen} onOpenChange={setIsSimModalOpen}>
        <DialogContent className="sm:max-w-[620px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Download className="h-4.5 w-4.5 text-primary" />
              <span>Import Mahasiswa dari SIM Polije</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              Pilih kriteria jurusan, semester, dan golongan dari sistem SIM Polije untuk mengambil daftar mahasiswa.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 px-6 py-5">
            {filterLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="size-4 animate-spin text-primary" />
                <span className="text-sm">Memuat opsi parameter SIM Polije…</span>
              </div>
            ) : filterError ? (
              <div className="rounded-control border border-destructive/30 bg-destructive/10 p-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="mt-0.5 size-4 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Koneksi ke API SIM Polije Terkendala
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{filterError}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadFilterOptions}
                      className="mt-3 text-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" /> Coba Lagi
                    </Button>
                  </div>
                </div>
              </div>
            ) : filterData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </label>
                    <select
                      value={simStatus}
                      onChange={(e) => setSimStatus(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Pilih Status —</option>
                      {filterData.statuses?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Program Studi
                    </label>
                    <select
                      value={simJurusan}
                      onChange={(e) => setSimJurusan(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Pilih Prodi —</option>
                      {filterData.jurusan?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Semester
                    </label>
                    <select
                      value={simSemester}
                      onChange={(e) => setSimSemester(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Pilih Smt —</option>
                      {filterData.semesters?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Golongan
                    </label>
                    <select
                      value={simGolongan}
                      onChange={(e) => setSimGolongan(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">— Pilih Gol —</option>
                      {filterData.golongan?.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.text}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={searchMahasiswa}
                  disabled={
                    searchLoading ||
                    !simStatus ||
                    !simJurusan ||
                    !simSemester ||
                    !simGolongan
                  }
                >
                  {searchLoading ? (
                    <Loader2 className="animate-spin h-4 w-4 mr-1.5" />
                  ) : (
                    <Search className="h-4 w-4 mr-1.5" />
                  )}
                  {searchLoading ? "Mencari data mahasiswa…" : "Cari Mahasiswa SIM"}
                </Button>
              </>
            ) : null}

            {searchError && (
              <div className="flex items-start gap-2 rounded-control border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-xs text-foreground">{searchError}</p>
              </div>
            )}

            {/* Results list */}
            {searchResults.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-rule">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-foreground">
                    Ditemukan: {searchResults.length} Mahasiswa
                    {addableResults.length < searchResults.length && (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({searchResults.length - addableResults.length} sudah terdaftar)
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    {selectedNims.size === addableResults.length && addableResults.length > 0
                      ? "Batalkan Pilihan"
                      : "Pilih Semua"}
                  </button>
                </div>

                <div className="hm-scroll max-h-60 overflow-y-auto rounded-control border border-rule divide-y divide-rule bg-background">
                  {searchResults.map((s) => {
                    const inMaster = studentMaster.some((m) => m.nim === s.nim);
                    return (
                      <label
                        key={s.nim}
                        className={`flex items-center gap-3 px-3 py-2 text-xs transition-colors ${
                          inMaster
                            ? "cursor-not-allowed bg-panel-2 opacity-60"
                            : "cursor-pointer hover:bg-panel-2"
                        }`}
                      >
                        {inMaster ? (
                          <CheckSquare className="size-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={selectedNims.has(s.nim)}
                            onChange={() => toggleSelect(s.nim)}
                            className="size-4 rounded border-input text-primary shrink-0"
                          />
                        )}
                        <span className="w-24 shrink-0 font-mono text-muted-foreground">
                          {s.nim}
                        </span>
                        <span className="flex-1 truncate font-medium text-foreground">
                          {s.nama}
                        </span>
                        {inMaster && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
                            <Check className="size-3 text-emerald-600" /> Terdaftar
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={addSelectedToMaster}
                    disabled={selectedNims.size === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Tambahkan Terpilih ({selectedNims.size})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={addAllToMaster}
                    disabled={addableResults.length === 0}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Tambahkan Semua ({addableResults.length})
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter className="px-6 py-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSimModalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
};

export default StudentMasterPage;
