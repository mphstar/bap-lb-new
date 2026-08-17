import React, { useRef, useState, useMemo } from 'react';
import { Upload, FileSpreadsheet, Trash2, Plus, Loader2, Printer, Download, X, Copy, GripVertical } from 'lucide-react';
import type { ScheduleEntry, WeekImportData, MasterDosen } from '@/types';
import { importSmart } from '@/utils/excelParser';
import { generateId } from '@/utils/storage';
import { SearchableSelect } from '@/components/SearchableSelect';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import { PageShell, PageHeader, EmptyState } from '@/components/shell';

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'];

interface ScheduleTemplatePageProps {
    template: ScheduleEntry[];
    onTemplateChange: (template: ScheduleEntry[], smartWeeksData?: Record<number, WeekImportData>) => void;
    dosenList?: MasterDosen[];
}

const ScheduleTemplatePage: React.FC<ScheduleTemplatePageProps> = ({ template, onTemplateChange, dosenList = [] }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { showAlert, showConfirm } = useDialog();
    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<ScheduleEntry>>({});
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Group template entries by day and merge identical consecutive sessions for print view
    const scheduleByDay = useMemo(() => {
        const map = new Map<string, ScheduleEntry[]>();
        DAY_ORDER.forEach(day => map.set(day, []));

        template.forEach(entry => {
            const day = entry.hari?.trim();
            if (day && map.has(day)) {
                map.get(day)!.push({ ...entry }); // create a copy for merging
            } else if (day) {
                // Unknown day — append at the end
                if (!map.has(day)) map.set(day, []);
                map.get(day)!.push({ ...entry });
            }
        });

        // Merge adjacent continuous sessions for the same class
        for (const [day, entries] of map.entries()) {
            if (entries.length === 0) continue;

            const merged: ScheduleEntry[] = [];
            for (const entry of entries) {
                if (merged.length === 0) {
                    merged.push(entry);
                    continue;
                }

                const last = merged[merged.length - 1];
                if (
                    last.mataKuliah === entry.mataKuliah &&
                    last.tempat === entry.tempat &&
                    last.prodi === entry.prodi &&
                    last.semester === entry.semester &&
                    last.golongan === entry.golongan &&
                    last.defaultPengajar === entry.defaultPengajar &&
                    last.defaultTeknisi === entry.defaultTeknisi
                ) {
                    // Match found, attempt to merge time strings
                    const t1 = last.jam.trim();
                    const t2 = entry.jam.trim();

                    const p1 = t1.split(/-|s\/d|\s+s\/d\s+/i).map(s => s.trim());
                    const p2 = t2.split(/-|s\/d|\s+s\/d\s+/i).map(s => s.trim());

                    if (p1.length === 2 && p2.length === 2 && p1[1] === p2[0]) {
                        // Consecutive times (e.g. 07.00-09.00 and 09.00-11.00 -> 07.00-11.00)
                        last.jam = `${p1[0]}-${p2[1]}`;
                    } else {
                        // If not strictly consecutive (e.g., morning and afternoon), join with comma
                        last.jam = `${t1}, ${t2}`;
                    }
                } else {
                    merged.push(entry);
                }
            }
            map.set(day, merged);
        }

        return map;
    }, [template]);

    const handlePrintJadwal = () => {
        setIsPrintMode(true);
        setTimeout(() => {
            window.print();
            // Reset after print dialog closes
            setTimeout(() => setIsPrintMode(false), 500);
        }, 100);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.name.endsWith('.xlsx')) {
            showAlert('Format File Salah', 'Pilih file spreadsheet .xlsx yang valid.');
            return;
        }

        setImporting(true);
        setImportSuccess(null);
        try {
            const { template: newTemplate, weeks } = await importSmart(file);
            onTemplateChange(newTemplate, weeks);
            const weekCount = Object.keys(weeks).length;

            // Wait 1.5s to cover the Supabase debounce save period (1s) so the user 
            // doesn't see "Success" while the app is still saving in the background.
            await new Promise(resolve => setTimeout(resolve, 1500));

            setImportSuccess(`Berhasil import! Template diperbarui dan data ditemukan untuk ${weekCount} minggu.`);
            setTimeout(() => setImportSuccess(null), 5000);
        } catch (err: any) {
            console.error(err);
            showAlert('Gagal Impor Excel', `Proses impor gagal: ${err.message}`);
        } finally {
            setImporting(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const addEntry = () => {
        const newEntry: ScheduleEntry = {
            id: generateId(),
            no: template.length + 1,
            mataKuliah: '',
            hari: 'Senin',
            tempat: '',
            jam: '',
            prodi: '',
            semester: '',
            golongan: '',
            defaultPengajar: '',
            defaultTeknisi: '',
        };
        setEditingId(newEntry.id);
        setEditForm(newEntry);
        onTemplateChange([...template, newEntry]);
    };

    const duplicateEntry = (entry: ScheduleEntry, index: number) => {
        const duplicated: ScheduleEntry = {
            ...entry,
            id: generateId(),
            no: template.length + 1,
        };
        const updated = [...template];
        updated.splice(index + 1, 0, duplicated);
        const renumbered = updated.map((e, i) => ({ ...e, no: i + 1 }));
        onTemplateChange(renumbered);
        startEdit(duplicated);
    };

    const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
    };

    const handleDragEnter = (index: number) => {
        if (draggedIndex === null || draggedIndex === index) return;

        const items = [...template];
        const [movedItem] = items.splice(draggedIndex, 1);
        items.splice(index, 0, movedItem);

        const renumbered = items.map((e, i) => ({ ...e, no: i + 1 }));
        onTemplateChange(renumbered);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const deleteEntry = async (id: string) => {
        const isConfirmed = await showConfirm('Hapus Jadwal', 'Apakah Anda yakin ingin menghapus jadwal template ini?');
        if (!isConfirmed) return;
        const updated = template.filter(e => e.id !== id).map((e, i) => ({ ...e, no: i + 1 }));
        onTemplateChange(updated);
    };

    const startEdit = (entry: ScheduleEntry) => {
        setEditingId(entry.id);
        setEditForm({ ...entry });
    };

    const saveEdit = () => {
        if (!editingId) return;
        const updated = template.map(e => e.id === editingId ? { ...e, ...editForm } as ScheduleEntry : e);
        onTemplateChange(updated);
        setEditingId(null);
        setEditForm({});
    };

    const cancelEdit = () => {
        // If was adding new and fields are empty, remove it
        const entry = template.find(e => e.id === editingId);
        if (entry && !entry.mataKuliah && !editForm.mataKuliah) {
            onTemplateChange(template.filter(e => e.id !== editingId));
        }
        setEditingId(null);
        setEditForm({});
    };

    return (
        <PageShell className="relative print:w-full">
            {/* Import Loading Overlay */}
            {importing && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm print:hidden">
                    <div className="flex max-w-sm flex-col items-center gap-4 rounded-panel border border-rule bg-panel p-6 text-center shadow-lg">
                        <Loader2 className="size-9 animate-spin text-primary" />
                        <div>
                            <p className="mb-1 text-base font-semibold">Mengimpor data Excel…</p>
                            <p className="text-sm text-muted-foreground">
                                Proses ini memakan waktu beberapa saat.<br />
                                Mohon tunggu dan jangan muat ulang halaman.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <PageHeader
                title="Jadwal Template"
                meta={
                    template.length > 0
                        ? `${template.length} entri — jadwal dasar Senin sampai Jumat`
                        : "Jadwal dasar Senin sampai Jumat"
                }
                actions={
                    <>
                        {template.length > 0 && (
                            <Button variant="default" onClick={handlePrintJadwal}>
                                <Printer /> Print
                            </Button>
                        )}
                        <Button variant="default" onClick={addEntry} disabled={importing}>
                            <Plus /> Tambah manual
                        </Button>
                        <Button
                            onClick={() => inputRef.current?.click()}
                            disabled={importing}
                        >
                            <Upload /> Impor Excel
                        </Button>
                        <Button variant="default" asChild>
                            <a href="/template_jadwal.xlsx" download="template_jadwal.xlsx">
                                <Download /> Format
                            </a>
                        </Button>
                        <input
                            ref={inputRef}
                            type="file"
                            accept=".xlsx"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </>
                }
            />

            {importSuccess && (
                <div
                    role="status"
                    className="mb-6 flex items-start gap-2.5 rounded-control border border-rule bg-panel px-4 py-3 text-sm print:hidden"
                >
                    <FileSpreadsheet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    <span>{importSuccess}</span>
                </div>
            )}

            {/* Template Table */}
            {template.length === 0 ? (
                <EmptyState
                    className="print:hidden"
                    icon={<FileSpreadsheet />}
                    title="Belum ada jadwal template"
                    description="Impor file Excel jadwal, atau tambahkan entri satu per satu secara manual."
                    actions={
                        <>
                            <Button onClick={() => inputRef.current?.click()} disabled={importing}>
                                <Upload /> Impor Excel
                            </Button>
                            <Button variant="outline" onClick={addEntry}>
                                <Plus /> Tambah manual
                            </Button>
                        </>
                    }
                    hint={
                        <span>
                            Beri nama sheet Excel{" "}
                            <span className="font-medium text-foreground">Minggu 1</span>,{" "}
                            <span className="font-medium text-foreground">Minggu 2</span>, dan
                            seterusnya agar data mingguan ikut terbaca otomatis.
                        </span>
                    }
                />
            ) : (
                <div className="hm-scrollbar overflow-x-auto rounded-panel border border-rule bg-panel print:hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 text-left text-muted-foreground font-semibold border-b">
                                <th className="px-2 py-3 w-8"></th>
                                <th className="px-3 py-3 w-10">No</th>
                                <th className="px-3 py-3">Mata Kuliah</th>
                                <th className="px-3 py-3">Hari</th>
                                <th className="px-3 py-3">Jam</th>
                                <th className="px-3 py-3">Tempat</th>
                                <th className="px-3 py-3">Prodi</th>
                                <th className="px-3 py-3">Smt</th>
                                <th className="px-3 py-3">Gol</th>
                                <th className="px-3 py-3">Pengajar (Default)</th>
                                <th className="px-3 py-3 w-32">Teknisi (Default)</th>
                                <th className="px-3 py-3 w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {template.map((entry, index) => (
                                <tr
                                    key={entry.id}
                                    draggable={editingId === null}
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDragEnter={() => handleDragEnter(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDragEnd={handleDragEnd}
                                    className={`border-b transition-all duration-150 ${
                                        draggedIndex === index
                                            ? 'opacity-40 bg-accent scale-[0.99]'
                                            : 'hover:bg-muted/30'
                                    }`}
                                >
                                    {editingId === entry.id ? (
                                        <>
                                            <td className="px-2 py-2 text-center text-muted-foreground/40">
                                                <GripVertical size={15} />
                                            </td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.no}</td>
                                            <td className="px-3 py-2"><input className="w-full border rounded px-2 py-1 text-sm bg-background" value={editForm.mataKuliah || ''} onChange={e => setEditForm({ ...editForm, mataKuliah: e.target.value })} placeholder="Mata Kuliah" /></td>
                                            <td className="px-3 py-2">
                                                <select
                                                    className="w-24 border rounded px-2 py-1 text-sm bg-background"
                                                    value={editForm.hari || 'Senin'}
                                                    onChange={e => setEditForm({ ...editForm, hari: e.target.value })}
                                                >
                                                    {DAY_ORDER.map(day => (
                                                        <option key={day} value={day}>{day}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2"><input className="w-24 border rounded px-2 py-1 text-sm bg-background" value={editForm.jam || ''} onChange={e => setEditForm({ ...editForm, jam: e.target.value })} placeholder="Jam" /></td>
                                            <td className="px-3 py-2"><input className="w-16 border rounded px-2 py-1 text-sm bg-background" value={editForm.tempat || ''} onChange={e => setEditForm({ ...editForm, tempat: e.target.value })} placeholder="Tempat" /></td>
                                            <td className="px-3 py-2"><input className="w-16 border rounded px-2 py-1 text-sm bg-background" value={editForm.prodi || ''} onChange={e => setEditForm({ ...editForm, prodi: e.target.value })} placeholder="Prodi" /></td>
                                            <td className="px-3 py-2"><input className="w-12 border rounded px-2 py-1 text-sm bg-background" value={editForm.semester || ''} onChange={e => setEditForm({ ...editForm, semester: e.target.value })} placeholder="Smt" /></td>
                                            <td className="px-3 py-2"><input className="w-12 border rounded px-2 py-1 text-sm bg-background" value={editForm.golongan || ''} onChange={e => setEditForm({ ...editForm, golongan: e.target.value })} placeholder="Gol" /></td>
                                            <td className="px-3 py-2">
                                                {dosenList.length > 0 ? (
                                                    <SearchableSelect
                                                        value={editForm.defaultPengajar || ''}
                                                        onChange={val => setEditForm({ ...editForm, defaultPengajar: val })}
                                                        options={dosenList.map(d => ({ value: d.name, label: d.name }))}
                                                    />
                                                ) : (
                                                    <input className="w-full border rounded px-2 py-1 text-sm bg-background" value={editForm.defaultPengajar || ''} onChange={e => setEditForm({ ...editForm, defaultPengajar: e.target.value })} placeholder="Pengajar" />
                                                )}
                                            </td>
                                            <td className="px-3 py-2"><input className="w-full border rounded px-2 py-1 text-sm bg-background" value={editForm.defaultTeknisi || ''} onChange={e => setEditForm({ ...editForm, defaultTeknisi: e.target.value })} placeholder="Teknisi" /></td>
                                            <td className="px-3 py-2">
                                                <div className="flex gap-1">
                                                    <button onClick={saveEdit} className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600">OK</button>
                                                    <Button variant="ghost" size="icon-xs" onClick={cancelEdit} aria-label="Batal edit"><X /></Button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-2 py-2 text-center text-muted-foreground/40 cursor-grab active:cursor-grabbing">
                                                <GripVertical size={15} />
                                            </td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">{entry.no}</td>
                                            <td className="px-3 py-2 font-medium">{entry.mataKuliah}</td>
                                            <td className="px-3 py-2">{entry.hari}</td>
                                            <td className="px-3 py-2">{entry.jam}</td>
                                            <td className="px-3 py-2">{entry.tempat}</td>
                                            <td className="px-3 py-2">{entry.prodi}</td>
                                            <td className="px-3 py-2">{entry.semester}</td>
                                            <td className="px-3 py-2">{entry.golongan}</td>
                                            <td className="px-3 py-2">{entry.defaultPengajar}</td>
                                            <td className="px-3 py-2">{entry.defaultTeknisi}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => startEdit(entry)} className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 px-2 py-1 rounded hover:bg-blue-200">Edit</button>
                                                    <button onClick={() => duplicateEntry(entry, index)} title="Duplikat baris" className="text-xs bg-muted text-foreground p-1 rounded hover:bg-accent"><Copy size={13} /></button>
                                                    <button onClick={() => deleteEntry(entry.id)} title="Hapus jadwal" className="text-xs text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {template.length > 0 && (
                <p className="text-xs text-gray-400 mt-3 text-right print:hidden">{template.length} jadwal terdaftar</p>
            )}

            {/* ═══ PRINT VIEW — Jadwal per Hari ═══ */}
            {isPrintMode && (
                <div className="hidden print:block print-jadwal-view">
                    <div style={{ fontFamily: "'Calibri', sans-serif" }}>
                        {/* Title */}
                        <div className="text-center mb-2">
                            <p className="font-bold text-sm uppercase tracking-wide">Jadwal Praktikum Laboratorium</p>
                            <p className="font-bold text-xs">Semester Genap Tahun Akademik 2025/2026</p>
                        </div>

                        {/* Schedule Table */}
                        <table className="w-full border-collapse border border-black text-[8pt]">
                            <thead>
                                <tr className="bg-gray-100 text-center font-bold text-[8pt]">
                                    <th className="border border-black px-1 py-px w-6">No</th>
                                    <th className="border border-black px-1 py-px">Mata Kuliah</th>
                                    <th className="border border-black px-1 py-px w-20">Jam</th>
                                    <th className="border border-black px-1 py-px w-12">Tempat</th>
                                    <th className="border border-black px-1 py-px w-12">Prodi</th>
                                    <th className="border border-black px-1 py-px w-8">Smt</th>
                                    <th className="border border-black px-1 py-px w-8">Gol</th>
                                    <th className="border border-black px-1 py-px">Pengajar</th>
                                    <th className="border border-black px-1 py-px w-20">Teknisi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from(scheduleByDay.entries()).map(([day, entries]) => {
                                    if (entries.length === 0) return null;
                                    let counter = 0;
                                    return (
                                        <React.Fragment key={day}>
                                            {/* Day Header Row */}
                                            <tr>
                                                <td colSpan={9} className="border border-black px-1 py-px font-bold bg-gray-200 text-[9pt] uppercase">
                                                    {day}
                                                </td>
                                            </tr>
                                            {/* Entries for this day */}
                                            {entries.map((entry) => {
                                                counter++;
                                                return (
                                                    <tr key={entry.id}>
                                                        <td className="border border-black px-1 py-px text-center">{counter}</td>
                                                        <td className="border border-black px-1 py-px">{entry.mataKuliah}</td>
                                                        <td className="border border-black px-1 py-px text-center">{entry.jam}</td>
                                                        <td className="border border-black px-1 py-px text-center">{entry.tempat}</td>
                                                        <td className="border border-black px-1 py-px text-center">{entry.prodi}</td>
                                                        <td className="border border-black px-1 py-px text-center">{entry.semester}</td>
                                                        <td className="border border-black px-1 py-px text-center">{entry.golongan}</td>
                                                        <td className="border border-black px-1 py-px">{entry.defaultPengajar}</td>
                                                        <td className="border border-black px-1 py-px">{entry.defaultTeknisi}</td>
                                                    </tr>
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

            {/* Print styles for jadwal */}
            {isPrintMode && (
                <style>{`
                    @media print {
                        @page { size: portrait; margin: 8mm; }
                        body { -webkit-print-color-adjust: exact; background-color: white !important; }
                        * { font-family: 'Calibri', sans-serif !important; }
                        body > * { visibility: hidden; }
                        .print-jadwal-view, .print-jadwal-view * { visibility: visible !important; }
                        .print-jadwal-view {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                        }
                        .print-jadwal-view table { page-break-inside: avoid; }
                    }
                `}</style>
            )}
        </PageShell>
    );
};

export default ScheduleTemplatePage;
