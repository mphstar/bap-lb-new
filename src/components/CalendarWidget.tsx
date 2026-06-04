import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader2, Sparkles, CalendarDays, PartyPopper } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Holiday {
    date: string;
    name: string;
}

export const CalendarWidget: React.FC = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1; // 1-12

    useEffect(() => {
        async function fetchHolidays() {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/holidays?year=${year}&month=${month}`);
                if (res.ok) {
                    const data = await res.json();
                    setHolidays(data);
                } else {
                    setHolidays([]);
                }
            } catch (err) {
                console.error('Failed to fetch holidays:', err);
                setHolidays([]);
            } finally {
                setIsLoading(false);
            }
        }
        fetchHolidays();
    }, [year, month]);

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
    };

    const daysInMonth = new Date(year, month, 0).getDate();
    const firstDayOfMonth = new Date(year, month - 1, 1).getDay(); 
    
    // Adjusting first day to Monday=0, Sunday=6
    const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const weekDays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    const daysArray = Array(adjustedFirstDay).fill(null);
    for (let i = 1; i <= daysInMonth; i++) {
        daysArray.push(i);
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month - 1;

    const monthNames = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const getHolidayForDay = (day: number | null) => {
        if (!day) return null;
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return holidays.find(h => h.date === dateStr);
    };

    return (
        <TooltipProvider delayDuration={200}>
            <div className="bg-gradient-to-br from-card to-card/50 rounded-2xl border shadow-lg flex flex-col lg:flex-row overflow-hidden backdrop-blur-sm">
                
                {/* ─── CALENDAR SECTION ─── */}
                <div className="p-6 lg:p-8 flex-1 border-b lg:border-b-0 lg:border-r border-border/50">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 bg-primary/10 text-primary rounded-xl shadow-inner border border-primary/10">
                                <CalendarDays size={24} className="opacity-90" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold tracking-tight text-foreground/90">
                                    {monthNames[month - 1]} {year}
                                </h2>
                                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                    <Sparkles size={14} className="text-amber-500" />
                                    Kalender Akademik & Hari Libur
                                </p>
                            </div>
                        </div>
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
                            <button 
                                onClick={handlePrevMonth}
                                className="p-2.5 hover:bg-background rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground hover:shadow-sm"
                                aria-label="Bulan Sebelumnya"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="w-[1px] bg-border mx-1 my-2"></div>
                            <button 
                                onClick={handleNextMonth}
                                className="p-2.5 hover:bg-background rounded-lg transition-all duration-300 text-muted-foreground hover:text-foreground hover:shadow-sm"
                                aria-label="Bulan Selanjutnya"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Days Header */}
                    <div className="grid grid-cols-7 gap-2 mb-3">
                        {weekDays.map((day, i) => (
                            <div key={day} className={`text-center text-xs font-bold uppercase tracking-wider py-2 
                                ${i >= 5 ? 'text-red-400/80 dark:text-red-500/70' : 'text-muted-foreground/80'}
                            `}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                        {daysArray.map((day, idx) => {
                            const holiday = getHolidayForDay(day);
                            const isToday = isCurrentMonth && day === today.getDate();
                            const isWeekend = idx % 7 >= 5; // Saturday & Sunday
                            
                            const dateInfo = day ? `${day} ${monthNames[month - 1]} ${year}` : '';
                            const tooltipText = day ? [
                                isToday ? 'Hari ini' : null,
                                holiday ? holiday.name : null
                            ].filter(Boolean).join(' • ') : null;

                            const content = (
                                <div 
                                    className={`
                                        group relative flex flex-col items-center justify-center h-14 md:h-16 rounded-xl border transition-all duration-300
                                        ${!day ? 'border-transparent opacity-0' : 'cursor-pointer'}
                                        ${!day ? '' : isToday 
                                            ? 'bg-gradient-to-tr from-primary to-primary/80 border-primary/20 text-primary-foreground shadow-md shadow-primary/20 scale-[1.02] ring-2 ring-primary/30 ring-offset-2 ring-offset-background z-10' 
                                            : holiday
                                                ? 'bg-red-50/80 border-red-100 dark:bg-red-950/20 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/40'
                                                : isWeekend
                                                    ? 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/80 hover:border-border/50'
                                                    : 'bg-background border-border/40 hover:border-border hover:shadow-sm hover:-translate-y-0.5'
                                        }
                                    `}
                                >
                                    {day && (
                                        <>
                                            <span className={`text-base md:text-lg font-semibold ${isToday ? 'text-primary-foreground' : ''}`}>
                                                {day}
                                            </span>
                                            {/* Holiday Dot Indicator */}
                                            {holiday && !isToday && (
                                                <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse"></div>
                                            )}
                                            {holiday && isToday && (
                                                <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-primary-foreground/80 shadow-[0_0_6px_rgba(255,255,255,0.6)]"></div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );

                            if (!day) return <div key={idx}>{content}</div>;

                            return (
                                <Tooltip key={idx}>
                                    <TooltipTrigger asChild>
                                        {content}
                                    </TooltipTrigger>
                                    <TooltipContent className={holiday ? "bg-red-600/90 text-white" : ""}>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">{dateInfo}</span>
                                            {tooltipText && <span className="font-medium text-xs">{tooltipText}</span>}
                                        </div>
                                    </TooltipContent>
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>

                {/* ─── HOLIDAYS SIDEBAR ─── */}
                <div className="w-full lg:w-80 bg-gradient-to-b from-muted/30 to-background/50 flex flex-col relative overflow-hidden">
                    {/* Decorative background element */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="p-6 border-b border-border/50 backdrop-blur-md relative z-10">
                        <h3 className="flex items-center gap-2 font-bold text-base">
                            <PartyPopper size={18} className="text-primary" />
                            Info Hari Libur
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 tracking-wide">
                            {monthNames[month - 1]} {year}
                        </p>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-10">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 animate-pulse">
                                <Loader2 size={28} className="animate-spin text-primary/60" />
                                <p className="text-sm font-medium">Memuat data...</p>
                            </div>
                        ) : holidays.length > 0 ? (
                            <div className="space-y-4">
                                {holidays.map((h, i) => {
                                    const [y, m, d] = h.date.split('-');
                                    const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
                                    const dayName = weekDays[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1];
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className="group flex gap-4 bg-background/80 hover:bg-background border border-border/50 hover:border-red-200 dark:hover:border-red-900/50 p-3.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300"
                                        >
                                            <div className="shrink-0 flex flex-col items-center justify-center bg-gradient-to-b from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/20 text-red-600 dark:text-red-400 w-14 h-14 rounded-xl border border-red-100 dark:border-red-900/30 shadow-inner">
                                                <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">{dayName}</span>
                                                <span className="text-xl font-bold leading-none mt-0.5">{d}</span>
                                            </div>
                                            <div className="flex flex-col justify-center min-w-0">
                                                <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" title={h.name}>
                                                    {h.name}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4 border border-border/50 shadow-inner">
                                    <CalendarIcon size={32} className="opacity-40" />
                                </div>
                                <p className="text-base font-semibold text-foreground/80">Belum ada hari libur</p>
                                <p className="text-sm mt-1.5 leading-relaxed">
                                    Tidak ada tanggal merah di bulan {monthNames[month - 1]}. Selamat beraktivitas!
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                
            </div>
        </TooltipProvider>
    );
};
