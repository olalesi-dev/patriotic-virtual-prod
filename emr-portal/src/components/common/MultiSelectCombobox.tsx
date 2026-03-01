"use client";

import { Check, ChevronDown, Search, X } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";

export interface MultiSelectOption {
    value: string;
    label: string;
    description?: string | null;
    disabled?: boolean;
}

interface MultiSelectComboboxProps {
    id: string;
    options: MultiSelectOption[];
    value: string[];
    onChange: (nextValue: string[]) => void;
    placeholder?: string;
    searchPlaceholder?: string;
    emptyLabel?: string;
    disabled?: boolean;
}

function normalize(text: string): string {
    return text.trim().toLowerCase();
}

export function MultiSelectCombobox({
    id,
    options,
    value,
    onChange,
    placeholder = "Select options...",
    searchPlaceholder = "Search...",
    emptyLabel = "No options found.",
    disabled = false
}: MultiSelectComboboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const containerRef = useRef<HTMLDivElement | null>(null);

    const selectedSet = useMemo(() => new Set(value), [value]);

    const selectedLabels = useMemo(() => {
        const labelByValue = new Map(options.map((option) => [option.value, option.label]));
        return value
            .map((selectedValue) => labelByValue.get(selectedValue))
            .filter((label): label is string => Boolean(label));
    }, [options, value]);

    const filteredOptions = useMemo(() => {
        const normalizedQuery = normalize(query);
        if (!normalizedQuery) return options;

        return options.filter((option) => {
            const haystack = `${option.label} ${option.description ?? ""}`;
            return normalize(haystack).includes(normalizedQuery);
        });
    }, [options, query]);

    useEffect(() => {
        if (!isOpen) return;

        const handleOutsideClick = (event: MouseEvent) => {
            if (!containerRef.current) return;
            if (!containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, [isOpen]);

    const toggleOption = (option: MultiSelectOption) => {
        if (disabled || option.disabled) return;

        if (selectedSet.has(option.value)) {
            onChange(value.filter((selectedValue) => selectedValue !== option.value));
            return;
        }

        onChange([...value, option.value]);
    };

    const clearSelection = () => {
        onChange([]);
    };

    const triggerLabel = selectedLabels.length > 0
        ? selectedLabels.join(", ")
        : placeholder;

    return (
        <div ref={containerRef} className="relative">
            <button
                id={id}
                type="button"
                onClick={() => {
                    if (disabled) return;
                    setIsOpen((currentOpen) => !currentOpen);
                }}
                disabled={disabled}
                className="w-full h-10 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-left text-sm flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
                <span className={selectedLabels.length > 0 ? "text-slate-700 dark:text-slate-200 truncate" : "text-slate-400 dark:text-slate-500 truncate"}>
                    {triggerLabel}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            {isOpen && (
                <div className="absolute z-40 mt-2 w-full min-w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
                    <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <input
                                type="text"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={searchPlaceholder}
                                className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-8 pr-8 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                            />
                            {query.trim() !== "" && (
                                <button
                                    type="button"
                                    onClick={() => setQuery("")}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    aria-label="Clear search"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto p-1">
                        {filteredOptions.length === 0 ? (
                            <p className="px-2 py-3 text-xs text-slate-400">{emptyLabel}</p>
                        ) : (
                            filteredOptions.map((option) => {
                                const checked = selectedSet.has(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => toggleOption(option)}
                                        disabled={option.disabled}
                                        className="w-full flex items-start gap-2 px-2 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${checked ? "bg-indigo-600 border-indigo-600" : "border-slate-300 dark:border-slate-600"}`}>
                                            {checked && <Check className="w-3 h-3 text-white" />}
                                        </span>
                                        <span className="min-w-0">
                                            <span className="block text-sm text-slate-700 dark:text-slate-200 truncate">{option.label}</span>
                                            {option.description && (
                                                <span className="block text-[11px] text-slate-400 dark:text-slate-500 truncate">{option.description}</span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {value.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800 p-2">
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                            >
                                Clear selection
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
