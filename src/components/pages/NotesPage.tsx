/* Hallmark · genre: modern-minimal · macrostructure: Workbench (toolbar + card grid)
 * design-system: design.md · designed-as-app
 *
 * Two things changed shape here:
 *
 * 1. Creating a note was an inline panel that pushed the whole grid down and
 *    left the page in two different states depending on a toggle. It is now a
 *    dialog, so the grid never moves.
 * 2. Editing was inline *inside a card* — the card swapped into a form, resized,
 *    and broke the grid rhythm around it. Edit now opens the SAME dialog as
 *    create. One form, one code path, one shape.
 *
 * Note colours were seven raw Tailwind palettes (`bg-blue-50 dark:bg-blue-950/30`
 * …). They are user data, so they are tokens now: one `--note-*` hue anchor per
 * colour, with `.hm-note` deriving surface and border from it.
 */

import React, { useState, useMemo } from 'react';
import {
    Plus,
    Trash2,
    Loader2,
    AlertCircle,
    Pin,
    PinOff,
    Search,
    StickyNote,
    X,
    Edit3,
} from 'lucide-react';
import { useNotes, type Note, type NewNote } from '@/hooks/useNotes';
import { useDialog } from '@/context/DialogContext';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogBody,
    DialogFooter,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { PageShell, PageHeader, EmptyState } from '@/components/shell';

const NOTE_COLORS = [
    { value: 'default', label: 'Netral' },
    { value: 'blue', label: 'Biru' },
    { value: 'green', label: 'Hijau' },
    { value: 'yellow', label: 'Kuning' },
    { value: 'red', label: 'Merah' },
    { value: 'purple', label: 'Ungu' },
    { value: 'orange', label: 'Oranye' },
] as const;

/** A note's colour reaches CSS as one custom property; `.hm-note` does the rest. */
const noteHue = (color?: string) =>
    ({ ['--note' as string]: `var(--note-${color || 'default'})` }) as React.CSSProperties;

const LinkifiedText: React.FC<{ text: string }> = ({ text }) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-link hover:underline font-medium"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {part}
                        </a>
                    );
                }
                return <span key={i}>{part}</span>;
            })}
        </>
    );
};

/** A 3px band of the note's colour across the top of a dialog. The dialog body
 *  keeps the panel surface — tinting the whole sheet would fight `bg-panel`,
 *  since utilities out-rank the `.hm-note` component layer. */
const NoteHueStrip: React.FC = () => (
    <span
        aria-hidden
        className="hm-note-strip absolute inset-x-0 top-0 h-[3px] rounded-t-panel"
    />
);

/** Colour picker shared by the editor dialog. */
const ColorPicker: React.FC<{
    value: string;
    onChange: (value: string) => void;
}> = ({ value, onChange }) => (
    <div role="radiogroup" aria-label="Warna catatan" className="flex flex-wrap gap-2">
        {NOTE_COLORS.map((c) => (
            <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={value === c.value}
                aria-label={c.label}
                title={c.label}
                onClick={() => onChange(c.value)}
                style={noteHue(c.value)}
                className={`hm-swatch size-7 rounded-full border transition-[box-shadow,border-color] duration-[180ms] ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    value === c.value
                        ? 'border-foreground ring-2 ring-foreground/15'
                        : 'border-rule hover:border-foreground/40'
                }`}
            />
        ))}
    </div>
);

interface NotesPageProps {
    userId: string | null;
}

const emptyDraft: NewNote = { title: '', content: '', color: 'default', pinned: false };

const NotesPage: React.FC<NotesPageProps> = ({ userId }) => {
    const {
        notes,
        loading,
        error,
        createNote,
        updateNote,
        deleteNote,
        togglePin,
    } = useNotes(userId);
    const { showConfirm } = useDialog();

    const [searchQuery, setSearchQuery] = useState('');
    const [viewingNote, setViewingNote] = useState<Note | null>(null);

    // One editor for both create and edit. `editorFor` null = creating.
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorFor, setEditorFor] = useState<Note | null>(null);
    const [draft, setDraft] = useState<NewNote>(emptyDraft);
    const [saving, setSaving] = useState(false);

    // Filter notes by search
    const filteredNotes = useMemo(() => {
        if (!searchQuery.trim()) return notes;
        const q = searchQuery.toLowerCase();
        return notes.filter(n =>
            n.title.toLowerCase().includes(q) ||
            n.content.toLowerCase().includes(q)
        );
    }, [notes, searchQuery]);

    // Split pinned and unpinned
    const pinnedNotes = useMemo(() => filteredNotes.filter(n => n.pinned), [filteredNotes]);
    const unpinnedNotes = useMemo(() => filteredNotes.filter(n => !n.pinned), [filteredNotes]);

    const openCreate = () => {
        setEditorFor(null);
        setDraft(emptyDraft);
        setEditorOpen(true);
    };

    const openEdit = (note: Note) => {
        setEditorFor(note);
        setDraft({
            title: note.title,
            content: note.content,
            color: note.color,
            pinned: note.pinned,
        });
        setEditorOpen(true);
    };

    const draftIsEmpty = !draft.title.trim() && !draft.content.trim();

    const handleSave = async () => {
        if (draftIsEmpty) return;
        setSaving(true);
        try {
            if (editorFor) {
                await updateNote(editorFor.id, draft);
                setEditorOpen(false);
            } else {
                const result = await createNote({
                    ...draft,
                    title: draft.title.trim() || 'Catatan Tanpa Judul',
                });
                if (result) setEditorOpen(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (noteId: string) => {
        const isConfirmed = await showConfirm('Hapus Catatan', 'Apakah Anda yakin ingin menghapus catatan ini?');
        if (!isConfirmed) return;
        await deleteNote(noteId);
        if (viewingNote?.id === noteId) setViewingNote(null);
        if (editorFor?.id === noteId) setEditorOpen(false);
    };

    if (loading && notes.length === 0) {
        return (
            <PageShell>
                <PageHeader title="Catatan" meta="Memuat…" />
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="size-7 animate-spin text-muted-foreground" />
                </div>
            </PageShell>
        );
    }

    const isSearching = searchQuery.trim().length > 0;

    return (
        <PageShell>
            <PageHeader
                title="Catatan"
                meta={
                    isSearching
                        ? `${filteredNotes.length} dari ${notes.length} catatan`
                        : `${notes.length} catatan tersimpan`
                }
                actions={
                    <>
                        {loading && (
                            <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        )}
                        <Button onClick={openCreate}>
                            <Plus />
                            Catatan baru
                        </Button>
                    </>
                }
            />

            {error && (
                <div
                    role="alert"
                    className="mb-5 flex items-start gap-2 rounded-control border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive"
                >
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Search */}
            {notes.length > 0 && (
                <div className="relative mb-6 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari judul atau isi catatan…"
                        aria-label="Cari catatan"
                        className="w-full rounded-control border border-input bg-background py-2 pl-9 pr-10 text-sm"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            aria-label="Bersihkan pencarian"
                            className="absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-control text-muted-foreground transition-colors duration-[180ms] ease-out hover:bg-panel-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>
            )}

            {/* Empty — nothing saved at all */}
            {notes.length === 0 && (
                <EmptyState
                    icon={<StickyNote />}
                    title="Belum ada catatan"
                    description="Simpan informasi penting yang masuk — jadwal susulan, permintaan dosen, apa pun yang perlu diingat."
                    actions={
                        <Button onClick={openCreate}>
                            <Plus /> Catatan baru
                        </Button>
                    }
                />
            )}

            {/* Empty — search found nothing */}
            {notes.length > 0 && filteredNotes.length === 0 && (
                <EmptyState
                    icon={<Search />}
                    title="Tidak ditemukan"
                    description={`Tidak ada catatan yang cocok dengan “${searchQuery}”.`}
                    actions={
                        <Button variant="outline" onClick={() => setSearchQuery('')}>
                            <X /> Bersihkan pencarian
                        </Button>
                    }
                />
            )}

            {/* Pinned */}
            {pinnedNotes.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                        <Pin className="size-3.5 text-muted-foreground" />
                        Disematkan
                        <span data-numeric className="font-normal text-muted-foreground">
                            ({pinnedNotes.length})
                        </span>
                    </h2>
                    <NoteGrid
                        notes={pinnedNotes}
                        onView={setViewingNote}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onTogglePin={togglePin}
                    />
                </section>
            )}

            {/* Others */}
            {unpinnedNotes.length > 0 && (
                <section>
                    {pinnedNotes.length > 0 && (
                        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <StickyNote className="size-3.5 text-muted-foreground" />
                            Catatan lainnya
                            <span data-numeric className="font-normal text-muted-foreground">
                                ({unpinnedNotes.length})
                            </span>
                        </h2>
                    )}
                    <NoteGrid
                        notes={unpinnedNotes}
                        onView={setViewingNote}
                        onEdit={openEdit}
                        onDelete={handleDelete}
                        onTogglePin={togglePin}
                    />
                </section>
            )}

            {/* ── Editor dialog — create AND edit ─────────────────── */}
            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="max-w-xl" style={noteHue(draft.color)}>
                    <NoteHueStrip />
                    <DialogHeader>
                        <DialogTitle>
                            {editorFor ? 'Edit catatan' : 'Catatan baru'}
                        </DialogTitle>
                        <DialogDescription>
                            {editorFor
                                ? 'Perubahan tersimpan saat kamu menekan Simpan.'
                                : 'Judul boleh dikosongkan — nanti diberi nama otomatis.'}
                        </DialogDescription>
                    </DialogHeader>

                    <DialogBody className="space-y-4">
                        <div className="space-y-1.5">
                            <label htmlFor="note-title" className="text-xs font-medium text-muted-foreground">
                                Judul
                            </label>
                            <input
                                id="note-title"
                                value={draft.title}
                                onChange={e => setDraft(p => ({ ...p, title: e.target.value }))}
                                placeholder="Judul catatan"
                                className="w-full rounded-control border border-input bg-background px-3 py-2 text-sm font-medium"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="note-content" className="text-xs font-medium text-muted-foreground">
                                Isi
                            </label>
                            <textarea
                                id="note-content"
                                value={draft.content}
                                onChange={e => setDraft(p => ({ ...p, content: e.target.value }))}
                                placeholder="Tulis catatanmu di sini…"
                                rows={8}
                                className="w-full resize-y rounded-control border border-input bg-background px-3 py-2 text-sm"
                            />
                        </div>

                        <div className="space-y-2">
                            <span className="block text-xs font-medium text-muted-foreground">Warna</span>
                            <ColorPicker
                                value={draft.color || 'default'}
                                onChange={(color) => setDraft(p => ({ ...p, color }))}
                            />
                        </div>
                    </DialogBody>

                    <DialogFooter>
                        {editorFor && (
                            <Button
                                variant="ghost"
                                onClick={() => handleDelete(editorFor.id)}
                                className="mr-auto text-muted-foreground hover:text-destructive"
                            >
                                <Trash2 /> Hapus
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setEditorOpen(false)}>
                            Batal
                        </Button>
                        <Button onClick={handleSave} disabled={draftIsEmpty || saving}>
                            {saving ? <Loader2 className="animate-spin" /> : null}
                            {saving ? 'Menyimpan…' : 'Simpan'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Detail dialog ───────────────────────────────────── */}
            <Dialog
                open={viewingNote !== null}
                onOpenChange={(open) => !open && setViewingNote(null)}
            >
                <DialogContent className="max-w-2xl" style={noteHue(viewingNote?.color)}>
                    {viewingNote && (
                        <>
                            <NoteHueStrip />
                            <DialogHeader>
                                <DialogTitle className="text-lg">
                                    {viewingNote.title || 'Catatan'}
                                </DialogTitle>
                                <DialogDescription>
                                    Diperbarui{' '}
                                    {new Date(viewingNote.updated_at).toLocaleString('id-ID', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </DialogDescription>
                            </DialogHeader>

                            <DialogBody>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    <LinkifiedText text={viewingNote.content} />
                                </p>
                            </DialogBody>

                            <DialogFooter>
                                <span className="mr-auto text-xs text-muted-foreground">
                                    Dibuat{' '}
                                    {new Date(viewingNote.created_at).toLocaleString('id-ID', {
                                        day: 'numeric', month: 'short', year: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                    })}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        const note = viewingNote;
                                        setViewingNote(null);
                                        openEdit(note);
                                    }}
                                >
                                    <Edit3 /> Edit
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </PageShell>
    );
};

// ══════════════════════════════════════════════════════════
// Grid + Card
// ══════════════════════════════════════════════════════════

interface NoteGridProps {
    notes: Note[];
    onView: (note: Note) => void;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string) => void;
}

const NoteGrid: React.FC<NoteGridProps> = ({ notes, onView, onEdit, onDelete, onTogglePin }) => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {notes.map(note => (
            <NoteCard
                key={note.id}
                note={note}
                onView={onView}
                onEdit={onEdit}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
            />
        ))}
    </div>
);

interface NoteCardProps {
    note: Note;
    onView: (note: Note) => void;
    onEdit: (note: Note) => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onView, onEdit, onDelete, onTogglePin }) => {
    return (
        <div
            style={noteHue(note.color)}
            className="hm-note group relative flex flex-col rounded-panel border p-4 transition-colors duration-[180ms] ease-out focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
        >
            {/* The card body is the button — the row of actions below stays
                outside it, so nesting a button in a button never happens. */}
            <button
                type="button"
                onClick={() => onView(note)}
                className="min-w-0 flex-1 text-left focus:outline-none"
            >
                {note.pinned && (
                    <Pin
                        aria-label="Disematkan"
                        className="absolute right-3 top-3 size-3.5 fill-current text-muted-foreground"
                    />
                )}

                {note.title && (
                    <h3 className="mb-1.5 line-clamp-2 pr-6 text-sm font-semibold">
                        {note.title}
                    </h3>
                )}

                {note.content && (
                    <p className="line-clamp-6 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                        {note.content}
                    </p>
                )}
            </button>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-rule/60 pt-2.5">
                <span className="truncate text-[0.6875rem] text-muted-foreground">
                    {new Date(note.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>

                {/* Always present, not hover-revealed — a hover-only control is
                    invisible to touch and keyboard users. */}
                <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity duration-[180ms] ease-out group-hover:opacity-100 group-focus-within:opacity-100">
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onTogglePin(note.id)}
                        aria-label={note.pinned ? 'Lepas sematan' : 'Sematkan catatan'}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        {note.pinned ? <PinOff /> : <Pin />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onEdit(note)}
                        aria-label={`Edit ${note.title || 'catatan'}`}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Edit3 />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => onDelete(note.id)}
                        aria-label={`Hapus ${note.title || 'catatan'}`}
                        className="text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default NotesPage;
