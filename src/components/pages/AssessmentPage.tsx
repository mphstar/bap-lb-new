import React, { useState, useCallback, useMemo } from 'react';
import { Plus, Trash2, FileText, ClipboardList, Printer, Upload, X, ChevronRight, Loader2, Copy, Check, Search, GraduationCap } from 'lucide-react';
import type { AssessmentForm, AssessmentSubject, AssessmentStudent, MasterStudent } from '@/types';
import { useAssessmentData } from '@/hooks/useAssessmentData';
import { useDialog } from '@/context/DialogContext';
import { PageShell, PageHeader } from '@/components/shell';



// ─── ID generator ───
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ─── Sample JSON ───
const SAMPLE_JSON = `[
  { "no": 1, "nim": "E43252347", "nama": "MUHAMMAD REVAL AZIZI" },
  { "no": 2, "nim": "E43252402", "nama": "MOCHAMMAD RIZQON NARARYA JAYADI" },
  { "no": 3, "nim": "E43252424", "nama": "DJANU ANDRESK SAPUTRA" },
  { "no": 4, "nim": "E43252616", "nama": "RAFAEL ANGGARA RIZKI SABIAN HUDA" },
  { "no": 5, "nim": "E43252690", "nama": "IBROR YUSRON SUGIHARTO" },
  { "no": 6, "nim": "E43252720", "nama": "MOCH. CALVIN APRILIAN" },
  { "no": 7, "nim": "E43252782", "nama": "ABIYU AMMAR HADY" },
  { "no": 8, "nim": "E43252794", "nama": "DANDI PUTRA KHAERIL ANAM" }
]`;

// Helper: check if any student has a non-empty nim
const studentsHaveNim = (students: AssessmentStudent[]): boolean =>
    students.some(s => s.nim && s.nim.trim() !== '');

type Tab = 'forms' | 'setup' | 'grading';

interface AssessmentPageProps {
    userId: string | null;
    studentMaster?: MasterStudent[];
}

const AssessmentPage: React.FC<AssessmentPageProps> = ({ userId, studentMaster = [] }) => {
    const { forms, setForms, loading, saving } = useAssessmentData(userId);
    const { showAlert, showConfirm } = useDialog();
    const [activeFormId, setActiveFormId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('forms');
    const [newFormName, setNewFormName] = useState('');

    const activeForm = forms.find(f => f.id === activeFormId) ?? null;

    const updateForm = useCallback((id: string, updater: (f: AssessmentForm) => AssessmentForm) => {
        setForms(prev => prev.map(f => f.id === id ? updater(f) : f));
    }, [setForms]);

    // ─── Form CRUD ───
    const createForm = () => {
        const name = newFormName.trim();
        if (!name) return;
        const form: AssessmentForm = {
            id: uid(),
            name,
            students: [],
            subjects: [],
            grades: {},
        };
        setForms(prev => [...prev, form]);
        setNewFormName('');
        setActiveFormId(form.id);
        setActiveTab('setup');
    };

    const deleteForm = async (id: string) => {
        const isConfirmed = await showConfirm('Hapus Form Penilaian', 'Apakah Anda yakin ingin menghapus form penilaian ini?');
        if (!isConfirmed) return;
        setForms(prev => prev.filter(f => f.id !== id));
        if (activeFormId === id) {
            setActiveFormId(null);
            setActiveTab('forms');
        }
    };

    const selectForm = (id: string) => {
        setActiveFormId(id);
        setActiveTab('setup');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <PageShell>
            <PageHeader
                title="Form Penilaian"
                meta="Buat form, atur kolom, dan input nilai"
                actions={
                    saving ? (
                        <span className="text-xs text-muted-foreground">Menyimpan…</span>
                    ) : null
                }
            />

            {/* Tabs */}
            <div className="hm-scroll-x mb-6 flex gap-1 overflow-x-auto border-b border-rule">
                <button
                    onClick={() => setActiveTab('forms')}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                        ${activeTab === 'forms'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <FileText size={14} className="inline mr-1.5 -mt-0.5" />
                    Daftar Form
                </button>
                <button
                    onClick={() => { if (activeForm) setActiveTab('setup'); }}
                    disabled={!activeForm}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                        ${activeTab === 'setup'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                    Setup
                </button>
                <button
                    onClick={() => { if (activeForm && activeForm.subjects.length > 0) setActiveTab('grading'); }}
                    disabled={!activeForm || activeForm.subjects.length === 0}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                        ${activeTab === 'grading'
                            ? 'border-foreground text-foreground'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                    Penilaian
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'forms' && (
                <FormsListTab
                    forms={forms}
                    activeFormId={activeFormId}
                    newFormName={newFormName}
                    onNewFormNameChange={setNewFormName}
                    onCreate={createForm}
                    onDelete={deleteForm}
                    onSelect={selectForm}
                />
            )}
            {activeTab === 'setup' && activeForm && (
                <SetupTab form={activeForm} updateForm={updateForm} studentMaster={studentMaster} />
            )}
            {activeTab === 'grading' && activeForm && (
                <GradingTab form={activeForm} updateForm={updateForm} />
            )}
        </PageShell>
    );
};

// ══════════════════════════════════════════════════════════
// TAB 1: Forms List
// ══════════════════════════════════════════════════════════
interface FormsListTabProps {
    forms: AssessmentForm[];
    activeFormId: string | null;
    newFormName: string;
    onNewFormNameChange: (v: string) => void;
    onCreate: () => void;
    onDelete: (id: string) => void;
    onSelect: (id: string) => void;
}

const FormsListTab: React.FC<FormsListTabProps> = ({
    forms, activeFormId, newFormName, onNewFormNameChange, onCreate, onDelete, onSelect
}) => (
    <div className="space-y-4">
        {/* Create form */}
        <div className="bg-panel rounded-panel border border-rule p-4">
            <h3 className="font-semibold text-sm mb-3">Buat Form Baru</h3>
            <div className="flex gap-2">
                <input
                    value={newFormName}
                    onChange={e => onNewFormNameChange(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && onCreate()}
                    placeholder="Nama form, misal: Penilaian Praktikum 2025"
                    className="flex-1 border border-input rounded-control px-3 py-2 text-sm bg-background"
                />
                <button
                    onClick={onCreate}
                    disabled={!newFormName.trim()}
                    className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                    <Plus size={14} /> Buat
                </button>
            </div>
        </div>

        {/* List */}
        {forms.length === 0 ? (
            <div className="bg-panel rounded-panel border border-rule p-12 text-center text-muted-foreground">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium">Belum ada form penilaian</p>
                <p className="text-sm mt-1">Buat form baru di atas</p>
            </div>
        ) : (
            <div className="grid gap-3">
                {forms.map(f => (
                    <div
                        key={f.id}
                        className={`bg-panel rounded-panel border border-rule p-4 flex items-center gap-4 cursor-pointer hover:border-primary/40 transition-colors
                            ${activeFormId === f.id ? 'border-primary ring-1 ring-primary/20' : ''}`}
                        onClick={() => onSelect(f.id)}
                    >
                        <div className="bg-primary/10 text-primary rounded-lg p-2.5">
                            <ClipboardList size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{f.name}</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {f.students.length} mahasiswa · {f.subjects.length} mata kuliah
                            </p>
                        </div>
                        <button
                            onClick={e => { e.stopPropagation(); onDelete(f.id); }}
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
// TAB 2: Setup
// ══════════════════════════════════════════════════════════
interface SetupTabProps {
    form: AssessmentForm;
    updateForm: (id: string, updater: (f: AssessmentForm) => AssessmentForm) => void;
    studentMaster: MasterStudent[];
}

const SetupTab: React.FC<SetupTabProps> = ({ form, updateForm, studentMaster }) => {
    const { showAlert, showConfirm } = useDialog();
    const [jsonInput, setJsonInput] = useState('');
    const [jsonError, setJsonError] = useState('');
    const [newSubjectName, setNewSubjectName] = useState('');
    const [copiedJson, setCopiedJson] = useState(false);

    // States for Master Student picker
    const [selectedProdi, setSelectedProdi] = useState('');
    const [selectedSemester, setSelectedSemester] = useState('');
    const [selectedGolongan, setSelectedGolongan] = useState('');
    const [pickerSearchQuery, setPickerSearchQuery] = useState('');
    const [selectedNims, setSelectedNims] = useState<Set<string>>(new Set());

    // Derive filter options dynamically from studentMaster
    const prodiOptions = useMemo(() => Array.from(new Set(studentMaster.map(s => s.prodi).filter(Boolean))).sort(), [studentMaster]);
    const semesterOptions = useMemo(() => Array.from(new Set(studentMaster.map(s => s.semester).filter(Boolean))).sort(), [studentMaster]);
    const golonganOptions = useMemo(() => Array.from(new Set(studentMaster.map(s => s.golongan).filter(Boolean))).sort(), [studentMaster]);

    const filteredMasterStudents = useMemo(() => {
        return studentMaster.filter(s => {
            if (selectedProdi && s.prodi !== selectedProdi) return false;
            if (selectedSemester && s.semester !== selectedSemester) return false;
            if (selectedGolongan && s.golongan !== selectedGolongan) return false;
            if (pickerSearchQuery.trim()) {
                const q = pickerSearchQuery.toLowerCase();
                return s.name.toLowerCase().includes(q) || s.nim.toLowerCase().includes(q);
            }
            return true;
        });
    }, [studentMaster, selectedProdi, selectedSemester, selectedGolongan, pickerSearchQuery]);

    const handleImportJson = () => {
        setJsonError('');
        try {
            const parsed = JSON.parse(jsonInput);
            if (!Array.isArray(parsed)) throw new Error('JSON harus berupa array []');
            const students: AssessmentStudent[] = parsed.map((item: any, idx: number) => ({
                no: item.no ?? idx + 1,
                nim: String(item.nim ?? ''),
                nama: String(item.nama ?? ''),
            }));
            if (students.length === 0) throw new Error('Array kosong');
            updateForm(form.id, f => ({ ...f, students }));
            setJsonInput('');
        } catch (e: any) {
            setJsonError(e.message || 'Format JSON tidak valid');
        }
    };

    const handleCopyJson = () => {
        const json = JSON.stringify(form.students, null, 2);
        navigator.clipboard.writeText(json).then(() => {
            setCopiedJson(true);
            setTimeout(() => setCopiedJson(false), 1500);
        });
    };

    const addSubject = () => {
        const name = newSubjectName.trim().toUpperCase();
        if (!name) return;
        const subject: AssessmentSubject = {
            id: uid(),
            mataKuliah: name,
            columns: [
                { id: uid(), name: 'Kolom 1' },
                { id: uid(), name: 'Kolom 2' },
            ],
        };
        updateForm(form.id, f => ({ ...f, subjects: [...f.subjects, subject] }));
        setNewSubjectName('');
    };

    const removeSubject = async (subjectId: string) => {
        const isConfirmed = await showConfirm('Hapus Mata Kuliah', 'Apakah Anda yakin ingin menghapus mata kuliah ini beserta kolom dan nilainya?');
        if (!isConfirmed) return;
        updateForm(form.id, f => {
            const newGrades = { ...f.grades };
            delete newGrades[subjectId];
            return { ...f, subjects: f.subjects.filter(s => s.id !== subjectId), grades: newGrades };
        });
    };

    const addColumn = (subjectId: string) => {
        updateForm(form.id, f => ({
            ...f,
            subjects: f.subjects.map(s => {
                if (s.id !== subjectId || s.columns.length >= 16) return s;
                return { ...s, columns: [...s.columns, { id: uid(), name: `Kolom ${s.columns.length + 1}` }] };
            })
        }));
    };

    const removeColumn = (subjectId: string, columnId: string) => {
        updateForm(form.id, f => ({
            ...f,
            subjects: f.subjects.map(s => {
                if (s.id !== subjectId || s.columns.length <= 2) return s;
                return { ...s, columns: s.columns.filter(c => c.id !== columnId) };
            })
        }));
    };

    const renameColumn = (subjectId: string, columnId: string, name: string) => {
        updateForm(form.id, f => ({
            ...f,
            subjects: f.subjects.map(s => {
                if (s.id !== subjectId) return s;
                return { ...s, columns: s.columns.map(c => c.id === columnId ? { ...c, name } : c) };
            })
        }));
    };

    const renameSubject = (subjectId: string, name: string) => {
        updateForm(form.id, f => ({
            ...f,
            subjects: f.subjects.map(s => s.id === subjectId ? { ...s, mataKuliah: name } : s)
        }));
    };

    return (
        <div className="space-y-6">
            {/* Form name */}
            <div className="bg-panel rounded-panel border border-rule p-4">
                <h3 className="font-semibold text-sm mb-3">Nama Form</h3>
                <input
                    value={form.name}
                    onChange={e => updateForm(form.id, f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-input rounded-control px-3 py-2 text-sm bg-background"
                />
            </div>

            {/* Master Student Selector */}
            <div className="bg-panel rounded-panel border border-rule p-4">
                <h3 className="font-semibold text-sm mb-1 flex items-center gap-2">
                    <GraduationCap className="text-primary" size={16} />
                    Ambil dari Master Mahasiswa
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Pilih filter Program Studi, Semester, dan Golongan dari data master Anda, lalu pilih mahasiswa yang ingin di-import.
                </p>

                {studentMaster.length === 0 ? (
                    <div className="bg-muted/50 rounded-lg p-6 text-center text-muted-foreground text-xs border border-dashed">
                        Belum ada data master mahasiswa. Silakan isi terlebih dahulu di halaman{" "}
                        <a href="/mahasiswa" className="text-link hover:underline font-semibold">
                            Master Data Mahasiswa
                        </a>.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Dropdown grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Program Studi</label>
                                <select
                                    value={selectedProdi}
                                    onChange={e => { setSelectedProdi(e.target.value); setSelectedNims(new Set()); }}
                                    className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Semua Program Studi</option>
                                    {prodiOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Semester</label>
                                <select
                                    value={selectedSemester}
                                    onChange={e => { setSelectedSemester(e.target.value); setSelectedNims(new Set()); }}
                                    className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Semua Semester</option>
                                    {semesterOptions.map(s => <option key={s} value={s}>Semester {s}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Golongan</label>
                                <select
                                    value={selectedGolongan}
                                    onChange={e => { setSelectedGolongan(e.target.value); setSelectedNims(new Set()); }}
                                    className="w-full border border-input rounded-md px-2 py-1.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="">Semua Golongan</option>
                                    {golonganOptions.map(g => <option key={g} value={g}>Golongan {g}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={12} />
                            <input
                                type="text"
                                placeholder="Cari NIM atau Nama..."
                                value={pickerSearchQuery}
                                onChange={e => setPickerSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 border border-input rounded-md text-xs bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </div>

                        {/* Student selection box */}
                        <div className="max-h-60 overflow-y-auto border rounded-md divide-y bg-muted/10">
                            {filteredMasterStudents.length === 0 ? (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    Tidak ada mahasiswa yang cocok dengan filter.
                                </div>
                            ) : (
                                filteredMasterStudents.map(student => (
                                    <label
                                        key={student.nim}
                                        className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-muted/50 cursor-pointer transition-colors"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedNims.has(student.nim)}
                                            onChange={() => {
                                                setSelectedNims(prev => {
                                                    const next = new Set(prev);
                                                    if (next.has(student.nim)) next.delete(student.nim);
                                                    else next.add(student.nim);
                                                    return next;
                                                });
                                            }}
                                            className="rounded border-input text-primary focus:ring-primary"
                                        />
                                        <span className="font-mono text-[10px] text-muted-foreground w-20 shrink-0">{student.nim}</span>
                                        <span className="flex-1 font-medium text-foreground truncate">{student.name}</span>
                                        <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 rounded bg-background border">
                                            {student.prodi || "-"} · Smt {student.semester || "-"} · Gol {student.golongan || "-"}
                                        </span>
                                    </label>
                                ))
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                                {filteredMasterStudents.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allNims = filteredMasterStudents.map(s => s.nim);
                                            const allSelected = allNims.every(nim => selectedNims.has(nim));
                                            setSelectedNims(prev => {
                                                const next = new Set(prev);
                                                if (allSelected) {
                                                    allNims.forEach(nim => next.delete(nim));
                                                } else {
                                                    allNims.forEach(nim => next.add(nim));
                                                }
                                                return next;
                                            });
                                        }}
                                        className="text-link hover:underline font-semibold mr-4"
                                    >
                                        {filteredMasterStudents.every(s => selectedNims.has(s.nim)) ? "Batal Pilih Semua" : "Pilih Semua Hasil"}
                                    </button>
                                )}
                                <span>Terpilih: <strong>{selectedNims.size}</strong> mahasiswa</span>
                            </div>
                            <button
                                onClick={() => {
                                    const selectedList = studentMaster.filter(s => selectedNims.has(s.nim));
                                    const students: AssessmentStudent[] = selectedList.map((s, idx) => ({
                                        no: idx + 1,
                                        nim: s.nim,
                                        nama: s.name,
                                    }));
                                    updateForm(form.id, f => ({ ...f, students }));
                                    setSelectedNims(new Set());
                                    showAlert("Import Berhasil", `Berhasil meng-import ${students.length} mahasiswa ke form.`);
                                }}
                                disabled={selectedNims.size === 0}
                                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                                <Plus size={12} /> Import Terpilih
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Import JSON */}
            <div className="bg-panel rounded-panel border border-rule p-4">
                <h3 className="font-semibold text-sm mb-1">Import Data Mahasiswa (JSON)</h3>
                <p className="text-xs text-muted-foreground mb-3">
                    Saat ini: <strong>{form.students.length}</strong> mahasiswa. Paste JSON array berisi objek dengan field <code className="bg-muted px-1 rounded">no</code>, <code className="bg-muted px-1 rounded">nama</code>, dan opsional <code className="bg-muted px-1 rounded">nim</code>.
                </p>
                <textarea
                    value={jsonInput}
                    onChange={e => setJsonInput(e.target.value)}
                    placeholder={SAMPLE_JSON}
                    rows={6}
                    className="w-full border border-input rounded-md px-3 py-2 text-xs font-mono bg-background resize-none"
                />
                {jsonError && <p className="text-xs text-destructive mt-1">{jsonError}</p>}
                <div className="flex gap-2 mt-2">
                    <button
                        onClick={() => setJsonInput(SAMPLE_JSON)}
                        className="text-xs text-link hover:underline"
                    >
                        Isi contoh
                    </button>
                    {form.students.length > 0 && (
                        <button
                            onClick={handleCopyJson}
                            className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 hover:underline"
                        >
                            {copiedJson ? <><Check size={12} /> Copied!</> : <><Copy size={12} /> Copy JSON</>}
                        </button>
                    )}
                    <button
                        onClick={handleImportJson}
                        disabled={!jsonInput.trim()}
                        className="ml-auto flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-md text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        <Upload size={12} /> Import
                    </button>
                </div>

                {/* Student preview */}
                {form.students.length > 0 && (() => {
                    const hasNim = studentsHaveNim(form.students);
                    return (
                    <div className="mt-4 border rounded-md overflow-hidden">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground font-semibold">
                                    <th className="px-3 py-2 text-left w-12">No</th>
                                    {hasNim && <th className="px-3 py-2 text-left w-32">NIM</th>}
                                    <th className="px-3 py-2 text-left">Nama</th>
                                </tr>
                            </thead>
                            <tbody>
                                {form.students.slice(0, 10).map((s, i) => (
                                    <tr key={s.nim || `student-${i}`} className="border-t">
                                        <td className="px-3 py-1.5">{s.no}</td>
                                        {hasNim && <td className="px-3 py-1.5 font-mono">{s.nim}</td>}
                                        <td className="px-3 py-1.5">{s.nama}</td>
                                    </tr>
                                ))}
                                {form.students.length > 10 && (
                                    <tr className="border-t">
                                        <td colSpan={hasNim ? 3 : 2} className="px-3 py-1.5 text-center text-muted-foreground italic">
                                            ...dan {form.students.length - 10} lainnya
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    );
                })()}
            </div>

            {/* Subjects & Columns */}
            <div className="bg-panel rounded-panel border border-rule p-4">
                <h3 className="font-semibold text-sm mb-3">Mata Kuliah & Kolom Penilaian</h3>

                {/* Add subject */}
                <div className="flex gap-2 mb-4">
                    <input
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addSubject()}
                        placeholder="Nama Mata Kuliah, misal: PENGKABELAN"
                        className="flex-1 border border-input rounded-control px-3 py-2 text-sm bg-background"
                    />
                    <button
                        onClick={addSubject}
                        disabled={!newSubjectName.trim()}
                        className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        <Plus size={14} /> Tambah MK
                    </button>
                </div>

                {form.subjects.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-md">
                        Belum ada mata kuliah. Tambahkan di atas.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {form.subjects.map(subject => (
                            <SubjectCard
                                key={subject.id}
                                subject={subject}
                                onRename={(name) => renameSubject(subject.id, name)}
                                onRemove={() => removeSubject(subject.id)}
                                onAddColumn={() => addColumn(subject.id)}
                                onRemoveColumn={(colId) => removeColumn(subject.id, colId)}
                                onRenameColumn={(colId, name) => renameColumn(subject.id, colId, name)}
                                onNotesChange={(notes) => updateForm(form.id, f => ({
                                    ...f,
                                    subjects: f.subjects.map(s => s.id === subject.id ? { ...s, notes } : s)
                                }))}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ─── Subject Card Component ───
interface SubjectCardProps {
    subject: AssessmentSubject;
    onRename: (name: string) => void;
    onRemove: () => void;
    onAddColumn: () => void;
    onRemoveColumn: (colId: string) => void;
    onRenameColumn: (colId: string, name: string) => void;
    onNotesChange?: (notes: string) => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({
    subject, onRename, onRemove, onAddColumn, onRemoveColumn, onRenameColumn, onNotesChange
}) => (
    <div className="border rounded-lg p-4 bg-background">
        <div className="flex items-center gap-2 mb-3">
            <input
                value={subject.mataKuliah}
                onChange={e => onRename(e.target.value)}
                className="flex-1 font-semibold text-sm border-b border-transparent hover:border-input focus:border-primary bg-transparent focus:outline-none"
            />
            <button onClick={onRemove} className="text-muted-foreground hover:text-destructive p-1 rounded" title="Hapus MK">
                <Trash2 size={14} />
            </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
            {subject.columns.map(col => (
                <div key={col.id} className="flex items-center gap-1 bg-muted/50 rounded-md border px-2 py-1">
                    <input
                        value={col.name}
                        onChange={e => onRenameColumn(col.id, e.target.value)}
                        className="w-24 text-xs bg-transparent border-none focus:outline-none"
                    />
                    {subject.columns.length > 2 && (
                        <button onClick={() => onRemoveColumn(col.id)} className="text-muted-foreground hover:text-destructive">
                            <X size={10} />
                        </button>
                    )}
                </div>
            ))}
            {subject.columns.length < 16 && (
                <button
                    onClick={onAddColumn}
                    className="flex items-center gap-1 text-xs text-link hover:bg-link/10 px-2 py-1 rounded-md transition-colors"
                >
                    <Plus size={12} /> Kolom
                </button>
            )}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{subject.columns.length} kolom (min 2, max 16)</p>

        {/* Notes / Keterangan */}
        <div className="mt-3 pt-3 border-t">
            <label className="text-xs font-medium text-muted-foreground">Keterangan (opsional, tampil di bawah tabel saat print)</label>
            <textarea
                value={subject.notes ?? ''}
                onChange={e => onNotesChange?.(e.target.value)}
                placeholder="Contoh: 81 = berhasil walaupun tidak rapi&#10;90 = berhasil dan rapi sekali&#10;Di bawah 80 = gagal"
                rows={2}
                className="w-full mt-1 border border-input rounded-md px-3 py-1.5 text-xs bg-background resize-none"
            />
        </div>
    </div>
);

// ══════════════════════════════════════════════════════════
// TAB 3: Grading
// ══════════════════════════════════════════════════════════
interface GradingTabProps {
    form: AssessmentForm;
    updateForm: (id: string, updater: (f: AssessmentForm) => AssessmentForm) => void;
}

const GradingTab: React.FC<GradingTabProps> = ({ form, updateForm }) => {
    const [activeSubjectId, setActiveSubjectId] = useState(form.subjects[0]?.id ?? '');
    const [scale, setScale] = useState(0.8);
    const [nameColumnWidth, setNameColumnWidth] = useState(250);
    const [padding, setPadding] = useState(20);
    const [searchQuery, setSearchQuery] = useState('');
    const [printMode, setPrintMode] = useState<'filled' | 'blank'>('filled');

    const hasNim = studentsHaveNim(form.students);

    const activeSubject = form.subjects.find(s => s.id === activeSubjectId);

    // Filter students for display (search), but print always uses all students
    const filteredStudents = searchQuery.trim()
        ? form.students.filter(s =>
            s.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (hasNim && s.nim.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        : form.students;

    const getGrade = (subjectId: string, nim: string, columnId: string): string => {
        return form.grades?.[subjectId]?.[nim]?.[columnId] ?? '';
    };

    const setGrade = (subjectId: string, nim: string, columnId: string, value: string) => {
        updateForm(form.id, f => {
            const grades = { ...f.grades };
            if (!grades[subjectId]) grades[subjectId] = {};
            if (!grades[subjectId][nim]) grades[subjectId][nim] = {};
            grades[subjectId][nim][columnId] = value;
            return { ...f, grades };
        });
    };

    const handlePrint = (mode: 'filled' | 'blank') => {
        setPrintMode(mode);
        // Small timeout to let state update before printing
        setTimeout(() => window.print(), 100);
    };

    if (form.subjects.length === 0) {
        return (
            <div className="bg-panel rounded-panel border border-rule p-12 text-center text-muted-foreground">
                <p>Belum ada mata kuliah. Buka tab Setup untuk menambahkan.</p>
            </div>
        );
    }

    return (
        <div>
            {/* ─── Interactive View (hidden when printing) ─── */}
            <div className="space-y-4 print:hidden">
                {/* Subject tabs */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex flex-wrap gap-1 flex-1">
                        {form.subjects.map(s => (
                            <button
                                key={s.id}
                                onClick={() => setActiveSubjectId(s.id)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border
                                    ${activeSubjectId === s.id
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                                    }`}
                            >
                                {s.mataKuliah}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={hasNim ? "Cari nama atau NIM..." : "Cari nama..."}
                        className="w-full pl-9 pr-3 py-2 border border-input rounded-lg text-sm bg-background"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>

                {/* Scale + Print controls */}
                <div className="flex flex-wrap items-center gap-4 bg-panel p-3 rounded-panel border border-rule">
                    {/* Scale Control */}
                    <div className="flex items-center gap-3 border-r pr-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">Scale: {Math.round(scale * 100)}%</span>
                            <span className="text-[10px] text-muted-foreground">Zoom</span>
                        </div>
                        <input
                            type="range" min="0.5" max="1.5" step="0.05"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="hm-range w-24"
                        />
                        <button onClick={() => setScale(0.8)} className="text-xs text-link hover:underline">Reset</button>
                    </div>

                    {/* Name Width Control */}
                    <div className="flex items-center gap-3 border-r pr-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">Lebar Nama</span>
                            <span className="text-[10px] text-muted-foreground">{nameColumnWidth}px</span>
                        </div>
                        <input
                            type="range" min="150" max="600" step="10"
                            value={nameColumnWidth}
                            onChange={(e) => setNameColumnWidth(parseInt(e.target.value))}
                            className="hm-range w-24"
                        />
                    </div>

                    {/* Padding Control */}
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground text-sm">Padding</span>
                            <span className="text-[10px] text-muted-foreground">{padding}mm</span>
                        </div>
                        <input
                            type="range" min="0" max="100" step="5"
                            value={padding}
                            onChange={(e) => setPadding(parseInt(e.target.value))}
                            className="hm-range w-24"
                        />
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => handlePrint('blank')}
                            className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Printer size={14} /> Print Kosong
                        </button>
                        <button
                            onClick={() => handlePrint('filled')}
                            className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            <Printer size={14} /> Print Isi
                        </button>
                    </div>
                </div>

                {/* Grading Table */}
                {activeSubject && (
                    <div className="hm-scrollbar bg-panel rounded-panel border border-rule overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                    <th className="px-3 py-3 text-center w-10">No</th>
                                    {hasNim && <th className="px-3 py-3 text-left w-28">NIM</th>}
                                    <th className="px-3 py-3 text-left">Nama</th>
                                    {activeSubject.columns.map(col => (
                                        <th key={col.id} className="px-3 py-3 text-center bg-primary/5 text-primary min-w-[80px]">
                                            {col.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, idx) => (
                                    <tr
                                        key={student.nim || `student-${idx}`}
                                        className={`border-b hover:bg-muted/30 transition-colors ${idx % 2 === 0 ? '' : 'bg-muted/10'}`}
                                    >
                                        <td className="px-3 py-2 text-center text-muted-foreground">{student.no}</td>
                                        {hasNim && <td className="px-3 py-2 font-mono text-xs">{student.nim}</td>}
                                        <td className="px-3 py-2 font-medium">{student.nama}</td>
                                        {activeSubject.columns.map(col => (
                                            <td key={col.id} className="px-2 py-1 bg-primary/[0.02]">
                                                <input
                                                    type="text"
                                                    value={getGrade(activeSubject.id, student.nim, col.id)}
                                                    onChange={e => setGrade(activeSubject.id, student.nim, col.id, e.target.value)}
                                                    className="w-full border border-input rounded-md px-2 py-1 text-sm text-center bg-background"
                                                    placeholder="—"
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {form.students.length === 0 && (
                            <div className="p-8 text-center text-sm text-muted-foreground">
                                Belum ada data mahasiswa. Buka tab Setup untuk import JSON.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ─── Print View (hidden on screen, shown when printing) ─── */}
            <div
                className="hidden print:block print-page fixed inset-0 z-[9999] bg-white box-border"
                style={{ padding: `${padding}mm` }}
            >
                {activeSubject && (
                    <div className="h-full w-full" style={{ zoom: scale }}>
                        <h2 style={{ textAlign: 'left', fontWeight: 'bold', fontSize: '16px', marginBottom: '2px', marginTop: 0 }}>
                            {activeSubject.mataKuliah}
                        </h2>
                        <p style={{ textAlign: 'left', fontSize: '11px', marginBottom: '12px', color: '#555' }}>
                            {form.name}
                        </p>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr>
                                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '35px' }} rowSpan={2}>NO</th>
                                    {hasNim && <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', width: '90px' }} rowSpan={2}>NIM</th>}
                                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'left', width: `${nameColumnWidth}px` }} rowSpan={2}>NAMA</th>
                                    <th style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }} colSpan={activeSubject.columns.length}>
                                        {activeSubject.mataKuliah}
                                    </th>
                                </tr>
                                <tr>
                                    {activeSubject.columns.map(col => (
                                        <th key={col.id} style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center', fontSize: '10px' }}>
                                            {col.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {form.students.map((student, idx) => (
                                    <tr key={student.nim || `print-student-${idx}`}>
                                        <td style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>{student.no}</td>
                                        {hasNim && <td style={{ border: '1px solid #000', padding: '3px 6px', fontFamily: 'monospace', fontSize: '10px' }}>{student.nim}</td>}
                                        <td style={{ border: '1px solid #000', padding: '3px 6px' }}>{student.nama}</td>
                                        {activeSubject.columns.map(col => (
                                            <td key={col.id} style={{ border: '1px solid #000', padding: '3px 6px', textAlign: 'center' }}>
                                                {printMode === 'filled' ? getGrade(activeSubject.id, student.nim, col.id) : ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Notes / Keterangan */}
                        {activeSubject.notes && activeSubject.notes.trim() && (
                            <div style={{ marginTop: '16px', fontSize: '11px' }}>
                                <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keterangan:</p>
                                <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                                    {activeSubject.notes}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
                    }
                    body {
                        visibility: hidden;
                    }
                    .print-page {
                        visibility: visible;
                        position: fixed;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100%;
                        overflow: visible;
                    }
                }
            `}</style>
        </div>
    );
};

export default AssessmentPage;
