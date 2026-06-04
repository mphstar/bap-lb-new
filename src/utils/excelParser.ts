import { read, utils } from 'xlsx';
import type { ScheduleEntry, Student, WeekImportData, SmartImportResult } from '@/types';

/** Data returned from import, includes template + week 1 seed data */
export interface ImportResult {
    entries: ScheduleEntry[];
    week1Data: { scheduleId: string; materi: string; tanggal: string }[];
    studentsMap: Record<string, Student[]>;
}

/**
 * Reads an Excel file and returns the list of sheet names.
 */
export const getSheetNames = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });
                resolve(workbook.SheetNames);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Import an Excel sheet as a ScheduleEntry[] template.
 * Also returns week 1 seed data (materi + tanggal from the import).
 */
export const importAsTemplate = async (file: File, sheetName: string): Promise<ImportResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });
                const worksheet = workbook.Sheets[sheetName];

                if (!worksheet) {
                    reject(new Error(`Sheet "${sheetName}" not found.`));
                    return;
                }

                const { entries, week1Data, studentsMap } = parseSheet(worksheet);
                resolve({ entries, week1Data, studentsMap });
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * Smart Import: Scans for sheets named "Minggu X" or "Week X".
 * Returns template from the first valid week, and data for all found weeks.
 */
export const importSmart = async (file: File): Promise<SmartImportResult> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = read(data, { type: 'array' });

                const weekSheets: { weekNum: number; sheetName: string }[] = [];
                const regex = /^(minggu|week)\s*(\d+)$/i;

                workbook.SheetNames.forEach(name => {
                    const match = name.match(regex);
                    if (match) {
                        weekSheets.push({ weekNum: parseInt(match[2]), sheetName: name });
                    }
                });

                if (weekSheets.length === 0) {
                    // Fallback to first sheet as Week 1 if no pattern matches
                    const firstSheet = workbook.SheetNames[0];
                    if (firstSheet) {
                        weekSheets.push({ weekNum: 1, sheetName: firstSheet });
                    }
                }

                weekSheets.sort((a, b) => a.weekNum - b.weekNum);

                const weeks: Record<number, WeekImportData> = {};
                let template: ScheduleEntry[] = [];

                const masterSheetName = weekSheets[0]?.sheetName;
                if (!masterSheetName) {
                    reject(new Error("No valid sheets found."));
                    return;
                }

                // Parse Master Template
                const masterResult = parseSheet(workbook.Sheets[masterSheetName]);
                template = masterResult.entries;

                // Parse all weeks
                weekSheets.forEach(({ weekNum, sheetName }) => {
                    const { studentsMap, week1Data } = parseSheet(workbook.Sheets[sheetName]);

                    // Convert week1Data (array) to map for easier lookup
                    const details: Record<string, { materi: string; tanggal: string; pengajar: string; teknisi: string; }> = {};
                    week1Data.forEach(d => {
                        details[d.scheduleId] = {
                            materi: d.materi,
                            tanggal: d.tanggal,
                            pengajar: d.pengajar,
                            teknisi: d.teknisi
                        };
                    });

                    weeks[weekNum] = {
                        students: studentsMap,
                        details
                    };
                });

                resolve({ template, weeks });

            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

// Helper to parse a single sheet
function parseSheet(worksheet: any) {
    const jsonData = utils.sheet_to_json<any>(worksheet, { defval: "" });

    const entries: ScheduleEntry[] = [];
    const week1Data: { scheduleId: string; materi: string; tanggal: string; pengajar: string; teknisi: string }[] = [];
    const studentsMap: Record<string, Student[]> = {};

    jsonData.forEach((row: any, index: number) => {
        // Use Index-based ID for consistency across sheets.
        const id = `sched-${index + 1}`;

        const students: Student[] = [];

        for (let i = 1; i <= 10; i++) {
            const nameKey = `Nama Mahasiswa ${i}`;
            const nimKey = `NIM ${i}`;
            const remarksKey = `Keterangan ${i}`;

            if (row[nameKey] && String(row[nameKey]).trim() !== "") {
                students.push({
                    id: i,
                    name: String(row[nameKey]),
                    nim: String(row[nimKey] || "-"),
                    remarks: String(row[remarksKey] || ""),
                });
            }
        }

        studentsMap[id] = students;

        entries.push({
            id,
            no: Number(row['No']) || (index + 1),
            mataKuliah: String(row['Mata Kuliah'] || ""),
            hari: String(row['Hari'] || ""),
            tempat: String(row['Tempat'] || ""),
            jam: String(row['Jam'] || ""),
            prodi: String(row['Prodi'] || ""),
            semester: String(row['Semester'] || ""),
            golongan: String(row['Golongan'] || ""),
            defaultPengajar: String(row['Pengajar'] || ""),
            defaultTeknisi: String(row['Teknisi'] || ""),
        });

        week1Data.push({
            scheduleId: id,
            materi: String(row['Materi'] || ""),
            tanggal: String(row['Tanggal'] || ""),
            pengajar: String(row['Pengajar'] || ""),
            teknisi: String(row['Teknisi'] || ""),
        });
    });

    return { entries, week1Data, studentsMap };
}
