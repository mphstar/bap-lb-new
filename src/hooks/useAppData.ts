import { useState, useEffect, useCallback, useRef } from 'react';
import type { AppData, ScheduleEntry, WeekData, WeekImportData, MasterStudent, MasterDosen } from '@/types';
import {
    loadFromLocalStorage,
    saveToLocalStorage,
    initializeWeeks,
} from '@/utils/storage';

const INITIAL_DATA: AppData = {
    scheduleTemplate: [],
    weeks: [],
    activeWeek: 1,
    dosenList: [],
    studentMaster: [],
};

const DEBOUNCE_MS = 2000;

export const useAppData = (
    userId: string | null
) => {
    const [data, setData] = useState<AppData>(INITIAL_DATA);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Debounce timer ref for saves
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingDataRef = useRef<AppData | null>(null);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    // Load data when userId changes
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                let loadedData: AppData | null = null;

                if (userId) {
                    try {
                        const res = await fetch('/api/weekly');
                        if (!res.ok) throw new Error('API load failed');
                        loadedData = await res.json();
                    } catch (e) {
                        console.error("Failed to load from API, falling back to local:", e);
                        setError(e instanceof Error ? e : new Error('Failed to load from cloud'));
                        const local = loadFromLocalStorage(userId);
                        if (local) loadedData = local;
                    }
                }

                if (loadedData) {
                    if (!loadedData.activeWeek) loadedData.activeWeek = 1;
                    if (!loadedData.dosenList) loadedData.dosenList = [];
                    if (!loadedData.studentMaster) loadedData.studentMaster = [];

                    setData(loadedData);
                } else {
                    setData(INITIAL_DATA);
                }
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error loading data'));
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [userId]);

    // Prevent page reload during active saves
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saving || pendingDataRef.current) {
                const msg = "Data sedang disimpan ke sistem lokal. Anda yakin ingin keluar?";
                e.preventDefault();
                e.returnValue = msg;
                return msg;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saving]);

    // Debounced API save
    const debouncedSave = useCallback((newData: AppData) => {
        pendingDataRef.current = newData;

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (!userId) {
            setSaving(false);
            return;
        }

        timerRef.current = setTimeout(async () => {
            const dataToSave = pendingDataRef.current;
            if (!dataToSave || !userId) return;

            const doSave = async (attempt: number): Promise<void> => {
                try {
                    const res = await fetch('/api/weekly', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(dataToSave),
                    });
                    if (!res.ok) throw new Error('API save failed');
                } catch (err) {
                    if (attempt < 1) {
                        // Retry once after 1 second
                        await new Promise(r => setTimeout(r, 1000));
                        return doSave(attempt + 1);
                    }
                    console.error("Failed to save via API (after retry):", err);
                    setError(err instanceof Error ? err : new Error('Failed to save to database'));
                }
            };

            await doSave(0);
            setSaving(false);
            pendingDataRef.current = null;
        }, DEBOUNCE_MS);
    }, [userId]);

    const withCurrentData = useCallback((updater: (current: AppData) => AppData) => {
        setSaving(true);
        setError(null);

        setData(prev => {
            const newData = updater(prev);
            if (userId) {
                saveToLocalStorage(newData, userId);
            }
            debouncedSave(newData);
            return newData;
        });
    }, [debouncedSave, userId]);

    const updateTemplate = useCallback((template: ScheduleEntry[], smartWeeksData?: Record<number, WeekImportData>) => {
        withCurrentData(current => {
            const weeks = initializeWeeks(template, smartWeeksData);
            return { ...current, scheduleTemplate: template, weeks };
        });
    }, [withCurrentData]);

    const updateWeeks = useCallback((weeks: WeekData[]) => {
        withCurrentData(current => ({ ...current, weeks }));
    }, [withCurrentData]);

    const updateActiveWeek = useCallback((activeWeek: number) => {
        withCurrentData(current => ({ ...current, activeWeek }));
    }, [withCurrentData]);

    const updateStudentMaster = useCallback((studentMaster: MasterStudent[]) => {
        withCurrentData(current => ({ ...current, studentMaster }));
    }, [withCurrentData]);

    const updateDosenList = useCallback((dosenList: MasterDosen[]) => {
        withCurrentData(current => ({ ...current, dosenList }));
    }, [withCurrentData]);

    const clearAll = useCallback(async () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        pendingDataRef.current = null;

        try {
            if (userId) {
                // Clear from local storage
                localStorage.removeItem(`bap_app_data_${userId}`);
                localStorage.removeItem(`bap-assessment-forms_${userId}`);
                
                // Clear from Postgres via API
                const res = await fetch('/api/settings/reset', { method: 'POST' });
                if (!res.ok) throw new Error('DB Reset API failed');
            }
        } catch (err) {
            console.error('[useAppData] clearAll error:', err);
            setError(err instanceof Error ? err : new Error('Failed to delete cloud data'));
        }
        
        setData(INITIAL_DATA);
    }, [userId]);

    return {
        data,
        loading,
        saving,
        error,
        updateTemplate,
        updateWeeks,
        updateActiveWeek,
        updateStudentMaster,
        updateDosenList,
        clearAll,
    };
};
