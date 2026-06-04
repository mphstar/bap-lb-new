import { useState, useEffect, useCallback, useRef } from 'react';
import type { AssessmentForm } from '@/types';
import {
    loadAssessmentFromLocalStorage,
    saveAssessmentToLocalStorage,
} from '@/utils/storage';

const DEBOUNCE_MS = 1000;

export const useAssessmentData = (userId: string | null) => {
    const [forms, setForms] = useState<AssessmentForm[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef<AssessmentForm[] | null>(null);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, []);

    // Load when userId changes
    useEffect(() => {
        if (!userId) {
            setForms([]);
            setLoading(false);
            return;
        }

        const load = async () => {
            setLoading(true);
            try {
                // Try API first
                try {
                    const res = await fetch('/api/assessment');
                    if (!res.ok) throw new Error('API load failed');
                    const cloud = await res.json();
                    
                    setForms(cloud);
                    saveAssessmentToLocalStorage(cloud, userId);
                    setLoading(false);
                    return;
                } catch (e) {
                    console.error('[useAssessmentData] API load failed:', e);
                }

                // Fallback to localStorage
                const local = loadAssessmentFromLocalStorage(userId);
                setForms(local);

                // If user is logged in and has local data but no cloud data, push to cloud
                if (local.length > 0) {
                    fetch('/api/assessment', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(local),
                    }).catch(console.error);
                }
            } catch (e) {
                console.error('[useAssessmentData] load error:', e);
                setForms(loadAssessmentFromLocalStorage(userId));
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [userId]);

    // Debounced API save
    const debouncedSave = useCallback((newForms: AssessmentForm[]) => {
        pendingRef.current = newForms;

        if (timerRef.current) clearTimeout(timerRef.current);

        if (!userId) {
            setSaving(false);
            return;
        }

        timerRef.current = setTimeout(() => {
            const data = pendingRef.current;
            if (!data || !userId) {
                setSaving(false);
                return;
            }

            fetch('/api/assessment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })
                .catch(err => console.error('[useAssessmentData] save error:', err))
                .finally(() => {
                    setSaving(false);
                    pendingRef.current = null;
                });
        }, DEBOUNCE_MS);
    }, [userId]);

    // Wrapped setter that persists
    const updateForms = useCallback((updater: AssessmentForm[] | ((prev: AssessmentForm[]) => AssessmentForm[])) => {
        setSaving(true);
        setForms(prev => {
            const newForms = typeof updater === 'function' ? updater(prev) : updater;
            if (userId) {
                saveAssessmentToLocalStorage(newForms, userId);
            }
            debouncedSave(newForms);
            return newForms;
        });
    }, [debouncedSave, userId]);

    return { forms, setForms: updateForms, loading, saving };
};
