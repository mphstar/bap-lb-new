export interface Student {
    id: number;
    name: string;
    nim: string;
    remarks: string; // Keterangan per week (e.g. "Hadir", "Sakit", etc.)
}

export interface MasterStudent {
    nim: string;
    name: string;
    prodi?: string;
    semester?: string;
    golongan?: string;
}

// Base schedule entry (fixed across all 16 weeks)
export interface ScheduleEntry {
    id: string;
    no: number;
    mataKuliah: string;
    hari: string;
    tempat: string;
    jam: string;
    prodi: string;
    semester: string;
    golongan: string;
    defaultPengajar: string;
    defaultTeknisi: string;
    // students removed from here
}

// Per-week data for a single schedule entry
export interface WeeklyEntry {
    scheduleId: string;
    pengajar: string;
    materi: string;
    tanggal: string;
    teknisi: string;
    /** Dynamic list of students for this specific week/meeting */
    students: Student[];
}

// All data for a single week
export interface WeekData {
    weekNumber: number; // 1-16
    entries: WeeklyEntry[];
}

export interface MasterDosen {
    id?: string;
    name: string;
    signature?: string;
}

// Full app state persisted to localStorage
export interface AppData {
    scheduleTemplate: ScheduleEntry[];
    weeks: WeekData[];
    activeWeek: number; // 1-16, currently focused week
    dosenList: MasterDosen[]; // master list of dosen names
    studentMaster: MasterStudent[]; // auto-built master list of students
    academicYear?: string; // e.g. "2025/2026"
    academicSemester?: string; // e.g. "Genap" or "Ganjil"
}

// Legacy type for BapDocument/RecapTable rendering
export interface BapData {
    no: string;
    mataKuliah: string;
    materi: string;
    hari: string;
    tanggal: string;
    tempat: string;
    jam: string;
    prodi: string;
    semester: string;
    golongan: string;
    pengajar: string;
    teknisi: string;
    students: Student[];
}

/** 
 * Data extracted from Excel per sheet/week 
 */
export interface WeekImportData {
    students: Record<string, Student[]>; // scheduleId -> students
    details: Record<string, { materi: string; tanggal: string; pengajar: string; teknisi: string; }>; // scheduleId -> details
}

/** 
 * Result of Smart Import (all weeks mapping) 
 */
export interface SmartImportResult {
    template: ScheduleEntry[];
    weeks: Record<number, WeekImportData>;
}

// ─── Assessment / Grading Types ───

export interface AssessmentColumn {
    id: string;
    name: string; // e.g., "CROSS", "STRAIGHT"
}

export interface AssessmentSubject {
    id: string;
    mataKuliah: string;
    columns: AssessmentColumn[];
    notes?: string; // Optional info printed below table, e.g., grade ranges
}

export interface AssessmentStudent {
    no: number;
    nim: string;
    nama: string;
}

export interface AssessmentForm {
    id: string;
    name: string;
    students: AssessmentStudent[];
    subjects: AssessmentSubject[];
    // Grades: subjectId → nim → columnId → value
    grades: Record<string, Record<string, Record<string, string>>>;
}

export interface Archive {
    id: string;
    name: string;
    createdAt: string;
}

export interface ArchiveSnapshot {
    activeWeek: number;
    academicYear?: string;
    academicSemester?: string;
    scheduleTemplates: any[];
    studentMaster: any[];
    dosenList: any[];
    weeklyEntries: any[];
    weeklyStudents: any[];
    assessmentForms: any[];
    notes: any[];
    examSchedules: any[];
    examScheduleEntries: any[];
    examScheduleNotes: any[];
}
