import React, { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Users, Plus, Trash2, Eye, Calendar, CalendarRange, Search, X, Filter } from 'lucide-react';
import type { ScheduleEntry, WeekData, WeeklyEntry, Student, MasterStudent, MasterDosen } from '@/types';
import { SearchableSelect } from '@/components/SearchableSelect';
import { compareSchedule, groupSchedule, scheduleClassLabel, scheduleGroupKey } from '@/utils/scheduleOrder';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageShell, PageHeader, EmptyState } from '@/components/shell';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from '@/components/ui/sheet';

interface WeeklyEditorPageProps {
    template: ScheduleEntry[];
    weeks: WeekData[];
    onWeeksChange: (weeks: WeekData[]) => void;
    activeWeek: number;
    dosenList: MasterDosen[];
    studentMaster: MasterStudent[];
    onStudentMasterChange: (master: MasterStudent[]) => void;
}

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const REMARKS_OPTIONS = ['ALPHA', 'IZIN', 'SAKIT', 'MBKM'];

/** Map day name to offset from Monday (0=Senin, 1=Selasa, ..., 6=Minggu) */
const DAY_OFFSET: Record<string, number> = {
    Senin: 0, Selasa: 1, Rabu: 2, Kamis: 3, Jumat: 4, Sabtu: 5, Minggu: 6,
};

const MONTH_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Format a Date as "02 Maret 2026" */
const formatDate = (d: Date): string => {
    const dd = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()];
    const yyyy = d.getFullYear();
    return `${dd} ${month} ${yyyy}`;
};

const WeeklyEditorPage: React.FC<WeeklyEditorPageProps> = ({ template, weeks, onWeeksChange, activeWeek: defaultWeek, dosenList, studentMaster, onStudentMasterChange }) => {
    const { showAlert, showConfirm } = useDialog();
    const [selectedWeek, setSelectedWeek] = useState(defaultWeek);
    const [showCopyMenu, setShowCopyMenu] = useState(false);
    const [justCopied, setJustCopied] = useState(false);
    const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
    const [showBatchAdd, setShowBatchAdd] = useState(false);
    const [detailEntry, setDetailEntry] = useState<{ template: ScheduleEntry; weekly: WeeklyEntry } | null>(null);
    const [mondayDate, setMondayDate] = useState('');
    const [addFromMasterTarget, setAddFromMasterTarget] = useState<string | null>(null);
    const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
    const [isDayFilterSheetOpen, setIsDayFilterSheetOpen] = useState(false);

    useEffect(() => {
        setSelectedWeek(defaultWeek);
    }, [defaultWeek]);

    const weekData = weeks.find(w => w.weekNumber === selectedWeek);

    if (template.length === 0) {
        return (
            <PageShell>
                <PageHeader title="Data Mingguan" meta="Belum ada jadwal untuk diisi" />
                <EmptyState
                    icon={<CalendarRange />}
                    title="Belum ada jadwal template"
                    description="Buat jadwal template terlebih dahulu lewat menu “Jadwal Template”."
                />
            </PageShell>
        );
    }

    // Group entries by Day, then by course + class, so each class's slots
    // (e.g. 07.00-09.00 and 09.00-11.00) are read together.
    const entriesByDay = DAYS.reduce((acc, day) => {
        const dayEntries = groupSchedule(template.filter(t => t.hari === day));
        if (dayEntries.length > 0) {
            acc[day] = dayEntries;
        }
        return acc;
    }, {} as Record<string, ScheduleEntry[]>);

    // Catch-all for entries with undefined/non-standard days
    const otherEntries = groupSchedule(template.filter(t => !DAYS.includes(t.hari)));
    if (otherEntries.length > 0) {
        entriesByDay['Lainnya'] = otherEntries;
    }

    const updateEntry = (scheduleId: string, field: 'pengajar' | 'materi' | 'tanggal' | 'teknisi', value: string) => {
        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e =>
                    e.scheduleId === scheduleId ? { ...e, [field]: value } : e
                ),
            };
        });
        onWeeksChange(updated);
    };

    const handleAddStudentsFromMaster = (scheduleId: string, selectedMasterStudents: MasterStudent[]) => {
        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    if (e.scheduleId !== scheduleId) return e;
                    const existingNims = (e.students || []).map(s => s.nim);
                    const studentsToAdd = selectedMasterStudents
                        .filter(m => !existingNims.includes(m.nim))
                        .map((m, idx) => ({
                            id: Math.floor(Math.random() * 1000000000) + idx,
                            name: m.name,
                            nim: m.nim,
                            remarks: 'ALPHA',
                        }));
                    return { ...e, students: [...(e.students || []), ...studentsToAdd] };
                }),
            };
        });
        onWeeksChange(updated);
    };

    const handleUpdateStudent = (scheduleId: string, studentId: number, field: keyof Student, value: string) => {
        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    if (e.scheduleId !== scheduleId) return e;
                    return {
                        ...e,
                        students: e.students.map(s => {
                            if (s.id !== studentId) return s;
                            return { ...s, [field]: value };
                        }),
                    };
                }),
            };
        });
        onWeeksChange(updated);
    };

    const handleRemoveStudent = async (scheduleId: string, studentId: number) => {
        const isConfirmed = await showConfirm('Hapus Mahasiswa', 'Apakah Anda yakin ingin menghapus mahasiswa ini dari daftar hadir?');
        if (!isConfirmed) return;
        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    if (e.scheduleId !== scheduleId) return e;
                    return {
                        ...e,
                        students: e.students.filter(s => s.id !== studentId),
                    };
                }),
            };
        });
        onWeeksChange(updated);
    };

    const copyStudentList = async (targetScheduleId: string, sourceScheduleId: string) => {
        if (!sourceScheduleId) return;
        const sourceEntry = weekData?.entries.find(e => e.scheduleId === sourceScheduleId);
        if (!sourceEntry || !sourceEntry.students?.length) {
            showAlert('Salin Gagal', 'Jadwal sumber tidak memiliki data mahasiswa.');
            return;
        }

        const confirmCopy = await showConfirm('Salin Daftar Mahasiswa', 'Salin daftar mahasiswa? Data mahasiswa yang ada di jadwal ini akan ditimpa.');
        if (!confirmCopy) return;

        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    if (e.scheduleId !== targetScheduleId) return e;
                    // Deep copy students to avoid reference issues while preserving remarks
                    const newStudents = sourceEntry.students.map((s, idx) => ({
                        ...s,
                        id: Math.floor(Math.random() * 1000000000) + idx, // Ensure unique IDs
                        remarks: s.remarks || 'ALPHA'
                    }));
                    return { ...e, students: newStudents };
                }),
            };
        });
        onWeeksChange(updated);
    };

    const copyFromWeek = (sourceWeek: number) => {
        const source = weeks.find(w => w.weekNumber === sourceWeek);
        if (!source) return;

        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map((e, i) => {
                    const sourceEntry = source.entries[i];
                    if (!sourceEntry) return e;
                    return {
                        ...e,
                        pengajar: sourceEntry.pengajar,
                        materi: sourceEntry.materi || e.materi,
                        teknisi: sourceEntry.teknisi,
                        students: sourceEntry.students.map((s, idx) => ({ ...s, id: Math.floor(Math.random() * 1000000000) + idx })),
                    };
                }),
            };
        });
        onWeeksChange(updated);
        setShowCopyMenu(false);
        setJustCopied(true);
        setTimeout(() => setJustCopied(false), 1500);
    };

    const getFilledCount = (wk: WeekData) => {
        return wk.entries.filter(e => e.materi.trim() !== '').length;
    };

    const toggleExpand = (id: string) => {
        setExpandedEntry(expandedEntry === id ? null : id);
    };

    /** Auto-fill tanggal for all entries in the selected week based on chosen Monday date */
    const autoFillDates = async () => {
        if (!mondayDate || !weekData) return;
        const monday = new Date(mondayDate + 'T00:00:00');

        // Check if any tanggal already filled
        const hasDates = weekData.entries.some(e => e.tanggal.trim() !== '');
        if (hasDates) {
            const isConfirmed = await showConfirm('Timpa Tanggal', 'Tanggal sudah ada di beberapa jadwal minggu ini. Timpa semua tanggal?');
            if (!isConfirmed) return;
        }

        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    const tpl = template.find(t => t.id === e.scheduleId);
                    if (!tpl) return e;
                    const offset = DAY_OFFSET[tpl.hari];
                    if (offset === undefined) return e; // unknown day
                    const d = new Date(monday);
                    d.setDate(d.getDate() + offset);
                    return { ...e, tanggal: formatDate(d) };
                }),
            };
        });
        onWeeksChange(updated);
    };

    const handleBatchAddStudents = (targetIds: string[], newStudents: Student[]) => {
        const updated = weeks.map(w => {
            if (w.weekNumber !== selectedWeek) return w;
            return {
                ...w,
                entries: w.entries.map(e => {
                    if (!targetIds.includes(e.scheduleId)) return e;
                    // Append new students with unique IDs
                    const studentsToAdd = newStudents.map((s, i) => ({
                        ...s,
                        id: Math.floor(Math.random() * 1000000000) + i // Ensure uniqueness
                    }));
                    return { ...e, students: [...(e.students || []), ...studentsToAdd] };
                })
            };
        });
        onWeeksChange(updated);
        setShowBatchAdd(false);
    };

    return (
        <PageShell>
            <PageHeader
                title="Data Mingguan"
                meta={`Minggu ${selectedWeek} — pengajar, materi, dan kehadiran`}
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="default" onClick={() => setShowBatchAdd(true)}>
                            <Plus /> Tambah mahasiswa
                        </Button>

                        {/* Copy from week */}
                        <div className="relative">
                            <Button
                                variant="default"
                                onClick={() => setShowCopyMenu(!showCopyMenu)}
                            >
                                {justCopied ? <Check /> : <Copy />}
                                {justCopied ? 'Tersalin' : 'Salin minggu'}
                                <ChevronDown />
                            </Button>
                            {showCopyMenu && (
                                <div className="absolute right-0 top-full mt-1 bg-popover border shadow-lg rounded-lg p-2 z-10 grid grid-cols-4 gap-1 w-64">
                                    {weeks.filter(w => w.weekNumber !== selectedWeek).map(w => (
                                        <button
                                            key={w.weekNumber}
                                            onClick={() => copyFromWeek(w.weekNumber)}
                                            className="text-sm px-3 py-2 rounded hover:bg-accent text-foreground font-medium"
                                        >
                                            Mg {w.weekNumber}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                }
            />

            {/* Week Tabs */}
            <div className="flex flex-wrap gap-2 mb-6">
                {weeks.map(w => {
                    const filled = getFilledCount(w);
                    const total = w.entries.length;
                    const isActive = w.weekNumber === selectedWeek;
                    const isComplete = filled === total && total > 0;

                    return (
                        <button
                            key={w.weekNumber}
                            onClick={() => { setSelectedWeek(w.weekNumber); setShowCopyMenu(false); setExpandedEntry(null); }}
                            className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors border-2
                                ${isActive
                                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                    : isComplete
                                        ? 'bg-green-50 text-green-700 border-green-300 hover:border-green-400 dark:bg-green-950 dark:text-green-300 dark:border-green-700'
                                        : filled > 0
                                            ? 'bg-amber-50 text-amber-700 border-amber-300 hover:border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700'
                                            : 'bg-card text-muted-foreground border-border hover:border-primary/30'
                                }`}
                        >
                            Minggu {w.weekNumber}
                        </button>
                    );
                })}
            </div>

            {/* Auto-fill Tanggal & Day Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-panel rounded-panel border border-rule px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Calendar size={16} className="text-primary" />
                        <span>Isi Tanggal Otomatis</span>
                    </div>
                    <input
                        type="date"
                        value={mondayDate}
                        onChange={(e) => setMondayDate(e.target.value)}
                        className="border border-input rounded-md px-3 py-1 text-xs bg-background"
                    />
                    <Button
                        size="sm"
                        onClick={autoFillDates}
                        disabled={!mondayDate}
                        className="h-7 text-xs font-semibold"
                    >
                        <Calendar size={13} className="mr-1" />
                        Terapkan
                    </Button>
                </div>

                {/* Day Filter Controls */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-rule/60">
                    {/* Mobile BottomSheet Trigger */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDayFilterSheetOpen(true)}
                        className="h-8 text-xs sm:hidden flex items-center gap-1.5 w-full justify-between border-rule bg-panel-2"
                    >
                        <span className="flex items-center gap-1.5 text-foreground font-medium">
                            <Filter className="size-3.5 text-primary" />
                            <span>Filter Hari:</span>
                            <strong className="text-primary">{selectedDayFilter === 'all' ? 'Semua Hari' : selectedDayFilter}</strong>
                        </span>
                        <ChevronDown className="size-3.5 text-muted-foreground" />
                    </Button>

                    {/* Desktop Filter Pills */}
                    <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1 shrink-0">Hari:</span>
                        <button
                            type="button"
                            onClick={() => setSelectedDayFilter('all')}
                            className={`rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                                selectedDayFilter === 'all'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-panel-2 border border-rule text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Semua
                        </button>
                        {[...DAYS, 'Lainnya'].filter(d => entriesByDay[d] && entriesByDay[d].length > 0).map(day => (
                            <button
                                key={day}
                                type="button"
                                onClick={() => setSelectedDayFilter(day)}
                                className={`rounded-control px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                                    selectedDayFilter === day
                                        ? 'bg-foreground text-background shadow-xs'
                                        : 'bg-panel-2 border border-rule text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile Day Filter Bottom Sheet */}
            <Sheet open={isDayFilterSheetOpen} onOpenChange={setIsDayFilterSheetOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4 max-h-[70vh]">
                    <SheetHeader className="pb-3 border-b border-rule">
                        <SheetTitle className="text-base font-semibold flex items-center gap-2">
                            <Filter className="size-4 text-primary" />
                            <span>Pilih Hari Perkuliahan</span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="py-4 space-y-1.5">
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedDayFilter('all');
                                setIsDayFilterSheetOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-panel border text-xs font-medium transition-colors ${
                                selectedDayFilter === 'all'
                                    ? 'bg-primary/10 border-primary text-primary font-semibold'
                                    : 'bg-panel border-rule text-foreground hover:bg-panel-2'
                            }`}
                        >
                            <span>Semua Hari (Tampilkan Seluruh Jadwal)</span>
                            {selectedDayFilter === 'all' && <Check className="size-4 text-primary" />}
                        </button>

                        {[...DAYS, 'Lainnya'].filter(d => entriesByDay[d] && entriesByDay[d].length > 0).map(day => {
                            const isSelected = selectedDayFilter === day;
                            const count = entriesByDay[day]?.length || 0;
                            return (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => {
                                        setSelectedDayFilter(day);
                                        setIsDayFilterSheetOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-panel border text-xs font-medium transition-colors ${
                                        isSelected
                                            ? 'bg-primary/10 border-primary text-primary font-semibold'
                                            : 'bg-panel border-rule text-foreground hover:bg-panel-2'
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <span>Hari {day}</span>
                                        <Badge variant="secondary" className="text-[10px] font-normal h-4.5 px-1.5 bg-panel-2 border-rule">
                                            {count} Sesi
                                        </Badge>
                                    </span>
                                    {isSelected && <Check className="size-4 text-primary" />}
                                </button>
                            );
                        })}
                    </div>
                </SheetContent>
            </Sheet>

            {/* Batch Add Modal */}
            {showBatchAdd && (
                <BatchAddStudentModal
                    isOpen={showBatchAdd}
                    onClose={() => setShowBatchAdd(false)}
                    onSave={(targetIds, selectedStudents) => {
                        handleBatchAddStudents(targetIds, selectedStudents);
                    }}
                    template={template}
                    studentMaster={studentMaster}
                />
            )}

            {/* Editor Content: Cards on Mobile, Table on Desktop */}
            {weekData && (
                <div className="space-y-4">
                    {/* ── Mobile Card Feed (md:hidden) ────────────────── */}
                    <div className="md:hidden space-y-4">
                        {[...DAYS, 'Lainnya']
                            .filter(day => selectedDayFilter === 'all' || selectedDayFilter === day)
                            .map(day => {
                            const entries = entriesByDay[day];
                            if (!entries || entries.length === 0) return null;

                            return (
                                <div key={day} className="rounded-panel border border-rule bg-panel overflow-hidden">
                                    <div className="bg-panel-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-rule flex items-center justify-between">
                                        <span>{day}</span>
                                        <span className="text-[11px] font-normal text-muted-foreground">{entries.length} Sesi</span>
                                    </div>
                                    <div className="divide-y divide-rule">
                                        {entries.map((entry) => {
                                            const we = weekData.entries.find(e => e.scheduleId === entry.id);
                                            if (!we) return null;
                                            const isExpanded = expandedEntry === entry.id;
                                            const studentCount = we.students?.length || 0;

                                            return (
                                                <div key={entry.id} className="p-4 flex flex-col gap-3 bg-panel hover:bg-panel-2/40 transition-colors">
                                                    {/* Header: No, Time, Room & Class */}
                                                    <div className="flex items-center justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-mono font-bold text-muted-foreground bg-panel-2 px-1.5 py-0.5 rounded">
                                                                #{entry.no}
                                                            </span>
                                                            <span className="text-xs font-mono font-semibold text-foreground">
                                                                {entry.jam}
                                                            </span>
                                                            {entry.tempat && (
                                                                <span className="text-xs text-muted-foreground font-medium">
                                                                    • {entry.tempat}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <Badge variant="secondary" className="text-[10px] font-normal bg-primary/10 text-primary border-transparent">
                                                            {entry.prodi} · Sem {entry.semester} ({entry.golongan})
                                                        </Badge>
                                                    </div>

                                                    {/* Subject Title */}
                                                    <div>
                                                        <h4 className="font-semibold text-foreground text-sm leading-snug">
                                                            {entry.mataKuliah}
                                                        </h4>
                                                    </div>

                                                    {/* Inline Direct Fields (Editable Directly on Mobile) */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                                        {/* Tanggal */}
                                                        <div>
                                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Tanggal</label>
                                                            <input
                                                                type="text"
                                                                value={we.tanggal}
                                                                onChange={(e) => updateEntry(entry.id, 'tanggal', e.target.value)}
                                                                className="w-full border border-rule rounded-control px-2.5 py-1.5 text-xs bg-background text-foreground"
                                                                placeholder="dd/mm/yyyy"
                                                            />
                                                        </div>

                                                        {/* Dosen Pengajar */}
                                                        <div>
                                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Dosen Pengajar</label>
                                                            {dosenList.length > 0 ? (
                                                                <SearchableSelect
                                                                    value={we.pengajar}
                                                                    onChange={(val) => updateEntry(entry.id, 'pengajar', val)}
                                                                    options={dosenList.map((d) => ({ value: d.name, label: d.name }))}
                                                                    placeholder={entry.defaultPengajar || "Pilih Dosen..."}
                                                                />
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={we.pengajar}
                                                                    onChange={(e) => updateEntry(entry.id, 'pengajar', e.target.value)}
                                                                    className="w-full border border-rule rounded-control px-2.5 py-1.5 text-xs bg-background text-foreground"
                                                                    placeholder={entry.defaultPengajar || 'Nama Dosen'}
                                                                />
                                                            )}
                                                        </div>

                                                        {/* Materi Perkuliahan */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Materi Perkuliahan</label>
                                                            <input
                                                                type="text"
                                                                value={we.materi}
                                                                onChange={(e) => updateEntry(entry.id, 'materi', e.target.value)}
                                                                className="w-full border border-rule rounded-control px-2.5 py-1.5 text-xs bg-background text-foreground"
                                                                placeholder="Tuliskan materi BAP..."
                                                            />
                                                        </div>

                                                        {/* Teknisi */}
                                                        <div className="sm:col-span-2">
                                                            <label className="text-[11px] font-medium text-muted-foreground block mb-1">Teknisi / Laboran</label>
                                                            <input
                                                                type="text"
                                                                value={we.teknisi}
                                                                onChange={(e) => updateEntry(entry.id, 'teknisi', e.target.value)}
                                                                className="w-full border border-rule rounded-control px-2.5 py-1.5 text-xs bg-background text-foreground"
                                                                placeholder={entry.defaultTeknisi || 'Nama Teknisi'}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Bottom Action: Attendance Toggle */}
                                                    <div className="flex items-center justify-between pt-2 border-t border-rule/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleExpand(entry.id)}
                                                            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                                                        >
                                                            <Users size={13} />
                                                            <span>Absensi Mahasiswa</span>
                                                            <span className="bg-primary/10 text-primary text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                                                {studentCount}
                                                            </span>
                                                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                                        </button>

                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => setDetailEntry({ template: entry, weekly: we })}
                                                            className="text-xs text-muted-foreground"
                                                        >
                                                            <Eye size={13} className="mr-1" /> Detail
                                                        </Button>
                                                    </div>

                                                    {/* Expanded Attendance Panel in Mobile Card */}
                                                    {isExpanded && (
                                                        <div className="mt-2 p-3 bg-panel-2/70 rounded-panel border border-rule space-y-3 animate-in fade-in duration-150">
                                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                                                    Daftar Tidak Hadir ({studentCount})
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setAddFromMasterTarget(entry.id)}
                                                                    className="flex items-center gap-1 text-[11px] bg-primary text-primary-foreground px-2.5 py-1 rounded-control font-medium hover:bg-primary/90"
                                                                >
                                                                    <Plus size={11} /> + Tambah Mhs
                                                                </button>
                                                            </div>

                                                            {we.students && we.students.length > 0 ? (
                                                                <div className="space-y-1.5">
                                                                    {we.students.map((student, sIdx) => (
                                                                        <div key={student.id} className="flex items-center justify-between p-2 rounded-control bg-panel border border-rule text-xs gap-2">
                                                                            <div className="min-w-0 flex-1">
                                                                                <span className="font-semibold text-foreground truncate block">{sIdx + 1}. {student.name}</span>
                                                                                <span className="font-mono text-[10px] text-muted-foreground">{student.nim}</span>
                                                                            </div>
                                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                                <select
                                                                                    className="text-[11px] border border-rule rounded-control px-2 py-0.5 bg-background font-medium text-foreground h-6.5"
                                                                                    value={student.remarks}
                                                                                    onChange={(e) => handleUpdateStudent(entry.id, student.id, 'remarks', e.target.value)}
                                                                                >
                                                                                    {REMARKS_OPTIONS.map(opt => (
                                                                                        <option key={opt} value={opt}>{opt}</option>
                                                                                    ))}
                                                                                </select>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => handleRemoveStudent(entry.id, student.id)}
                                                                                    className="text-muted-foreground hover:text-destructive p-1"
                                                                                    title="Hapus"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-[11px] text-muted-foreground text-center py-3 border border-dashed border-rule rounded-control">
                                                                    Semua mahasiswa hadir (atau belum ada data absensi).
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* ── Desktop Table View (hidden md:block) ─────────── */}
                    <div className="hidden md:block hm-scrollbar bg-panel rounded-panel border border-rule overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 text-left text-muted-foreground font-semibold border-b">
                                    <th className="px-2 py-3 w-8"></th>
                                    <th className="px-3 py-3 w-10">No</th>
                                    <th className="px-3 py-3">Mata Kuliah</th>
                                    <th className="px-3 py-3 w-16 text-center">Smt</th>
                                    <th className="px-3 py-3 w-16 text-center">Prodi</th>
                                    <th className="px-3 py-3 w-16 text-center">Gol</th>
                                    <th className="px-3 py-3">Jam</th>
                                    <th className="px-3 py-3 bg-primary/5 text-primary">Tanggal</th>
                                    <th className="px-3 py-3 bg-primary/5 text-primary">Pengajar</th>
                                    <th className="px-3 py-3 bg-primary/5 text-primary">Materi</th>
                                    <th className="px-3 py-3 bg-primary/5 text-primary">Teknisi</th>
                                    <th className="px-2 py-3 w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...DAYS, 'Lainnya']
                                    .filter(day => selectedDayFilter === 'all' || selectedDayFilter === day)
                                    .map(day => {
                                    const entries = entriesByDay[day];
                                    if (!entries || entries.length === 0) return null;

                                    return (
                                        <React.Fragment key={day}>
                                            <tr className="bg-muted/20 border-b">
                                                <td colSpan={12} className="px-4 py-2 font-bold text-foreground bg-slate-100 dark:bg-slate-900">
                                                    {day}
                                                </td>
                                            </tr>
                                            {entries.map((entry, entryIdx) => {
                                                const we = weekData.entries.find(e => e.scheduleId === entry.id);
                                                if (!we) return null;
                                                const isExpanded = expandedEntry === entry.id;
                                                const studentCount = we.students?.length || 0;
                                                const isGroupStart = entryIdx === 0 || scheduleGroupKey(entry) !== scheduleGroupKey(entries[entryIdx - 1]);

                                                return (
                                                    <React.Fragment key={entry.id}>
                                                        <tr className={`border-b hover:bg-muted/30 transition-colors${isGroupStart ? ' border-t-2 border-t-slate-300 dark:border-t-slate-700' : ''}`}>
                                                            <td className="px-2 py-2 text-center">
                                                                <button
                                                                    onClick={() => toggleExpand(entry.id)}
                                                                    className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground flex items-center justify-center w-full"
                                                                    title="Edit kehadiran mahasiswa"
                                                                >
                                                                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                                    {studentCount > 0 && <span className="text-[10px] ml-1 bg-slate-200 dark:bg-slate-800 px-1 rounded-full">{studentCount}</span>}
                                                                </button>
                                                            </td>
                                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.no}</td>
                                                            <td className="px-3 py-2 font-medium">{entry.mataKuliah}</td>
                                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.semester}</td>
                                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.prodi}</td>
                                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.golongan}</td>
                                                            <td className="px-3 py-2 text-muted-foreground">{entry.jam}</td>
                                                            <td className="px-3 py-2 bg-primary/[0.02]">
                                                                <input
                                                                    type="text"
                                                                    value={we.tanggal}
                                                                    onChange={(e) => updateEntry(entry.id, 'tanggal', e.target.value)}
                                                                    className="w-28 border border-input rounded-md px-2 py-1 text-sm bg-background"
                                                                    placeholder="dd/mm/yyyy"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 bg-primary/[0.02]">
                                                                {dosenList.length > 0 ? (
                                                                    <SearchableSelect
                                                                        value={we.pengajar}
                                                                        onChange={(val) => updateEntry(entry.id, 'pengajar', val)}
                                                                        options={dosenList.map((d) => ({ value: d.name, label: d.name }))}
                                                                    />
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        value={we.pengajar}
                                                                        onChange={(e) => updateEntry(entry.id, 'pengajar', e.target.value)}
                                                                        className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background"
                                                                        placeholder={entry.defaultPengajar || 'Pengajar'}
                                                                    />
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2 bg-primary/[0.02]">
                                                                <input
                                                                    type="text"
                                                                    value={we.materi}
                                                                    onChange={(e) => updateEntry(entry.id, 'materi', e.target.value)}
                                                                    className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background"
                                                                    placeholder="Materi minggu ini"
                                                                />
                                                            </td>
                                                            <td className="px-3 py-2 bg-primary/[0.02]">
                                                                <input
                                                                    type="text"
                                                                    value={we.teknisi}
                                                                    onChange={(e) => updateEntry(entry.id, 'teknisi', e.target.value)}
                                                                    className="w-full border border-input rounded-md px-2 py-1 text-sm bg-background"
                                                                    placeholder={entry.defaultTeknisi || 'Teknisi'}
                                                                />
                                                            </td>
                                                            <td className="px-2 py-2 text-center">
                                                                <button
                                                                    onClick={() => setDetailEntry({ template: entry, weekly: we })}
                                                                    className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                                                                    title="Lihat detail"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            </td>
                                                        </tr>

                                                        {/* Expanded: Student Attendance */}
                                                        {isExpanded && (
                                                            <tr>
                                                                <td colSpan={12} className="p-0">
                                                                    <div className="bg-muted/20 border-b px-6 py-3">
                                                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                                                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                                                <Users size={12} />
                                                                                Data Mahasiswa — {entry.mataKuliah}
                                                                                {scheduleClassLabel(entry) && (
                                                                                    <span className="font-normal text-muted-foreground">({scheduleClassLabel(entry)})</span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-2">
                                                                                <select
                                                                                    className="text-xs border rounded-md px-2 py-1 bg-background max-w-[200px]"
                                                                                    onChange={(e) => {
                                                                                        if (e.target.value) copyStudentList(entry.id, e.target.value);
                                                                                        e.target.value = '';
                                                                                    }}
                                                                                >
                                                                                    <option value="">Salin dari No...</option>
                                                                                    {weekData.entries
                                                                                        .filter(e => e.scheduleId !== entry.id && e.students?.length > 0)
                                                                                        .map(e => ({ e, t: template.find(temp => temp.id === e.scheduleId) }))
                                                                                        .filter(x => !!x.t)
                                                                                        .sort((a, b) => compareSchedule(a.t as ScheduleEntry, b.t as ScheduleEntry))
                                                                                        .map(({ e, t }) => (
                                                                                            <option key={e.scheduleId} value={e.scheduleId}>
                                                                                                No. {t?.no} - {t?.mataKuliah}{t && scheduleClassLabel(t) ? ` — ${scheduleClassLabel(t)}` : ''}
                                                                                            </option>
                                                                                        ))
                                                                                    }
                                                                                </select>
                                                                                <button
                                                                                    onClick={() => setAddFromMasterTarget(entry.id)}
                                                                                    className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-2 py-1 rounded hover:bg-primary/90 transition-colors font-medium"
                                                                                >
                                                                                    <Plus size={12} /> Tambah dari Master
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                        <div className="grid grid-cols-1 gap-2">
                                                                            {we.students && we.students.map((student, index) => (
                                                                                <div key={student.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 bg-background rounded-md border px-3 py-2 relative">
                                                                                    <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                                                                                        <span className="text-xs text-muted-foreground w-4 shrink-0">{index + 1}.</span>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <span className="text-sm font-semibold text-foreground truncate block">{student.name}</span>
                                                                                            <span className="text-xs text-muted-foreground font-mono">{student.nim}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-2 w-full sm:w-auto pl-6 sm:pl-0 font-medium">
                                                                                        <select
                                                                                            className="text-xs border rounded-md px-2 py-1 bg-background flex-1 sm:w-24"
                                                                                            value={student.remarks}
                                                                                            onChange={(e) => handleUpdateStudent(entry.id, student.id, 'remarks', e.target.value)}
                                                                                        >
                                                                                            {REMARKS_OPTIONS.map(opt => (
                                                                                                <option key={opt} value={opt}>{opt}</option>
                                                                                            ))}
                                                                                        </select>
                                                                                        <button
                                                                                            onClick={() => handleRemoveStudent(entry.id, student.id)}
                                                                                            className="text-muted-foreground hover:text-destructive p-1"
                                                                                            title="Hapus"
                                                                                        >
                                                                                            <Trash2 size={12} />
                                                                                        </button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                            {(!we.students || we.students.length === 0) && (
                                                                                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-md">
                                                                                    Belum ada data mahasiswa. Klik "Tambah" atau salin dari jadwal lain.
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detail Sheet */}
            <Sheet open={!!detailEntry} onOpenChange={(open) => { if (!open) setDetailEntry(null); }}>
                <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                    {detailEntry && (
                        <>
                            <SheetHeader>
                                <SheetTitle className="text-lg">{detailEntry.template.mataKuliah}</SheetTitle>
                                <SheetDescription>
                                    Minggu {selectedWeek} — No. {detailEntry.template.no}
                                </SheetDescription>
                            </SheetHeader>

                            <div className="px-4 pb-6 space-y-5">
                                {/* Info Template (Read-only) */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Informasi Jadwal</h4>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Hari</span>
                                            <p className="font-medium">{detailEntry.template.hari}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Jam</span>
                                            <p className="font-medium">{detailEntry.template.jam}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Semester</span>
                                            <p className="font-medium">{detailEntry.template.semester}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Golongan</span>
                                            <p className="font-medium">{detailEntry.template.golongan}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Prodi</span>
                                            <p className="font-medium">{detailEntry.template.prodi || '-'}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-xs text-muted-foreground">Tempat</span>
                                            <p className="font-medium">{detailEntry.template.tempat || '-'}</p>
                                        </div>
                                    </div>
                                </div>

                                <hr className="border-border" />

                                {/* Editable Weekly Fields */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data Minggu {selectedWeek}</h4>
                                    <div className="space-y-3">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
                                            <input
                                                type="text"
                                                value={detailEntry.weekly.tanggal}
                                                onChange={(e) => {
                                                    updateEntry(detailEntry.template.id, 'tanggal', e.target.value);
                                                    setDetailEntry(prev => prev ? { ...prev, weekly: { ...prev.weekly, tanggal: e.target.value } } : null);
                                                }}
                                                className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background"
                                                placeholder="dd/mm/yyyy"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Pengajar</label>
                                            {dosenList.length > 0 ? (
                                                <SearchableSelect
                                                    value={detailEntry.weekly.pengajar}
                                                    onChange={(val) => {
                                                        updateEntry(detailEntry.template.id, 'pengajar', val);
                                                        setDetailEntry(prev => prev ? { ...prev, weekly: { ...prev.weekly, pengajar: val } } : null);
                                                    }}
                                                    options={dosenList.map((d) => ({ value: d.name, label: d.name }))}
                                                />
                                            ) : (
                                                <input
                                                    type="text"
                                                    value={detailEntry.weekly.pengajar}
                                                    onChange={(e) => {
                                                        updateEntry(detailEntry.template.id, 'pengajar', e.target.value);
                                                        setDetailEntry(prev => prev ? { ...prev, weekly: { ...prev.weekly, pengajar: e.target.value } } : null);
                                                    }}
                                                    className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background"
                                                    placeholder={detailEntry.template.defaultPengajar || 'Pengajar'}
                                                />
                                            )}
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Materi</label>
                                            <textarea
                                                value={detailEntry.weekly.materi}
                                                onChange={(e) => {
                                                    updateEntry(detailEntry.template.id, 'materi', e.target.value);
                                                    setDetailEntry(prev => prev ? { ...prev, weekly: { ...prev.weekly, materi: e.target.value } } : null);
                                                }}
                                                className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background resize-none"
                                                placeholder="Materi minggu ini"
                                                rows={3}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-muted-foreground">Teknisi</label>
                                            <input
                                                type="text"
                                                value={detailEntry.weekly.teknisi}
                                                onChange={(e) => {
                                                    updateEntry(detailEntry.template.id, 'teknisi', e.target.value);
                                                    setDetailEntry(prev => prev ? { ...prev, weekly: { ...prev.weekly, teknisi: e.target.value } } : null);
                                                }}
                                                className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background"
                                                placeholder={detailEntry.template.defaultTeknisi || 'Teknisi'}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Student Count Info */}
                                {detailEntry.weekly.students && detailEntry.weekly.students.length > 0 && (
                                    <>
                                        <hr className="border-border" />
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                                <Users size={12} /> Mahasiswa ({detailEntry.weekly.students.length})
                                            </h4>
                                            <div className="space-y-1.5">
                                                {detailEntry.weekly.students.map((s, i) => (
                                                    <div key={s.id} className="flex items-center gap-2 text-sm bg-muted/30 rounded-md px-3 py-1.5">
                                                        <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                                                        <span className="font-medium flex-1 truncate">{s.name || '-'}</span>
                                                        <span className="text-xs text-muted-foreground">{s.nim}</span>
                                                        {s.remarks && <span className="text-xs text-amber-600 dark:text-amber-400">{s.remarks}</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>

            {/* Add Student From Master Modal */}
            <AddStudentFromMasterModal
                isOpen={addFromMasterTarget !== null}
                onClose={() => setAddFromMasterTarget(null)}
                studentMaster={studentMaster}
                alreadyAddedNims={
                    addFromMasterTarget
                        ? (weekData?.entries.find(e => e.scheduleId === addFromMasterTarget)?.students || []).map(s => s.nim)
                        : []
                }
                onAdd={(selected) => {
                    if (addFromMasterTarget) {
                        handleAddStudentsFromMaster(addFromMasterTarget, selected);
                    }
                }}
            />
        </PageShell>
    );
};

const BatchAddStudentModal = ({ isOpen, onClose, onSave, template, studentMaster }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (targetIds: string[], students: Student[]) => void;
    template: ScheduleEntry[];
    studentMaster: MasterStudent[];
}) => {
    const { showAlert } = useDialog();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

    const handleSetAllRemarks = (val: string) => {
        const newMap = { ...remarksMap };
        selectedNims.forEach(nim => {
            newMap[nim] = val;
        });
        setRemarksMap(newMap);
    };

    // Day Filtering Logic
    const availableDays = React.useMemo(() => {
        const days = Array.from(new Set(template.map(t => t.hari)));
        return days.sort((a, b) => {
            const ia = DAYS.indexOf(a);
            const ib = DAYS.indexOf(b);
            // Put unknown days at the end
            return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
        });
    }, [template]);

    const [selectedDay, setSelectedDay] = useState<string>(availableDays[0] || DAYS[0]);

    // Update selectedDay if availableDays changes (e.g. new import) and current selection is invalid
    useEffect(() => {
        if (!availableDays.includes(selectedDay) && availableDays.length > 0) {
            setSelectedDay(availableDays[0]);
        }
    }, [availableDays, selectedDay]);

    const filteredTemplate = groupSchedule(template.filter(t => t.hari === selectedDay));

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const isAllSelected = filteredTemplate.length > 0 && filteredTemplate.every(t => selectedIds.includes(t.id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            // Unselect all visible
            const visibleIds = filteredTemplate.map(t => t.id);
            setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
        } else {
            // Select all visible
            const visibleIds = filteredTemplate.map(t => t.id);
            const newIds = visibleIds.filter(id => !selectedIds.includes(id));
            setSelectedIds(prev => [...prev, ...newIds]);
        }
    };

    // Master student filtering for search
    const filteredMaster = React.useMemo(() => {
        if (!searchQuery.trim()) return studentMaster;
        const q = searchQuery.toLowerCase();
        return studentMaster.filter(m => m.name.toLowerCase().includes(q) || m.nim.includes(q));
    }, [studentMaster, searchQuery]);

    const toggleStudentSelect = (nim: string) => {
        setSelectedNims(prev => {
            const next = new Set(prev);
            if (next.has(nim)) next.delete(nim);
            else next.add(nim);
            return next;
        });
    };

    const toggleAllStudentsSelect = () => {
        if (selectedNims.size === filteredMaster.length) {
            setSelectedNims(new Set());
        } else {
            setSelectedNims(new Set(filteredMaster.map(m => m.nim)));
        }
    };

    const handleSave = () => {
        if (selectedIds.length === 0) {
            showAlert('Simpan Gagal', 'Pilih minimal satu jadwal target.');
            return;
        }
        if (selectedNims.size === 0) {
            showAlert('Simpan Gagal', 'Pilih minimal satu mahasiswa.');
            return;
        }

        const selectedStudents: Student[] = studentMaster
            .filter(m => selectedNims.has(m.nim))
            .map((m, idx) => ({
                id: Math.floor(Math.random() * 1000000000) + idx,
                name: m.name,
                nim: m.nim,
                remarks: remarksMap[m.nim] || "ALPHA"
            }));

        onSave(selectedIds, selectedStudents);
    };

    const [mobileTab, setMobileTab] = useState<"schedules" | "students">("schedules");

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-background rounded-t-2xl sm:rounded-xl border border-rule shadow-2xl w-full sm:max-w-4xl h-[92vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-rule flex justify-between items-center bg-panel-2/60">
                    <div className="min-w-0 flex-1 pr-2">
                        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate">Input Ketidakhadiran Massal</h3>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                            {selectedIds.length} jadwal & {selectedNims.size} mahasiswa dipilih
                        </p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup"><X className="size-4" /></Button>
                </div>

                {/* Mobile View Switcher Tabs (2-Step Flow) */}
                <div className="flex md:hidden border-b border-rule bg-panel-2/80 p-1">
                    <button
                        type="button"
                        onClick={() => setMobileTab("schedules")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-control transition-colors flex items-center justify-center gap-1.5 ${
                            mobileTab === "schedules"
                                ? "bg-foreground text-background shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <span>1. Pilih Jadwal</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mobileTab === "schedules" ? "bg-background text-foreground" : "bg-muted"}`}>
                            {selectedIds.length}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setMobileTab("students")}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-control transition-colors flex items-center justify-center gap-1.5 ${
                            mobileTab === "students"
                                ? "bg-foreground text-background shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <span>2. Pilih Mahasiswa</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${mobileTab === "students" ? "bg-background text-foreground" : "bg-muted"}`}>
                            {selectedNims.size}
                        </span>
                    </button>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-rule">
                    {/* Left: Schedule Selection */}
                    <div className={`w-full md:w-5/12 flex flex-col bg-panel/30 ${mobileTab === "schedules" ? "flex" : "hidden md:flex"}`}>
                        {/* Day Tabs */}
                        <div className="flex overflow-x-auto p-2 border-b border-rule bg-panel-2/30 gap-1.5 no-scrollbar shrink-0">
                            {availableDays.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-3 py-1 text-xs font-medium rounded-control whitespace-nowrap transition-colors
                                        ${selectedDay === day
                                            ? 'bg-foreground text-background shadow-xs font-semibold'
                                            : 'bg-panel border border-rule text-muted-foreground hover:text-foreground'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        <div className="p-3 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2 px-0.5">
                                <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Jadwal {selectedDay}</h4>
                                <button type="button" onClick={toggleSelectAll} className="text-xs text-primary hover:underline font-medium">
                                    {isAllSelected ? 'Batal Hari Ini' : 'Pilih Semua Hari Ini'}
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                {filteredTemplate.map(t => (
                                    <label key={t.id} className={`flex items-start gap-2.5 p-2.5 rounded-panel cursor-pointer text-xs border transition-colors
                                        ${selectedIds.includes(t.id)
                                            ? 'bg-primary/10 border-primary/40 text-foreground font-medium'
                                            : 'bg-panel border-rule hover:bg-panel-2 text-foreground'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(t.id)}
                                            onChange={() => toggleSelect(t.id)}
                                            className="mt-0.5 rounded text-primary"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-xs leading-snug">#{t.no} - {t.mataKuliah}</div>
                                            {scheduleClassLabel(t) && (
                                                <div className="text-[11px] text-primary font-medium mt-0.5">{scheduleClassLabel(t)}</div>
                                            )}
                                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                                {t.jam}{t.tempat ? ` · ${t.tempat}` : ''}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                                {filteredTemplate.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground text-xs italic">
                                        Tidak ada jadwal untuk hari {selectedDay}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Mobile Next Step Button */}
                        <div className="p-3 border-t border-rule md:hidden bg-panel-2/40">
                            <Button
                                type="button"
                                onClick={() => setMobileTab("students")}
                                disabled={selectedIds.length === 0}
                                className="w-full text-xs h-8.5 font-semibold"
                            >
                                Lanjut Pilih Mahasiswa ({selectedIds.length} Jadwal Dipilih) →
                            </Button>
                        </div>
                    </div>

                    {/* Right: Student Input */}
                    <div className={`w-full md:w-7/12 p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto ${mobileTab === "students" ? "flex" : "hidden md:flex"}`}>
                        <div className="flex flex-wrap justify-between items-center gap-2">
                            <div>
                                <h4 className="font-semibold text-xs sm:text-sm text-foreground">Daftar Mahasiswa</h4>
                                <p className="text-[11px] text-muted-foreground">Centang mahasiswa & set alasan tidak hadir.</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground whitespace-nowrap">Set Semua:</span>
                                <select
                                    className="border border-rule rounded-control px-2 py-1 text-xs bg-background font-medium text-foreground h-7"
                                    value=""
                                    onChange={e => {
                                        if (e.target.value) {
                                            handleSetAllRemarks(e.target.value);
                                            e.target.value = "";
                                        }
                                    }}
                                >
                                    <option value="">-- Alasan --</option>
                                    {REMARKS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cari NIM atau Nama..."
                                    className="w-full border border-rule rounded-control pl-9 pr-3 py-1.5 text-xs bg-background text-foreground"
                                />
                            </div>
                        </div>

                        {filteredMaster.length > 0 ? (
                            <div className="flex-1 overflow-y-auto space-y-1 max-h-[48vh] sm:max-h-[42vh] border border-rule rounded-panel p-2 bg-panel-2/30">
                                <div className="flex justify-between items-center text-[11px] text-muted-foreground pb-2 border-b border-rule mb-1.5 px-1">
                                    <span>{filteredMaster.length} mahasiswa</span>
                                    <button type="button" onClick={toggleAllStudentsSelect} className="text-primary hover:underline font-medium">
                                        {selectedNims.size === filteredMaster.length ? 'Batal Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {filteredMaster.map((m) => {
                                        const currentRemarks = remarksMap[m.nim] || "ALPHA";
                                        const isChecked = selectedNims.has(m.nim);
                                        return (
                                            <div key={m.nim} className={`flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-control transition-colors ${isChecked ? 'bg-primary/10 border border-primary/30' : 'hover:bg-panel-2 bg-panel border border-rule/50'}`}>
                                                <label className="flex items-center gap-2 flex-1 cursor-pointer truncate py-0.5">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => toggleStudentSelect(m.nim)}
                                                        className="rounded text-primary"
                                                    />
                                                    <div className="min-w-0 flex-1">
                                                        <span className="font-semibold text-foreground text-xs truncate block">{m.name}</span>
                                                        <span className="font-mono text-[10px] text-muted-foreground">{m.nim}</span>
                                                    </div>
                                                </label>
                                                <select
                                                    className="border border-rule rounded-control px-2 py-1 text-[11px] bg-background w-22 shrink-0 font-medium text-foreground h-7"
                                                    value={currentRemarks}
                                                    onChange={e => {
                                                        setRemarksMap(prev => ({ ...prev, [m.nim]: e.target.value }));
                                                        if (!selectedNims.has(m.nim)) {
                                                            toggleStudentSelect(m.nim);
                                                        }
                                                    }}
                                                >
                                                    {REMARKS_OPTIONS.map(opt => (
                                                        <option key={opt} value={opt}>{opt}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-muted-foreground text-xs border border-dashed border-rule rounded-panel bg-panel-2/20">
                                {studentMaster.length === 0
                                    ? "Belum ada master data mahasiswa. Silakan tambahkan terlebih dahulu di menu Master Mahasiswa."
                                    : "Tidak ada mahasiswa ditemukan."}
                            </div>
                        )}
                        <div className="text-[11px] text-muted-foreground">
                            * Mahasiswa terpilih (<strong>{selectedNims.size}</strong>) akan dimasukkan ke <strong>{selectedIds.length}</strong> jadwal.
                        </div>
                    </div>
                </div>

                {/* Footer Modal Actions */}
                <div className="p-3 sm:p-4 border-t border-rule flex items-center justify-between gap-2 bg-panel-2/60 shrink-0">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} className="h-8.5 text-xs">Batal</Button>
                    <Button
                        type="button"
                        size="sm"
                        onClick={handleSave}
                        disabled={selectedIds.length === 0 || selectedNims.size === 0}
                        className="h-8.5 text-xs font-semibold flex-1 sm:flex-initial"
                    >
                        Simpan ({selectedNims.size} Mhs ke {selectedIds.length} Jadwal)
                    </Button>
                </div>
            </div>
        </div>
    );
};

const AddStudentFromMasterModal = ({
    isOpen,
    onClose,
    studentMaster,
    alreadyAddedNims,
    onAdd,
}: {
    isOpen: boolean;
    onClose: () => void;
    studentMaster: MasterStudent[];
    alreadyAddedNims: string[];
    onAdd: (students: MasterStudent[]) => void;
}) => {
    const [search, setSearch] = useState("");
    const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());

    // Clear state when opening
    useEffect(() => {
        if (isOpen) {
            setSearch("");
            setSelectedNims(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const availableStudents = studentMaster.filter(
        (m) => !alreadyAddedNims.includes(m.nim)
    );

    const filtered = availableStudents.filter(
        (m) =>
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            m.nim.includes(search)
    );

    const handleToggleSelect = (nim: string) => {
        setSelectedNims((prev) => {
            const next = new Set(prev);
            if (next.has(nim)) next.delete(nim);
            else next.add(nim);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedNims.size === filtered.length) {
            setSelectedNims(new Set());
        } else {
            setSelectedNims(new Set(filtered.map((s) => s.nim)));
        }
    };

    const handleSave = () => {
        const selected = studentMaster.filter((m) => selectedNims.has(m.nim));
        onAdd(selected);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-base font-bold">Pilih Mahasiswa dari Master Data</h3>
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup"><X /></Button>
                </div>

                <div className="p-3 border-b">
                    <div className="relative">
                        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Cari NIM atau Nama..."
                            className="w-full border rounded pl-8 pr-3 py-1.5 text-sm bg-background"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {filtered.length > 0 ? (
                        <>
                            <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b">
                                <span>{filtered.length} mahasiswa tersedia</span>
                                <button onClick={handleSelectAll} className="text-link hover:underline font-medium">
                                    {selectedNims.size === filtered.length ? "Batal Semua" : "Pilih Semua"}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {filtered.map((s) => (
                                    <label
                                        key={s.nim}
                                        className="flex items-center gap-3 px-2 py-2 text-sm rounded hover:bg-muted cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedNims.has(s.nim)}
                                            onChange={() => handleToggleSelect(s.nim)}
                                        />
                                        <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">
                                            {s.nim}
                                        </span>
                                        <span className="flex-1 truncate">{s.name}</span>
                                    </label>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground text-sm">
                            {availableStudents.length === 0
                                ? "Semua mahasiswa dari master data sudah dimasukkan ke jadwal ini."
                                : "Tidak ada mahasiswa ditemukan."}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm border rounded hover:bg-muted">
                        Batal
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedNims.size === 0}
                        className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50"
                    >
                        Tambahkan ({selectedNims.size})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WeeklyEditorPage;
