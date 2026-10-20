"use client";

/* Hallmark · genre: modern-minimal · macrostructure: Workbench
 * design-system: design.md · Superadmin BAP & Lab Monitor
 */

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  Calendar,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Eye,
  FileCheck,
  FileText,
  User,
  Award,
  Users,
  Loader2,
  ChevronRight,
  Filter,
  RefreshCw,
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
import { useDialog } from "@/context/DialogContext";

interface TechnicianOverview {
  id: string;
  name: string;
  email: string;
  role: string;
  banned?: boolean | null;
  activeWeek: number;
  academicYear: string;
  academicSemester: string;
  hasSignature: boolean;
  totalTemplates: number;
  totalWeeklyEntries: number;
  totalDosen: number;
  totalStudents: number;
  activeWeekFilled: number;
  completionRate: number;
  weeksFilled: Record<number, number>;
}

interface DetailedTechnicianData {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    banned?: boolean | null;
  };
  preferences: {
    activeWeek: number;
    academicYear: string;
    academicSemester: string;
    teknisiSignature?: string | null;
  };
  templates: Array<{
    id: string;
    no: number;
    mataKuliah: string;
    hari: string;
    tempat: string;
    jam: string;
    prodi: string;
    semester: string;
    golongan: string;
    defaultPengajar: string;
    defaultTeknisi: string;
  }>;
  weeklyEntries: Array<{
    id: string;
    weekNumber: number;
    scheduleId: string;
    pengajar: string;
    materi: string;
    tanggal: string;
    teknisi: string;
    updatedAt: string;
  }>;
  dosenList: Array<{
    id: string;
    name: string;
    hasSignature: boolean;
  }>;
  studentCount: number;
  weekStats: Record<number, { filled: number; total: number }>;
}

export default function AdminMonitoringPage() {
  const { showAlert } = useDialog();

  const [technicians, setTechnicians] = useState<TechnicianOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Inspector mode state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<DetailedTechnicianData | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [detailSubTab, setDetailSubTab] = useState<"bap" | "templates" | "dosen">("bap");

  // Load Overview Data
  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/monitoring");
      if (!res.ok) throw new Error("Gagal memuat rekap monitoring.");
      const data = await res.json();
      setTechnicians(data.technicians || []);
    } catch (err: any) {
      console.error(err);
      showAlert("Error", err.message || "Terjadi kesalahan saat memuat monitoring.");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  // Load Detailed Data when user selects a technician
  const fetchDetail = useCallback(async (userId: string) => {
    try {
      setDetailLoading(true);
      setSelectedUserId(userId);
      const res = await fetch(`/api/admin/monitoring?userId=${userId}`);
      if (!res.ok) throw new Error("Gagal memuat detail data teknisi.");
      const data: DetailedTechnicianData = await res.json();
      setDetailData(data);
      setSelectedWeek(data.preferences?.activeWeek || 1);
    } catch (err: any) {
      console.error(err);
      showAlert("Error", err.message || "Gagal memuat data detail.");
      setSelectedUserId(null);
    } finally {
      setDetailLoading(false);
    }
  }, [showAlert]);

  // Filtered Technicians
  const filteredTechs = useMemo(() => {
    return technicians.filter(
      (t) =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [technicians, searchQuery]);

  // Global Aggregate Metrics
  const globalStats = useMemo(() => {
    const totalTech = technicians.length;
    const totalTemplates = technicians.reduce((acc, t) => acc + (t.totalTemplates || 0), 0);
    const avgCompletion =
      totalTech > 0
        ? Math.round(
            technicians.reduce((acc, t) => acc + (t.completionRate || 0), 0) / totalTech
          )
        : 0;
    const withSignature = technicians.filter((t) => t.hasSignature).length;

    return { totalTech, totalTemplates, avgCompletion, withSignature };
  }, [technicians]);

  // Entries for the selected week in detail mode
  const currentWeekEntries = useMemo(() => {
    if (!detailData) return [];
    const entriesMap = new Map<string, any>();
    for (const e of detailData.weeklyEntries) {
      if (e.weekNumber === selectedWeek) {
        entriesMap.set(e.scheduleId, e);
      }
    }

    return detailData.templates.map((tpl) => {
      const entry = entriesMap.get(tpl.id);
      return {
        template: tpl,
        entry: entry || null,
        isFilled: Boolean(entry && entry.materi && entry.materi.trim() !== ""),
      };
    });
  }, [detailData, selectedWeek]);

  return (
    <PageShell>
      {/* ------------------------------------------------------------- */}
      {/* 1. DETAIL INSPECTOR VIEW                                      */}
      {/* ------------------------------------------------------------- */}
      {selectedUserId && detailData ? (
        <>
          <PageHeader
            title={`Data Lab: ${detailData.user.name}`}
            meta={`${detailData.preferences.academicYear} · Semester ${detailData.preferences.academicSemester} · ${detailData.templates.length} Kelas Terjadwal`}
            actions={
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedUserId(null);
                    setDetailData(null);
                  }}
                  className="h-9 gap-1.5 rounded-control"
                >
                  <ArrowLeft className="size-4" />
                  <span>Kembali ke Semua Teknisi</span>
                </Button>
              </div>
            }
          />

          <PageSections>
            {/* Technician Profile Snapshot */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatTile
                label="Minggu Aktif Teknisi"
                value={`Minggu ${detailData.preferences.activeWeek}`}
                meta="Fokus pengisian saat ini"
                icon={<Clock className="size-4" />}
              />
              <StatTile
                label="Jadwal Kelas"
                value={detailData.templates.length}
                meta="Jadwal praktikum"
                icon={<Calendar className="size-4" />}
              />
              <StatTile
                label="Master Dosen"
                value={detailData.dosenList.length}
                meta="Dosen pengampu terdaftar"
                icon={<Award className="size-4" />}
              />
              <StatTile
                label="Tanda Tangan Teknisi"
                value={detailData.preferences.teknisiSignature ? "Tersedia" : "Belum Ada"}
                meta={detailData.preferences.teknisiSignature ? "Siap cetak dokumen" : "Perlu diunggah"}
                icon={<FileCheck className="size-4" />}
              />
            </div>

            {/* Inspector Navigation Tabs */}
            <div className="flex border-b border-rule">
              <button
                type="button"
                onClick={() => setDetailSubTab("bap")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  detailSubTab === "bap"
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileText className="size-4" />
                <span>BAP Perkuliahan (Minggu 1–16)</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailSubTab("templates")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  detailSubTab === "templates"
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="size-4" />
                <span>Jadwal Template ({detailData.templates.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDetailSubTab("dosen")}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
                  detailSubTab === "dosen"
                    ? "border-brand text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Award className="size-4" />
                <span>Daftar Dosen ({detailData.dosenList.length})</span>
              </button>
            </div>

            {/* SUBTAB 1: BAP MINGGUAN */}
            {detailSubTab === "bap" && (
              <Panel>
                <PanelHeader
                  title="Pemeriksaan Berita Acara Perkuliahan (BAP)"
                  meta="Pilih minggu perkuliahan untuk memeriksa materi, pengajar, dan tanggal pelaksanaan"
                  action={
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => {
                        const stat = detailData.weekStats[w] || { filled: 0, total: 0 };
                        const isSelected = selectedWeek === w;
                        const isComplete = stat.total > 0 && stat.filled === stat.total;
                        const hasPartial = stat.filled > 0 && stat.filled < stat.total;

                        return (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setSelectedWeek(w)}
                            className={`flex flex-col items-center justify-center rounded-control px-2.5 py-1 text-xs font-semibold transition-all ${
                              isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : isComplete
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                                : hasPartial
                                ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40"
                                : "bg-panel border border-rule text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <span>M{w}</span>
                            <span className="text-[9px] font-normal opacity-85">
                              {stat.filled}/{stat.total}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  }
                />

                <PanelBody className="p-0">
                  {currentWeekEntries.length === 0 ? (
                    <div className="py-12">
                      <EmptyState
                        variant="bare"
                        size="compact"
                        icon={<Calendar className="size-6" />}
                        title="Belum ada jadwal template"
                        description="Teknisi ini belum mengatur jadwal template mata kuliah di lab mereka."
                      />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                          <tr>
                            <th className="px-5 py-3">Mata Kuliah & Kelas</th>
                            <th className="px-4 py-3">Waktu & Tempat</th>
                            <th className="px-4 py-3">Materi Minggu ke-{selectedWeek}</th>
                            <th className="px-4 py-3">Pengajar & Teknisi</th>
                            <th className="px-4 py-3">Tanggal</th>
                            <th className="px-5 py-3 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-rule font-normal">
                          {currentWeekEntries.map(({ template, entry, isFilled }) => (
                            <tr
                              key={template.id}
                              className="transition-colors hover:bg-panel-2/40"
                            >
                              <td className="px-5 py-3.5">
                                <span className="block font-semibold text-foreground text-sm">
                                  {template.mataKuliah || "(Tanpa Nama MK)"}
                                </span>
                                <span className="block text-xs text-muted-foreground">
                                  {template.prodi} · Semester {template.semester} · Gol {template.golongan}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-muted-foreground">
                                <div className="font-medium text-foreground">{template.tempat}</div>
                                <div className="font-mono text-[11px]">
                                  {template.hari}, {template.jam}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 max-w-xs">
                                {isFilled ? (
                                  <span className="font-medium text-foreground whitespace-pre-wrap line-clamp-2">
                                    {entry?.materi}
                                  </span>
                                ) : (
                                  <span className="italic text-muted-foreground">
                                    Belum diisi materi
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3.5 text-muted-foreground">
                                <div className="font-medium text-foreground">
                                  {entry?.pengajar || template.defaultPengajar || "-"}
                                </div>
                                <div className="text-[11px]">
                                  Lab: {entry?.teknisi || template.defaultTeknisi || "-"}
                                </div>
                              </td>

                              <td className="px-4 py-3.5 font-mono text-[11px] text-muted-foreground">
                                {entry?.tanggal || "-"}
                              </td>

                              <td className="px-5 py-3.5 text-right">
                                {isFilled ? (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                    <CheckCircle2 className="size-3 text-emerald-600" />
                                    Lengkap
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                    <AlertTriangle className="size-3 text-amber-600" />
                                    Belum Diisi
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </PanelBody>
              </Panel>
            )}

            {/* SUBTAB 2: JADWAL TEMPLATE */}
            {detailSubTab === "templates" && (
              <Panel>
                <PanelHeader
                  title="Master Jadwal Praktikum Lab"
                  meta="Daftar seluruh jadwal yang berulang selama 16 minggu perkuliahan"
                />
                <PanelBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                        <tr>
                          <th className="px-5 py-3">No</th>
                          <th className="px-4 py-3">Mata Kuliah</th>
                          <th className="px-4 py-3">Hari & Jam</th>
                          <th className="px-4 py-3">Ruang Lab</th>
                          <th className="px-4 py-3">Prodi / Smt / Gol</th>
                          <th className="px-5 py-3">Dosen Pengajar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule font-normal">
                        {detailData.templates.map((t) => (
                          <tr key={t.id} className="transition-colors hover:bg-panel-2/40">
                            <td className="px-5 py-3 font-mono">{t.no}</td>
                            <td className="px-4 py-3 font-semibold text-foreground text-sm">
                              {t.mataKuliah}
                            </td>
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {t.hari}, {t.jam}
                            </td>
                            <td className="px-4 py-3 text-foreground font-medium">{t.tempat}</td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">
                              {t.prodi} · Smt {t.semester} · {t.golongan}
                            </td>
                            <td className="px-5 py-3 text-muted-foreground">
                              {t.defaultPengajar || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PanelBody>
              </Panel>
            )}

            {/* SUBTAB 3: MASTER DOSEN */}
            {detailSubTab === "dosen" && (
              <Panel>
                <PanelHeader
                  title="Daftar Dosen di Laboratorium Ini"
                  meta="Daftar nama pengajar dan status tanda tangan digital yang tersimpan"
                />
                <PanelBody className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                        <tr>
                          <th className="px-5 py-3">Nama Dosen</th>
                          <th className="px-5 py-3 text-right">Status Tanda Tangan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule font-normal">
                        {detailData.dosenList.map((d) => (
                          <tr key={d.id} className="transition-colors hover:bg-panel-2/40">
                            <td className="px-5 py-3.5 font-medium text-foreground text-sm">
                              {d.name}
                            </td>
                            <td className="px-5 py-3.5 text-right">
                              {d.hasSignature ? (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                                  <CheckCircle2 className="size-3 text-emerald-600" />
                                  Tersimpan
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                  Belum Ada
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </PanelBody>
              </Panel>
            )}
          </PageSections>
        </>
      ) : (
        /* ------------------------------------------------------------- */
        /* 2. OVERVIEW MONITORING VIEW (ALL TECHNICIANS)                 */
        /* ------------------------------------------------------------- */
        <>
          <PageHeader
            title="Pantau BAP & Lab"
            meta="Pengawasan real-time kelengkapan data praktikum dan Berita Acara Perkuliahan seluruh teknisi"
            actions={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchOverview}
                disabled={loading}
                className="h-9 gap-1.5 rounded-control"
              >
                <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>Segarkan Data</span>
              </Button>
            }
          />

          <PageSections>
            {/* Global Metrics Row */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
              <StatTile
                label="Total Akun Pengelola"
                value={globalStats.totalTech}
                meta="Teknisi & admin lab"
                icon={<Users className="size-4" />}
              />
              <StatTile
                label="Total Kelas Lab"
                value={globalStats.totalTemplates}
                meta="Terjadwal di semua lab"
                icon={<Layers className="size-4" />}
              />
              <StatTile
                label="Rata-rata Kepatuhan"
                value={`${globalStats.avgCompletion}%`}
                meta="BAP minggu berjalan terisi"
                icon={<Activity className="size-4" />}
              />
              <StatTile
                label="Tanda Tangan Teknisi"
                value={`${globalStats.withSignature} / ${globalStats.totalTech}`}
                meta="Akun memiliki tanda tangan"
                icon={<FileCheck className="size-4" />}
              />
            </div>

            {/* Compliance Matrix Panel */}
            <Panel>
              <PanelHeader
                title="Matriks Progres & Kepatuhan Pengisian BAP"
                meta="Pilih salah satu teknisi untuk memeriksa rincian kelas, materi perkuliahan, dan presensi mahasiswa"
                action={
                  <div className="relative min-w-[200px] sm:min-w-[240px]">
                    <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Cari nama teknisi..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-8.5 pl-8 text-xs"
                    />
                  </div>
                }
              />

              <PanelBody className="p-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="size-7 animate-spin text-primary" />
                    <p className="mt-3 text-xs font-medium">Memuat matriks BAP...</p>
                  </div>
                ) : filteredTechs.length === 0 ? (
                  <div className="py-12">
                    <EmptyState
                      variant="bare"
                      size="compact"
                      icon={<Activity className="size-6" />}
                      title="Tidak ada data teknisi"
                      description="Belum ada data teknisi atau kata kunci pencarian tidak ditemukan."
                    />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-rule bg-panel-2/60 text-muted-foreground uppercase tracking-wider text-[11px] font-semibold">
                        <tr>
                          <th className="px-5 py-3">Teknisi / Laboratorium</th>
                          <th className="px-4 py-3">Tahun & Semester</th>
                          <th className="px-4 py-3">Total Kelas</th>
                          <th className="px-4 py-3">Progres Minggu Aktif</th>
                          <th className="px-4 py-3">Matriks 16 Minggu</th>
                          <th className="px-5 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule font-normal">
                        {filteredTechs.map((t) => {
                          const initial = t.name.charAt(0).toUpperCase();

                          return (
                            <tr
                              key={t.id}
                              className="transition-colors hover:bg-panel-2/40 cursor-pointer"
                              onClick={() => fetchDetail(t.id)}
                            >
                              {/* Nama & Email */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-3">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-tile text-tile-ink font-semibold border border-rule text-xs">
                                    {initial}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="truncate font-semibold text-foreground text-sm">
                                        {t.name}
                                      </span>
                                      {t.role === "superadmin" && (
                                        <span className="rounded bg-brand-soft px-1.5 py-0.2 text-[10px] font-semibold text-brand">
                                          Superadmin
                                        </span>
                                      )}
                                    </div>
                                    <span className="block truncate text-xs text-muted-foreground font-mono">
                                      {t.email}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Academic Year */}
                              <td className="px-4 py-3.5 text-muted-foreground">
                                <span className="font-medium text-foreground">{t.academicYear}</span>
                                <span className="block text-[11px] font-mono text-muted-foreground">
                                  Semester {t.academicSemester}
                                </span>
                              </td>

                              {/* Total Classes */}
                              <td className="px-4 py-3.5 font-mono text-foreground font-medium">
                                {t.totalTemplates} Kelas
                              </td>

                              {/* Active week completion */}
                              <td className="px-4 py-3.5 min-w-[160px]">
                                <div className="flex items-center justify-between text-[11px] mb-1">
                                  <span className="font-medium text-foreground">
                                    Minggu {t.activeWeek}
                                  </span>
                                  <span className="font-mono font-semibold text-foreground">
                                    {t.activeWeekFilled} / {t.totalTemplates} ({t.completionRate}%)
                                  </span>
                                </div>
                                <div className="h-1.5 w-full rounded-full bg-rule overflow-hidden">
                                  <div
                                    className={`h-full transition-all duration-500 ${
                                      t.completionRate >= 100
                                        ? "bg-emerald-500"
                                        : t.completionRate >= 50
                                        ? "bg-primary"
                                        : "bg-amber-500"
                                    }`}
                                    style={{ width: `${t.completionRate}%` }}
                                  />
                                </div>
                              </td>

                              {/* Mini 16-Week Heatmap */}
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-0.5">
                                  {Array.from({ length: 16 }, (_, i) => i + 1).map((w) => {
                                    const filled = t.weeksFilled[w] || 0;
                                    const isComplete = t.totalTemplates > 0 && filled >= t.totalTemplates;
                                    const hasSome = filled > 0;

                                    return (
                                      <div
                                        key={w}
                                        title={`Minggu ${w}: ${filled}/${t.totalTemplates} terisi`}
                                        className={`size-3 rounded-xs ${
                                          isComplete
                                            ? "bg-emerald-500 dark:bg-emerald-400"
                                            : hasSome
                                            ? "bg-amber-400 dark:bg-amber-500"
                                            : "bg-rule"
                                        }`}
                                      />
                                    );
                                  })}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="px-5 py-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    fetchDetail(t.id);
                                  }}
                                  className="h-8 gap-1 rounded-control text-xs hover:bg-brand-soft hover:text-brand"
                                >
                                  <span>Periksa Data</span>
                                  <ChevronRight className="size-3.5" />
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
        </>
      )}
    </PageShell>
  );
}
