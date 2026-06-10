import React, { useState, useEffect, useMemo } from 'react';
import { Printer, ChevronLeft, ChevronRight, ChevronDown, FileSignature, FileX2, Filter, Pen } from 'lucide-react';
import type { ScheduleEntry, WeekData, MasterDosen } from '@/types';
import { generateBapData } from '@/utils/storage';
import { groupSessions } from '@/utils/dataGrouper';
import BapDocument from '@/components/BapDocument';
import RecapTable from '@/components/RecapTable';
import DaftarHadirDocument from '@/components/DaftarHadirDocument';
import SignaturePad from '@/components/SignaturePad';

type PrintMode = 'minggu' | 'per-sesi';

interface PreviewPrintPageProps {
    template: ScheduleEntry[];
    weeks: WeekData[];
    activeWeek: number;
    dosenList?: MasterDosen[];
}

const PreviewPrintPage: React.FC<PreviewPrintPageProps> = ({ template, weeks, activeWeek: defaultWeek, dosenList = [] }) => {
    const [selectedWeek, setSelectedWeek] = useState(defaultWeek);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [printMode, setPrintMode] = useState<PrintMode>('minggu');
    const [showSignature, setShowSignature] = useState(true);
    const [showPrintMenu, setShowPrintMenu] = useState(false);
    const [selectedProdi, setSelectedProdi] = useState<string>('all');
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

    // Extract unique prodi values from bapData
    const prodiList = useMemo(() => {
        const set = new Set(bapData.map(d => d.prodi).filter(Boolean));
        return Array.from(set).sort();
    }, [bapData]);

    // Filter bapData by selected prodi
    const filteredBapData = useMemo(() => {
        if (selectedProdi === 'all') return bapData;
        return bapData.filter(d => d.prodi === selectedProdi);
    }, [bapData, selectedProdi]);

    const groupedData = useMemo(() => groupSessions(filteredBapData), [filteredBapData]);

    if (template.length === 0) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
                    <p className="text-lg font-medium">Belum ada jadwal template</p>
                    <p className="text-sm mt-1">Buat jadwal template terlebih dahulu</p>
                </div>
            </div>
        );
    }

    const handlePrint = (withSignature: boolean) => {
        setShowSignature(withSignature);
        setShowPrintMenu(false);
        // Small delay so React can re-render the document before the print dialog opens
        setTimeout(() => window.print(), 100);
    };

    const handlePrintMinggu = () => window.print();

    const nextDoc = () => {
        if (currentIndex < filteredBapData.length - 1) setCurrentIndex(prev => prev + 1);
    };

    const prevDoc = () => {
        if (currentIndex > 0) setCurrentIndex(prev => prev - 1);
    };

    const handleWeekChange = (week: number) => {
        setSelectedWeek(week);
        setCurrentIndex(0);
        setSelectedProdi('all');
    };

    const handleModeChange = (mode: PrintMode) => {
        setPrintMode(mode);
        setCurrentIndex(0);
    };

    const handleProdiChange = (prodi: string) => {
        setSelectedProdi(prodi);
        setCurrentIndex(0);
    };

    return (
        <div className="flex flex-col items-center print:block print:p-0">
            {/* Controls — hidden when printing */}
            <div className="w-full flex flex-col gap-4 mb-6 px-4 print:hidden">
                {/* Print Mode Toggle */}
                <div className="flex gap-2">
                    <button
                        onClick={() => handleModeChange('minggu')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border
                            ${printMode === 'minggu'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                            }`}
                    >
                        📋 Print Minggu
                    </button>
                    <button
                        onClick={() => handleModeChange('per-sesi')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border
                            ${printMode === 'per-sesi'
                                ? 'bg-primary text-primary-foreground border-primary shadow-md'
                                : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                            }`}
                    >
                        📄 Print Per-Sesi (Daftar Hadir)
                    </button>
                </div>

                {/* Week Selector */}
                <div className="flex flex-wrap gap-2">
                    {weeks.map(w => (
                        <button
                            key={w.weekNumber}
                            onClick={() => handleWeekChange(w.weekNumber)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border
                                ${w.weekNumber === selectedWeek
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-card text-muted-foreground border-border hover:border-primary/40'
                                }`}
                        >
                            Minggu {w.weekNumber}
                        </button>
                    ))}
                </div>

                {/* Prodi Filter */}
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Filter size={16} />
                        <span>Prodi:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => handleProdiChange('all')}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border
                                ${selectedProdi === 'all'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                    : 'bg-card text-muted-foreground border-border hover:border-emerald-400'
                                }`}
                        >
                            Semua Prodi
                        </button>
                        {prodiList.map(prodi => (
                            <button
                                key={prodi}
                                onClick={() => handleProdiChange(prodi)}
                                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all border
                                    ${selectedProdi === prodi
                                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                                        : 'bg-card text-muted-foreground border-border hover:border-emerald-400'
                                    }`}
                            >
                                {prodi}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Scale + Nav */}
                <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-foreground">Scale: {Math.round(scale * 100)}%</span>
                            <span className="text-[10px] text-muted-foreground">Fit to page</span>
                        </div>
                        <input
                            type="range" min="0.1" max="1.5" step="0.01"
                            value={scale}
                            onChange={(e) => setScale(parseFloat(e.target.value))}
                            className="w-48 cursor-pointer"
                        />
                        <button onClick={() => setScale(1)} className="text-sm text-primary hover:underline">Reset</button>
                    </div>

                    {printMode === 'per-sesi' && (
                        <div className="flex items-center gap-4">
                            <span className="font-medium text-foreground">
                                Page {currentIndex + 1} of {filteredBapData.length}
                            </span>
                            <div className="flex gap-2">
                                <button onClick={prevDoc} disabled={currentIndex === 0} className="p-2 rounded bg-card border shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                                    <ChevronLeft size={20} />
                                </button>
                                <button onClick={nextDoc} disabled={currentIndex === filteredBapData.length - 1} className="p-2 rounded bg-card border shadow-sm hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    )}

                    {printMode === 'minggu' ? (
                        <button
                            onClick={handlePrintMinggu}
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg shadow transition-colors font-semibold"
                        >
                            <Printer size={18} />
                            Print Minggu {selectedWeek}
                        </button>
                    ) : (
                        <div className="relative">
                            <button
                                onClick={() => setShowPrintMenu(prev => !prev)}
                                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2 rounded-lg shadow transition-colors font-semibold"
                            >
                                <Printer size={18} />
                                Print Per-Sesi Minggu {selectedWeek}
                                <ChevronDown size={16} className={`transition-transform ${showPrintMenu ? 'rotate-180' : ''}`} />
                            </button>
                            {showPrintMenu && (
                                <>
                                    {/* Backdrop to close on click outside */}
                                    <div className="fixed inset-0 z-40" onClick={() => setShowPrintMenu(false)} />
                                    <div className="absolute right-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-xl p-1 min-w-[220px] animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={() => handlePrint(true)}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 transition-colors text-left"
                                        >
                                            <FileSignature size={18} className="text-primary" />
                                            Dengan Tanda Tangan
                                        </button>
                                        <button
                                            onClick={() => handlePrint(false)}
                                            className="flex items-center gap-3 w-full px-4 py-2.5 rounded-md text-sm font-medium text-foreground hover:bg-primary/10 transition-colors text-left"
                                        >
                                            <FileX2 size={18} className="text-muted-foreground" />
                                            Tanpa Tanda Tangan
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Signature Panel — Per-Sesi mode only */}
                {printMode === 'per-sesi' && (
                    <div className="bg-card border rounded-lg shadow-sm">
                        <button
                            onClick={() => setShowSignaturePanel(!showSignaturePanel)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors rounded-lg"
                        >
                            <div className="flex items-center gap-2">
                                <Pen size={16} className="text-primary" />
                                <span>Tanda Tangan Teknisi</span>
                                {teknisiSignature && (
                                    <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                        Teknisi
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={16} className={`transition-transform ${showSignaturePanel ? 'rotate-180' : ''}`} />
                        </button>
                        {showSignaturePanel && (
                            <div className="px-4 pb-4 border-t flex justify-center">
                                <div className="pt-4 w-full max-w-sm">
                                    <SignaturePad
                                        label="Tanda Tangan Teknisi"
                                        value={teknisiSignature}
                                        onChange={handleTeknisiSigChange}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Preview Area */}
            {filteredBapData.length > 0 && (
                <>
                    {printMode === 'minggu' ? (
                        /* ═══ MODE: PRINT MINGGU (unchanged) ═══ */
                        <div className="bg-white shadow-2xl print:shadow-none print:w-full print:bg-white overflow-visible">
                            <div className="print:hidden border border-border" style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}>
                                <BapDocument data={filteredBapData[currentIndex]} />
                            </div>

                            {/* Print View — Minggu */}
                            <div className="hidden print:block w-full print-minggu-view">
                                <div className="w-full" style={{ zoom: scale }}>
                                    <div className="w-full text-center pb-4 text-black font-bold text-xl uppercase tracking-widest pt-4" style={{ fontFamily: "'Times New Roman', Times, serif" }}>
                                        Berita Acara Perkuliahan Minggu {selectedWeek}
                                    </div>
                                    <RecapTable groups={groupedData} />
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ═══ MODE: PRINT PER-SESI ═══ */
                        <>
                            {/* Screen Preview — show only current index */}
                            <div className="print:hidden border border-border bg-white shadow-2xl overflow-visible"
                                style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
                            >
                                <DaftarHadirDocument
                                    data={filteredBapData[currentIndex]}
                                    isLast={true}
                                    showSignature={showSignature}
                                    dosenSignature={showSignature ? (dosenList.find(d => d.name === filteredBapData[currentIndex].pengajar)?.signature || null) : null}
                                    teknisiSignature={showSignature ? teknisiSignature : null}
                                />
                            </div>

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
                </>
            )}

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
        </div>
    );
};

export default PreviewPrintPage;
