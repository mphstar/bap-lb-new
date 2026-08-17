import React, { useState, useEffect } from 'react';
import { Copy, Check, ChevronDown, ChevronRight, Users, Plus, Trash2, Eye, Calendar, CalendarRange, Search, X } from 'lucide-react';
import type { ScheduleEntry, WeekData, WeeklyEntry, Student, MasterStudent, MasterDosen } from '@/types';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
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

    // Group entries by Day (preserve template order within each day)
    const entriesByDay = DAYS.reduce((acc, day) => {
        const dayEntries = template.filter(t => t.hari === day);
        if (dayEntries.length > 0) {
            acc[day] = dayEntries;
        }
        return acc;
    }, {} as Record<string, ScheduleEntry[]>);

    // Catch-all for entries with undefined/non-standard days (preserve template order)
    const otherEntries = template.filter(t => !DAYS.includes(t.hari));
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
                    // Deep copy students to avoid reference issues
                    const newStudents = sourceEntry.students.map((s, idx) => ({
                        ...s,
                        id: Math.floor(Math.random() * 1000000000) + idx, // Ensure unique IDs
                        remarks: '' // Reset remarks when copying roster
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

            {/* Auto-fill Tanggal */}
            <div className="flex flex-wrap items-center gap-3 mb-6 bg-panel rounded-panel border border-rule px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Calendar size={16} className="text-primary" />
                    <span>Isi Tanggal Otomatis</span>
                </div>
                <input
                    type="date"
                    value={mondayDate}
                    onChange={(e) => setMondayDate(e.target.value)}
                    className="border border-input rounded-md px-3 py-1.5 text-sm bg-background"
                />
                <button
                    onClick={autoFillDates}
                    disabled={!mondayDate}
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground px-4 py-1.5 rounded-lg shadow transition-colors text-sm font-medium"
                >
                    <Calendar size={14} />
                    Terapkan
                </button>
                <span className="text-xs text-muted-foreground">
                    Pilih tanggal Senin, lalu klik Terapkan untuk mengisi semua tanggal di minggu ini.
                </span>
            </div>

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

            {/* Editor Table */}
            {weekData && (
                <div className="hm-scrollbar bg-panel rounded-panel border border-rule overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 text-left text-muted-foreground font-semibold border-b">
                                <th className="px-2 py-3 w-8"></th>
                                <th className="px-3 py-3 w-10">No</th>
                                <th className="px-3 py-3">Mata Kuliah</th>
                                <th className="px-3 py-3 w-16 text-center">Smt</th>
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
                            {[...DAYS, 'Lainnya'].map(day => {
                                const entries = entriesByDay[day];
                                if (!entries || entries.length === 0) return null;

                                return (
                                    <React.Fragment key={day}>
                                        <tr className="bg-muted/20 border-b">
                                            <td colSpan={11} className="px-4 py-2 font-bold text-foreground bg-slate-100 dark:bg-slate-900">
                                                {day}
                                            </td>
                                        </tr>
                                        {entries.map((entry) => {
                                            const we = weekData.entries.find(e => e.scheduleId === entry.id);
                                            if (!we) return null;
                                            const isExpanded = expandedEntry === entry.id;
                                            const studentCount = we.students?.length || 0;

                                            return (
                                                <React.Fragment key={entry.id}>
                                                    <tr className="border-b hover:bg-muted/30 transition-colors">
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
                                                            <td colSpan={11} className="p-0">
                                                                <div className="bg-muted/20 border-b px-6 py-3">
                                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                                                                        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                                                                            <Users size={12} />
                                                                            Data Mahasiswa — {entry.mataKuliah}
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <select
                                                                                className="text-xs border rounded-md px-2 py-1 bg-background max-w-[200px]"
                                                                                onChange={(e) => {
                                                                                    if (e.target.value) copyStudentList(entry.id, e.target.value);
                                                                                    e.target.value = ''; // Reset select
                                                                                }}
                                                                            >
                                                                                <option value="">Salin dari No...</option>
                                                                                {weekData.entries
                                                                                    .filter(e => e.scheduleId !== entry.id && e.students?.length > 0)
                                                                                    .sort((a, b) => { // Sort by Entry Number
                                                                                        const tA = template.find(t => t.id === a.scheduleId);
                                                                                        const tB = template.find(t => t.id === b.scheduleId);
                                                                                        return (tA?.no || 0) - (tB?.no || 0);
                                                                                    })
                                                                                    .map(e => {
                                                                                        const t = template.find(temp => temp.id === e.scheduleId);
                                                                                        return (
                                                                                            <option key={e.scheduleId} value={e.scheduleId}>
                                                                                                No. {t?.no} - {t?.mataKuliah}
                                                                                            </option>
                                                                                        );
                                                                                    })
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

    const filteredTemplate = template
        .filter(t => t.hari === selectedDay)
        .sort((a, b) => a.no - b.no);

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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Tambah Mahasiswa (Batch) - {selectedIds.length} Schedule dipilih</h3>
                    <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Tutup"><X /></Button>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Left: Schedule Selection */}
                    <div className="w-full md:w-1/3 border-r overflow-y-auto bg-muted/10 flex flex-col">
                        {/* Day Tabs */}
                        <div className="hm-scroll-x flex overflow-x-auto p-2 border-b bg-background gap-1 hide-scrollbar">
                            {availableDays.map(day => (
                                <button
                                    key={day}
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors
                                        ${selectedDay === day
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                        }`}
                                >
                                    {day}
                                </button>
                            ))}
                        </div>

                        <div className="p-4 flex-1 overflow-y-auto">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-semibold text-sm">Jadwal {selectedDay}</h4>
                                <button onClick={toggleSelectAll} className="text-xs text-link hover:underline">
                                    {isAllSelected ? 'Batal Hari Ini' : 'Pilih Hari Ini'}
                                </button>
                            </div>
                            <div className="space-y-1">
                                {filteredTemplate.map(t => (
                                    <label key={t.id} className={`flex items-start gap-2 p-2 rounded cursor-pointer text-sm border
                                        ${selectedIds.includes(t.id)
                                            ? 'bg-primary/5 border-primary/20'
                                            : 'hover:bg-muted border-transparent'
                                        }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(t.id)}
                                            onChange={() => toggleSelect(t.id)}
                                            className="mt-1"
                                        />
                                        <div>
                                            <div className="font-medium">No. {t.no} - {t.mataKuliah}</div>
                                            <div className="text-xs text-muted-foreground">{t.jam}</div>
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
                    </div>

                    {/* Right: Student Input */}
                    <div className="w-full md:w-2/3 p-4 flex flex-col gap-4 overflow-y-auto">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <h4 className="font-semibold text-sm font-medium">Pilih Mahasiswa dari Master</h4>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <span className="text-xs text-muted-foreground whitespace-nowrap">Setel Semua Terpilih:</span>
                                <select
                                    className="border rounded px-2 py-1 text-xs bg-background font-medium"
                                    value=""
                                    onChange={e => {
                                        if (e.target.value) {
                                            handleSetAllRemarks(e.target.value);
                                            e.target.value = ""; // Reset
                                        }
                                    }}
                                >
                                    <option value="">-- Pilih --</option>
                                    {REMARKS_OPTIONS.map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="Cari NIM atau Nama..."
                                    className="w-full border rounded pl-8 pr-3 py-1.5 text-sm bg-background"
                                />
                            </div>
                        </div>

                        {filteredMaster.length > 0 ? (
                            <div className="flex-1 overflow-y-auto space-y-1 max-h-[40vh] border rounded-md p-2 bg-background">
                                <div className="flex justify-between items-center text-xs text-muted-foreground pb-2 border-b mb-2">
                                    <span>{filteredMaster.length} mahasiswa ditemukan</span>
                                    <button onClick={toggleAllStudentsSelect} className="text-link hover:underline font-medium">
                                        {selectedNims.size === filteredMaster.length ? 'Batal Semua' : 'Pilih Semua'}
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {filteredMaster.map((m) => {
                                        const currentRemarks = remarksMap[m.nim] || "ALPHA";
                                        return (
                                            <div key={m.nim} className="flex items-center gap-3 px-2 py-1 text-sm rounded hover:bg-muted transition-colors">
                                                <label className="flex items-center gap-3 flex-1 cursor-pointer truncate py-1">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedNims.has(m.nim)}
                                                        onChange={() => toggleStudentSelect(m.nim)}
                                                    />
                                                    <span className="font-mono text-xs text-muted-foreground w-20 shrink-0">{m.nim}</span>
                                                    <span className="flex-1 truncate font-medium">{m.name}</span>
                                                </label>
                                                <select
                                                    className="border rounded px-2 py-1 text-xs bg-background w-24 shrink-0 font-medium"
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
                            <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                                {studentMaster.length === 0
                                    ? "Belum ada master data mahasiswa. Silakan tambahkan terlebih dahulu di menu Master Mahasiswa."
                                    : "Tidak ada mahasiswa ditemukan."}
                            </div>
                        )}
                        <div className="text-xs text-muted-foreground mt-2">
                            * Mahasiswa yang dipilih ({selectedNims.size}) akan ditambahkan ke semua jadwal yang dicentang ({selectedIds.length}).
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-2 bg-muted/10">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground">Batal</button>
                    <button onClick={handleSave} className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90">
                        Simpan ({selectedIds.length} Jadwal)
                    </button>
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
