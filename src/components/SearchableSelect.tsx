import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

interface SearchableSelectOption {
    value: string;
    label: string;
}

interface SearchableSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: SearchableSelectOption[];
    placeholder?: string;
    className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = "-- Pilih Dosen --",
    className = "",
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Get the label of the currently selected option
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption ? selectedOption.label : value || "";

    // Sync search query when value changes or when dropdown opens
    useEffect(() => {
        if (!isOpen) {
            setSearchQuery("");
        }
    }, [isOpen]);

    // Handle clicks outside the dropdown to close it
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (val: string) => {
        onChange(val);
        setIsOpen(false);
        setSearchQuery("");
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    };

    const handleInputFocus = () => {
        setIsOpen(true);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("");
        setSearchQuery("");
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div ref={containerRef} className={`relative w-full ${className}`}>
            <div 
                className="flex items-center justify-between border border-input rounded-md px-2 py-1 bg-background text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 cursor-text w-full"
                onClick={() => inputRef.current?.focus()}
            >
                <input
                    ref={inputRef}
                    type="text"
                    value={isOpen ? searchQuery : displayValue}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    placeholder={isOpen && displayValue ? displayValue : placeholder}
                    className="w-full bg-transparent border-0 p-0 text-sm focus:outline-none focus:ring-0 placeholder:text-muted-foreground"
                />
                <div className="flex items-center gap-1 shrink-0 ml-1">
                    {value && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-foreground rounded p-0.5"
                        >
                            <X className="size-3.5" />
                        </button>
                    )}
                    <ChevronDown 
                        className={`size-4 text-muted-foreground transition-transform duration-200 cursor-pointer ${
                            isOpen ? "rotate-180" : ""
                        }`}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (isOpen) {
                                setIsOpen(false);
                            } else {
                                inputRef.current?.focus();
                            }
                        }}
                    />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95 max-h-60 overflow-y-auto">
                    <div className="p-1">
                        <div 
                            onClick={() => handleSelect("")}
                            className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
                                !value ? "bg-accent/50 font-medium" : ""
                            }`}
                        >
                            {placeholder}
                        </div>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    onClick={() => handleSelect(opt.value)}
                                    className={`flex w-full items-center rounded-sm px-2 py-1.5 text-sm cursor-pointer select-none outline-none transition-colors hover:bg-accent hover:text-accent-foreground ${
                                        value === opt.value ? "bg-accent font-medium text-accent-foreground" : ""
                                    }`}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className="px-2 py-1.5 text-sm text-muted-foreground text-center">
                                Dosen tidak ditemukan
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
