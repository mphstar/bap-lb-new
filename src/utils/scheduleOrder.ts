/**
 * Fields any schedule-ish record shares, so the same ordering can drive the
 * template, the weekly editor, and the flat `BapData` rows used by print
 * (`BapData.no` is a string, hence the union).
 */
export interface Schedulable {
    hari?: string;
    mataKuliah?: string;
    prodi?: string;
    semester?: string;
    golongan?: string;
    jam?: string;
    no?: number | string;
}

/**
 * Canonical ordering for schedule rows.
 *
 * Crash schedules — two classes of the same course meeting at the same hour —
 * are common. Without a deterministic order the rows interleave (F 07, INT 07,
 * INT 09, F 09) and any control that lists schedules by `No` alone makes the
 * two classes indistinguishable.
 */
export const DAY_SEQUENCE = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

export const dayOrder = (hari: string | undefined): number => {
    const idx = DAY_SEQUENCE.indexOf((hari ?? '').trim());
    return idx === -1 ? DAY_SEQUENCE.length : idx;
};

/** First "HH.MM" / "HH:MM" in a time range, as minutes since midnight. */
export const startMinutes = (jam: string | undefined): number => {
    const match = (jam ?? '').match(/(\d{1,2})[.:](\d{2})/);
    if (!match) return Number.MAX_SAFE_INTEGER;
    return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
};

const noOf = (no: number | string | undefined): number => {
    if (typeof no === 'number') return no;
    const parsed = parseInt(no ?? '', 10);
    return Number.isNaN(parsed) ? 0 : parsed;
};

/** Identity of a class within a course: prodi · semester · golongan. */
export const classKey = (t: Schedulable): string =>
    [t.prodi, t.semester, t.golongan].map(v => (v ?? '').trim().toUpperCase()).join('|');

/**
 * Identity of one readable block: a course + class on one day. The 07.00–09.00
 * and 09.00–11.00 slots of the same class belong to the same block, like the
 * printed jadwal and the absence recap do.
 */
export const scheduleGroupKey = (t: Schedulable): string =>
    [t.hari, t.mataKuliah, t.prodi, t.semester, t.golongan]
        .map(v => (v ?? '').trim().toUpperCase()).join('|');

/** Human-readable class label, e.g. "TIF · Smt 5 · Gol INT". */
export const scheduleClassLabel = (t: Pick<Schedulable, 'prodi' | 'semester' | 'golongan'>): string => {
    const parts: string[] = [];
    if (t.prodi?.trim()) parts.push(t.prodi.trim());
    if (t.semester?.trim()) parts.push(`Smt ${t.semester.trim()}`);
    if (t.golongan?.trim()) parts.push(`Gol ${t.golongan.trim()}`);
    return parts.join(' · ');
};

/** Day → start time → class, for callers that only need a deterministic order. */
export const compareSchedule = <T extends Schedulable>(a: T, b: T): number => {
    const byDay = dayOrder(a.hari) - dayOrder(b.hari);
    if (byDay !== 0) return byDay;

    const byTime = startMinutes(a.jam) - startMinutes(b.jam);
    if (byTime !== 0) return byTime;

    const byClass = classKey(a).localeCompare(classKey(b));
    if (byClass !== 0) return byClass;

    return noOf(a.no) - noOf(b.no);
};

/**
 * Order rows so every course + class is read as one group: day first, then the
 * group's own `No` (which respects the template's drag order), then the start
 * time inside the group. Within a day the output reads e.g.
 * "Sistem Tertanam Smt 5 Gol F 07.00–09.00, 09.00–11.00, Gol INT 07.00–09.00, …".
 */
export const groupSchedule = <T extends Schedulable>(entries: T[]): T[] => {
    // Base order by day then `No` fixes the order the groups appear in.
    const base = [...entries].sort(
        (a, b) => dayOrder(a.hari) - dayOrder(b.hari) || noOf(a.no) - noOf(b.no),
    );

    // Map preserves first-seen order, i.e. the group's lowest `No`.
    const groups = new Map<string, T[]>();
    for (const entry of base) {
        const key = scheduleGroupKey(entry);
        const group = groups.get(key) ?? [];
        group.push(entry);
        groups.set(key, group);
    }

    // Inside a group, time ascending; `No` breaks ties.
    for (const group of groups.values()) {
        group.sort(
            (a, b) => startMinutes(a.jam) - startMinutes(b.jam) || noOf(a.no) - noOf(b.no),
        );
    }

    return Array.from(groups.values()).flat();
};
