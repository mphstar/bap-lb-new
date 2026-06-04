"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Plus,
  Trash2,
  Download,
  AlertTriangle,
  Loader2,
  RefreshCw,
  CheckSquare,
  Square,
  Users,
  GraduationCap,
  WifiOff,
} from "lucide-react";
import type { MasterStudent, ScheduleEntry } from "@/types";
import { useDialog } from "@/context/DialogContext";

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
  // === Filter Options State ===
  const [filterData, setFilterData] = useState<FilterData | null>(null);
  const [filterLoading, setFilterLoading] = useState(false);
  const [filterError, setFilterError] = useState<string | null>(null);

  // === Selected Filters ===
  const [status, setStatus] = useState("");
  const [jurusan, setJurusan] = useState("");
  const [semester, setSemester] = useState("");
  const [golongan, setGolongan] = useState("");

  // === Mahasiswa Search Results ===
  const [searchResults, setSearchResults] = useState<SimMahasiswa[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());

  // === Master Data Search ===
  const [masterSearch, setMasterSearch] = useState("");

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

  // === Filtered master data ===
  const filteredMaster = useMemo(() => {
    if (!masterSearch.trim()) return studentMaster;
    const q = masterSearch.toLowerCase();
    return studentMaster.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.nim.toLowerCase().includes(q) ||
        (m.prodi && m.prodi.toLowerCase().includes(q)) ||
        (m.semester && m.semester.toLowerCase().includes(q)) ||
        (m.golongan && m.golongan.toLowerCase().includes(q))
    );
  }, [studentMaster, masterSearch]);

  // Addable count from search results
  const addableResults = searchResults.filter(
    (s) => !studentMaster.some((m) => m.nim === s.nim)
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="text-primary" size={24} />
          Master Data Mahasiswa
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola daftar mahasiswa. Ambil data dari SIM Polije atau tambah manual.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* === Left: SIM Polije Integration === */}
        <div className="bg-card rounded-xl border shadow-sm">
          <div className="p-4 border-b">
            <h3 className="font-semibold flex items-center gap-2">
              <Download size={16} className="text-primary" />
              Ambil dari SIM Polije
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Pilih filter lalu cari mahasiswa dari sistem SIM Polije.
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Filter Options */}
            {filterLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="animate-spin" size={18} />
                <span className="text-sm">Memuat opsi filter...</span>
              </div>
            ) : filterError ? (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <WifiOff size={18} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                      API SIM Polije tidak tersedia
                    </p>
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      {filterError}
                    </p>
                    <button
                      onClick={loadFilterOptions}
                      className="flex items-center gap-1 text-xs mt-2 text-orange-700 dark:text-orange-300 hover:underline font-medium"
                    >
                      <RefreshCw size={12} /> Coba lagi
                    </button>
                  </div>
                </div>
              </div>
            ) : filterData ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                      <option value="">-- Pilih --</option>
                      {filterData.statuses?.map((o) => (
                        <option key={o.value} value={o.value}>{o.text}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Program Studi</label>
                    <select
                      value={jurusan}
                      onChange={(e) => setJurusan(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                      <option value="">-- Pilih --</option>
                      {filterData.jurusan?.map((o) => (
                        <option key={o.value} value={o.value}>{o.text}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Semester</label>
                    <select
                      value={semester}
                      onChange={(e) => setSemester(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                      <option value="">-- Pilih --</option>
                      {filterData.semesters?.map((o) => (
                        <option key={o.value} value={o.value}>{o.text}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Golongan</label>
                    <select
                      value={golongan}
                      onChange={(e) => setGolongan(e.target.value)}
                      className="w-full border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                    >
                      <option value="">-- Pilih --</option>
                      {filterData.golongan?.map((o) => (
                        <option key={o.value} value={o.value}>{o.text}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={searchMahasiswa}
                  disabled={searchLoading || !status || !jurusan || !semester || !golongan}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searchLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Search size={16} />
                  )}
                  {searchLoading ? "Mencari..." : "Cari Mahasiswa"}
                </button>
              </>
            ) : null}

            {/* Search Error */}
            {searchError && (
              <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400 shrink-0" />
                  <p className="text-xs text-orange-700 dark:text-orange-300">{searchError}</p>
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Hasil: {searchResults.length} mahasiswa
                    {addableResults.length < searchResults.length && (
                      <span className="text-muted-foreground">
                        {" "}({searchResults.length - addableResults.length} sudah ada)
                      </span>
                    )}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={toggleSelectAll}
                      className="text-xs text-primary hover:underline"
                    >
                      {selectedNims.size === addableResults.length && addableResults.length > 0
                        ? "Batal Semua"
                        : "Pilih Semua"}
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {searchResults.map((s) => {
                    const inMaster = studentMaster.some((m) => m.nim === s.nim);
                    return (
                      <label
                        key={s.nim}
                        className={`flex items-center gap-3 px-3 py-2 text-sm border-b last:border-b-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                          inMaster ? "opacity-50 cursor-not-allowed bg-muted/20" : ""
                        }`}
                      >
                        {inMaster ? (
                          <CheckSquare size={16} className="text-green-500 shrink-0" />
                        ) : (
                          <input
                            type="checkbox"
                            checked={selectedNims.has(s.nim)}
                            onChange={() => toggleSelect(s.nim)}
                            className="shrink-0"
                          />
                        )}
                        <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">
                          {s.nim}
                        </span>
                        <span className="flex-1 truncate">{s.nama}</span>
                        {inMaster && (
                          <span className="text-xs text-green-600 dark:text-green-400">✓ Sudah ada</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={addSelectedToMaster}
                    disabled={selectedNims.size === 0}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus size={14} />
                    Tambah Terpilih ({selectedNims.size})
                  </button>
                  <button
                    onClick={addAllToMaster}
                    disabled={addableResults.length === 0}
                    className="flex items-center gap-2 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Users size={14} />
                    Tambah Semua ({addableResults.length})
                  </button>
                </div>
              </div>
            )}

            {/* Manual Add Fallback */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                Tambah Manual
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualNim}
                  onChange={(e) => setManualNim(e.target.value)}
                  placeholder="NIM"
                  className="w-28 border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                />
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Nama Mahasiswa"
                  className="flex-1 border rounded-md px-2 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualAdd();
                  }}
                />
                <button
                  onClick={handleManualAdd}
                  disabled={!manualNim.trim() || !manualName.trim()}
                  className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* === Right: Master Data Table === */}
        <div className="bg-card rounded-xl border shadow-sm flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                <Users size={16} className="text-primary" />
                Data Tersimpan
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {studentMaster.length} mahasiswa
              </p>
            </div>
            <div className="flex items-center gap-3">
              {weeks && weeks.length > 0 && (
                <button
                  onClick={syncFromWeekly}
                  className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
                  title="Import semua mahasiswa yang ada di form absensi mingguan ke master data"
                >
                  <RefreshCw size={12} /> Ambil dari Mingguan
                </button>
              )}
              {studentMaster.length > 0 && (
                <button
                  onClick={clearAllMaster}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1 font-medium"
                >
                  <Trash2 size={12} /> Hapus Semua
                </button>
              )}
            </div>
          </div>

          <div className="p-3 border-b">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={masterSearch}
                onChange={(e) => setMasterSearch(e.target.value)}
                placeholder="Cari NIM atau Nama..."
                className="w-full border rounded-md pl-8 pr-3 py-1.5 text-sm bg-background focus:ring-2 focus:ring-ring focus:outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[500px]">
            {filteredMaster.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50">
                  <tr className="text-left text-muted-foreground font-medium border-b">
                    <th className="px-4 py-2 w-8">No</th>
                    <th className="px-3 py-2 w-28">NIM</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">Program Studi</th>
                    <th className="px-2 py-2 text-center w-16">Smt</th>
                    <th className="px-2 py-2 text-center w-16">Gol</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaster.map((m, idx) => (
                    <tr
                      key={m.nim}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-1.5 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-mono text-xs">{m.nim}</td>
                      <td className="px-3 py-1.5 font-medium">{m.name}</td>
                      <td className="px-3 py-1.5 text-xs text-muted-foreground max-w-[150px] truncate" title={m.prodi}>
                        {m.prodi || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                        {m.semester || "-"}
                      </td>
                      <td className="px-2 py-1.5 text-center text-xs text-muted-foreground">
                        {m.golongan || "-"}
                      </td>
                      <td className="px-2 py-1.5">
                        <button
                          onClick={() => removeFromMaster(m.nim)}
                          className="text-muted-foreground hover:text-red-600 p-1 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <GraduationCap size={32} className="mb-2 opacity-40" />
                <p className="text-sm">
                  {masterSearch
                    ? "Tidak ada hasil pencarian"
                    : "Belum ada data mahasiswa"}
                </p>
                <p className="text-xs mt-1">
                  {masterSearch
                    ? "Coba kata kunci lain"
                    : "Ambil dari SIM Polije atau tambah manual"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentMasterPage;
