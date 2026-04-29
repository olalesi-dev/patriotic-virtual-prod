"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Square, Loader2, Save, User, CheckCircle2, UserCircle } from 'lucide-react';
import { AITextarea } from '@/components/ui/AITextarea';
import { toast } from 'sonner';
import { apiFetchJson } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export default function SoapPageClient() {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // SOAP Note state
    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [hasNote, setHasNote] = useState(false);

    const [selectedPatientId, setSelectedPatientId] = useState('');

    const recognitionRef = useRef<any>(null);
    const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch patients for dropdown
    const usersQuery = useQuery({
        queryKey: ['admin-users-patients-soap'],
        queryFn: async () => {
            const data = await apiFetchJson<{
                success?: boolean;
                users?: any[];
                error?: string;
            }>('/api/admin/users', {
                method: 'GET',
                cache: 'no-store'
            });
            if (!data.success || !data.users) return [];
            return data.users.filter((u: any) => u.role?.toLowerCase() === 'patient' || !u.role);
        }
    });
    const patients = usersQuery.data || [];

    const stopRecording = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsRecording(false);
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
        }
    }, []);

    const resetSilenceTimer = useCallback(() => {
        if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
        }
        // 5 minutes of silence -> stop recording
        silenceTimerRef.current = setTimeout(() => {
            toast.info("Recording stopped automatically due to 5 minutes of silence.");
            stopRecording();
        }, 5 * 60 * 1000); 
    }, [stopRecording]);

    const startRecording = useCallback(() => {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            toast.error('Speech recognition is not supported in this browser. Try Chrome.');
            return;
        }

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsRecording(true);
            setTranscript('');
            setInterimTranscript('');
            setHasNote(false);
            resetSilenceTimer();
            toast.success("Recording started...");
        };

        recognition.onresult = (event: any) => {
            let currentInterim = '';
            let currentFinal = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    currentFinal += event.results[i][0].transcript + ' ';
                } else {
                    currentInterim += event.results[i][0].transcript;
                }
            }

            if (currentFinal) {
                setTranscript(prev => prev + currentFinal);
            }
            setInterimTranscript(currentInterim);
            resetSilenceTimer();
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            if (event.error !== 'no-speech') {
                toast.error(`Speech recognition error: ${event.error}`);
                stopRecording();
            }
        };

        recognition.onend = () => {
            if (isRecording) {
                // Auto-restart if it ended unexpectedly but we still want to be recording
                try {
                    recognition.start();
                } catch (e) {
                    console.error("Failed to restart recognition", e);
                    setIsRecording(false);
                }
            }
        };

        try {
            recognition.start();
            recognitionRef.current = recognition;
        } catch (e) {
            console.error("Failed to start recognition", e);
            toast.error("Failed to start microphone.");
        }
    }, [isRecording, stopRecording, resetSilenceTimer]);

    // Handle global Doxy.me trigger
    useEffect(() => {
        // Check if opened before mount
        if (localStorage.getItem('doxy_opened') === 'true') {
            localStorage.removeItem('doxy_opened');
            if (!isRecording) {
                // Short timeout to allow speech recognition initialization
                setTimeout(() => startRecording(), 500);
            }
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'doxy_opened' && e.newValue) {
                // Doxy.me was opened, auto-start if not recording
                if (!isRecording) {
                    startRecording();
                }
                localStorage.removeItem('doxy_opened');
            }
        };
        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [isRecording, startRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (silenceTimerRef.current) {
                clearTimeout(silenceTimerRef.current);
            }
        };
    }, []);

    // Effect to process transcript once recording stops and transcript isn't empty
    useEffect(() => {
        if (!isRecording && transcript && !hasNote && !isGenerating) {
            generateSoap(transcript);
        }
    }, [isRecording, transcript, hasNote, isGenerating]);

    const generateSoap = async (finalTranscript: string) => {
        setIsGenerating(true);
        try {
            const res = await fetch('/api/ai/scribe/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: finalTranscript })
            });
            const data = await res.json();
            if (data.success && data.note) {
                setSubjective(data.note.subjective || '');
                setObjective(data.note.objective || '');
                setAssessment(data.note.assessment || '');
                setPlan(data.note.plan || '');
                setHasNote(true);
                toast.success("SOAP Note generated!");
            } else {
                toast.error(data.error || 'Failed to generate SOAP note');
                setSubjective(finalTranscript);
                setHasNote(true);
            }
        } catch (error) {
            console.error('Error generating SOAP:', error);
            toast.error('Error generating SOAP note');
            setSubjective(finalTranscript);
            setHasNote(true);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSaveToPatient = async () => {
        if (!selectedPatientId) {
            toast.error("Please select a patient to assign the note to.");
            return;
        }

        setIsSaving(true);
        try {
            const noteText = `S: ${subjective}\n\nO: ${objective}\n\nA: ${assessment}\n\nP: ${plan}`;
            const res = await fetch(`/api/patients/${selectedPatientId}/soap`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ soapNote: noteText })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('SOAP Note saved to patient chart successfully');
                // Reset form
                setTranscript('');
                setHasNote(false);
                setSelectedPatientId('');
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
        <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">AI SOAP Note Scribe</h1>
                    <p className="text-slate-500 text-sm mt-1">Record your session, let AI generate the SOAP note, and assign it to a patient.</p>
                </div>
                
                <div className="flex items-center gap-4">
                    {isRecording ? (
                        <div className="flex items-center gap-3">
                            <span className="flex items-center gap-2 text-red-500 font-bold animate-pulse text-sm uppercase tracking-widest">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                Recording...
                            </span>
                            <button 
                                onClick={stopRecording}
                                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                            >
                                <Square className="w-5 h-5 fill-current" />
                                Stop Recording
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={startRecording}
                            className="bg-brand hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-brand/20 transition-all active:scale-95"
                        >
                            <Mic className="w-5 h-5" />
                            Start Recording
                        </button>
                    )}
                </div>
            </div>

            {/* Transcript Area */}
            {(isRecording || transcript || interimTranscript) && !hasNote && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-4">Live Transcript</h2>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl min-h-[200px] text-slate-700 dark:text-slate-300 font-medium leading-relaxed border border-slate-100 dark:border-slate-700">
                        {transcript}
                        <span className="text-brand/70">{interimTranscript}</span>
                        {isRecording && !transcript && !interimTranscript && (
                            <span className="text-slate-400 italic">Listening for speech...</span>
                        )}
                    </div>
                </div>
            )}

            {/* Generating State */}
            {isGenerating && (
                <div className="bg-white dark:bg-slate-800 p-12 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center">
                    <Loader2 className="w-12 h-12 text-brand animate-spin mb-4" />
                    <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">Generating SOAP Note</h3>
                    <p className="text-slate-500 text-sm mt-2">Our AI is analyzing the transcript and formatting clinical notes...</p>
                </div>
            )}

            {/* AI Generated SOAP Note & Assign Patient */}
            {hasNote && !isGenerating && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                Generated SOAP Note
                            </h2>
                            <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-1 rounded-lg uppercase tracking-widest">Editable</span>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Subjective</label>
                                <AITextarea value={subjective} onValueChange={setSubjective} className="w-full min-h-[100px] p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:border-brand/50 focus:ring-1 focus:ring-brand/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Objective</label>
                                <AITextarea value={objective} onValueChange={setObjective} className="w-full min-h-[100px] p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:border-brand/50 focus:ring-1 focus:ring-brand/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Assessment</label>
                                <AITextarea value={assessment} onValueChange={setAssessment} className="w-full min-h-[80px] p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:border-brand/50 focus:ring-1 focus:ring-brand/50" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Plan</label>
                                <AITextarea value={plan} onValueChange={setPlan} className="w-full min-h-[80px] p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700 focus:border-brand/50 focus:ring-1 focus:ring-brand/50" />
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col">
                        <div className="border-b border-slate-100 dark:border-slate-700 pb-4 mb-6">
                            <h2 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                <UserCircle className="w-5 h-5 text-indigo-500" />
                                Assign to Patient
                            </h2>
                            <p className="text-slate-500 text-xs mt-1">Select a patient chart to save this note.</p>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Patient</label>
                                <select
                                    value={selectedPatientId}
                                    onChange={(e) => setSelectedPatientId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-brand/50 focus:border-brand/50 font-medium"
                                >
                                    <option value="" disabled>-- Choose a Patient --</option>
                                    {usersQuery.isLoading ? (
                                        <option value="" disabled>Loading patients...</option>
                                    ) : patients.length === 0 ? (
                                        <option value="" disabled>No patients found</option>
                                    ) : (
                                        patients.map((p: any) => (
                                            <option key={p.uid} value={p.uid}>
                                                {p.displayName || p.email || p.uid}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={handleSaveToPatient}
                                disabled={isSaving || !selectedPatientId}
                                className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all shadow-xl ${
                                    (!selectedPatientId || isSaving) 
                                    ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed shadow-none' 
                                    : 'bg-brand hover:bg-brand-600 shadow-brand/20 active:scale-95'
                                }`}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                Save Note to Chart
                            </button>
                            
                            <button
                                onClick={() => {
                                    setTranscript('');
                                    setHasNote(false);
                                }}
                                className="w-full py-3 mt-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-all"
                            >
                                Discard
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
