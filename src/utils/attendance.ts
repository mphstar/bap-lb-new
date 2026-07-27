import type { ScheduleEntry, WeekData } from '@/types';

/**
 * Absence counting — one source of truth.
 *
 * The problem this solves: a course split across consecutive time slots on the
 * same day (Senin 07-09 and 09-11) is two rows in the schedule template, so a
 * student who missed that day is recorded twice. Summing `students.length`
 * therefore double-counts, and the figure stops being comparable between weeks
 * — a week whose block has one slot scores half a week whose block has two.
 *
 * The duplication in the DATA is correct and must stay: every session has its
 * own Daftar Hadir sheet, so the student genuinely belongs on both. Only the
 * aggregate was wrong.
 *
 * Two rules, both agreed with the user:
 *   1. Absent = the student has a non-empty `remarks`. A row with no remark is
 *      a roster entry nobody has classified yet, not an absence. This is the
 *      same rule the printed recap already applies
 *      (RecapTable.getAbsentStudents), so the dashboard now agrees with the BAP.
 *   2. When two slots of one block disagree on the remark, the most severe wins.
 */

/** ALPHA (unexcused) is the most serious; an unknown remark scores 0. */
const REMARK_SEVERITY: Record<string, number> = {
    ALPHA: 4,
    SAKIT: 3,
    IZIN: 2,
    MBKM: 1,
};

const severityOf = (remark: string) => REMARK_SEVERITY[remark.toUpperCase()] ?? 0;

/**
 * Fold a key part so trivial spelling differences don't split a block.
 * These fields arrive from Excel imports, where `"Basis Data"`, `"Basis Data "`
 * and `"basis  data"` all occur — comparing them raw would count one absence as
 * three, which is the exact bug this module exists to prevent.
 */
const norm = (v: string | undefined) =>
    (v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * Identity of one teaching block — the unit a student can be absent from once.
 *
 * Any number of time slots collapse into one block: 07-08 / 08-09 / 09-10 is
 * the same block as a single 07-10, because `jam` is not part of the key. The
 * rule is slot-count agnostic by construction, not special-cased for two.
 *
 * SPLITS on: hari · prodi · semester · golongan · mataKuliah
 * IGNORES:   jam · tempat · tanggal · pengajar · teknisi · no
 *
 * Deliberately stricter than `groupSessions`' key in dataGrouper.ts
 * (`mataKuliah-hari-tanggal-golongan`): it adds `prodi` and `semester`, so two
 * different classes that happen to share a course name and group letter on the
 * same day never merge.
 *
 * Deliberately looser on `tempat` and `pengajar`: a class that changes room or
 * has a second lecturer mid-block is still one block, and a student who missed
 * it missed it once.
 *
 * Known limit: the key is adjacency-blind. If the same course and golongan
 * genuinely meets twice on one day as two separate meetings (morning theory,
 * afternoon practicum), they merge into one block and a student absent from
 * both counts once.
 */
export const sessionBlockKey = (t: ScheduleEntry): string =>
    [t.hari, t.prodi, t.semester, t.golongan, t.mataKuliah].map(norm).join('|');

export interface AbsenceRecord {
    blockKey: string;
    nim: string;
    name: string;
    remarks: string;
}

export interface AbsenceTally {
    /** Distinct (block, student) pairs — the headline "tidak hadir" figure. */
    total: number;
    /** Distinct students, however many blocks they each missed. */
    uniqueStudents: number;
    /** `total`, split by the winning remark. */
    byReason: Record<string, number>;
}

const EMPTY_TALLY: AbsenceTally = { total: 0, uniqueStudents: 0, byReason: {} };

/**
 * One record per (block, student) pair. Two slots of the same block collapse to
 * one record carrying the more severe remark.
 */
export function collectWeekAbsence(
    template: ScheduleEntry[],
    week: WeekData | undefined
): AbsenceRecord[] {
    if (!week) return [];

    const blockOf = new Map(template.map(t => [t.id, sessionBlockKey(t)]));
    const byPair = new Map<string, AbsenceRecord>();

    for (const entry of week.entries) {
        const blockKey = blockOf.get(entry.scheduleId);
        if (!blockKey) continue; // schedule row deleted from the template

        for (const student of entry.students ?? []) {
            const remarks = student.remarks?.trim() ?? '';
            if (!remarks) continue; // rule 1 — unclassified, not absent

            const nim = student.nim?.trim() ?? '';
            if (!nim) continue; // no stable identity to dedupe on

            const pairKey = `${blockKey}|${nim}`;
            const seen = byPair.get(pairKey);

            // rule 2 — the more severe remark wins the block
            if (!seen || severityOf(remarks) > severityOf(seen.remarks)) {
                byPair.set(pairKey, { blockKey, nim, name: student.name, remarks });
            }
        }
    }

    return Array.from(byPair.values());
}

export function tallyWeekAbsence(
    template: ScheduleEntry[],
    week: WeekData | undefined
): AbsenceTally {
    const records = collectWeekAbsence(template, week);
    if (records.length === 0) return EMPTY_TALLY;

    const byReason: Record<string, number> = {};
    const students = new Set<string>();

    for (const r of records) {
        byReason[r.remarks] = (byReason[r.remarks] ?? 0) + 1;
        students.add(r.nim);
    }

    return {
        total: records.length,
        uniqueStudents: students.size,
        byReason,
    };
}

/**
 * Absences recorded against a single schedule row. Per-session on purpose — it
 * backs the "Tdk Hadir" column, where each row is its own attendance sheet, so
 * it must NOT be deduped across the block.
 */
export function countEntryAbsence(students: { remarks?: string }[] | undefined): number {
    return (students ?? []).filter(s => (s.remarks?.trim() ?? '') !== '').length;
}
