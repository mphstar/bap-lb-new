import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { MasterStudent } from '@/types';

interface StudentAutoSuggestProps {
    value: string;
    onChange: (value: string) => void;
    onSelectStudent: (student: MasterStudent) => void;
    masterList: MasterStudent[];
    placeholder?: string;
    className?: string;
}

const StudentAutoSuggest: React.FC<StudentAutoSuggestProps> = ({
    value,
    onChange,
    onSelectStudent,
    masterList,
    placeholder = 'Nama Mahasiswa',
    className = '',
}) => {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter suggestions by name or NIM
    const suggestions = value.trim().length >= 1
        ? masterList.filter(s =>
            s.name.toLowerCase().includes(value.toLowerCase()) ||
            s.nim.toLowerCase().includes(value.toLowerCase())
        ).slice(0, 8) // Limit to 8 results
        : [];

    const hasSuggestions = suggestions.length > 0;

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        setShowSuggestions(true);
        setHighlightIndex(-1);
    }, [onChange]);

    const handleSelect = useCallback((student: MasterStudent) => {
        onSelectStudent(student);
        setShowSuggestions(false);
        setHighlightIndex(-1);
    }, [onSelectStudent]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (!showSuggestions || !hasSuggestions) return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => Math.min(prev + 1, suggestions.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter' && highlightIndex >= 0) {
            e.preventDefault();
            handleSelect(suggestions[highlightIndex]);
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
        }
    }, [showSuggestions, hasSuggestions, suggestions, highlightIndex, handleSelect]);

    return (
        <div ref={containerRef} className="relative">
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleInputChange}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {showSuggestions && hasSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {suggestions.map((student, idx) => (
                        <button
                            key={`${student.nim}-${idx}`}
                            type="button"
                            className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 transition-colors
                                ${idx === highlightIndex
                                    ? 'bg-primary/10 text-primary'
                                    : 'hover:bg-accent text-foreground'
                                }`}
                            onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                handleSelect(student);
                            }}
                            onMouseEnter={() => setHighlightIndex(idx)}
                        >
                            <span className="font-medium truncate">{student.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{student.nim}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default StudentAutoSuggest;
