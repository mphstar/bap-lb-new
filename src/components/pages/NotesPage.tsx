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
    Check,
} from 'lucide-react';
import { useNotes, type Note, type NewNote } from '@/hooks/useNotes';
import { useDialog } from '@/context/DialogContext';

const NOTE_COLORS = [
    { value: 'default', label: 'Default', bg: 'bg-card', border: 'border-border', dot: 'bg-muted-foreground' },
    { value: 'blue', label: 'Biru', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', dot: 'bg-blue-500' },
    { value: 'green', label: 'Hijau', bg: 'bg-green-50 dark:bg-green-950/30', border: 'border-green-200 dark:border-green-800', dot: 'bg-green-500' },
    { value: 'yellow', label: 'Kuning', bg: 'bg-yellow-50 dark:bg-yellow-950/30', border: 'border-yellow-200 dark:border-yellow-800', dot: 'bg-yellow-500' },
    { value: 'red', label: 'Merah', bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-800', dot: 'bg-red-500' },
    { value: 'purple', label: 'Ungu', bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', dot: 'bg-purple-500' },
    { value: 'orange', label: 'Oranye', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', dot: 'bg-orange-500' },
];

const getColorClasses = (color: string) => {
    return NOTE_COLORS.find(c => c.value === color) || NOTE_COLORS[0];
};

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
                            className="text-primary hover:underline font-medium"
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

interface NotesPageProps {
    userId: string | null;
}

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

    const [showAddForm, setShowAddForm] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<NewNote>>({});
    const [viewingNote, setViewingNote] = useState<Note | null>(null);

    // New note form state
    const [newNote, setNewNote] = useState<NewNote>({
        title: '',
        content: '',
        color: 'default',
        pinned: false,
    });

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

    const handleCreate = async () => {
        if (!newNote.title.trim() && !newNote.content.trim()) return;
        const result = await createNote({
            ...newNote,
            title: newNote.title.trim() || 'Catatan Tanpa Judul',
        });
        if (result) {
            setNewNote({ title: '', content: '', color: 'default', pinned: false });
            setShowAddForm(false);
        }
    };

    const handleStartEdit = (note: Note) => {
        setEditingId(note.id);
        setEditData({
            title: note.title,
            content: note.content,
            color: note.color,
        });
    };

    const handleSaveEdit = async () => {
        if (!editingId) return;
        await updateNote(editingId, editData);
        setEditingId(null);
        setEditData({});
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditData({});
    };

    const handleDelete = async (noteId: string) => {
        const isConfirmed = await showConfirm('Hapus Catatan', 'Apakah Anda yakin ingin menghapus catatan ini?');
        if (!isConfirmed) return;
        await deleteNote(noteId);
        if (editingId === noteId) {
            setEditingId(null);
            setEditData({});
        }
    };

    if (loading && notes.length === 0) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Catatan</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Simpan informasi penting yang masuk
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                        {showAddForm ? <X size={14} /> : <Plus size={14} />}
                        {showAddForm ? 'Batal' : 'Catatan Baru'}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2 text-sm text-destructive">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Add Note Form */}
            {showAddForm && (
                <div className="bg-card rounded-xl border shadow-sm p-5 mb-6 border-primary/30 animate-in fade-in slide-in-from-top-2 duration-200">
                    <h3 className="font-semibold text-sm mb-4 flex items-center gap-2">
                        <StickyNote size={16} className="text-primary" />
                        Catatan Baru
                    </h3>
                    <div className="space-y-3">
                        <input
                            value={newNote.title}
                            onChange={e => setNewNote(p => ({ ...p, title: e.target.value }))}
                            placeholder="Judul catatan..."
                            className="w-full border border-input rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                        />
                        <textarea
                            value={newNote.content}
                            onChange={e => setNewNote(p => ({ ...p, content: e.target.value }))}
                            placeholder="Isi catatan..."
                            rows={4}
                            className="w-full border border-input rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
                        />
                        <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-xs text-muted-foreground font-medium">Warna:</span>
                            <div className="flex gap-1.5">
                                {NOTE_COLORS.map(c => (
                                    <button
                                        key={c.value}
                                        onClick={() => setNewNote(p => ({ ...p, color: c.value }))}
                                        className={`w-6 h-6 rounded-full ${c.dot} transition-all ${
                                            newNote.color === c.value
                                                ? 'ring-2 ring-offset-2 ring-primary ring-offset-background scale-110'
                                                : 'hover:scale-110 opacity-60 hover:opacity-100'
                                        }`}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={handleCreate}
                            disabled={!newNote.title.trim() && !newNote.content.trim()}
                            className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                        >
                            <Plus size={14} /> Simpan Catatan
                        </button>
                    </div>
                </div>
            )}

            {/* Search */}
            {notes.length > 0 && (
                <div className="relative mb-5">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Cari catatan..."
                        className="w-full border border-input rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Empty state */}
            {notes.length === 0 && !showAddForm && (
                <div className="bg-card rounded-xl border shadow-sm p-16 text-center text-muted-foreground">
                    <StickyNote size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="font-medium text-base">Belum ada catatan</p>
                    <p className="text-sm mt-1.5">Klik "Catatan Baru" untuk mulai mencatat informasi</p>
                </div>
            )}

            {/* Search empty */}
            {notes.length > 0 && filteredNotes.length === 0 && (
                <div className="bg-card rounded-xl border shadow-sm p-12 text-center text-muted-foreground">
                    <Search size={40} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">Tidak ditemukan</p>
                    <p className="text-sm mt-1">Coba kata kunci lain</p>
                </div>
            )}

            {/* Pinned Notes */}
            {pinnedNotes.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 px-1">
                        <Pin size={12} />
                        Disematkan ({pinnedNotes.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {pinnedNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isEditing={editingId === note.id}
                                editData={editData}
                                onEditDataChange={setEditData}
                                onStartEdit={handleStartEdit}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={handleCancelEdit}
                                onDelete={handleDelete}
                                onTogglePin={togglePin}
                                onView={() => setViewingNote(note)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Unpinned Notes */}
            {unpinnedNotes.length > 0 && (
                <div>
                    {pinnedNotes.length > 0 && (
                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5 px-1">
                            <StickyNote size={12} />
                            Catatan Lainnya ({unpinnedNotes.length})
                        </h3>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {unpinnedNotes.map(note => (
                            <NoteCard
                                key={note.id}
                                note={note}
                                isEditing={editingId === note.id}
                                editData={editData}
                                onEditDataChange={setEditData}
                                onStartEdit={handleStartEdit}
                                onSaveEdit={handleSaveEdit}
                                onCancelEdit={handleCancelEdit}
                                onDelete={handleDelete}
                                onTogglePin={togglePin}
                                onView={() => setViewingNote(note)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Note Detail Modal */}
            {viewingNote && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div 
                        className="fixed inset-0" 
                        onClick={() => setViewingNote(null)}
                    />
                    <div className={`relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-xl border shadow-lg ${getColorClasses(viewingNote.color).bg} ${getColorClasses(viewingNote.color).border} animate-in zoom-in-95 duration-200`}>
                        <div className="flex items-start justify-between p-5 border-b border-inherit">
                            <h3 className="text-xl font-bold pr-6">{viewingNote.title || 'Catatan'}</h3>
                            <button 
                                onClick={() => setViewingNote(null)}
                                className="absolute right-4 top-4 p-1.5 text-muted-foreground hover:bg-muted/50 rounded-md transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto">
                            <p className="text-sm md:text-base whitespace-pre-wrap leading-relaxed">
                                <LinkifiedText text={viewingNote.content} />
                            </p>
                        </div>
                        <div className="px-5 py-3 border-t border-inherit flex items-center justify-between text-xs text-muted-foreground">
                            <span>Dibuat: {new Date(viewingNote.created_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                            <span>Diperbarui: {new Date(viewingNote.updated_at).toLocaleString('id-ID', {day: 'numeric', month: 'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ══════════════════════════════════════════════════════════
// Note Card Component
// ══════════════════════════════════════════════════════════

interface NoteCardProps {
    note: Note;
    isEditing: boolean;
    editData: Partial<NewNote>;
    onEditDataChange: (data: Partial<NewNote>) => void;
    onStartEdit: (note: Note) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: (id: string) => void;
    onTogglePin: (id: string) => void;
    onView: (note: Note) => void;
}

const NoteCard: React.FC<NoteCardProps> = ({
    note,
    isEditing,
    editData,
    onEditDataChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onTogglePin,
    onView,
}) => {
    const colorClasses = getColorClasses(note.color);
    const editColorClasses = getColorClasses(editData.color || note.color);

    if (isEditing) {
        return (
            <div className={`rounded-xl border-2 shadow-sm p-4 ${editColorClasses.bg} ${editColorClasses.border}`}>
                <input
                    value={editData.title || ''}
                    onChange={e => onEditDataChange({ ...editData, title: e.target.value })}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring bg-background mb-2"
                    placeholder="Judul..."
                />
                <textarea
                    value={editData.content || ''}
                    onChange={e => onEditDataChange({ ...editData, content: e.target.value })}
                    rows={4}
                    className="w-full border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none mb-2"
                    placeholder="Isi catatan..."
                />
                <div className="flex items-center gap-1.5 mb-3">
                    <span className="text-xs text-muted-foreground mr-1">Warna:</span>
                    {NOTE_COLORS.map(c => (
                        <button
                            key={c.value}
                            onClick={() => onEditDataChange({ ...editData, color: c.value })}
                            className={`w-5 h-5 rounded-full ${c.dot} transition-all ${
                                (editData.color || note.color) === c.value
                                    ? 'ring-2 ring-offset-1 ring-primary ring-offset-background scale-110'
                                    : 'opacity-50 hover:opacity-100 hover:scale-110'
                            }`}
                        />
                    ))}
                </div>
                <div className="flex justify-end gap-1.5">
                    <button
                        onClick={onCancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted transition-colors"
                    >
                        <X size={12} /> Batal
                    </button>
                    <button
                        onClick={onSaveEdit}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs bg-green-600 text-white hover:bg-green-700 transition-colors"
                    >
                        <Check size={12} /> Simpan
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            onClick={() => onView(note)}
            className={`cursor-pointer group rounded-xl border shadow-sm p-4 ${colorClasses.bg} ${colorClasses.border} hover:shadow-md transition-all duration-200 relative`}
        >
            {/* Pin indicator */}
            {note.pinned && (
                <div className="absolute top-2.5 right-2.5 text-primary">
                    <Pin size={13} className="fill-current" />
                </div>
            )}

            {/* Title */}
            {note.title && (
                <h4 className="font-semibold text-sm mb-1.5 pr-6 line-clamp-2">{note.title}</h4>
            )}

            {/* Content */}
            {note.content && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-6 leading-relaxed">
                    <LinkifiedText text={note.content} />
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-inherit">
                <span className="text-[10px] text-muted-foreground">
                    {new Date(note.updated_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={(e) => { e.stopPropagation(); onTogglePin(note.id); }}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title={note.pinned ? 'Lepas pin' : 'Sematkan'}
                    >
                        {note.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onStartEdit(note); }}
                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="Edit"
                    >
                        <Edit3 size={13} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                        title="Hapus"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotesPage;
