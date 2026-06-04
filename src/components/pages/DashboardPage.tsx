import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Label } from 'recharts';
import { Calendar, Users, CheckCircle2, TrendingUp, BookOpen } from 'lucide-react';
import { CalendarWidget } from '@/components/CalendarWidget';
import type { ScheduleEntry, WeekData } from '@/types';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from '@/components/ui/chart';

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

function getCurrentDayName(): string {
    const jsDay = new Date().getDay(); // 0=Sunday
    return DAYS[(jsDay + 6) % 7]; // Convert to Senin-based
}

interface DashboardPageProps {
    template: ScheduleEntry[];
    weeks: WeekData[];
    activeWeek: number;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ template, weeks, activeWeek }) => {
    const [selectedWeek, setSelectedWeek] = useState(activeWeek);
    const [selectedDay, setSelectedDay] = useState(getCurrentDayName());

    const weekData = weeks.find(w => w.weekNumber === selectedWeek);

    // Available days from template
    const availableDays = useMemo(() => {
        const days = Array.from(new Set(template.map(t => t.hari)));
        return DAYS.filter(d => days.includes(d));
    }, [template]);

    // ─── Stats ───
    const stats = useMemo(() => {
        const totalSchedule = template.length;

        // Progress for selected week
        const filledEntries = weekData?.entries.filter(e => e.materi.trim() !== '').length || 0;

        // Total absent students for selected week
        const totalAbsent = weekData?.entries.reduce((sum, e) => sum + (e.students?.length || 0), 0) || 0;

        // Weeks with at least 1 filled entry
        const filledWeeks = weeks.filter(w =>
            w.entries.some(e => e.materi.trim() !== '')
        ).length;

        return { totalSchedule, filledEntries, totalAbsent, filledWeeks };
    }, [template, weekData, weeks]);

    // ─── Chart: Absences per Subject (selected week) ───
    const absenceBySubject = useMemo(() => {
        if (!weekData) return [];
        return template
            .map(t => {
                const entry = weekData.entries.find(e => e.scheduleId === t.id);
                const count = entry?.students?.length || 0;
                return { name: t.mataKuliah, count, hari: t.hari };
            })
            .filter(d => d.count > 0)
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [weekData, template]);

    const subjectChartConfig: ChartConfig = {
        count: {
            label: 'Tidak Hadir',
            color: 'hsl(var(--primary))',
        },
    };

    // ─── Chart: Absence Reasons breakdown (selected week) ───
    const absenceReasons = useMemo(() => {
        if (!weekData) return [];
        const counts: Record<string, number> = {};
        weekData.entries.forEach(e => {
            (e.students || []).forEach(s => {
                const reason = s.remarks?.trim() || 'Lainnya';
                counts[reason] = (counts[reason] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [weekData]);

    const REASON_COLORS: Record<string, string> = {
        ALPHA: '#ef4444',
        IZIN: '#3b82f6',
        SAKIT: '#f59e0b',
        MBKM: '#8b5cf6',
        Lainnya: '#6b7280',
    };

    const totalAbsentForPie = absenceReasons.reduce((sum, r) => sum + r.value, 0);

    // ─── Today's schedule table ───
    const todayEntries = useMemo(() => {
        if (!weekData) return [];
        return template
            .filter(t => t.hari === selectedDay)
            .sort((a, b) => a.no - b.no)
            .map(t => {
                const entry = weekData.entries.find(e => e.scheduleId === t.id);
                return {
                    ...t,
                    pengajar: entry?.pengajar || t.defaultPengajar,
                    materi: entry?.materi || '',
                    tanggal: entry?.tanggal || '',
                    teknisi: entry?.teknisi || t.defaultTeknisi,
                    studentCount: entry?.students?.length || 0,
                };
            });
    }, [template, weekData, selectedDay]);

    if (template.length === 0) {
        return (
            <div className="max-w-7xl mx-auto">
                <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
                    <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg font-medium">Belum ada data</p>
                    <p className="text-sm mt-1">Buat jadwal template terlebih dahulu di menu "Jadwal Template"</p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Rekapitulasi data BAP — Minggu {selectedWeek}, {selectedDay}
                </p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Calendar size={20} />}
                    label="Total Jadwal"
                    value={stats.totalSchedule}
                    description="entri terdaftar"
                    color="blue"
                />
                <StatCard
                    icon={<CheckCircle2 size={20} />}
                    label={`Progress Mg ${selectedWeek}`}
                    value={`${stats.filledEntries}/${stats.totalSchedule}`}
                    description={`${stats.totalSchedule > 0 ? Math.round((stats.filledEntries / stats.totalSchedule) * 100) : 0}% terisi`}
                    color="green"
                />
                <StatCard
                    icon={<Users size={20} />}
                    label="Tidak Hadir"
                    value={stats.totalAbsent}
                    description={`mahasiswa di Mg ${selectedWeek}`}
                    color="amber"
                />
                <StatCard
                    icon={<TrendingUp size={20} />}
                    label="Minggu Terisi"
                    value={`${stats.filledWeeks}/16`}
                    description={`${Math.round((stats.filledWeeks / 16) * 100)}% selesai`}
                    color="purple"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Bar Chart: Absences by Subject */}
                <div className="bg-card rounded-xl border shadow-sm p-5">
                    <h3 className="font-semibold text-sm mb-1">Ketidakhadiran per Mata Kuliah</h3>
                    <p className="text-xs text-muted-foreground mb-4">Minggu {selectedWeek} — Top 10</p>
                    {absenceBySubject.length === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                            Tidak ada data ketidakhadiran
                        </div>
                    ) : (
                        <ChartContainer config={subjectChartConfig} className="h-[220px] w-full">
                            <BarChart
                                accessibilityLayer
                                data={absenceBySubject}
                                layout="vertical"
                                margin={{ top: 4, right: 16, bottom: 4, left: 4 }}
                            >
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tickLine={false}
                                    axisLine={false}
                                    width={120}
                                    fontSize={11}
                                    tickFormatter={(v: string) => v.length > 15 ? v.slice(0, 14) + '…' : v}
                                />
                                <XAxis type="number" hide />
                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            formatter={(value) => (
                                                <span>{String(value)} mahasiswa</span>
                                            )}
                                        />
                                    }
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24} fill="hsl(var(--primary))" />
                            </BarChart>
                        </ChartContainer>
                    )}
                </div>

                {/* Pie Chart: Absence Reasons */}
                <div className="bg-card rounded-xl border shadow-sm p-5">
                    <h3 className="font-semibold text-sm mb-1">Alasan Ketidakhadiran</h3>
                    <p className="text-xs text-muted-foreground mb-4">Minggu {selectedWeek} — Semua hari</p>
                    {absenceReasons.length === 0 ? (
                        <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
                            Tidak ada data ketidakhadiran
                        </div>
                    ) : (
                        <div className="flex flex-col items-center">
                            <ChartContainer config={{}} className="h-[180px] w-full max-w-[280px]">
                                <PieChart>
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                formatter={(value) => (
                                                    <span>{String(value)} mahasiswa</span>
                                                )}
                                            />
                                        }
                                    />
                                    <Pie
                                        data={absenceReasons}
                                        dataKey="value"
                                        nameKey="name"
                                        innerRadius={50}
                                        outerRadius={75}
                                        strokeWidth={2}
                                        paddingAngle={2}
                                    >
                                        {absenceReasons.map((entry) => (
                                            <Cell
                                                key={entry.name}
                                                fill={REASON_COLORS[entry.name] || REASON_COLORS.Lainnya}
                                            />
                                        ))}
                                        <Label
                                            content={({ viewBox }) => {
                                                if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                    return (
                                                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                                            <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                                                                {totalAbsentForPie}
                                                            </tspan>
                                                            <tspan x={viewBox.cx} y={(viewBox.cy || 0) + 18} className="fill-muted-foreground text-xs">
                                                                mahasiswa
                                                            </tspan>
                                                        </text>
                                                    );
                                                }
                                            }}
                                        />
                                    </Pie>
                                </PieChart>
                            </ChartContainer>
                            {/* Legend */}
                            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                                {absenceReasons.map(r => (
                                    <div key={r.name} className="flex items-center gap-1.5 text-xs">
                                        <span
                                            className="w-2.5 h-2.5 rounded-full shrink-0"
                                            style={{ backgroundColor: REASON_COLORS[r.name] || REASON_COLORS.Lainnya }}
                                        />
                                        <span className="text-muted-foreground">{r.name}</span>
                                        <span className="font-semibold">{r.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Kalender & Libur */}
            <CalendarWidget />

            {/* Filters + Table */}
            <div className="bg-card rounded-xl border shadow-sm">
                {/* Filters Bar */}
                <div className="p-4 border-b flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-muted-foreground">Minggu:</label>
                        <select
                            value={selectedWeek}
                            onChange={e => setSelectedWeek(Number(e.target.value))}
                            className="border border-input rounded-md px-2 py-1 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {Array.from({ length: 16 }, (_, i) => i + 1).map(w => (
                                <option key={w} value={w}>Minggu {w}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                        {availableDays.map(day => (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(day)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors
                                    ${selectedDay === day
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Schedule Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground font-semibold border-b">
                                <th className="px-3 py-3 text-center w-10">No</th>
                                <th className="px-3 py-3 text-left">Mata Kuliah</th>
                                <th className="px-3 py-3 text-left">Jam</th>
                                <th className="px-3 py-3 text-left">Pengajar</th>
                                <th className="px-3 py-3 text-left">Materi</th>
                                <th className="px-3 py-3 text-left">Tanggal</th>
                                <th className="px-3 py-3 text-center">Tdk Hadir</th>
                            </tr>
                        </thead>
                        <tbody>
                            {todayEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                        Tidak ada jadwal untuk hari {selectedDay}
                                    </td>
                                </tr>
                            ) : (
                                todayEntries.map((entry, idx) => (
                                    <tr
                                        key={entry.id}
                                        className={`border-b transition-colors ${!entry.materi
                                            ? 'bg-amber-50/50 dark:bg-amber-950/20'
                                            : idx % 2 === 0 ? '' : 'bg-muted/10'
                                            }`}
                                    >
                                        <td className="px-3 py-2.5 text-center text-muted-foreground">{entry.no}</td>
                                        <td className="px-3 py-2.5">
                                            <div className="font-medium">{entry.mataKuliah}</div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {entry.prodi} — Smt {entry.semester} Gol {entry.golongan}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{entry.jam}</td>
                                        <td className="px-3 py-2.5">{entry.pengajar || <span className="text-muted-foreground italic">—</span>}</td>
                                        <td className="px-3 py-2.5">
                                            {entry.materi || (
                                                <span className="text-amber-500 text-xs font-medium">Belum diisi</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-2.5 text-muted-foreground">{entry.tanggal || '—'}</td>
                                        <td className="px-3 py-2.5 text-center">
                                            {entry.studentCount > 0 ? (
                                                <span className="inline-flex items-center justify-center bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs font-semibold rounded-full w-6 h-6">
                                                    {entry.studentCount}
                                                </span>
                                            ) : (
                                                <span className="text-green-600 dark:text-green-400 text-xs">✓</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// ─── Stat Card Component ───
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    description: string;
    color: 'blue' | 'green' | 'amber' | 'purple';
}> = ({ icon, label, value, description, color }) => {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',
        amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    };

    return (
        <div className="bg-card rounded-xl border shadow-sm p-4">
            <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${colors[color]}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{label}</p>
                    <p className="text-xl font-bold tracking-tight">{value}</p>
                    <p className="text-[11px] text-muted-foreground">{description}</p>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
