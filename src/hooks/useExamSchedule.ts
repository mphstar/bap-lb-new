import { useState, useEffect, useCallback } from 'react';

export interface ExamSchedule {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface ExamScheduleEntry {
    id: string;
    exam_schedule_id: string;
    user_id: string;
    hari: string;
    tanggal: string;
    jam: string;
    semester: string;
    golongan: string;
    kode_mk: string;
    mata_kuliah: string;
    ruang: string;
    created_at: string;
    updated_at: string;
}

export interface ExamScheduleNote {
    id: string;
    entry_id: string;
    user_id: string;
    content: string;
    created_at: string;
}

export type NewEntry = Omit<ExamScheduleEntry, 'id' | 'user_id' | 'exam_schedule_id' | 'created_at' | 'updated_at'>;

export function useExamSchedule(userId: string | null) {
    const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
    const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);
    const [entries, setEntries] = useState<ExamScheduleEntry[]>([]);
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
    const [notes, setNotes] = useState<ExamScheduleNote[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // ─── Schedules CRUD ───

    const loadSchedules = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/exams/schedules');
            if (!res.ok) throw new Error('Failed to load schedules');
            const data = await res.json();
            
            const mapped = data.map((s: any) => ({
                id: s.id,
                user_id: s.userId,
                name: s.name,
                created_at: s.createdAt,
                updated_at: s.updatedAt,
            }));
            
            setSchedules(mapped);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load schedules';
            setError(msg);
            console.error('[useExamSchedule] loadSchedules:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createSchedule = useCallback(async (name: string) => {
        if (!userId) return null;
        setError(null);
        try {
            const res = await fetch('/api/exams/schedules', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            if (!res.ok) throw new Error('Failed to create schedule');
            const s = await res.json();

            const mapped: ExamSchedule = {
                id: s.id,
                user_id: s.userId,
                name: s.name,
                created_at: s.createdAt,
                updated_at: s.updatedAt,
            };

            setSchedules(prev => [mapped, ...prev]);
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to create schedule';
            setError(msg);
            console.error('[useExamSchedule] createSchedule:', e);
            return null;
        }
    }, [userId]);

    const deleteSchedule = useCallback(async (id: string) => {
        setError(null);
        try {
            const res = await fetch(`/api/exams/schedules?id=${id}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete schedule');
            
            setSchedules(prev => prev.filter(s => s.id !== id));
            if (activeScheduleId === id) {
                setActiveScheduleId(null);
                setEntries([]);
                setSelectedEntryId(null);
                setNotes([]);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to delete schedule';
            setError(msg);
            console.error('[useExamSchedule] deleteSchedule:', e);
        }
    }, [activeScheduleId]);

    // ─── Entries CRUD ───

    const loadEntries = useCallback(async (scheduleId: string) => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/exams/entries?scheduleId=${scheduleId}`);
            if (!res.ok) throw new Error('Failed to load entries');
            const data = await res.json();

            const mapped = data.map((e: any) => ({
                id: e.id,
                exam_schedule_id: e.examScheduleId,
                user_id: e.userId,
                hari: e.hari,
                tanggal: e.tanggal,
                jam: e.jam,
                semester: e.semester,
                golongan: e.golongan,
                kode_mk: e.kodeMk,
                mata_kuliah: e.mataKuliah,
                ruang: e.ruang,
                created_at: e.createdAt,
                updated_at: e.updatedAt,
            }));

            setEntries(mapped);
            setActiveScheduleId(scheduleId);
            setSelectedEntryId(null);
            setNotes([]);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load entries';
            setError(msg);
            console.error('[useExamSchedule] loadEntries:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const addEntry = useCallback(async (scheduleId: string, entry: NewEntry) => {
        if (!userId) return null;
        setError(null);
        try {
            const res = await fetch('/api/exams/entries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scheduleId,
                    hari: entry.hari,
                    tanggal: entry.tanggal,
                    jam: entry.jam,
                    semester: entry.semester,
                    golongan: entry.golongan,
                    kodeMk: entry.kode_mk,
                    mataKuliah: entry.mata_kuliah,
                    ruang: entry.ruang,
                }),
            });
            if (!res.ok) throw new Error('Failed to add entry');
            const e = await res.json();

            const mapped: ExamScheduleEntry = {
                id: e.id,
                exam_schedule_id: e.examScheduleId,
                user_id: e.userId,
                hari: e.hari,
                tanggal: e.tanggal,
                jam: e.jam,
                semester: e.semester,
                golongan: e.golongan,
                kode_mk: e.kodeMk,
                mata_kuliah: e.mataKuliah,
                ruang: e.ruang,
                created_at: e.createdAt,
                updated_at: e.updatedAt,
            };

            setEntries(prev => [...prev, mapped]);
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to add entry';
            setError(msg);
            console.error('[useExamSchedule] addEntry:', e);
            return null;
        }
    }, [userId]);

    const updateEntry = useCallback(async (entryId: string, updates: Partial<NewEntry>) => {
        setError(null);
        try {
            const res = await fetch('/api/exams/entries', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: entryId,
                    ...updates,
                }),
            });
            if (!res.ok) throw new Error('Failed to update entry');
            const e = await res.json();

            const mapped: ExamScheduleEntry = {
                id: e.id,
                exam_schedule_id: e.examScheduleId,
                user_id: e.userId,
                hari: e.hari,
                tanggal: e.tanggal,
                jam: e.jam,
                semester: e.semester,
                golongan: e.golongan,
                kode_mk: e.kodeMk,
                mata_kuliah: e.mataKuliah,
                ruang: e.ruang,
                created_at: e.createdAt,
                updated_at: e.updatedAt,
            };

            setEntries(prev => prev.map(item => item.id === entryId ? mapped : item));
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to update entry';
            setError(msg);
            console.error('[useExamSchedule] updateEntry:', e);
            return null;
        }
    }, []);

    const deleteEntry = useCallback(async (entryId: string) => {
        setError(null);
        try {
            const res = await fetch(`/api/exams/entries?id=${entryId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete entry');
            
            setEntries(prev => prev.filter(e => e.id !== entryId));
            if (selectedEntryId === entryId) {
                setSelectedEntryId(null);
                setNotes([]);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to delete entry';
            setError(msg);
            console.error('[useExamSchedule] deleteEntry:', e);
        }
    }, [selectedEntryId]);

    // ─── Notes CRUD ───

    const loadNotes = useCallback(async (entryId: string) => {
        if (!userId) return;
        setError(null);
        try {
            const res = await fetch(`/api/exams/notes?entryId=${entryId}`);
            if (!res.ok) throw new Error('Failed to load notes');
            const data = await res.json();

            const mapped = data.map((n: any) => ({
                id: n.id,
                entry_id: n.entryId,
                user_id: n.userId,
                content: n.content,
                created_at: n.createdAt,
            }));

            setNotes(mapped);
            setSelectedEntryId(entryId);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load notes';
            setError(msg);
            console.error('[useExamSchedule] loadNotes:', e);
        }
    }, [userId]);

    const addNote = useCallback(async (entryId: string, content: string) => {
        if (!userId) return null;
        setError(null);
        try {
            const res = await fetch('/api/exams/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ entryId, content }),
            });
            if (!res.ok) throw new Error('Failed to add note');
            const n = await res.json();

            const mapped: ExamScheduleNote = {
                id: n.id,
                entry_id: n.entryId,
                user_id: n.userId,
                content: n.content,
                created_at: n.createdAt,
            };

            setNotes(prev => [mapped, ...prev]);
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to add note';
            setError(msg);
            console.error('[useExamSchedule] addNote:', e);
            return null;
        }
    }, [userId]);

    const deleteNote = useCallback(async (noteId: string) => {
        setError(null);
        try {
            const res = await fetch(`/api/exams/notes?id=${noteId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete note');
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to delete note';
            setError(msg);
            console.error('[useExamSchedule] deleteNote:', e);
        }
    }, []);

    // ─── Initial load ───

    useEffect(() => {
        if (userId) {
            loadSchedules();
        } else {
            setSchedules([]);
            setEntries([]);
            setNotes([]);
            setActiveScheduleId(null);
            setSelectedEntryId(null);
        }
    }, [userId, loadSchedules]);

    return {
        schedules,
        activeScheduleId,
        entries,
        selectedEntryId,
        notes,
        loading,
        error,
        loadSchedules,
        createSchedule,
        deleteSchedule,
        loadEntries,
        addEntry,
        updateEntry,
        deleteEntry,
        loadNotes,
        addNote,
        deleteNote,
        setActiveScheduleId,
        setSelectedEntryId,
    };
}
