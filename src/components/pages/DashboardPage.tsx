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
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    PieChart, Pie, Cell, Label,
} from 'recharts';
import {
    Calendar, Users, CheckCircle2, TrendingUp, BookOpen, Check,
    PieChart as PieChartIcon, CalendarDays, Activity,
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
import { groupSchedule } from '@/utils/scheduleOrder';
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
        return groupSchedule(template.filter(t => t.hari === selectedDay))
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

                {/* ── Tier 2 · absence, over time and by cause ─────── */}
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
                                                        <span>{String(value)} mahasiswa tidak hadir</span>
                                                    )}
                                                />
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="absent"
                                            stroke="var(--color-chart-2)"
                                            strokeWidth={2}
                                            dot={{ r: 3, fill: 'var(--color-chart-2)' }}
                                            activeDot={{ r: 5 }}
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
                            meta={`Minggu ${selectedWeek} · ${totalAbsentForPie} catatan`}
                        />
                        <PanelBody>
                            {totalAbsentForPie === 0 ? (
                                <ChartEmpty label={`Tidak ada absensi di Minggu ${selectedWeek}`} />
                            ) : (
                                <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-around">
                                    <div className="h-[180px] w-[180px] shrink-0">
                                        <ChartContainer config={{}} className="h-full w-full">
                                            <PieChart>
                                                <ChartTooltip
                                                    content={
                                                        <ChartTooltipContent
                                                            formatter={(value, name) => (
                                                                <span>
                                                                    {name}: {String(value)} (
                                                                    {Math.round(
                                                                        (Number(value) / totalAbsentForPie) * 100
                                                                    )}
                                                                    %)
                                                                </span>
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
                                                    paddingAngle={2}
                                                    stroke="none"
                                                >
                                                    {absenceReasons.map(r => (
                                                        <Cell
                                                            key={r.name}
                                                            fill={
                                                                REASON_COLORS[r.name] ||
                                                                'var(--reason-lainnya)'
                                                            }
                                                        />
                                                    ))}
                                                    <Label
                                                        content={({ viewBox }) => {
                                                            if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                                                                return (
                                                                    <text
                                                                        x={viewBox.cx}
                                                                        y={viewBox.cy}
                                                                        textAnchor="middle"
                                                                        dominantBaseline="middle"
                                                                    >
                                                                        <tspan
                                                                            x={viewBox.cx}
                                                                            y={viewBox.cy}
                                                                            className="fill-foreground text-2xl font-bold"
                                                                        >
                                                                            {totalAbsentForPie}
                                                                        </tspan>
                                                                        <tspan
                                                                            x={viewBox.cx}
                                                                            y={(viewBox.cy || 0) + 16}
                                                                            className="fill-muted-foreground text-[10px]"
                                                                        >
                                                                            Total
                                                                        </tspan>
                                                                    </text>
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </Pie>
                                            </PieChart>
                                        </ChartContainer>
                                    </div>

                                    {/* Categorical legend list */}
                                    <ul className="flex flex-col gap-1.5 text-xs">
                                        {absenceReasons.map(r => (
                                            <li
                                                key={r.name}
                                                className="flex items-center justify-between gap-4"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <span
                                                        className="inline-block size-2.5 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                REASON_COLORS[r.name] ||
                                                                'var(--reason-lainnya)',
                                                        }}
                                                    />
                                                    <span className="font-medium text-foreground">
                                                        {r.name}
                                                    </span>
                                                </span>
                                                <span className="font-mono text-muted-foreground">
                                                    {r.value} ({Math.round((r.value / totalAbsentForPie) * 100)}%)
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </PanelBody>
                    </Panel>
                </div>

                {/* ── Tier 3 · daily timetable ─────────────────────── */}
                <Panel>
                    <PanelHeader
                        icon={<CalendarDays />}
                        title="Jadwal & presensi hari ini"
                        meta={`Minggu ${selectedWeek} · ${selectedDay}`}
                        action={
                            <div className="inline-flex rounded-control border border-rule bg-panel-2 p-0.5">
                                {availableDays.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => setSelectedDay(day)}
                                        className={`rounded-control px-2.5 py-1 text-xs font-medium transition-colors ${
                                            selectedDay === day
                                                ? 'bg-foreground text-background shadow-xs'
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                        }
                    />

                    {todayEntries.length === 0 ? (
                        <PanelBody>
                            <EmptyState
                                icon={<CalendarDays />}
                                title={`Tidak ada jadwal di hari ${selectedDay}`}
                                description="Pilih hari lain atau tambahkan jadwal pada template."
                                variant="bare"
                            />
                        </PanelBody>
                    ) : (
                        <>
                            {/* ── Mobile Schedule Cards (md:hidden) ────────── */}
                            <div className="md:hidden divide-y divide-rule">
                                {todayEntries.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="p-4 flex flex-col gap-3 bg-panel hover:bg-panel-2/50 transition-colors"
                                    >
                                        {/* Top Header: No, Time, Room & Attendance */}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono font-bold text-muted-foreground bg-panel-2 px-1.5 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                <span className="text-xs font-mono font-semibold text-foreground">
                                                    {item.jam}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    • {item.tempat}
                                                </span>
                                            </div>

                                            {item.studentCount > 0 ? (
                                                <span className="inline-flex items-center gap-1 rounded-control bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                                                    {item.studentCount} Absen
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-control bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-800/50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                                                    <Check className="size-3" /> Lengkap
                                                </span>
                                            )}
                                        </div>

                                        {/* Middle: Subject & Class */}
                                        <div>
                                            <h4 className="font-semibold text-foreground text-sm leading-snug">
                                                {item.mataKuliah}
                                            </h4>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {item.prodi} · Sem {item.semester} ({item.golongan})
                                            </p>
                                        </div>

                                        {/* Material Note */}
                                        <div className="p-2.5 rounded-control bg-panel-2/70 border border-rule/60 text-xs">
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-0.5">
                                                Materi Perkuliahan:
                                            </span>
                                            {item.materi ? (
                                                <p className="text-foreground leading-relaxed">{item.materi}</p>
                                            ) : (
                                                <span className="italic text-muted-foreground">Belum diisi</span>
                                            )}
                                        </div>

                                        {/* Bottom Footer: Lecturer & Technician */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-rule/40">
                                            <div className="truncate">
                                                <span className="font-medium text-foreground">Dosen: </span>
                                                {item.pengajar || '-'}
                                            </div>
                                            <div className="shrink-0 text-[11px]">
                                                Teknisi: {item.teknisi || '-'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* ── Desktop Schedule Table (hidden md:block) ── */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="border-b border-rule bg-panel-2/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        <tr>
                                            <th className="py-3 pl-6 pr-3 w-12 text-center">No</th>
                                            <th className="py-3 px-4">Mata Kuliah & Kelas</th>
                                            <th className="py-3 px-4">Waktu & Tempat</th>
                                            <th className="py-3 px-4">Materi Perkuliahan</th>
                                            <th className="py-3 px-4">Pengajar & Teknisi</th>
                                            <th className="py-3 pl-3 pr-6 text-center w-28">Presensi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-rule">
                                        {todayEntries.map((item, index) => (
                                            <tr key={item.id} className="transition-colors hover:bg-panel-2/50">
                                                <td className="py-3.5 pl-6 pr-3 text-center text-xs font-mono text-muted-foreground">
                                                    {index + 1}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="font-medium text-foreground text-sm leading-tight">
                                                        {item.mataKuliah}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {item.prodi} · Sem {item.semester} ({item.golongan})
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <p className="text-xs font-mono text-foreground font-medium">
                                                        {item.jam}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {item.tempat}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    {item.materi ? (
                                                        <p className="text-xs text-foreground line-clamp-2">
                                                            {item.materi}
                                                        </p>
                                                    ) : (
                                                        <span className="text-xs italic text-muted-foreground">
                                                            Belum ada materi
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs">
                                                    <p className="text-foreground font-medium">
                                                        {item.pengajar || '-'}
                                                    </p>
                                                    <p className="text-muted-foreground mt-0.5">
                                                        Teknisi: {item.teknisi || '-'}
                                                    </p>
                                                </td>
                                                <td className="py-3.5 pl-3 pr-6 text-center">
                                                    {item.studentCount > 0 ? (
                                                        <span className="inline-flex items-center gap-1 rounded-control bg-amber-500/10 border border-amber-200/80 dark:border-amber-800/50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                            {item.studentCount} Absen
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1 rounded-control bg-emerald-500/10 border border-emerald-200/80 dark:border-emerald-800/50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                                                            <Check className="size-3" /> Lengkap
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </Panel>

                {/* ── Tier 4 · reference ───────────────────────────── */}
                <CalendarWidget />
            </PageSections>
        </PageShell>
    );
};

export default DashboardPage;
