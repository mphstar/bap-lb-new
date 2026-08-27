import { useState, useRef, useEffect } from 'react';
import { Calendar, CheckCircle2, Download, Upload, AlertCircle, GraduationCap } from 'lucide-react';
import { useDialog } from '@/context/DialogContext';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
    PageShell,
    PageSections,
    PageHeader,
    Panel,
    PanelHeader,
    PanelBody,
} from '@/components/shell';
import type { WeekData, AppData, AssessmentForm } from '@/types';
import { exportAllUserData, parseImportedUserData } from '@/utils/storage';

interface SettingsPageProps {
    activeWeek: number;
    onActiveWeekChange: (week: number) => void;
    academicYear?: string;
    academicSemester?: string;
    onAcademicSettingsChange?: (year: string, semester: string) => void;
    templateCount: number;
    weeksData: WeekData[];
    // Export/Import
    appData: AppData;
    assessmentForms: AssessmentForm[];
    onImportData: (appData: AppData, assessmentForms: AssessmentForm[]) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
    activeWeek,
    onActiveWeekChange,
    academicYear = "2025/2026",
    academicSemester = "Genap",
    onAcademicSettingsChange,
    templateCount,
    weeksData,
    appData,
    assessmentForms,
    onImportData,
}) => {
    const { showConfirm } = useDialog();
    const [importError, setImportError] = useState<string | null>(null);
    const [importSuccess, setImportSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [yearValue, setYearValue] = useState(academicYear);
    const [semesterValue, setSemesterValue] = useState(academicSemester);

    useEffect(() => {
        setYearValue(academicYear || "2025/2026");
    }, [academicYear]);

    useEffect(() => {
        setSemesterValue(academicSemester || "Genap");
    }, [academicSemester]);

    const handleYearChange = (newYear: string) => {
        setYearValue(newYear);
        if (onAcademicSettingsChange) {
            onAcademicSettingsChange(newYear, semesterValue);
        }
    };

    const handleSemesterChange = (newSemester: string) => {
        setSemesterValue(newSemester);
        if (onAcademicSettingsChange) {
            onAcademicSettingsChange(yearValue, newSemester);
        }
    };

    const getWeekStatus = (wk: WeekData) => {
        if (wk.entries.length === 0) return 'empty';
        const filled = wk.entries.filter(e => e.materi.trim() !== '').length;
        if (filled === wk.entries.length) return 'complete';
        if (filled > 0) return 'partial';
        return 'empty';
    };

    const handleExport = () => {
        exportAllUserData(appData, assessmentForms);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        setImportError(null);
        setImportSuccess(false);

        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const parsed = parseImportedUserData(text);

            const isConfirmed = await showConfirm(
                "Impor Data",
                `Import data dari file "${file.name}"?\n\nIni akan mengganti SELURUH data Anda saat ini:\n• ${parsed.appData.scheduleTemplate.length} jadwal template\n• ${parsed.appData.weeks.length} minggu data\n• ${parsed.assessmentForms.length} form penilaian\n\nData yang sudah ada akan DITIMPA. Lanjutkan?`
            );
            if (!isConfirmed) {
                // Reset file input
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }

            onImportData(parsed.appData, parsed.assessmentForms);
            setImportSuccess(true);
            setTimeout(() => setImportSuccess(false), 5000);
        } catch (err: any) {
            setImportError(err.message || 'Gagal membaca file');
        }

        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <PageShell>
            <PageHeader
                title="Pengaturan"
                meta="Minggu aktif, status pengisian, dan cadangan data"
            />

            <PageSections className="max-w-3xl">
            {/* Active Week Setting */}
            <Panel>
                <PanelHeader
                    icon={<Calendar />}
                    title="Minggu aktif"
                    meta="Data Mingguan dan Preview akan default ke minggu ini."
                />
                <PanelBody>
                    <div className="flex items-center gap-4">
                        <label className="text-sm font-medium min-w-[120px]">Minggu Aktif:</label>
                        <Select
                            value={String(activeWeek)}
                            onValueChange={(val) => onActiveWeekChange(Number(val))}
                        >
                            <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="Pilih minggu" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
                                    <SelectItem key={w} value={String(w)}>
                                        Minggu {w}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </PanelBody>
            </Panel>

            {/* Academic Period Setting */}
            <Panel>
                <PanelHeader
                    icon={<GraduationCap />}
                    title="Periode Akademik"
                    meta="Pengaturan Semester dan Tahun Akademik untuk cetak BAP & Daftar Hadir."
                />
                <PanelBody className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Semester:</label>
                            <Select
                                value={semesterValue}
                                onValueChange={handleSemesterChange}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih semester" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Genap">Semester Genap</SelectItem>
                                    <SelectItem value="Ganjil">Semester Ganjil</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Tahun Akademik:</label>
                            <Input
                                type="text"
                                value={yearValue}
                                onChange={(e) => handleYearChange(e.target.value)}
                                placeholder="Contoh: 2025/2026"
                            />
                        </div>
                    </div>

                    {/* Live Preview of Document Header */}
                    <div className="rounded-control border border-rule bg-panel-2 p-3 space-y-1">
                        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
                            Pratinjau Kop Dokumen Cetak
                        </span>
                        <p className="font-serif text-xs font-bold text-foreground">
                            DAFTAR HADIR PEMBIMBING PRAKTIKUM LABORATORIUM DAN LAPANG
                        </p>
                        <p className="font-serif text-xs font-bold text-primary">
                            SEMESTER {(semesterValue || 'Genap').trim().toUpperCase()} TAHUN AKADEMIK {(yearValue || '2025/2026').trim()}
                        </p>
                    </div>
                </PanelBody>
            </Panel>

            {/* Week Overview */}
            <Panel>
                <PanelHeader
                    icon={<CheckCircle2 />}
                    title="Status minggu"
                    meta="Ringkasan pengisian data untuk setiap minggu."
                />
                <PanelBody>
                    {templateCount === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            Belum ada jadwal template. Buat jadwal terlebih dahulu.
                        </p>
                    ) : (
                        <div className="grid grid-cols-4 gap-3 sm:grid-cols-6 lg:grid-cols-8">
                            {weeksData.map(wk => {
                                const status = getWeekStatus(wk);
                                const filledCount = wk.entries.filter(e => e.materi.trim() !== '').length;
                                const isActive = wk.weekNumber === activeWeek;

                                return (
                                    <button
                                        key={wk.weekNumber}
                                        onClick={() => onActiveWeekChange(wk.weekNumber)}
                                        className={`relative rounded-control border p-3 text-left transition-colors duration-[180ms] ease-out ${isActive
                                            ? 'border-primary bg-primary/5'
                                            : 'border-rule hover:bg-panel-2'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-sm font-bold ${isActive ? 'text-primary' : ''}`}>
                                                M{wk.weekNumber}
                                            </span>
                                            {isActive && (
                                                <Badge className="text-[9px] h-4 px-1">Aktif</Badge>
                                            )}
                                        </div>
                                        <div data-numeric className="text-xs text-muted-foreground">
                                            {filledCount}/{wk.entries.length}
                                        </div>
                                        <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-colors ${status === 'complete'
                                                    ? 'bg-green-500'
                                                    : status === 'partial'
                                                        ? 'bg-amber-500'
                                                        : 'bg-muted'
                                                    }`}
                                                style={{
                                                    width: wk.entries.length > 0
                                                        ? `${(filledCount / wk.entries.length) * 100}%`
                                                        : '0%',
                                                }}
                                            />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </PanelBody>
            </Panel>

            {/* Export / Import */}
            <Panel>
                <PanelHeader
                    icon={<Download />}
                    title="Cadangan data"
                    meta="Export seluruh data akun ke satu file JSON, atau pulihkan dari berkas cadangan."
                />
                <PanelBody className="space-y-4">
                    {importError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{importError}</AlertDescription>
                        </Alert>
                    )}
                    {importSuccess && (
                        <Alert>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700">
                                Data berhasil diimport! Halaman akan dimuat ulang beberapa saat lagi.
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="flex flex-col gap-3 sm:flex-row">
                        <Button size="lg" className="flex-1" onClick={handleExport}>
                            <Download />
                            Export data
                        </Button>

                        <Button
                            size="lg"
                            variant="outline"
                            className="flex-1"
                            onClick={handleImportClick}
                        >
                            <Upload />
                            Import data
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="hidden"
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Export akan menyimpan: jadwal template, 16 minggu data, dosen list, student master, dan semua form penilaian dalam 1 file JSON.
                    </p>
                </PanelBody>
            </Panel>
            </PageSections>
        </PageShell>
    );
};

export default SettingsPage;
