"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Mic, StopCircle, Save, Loader2, Video } from 'lucide-react';
import { toast } from 'sonner';
import { AITextarea } from '@/components/ui/AITextarea';
import { embedDoxyMe } from 'doxy.me';
import { DOXY_IFRAME_ALLOW } from '@/lib/doxy';
import { apiFetchJson } from '@/lib/api-client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useQuery } from '@tanstack/react-query';
import type { PatientRegistryResponse, PatientRegistryRow } from '@/lib/patient-registry-types';

export default function WaitingRoomClient() {
    const { user: activeUser, isReady } = useAuthUser();
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);
    const sdkRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [subjective, setSubjective] = useState('');
    const [objective, setObjective] = useState('');
    const [assessment, setAssessment] = useState('');
    const [plan, setPlan] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState('');
    const [patientSearch, setPatientSearch] = useState('');

    const patientsQuery = useQuery({
        queryKey: ['waiting-room-patients', activeUser?.uid ?? 'anonymous'],
        enabled: isReady && Boolean(activeUser),
        queryFn: async () => {
            if (!activeUser) return [];

            const patientsById = new Map<string, PatientRegistryRow>();
            let cursor: string | null = null;

            do {
                const params = new URLSearchParams({
                    scope: 'global',
                    pageSize: '100',
                    sortField: 'name',
                    sortDir: 'asc'
                });
                if (cursor) params.set('cursor', cursor);

                const payload = await apiFetchJson<PatientRegistryResponse>(`/api/patients/list?${params.toString()}`, {
                    method: 'GET',
                    cache: 'no-store',
                    user: activeUser
                });

                if (!payload.success) {
                    throw new Error(payload.error || 'Failed to load patients.');
                }

                (payload.patients ?? []).forEach((patient) => patientsById.set(patient.id, patient));
                cursor = payload.nextCursor;
            } while (cursor);

            return Array.from(patientsById.values());
        }
    });
    const patients = React.useMemo(() => patientsQuery.data ?? [], [patientsQuery.data]);
    const filteredPatients = React.useMemo(() => {
        const query = patientSearch.trim().toLowerCase();
        if (!query) return patients;

        return patients.filter((patient) => (
            patient.name.toLowerCase().includes(query) ||
            (patient.email ?? '').toLowerCase().includes(query) ||
            patient.id.toLowerCase().includes(query)
        ));
    }, [patients, patientSearch]);
    const selectedPatient = patients.find((patient) => patient.id === selectedPatientId);
    const hasSoapDraft = [subjective, objective, assessment, plan].some((value) => value.trim().length > 0);

    useEffect(() => {
        if (containerRef.current) {
            // Use the SDK to embed the Provider view
            const {  destroy } = embedDoxyMe(containerRef.current, {
                url:'pvt.doxy.me/sign-in',
                width: '100%',
                height: '100%',
                allow: DOXY_IFRAME_ALLOW,
            });
            sdkRef.current = destroy;

            // Explicitly ensure the allow attribute is set on the returned iframe element
            // if (iframe) {
            //     iframe.setAttribute('allow', DOXY_IFRAME_ALLOW);
            // }

            return () => {
                if (sdkRef.current) {
                    sdkRef.current();
                    sdkRef.current = null;
                }
            };
        }
    }, []);


    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            
            recognitionRef.current.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        currentTranscript += transcriptPiece + ' ';
                    }
                }
                if (currentTranscript) {
                    setTranscript(prev => prev + currentTranscript);
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                    setIsListening(false);
                }
            };
            
            recognitionRef.current.onend = () => {
                setIsListening(false);
            }
        }
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const startListening = () => {
        if (recognitionRef.current) {
            try {
                recognitionRef.current.start();
                setIsListening(true);
                toast.success('AI Scribe is listening...');
            } catch (e) {
                console.error(e);
            }
        } else {
            toast.error('Speech Recognition is not supported in this browser.');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
            toast.info('AI Scribe stopped.');
        }
    };

    const generateSoap = async () => {
        if (!transcript.trim()) {
            toast.error('No transcript available to generate SOAP note.');
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/ai/scribe/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript, appointmentId: 'virtual-visit' })
            });
            const data = await res.json();
            if (data.success && data.note) {
                setSubjective(data.note.subjective || '');
                setObjective(data.note.objective || '');
                setAssessment(data.note.assessment || '');
                setPlan(data.note.plan || '');
                toast.success('SOAP note generated successfully.');
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
    };

    const handleSaveToPatient = async () => {
        if (!activeUser) {
            toast.error('Please sign in again before saving the SOAP note.');
            return;
        }

        if (!selectedPatientId) {
            toast.error('Please select a patient before saving the SOAP note.');
            return;
        }

        const noteText = `S: ${subjective}\n\nO: ${objective}\n\nA: ${assessment}\n\nP: ${plan}`.trim();
        if (!noteText || !hasSoapDraft) {
            toast.error('Generate or enter a SOAP note before saving.');
            return;
        }

        setIsSaving(true);
        try {
            const payload = await apiFetchJson<{
                success?: boolean;
                error?: string;
                encounterId?: string;
            }>(`/api/patients/${selectedPatientId}/soap`, {
                method: 'POST',
                user: activeUser,
                body: {
                    soapNote: noteText,
                    sections: {
                        subjective,
                        objective,
                        assessment,
                        plan
                    },
                    transcript,
                    source: 'manual / waiting room'
                }
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to save SOAP note.');
            }

            toast.success('SOAP note saved to patient chart.');
            setTranscript('');
            setSubjective('');
            setObjective('');
            setAssessment('');
            setPlan('');
            setSelectedPatientId('');
        } catch (error) {
            console.error('Error saving waiting-room SOAP note:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to save SOAP note.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-6">
            {/* Left side: Doxy.me iframe */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <h2 className="font-bold flex items-center gap-2">
                        <Video className="w-5 h-5 text-brand" />
                        Doxy.me Waiting Room
                    </h2>
                </div>
                <div ref={containerRef} className="flex-1 w-full border-none" />
            </div>

            {/* Right side: AI Scribe */}
            <div className="w-[350px] xl:w-[450px] bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold flex items-center gap-2">
                        <Bot className="w-5 h-5 text-brand" />
                        AI Scribe
                    </h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Transcript</span>
                            <div className="flex gap-2">
                                {isListening ? (
                                    <button onClick={stopListening} className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-1 rounded-md hover:bg-red-200 font-bold">
                                        <StopCircle className="w-3 h-3" /> Stop
                                    </button>
                                ) : (
                                    <button onClick={startListening} className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-md hover:bg-emerald-200 font-bold">
                                        <Mic className="w-3 h-3" /> Record
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="h-32 overflow-y-auto bg-white dark:bg-slate-800 p-3 rounded-lg text-sm border border-slate-200 dark:border-slate-700 font-mono text-slate-600 dark:text-slate-400">
                            {transcript || <span className="opacity-50 italic">Waiting for speech...</span>}
                        </div>
                        <div className="mt-3">
                            <button 
                                onClick={generateSoap}
                                disabled={!transcript || isGenerating}
                                className="w-full flex items-center justify-center gap-2 bg-brand hover:bg-brand-600 text-white py-2 rounded-lg text-sm font-bold transition-all disabled:opacity-50"
                            >
                                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                Generate SOAP Note
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-1">
                            <label htmlFor="waiting-room-subjective" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Subjective</label>
                            <AITextarea id="waiting-room-subjective" value={subjective} onValueChange={setSubjective} className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="waiting-room-objective" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Objective</label>
                            <AITextarea id="waiting-room-objective" value={objective} onValueChange={setObjective} className="w-full h-24 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="waiting-room-assessment" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assessment</label>
                            <AITextarea id="waiting-room-assessment" value={assessment} onValueChange={setAssessment} className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="waiting-room-plan" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Plan</label>
                            <AITextarea id="waiting-room-plan" value={plan} onValueChange={setPlan} className="w-full h-20 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl text-sm border border-slate-200 dark:border-slate-700" />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label htmlFor="waiting-room-patient-select" className="text-xs font-bold text-slate-500 uppercase tracking-widest">Assign Patient</label>
                            <input
                                id="waiting-room-patient-select"
                                value={patientSearch}
                                onChange={(event) => setPatientSearch(event.target.value)}
                                placeholder={patientsQuery.isLoading ? 'Loading patients...' : 'Search patients by name or email'}
                                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 focus:border-brand/50 focus:outline-none focus:ring-2 focus:ring-brand/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                                disabled={!activeUser || patientsQuery.isLoading || isSaving}
                            />
                            <div className="max-h-44 overflow-y-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                                {patientsQuery.isLoading ? (
                                    <div className="p-3 text-xs font-bold text-slate-400">Loading patients...</div>
                                ) : filteredPatients.length > 0 ? (
                                    filteredPatients.map((patient) => (
                                        <button
                                            key={patient.id}
                                            type="button"
                                            onClick={() => setSelectedPatientId(patient.id)}
                                            disabled={isSaving}
                                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                                                selectedPatientId === patient.id
                                                    ? 'bg-brand/10 text-brand'
                                                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50'
                                            }`}
                                        >
                                            <span className="block truncate font-bold">{patient.name || patient.email || patient.id}</span>
                                            {patient.email && <span className="block truncate text-xs font-semibold text-slate-400">{patient.email}</span>}
                                        </button>
                                    ))
                                ) : (
                                    <div className="p-3 text-xs font-bold text-slate-400">No patients found.</div>
                                )}
                            </div>
                            <div className="text-xs font-semibold text-slate-400">
                                {selectedPatient ? `Selected: ${selectedPatient.name || selectedPatient.email || selectedPatient.id}` : `${patients.length} patients loaded`}
                            </div>
                            {patientsQuery.isError && (
                                <p className="text-xs font-semibold text-red-500">
                                    {patientsQuery.error instanceof Error ? patientsQuery.error.message : 'Failed to load patients.'}
                                </p>
                            )}
                        </div>

                        <button
                            onClick={handleSaveToPatient}
                            disabled={isSaving || !activeUser || !selectedPatientId || !hasSoapDraft}
                            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl font-bold transition-all shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none dark:disabled:bg-slate-700"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Saving Note...' : 'Save Note to Patient Record'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
