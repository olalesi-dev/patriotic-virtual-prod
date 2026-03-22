"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Sparkles, Check, Wand2, X, Undo2, Loader2, RefreshCcw, FileText, AlignLeft, List } from 'lucide-react';
import { useAITextAssist } from '@/hooks/useAITextAssist';

interface AITextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    onValueChange: (value: string) => void;
}

export function AITextarea({ label, value, onValueChange, className = '', ...props }: AITextareaProps) {
    const stringValue = typeof value === 'string' ? value : '';
    const { suggestion, handleKeyDown, rewriteText, isRewriting, isAutocompleting, undo, canUndo } = useAITextAssist({
        value: stringValue,
        onChange: onValueChange,
        debounceMs: 600
    });
    
    const [showMenu, setShowMenu] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleMenuClick = (instruction: string) => {
        rewriteText(instruction);
        setShowMenu(false);
    };

    return (
        <div className="relative group w-full space-y-1">
            {label && (
                <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        {label}
                    </label>
                    
                    <div className="flex items-center gap-2">
                        {isAutocompleting && <Loader2 className="w-3 h-3 text-sky-400 animate-spin" />}
                        {canUndo && (
                            <button 
                                type="button" 
                                onClick={undo} 
                                className="text-[10px] font-bold text-slate-400 hover:text-indigo-500 flex items-center gap-1 transition-colors"
                            >
                                <Undo2 className="w-3 h-3" /> Undo AI
                            </button>
                        )}
                        <button 
                            type="button" 
                            onClick={() => setShowMenu(!showMenu)}
                            className="text-[10px] font-bold text-sky-500 hover:text-sky-600 bg-sky-50 hover:bg-sky-100 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 px-2 py-1 rounded-md flex items-center gap-1 transition-colors"
                        >
                            <Wand2 className="w-3 h-3" /> AI Assist
                        </button>
                    </div>
                </div>
            )}

            {showMenu && (
                <div className="absolute top-10 right-0 z-50 w-56 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 p-1">
                    <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 p-3 pb-2 flex justify-between items-center">
                        Rewrite Options
                        <button type="button" onClick={() => setShowMenu(false)}><X className="w-3 h-3 hover:text-slate-600" /></button>
                    </div>
                    {[
                        { label: 'Make More Professional', instr: 'Make the text more professional, clinical, and formal.', icon: Sparkles },
                        { label: 'Shorten & Conciseness', instr: 'Shorten the text, making it extremely concise and direct.', icon: AlignLeft },
                        { label: 'Expand & Elaborate', instr: 'Expand on the given text, elaborating with more context and structure.', icon: FileText },
                        { label: 'Fix Grammar & Spelling', instr: 'Correct any grammatical or spelling errors without changing the core meaning.', icon: Check },
                        { label: 'Format as Bullet Points', instr: 'Reformat the entire text into clear, clinical bullet points.', icon: List }
                    ].map(opt => (
                        <button
                            key={opt.label}
                            type="button"
                            onClick={() => handleMenuClick(opt.instr)}
                            className="w-full text-left px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-900/50 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-2 transition-colors"
                        >
                            <opt.icon className="w-3.5 h-3.5 text-sky-500" /> {opt.label}
                        </button>
                    ))}
                </div>
            )}

            <div className={`relative w-full rounded-2xl overflow-hidden border ${isRewriting ? 'border-sky-300 dark:border-sky-700 ring-2 ring-sky-100 dark:ring-sky-900/30' : 'border-transparent focus-within:border-slate-200 dark:focus-within:border-slate-700 focus-within:ring-2 focus-within:ring-sky-100 dark:focus-within:ring-sky-900/20'} transition-all`}>
                {isRewriting && (
                    <div className="absolute inset-0 z-20 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="bg-white dark:bg-slate-800 rounded-full px-4 py-2 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-2 text-xs font-bold text-sky-600 dark:text-sky-400">
                            <RefreshCcw className="w-4 h-4 animate-spin" /> Rewriting...
                        </div>
                    </div>
                )}
                
                {/* Visual Ghost Text Layer entirely positioned behind the actual textarea but formatted the same */}
                <div className="relative w-full h-full">
                    {/* Ghost Text Display */}
                    <div 
                        className={`absolute inset-0 w-full h-full pointer-events-none p-4 whitespace-pre-wrap overflow-hidden font-mono text-sm leading-relaxed ${className}`}
                        aria-hidden="true"
                    >
                        <span className="text-transparent">{stringValue}</span>
                        {suggestion && (
                            <span className="text-slate-400 dark:text-slate-500 bg-amber-50/50 dark:bg-amber-900/20 px-0.5 rounded italic">
                                {suggestion}
                            </span>
                        )}
                    </div>
                    
                    {/* Actual Text Area overlying the Ghost Text */}
                    <textarea
                        ref={textareaRef}
                        value={stringValue}
                        onChange={(e) => {
                            onValueChange(e.target.value);
                            if (props.onChange) props.onChange(e);
                        }}
                        onKeyDown={(e) => {
                            handleKeyDown(e);
                            if (props.onKeyDown) props.onKeyDown(e);
                        }}
                        className={`relative z-10 w-full h-full min-h-[120px] bg-transparent text-slate-800 dark:text-slate-100 border-none rounded-2xl p-4 text-sm font-bold font-mono focus:ring-0 focus:outline-none resize-y ${className}`}
                        {...props}
                    />
                </div>
            </div>
            
            {suggestion && (
                 <div className="text-[10px] text-slate-400 font-bold flex justify-end gap-1 mt-1 animate-in fade-in">
                      Press <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 text-slate-500">Tab</kbd> to accept AI suggestion
                 </div>
            )}
        </div>
    );
}
