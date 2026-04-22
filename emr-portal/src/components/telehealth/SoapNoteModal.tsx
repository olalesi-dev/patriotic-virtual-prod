import React, { useState, useEffect, useCallback } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { AITextarea } from '@/components/ui/AITextarea';
import { toast } from 'sonner';

export interface SoapNoteModalProps {
    appointmentId: string;
    rawTranscript: string;
    onClose: () => void;
    onSave: (note: string) => void;
}

export function SoapNoteModal({ appointmentId, rawTranscript, onClose, onSave }: SoapNoteModalProps) {
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [isGenerating, setIsGenerating] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const generateSoap = useCallback(async (transcript: string) => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/ai/scribe/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, appointmentId })
            });
            const data = await res.json();
            if (data.success && data.note) {
                setSubjective(data.note.subjective || '');
                setObjective(data.note.objective || '');
                setAssessment(data.note.assessment || '');
                setPlan(data.note.plan || '');
            } else {
                toast.error(data.error || 'Failed to generate SOAP note');
                setSubjective(transcript);
            }
        } catch (error) {
            console.error('Error generating SOAP:', error);
            toast.error('Error generating SOAP note');
            setSubjective(transcript);
        } finally {
            setIsGenerating(false);
        }
    }, [appointmentId]);

    useEffect(() => {
        if (rawTranscript && rawTranscript.trim().length > 0) {
            generateSoap(rawTranscript);
        } else {
            setIsGenerating(false);
            setSubjective('No audio was captured during the visit.');
        }
    }, [rawTranscript, generateSoap]);


    const handleSave = async () => {
        setIsSaving(true);
        try {
            const noteText = `S: ${subjective}\n\nO: ${objective}\n\nA: ${assessment}\n\nP: ${plan}`;
            const res = await fetch(`/api/dashboard/appointments/${appointmentId}/soap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soapNote: noteText })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('SOAP Note saved successfully');
                onSave(noteText);
            } else {
                toast.error(data.error || 'Failed to save SOAP note');
            }
        } catch (error) {
            console.error('Error saving SOAP:', error);
            toast.error('Error saving SOAP note');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            AI Generated SOAP Note
                        </h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review and edit before saving</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-all border border-transparent hover:border-slate-300">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                    {isGenerating ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                            <Loader2 className="w-10 h-10 animate-spin text-brand mb-4" />
                            <p className="font-bold">Parsing visit transcript...</p>
                            <p className="text-xs">Applying medical AI models</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Subjective</label>
                                <AITextarea value={subjective} onValueChange={setSubjective} className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all border border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Objective</label>
                                <AITextarea value={objective} onValueChange={setObjective} className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all border border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Assessment</label>
                                <AITextarea value={assessment} onValueChange={setAssessment} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all border border-slate-200 dark:border-slate-700" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Plan</label>
                                <AITextarea value={plan} onValueChange={setPlan} className="w-full h-24 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all border border-slate-200 dark:border-slate-700" />
                            </div>
                            
                            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                                <details className="text-xs text-slate-500 group">
                                    <summary className="cursor-pointer font-bold mb-2 uppercase tracking-widest group-hover:text-brand transition-colors">View Raw Transcript</summary>
                                    <div className="p-4 bg-slate-100 dark:bg-slate-900 rounded-xl whitespace-pre-wrap font-mono mt-2 text-slate-600 dark:text-slate-400">
                                        {rawTranscript || "No audio captured."}
                                    </div>
                                </details>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-4">
                    <button onClick={onClose} className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-2xl hover:bg-slate-100 transition-all">
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave} 
                        disabled={isGenerating || isSaving}
                        className={`flex-[2] py-4 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 ${
                            (isGenerating || isSaving) ? 'bg-brand/50 cursor-not-allowed' : 'bg-brand hover:bg-brand-600 shadow-brand/20 hover:-translate-y-0.5'
                        }`}
                    >
                        {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Save SOAP Note
                    </button>
                </div>
            </div>
        </div>
    );
}
