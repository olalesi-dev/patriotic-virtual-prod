import { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface AITextAssistOptions {
    value: string;
    onChange: (value: string) => void;
    debounceMs?: number;
}

export function useAITextAssist({ value, onChange, debounceMs = 600 }: AITextAssistOptions) {
    const [suggestion, setSuggestion] = useState<string>('');
    const [isRewriting, setIsRewriting] = useState(false);
    const [isAutocompleting, setIsAutocompleting] = useState(false);
    const [history, setHistory] = useState<string[]>([]); // For Undo
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Logging helper
    const logUsage = async (action: string, details: any) => {
        try {
            const user = auth.currentUser;
            if (user) {
                await addDoc(collection(db, 'ai-assist-logs'), {
                    userId: user.uid,
                    action,
                    details,
                    timestamp: serverTimestamp()
                });
            }
        } catch (error) {
            console.error('Failed to log AI usage:', error);
        }
    };

    // Autocomplete effect
    useEffect(() => {
        setSuggestion('');
        
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        
        if (!value.trim()) return;

        timeoutRef.current = setTimeout(async () => {
             // Only auto-complete if there is a trailing space to prevent interrupting word typing
             // Or at least just try to guess the next word.
            setIsAutocompleting(true);
            try {
                const res = await fetch('/api/v1/ai-assist', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'autocomplete', text: value })
                });
                
                if (res.ok) {
                    const data = await res.json();
                    if (data.reply) {
                        // Keep the suggestion clean, ensuring there is a space if the input ended with a space,
                        // otherwise prepend a space if needed
                        let cleanSuggestion = data.reply;
                        if (!value.endsWith(' ') && !cleanSuggestion.startsWith(' ')) {
                             cleanSuggestion = ' ' + cleanSuggestion;
                        }
                        setSuggestion(cleanSuggestion);
                        logUsage('autocomplete_generated', { suggestionLength: cleanSuggestion.length });
                    }
                }
            } catch (error) {
                console.error("Autocomplete failed:", error);
            } finally {
                setIsAutocompleting(false);
            }
        }, debounceMs);

        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [value, debounceMs]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
        if (e.key === 'Tab' && suggestion) {
            e.preventDefault();
            // Accept suggestion
            setHistory([...history, value]);
            onChange(value + suggestion);
            setSuggestion('');
            logUsage('autocomplete_accepted', { acceptedText: suggestion });
        } else if (e.key !== 'Shift' && e.key !== 'Control' && e.key !== 'Alt') {
             // Clear suggestion on normal typing
             if (suggestion) {
                 setSuggestion('');
             }
        }
    };

    const rewriteText = async (instruction: string) => {
        if (!value.trim() || isRewriting) return;
        
        setHistory(prev => [...prev, value]);
        setIsRewriting(true);
        setSuggestion('');

        try {
            const res = await fetch('/api/v1/ai-assist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'rewrite', text: value, instruction })
            });
            
            if (res.ok) {
                const data = await res.json();
                if (data.reply) {
                    onChange(data.reply);
                    logUsage('rewrite_applied', { instruction });
                }
            }
        } catch (error) {
            console.error("Rewrite failed:", error);
        } finally {
            setIsRewriting(false);
        }
    };

    const undo = () => {
        if (history.length > 0) {
            const previousValue = history[history.length - 1];
            onChange(previousValue);
            setHistory(prev => prev.slice(0, prev.length - 1));
            logUsage('rewrite_undone', {});
        }
    };

    return {
        suggestion,
        handleKeyDown,
        rewriteText,
        isRewriting,
        isAutocompleting,
        undo,
        canUndo: history.length > 0
    };
}
