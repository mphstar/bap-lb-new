/* Hallmark · genre: modern-minimal · macrostructure: Workbench (left-rail controls)
 * design-system: design.md · designed-as-app
 *
 * Layout note: the controls used to stack as four full-width rows above the
 * document — mode, sixteen wrapping week chips, prodi, then a utility strip
 * that also held the print button. The primary action was buried in a utility
 * bar while every other page in this app puts it in <PageHeader>, and the
 * pager sat far from the preview it drives.
 *
 * Now: one settings rail on the left, the document on the right. Print moves
 * to the header. The pager moves into the preview panel's own header.
 * Print output is untouched — both @media print blocks and both print views
 * are byte-for-byte what they were.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, ChevronDown, FileSignature, FileX2, Filter, Pen, ClipboardList, FileText, CalendarDays, Clock, ZoomIn, Check, Info, SlidersHorizontal, Settings2 } from 'lucide-react';
import {
    PageShell,
    PageHeader,
    Panel,
    PanelHeader,
    PanelBody,
    EmptyState,
} from '@/components/shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScheduleEntry, WeekData, MasterDosen } from '@/types';
import { generateBapData } from '@/utils/storage';
import { groupSessions } from '@/utils/dataGrouper';
import { groupSchedule } from '@/utils/scheduleOrder';
import RecapTable from '@/components/RecapTable';
import DaftarHadirDocument from '@/components/DaftarHadirDocument';
import SignaturePad from '@/components/SignaturePad';

type PrintMode = 'minggu' | 'per-sesi';
type PaperSize = 'a4' | 'f4';

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

/**
 * Distance from the top of each half-page to the document. Identical for the
 * top and bottom section, so the kop sits the exact same distance from the cut
 * edge and both halves match once the sheet is cut in two.
 */
const PERSESI_SECTION_PAD_TOP = '2mm';

interface PreviewPrintPageProps {
    template: ScheduleEntry[];
    weeks: WeekData[];
    activeWeek: number;
    dosenList?: MasterDosen[];
    academicYear?: string;
    academicSemester?: string;
    teknisiSignature?: string | null;
    onTeknisiSignatureChange?: (sig: string | null) => void;
}

/** Chip used by the week grid and the prodi filter — one control voice for both. */
function FilterChip({
    selected,
    className,
    ...props
}: React.ComponentProps<'button'> & { selected: boolean }) {
    return (
        <button
            type="button"
            aria-pressed={selected}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-control border px-3 py-1.5 text-sm font-medium transition-colors duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50
                ${selected
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-rule bg-panel text-muted-foreground hover:bg-panel-2 active:bg-tile'
                } ${className ?? ''}`}
            {...props}
        />
    );
}

const PreviewPrintPage: React.FC<PreviewPrintPageProps> = ({
    template,
    weeks,
    activeWeek: defaultWeek,
    dosenList = [],
    academicYear = "2025/2026",
    academicSemester = "Genap",
    teknisiSignature: initialTeknisiSig = null,
    onTeknisiSignatureChange
}) => {
    const [selectedWeek, setSelectedWeek] = useState(defaultWeek);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [printMode, setPrintMode] = useState<PrintMode>('minggu');
    const [paperSize, setPaperSize] = useState<PaperSize>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('bap_paper_size');
            if (saved === 'f4' || saved === 'a4') return saved;
        }
        return 'a4';
    });
    const [showSignature, setShowSignature] = useState(true);
    const [selectedProdi, setSelectedProdi] = useState<string>('all');
    const [selectedDay, setSelectedDay] = useState<string>('all');
    const [showSignaturePanel, setShowSignaturePanel] = useState(false);
    const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
    const [isPrintMingguGuideOpen, setIsPrintMingguGuideOpen] = useState(false);
    const [isPrintGuideOpen, setIsPrintGuideOpen] = useState(false);
    const [pendingWithSignature, setPendingWithSignature] = useState(true);

    const handlePaperSizeChange = (size: PaperSize) => {
        setPaperSize(size);
        try {
            localStorage.setItem('bap_paper_size', size);
        } catch {}
    };

    // Signature state — synced with DB & fallback to localStorage
    const [teknisiSignature, setTeknisiSignature] = useState<string | null>(() => {
        if (initialTeknisiSig) return initialTeknisiSig;
        if (typeof window !== 'undefined') return localStorage.getItem('bap_signature_teknisi');
        return null;
    });

    useEffect(() => {
        if (initialTeknisiSig !== undefined) {
            setTeknisiSignature(initialTeknisiSig);
        }
    }, [initialTeknisiSig]);

    const handleTeknisiSigChange = (sig: string | null) => {
        setTeknisiSignature(sig);
        if (onTeknisiSignatureChange) {
            onTeknisiSignatureChange(sig);
        }
        try {
            if (sig) localStorage.setItem('bap_signature_teknisi', sig);
            else localStorage.removeItem('bap_signature_teknisi');
        } catch {}
    };

    // Sync with global active week when it changes
    useEffect(() => {
        setSelectedWeek(defaultWeek);
    }, [defaultWeek]);

    const weekData = weeks.find(w => w.weekNumber === selectedWeek);
    const bapData = useMemo(() => {
        if (!weekData) return [];
        // Order like the weekly editor: each course + class grouped together,
        // so per-sesi pagination and the recap follow the same sequence.
        return groupSchedule(generateBapData(template, weekData));
    }, [template, weekData]);

    // Extract unique prodi & day values from bapData
    const prodiList = useMemo(() => {
        const set = new Set(bapData.map(d => d.prodi).filter(Boolean));
        return Array.from(set).sort();
    }, [bapData]);

    const dayList = useMemo(() => {
        const set = new Set(bapData.map(d => d.hari).filter(Boolean));
        return DAY_ORDER.filter(day => set.has(day));
    }, [bapData]);

    // Filter bapData by selected prodi and day
    const filteredBapData = useMemo(() => {
        let result = bapData;
        if (selectedProdi !== 'all') result = result.filter(d => d.prodi === selectedProdi);
        if (selectedDay !== 'all') result = result.filter(d => d.hari === selectedDay);
        return result;
    }, [bapData, selectedProdi, selectedDay]);

    const groupedData = useMemo(() => groupSessions(filteredBapData), [filteredBapData]);

    // Filtering can leave currentIndex past the end of the new list.
    const safeIndex = filteredBapData.length > 0
        ? Math.min(currentIndex, filteredBapData.length - 1)
        : 0;
    const currentDoc = filteredBapData[safeIndex];

    if (template.length === 0) {
        return (
            <PageShell>
                <PageHeader title="Preview & Print" meta="Belum ada dokumen untuk dipracetak" />
                <EmptyState
                    icon={<Printer />}
                    title="Belum ada jadwal template"
                    description="Buat jadwal template terlebih dahulu sebelum mencetak dokumen BAP."
                />
            </PageShell>
        );
    }

    const handlePrint = (withSignature: boolean) => {
        setPendingWithSignature(withSignature);
        setIsPrintGuideOpen(true);
    };

    const confirmAndPrint = () => {
        setIsPrintGuideOpen(false);
        setShowSignature(pendingWithSignature);
        setTimeout(() => window.print(), 200);
    };

    const handlePrintMinggu = () => {
        setIsPrintMingguGuideOpen(true);
    };

    const confirmAndPrintMinggu = () => {
        setIsPrintMingguGuideOpen(false);
        setTimeout(() => window.print(), 200);
    };

    const nextDoc = () => {
        if (safeIndex < filteredBapData.length - 1) setCurrentIndex(safeIndex + 1);
    };

    const prevDoc = () => {
        if (safeIndex > 0) setCurrentIndex(safeIndex - 1);
    };

    const handleWeekChange = (week: number) => {
        setSelectedWeek(week);
        setCurrentIndex(0);
        setSelectedProdi('all');
        setSelectedDay('all');
    };

    const handleModeChange = (mode: PrintMode) => {
        setPrintMode(mode);
        setCurrentIndex(0);
    };

    const handleProdiChange = (prodi: string) => {
        setSelectedProdi(prodi);
        setCurrentIndex(0);
    };

    const handleDayChange = (day: string) => {
        setSelectedDay(day);
        setCurrentIndex(0);
    };

    return (
        <PageShell className="print:block print:p-0">
            <PageHeader
                title="Preview & Print"
                meta={`Minggu ${selectedWeek} — ${filteredBapData.length} dokumen`}
                actions={
                    <div className="flex items-center gap-2">
                        {/* Mobile Settings Drawer Button */}
                        <Button
                            variant="outline"
                            onClick={() => setIsMobileOptionsOpen(true)}
                            className="lg:hidden text-xs h-9 gap-1.5 border-rule bg-panel-2"
                        >
                            <SlidersHorizontal className="size-3.5 text-primary" />
                            <span>Opsi Cetak</span>
                        </Button>

                        {printMode === 'minggu' ? (
                            <Button onClick={handlePrintMinggu} disabled={filteredBapData.length === 0} className="text-xs h-9">
                                <Printer className="size-3.5" />
                                <span>Cetak Minggu {selectedWeek}</span>
                            </Button>
                        ) : (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button disabled={filteredBapData.length === 0} className="text-xs h-9">
                                        <Printer className="size-3.5" />
                                        <span>Cetak Per Sesi</span>
                                        <ChevronDown className="size-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-56">
                                    <DropdownMenuItem onSelect={() => handlePrint(true)}>
                                        <FileSignature />
                                        Dengan tanda tangan
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={() => handlePrint(false)}>
                                        <FileX2 />
                                        Tanpa tanda tangan
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                }
            />

            {/* Mobile Quick Control Bar (Mode, Week, Paper Chip) */}
            <div className="lg:hidden flex flex-col gap-2.5 mb-4 p-3 rounded-panel bg-panel border border-rule print:hidden">
                <div className="flex items-center justify-between gap-2">
                    {/* Mode Toggle */}
                    <div className="inline-flex rounded-control border border-rule bg-panel-2 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => handleModeChange('minggu')}
                            className={`px-2.5 py-1 rounded-control font-medium transition-colors ${
                                printMode === 'minggu'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Per Minggu
                        </button>
                        <button
                            type="button"
                            onClick={() => handleModeChange('per-sesi')}
                            className={`px-2.5 py-1 rounded-control font-medium transition-colors ${
                                printMode === 'per-sesi'
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Per Sesi
                        </button>
                    </div>

                    {/* Paper Size Pill */}
                    <div className="inline-flex rounded-control border border-rule bg-panel-2 p-0.5 text-xs">
                        <button
                            type="button"
                            onClick={() => handlePaperSizeChange('a4')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                paperSize === 'a4'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            A4
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePaperSizeChange('f4')}
                            className={`px-2 py-0.5 rounded font-bold transition-colors ${
                                paperSize === 'f4'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground'
                            }`}
                        >
                            F4
                        </button>
                </div>
            </div>

            {/* ── Mobile Options Bottom Sheet ────────────────────── */}
            <Sheet open={isMobileOptionsOpen} onOpenChange={setIsMobileOptionsOpen}>
                <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-6 pt-4 max-h-[85vh] overflow-y-auto">
                    <SheetHeader className="pb-3 border-b border-rule">
                        <SheetTitle className="text-base font-semibold flex items-center gap-2">
                            <Settings2 className="size-4 text-primary" />
                            <span>Pengaturan Cetak & Dokumen</span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="py-4 space-y-4 text-xs">
                        {/* Filter Prodi */}
                        <div>
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                                Program Studi ({selectedProdi === 'all' ? 'Semua' : selectedProdi})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <FilterChip
                                    selected={selectedProdi === 'all'}
                                    onClick={() => handleProdiChange('all')}
                                >
                                    Semua Prodi
                                </FilterChip>
                                {prodiList.map(prodi => (
                                    <FilterChip
                                        key={prodi}
                                        selected={selectedProdi === prodi}
                                        onClick={() => handleProdiChange(prodi)}
                                    >
                                        {prodi}
                                    </FilterChip>
                                ))}
                            </div>
                        </div>

                        {/* Filter Hari */}
                        <div className="pt-3 border-t border-rule/60">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                                Filter Hari ({selectedDay === 'all' ? 'Semua' : selectedDay})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                <FilterChip
                                    selected={selectedDay === 'all'}
                                    onClick={() => handleDayChange('all')}
                                >
                                    Semua Hari
                                </FilterChip>
                                {dayList.map(day => (
                                    <FilterChip
                                        key={day}
                                        selected={selectedDay === day}
                                        onClick={() => handleDayChange(day)}
                                    >
                                        {day}
                                    </FilterChip>
                                ))}
                            </div>
                        </div>

                        {/* Zoom Control */}
                        <div className="pt-3 border-t border-rule/60 flex items-center justify-between">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                Zoom Pratinjau
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setScale(s => Math.max(0.4, Number((s - 0.1).toFixed(1))))}
                                    className="h-7 w-8 text-xs"
                                >
                                    -
                                </Button>
                                <span className="font-mono font-bold text-xs">{Math.round(scale * 100)}%</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setScale(s => Math.min(1.5, Number((s + 0.1).toFixed(1))))}
                                    className="h-7 w-8 text-xs"
                                >
                                    +
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setScale(1)}
                                    className="h-7 text-xs"
                                >
                                    Reset
                                </Button>
                            </div>
                        </div>

                        {/* Tanda Tangan Teknisi Toggle & Pad */}
                        <div className="pt-3 border-t border-rule/60">
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-semibold text-muted-foreground uppercase tracking-wider">
                                    Paraf / TTD Teknisi
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowSignaturePanel(!showSignaturePanel)}
                                    className="h-7 text-xs text-primary"
                                >
                                    {showSignaturePanel ? 'Tutup' : 'Atur Paraf'}
                                </Button>
                            </div>
                            {showSignaturePanel && (
                                <div className="mt-2 p-3 rounded-panel bg-panel-2 border border-rule">
                                    <SignaturePad
                                        value={teknisiSignature}
                                        onChange={handleTeknisiSigChange}
                                        label="Paraf Teknisi"
                                        height={120}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-3 border-t border-rule">
                        <Button
                            className="w-full text-xs h-9 font-semibold"
                            onClick={() => setIsMobileOptionsOpen(false)}
                        >
                            Terapkan & Tutup
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

                {/* Horizontal Scroll Week Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1 border-t border-rule/50">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase mr-1 shrink-0">Mg:</span>
                    {weeks.map(w => (
                        <button
                            key={w.weekNumber}
                            type="button"
                            onClick={() => handleWeekChange(w.weekNumber)}
                            className={`size-7 rounded-control text-xs font-semibold shrink-0 transition-colors ${
                                w.weekNumber === selectedWeek
                                    ? 'bg-foreground text-background shadow-xs'
                                    : 'bg-panel-2 border border-rule text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            {w.weekNumber}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] print:block">
                {/* ── Settings rail (Desktop only, hidden on mobile) ─────── */}
                <div className="hidden lg:flex flex-col gap-4 lg:sticky lg:top-7 lg:self-start print:hidden">
                    <Panel>
                        <PanelHeader
                            icon={<ClipboardList />}
                            title="Mode cetak"
                            meta={printMode === 'minggu' ? 'Rekap satu minggu' : 'Daftar hadir per sesi'}
                        />
                        <PanelBody className="space-y-5">
                            {/* Mode — segmented, two options */}
                            <div
                                role="group"
                                aria-label="Mode cetak"
                                className="grid grid-cols-2 gap-1 rounded-control border border-rule bg-panel-2 p-1"
                            >
                                {([
                                    { mode: 'minggu' as const, label: 'Per minggu', icon: <ClipboardList className="size-4" /> },
                                    { mode: 'per-sesi' as const, label: 'Per sesi', icon: <FileText className="size-4" /> },
                                ]).map(opt => (
                                    <button
                                        key={opt.mode}
                                        type="button"
                                        aria-pressed={printMode === opt.mode}
                                        onClick={() => handleModeChange(opt.mode)}
                                        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1.5 text-sm font-semibold transition-colors duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                                            ${printMode === opt.mode
                                                ? 'bg-panel text-foreground'
                                                : 'text-muted-foreground hover:text-foreground active:bg-tile'
                                            }`}
                                    >
                                        {opt.icon}
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </PanelBody>
                    </Panel>

                    {/* Paper Size — A4 vs F4 */}
                    <Panel>
                        <PanelHeader
                            icon={<FileText />}
                            title="Ukuran Kertas"
                            meta={paperSize === 'a4' ? 'A4 (210 × 297 mm)' : 'F4 / Folio (215 × 330 mm)'}
                        />
                        <PanelBody className="space-y-3">
                            <div
                                role="group"
                                aria-label="Ukuran kertas"
                                className="grid grid-cols-2 gap-1.5"
                            >
                                {([
                                    { size: 'a4' as const, label: 'A4', desc: '210 × 297 mm' },
                                    { size: 'f4' as const, label: 'F4 / Folio', desc: '215 × 330 mm' },
                                ]).map(opt => {
                                    const active = paperSize === opt.size;
                                    return (
                                        <button
                                            key={opt.size}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => handlePaperSizeChange(opt.size)}
                                            className={`relative inline-flex flex-col items-center justify-center gap-0.5 rounded-control border-2 px-2 py-2.5 transition-colors duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                                                ${active
                                                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                                                    : 'border-rule bg-panel text-muted-foreground hover:border-foreground/30 hover:text-foreground active:bg-tile'
                                                }`}
                                        >
                                            {active && (
                                                <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary-foreground text-primary">
                                                    <Check className="size-3" strokeWidth={3} />
                                                </span>
                                            )}
                                            <span className="text-sm font-bold">{opt.label}</span>
                                            <span className={`text-[10px] font-normal ${active ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                {opt.desc}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Print margin hint */}
                            <div className="flex gap-2 rounded-control border border-rule bg-brand-soft/60 px-3 py-2 text-xs leading-snug text-foreground">
                                <Info className="mt-0.5 size-3.5 shrink-0 text-brand" />
                                <span>
                                    Jika halaman terpotong, atur opsi <strong>Layout (Landscape/Portrait)</strong> dan <strong>Margins: Default / Minimal</strong> langsung pada jendela cetak browser.
                                </span>
                            </div>
                        </PanelBody>
                    </Panel>

                    {/* Week — a 4-column grid instead of sixteen wrapping chips.
                        Same sixteen weeks, one quarter of the vertical space. */}
                    <Panel>
                        <PanelHeader
                            icon={<CalendarDays />}
                            title="Minggu"
                            meta={`Minggu ${selectedWeek} dipilih`}
                        />
                        <PanelBody>
                            <div className="grid grid-cols-4 gap-1.5">
                                {weeks.map(w => (
                                    <FilterChip
                                        key={w.weekNumber}
                                        selected={w.weekNumber === selectedWeek}
                                        onClick={() => handleWeekChange(w.weekNumber)}
                                        aria-label={`Minggu ${w.weekNumber}`}
                                        className="px-0"
                                    >
                                        <span data-numeric>{w.weekNumber}</span>
                                    </FilterChip>
                                ))}
                            </div>
                        </PanelBody>
                    </Panel>

                    {/* Prodi filter */}
                    <Panel>
                        <PanelHeader
                            icon={<Filter />}
                            title="Program studi"
                            meta={selectedProdi === 'all' ? 'Semua prodi' : selectedProdi}
                        />
                        <PanelBody>
                            <div className="flex flex-wrap gap-1.5">
                                <FilterChip
                                    selected={selectedProdi === 'all'}
                                    onClick={() => handleProdiChange('all')}
                                >
                                    Semua
                                </FilterChip>
                                {prodiList.map(prodi => (
                                    <FilterChip
                                        key={prodi}
                                        selected={selectedProdi === prodi}
                                        onClick={() => handleProdiChange(prodi)}
                                    >
                                        {prodi}
                                    </FilterChip>
                                ))}
                            </div>
                        </PanelBody>
                    </Panel>

                    {/* Day filter */}
                    <Panel>
                        <PanelHeader
                            icon={<Clock />}
                            title="Hari"
                            meta={selectedDay === 'all' ? 'Semua hari' : selectedDay}
                        />
                        <PanelBody>
                            <div className="flex flex-wrap gap-1.5">
                                <FilterChip
                                    selected={selectedDay === 'all'}
                                    onClick={() => handleDayChange('all')}
                                >
                                    Semua
                                </FilterChip>
                                {dayList.map(day => (
                                    <FilterChip
                                        key={day}
                                        selected={selectedDay === day}
                                        onClick={() => handleDayChange(day)}
                                    >
                                        {day}
                                    </FilterChip>
                                ))}
                            </div>
                        </PanelBody>
                    </Panel>

                    {/* Zoom */}
                    <Panel>
                        <PanelHeader
                            icon={<ZoomIn />}
                            title="Zoom preview"
                            meta="Tidak memengaruhi hasil cetak"
                            action={
                                <span
                                    data-numeric
                                    className="text-sm font-semibold text-foreground"
                                >
                                    {Math.round(scale * 100)}%
                                </span>
                            }
                        />
                        <PanelBody className="space-y-3">
                            <input
                                type="range"
                                min="0.1"
                                max="1.5"
                                step="0.01"
                                value={scale}
                                onChange={(e) => setScale(parseFloat(e.target.value))}
                                aria-label="Zoom preview"
                                className="hm-range"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setScale(1)}
                                disabled={scale === 1}
                                className="w-full"
                            >
                                Kembalikan ke 100%
                            </Button>
                        </PanelBody>
                    </Panel>

                    {/* Signature — Per-Sesi mode only */}
                    {printMode === 'per-sesi' && (
                        <Panel>
                            <button
                                type="button"
                                onClick={() => setShowSignaturePanel(!showSignaturePanel)}
                                aria-expanded={showSignaturePanel}
                                className="flex w-full items-center gap-3 rounded-panel px-5 py-4 text-left transition-colors duration-[180ms] ease-out hover:bg-panel-2 active:bg-tile focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            >
                                <span className="flex size-10 shrink-0 items-center justify-center rounded-tile bg-brand-soft text-brand [&_svg]:size-[1.125rem]">
                                    <Pen />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-semibold text-foreground">
                                        Tanda tangan teknisi
                                    </span>
                                    <span className="block truncate text-xs text-muted-foreground">
                                        {teknisiSignature ? 'Tersimpan' : 'Belum diisi'}
                                    </span>
                                </span>
                                <ChevronDown
                                    className={`size-4 shrink-0 text-muted-foreground transition-transform duration-[180ms] ease-out ${showSignaturePanel ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {showSignaturePanel && (
                                <div className="border-t border-rule p-5">
                                    <SignaturePad
                                        label="Tanda Tangan Teknisi"
                                        value={teknisiSignature}
                                        onChange={handleTeknisiSigChange}
                                    />
                                </div>
                            )}
                        </Panel>
                    )}
                </div>

                {/* ── Preview ───────────────────────────────────────────── */}
                <div className="min-w-0">
                    {filteredBapData.length === 0 ? (
                        <EmptyState
                            className="print:hidden"
                            icon={<FileText />}
                            title="Tidak ada dokumen"
                            description={
                                selectedProdi !== 'all' && selectedDay !== 'all'
                                    ? `Tidak ada sesi untuk prodi ${selectedProdi} dan hari ${selectedDay} di minggu ${selectedWeek}.`
                                    : selectedProdi !== 'all'
                                        ? `Tidak ada sesi untuk prodi ${selectedProdi} di minggu ${selectedWeek}.`
                                        : selectedDay !== 'all'
                                            ? `Tidak ada sesi pada hari ${selectedDay} di minggu ${selectedWeek}.`
                                            : `Minggu ${selectedWeek} belum punya data untuk dicetak.`
                            }
                        />
                    ) : printMode === 'minggu' ? (
                        /* ═══ MODE: PRINT MINGGU ═══ */
                        <>
                            <Panel className="overflow-hidden print:hidden">
                                <PanelHeader
                                    icon={<ClipboardList />}
                                    title={`Rekap Minggu ${selectedWeek}`}
                                    meta={`${filteredBapData.length} sesi · Format ${paperSize.toUpperCase()}`}
                                />
                                <div className="hm-scrollbar overflow-x-auto bg-white p-4">
                                    {/* `zoom`, not `transform: scale` — zoom reflows the
                                        box, so the frame tracks the preview instead of
                                        leaving a phantom gap under it. */}
                                    <div className="w-full" style={{ zoom: scale }}>
                                        <div
                                            className="w-full pb-3 pt-2 text-center text-lg md:text-xl font-bold uppercase tracking-wider text-black"
                                            style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                        >
                                            Berita Acara Perkuliahan Minggu {selectedWeek}
                                        </div>
                                        <RecapTable groups={groupedData} />
                                    </div>
                                </div>
                            </Panel>

                            {/* Dedicated Print View for Recap Minggu (Clean, no panels/scrollbars) */}
                            <div className="hidden print:block print-minggu-view w-full bg-white">
                                <div
                                    className="w-full pb-3 pt-2 text-center text-lg md:text-xl font-bold uppercase tracking-wider text-black"
                                    style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                >
                                    Berita Acara Perkuliahan Minggu {selectedWeek}
                                </div>
                                <RecapTable groups={groupedData} />
                            </div>
                        </>
                    ) : (
                        /* ═══ MODE: PRINT PER-SESI ═══ */
                        <>
                            {/* Screen Preview — the pager now lives with the document it drives */}
                            <Panel className="overflow-hidden print:hidden">
                                <PanelHeader
                                    icon={<FileText />}
                                    title="Daftar Hadir"
                                    meta={`Dokumen ${safeIndex + 1} dari ${filteredBapData.length} · Format ${paperSize.toUpperCase()} · ${currentDoc.mataKuliah ?? ''}`}
                                    action={
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={prevDoc}
                                                disabled={safeIndex === 0}
                                                aria-label="Dokumen sebelumnya"
                                            >
                                                <ChevronLeft />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon-sm"
                                                onClick={nextDoc}
                                                disabled={safeIndex === filteredBapData.length - 1}
                                                aria-label="Dokumen berikutnya"
                                            >
                                                <ChevronRight />
                                            </Button>
                                        </div>
                                    }
                                />
                                <div className="hm-scrollbar overflow-x-auto bg-white p-2 sm:p-4 rounded-b-panel border-t border-rule">
                                    <div className="inline-block min-w-full" style={{ zoom: scale }}>
                                        <DaftarHadirDocument
                                            data={currentDoc}
                                            isLast={true}
                                            paperSize={paperSize}
                                            showSignature={showSignature}
                                            dosenSignature={showSignature ? (dosenList.find(d => d.name === currentDoc.pengajar)?.signature || null) : null}
                                            teknisiSignature={showSignature ? teknisiSignature : null}
                                            academicYear={academicYear}
                                            academicSemester={academicSemester}
                                        />
                                    </div>
                                </div>
                            </Panel>

                            {/* Print View — all sessions with page breaks (2 per page) */}
                            <div className="hidden print:block print-persesi-view bg-white">
                                {Array.from({ length: Math.ceil(filteredBapData.length / 2) }).map((_, pageIdx) => {
                                    const itemsOnPage = filteredBapData.slice(pageIdx * 2, pageIdx * 2 + 2);
                                    return (
                                        <div
                                            key={pageIdx}
                                            className="print-sheet-page"
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {itemsOnPage.map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    className="print-half-slot"
                                                    style={{
                                                        width: '100%',
                                                        borderBottom: itemIdx === 0 && itemsOnPage.length > 1 ? '1.5px dashed #000' : 'none',
                                                        boxSizing: 'border-box',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        justifyContent: 'flex-start',
                                                        paddingTop: '6mm',
                                                        paddingBottom: '4mm',
                                                        paddingLeft: '12mm',
                                                        paddingRight: '12mm'
                                                    }}
                                                >
                                                    <div style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
                                                        <DaftarHadirDocument
                                                            data={item}
                                                            isLast={true}
                                                            paperSize={paperSize}
                                                            showSignature={showSignature}
                                                            dosenSignature={showSignature ? (dosenList.find(d => d.name === item.pengajar)?.signature || null) : null}
                                                            teknisiSignature={showSignature ? teknisiSignature : null}
                                                            academicYear={academicYear}
                                                            academicSemester={academicSemester}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                            {itemsOnPage.length === 1 && (
                                                <div
                                                    className="print-half-slot"
                                                    style={{
                                                        width: '100%',
                                                        boxSizing: 'border-box'
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal Informasi Pengaturan Cetak Per Minggu */}
            <Dialog open={isPrintMingguGuideOpen} onOpenChange={setIsPrintMingguGuideOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Petunjuk Cetak Rekap Mingguan</DialogTitle>
                        <DialogDescription>
                            Pastikan pengaturan pada jendela cetak browser sesuai agar rekap tercetak rapi dan tidak terpotong.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-sm">
                        <div className="flex items-start gap-3 rounded-control border border-rule bg-panel-2 p-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                1
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Orientasi: Lanskap (Landscape)</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pastikan tata letak kertas diatur ke <strong>Landscape</strong> (Lanskap / Mendatar).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-control border border-rule bg-panel-2 p-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                2
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Set Margin ke &quot;Default&quot;</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pilih <strong>Margins: Default</strong> (bukan None) agar bagian atas dan bawah halaman memiliki batas margin yang pas dan tidak terpotong.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-control border border-rule bg-panel-2 p-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                3
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Ukuran Kertas: {paperSize.toUpperCase()}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pilih ukuran kertas <strong>{paperSize === 'f4' ? 'Folio / F4 / Legal' : 'A4'}</strong> dan nonaktifkan opsi <em>Headers and footers</em>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsPrintMingguGuideOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={confirmAndPrintMinggu}>
                            Lanjutkan Cetak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Modal Informasi Pengaturan Cetak Per Sesi */}
            <Dialog open={isPrintGuideOpen} onOpenChange={setIsPrintGuideOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Petunjuk Cetak Presisi (Per Sesi)</DialogTitle>
                        <DialogDescription>
                            Pastikan pengaturan pada jendela cetak browser sesuai agar garis potong tengah tepat 50:50.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-sm">
                        <div className="flex items-start gap-3 rounded-control border border-rule bg-panel-2 p-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                1
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Set Margin ke &quot;Default&quot;</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Untuk mode Rekap Mingguan, biarkan <strong>Margins: Default</strong> (atau ubah ke <strong>None</strong> untuk mode Per Sesi).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 rounded-control border border-rule bg-panel-2 p-3">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                2
                            </div>
                            <div>
                                <p className="font-semibold text-foreground">Ukuran Kertas: {paperSize.toUpperCase()}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Pilih ukuran kertas yang sesuai ({paperSize === 'f4' ? 'Folio / F4 / Legal' : 'A4'}) dan nonaktifkan opsi <em>Headers and footers</em>.
                                </p>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsPrintGuideOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={confirmAndPrint}>
                            Lanjutkan Cetak
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Dynamic print styles based on mode */}
            {printMode === 'minggu' ? (
                <style>{`
                    @media print {
                        @page {
                            size: auto;
                            margin: 12mm 12mm 15mm 12mm;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            background-color: white !important;
                            overflow: visible !important;
                            height: auto !important;
                            min-height: 0 !important;
                            max-height: none !important;
                            scrollbar-width: none !important;
                            -webkit-print-color-adjust: exact;
                            print-color-adjust: exact;
                            font-family: 'Times New Roman', Times, serif !important;
                        }
                        div[data-slot="page-shell"],
                        main,
                        .hm-page-transition,
                        [data-sidebar="inset"],
                        body > div {
                            height: auto !important;
                            min-height: 0 !important;
                            max-height: none !important;
                            overflow: visible !important;
                            display: block !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        ::-webkit-scrollbar {
                            display: none !important;
                        }
                        * {
                            font-family: 'Times New Roman', Times, serif !important;
                            scrollbar-width: none !important;
                        }
                        .print-minggu-view {
                            width: 100% !important;
                            box-sizing: border-box !important;
                            padding: 0 !important;
                            margin: 0 !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                        .print-minggu-view table {
                            width: 100% !important;
                            border-collapse: collapse !important;
                            table-layout: auto !important;
                        }
                        .print-minggu-view thead {
                            display: table-header-group !important;
                        }
                        .print-minggu-view tbody {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                        }
                        .print-minggu-view tr {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                        .print-minggu-view td, .print-minggu-view th {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                        }
                        .print-persesi-view { display: none !important; }
                    }
                `}</style>
            ) : (
                <style>{`
                    @media print {
                        @page {
                            size: portrait;
                            margin: 0mm;
                        }
                        *, *:before, *:after {
                            box-sizing: border-box !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            height: auto !important;
                            min-height: 0 !important;
                            background-color: white !important;
                            overflow: visible !important;
                            scrollbar-width: none !important;
                        }
                        div[data-slot="page-shell"],
                        main,
                        .hm-page-transition,
                        [data-sidebar="inset"],
                        body > div {
                            height: auto !important;
                            min-height: 0 !important;
                            max-height: none !important;
                            overflow: visible !important;
                            display: block !important;
                            padding: 0 !important;
                            margin: 0 !important;
                        }
                        ::-webkit-scrollbar {
                            display: none !important;
                        }
                        body { -webkit-print-color-adjust: exact; font-family: 'Times New Roman', Times, serif !important; }
                        * {
                            font-family: 'Times New Roman', Times, serif !important;
                            scrollbar-width: none !important;
                        }
                        .print-minggu-view { display: none !important; }
                        .print-persesi-view { margin: 0 !important; padding: 0 !important; overflow: visible !important; display: block !important; }
                        .print-sheet-page {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: 100vh !important;
                            max-height: 100vh !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                            box-sizing: border-box !important;
                            display: flex !important;
                            flex-direction: column !important;
                            overflow: hidden !important;
                        }
                        .print-sheet-page:not(:last-child) {
                            page-break-after: always !important;
                            break-after: page !important;
                        }
                        .print-sheet-page:last-child {
                            page-break-after: avoid !important;
                            break-after: avoid !important;
                            margin-bottom: 0 !important;
                        }
                        .print-half-slot {
                            flex: 1 1 50% !important;
                            height: 50% !important;
                            max-height: 50% !important;
                            box-sizing: border-box !important;
                            padding-top: 6mm !important;
                            padding-bottom: 4mm !important;
                            padding-left: 12mm !important;
                            padding-right: 12mm !important;
                        }
                    }
                `}</style>
            )}
        </PageShell>
    );
};

export default PreviewPrintPage;
