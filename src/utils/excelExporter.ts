import type { ScheduleEntry, WeekData, WeeklyEntry } from '@/types';
import { utils, writeFile } from 'xlsx';

/**
 * Build the header row matching the import format exactly.
 */
const HEADERS = [
    'No', 'Mata Kuliah', 'Materi', 'Hari', 'Tanggal', 'Tempat', 'Jam',
    'Prodi', 'Semester', 'Golongan', 'Pengajar', 'Teknisi',
    ...Array.from({ length: 10 }, (_, i) => [
        `Nama Mahasiswa ${i + 1}`, `NIM ${i + 1}`, `Keterangan ${i + 1}`
    ]).flat(),
];

/**
 * Convert a single week's data into a 2D array of rows (including header).
 */
function weekToRows(
    template: ScheduleEntry[],
    weekData: WeekData
): (string | number)[][] {
    const rows: (string | number)[][] = [HEADERS];

    template.forEach((entry, index) => {
        const weekly: WeeklyEntry = weekData.entries[index] || {
            scheduleId: entry.id,
            pengajar: entry.defaultPengajar,
            materi: '',
            tanggal: '',
            teknisi: entry.defaultTeknisi,
        };

        const row: (string | number)[] = [
            entry.no,
            entry.mataKuliah,
            weekly.materi,
            entry.hari,
            weekly.tanggal,
            entry.tempat,
            entry.jam,
            entry.prodi,
            entry.semester,
            entry.golongan,
            weekly.pengajar,
            weekly.teknisi,
        ];

        // Add student data (up to 10 students) from weekly entry
        const students = weekly.students || [];
        for (let i = 0; i < 10; i++) {
            const student = students[i];
            if (student) {
                row.push(student.name, student.nim, student.remarks);
            } else {
                row.push('', '', '');
            }
        }

        rows.push(row);
    });

    return rows;
}

/**
 * Export weekly data to Excel. Each selected week becomes a separate sheet.
 * Column format matches the import format exactly.
 */
export function exportWeeklyData(
    template: ScheduleEntry[],
    weeks: WeekData[],
    weekNumbers: number[]
): void {
    const workbook = utils.book_new();

    weekNumbers.forEach(wn => {
        const weekData = weeks.find(w => w.weekNumber === wn);
        if (!weekData) return;

        const rows = weekToRows(template, weekData);
        const worksheet = utils.aoa_to_sheet(rows);

        // Set column widths for readability
        worksheet['!cols'] = [
            { wch: 4 },   // No
            { wch: 25 },  // Mata Kuliah
            { wch: 30 },  // Materi
            { wch: 10 },  // Hari
            { wch: 12 },  // Tanggal
            { wch: 12 },  // Tempat
            { wch: 15 },  // Jam
            { wch: 12 },  // Prodi
            { wch: 8 },   // Semester
            { wch: 10 },  // Golongan
            { wch: 20 },  // Pengajar
            { wch: 15 },  // Teknisi
            // Student columns (3 per student × 10)
            ...Array.from({ length: 30 }, () => ({ wch: 15 })),
        ];

        utils.book_append_sheet(workbook, worksheet, `Minggu ${wn}`);
    });

    writeFile(workbook, `BAP_Data_Export.xlsx`);
}

/**
 * Export a single week's data to Excel.
 */
export function exportSingleWeek(
    template: ScheduleEntry[],
    weeks: WeekData[],
    weekNumber: number
): void {
    exportWeeklyData(template, weeks, [weekNumber]);
}
