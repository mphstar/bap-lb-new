import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
    Plus,
    Trash2,
    BookOpen,
    CalendarDays,
    StickyNote,
    ChevronRight,
    Loader2,
    Edit3,
    X,
    Check,
    AlertCircle,
    Clock,
    MapPin,
    BookMarked,
    FileText,
    Search,
    Users,
} from 'lucide-react';
import { useExamSchedule, type ExamScheduleEntry, type NewEntry, type ExamScheduleNote } from '@/hooks/useExamSchedule';
import { useDialog } from '@/context/DialogContext';
import { authClient } from '@/lib/auth-client';


type Tab = 'schedules' | 'entries' | 'detail';

// Format date string (yyyy-mm-dd) → "03 Februari 2026"
const formatTanggal = (val: string): string => {
    if (!val) return '—';
    const d = new Date(val + 'T00:00:00');
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
};

const parseIndonesianDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim().replace(/\s+/g, ' ');
    const parts = cleanStr.split(' ');
    if (parts.length !== 3) return dateStr;

    const day = parts[0].padStart(2, '0');
    const monthName = parts[1].toUpperCase();
    const year = parts[2];

    const months: Record<string, string> = {
        'JANUARI': '01', 'FEBRUARI': '02', 'MARET': '03', 'APRIL': '04',
        'MEI': '05', 'JUNI': '06', 'JULI': '07', 'AGUSTUS': '08',
        'SEPTEMBER': '09', 'OKTOBER': '10', 'NOVEMBER': '11', 'DESEMBER': '12'
    };

    const month = months[monthName];
    if (!month) return dateStr;

    return `${year}-${month}-${day}`;
};


interface ExamSchedulePageProps {
    userId: string | null;
}

const ExamSchedulePage: React.FC<ExamSchedulePageProps> = ({ userId }) => {
    const { showConfirm } = useDialog();
    const { data: session } = authClient.useSession();
    const currentUserName = session?.user?.name || '';
    const {
        schedules,
        activeScheduleId,
        entries,
        selectedEntryId,
        notes,
        loading,
        error,
        createSchedule,
        deleteSchedule,
        loadEntries,
        addEntry,
        addEntriesBatch,
        updateEntry,
        deleteEntry,
        loadNotes,
        addNote,
        deleteNote,
    } = useExamSchedule(userId);

    const [activeTab, setActiveTab] = useState<Tab>('schedules');
    const [newScheduleName, setNewScheduleName] = useState('');

    // Schedule selection → switch to entries tab
    const handleSelectSchedule = async (id: string) => {
        await loadEntries(id);
        setActiveTab('entries');
    };

    // Entry selection → switch to detail tab
    const handleSelectEntry = async (id: string) => {
        await loadNotes(id);
        setActiveTab('detail');
    };

    const handleCreateSchedule = async () => {
        const name = newScheduleName.trim();
        if (!name) return;
        const created = await createSchedule(name);
        if (created) {
            setNewScheduleName('');
            await loadEntries(created.id);
            setActiveTab('entries');
        }
    };

    const handleDeleteSchedule = (id: string) => {
        showConfirm('Hapus Jadwal Ujian', 'Apakah Anda yakin ingin menghapus jadwal ujian ini beserta semua entry dan catatan?').then(async (isConfirmed) => {
            if (!isConfirmed) return;
            await deleteSchedule(id);
        });
    };

    const activeSchedule = schedules.find(s => s.id === activeScheduleId);
    const selectedEntry = entries.find(e => e.id === selectedEntryId);

    if (loading && schedules.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-2 justify-between items-start md:items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Jadwal Ujian</h2>
                    <p className="text-sm text-muted-foreground mt-1">Kelola jadwal UTS/UAS, entry, dan catatan</p>
                </div>
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>

            {/* Error display */}
            {error && (
                <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('schedules')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'schedules'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BookOpen size={14} className="inline mr-1.5 -mt-0.5" />
                    Daftar Ujian
                </button>
                <button
                    onClick={() => { if (activeSchedule) setActiveTab('entries'); }}
                    disabled={!activeSchedule}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                        ${activeTab === 'entries'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <CalendarDays size={14} className="inline mr-1.5 -mt-0.5" />
                    Jadwal
                    {activeSchedule && <span className="ml-1 text-xs opacity-60">({activeSchedule.name})</span>}
                </button>
                <button
                    onClick={() => { if (selectedEntry) setActiveTab('detail'); }}
                    disabled={!selectedEntry}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                        ${activeTab === 'detail'
                            ? 'border-primary text-primary'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <StickyNote size={14} className="inline mr-1.5 -mt-0.5" />
                    Detail & Catatan
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'schedules' && (
                <SchedulesListTab
                    schedules={schedules}
                    activeScheduleId={activeScheduleId}
                    newScheduleName={newScheduleName}
                    onNewNameChange={setNewScheduleName}
                    onCreate={handleCreateSchedule}
                    onDelete={handleDeleteSchedule}
                    onSelect={handleSelectSchedule}
                />
            )}
            {activeTab === 'entries' && activeSchedule && (
                <EntriesTab
                    scheduleName={activeSchedule.name}
                    scheduleId={activeSchedule.id}
                    entries={entries}
                    onAddEntry={addEntry}
                    onAddEntriesBatch={addEntriesBatch}
                    onUpdateEntry={updateEntry}
                    onDeleteEntry={deleteEntry}
                    onSelectEntry={handleSelectEntry}
                    userId={userId}
                    currentUserName={currentUserName}
                />
            )}
            {activeTab === 'detail' && selectedEntry && (
                <DetailTab
                    entry={selectedEntry}
                    notes={notes}
                    onAddNote={addNote}
                    onDeleteNote={deleteNote}
                />
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════
// TAB 1: Schedules List
// ══════════════════════════════════════════════════════════

interface SchedulesListTabProps {
    schedules: { id: string; name: string; created_at: string }[];
    activeScheduleId: string | null;
    newScheduleName: string;
    onNewNameChange: (v: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

const SchedulesListTab: React.FC<SchedulesListTabProps> = ({
    schedules, activeScheduleId, newScheduleName, onNewNameChange, onCreate, onDelete, onSelect,
}) => (
    <div className="space-y-4">
        {/* Create schedule */}
        <div className="bg-card rounded-xl border shadow-sm p-4">
            <h3 className="font-semibold text-sm mb-3">Buat Jadwal Ujian Baru</h3>
            <div className="flex gap-2">
                <input
                    value={newScheduleName}
                    onChange={e => onNewNameChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onCreate()}
                    placeholder="Nama jadwal, misal: UTS Genap 2025"
                    className="flex-1 border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                />
                <button
                    onClick={onCreate}
                    disabled={!newScheduleName.trim()}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <Plus size={14} /> Buat
                </button>
            </div>
        </div>

        {/* List */}
        {schedules.length === 0 ? (
            <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
                <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada jadwal ujian</p>
                <p className="text-sm mt-1">Buat jadwal baru di atas</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {schedules.map(s => (
                    <div
                        key={s.id}
                        className={`bg-card rounded-xl border shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors
                            ${activeScheduleId === s.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
                        onClick={() => onSelect(s.id)}
                    >
                        <div className="bg-primary/10 text-primary rounded-lg p-2.5">
                            <BookOpen size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{s.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Dibuat: {new Date(s.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(s.id); }}
                            className="text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-colors"
                        >
                            <Trash2 size={14} />
                        </button>
                        <ChevronRight size={16} className="text-muted-foreground" />
                    </div>
                ))}
            </div>
        )}
    </div>
);

// ══════════════════════════════════════════════════════════
// TAB 2: Entries (schedule items grouped by hari)
// ══════════════════════════════════════════════════════════

interface EntriesTabProps {
    scheduleName: string;
    scheduleId: string;
    entries: ExamScheduleEntry[];
    onAddEntry: (scheduleId: string, entry: NewEntry) => Promise<ExamScheduleEntry | null>;
    onAddEntriesBatch: (scheduleId: string, entries: NewEntry[]) => Promise<ExamScheduleEntry[] | null>;
    onUpdateEntry: (entryId: string, updates: Partial<NewEntry>) => Promise<ExamScheduleEntry | null>;
    onDeleteEntry: (entryId: string) => Promise<void>;
    onSelectEntry: (entryId: string) => void;
    userId: string | null;
    currentUserName: string;
}

const EMPTY_ENTRY: NewEntry = {
    hari: '',
    tanggal: '',
    jam: '',
    semester: '',
    golongan: '',
    kode_mk: '',
    mata_kuliah: '',
    ruang: '',
    pengawas: '',
};

const EntriesTab: React.FC<EntriesTabProps> = ({
    scheduleName, scheduleId, entries, onAddEntry, onAddEntriesBatch, onUpdateEntry, onDeleteEntry, onSelectEntry, currentUserName,
}) => {
    const { showConfirm } = useDialog();
    const [showAddForm, setShowAddForm] = useState(false);
    const [newEntry, setNewEntry] = useState<NewEntry>({ ...EMPTY_ENTRY });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<NewEntry>>({});

    // === SIM Polije Scraper States ===
    const [showScraper, setShowScraper] = useState(false);
    const [scraperFilters, setScraperFilters] = useState<any>(null);
    const [scraperFiltersLoading, setScraperFiltersLoading] = useState(false);
    const [scraperFiltersError, setScraperFiltersError] = useState<string | null>(null);

    // Filter values
    const [tahun, setTahun] = useState('');
    const [semester, setSemester] = useState('');
    const [jenis, setJenis] = useState('');
    const [selectedProgram, setSelectedProgram] = useState('');
    const [selectedJurusans, setSelectedJurusans] = useState<Set<string>>(new Set());
    const [pengawas, setPengawas] = useState(currentUserName);

    // Search results
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

    // Search query for Program Studi (jurusan) checklist
    const [jurusanSearchQuery, setJurusanSearchQuery] = useState('');

    const filteredJurusans = useMemo(() => {
        if (!scraperFilters?.jurusan) return [];
        if (!jurusanSearchQuery.trim()) return scraperFilters.jurusan;
        const q = jurusanSearchQuery.toLowerCase();
        return scraperFilters.jurusan.filter((j: any) => j.text.toLowerCase().includes(q));
    }, [scraperFilters?.jurusan, jurusanSearchQuery]);


    // Update pengawas default when currentUserName is available
    useEffect(() => {
        if (currentUserName && !pengawas) {
            setPengawas(currentUserName);
        }
    }, [currentUserName, pengawas]);

    const loadScraperFilters = useCallback(async (programId?: string) => {
        setScraperFiltersLoading(true);
        setScraperFiltersError(null);
        try {
            const url = programId 
                ? `/api/sim-polije/jadwal/options?Program=${programId}`
                : '/api/sim-polije/jadwal/options';
            const res = await fetch(url);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            const json = await res.json();
            const data = json.data || json;
            
            if (programId) {
                setScraperFilters((prev: any) => ({
                    ...prev,
                    jurusan: data.jurusan || []
                }));
            } else {
                setScraperFilters(data);
                if (data.tahun?.length > 0) setTahun(data.tahun[0].value);
                if (data.semesters?.length > 0) setSemester(data.semesters[0].value);
                if (data.jenis?.length > 0) setJenis(data.jenis[0].value);
                
                const defaultProj = data.programs?.find((p: any) => p.selected)?.value || data.programs?.[0]?.value || '';
                setSelectedProgram(defaultProj);
            }
        } catch (err: any) {
            setScraperFiltersError(err.message);
        } finally {
            setScraperFiltersLoading(false);
        }
    }, []);

    // Load filters when scraper panel is shown
    useEffect(() => {
        if (showScraper && !scraperFilters) {
            loadScraperFilters();
        }
    }, [showScraper, scraperFilters, loadScraperFilters]);

    // Fetch new jurusans when program changes
    const handleProgramChange = async (programId: string) => {
        setSelectedProgram(programId);
        setSelectedJurusans(new Set());
        setJurusanSearchQuery('');
        await loadScraperFilters(programId);
    };

    const handleSearchScraper = async () => {
        if (!tahun || !semester || !jenis || !pengawas.trim() || !selectedProgram) {
            setSearchError("Semua filter pencarian wajib diisi.");
            return;
        }
        if (selectedJurusans.size === 0) {
            setSearchError("Pilih minimal satu Program Studi (Jurusan).");
            return;
        }
        setSearchLoading(true);
        setSearchError(null);
        setSearchResults([]);
        setSelectedIndices(new Set());

        try {
            const params = new URLSearchParams({
                Tahun: tahun,
                Semester: semester,
                Jenis: jenis,
                Pengawas: pengawas.trim(),
                Programs: selectedProgram,
                Jurusans: Array.from(selectedJurusans).join(','),
            });
            const res = await fetch(`/api/sim-polije/jadwal/batch?${params}`);
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `HTTP ${res.status}`);
            }
            const json = await res.json();
            const list = json.data || [];
            setSearchResults(list);
            if (list.length === 0) {
                setSearchError("Tidak ada jadwal ujian ditemukan untuk kriteria pencarian ini.");
            } else {
                setSelectedIndices(new Set(list.map((_: any, idx: number) => idx)));
            }
        } catch (err: any) {
            setSearchError(err.message);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleToggleSelectIndex = (idx: number) => {
        setSelectedIndices(prev => {
            const next = new Set(prev);
            if (next.has(idx)) next.delete(idx);
            else next.add(idx);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        if (selectedIndices.size === searchResults.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(searchResults.map((_, idx) => idx)));
        }
    };

    const handleImportSelected = async () => {
        const toImport = searchResults.filter((_, idx) => selectedIndices.has(idx));
        if (toImport.length === 0) return;

        const newEntries: NewEntry[] = toImport.map(item => ({
            hari: item.hari || '',
            tanggal: parseIndonesianDate(item.tanggal),
            jam: item.jam || '',
            semester: item.semester || '',
            golongan: item.golongan || '',
            kode_mk: item.kode_mk || '',
            mata_kuliah: item.matakuliah || '',
            ruang: item.ruang || '',
            pengawas: Array.isArray(item.pengawas) ? item.pengawas.join(', ') : (item.pengawas || ''),
        }));

        const added = await onAddEntriesBatch(scheduleId, newEntries);
        if (added) {
            setShowScraper(false);
            setSearchResults([]);
            setSelectedIndices(new Set());
        }
    };

    // Sort entries Senin -> Minggu, then date, then jam
    const HARI_ORDER: Record<string, number> = {
        'senin': 0, 'selasa': 1, 'rabu': 2, 'kamis': 3,
        'jumat': 4, 'sabtu': 5, 'minggu': 6,
    };

    const sortedEntries = useMemo(() => {
        return [...entries].sort((a, b) => {
            const ia = HARI_ORDER[(a.hari || '').toLowerCase()] ?? 99;
            const ib = HARI_ORDER[(b.hari || '').toLowerCase()] ?? 99;
            if (ia !== ib) return ia - ib;

            if (a.tanggal && b.tanggal) {
                const dateA = new Date(a.tanggal).getTime();
                const dateB = new Date(b.tanggal).getTime();
                if (!isNaN(dateA) && !isNaN(dateB) && dateA !== dateB) {
                    return dateA - dateB;
                }
            } else if (a.tanggal) {
                return -1;
            } else if (b.tanggal) {
                return 1;
            }

            const jamA = a.jam || '';
            const jamB = b.jam || '';
            return jamA.localeCompare(jamB);
        });
    }, [entries]);

    const handleAdd = async () => {
        if (!newEntry.mata_kuliah.trim()) return;
        const result = await onAddEntry(scheduleId, newEntry);
        if (result) {
            setNewEntry({ ...EMPTY_ENTRY });
            setShowAddForm(false);
        }
    };

    const handleStartEdit = (entry: ExamScheduleEntry) => {
        setEditingId(entry.id);
        setEditData({
            hari: entry.hari,
            tanggal: entry.tanggal,
            jam: entry.jam,
            semester: entry.semester,
            golongan: entry.golongan,
            kode_mk: entry.kode_mk,
            mata_kuliah: entry.mata_kuliah,
            ruang: entry.ruang,
            pengawas: entry.pengawas,
        });
    };

    const handleSaveEdit = async (entryId: string) => {
        await onUpdateEntry(entryId, editData);
        setEditingId(null);
        setEditData({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleDelete = async (entryId: string) => {
        const isConfirmed = await showConfirm('Hapus Entry Jadwal', 'Apakah Anda yakin ingin menghapus entry ini beserta semua catatannya?');
        if (!isConfirmed) return;
        await onDeleteEntry(entryId);
    };

    return (
        <div className="space-y-4">
            {/* Schedule name header */}
            <div className="bg-card rounded-xl border shadow-sm p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                <div>
                    <h3 className="font-semibold text-sm">{scheduleName}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{entries.length} entry jadwal</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setShowScraper(!showScraper);
                            setShowAddForm(false);
                        }}
                        className="flex items-center gap-1.5 border border-primary text-primary px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/5 transition-colors"
                    >
                        <Search size={14} />
                        Ambil dari SIM Polije
                    </button>
                    <button
                        onClick={() => {
                            setShowAddForm(!showAddForm);
                            setShowScraper(false);
                        }}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {showAddForm ? <X size={14} /> : <Plus size={14} />}
                        {showAddForm ? 'Batal' : 'Tambah Entry'}
                    </button>
                </div>
            </div>

            {/* Scraper Section */}
            {showScraper && (
                <div className="bg-card rounded-xl border shadow-sm p-4 border-primary/30 space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <h4 className="font-semibold text-sm">Ambil Jadwal dari SIM Polije</h4>
                        <button onClick={() => setShowScraper(false)} className="text-muted-foreground hover:text-foreground">
                            <X size={16} />
                        </button>
                    </div>

                    {scraperFiltersLoading && !scraperFilters ? (
                        <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            <span className="text-sm">Memuat opsi filter jadwal...</span>
                        </div>
                    ) : scraperFiltersError ? (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive flex flex-col gap-2">
                            <p>Gagal memuat opsi filter: {scraperFiltersError}</p>
                            <button onClick={() => loadScraperFilters()} className="text-xs font-semibold text-primary underline self-start">
                                Coba Lagi
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tahun Akademik</label>
                                    <select
                                        value={tahun}
                                        onChange={e => setTahun(e.target.value)}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {scraperFilters?.tahun?.map((o: any) => (
                                            <option key={o.value} value={o.value}>{o.text}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Semester</label>
                                    <select
                                        value={semester}
                                        onChange={e => setSemester(e.target.value)}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {scraperFilters?.semesters?.map((o: any) => (
                                            <option key={o.value} value={o.value}>{o.text}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Jenis Ujian</label>
                                    <select
                                        value={jenis}
                                        onChange={e => setJenis(e.target.value)}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {scraperFilters?.jenis?.map((o: any) => (
                                            <option key={o.value} value={o.value}>{o.text}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Jenjang</label>
                                    <select
                                        value={selectedProgram}
                                        onChange={e => handleProgramChange(e.target.value)}
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                    >
                                        <option value="">-- Pilih --</option>
                                        {scraperFilters?.programs?.map((o: any) => (
                                            <option key={o.value} value={o.value}>{o.text}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Pengawas</label>
                                    <input
                                        value={pengawas}
                                        onChange={e => setPengawas(e.target.value)}
                                        placeholder="Nama pengawas..."
                                        className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                                        onKeyDown={e => e.key === 'Enter' && handleSearchScraper()}
                                    />
                                </div>
                            </div>

                            {/* Program Studi (Jurusan) Checkboxes */}
                            {scraperFilters?.jurusan && scraperFilters.jurusan.length > 0 && (
                                <div className="border-t pt-3 space-y-2">
                                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                                        <label className="text-xs font-medium text-muted-foreground flex items-center">
                                            Program Studi (Jurusan)
                                            {scraperFiltersLoading && <Loader2 className="inline animate-spin ml-1.5" size={10} />}
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative w-48">
                                                <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                                <input
                                                    type="text"
                                                    value={jurusanSearchQuery}
                                                    onChange={e => setJurusanSearchQuery(e.target.value)}
                                                    placeholder="Cari program studi..."
                                                    className="w-full pl-6 pr-2 py-1 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                                                />
                                                {jurusanSearchQuery && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setJurusanSearchQuery('')}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px]"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex gap-2 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedJurusans(prev => new Set([...prev, ...filteredJurusans.map((j: any) => j.value)]))}
                                                    className="text-[10px] text-primary hover:underline font-medium"
                                                >
                                                    Pilih Semua {jurusanSearchQuery ? 'Hasil' : ''}
                                                </button>
                                                <span className="text-muted-foreground text-[10px]">|</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setSelectedJurusans(prev => {
                                                        const next = new Set(prev);
                                                        filteredJurusans.forEach((j: any) => next.delete(j.value));
                                                        return next;
                                                    })}
                                                    className="text-[10px] text-primary hover:underline font-medium"
                                                >
                                                    Batal Semua {jurusanSearchQuery ? 'Hasil' : ''}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2 bg-background/50">
                                        {filteredJurusans.length > 0 ? (
                                            filteredJurusans.map((j: any) => (
                                                <label
                                                    key={j.value}
                                                    className="flex items-start gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground select-none"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedJurusans.has(j.value)}
                                                        onChange={() => {
                                                            setSelectedJurusans(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(j.value)) next.delete(j.value);
                                                                else next.add(j.value);
                                                                return next;
                                                            });
                                                        }}
                                                        className="mt-0.5"
                                                    />
                                                    <span className="leading-tight">{j.text}</span>
                                                </label>
                                            ))
                                        ) : (
                                            <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                                                Tidak ada program studi yang cocok dengan "{jurusanSearchQuery}"
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    <div className="flex justify-end gap-2 border-t pt-3">
                        <button
                            onClick={handleSearchScraper}
                            disabled={searchLoading || !tahun || !semester || !jenis || !pengawas.trim() || !selectedProgram || selectedJurusans.size === 0}
                            className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                            {searchLoading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                            Cari Jadwal
                        </button>
                    </div>

                    {searchError && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
                            {searchError}
                        </div>
                    )}

                    {searchResults.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-medium text-muted-foreground">
                                    Ditemukan {searchResults.length} jadwal untuk pengawas "{pengawas}"
                                </span>
                                <button
                                    onClick={handleToggleSelectAll}
                                    className="text-xs text-primary font-medium hover:underline"
                                >
                                    {selectedIndices.size === searchResults.length ? 'Batal Semua' : 'Pilih Semua'}
                                </button>
                            </div>

                            <div className="max-h-60 overflow-y-auto border rounded-lg">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                        <tr>
                                            <th className="px-3 py-2 w-8 text-center">Pilih</th>
                                            <th className="px-3 py-2">Hari/Tanggal</th>
                                            <th className="px-3 py-2">Jam</th>
                                            <th className="px-3 py-2">Mata Kuliah</th>
                                            <th className="px-3 py-2">Smt/Gol</th>
                                            <th className="px-3 py-2">Ruang</th>
                                            <th className="px-3 py-2">Pengawas</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {searchResults.map((item, idx) => (
                                            <tr key={idx} className="border-b last:border-0 hover:bg-muted/30">
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIndices.has(idx)}
                                                        onChange={() => handleToggleSelectIndex(idx)}
                                                    />
                                                </td>
                                                <td className="px-3 py-2 font-medium">
                                                    {item.hari}, {item.tanggal}
                                                </td>
                                                <td className="px-3 py-2 font-mono">{item.jam}</td>
                                                <td className="px-3 py-2">
                                                    <span className="font-semibold">{item.matakuliah}</span>
                                                    <span className="block text-[10px] text-muted-foreground font-mono">{item.kode_mk}</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    Smt {item.semester} / Gol {item.golongan}
                                                </td>
                                                <td className="px-3 py-2 font-medium">{item.ruang}</td>
                                                <td className="px-3 py-2 text-muted-foreground truncate max-w-[150px]" title={Array.isArray(item.pengawas) ? item.pengawas.join(', ') : item.pengawas}>
                                                    {Array.isArray(item.pengawas) ? item.pengawas.join(', ') : (item.pengawas || '—')}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={handleImportSelected}
                                    disabled={selectedIndices.size === 0}
                                    className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    <Check size={14} /> Impor Terpilih ({selectedIndices.size})
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Add Entry Form */}
            {showAddForm && (
                <div className="bg-card rounded-xl border shadow-sm p-4 border-primary/30">
                    <h4 className="font-semibold text-sm mb-3">Tambah Entry Baru</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <EntryField label="Hari" value={newEntry.hari} onChange={v => setNewEntry(p => ({ ...p, hari: v }))} placeholder="Senin, Selasa, Sabtu..." />
                        <EntryField label="Tanggal" value={newEntry.tanggal} onChange={v => setNewEntry(p => ({ ...p, tanggal: v }))} type="date" />
                        <EntryField label="Jam" value={newEntry.jam} onChange={v => setNewEntry(p => ({ ...p, jam: v }))} placeholder="07.30 - 09.00" />
                        <EntryField label="Ruang" value={newEntry.ruang} onChange={v => setNewEntry(p => ({ ...p, ruang: v }))} placeholder="Lab-1" />
                        <EntryField label="Kode MK" value={newEntry.kode_mk} onChange={v => setNewEntry(p => ({ ...p, kode_mk: v }))} placeholder="TI1234" />
                        <EntryField label="Mata Kuliah" value={newEntry.mata_kuliah} onChange={v => setNewEntry(p => ({ ...p, mata_kuliah: v }))} placeholder="Pemrograman Web" />
                        <EntryField label="Semester" value={newEntry.semester} onChange={v => setNewEntry(p => ({ ...p, semester: v }))} placeholder="4" />
                        <EntryField label="Golongan" value={newEntry.golongan} onChange={v => setNewEntry(p => ({ ...p, golongan: v }))} placeholder="A" />
                        <EntryField label="Pengawas" value={newEntry.pengawas} onChange={v => setNewEntry(p => ({ ...p, pengawas: v }))} placeholder="Nama Pengawas..." />
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleAdd}
                            disabled={!newEntry.mata_kuliah.trim()}
                            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={14} /> Simpan Entry
                        </button>
                    </div>
                </div>
            )}

            {/* Entries Unified Table */}
            {entries.length === 0 ? (
                <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
                    <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Belum ada entry jadwal</p>
                    <p className="text-sm mt-1">Klik "Tambah Entry" atau "Ambil dari SIM Polije" untuk menambahkan</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground font-semibold border-b text-xs">
                                    <th className="px-4 py-2.5 text-left w-12">No</th>
                                    <th className="px-3 py-2.5 text-left w-24">Hari</th>
                                    <th className="px-3 py-2.5 text-left">Tanggal</th>
                                    <th className="px-3 py-2.5 text-left">Jam</th>
                                    <th className="px-3 py-2.5 text-left">Kode MK</th>
                                    <th className="px-3 py-2.5 text-left">Mata Kuliah</th>
                                    <th className="px-3 py-2.5 text-left">Smt</th>
                                    <th className="px-3 py-2.5 text-left">Gol</th>
                                    <th className="px-3 py-2.5 text-left">Ruang</th>
                                    <th className="px-3 py-2.5 text-left">Pengawas</th>
                                    <th className="px-3 py-2.5 text-center w-28">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedEntries.map((entry, idx) => (
                                    editingId === entry.id ? (
                                        <tr key={entry.id} className="border-b bg-primary/5">
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.hari || ''} onChange={e => setEditData(d => ({ ...d, hari: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input type="date" value={editData.tanggal || ''} onChange={e => setEditData(d => ({ ...d, tanggal: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.jam || ''} onChange={e => setEditData(d => ({ ...d, jam: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.kode_mk || ''} onChange={e => setEditData(d => ({ ...d, kode_mk: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.mata_kuliah || ''} onChange={e => setEditData(d => ({ ...d, mata_kuliah: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.semester || ''} onChange={e => setEditData(d => ({ ...d, semester: e.target.value }))}
                                                    className="w-16 border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.golongan || ''} onChange={e => setEditData(d => ({ ...d, golongan: e.target.value }))}
                                                    className="w-16 border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.ruang || ''} onChange={e => setEditData(d => ({ ...d, ruang: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input value={editData.pengawas || ''} onChange={e => setEditData(d => ({ ...d, pengawas: e.target.value }))}
                                                    className="w-full border border-input rounded px-2 py-1 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleSaveEdit(entry.id)}
                                                        className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors" title="Simpan">
                                                        <Check size={14} />
                                                    </button>
                                                    <button onClick={handleCancelEdit}
                                                        className="p-1 text-muted-foreground hover:bg-muted rounded transition-colors" title="Batal">
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        <tr
                                            key={entry.id}
                                            className={`border-b hover:bg-muted/30 transition-colors cursor-pointer ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                            onClick={() => onSelectEntry(entry.id)}
                                        >
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                                            <td className="px-3 py-2.5 text-xs font-semibold">{entry.hari || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs">{formatTanggal(entry.tanggal)}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono">{entry.jam || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-mono">{entry.kode_mk || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs font-medium">{entry.mata_kuliah || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs">{entry.semester || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs">{entry.golongan || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs">{entry.ruang || '—'}</td>
                                            <td className="px-3 py-2.5 text-xs truncate max-w-[150px]" title={entry.pengawas}>{entry.pengawas || '—'}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleStartEdit(entry); }}
                                                        className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={13} />
                                                    </button>
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDelete(entry.id); }}
                                                        className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                    <ChevronRight size={13} className="text-muted-foreground ml-1" />
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};


// ─── Field component ───
const EntryField: React.FC<{ label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }> = ({
    label, value, onChange, placeholder, type = 'text',
}) => (
    <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
        <input
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
        />
    </div>
);

// ══════════════════════════════════════════════════════════
// TAB 3: Detail & Notes
// ══════════════════════════════════════════════════════════

interface DetailTabProps {
    entry: ExamScheduleEntry;
    notes: ExamScheduleNote[];
    onAddNote: (entryId: string, content: string) => Promise<ExamScheduleNote | null>;
    onDeleteNote: (noteId: string) => Promise<void>;
}

const DetailTab: React.FC<DetailTabProps> = ({ entry, notes, onAddNote, onDeleteNote }) => {
    const { showConfirm } = useDialog();
    const [newNoteContent, setNewNoteContent] = useState('');
    const [addingNote, setAddingNote] = useState(false);

    const handleAddNote = async () => {
        const content = newNoteContent.trim();
        if (!content) return;
        setAddingNote(true);
        const result = await onAddNote(entry.id, content);
        if (result) setNewNoteContent('');
        setAddingNote(false);
    };

    const handleDeleteNote = async (noteId: string) => {
        const isConfirmed = await showConfirm('Hapus Catatan', 'Apakah Anda yakin ingin menghapus catatan ini?');
        if (!isConfirmed) return;
        await onDeleteNote(noteId);
    };

    return (
        <div className="space-y-4">
            {/* Entry Detail Card */}
            <div className="bg-card rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                    <BookMarked size={18} className="text-primary" />
                    Detail Entry
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailItem icon={<CalendarDays size={14} />} label="Hari" value={entry.hari} />
                    <DetailItem icon={<CalendarDays size={14} />} label="Tanggal" value={formatTanggal(entry.tanggal)} />
                    <DetailItem icon={<Clock size={14} />} label="Jam" value={entry.jam} />
                    <DetailItem icon={<FileText size={14} />} label="Kode MK" value={entry.kode_mk} />
                    <DetailItem icon={<BookOpen size={14} />} label="Mata Kuliah" value={entry.mata_kuliah} />
                    <DetailItem icon={<MapPin size={14} />} label="Ruang" value={entry.ruang} />
                    <DetailItem icon={<FileText size={14} />} label="Semester" value={entry.semester} />
                    <DetailItem icon={<FileText size={14} />} label="Golongan" value={entry.golongan} />
                    <DetailItem icon={<Users size={14} />} label="Pengawas" value={entry.pengawas} />
                </div>
            </div>

            {/* Add Note */}
            <div className="bg-card rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <StickyNote size={16} className="text-primary" />
                    Tambah Catatan
                </h3>
                <textarea
                    value={newNoteContent}
                    onChange={e => setNewNoteContent(e.target.value)}
                    placeholder="Tulis catatan baru, misal: kecurangan peserta, info tambahan, dll..."
                    rows={3}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                />
                <div className="flex justify-end mt-2">
                    <button
                        onClick={handleAddNote}
                        disabled={!newNoteContent.trim() || addingNote}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {addingNote ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                        Tambah Catatan
                    </button>
                </div>
            </div>

            {/* Notes List */}
            <div className="bg-card rounded-xl border shadow-sm p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                    <StickyNote size={16} className="text-primary" />
                    Daftar Catatan
                    <span className="text-xs font-normal text-muted-foreground">({notes.length} catatan)</span>
                </h3>

                {notes.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 border border-dashed rounded-md">
                        <StickyNote size={32} className="mx-auto mb-2 opacity-30" />
                        Belum ada catatan untuk entry ini.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notes.map(note => (
                            <div key={note.id} className="border rounded-lg p-3 bg-background group hover:border-primary/30 transition-colors">
                                <div className="flex items-start gap-3">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                                        <p className="text-[10px] text-muted-foreground mt-2">
                                            {new Date(note.created_at).toLocaleString('id-ID', {
                                                day: 'numeric',
                                                month: 'long',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit',
                                            })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteNote(note.id)}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1.5 rounded-md hover:bg-destructive/10 transition-all"
                                        title="Hapus catatan"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Detail Item ───
const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start gap-2">
        <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
        <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-sm font-medium">{value || '—'}</p>
        </div>
    </div>
);

export default ExamSchedulePage;
