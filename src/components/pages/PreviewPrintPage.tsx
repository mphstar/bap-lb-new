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
import { Printer, ChevronLeft, ChevronRight, ChevronDown, FileSignature, FileX2, Filter, Pen, ClipboardList, FileText, CalendarDays, Clock, ZoomIn } from 'lucide-react';
import {
    PageShell,
    PageHeader,
    Panel,
    PanelHeader,
    PanelBody,
    EmptyState,
} from '@/components/shell';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ScheduleEntry, WeekData, MasterDosen } from '@/types';
import { generateBapData } from '@/utils/storage';
import { groupSessions } from '@/utils/dataGrouper';
import RecapTable from '@/components/RecapTable';
import DaftarHadirDocument from '@/components/DaftarHadirDocument';
import SignaturePad from '@/components/SignaturePad';

type PrintMode = 'minggu' | 'per-sesi';

const DAY_ORDER = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

interface PreviewPrintPageProps {
    template: ScheduleEntry[];
    weeks: WeekData[];
    activeWeek: number;
    dosenList?: MasterDosen[];
    academicYear?: string;
    academicSemester?: string;
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
    academicSemester = "Genap"
}) => {
    const [selectedWeek, setSelectedWeek] = useState(defaultWeek);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [printMode, setPrintMode] = useState<PrintMode>('minggu');
    const [showSignature, setShowSignature] = useState(true);
    const [selectedProdi, setSelectedProdi] = useState<string>('all');
    const [selectedDay, setSelectedDay] = useState<string>('all');
    const [showSignaturePanel, setShowSignaturePanel] = useState(false);

    // Signature state — persisted in localStorage
    const [teknisiSignature, setTeknisiSignature] = useState<string | null>(() => {
        if (typeof window !== 'undefined') return localStorage.getItem('bap_signature_teknisi');
        return null;
    });

    const handleTeknisiSigChange = (sig: string | null) => {
        setTeknisiSignature(sig);
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
        return generateBapData(template, weekData);
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
        setShowSignature(withSignature);
        // Small delay so React can re-render the document before the print dialog opens
        setTimeout(() => window.print(), 100);
    };

    const handlePrintMinggu = () => window.print();

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
                    printMode === 'minggu' ? (
                        <Button onClick={handlePrintMinggu} disabled={filteredBapData.length === 0}>
                            <Printer />
                            Cetak minggu {selectedWeek}
                        </Button>
                    ) : (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button disabled={filteredBapData.length === 0}>
                                    <Printer />
                                    Cetak per sesi
                                    <ChevronDown />
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
                    )
                }
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[19rem_minmax(0,1fr)] print:block">
                {/* ── Settings rail ─────────────────────────────────────── */}
                <div className="flex flex-col gap-4 lg:sticky lg:top-7 lg:self-start print:hidden">
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
                        /* ═══ MODE: PRINT MINGGU ═══
                           Screen and print render the SAME node, so the preview
                           always matches the output. */
                        <Panel className="overflow-hidden print:rounded-none print:border-0">
                            <PanelHeader
                                className="print:hidden"
                                icon={<ClipboardList />}
                                title={`Rekap Minggu ${selectedWeek}`}
                                meta={`${filteredBapData.length} sesi · orientasi lanskap`}
                            />
                            <div className="hm-scrollbar overflow-x-auto bg-white print:overflow-visible">
                                {/* `zoom`, not `transform: scale` — zoom reflows the
                                    box, so the frame tracks the preview instead of
                                    leaving a phantom gap under it. */}
                                <div className="print-minggu-view w-full" style={{ zoom: scale }}>
                                    <div
                                        className="w-full pb-4 pt-4 text-center text-xl font-bold uppercase tracking-widest text-black"
                                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                                    >
                                        Berita Acara Perkuliahan Minggu {selectedWeek}
                                    </div>
                                    <RecapTable groups={groupedData} />
                                </div>
                            </div>
                        </Panel>
                    ) : (
                        /* ═══ MODE: PRINT PER-SESI ═══ */
                        <>
                            {/* Screen Preview — the pager now lives with the document it drives */}
                            <Panel className="overflow-hidden print:hidden">
                                <PanelHeader
                                    icon={<FileText />}
                                    title="Daftar Hadir"
                                    meta={`Dokumen ${safeIndex + 1} dari ${filteredBapData.length} · ${currentDoc.mataKuliah ?? ''}`}
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
                                <div className="hm-scrollbar overflow-x-auto bg-white">
                                    <div style={{ zoom: scale }}>
                                        <DaftarHadirDocument
                                            data={currentDoc}
                                            isLast={true}
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
                                            style={{
                                                width: '210mm',
                                                height: '297mm',
                                                pageBreakAfter: pageIdx < Math.ceil(filteredBapData.length / 2) - 1 ? 'always' : 'auto',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                boxSizing: 'border-box'
                                            }}
                                        >
                                            {itemsOnPage.map((item, itemIdx) => (
                                                <div
                                                    key={itemIdx}
                                                    style={{
                                                        flex: '1 1 50%',
                                                        height: '50%',
                                                        overflow: 'hidden',
                                                        borderBottom: itemIdx === 0 && itemsOnPage.length > 1 ? '2px dashed #1f2937' : 'none',
                                                        boxSizing: 'border-box'
                                                    }}
                                                >
                                                    <DaftarHadirDocument
                                                        data={item}
                                                        isLast={true}
                                                        showSignature={showSignature}
                                                        dosenSignature={showSignature ? (dosenList.find(d => d.name === item.pengajar)?.signature || null) : null}
                                                        teknisiSignature={showSignature ? teknisiSignature : null}
                                                        academicYear={academicYear}
                                                        academicSemester={academicSemester}
                                                    />
                                                </div>
                                            ))}
                                            {/* Fill empty space if only 1 item on the last page */}
                                            {itemsOnPage.length === 1 && (
                                                <div style={{ flex: '1 1 50%', height: '50%' }} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Dynamic print styles based on mode */}
            {printMode === 'minggu' ? (
                <style>{`
                    @media print {
                        @page { size: landscape; margin: 15mm; }
                        body { -webkit-print-color-adjust: exact; background-color: white !important; font-family: 'Times New Roman', Times, serif !important; }
                        * { font-family: 'Times New Roman', Times, serif !important; }
                        .print-persesi-view { display: none !important; }
                    }
                `}</style>
            ) : (
                <style>{`
                    @media print {
                        @page { size: portrait; margin: 0mm; }
                        body { -webkit-print-color-adjust: exact; background-color: white !important; font-family: 'Times New Roman', Times, serif !important; }
                        * { font-family: 'Times New Roman', Times, serif !important; }
                        .print-minggu-view { display: none !important; }
                    }
                `}</style>
            )}
        </PageShell>
    );
};

export default PreviewPrintPage;
