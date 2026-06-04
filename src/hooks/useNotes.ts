import { useState, useEffect, useCallback } from 'react';

export interface Note {
    id: string;
    user_id: string;
    title: string;
    content: string;
    color: string;
    pinned: boolean;
    created_at: string;
    updated_at: string;
}

export type NewNote = Pick<Note, 'title' | 'content' | 'color' | 'pinned'>;

export function useNotes(userId: string | null) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadNotes = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/notes');
            if (!res.ok) throw new Error('Failed to load notes');
            const data = await res.json();
            
            // Map camelCase Drizzle properties to snake_case for UI compatibility
            const mapped = data.map((n: any) => ({
                id: n.id,
                user_id: n.userId,
                title: n.title,
                content: n.content,
                color: n.color,
                pinned: n.pinned,
                created_at: n.createdAt,
                updated_at: n.updatedAt,
            }));
            
            setNotes(mapped);
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to load notes';
            setError(msg);
            console.error('[useNotes] loadNotes:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    const createNote = useCallback(async (note: NewNote) => {
        if (!userId) return null;
        setError(null);
        try {
            const res = await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: note.title,
                    content: note.content,
                    color: note.color,
                    pinned: note.pinned,
                }),
            });
            if (!res.ok) throw new Error('Failed to create note');
            const n = await res.json();
            
            const mapped: Note = {
                id: n.id,
                user_id: n.userId,
                title: n.title,
                content: n.content,
                color: n.color,
                pinned: n.pinned,
                created_at: n.createdAt,
                updated_at: n.updatedAt,
            };

            setNotes(prev => [mapped, ...prev]);
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to create note';
            setError(msg);
            console.error('[useNotes] createNote:', e);
            return null;
        }
    }, [userId]);

    const updateNote = useCallback(async (noteId: string, updates: Partial<NewNote>) => {
        setError(null);
        try {
            const res = await fetch('/api/notes', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: noteId,
                    ...updates,
                }),
            });
            if (!res.ok) throw new Error('Failed to update note');
            const n = await res.json();

            const mapped: Note = {
                id: n.id,
                user_id: n.userId,
                title: n.title,
                content: n.content,
                color: n.color,
                pinned: n.pinned,
                created_at: n.createdAt,
                updated_at: n.updatedAt,
            };

            setNotes(prev => prev.map(item => item.id === noteId ? mapped : item));
            return mapped;
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to update note';
            setError(msg);
            console.error('[useNotes] updateNote:', e);
            return null;
        }
    }, []);

    const deleteNote = useCallback(async (noteId: string) => {
        setError(null);
        try {
            const res = await fetch(`/api/notes?id=${noteId}`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete note');
            setNotes(prev => prev.filter(n => n.id !== noteId));
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Failed to delete note';
            setError(msg);
            console.error('[useNotes] deleteNote:', e);
        }
    }, []);

    const togglePin = useCallback(async (noteId: string) => {
        const note = notes.find(n => n.id === noteId);
        if (!note) return;
        return updateNote(noteId, { pinned: !note.pinned });
    }, [notes, updateNote]);

    useEffect(() => {
        if (userId) {
            loadNotes();
        } else {
            setNotes([]);
        }
    }, [userId, loadNotes]);

    return {
        notes,
        loading,
        error,
        loadNotes,
        createNote,
        updateNote,
        deleteNote,
        togglePin,
    };
}
