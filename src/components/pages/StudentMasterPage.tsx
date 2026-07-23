"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench (left-rail / right-canvas)
 * design-system: design.md · designed-as-app
 *
 * Layout note: the saved-student table is what this page exists to show, but it
 * used to share the width 50/50 with the import tools — seven columns squeezed
 * into half a screen, with Program Studi truncated at 150px. The input tools
 * (SIM Polije import, manual add) are now a settings rail; the table owns the
 * canvas.
 *
 * Two filter sets live here and they are NOT the same thing:
 *   · SIM Polije filters (status / jurusan / semester / golongan) are SEARCH
 *     PARAMETERS sent to the remote system to find students to import.
 *   · Master filters (prodi / semester / golongan) narrow the students already
 *     saved locally. They are derived from the saved rows themselves, so they
 *     only ever offer values that exist.
 * Keeping them visually separate is deliberate — merging them would be a lie.
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
} from "lucide-react";
import type { MasterStudent, ScheduleEntry } from "@/types";
import { useDialog } from "@/context/DialogContext";
import { Button } from "@/components/ui/button";
import {
  PageShell,
  PageHeader,
  Panel,
  PanelHeader,
  PanelBody,
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
  weeks?: any[];
  scheduleTemplate?: ScheduleEntry[];
}

/** Numeric-aware so "Semester 2" sorts before "Semester 10". */
const compareOption = (a: string, b: string) => {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, "id");
};

const selectClass =
  "w-full rounded-control border border-input bg-background px-2.5 py-1.5 text-sm";

const StudentMasterPage: React.FC<StudentMasterPageProps> = ({
  studentMaster,
  onStudentMasterChange,
  weeks,
  scheduleTemplate,
}) => {
  const { showAlert, showConfirm } = useDialog();
  const syncFromWeekly = () => {
    if (!weeks || weeks.length === 0) {
      showAlert("Sinkronisasi Gagal", "Tidak ada data mingguan untuk disinkronkan.");
      return;
    }

    const seen = new Map<string, MasterStudent>(); // nim -> student object
    // Collect from current master first to keep existing data
    studentMaster.forEach(m => {
      seen.set(m.nim, m);
    });

    let addedCount = 0;
    weeks.forEach((week) => {
      week.entries.forEach((entry: any) => {
        const tmpl = scheduleTemplate?.find(t => t.id === entry.scheduleId);
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
      showAlert("Sinkronisasi Selesai", "Semua mahasiswa dari data mingguan sudah terdaftar di master data.");
      return;
    }

    const newMaster = Array.from(seen.values());
    onStudentMasterChange(newMaster);
    showAlert("Sinkronisasi Berhasil", `Berhasil menambahkan ${addedCount} mahasiswa dari data mingguan.`);
  };

  // === SIM Polije search parameters ===
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  const [status, setStatus] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [semester, setSemester] = useState("");
  const [golongan, setGolongan] = useState("");

  // === Mahasiswa Search Results ===
  const [searchResults, setSearchResults] = useState<SimMahasiswa[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());

  // === Saved-master filters ===
  const [masterSearch, setMasterSearch] = useState("");
  const [filterProdi, setFilterProdi] = useState("");
  const [filterSemester, setFilterSemester] = useState("");
  const [filterGolongan, setFilterGolongan] = useState("");

  // === Manual Add ===
  const [manualNim, setManualNim] = useState("");
  const [manualName, setManualName] = useState("");

  // === Load filter options on mount ===
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
    if (!status || !jurusan || !semester || !golongan) {
      setSearchError("Pilih semua filter terlebih dahulu.");
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSelectedNims(new Set());

    try {
      const params = new URLSearchParams({
        Status: status,
        Jurusan: jurusan,
        Semester: semester,
        AB: golongan,
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
  }, [status, jurusan, semester, golongan]);

  // === Toggle selection ===
  const toggleSelect = (nim: string) => {
    setSelectedNims((prev) => {
      const next = new Set(prev);
      if (next.has(nim)) next.delete(nim);
      else next.add(nim);
      return next;
    });
  };

  const toggleSelectAll = () => {
    // Filter out those already in master
    const addable = searchResults.filter(
      (s) => !studentMaster.some((m) => m.nim === s.nim)
    );
    if (selectedNims.size === addable.length && addable.length > 0) {
      setSelectedNims(new Set());
    } else {
      setSelectedNims(new Set(addable.map((s) => s.nim)));
    }
  };

  // === Add selected to master ===
  const addSelectedToMaster = () => {
    const toAdd = searchResults.filter(
      (s) => selectedNims.has(s.nim) && !studentMaster.some((m) => m.nim === s.nim)
    );
    if (toAdd.length === 0) return;

    const activeProdiText = filterData?.jurusan?.find(j => j.value === jurusan)?.text || jurusan;
    const activeSemesterText = filterData?.semesters?.find(s => s.value === semester)?.text || semester;
    const activeGolonganText = filterData?.golongan?.find(g => g.value === golongan)?.text || golongan;

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
  };

  // === Add all results to master ===
  const addAllToMaster = () => {
    const toAdd = searchResults.filter(
      (s) => !studentMaster.some((m) => m.nim === s.nim)
    );
    if (toAdd.length === 0) return;

    const activeProdiText = filterData?.jurusan?.find(j => j.value === jurusan)?.text || jurusan;
    const activeSemesterText = filterData?.semesters?.find(s => s.value === semester)?.text || semester;
    const activeGolonganText = filterData?.golongan?.find(g => g.value === golongan)?.text || golongan;

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
  };

  // === Manual add ===
  const handleManualAdd = () => {
    if (!manualNim.trim() || !manualName.trim()) return;
    if (studentMaster.some((m) => m.nim === manualNim.trim())) {
      showAlert("NIM Sudah Ada", "Nomor Induk Mahasiswa (NIM) tersebut sudah terdaftar di master data.");
      return;
    }

    const activeProdiText = filterData?.jurusan?.find(j => j.value === jurusan)?.text || jurusan;
    const activeSemesterText = filterData?.semesters?.find(s => s.value === semester)?.text || semester;
    const activeGolonganText = filterData?.golongan?.find(g => g.value === golongan)?.text || golongan;

    onStudentMasterChange([
      ...studentMaster,
      {
        nim: manualNim.trim(),
        name: manualName.trim(),
        prodi: activeProdiText,
        semester: activeSemesterText,
        golongan: activeGolonganText,
      },
    ]);
    setManualNim("");
    setManualName("");
  };

  // === Remove from master ===
  const removeFromMaster = (nim: string) => {
    onStudentMasterChange(studentMaster.filter((m) => m.nim !== nim));
  };

  const clearAllMaster = async () => {
    const isConfirmed = await showConfirm("Hapus Master Mahasiswa", "Apakah Anda yakin ingin menghapus semua data master mahasiswa?");
    if (!isConfirmed) return;
    onStudentMasterChange([]);
  };

  // === Filter options, derived from the saved rows ===
  // Deriving them from the data means the dropdowns can never offer a value
  // that returns nothing.
  const prodiOptions = useMemo(
    () =>
      Array.from(new Set(studentMaster.map((m) => m.prodi).filter(Boolean) as string[]))
        .sort(compareOption),
    [studentMaster]
  );
  const semesterOptions = useMemo(
    () =>
      Array.from(new Set(studentMaster.map((m) => m.semester).filter(Boolean) as string[]))
        .sort(compareOption),
    [studentMaster]
  );
  const golonganOptions = useMemo(
    () =>
      Array.from(new Set(studentMaster.map((m) => m.golongan).filter(Boolean) as string[]))
        .sort(compareOption),
    [studentMaster]
  );

  const activeFilterCount =
    (filterProdi ? 1 : 0) + (filterSemester ? 1 : 0) + (filterGolongan ? 1 : 0);
  const hasQuery = masterSearch.trim().length > 0;

  const resetMasterFilters = () => {
    setFilterProdi("");
    setFilterSemester("");
    setFilterGolongan("");
    setMasterSearch("");
  };

  // === Filtered master data ===
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

  // Addable count from search results
  const addableResults = searchResults.filter(
    (s) => !studentMaster.some((m) => m.nim === s.nim)
  );

  const isNarrowed = activeFilterCount > 0 || hasQuery;

  return (
    <PageShell>
      <PageHeader
        title="Master Mahasiswa"
        meta={
          isNarrowed
            ? `${filteredMaster.length} dari ${studentMaster.length} mahasiswa`
            : `${studentMaster.length} mahasiswa terdaftar`
        }
        actions={
          <>
            {weeks && weeks.length > 0 && (
              <Button variant="outline" onClick={syncFromWeekly}>
                <RefreshCw /> Ambil dari mingguan
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {/* ── Rail: input tools ─────────────────────────────────── */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-7 lg:self-start">
          <Panel>
            <PanelHeader
              icon={<Download />}
              title="Ambil dari SIM Polije"
              meta="Parameter pencarian ke sistem SIM"
            />

            <PanelBody className="space-y-4">
              {filterLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <span className="text-sm">Memuat opsi filter…</span>
                </div>
              ) : filterError ? (
                <div className="rounded-control border border-warn/30 bg-warn-soft p-4">
                  <div className="flex items-start gap-3">
                    <WifiOff className="mt-0.5 size-4 shrink-0 text-warn" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        API SIM Polije tidak tersedia
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">{filterError}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadFilterOptions}
                        className="mt-3"
                      >
                        <RefreshCw /> Coba lagi
                      </Button>
                    </div>
                  </div>
                </div>
              ) : filterData ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Status</label>
                      <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
                        <option value="">— Pilih —</option>
                        {filterData.statuses?.map((o) => (
                          <option key={o.value} value={o.value}>{o.text}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Program Studi</label>
                      <select value={jurusan} onChange={(e) => setJurusan(e.target.value)} className={selectClass}>
                        <option value="">— Pilih —</option>
                        {filterData.jurusan?.map((o) => (
                          <option key={o.value} value={o.value}>{o.text}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Semester</label>
                      <select value={semester} onChange={(e) => setSemester(e.target.value)} className={selectClass}>
                        <option value="">— Pilih —</option>
                        {filterData.semesters?.map((o) => (
                          <option key={o.value} value={o.value}>{o.text}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Golongan</label>
                      <select value={golongan} onChange={(e) => setGolongan(e.target.value)} className={selectClass}>
                        <option value="">— Pilih —</option>
                        {filterData.golongan?.map((o) => (
                          <option key={o.value} value={o.value}>{o.text}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={searchMahasiswa}
                    disabled={searchLoading || !status || !jurusan || !semester || !golongan}
                  >
                    {searchLoading ? <Loader2 className="animate-spin" /> : <Search />}
                    {searchLoading ? "Mencari…" : "Cari mahasiswa"}
                  </Button>
                </>
              ) : null}

              {searchError && (
                <div className="flex items-start gap-2 rounded-control border border-warn/30 bg-warn-soft p-3">
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warn" />
                  <p className="text-xs text-foreground">{searchError}</p>
                </div>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      Hasil: {searchResults.length}
                      {addableResults.length < searchResults.length && (
                        <span className="text-muted-foreground">
                          {" "}({searchResults.length - addableResults.length} sudah ada)
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="shrink-0 whitespace-nowrap text-xs text-link hover:underline"
                    >
                      {selectedNims.size === addableResults.length && addableResults.length > 0
                        ? "Batal semua"
                        : "Pilih semua"}
                    </button>
                  </div>

                  <div className="hm-scroll max-h-64 overflow-y-auto rounded-control border border-rule">
                    {searchResults.map((s) => {
                      const inMaster = studentMaster.some((m) => m.nim === s.nim);
                      return (
                        <label
                          key={s.nim}
                          className={`flex items-center gap-3 border-b border-rule px-3 py-2 text-sm last:border-b-0 transition-colors duration-[180ms] ease-out ${
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
                              className="shrink-0"
                            />
                          )}
                          <span className="w-24 shrink-0 font-mono text-xs text-muted-foreground">
                            {s.nim}
                          </span>
                          <span className="flex-1 truncate">{s.nama}</span>
                          {inMaster && (
                            <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs text-muted-foreground">
                              <Check className="size-3" /> Ada
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={addSelectedToMaster}
                      disabled={selectedNims.size === 0}
                    >
                      <Plus />
                      Terpilih ({selectedNims.size})
                    </Button>
                    <Button
                      variant="outline"
                      onClick={addAllToMaster}
                      disabled={addableResults.length === 0}
                    >
                      <Users />
                      Semua ({addableResults.length})
                    </Button>
                  </div>
                </div>
              )}
            </PanelBody>
          </Panel>

          {/* Manual add — its own panel, not a footnote inside the import tool */}
          <Panel>
            <PanelHeader
              icon={<UserPlus />}
              title="Tambah manual"
              meta="Untuk mahasiswa yang tidak ada di SIM"
            />
            <PanelBody className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">NIM</label>
                <input
                  type="text"
                  value={manualNim}
                  onChange={(e) => setManualNim(e.target.value)}
                  placeholder="Nomor induk mahasiswa"
                  className="w-full rounded-control border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Nama</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nama lengkap"
                  className="w-full rounded-control border border-input bg-background px-3 py-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualAdd();
                  }}
                />
              </div>
              <Button
                className="w-full"
                variant="outline"
                onClick={handleManualAdd}
                disabled={!manualNim.trim() || !manualName.trim()}
              >
                <Plus /> Tambahkan
              </Button>
            </PanelBody>
          </Panel>
        </div>

        {/* ── Canvas: the saved master ──────────────────────────── */}
        <Panel className="flex min-w-0 flex-col">
          <PanelHeader
            icon={<Users />}
            title="Data tersimpan"
            meta={
              isNarrowed
                ? `${filteredMaster.length} dari ${studentMaster.length} mahasiswa`
                : `${studentMaster.length} mahasiswa`
            }
            action={
              studentMaster.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllMaster}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 /> Hapus semua
                </Button>
              ) : null
            }
          />

          {/* Filter bar — narrows the saved rows */}
          <div className="space-y-3 border-b border-rule p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.7fr)_minmax(0,0.7fr)]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={masterSearch}
                  onChange={(e) => setMasterSearch(e.target.value)}
                  placeholder="Cari NIM atau nama…"
                  aria-label="Cari mahasiswa tersimpan"
                  className="w-full rounded-control border border-input bg-background py-2 pl-9 pr-3 text-sm"
                />
              </div>

              <select
                value={filterProdi}
                onChange={(e) => setFilterProdi(e.target.value)}
                aria-label="Filter program studi"
                className={selectClass}
              >
                <option value="">Semua prodi</option>
                {prodiOptions.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>

              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                aria-label="Filter semester"
                className={selectClass}
              >
                <option value="">Semua smt</option>
                {semesterOptions.map((o) => (
                  <option key={o} value={o}>Smt {o}</option>
                ))}
              </select>

              <select
                value={filterGolongan}
                onChange={(e) => setFilterGolongan(e.target.value)}
                aria-label="Filter golongan"
                className={selectClass}
              >
                <option value="">Semua gol</option>
                {golonganOptions.map((o) => (
                  <option key={o} value={o}>Gol {o}</option>
                ))}
              </select>
            </div>

            {isNarrowed && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Filter className="size-3.5 shrink-0" />
                <span>
                  Menampilkan{" "}
                  <span data-numeric className="font-semibold text-foreground">
                    {filteredMaster.length}
                  </span>{" "}
                  dari{" "}
                  <span data-numeric className="font-semibold text-foreground">
                    {studentMaster.length}
                  </span>{" "}
                  mahasiswa
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={resetMasterFilters}
                  className="ml-auto"
                >
                  <X /> Bersihkan filter
                </Button>
              </div>
            )}
          </div>

          <div className="hm-scroll max-h-[36rem] min-w-0 flex-1 overflow-auto">
            {filteredMaster.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-panel-2">
                  <tr className="border-b border-rule text-left font-medium text-muted-foreground">
                    <th className="w-12 px-4 py-2.5">No</th>
                    <th className="w-32 px-3 py-2.5">NIM</th>
                    <th className="px-3 py-2.5">Nama</th>
                    <th className="px-3 py-2.5">Program Studi</th>
                    <th className="w-16 px-2 py-2.5 text-center">Smt</th>
                    <th className="w-16 px-2 py-2.5 text-center">Gol</th>
                    <th className="w-12 px-2 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaster.map((m, idx) => (
                    <tr
                      key={m.nim}
                      className="border-b border-rule transition-colors duration-[180ms] ease-out hover:bg-panel-2"
                    >
                      <td className="px-4 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-mono text-xs">{m.nim}</td>
                      <td className="px-3 py-2 font-medium">{m.name}</td>
                      <td
                        className="max-w-[18rem] truncate px-3 py-2 text-xs text-muted-foreground"
                        title={m.prodi}
                      >
                        {m.prodi || "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                        {m.semester || "—"}
                      </td>
                      <td className="px-2 py-2 text-center text-xs text-muted-foreground">
                        {m.golongan || "—"}
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => removeFromMaster(m.nim)}
                          aria-label={`Hapus ${m.name}`}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState
                variant="bare"
                size="compact"
                icon={<GraduationCap />}
                title={
                  isNarrowed ? "Tidak ada hasil" : "Belum ada data mahasiswa"
                }
                description={
                  isNarrowed
                    ? "Tidak ada mahasiswa yang cocok dengan filter ini."
                    : "Ambil dari SIM Polije, sinkronkan dari data mingguan, atau tambah manual."
                }
                actions={
                  isNarrowed ? (
                    <Button variant="outline" onClick={resetMasterFilters}>
                      <X /> Bersihkan filter
                    </Button>
                  ) : null
                }
              />
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};

export default StudentMasterPage;
