/* Hallmark · genre: modern-minimal · macrostructure: Workbench (stat row → chart tier → table)
 * design-system: design.md · designed-as-app
 *
 * Two structural fixes alongside the chart change:
 *
 * · The week selector drove the stat tiles, every chart AND the table, but sat
 *   inside the table panel's filter bar — so it read as if it only filtered the
 *   table. It now lives in <PageHeader>, where a page-wide control belongs. The
 *   day chips stayed with the table, because they genuinely only affect it.
 * · The calendar sat between the charts and the table, cutting the analytical
 *   tier in half. It is reference material, so it moved to the end.
 *
 * Charts are computed from real week data only — no invented figures.
 */

import React, { useState, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    PieChart, Pie, Cell, Label,
} from 'recharts';
import {
    Calendar, Users, CheckCircle2, TrendingUp, BookOpen, Check,
    PieChart as PieChartIcon, CalendarDays, ListChecks, Activity,
} from 'lucide-react';
import { CalendarWidget } from '@/components/CalendarWidget';
import {
    PageShell,
    PageSections,
    PageHeader,
    Panel,
    PanelHeader,
    PanelBody,
    EmptyState,
    StatTile,
} from '@/components/shell';
import type { ScheduleEntry, WeekData } from '@/types';
import { tallyWeekAbsence, countEntryAbsence } from '@/utils/attendance';
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

const progressConfig: ChartConfig = {
    filled: { label: 'Entri terisi', color: 'var(--color-chart-1)' },
};

const absenceConfig: ChartConfig = {
    absent: { label: 'Tidak hadir', color: 'var(--color-chart-2)' },
};

/** Compact empty state for a chart panel that has nothing to draw. */
const ChartEmpty: React.FC<{ label: string }> = ({ label }) => (
    <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        {label}
    </div>
);

const DashboardPage: React.FC<DashboardPageProps> = ({ template, weeks, activeWeek }) => {
    const [selectedWeek, setSelectedWeek] = useState(activeWeek);
    const [selectedDay, setSelectedDay] = useState(getCurrentDayName());

    const weekData = weeks.find(w => w.weekNumber === selectedWeek);

    // Available days from template
    const availableDays = useMemo(() => {
        const days = Array.from(new Set(template.map(t => t.hari)));
        return DAYS.filter(d => days.includes(d));
    }, [template]);

    /* Every absence figure on this page comes from tallyWeekAbsence, which
       collapses the two time slots of one teaching block into a single
       absence. Summing students.length here would double-count. */
    const weekTally = useMemo(
        () => tallyWeekAbsence(template, weekData),
        [template, weekData]
    );

    // ─── Stats ───
    const stats = useMemo(() => {
        const totalSchedule = template.length;
        const filledEntries = weekData?.entries.filter(e => e.materi.trim() !== '').length || 0;
        const filledWeeks = weeks.filter(w =>
            w.entries.some(e => e.materi.trim() !== '')
        ).length;

        return { totalSchedule, filledEntries, filledWeeks };
    }, [template, weekData, weeks]);

    // ─── Chart: how far each of the 16 weeks has been filled in ───
    // The single most actionable view for this app: it answers "which week am I
    // behind on", which the old per-subject bar chart never did.
    const weeklyProgress = useMemo(
        () =>
            weeks.map(w => {
                const total = w.entries.length;
                const filled = w.entries.filter(e => e.materi.trim() !== '').length;
                return { week: w.weekNumber, filled, total };
            }),
        [weeks]
    );

    const hasProgressData = weeklyProgress.some(w => w.total > 0);

    // ─── Chart: absence across the semester ───
    const weeklyAbsence = useMemo(
        () =>
            weeks.map(w => ({
                week: w.weekNumber,
                absent: tallyWeekAbsence(template, w).total,
            })),
        [template, weeks]
    );

    const hasAbsenceTrend = weeklyAbsence.some(w => w.absent > 0);

    // ─── Chart: Absence Reasons breakdown (selected week) ───
    const absenceReasons = useMemo(
        () =>
            Object.entries(weekTally.byReason)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value),
        [weekTally]
    );

    // Categorical, token-backed. No inline colour values.
    const REASON_COLORS: Record<string, string> = {
        ALPHA: 'var(--reason-alpha)',
        IZIN: 'var(--reason-izin)',
        SAKIT: 'var(--reason-sakit)',
        MBKM: 'var(--reason-mbkm)',
        Lainnya: 'var(--reason-lainnya)',
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
                    // Per-session on purpose: each row is its own attendance
                    // sheet, so this is NOT deduped across the block.
                    studentCount: countEntryAbsence(entry?.students),
                };
            });
    }, [template, weekData, selectedDay]);

    if (template.length === 0) {
        return (
            <PageShell>
                <PageHeader title="Dashboard" meta="Belum ada data untuk direkap" />
                <EmptyState
                    icon={<BookOpen />}
                    title="Belum ada data"
                    description="Buat jadwal template terlebih dahulu lewat menu “Jadwal Template”."
                />
            </PageShell>
        );
    }

    return (
        <PageShell>
            <PageHeader
                title="Dashboard"
                meta={`Rekapitulasi BAP — Minggu ${selectedWeek}`}
                actions={
                    <div className="flex items-center gap-2">
                        <label
                            htmlFor="dash-week"
                            className="text-xs font-medium text-muted-foreground"
                        >
                            Minggu
                        </label>
                        <select
                            id="dash-week"
                            value={selectedWeek}
                            onChange={e => setSelectedWeek(Number(e.target.value))}
                            className="rounded-control border border-input bg-background px-3 py-2 text-sm"
                        >
                            {weeks.map(w => (
                                <option key={w.weekNumber} value={w.weekNumber}>
                                    Minggu {w.weekNumber}
                                </option>
                            ))}
                        </select>
                    </div>
                }
            />

            <PageSections>
                {/* ── Tier 1 · figures ─────────────────────────────── */}
                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    <StatTile
                        icon={<Calendar />}
                        label="Total jadwal"
                        value={stats.totalSchedule}
                        meta="entri terdaftar"
                    />
                    <StatTile
                        icon={<CheckCircle2 />}
                        label={`Progress Mg ${selectedWeek}`}
                        value={`${stats.filledEntries}/${stats.totalSchedule}`}
                        meta={`${stats.totalSchedule > 0 ? Math.round((stats.filledEntries / stats.totalSchedule) * 100) : 0}% terisi`}
                    />
                    <StatTile
                        icon={<Users />}
                        label="Tidak hadir"
                        value={weekTally.total}
                        meta={
                            weekTally.total === 0
                                ? `di Mg ${selectedWeek}`
                                : `${weekTally.uniqueStudents} mahasiswa unik`
                        }
                    />
                    <StatTile
                        icon={<TrendingUp />}
                        label="Minggu terisi"
                        value={`${stats.filledWeeks}/16`}
                        meta={`${Math.round((stats.filledWeeks / 16) * 100)}% selesai`}
                    />
                </div>

                {/* ── Tier 2 · the semester at a glance ────────────── */}
                <Panel>
                    <PanelHeader
                        icon={<ListChecks />}
                        title="Progress pengisian per minggu"
                        meta="Klik salah satu batang untuk berpindah minggu"
                    />
                    <PanelBody>
                        {!hasProgressData ? (
                            <ChartEmpty label="Belum ada entri mingguan" />
                        ) : (
                            <ChartContainer config={progressConfig} className="h-[240px] w-full">
                                <BarChart
                                    accessibilityLayer
                                    data={weeklyProgress}
                                    margin={{ top: 8, right: 8, bottom: 4, left: -16 }}
                                >
                                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="week"
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={11}
                                        interval={0}
                                        tickFormatter={(v: number) => String(v)}
                                    />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={11}
                                        allowDecimals={false}
                                        width={36}
                                    />
                                    <ChartTooltip
                                        content={
                                            <ChartTooltipContent
                                                labelFormatter={(label) => `Minggu ${label}`}
                                                formatter={(value, _name, item) => (
                                                    <span>
                                                        {String(value)} dari{' '}
                                                        {(item?.payload as { total?: number })?.total ?? 0} entri terisi
                                                    </span>
                                                )}
                                            />
                                        }
                                    />
                                    <Bar
                                        dataKey="filled"
                                        radius={[4, 4, 0, 0]}
                                        maxBarSize={36}
                                        className="cursor-pointer"
                                        onClick={(d: unknown) => {
                                            const week = (d as { week?: number })?.week;
                                            if (week) setSelectedWeek(week);
                                        }}
                                    >
                                        {weeklyProgress.map(w => (
                                            <Cell
                                                key={w.week}
                                                fill={
                                                    w.week === selectedWeek
                                                        ? 'var(--color-chart-1)'
                                                        : 'var(--color-chart-4)'
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        )}
                    </PanelBody>
                </Panel>

                {/* ── Tier 3 · absence, over time and by cause ─────── */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
                    <Panel>
                        <PanelHeader
                            icon={<Activity />}
                            title="Tren ketidakhadiran"
                            meta="Total mahasiswa tidak hadir, per minggu"
                        />
                        <PanelBody>
                            {!hasAbsenceTrend ? (
                                <ChartEmpty label="Belum ada data ketidakhadiran" />
                            ) : (
                                <ChartContainer config={absenceConfig} className="h-[220px] w-full">
                                    <LineChart
                                        accessibilityLayer
                                        data={weeklyAbsence}
                                        margin={{ top: 8, right: 12, bottom: 4, left: -16 }}
                                    >
                                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                        <XAxis
                                            dataKey="week"
                                            tickLine={false}
                                            axisLine={false}
                                            fontSize={11}
                                            interval={0}
                                        />
                                        <YAxis
                                            tickLine={false}
                                            axisLine={false}
                                            fontSize={11}
                                            allowDecimals={false}
                                            width={36}
                                        />
                                        <ChartTooltip
                                            content={
                                                <ChartTooltipContent
                                                    labelFormatter={(label) => `Minggu ${label}`}
                                                    formatter={(value) => (
                                                        <span>{String(value)} mahasiswa</span>
                                                    )}
                                                />
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="absent"
                                            stroke="var(--color-chart-2)"
                                            strokeWidth={2}
                                            dot={{ r: 2.5 }}
                                            activeDot={{ r: 4 }}
                                        />
                                    </LineChart>
                                </ChartContainer>
                            )}
                        </PanelBody>
                    </Panel>

                    <Panel>
                        <PanelHeader
                            icon={<PieChartIcon />}
                            title="Alasan ketidakhadiran"
                            meta={`Minggu ${selectedWeek} — semua hari`}
                        />
                        <PanelBody>
                            {absenceReasons.length === 0 ? (
                                <ChartEmpty label="Belum ada data ketidakhadiran" />
                            ) : (
                                <div className="flex flex-col items-center">
                                    <ChartContainer config={{}} className="h-[180px] w-full max-w-[260px]">
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

                                    <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                                        {absenceReasons.map(r => (
                                            <div key={r.name} className="flex items-center gap-1.5 text-xs">
                                                <span
                                                    aria-hidden
                                                    className="size-2.5 shrink-0 rounded-full"
                                                    style={{ backgroundColor: REASON_COLORS[r.name] || REASON_COLORS.Lainnya }}
                                                />
                                                <span className="text-muted-foreground">{r.name}</span>
                                                <span data-numeric className="font-semibold">{r.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </PanelBody>
                    </Panel>
                </div>

                {/* ── Tier 4 · the operational table ───────────────── */}
                <Panel>
                    <PanelHeader
                        icon={<CalendarDays />}
                        title={`Jadwal hari ${selectedDay}`}
                        meta={`Minggu ${selectedWeek} — ${todayEntries.length} entri`}
                    />

                    {/* Day chips only filter this table, so they stay with it. */}
                    <div className="flex flex-wrap gap-1.5 border-b border-rule p-4">
                        {availableDays.map(day => (
                            <button
                                key={day}
                                type="button"
                                aria-pressed={selectedDay === day}
                                onClick={() => setSelectedDay(day)}
                                className={`rounded-control border px-3 py-1.5 text-xs font-medium transition-colors duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring
                                    ${selectedDay === day
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-rule bg-panel text-muted-foreground hover:bg-panel-2 active:bg-tile'
                                    }`}
                            >
                                {day}
                            </button>
                        ))}
                    </div>

                    <div className="hm-scroll-x overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-panel-2">
                                <tr className="border-b border-rule text-left font-medium text-muted-foreground">
                                    <th className="w-12 px-3 py-2.5 text-center">No</th>
                                    <th className="px-3 py-2.5">Mata Kuliah</th>
                                    <th className="px-3 py-2.5">Jam</th>
                                    <th className="px-3 py-2.5">Pengajar</th>
                                    <th className="px-3 py-2.5">Materi</th>
                                    <th className="px-3 py-2.5">Tanggal</th>
                                    <th className="w-24 px-3 py-2.5 text-center">Tdk Hadir</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todayEntries.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                                            Tidak ada jadwal untuk hari {selectedDay}
                                        </td>
                                    </tr>
                                ) : (
                                    todayEntries.map((entry) => (
                                        <tr
                                            key={entry.id}
                                            className={`border-b border-rule transition-colors duration-[180ms] ease-out ${
                                                entry.materi ? 'hover:bg-panel-2' : 'bg-warn-soft'
                                            }`}
                                        >
                                            <td className="px-3 py-2.5 text-center text-muted-foreground">{entry.no}</td>
                                            <td className="px-3 py-2.5">
                                                <div className="font-medium">{entry.mataKuliah}</div>
                                                <div className="text-[0.6875rem] text-muted-foreground">
                                                    {entry.prodi} — Smt {entry.semester} Gol {entry.golongan}
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{entry.jam}</td>
                                            <td className="px-3 py-2.5">
                                                {entry.pengajar || <span className="text-muted-foreground">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5">
                                                {entry.materi || (
                                                    <span className="text-xs font-medium text-warn">Belum diisi</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2.5 text-muted-foreground">{entry.tanggal || '—'}</td>
                                            <td className="px-3 py-2.5 text-center">
                                                {entry.studentCount > 0 ? (
                                                    <span
                                                        data-numeric
                                                        className="inline-flex size-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-semibold text-destructive"
                                                    >
                                                        {entry.studentCount}
                                                    </span>
                                                ) : (
                                                    <Check aria-label="Hadir semua" className="mx-auto size-3.5 text-muted-foreground" />
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </Panel>

                {/* ── Tier 5 · reference ───────────────────────────── */}
                <CalendarWidget />
            </PageSections>
        </PageShell>
    );
};

export default DashboardPage;
