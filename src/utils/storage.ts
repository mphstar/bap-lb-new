import type { AppData, ScheduleEntry, WeekData, WeekImportData, BapData, MasterStudent, Student, AssessmentForm } from '@/types';

// Per-user localStorage keys
const STORAGE_KEY_PREFIX = 'bap_app_data';
const ASSESSMENT_KEY_PREFIX = 'bap-assessment-forms';

const getStorageKey = (userId: string) => `${STORAGE_KEY_PREFIX}_${userId}`;
const getAssessmentKey = (userId: string) => `${ASSESSMENT_KEY_PREFIX}_${userId}`;

/**
 * Migrate old global localStorage keys to per-user scoped keys.
 * Called once when a user logs in. Moves data from old key to new key
 * only if the new key doesn't already have data.
 */
export const migrateLocalStorage = (userId: string): void => {
    try {
        // Migrate app data
        const oldAppData = localStorage.getItem(STORAGE_KEY_PREFIX);
        const newAppKey = getStorageKey(userId);
        if (oldAppData && !localStorage.getItem(newAppKey)) {
            localStorage.setItem(newAppKey, oldAppData);
            console.log(`[storage] Migrated app data to ${newAppKey}`);
        }
        // Remove old global key after migration
        if (oldAppData) {
            localStorage.removeItem(STORAGE_KEY_PREFIX);
            console.log(`[storage] Removed old global app data key`);
        }

        // Migrate assessment data
        const oldAssessment = localStorage.getItem(ASSESSMENT_KEY_PREFIX);
        const newAssessmentKey = getAssessmentKey(userId);
        if (oldAssessment && !localStorage.getItem(newAssessmentKey)) {
            localStorage.setItem(newAssessmentKey, oldAssessment);
            console.log(`[storage] Migrated assessment data to ${newAssessmentKey}`);
        }
        // Remove old global key
        if (oldAssessment) {
            localStorage.removeItem(ASSESSMENT_KEY_PREFIX);
            console.log(`[storage] Removed old global assessment key`);
        }
    } catch (error) {
        console.error('[storage] Migration failed:', error);
    }
};

export const saveToLocalStorage = (data: AppData, userId: string): void => {
    try {
        localStorage.setItem(getStorageKey(userId), JSON.stringify(data));
    } catch (error) {
        console.error('Failed to save to localStorage', error);
    }
};

export const loadFromLocalStorage = (userId: string): AppData | null => {
    try {
        const data = localStorage.getItem(getStorageKey(userId));
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Failed to load local app data', error);
        return null;
    }
};

/**
 * Initialize 16 weeks of empty data based on the template.
 * If smartWeeksData is provided, seed specific weeks with imported data.
 */
export const initializeWeeks = (
    template: ScheduleEntry[],
    smartWeeksData?: Record<number, WeekImportData>,
    existingWeeks?: WeekData[]
): WeekData[] => {
    return Array.from({ length: 16 }, (_, i) => {
        const weekNum = i + 1;
        const weekImport = smartWeeksData?.[weekNum];
        const existingWeek = existingWeeks?.find(w => w.weekNumber === weekNum);

        return {
            weekNumber: weekNum,
            entries: template.map((entry) => {
                const existingEntry = existingWeek?.entries.find(e => e.scheduleId === entry.id);
                const details = weekImport?.details?.[entry.id];
                const students = weekImport?.students?.[entry.id] || existingEntry?.students || [];

                return {
                    scheduleId: entry.id,
                    pengajar: details ? details.pengajar : (existingEntry?.pengajar || entry.defaultPengajar),
                    materi: details ? details.materi : (existingEntry?.materi || ''),
                    tanggal: details ? details.tanggal : (existingEntry?.tanggal || ''),
                    teknisi: details ? details.teknisi : (existingEntry?.teknisi || entry.defaultTeknisi),
                    students: students,
                };
            }),
        };
    });
};

/**
 * Generate flat data structure for BAP printing/preview
 */
export const generateBapData = (template: ScheduleEntry[], week: WeekData): BapData[] => {
    return template.map(t => {
        const w = week.entries.find(e => e.scheduleId === t.id);
        if (!w) {
            return {
                no: String(t.no),
                mataKuliah: t.mataKuliah,
                materi: '',
                hari: t.hari,
                tanggal: '',
                tempat: t.tempat,
                jam: t.jam,
                prodi: t.prodi,
                semester: t.semester,
                golongan: t.golongan,
                pengajar: t.defaultPengajar,
                teknisi: t.defaultTeknisi,
                students: []
            };
        }

        return {
            no: String(t.no),
            mataKuliah: t.mataKuliah,
            materi: w.materi || '',
            hari: t.hari,
            tanggal: w.tanggal || '',
            tempat: t.tempat,
            jam: t.jam,
            prodi: t.prodi,
            semester: t.semester,
            golongan: t.golongan,
            pengajar: w.pengajar || t.defaultPengajar,
            teknisi: w.teknisi || t.defaultTeknisi,
            students: w.students || []
        };
    });
};

// =========================================================================
// Assessment Forms local storage cache
// =========================================================================

export const loadAssessmentFromLocalStorage = (userId: string): AssessmentForm[] => {
    try {
        const raw = localStorage.getItem(getAssessmentKey(userId));
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
};

export const saveAssessmentToLocalStorage = (forms: AssessmentForm[], userId: string): void => {
    try {
        localStorage.setItem(getAssessmentKey(userId), JSON.stringify(forms));
    } catch (e) {
        console.error('[storage] Failed to save assessment to localStorage:', e);
    }
};

// =========================================================================
// Export / Import All User Data
// =========================================================================

export interface UserDataExport {
    version: number;
    exportDate: string;
    appData: AppData;
    assessmentForms: AssessmentForm[];
}

/**
 * Export all user data (AppData + AssessmentForms) as a JSON file download.
 */
export const exportAllUserData = (appData: AppData, assessmentForms: AssessmentForm[]): void => {
    const payload: UserDataExport = {
        version: 1,
        exportDate: new Date().toISOString(),
        appData,
        assessmentForms,
    };

    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    a.download = `bap-export_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

/**
 * Parse and validate an imported JSON file. Returns the parsed data or throws.
 */
export const parseImportedUserData = (jsonString: string): UserDataExport => {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Format file tidak valid: bukan JSON object');
    }

    if (!parsed.appData || typeof parsed.appData !== 'object') {
        throw new Error('Format file tidak valid: field "appData" tidak ditemukan');
    }

    const { appData } = parsed;

    if (!Array.isArray(appData.scheduleTemplate)) {
        throw new Error('Format file tidak valid: scheduleTemplate harus berupa array');
    }
    if (!Array.isArray(appData.weeks)) {
        throw new Error('Format file tidak valid: weeks harus berupa array');
    }
    if (typeof appData.activeWeek !== 'number') {
        appData.activeWeek = 1;
    }
    if (!Array.isArray(appData.dosenList)) {
        appData.dosenList = [];
    } else {
        appData.dosenList = appData.dosenList.map((d: any) => {
            if (typeof d === 'string') {
                return { name: d, signature: '' };
            }
            return {
                id: d.id,
                name: String(d.name || ''),
                signature: String(d.signature || ''),
            };
        });
    }
    if (!Array.isArray(appData.studentMaster)) {
        appData.studentMaster = [];
    }

    const assessmentForms = Array.isArray(parsed.assessmentForms) ? parsed.assessmentForms : [];

    return {
        version: parsed.version || 1,
        exportDate: parsed.exportDate || '',
        appData,
        assessmentForms,
    };
};

export const generateId = (): string => {
    return Math.random().toString(36).substring(2, 11);
};

