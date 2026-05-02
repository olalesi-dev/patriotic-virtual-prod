
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mic, Settings, UserCheck, Clock, ShieldCheck, Video, Bot, StopCircle } from 'lucide-react';
import { embedDoxyMe } from 'doxy.me';
import { DOXY_IFRAME_ALLOW } from '@/lib/doxy';

function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const recognitionRef = useRef<any>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            
            recognitionRef.current.onresult = (event: any) => {
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcriptPiece = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        setTranscript(prev => prev + transcriptPiece + ' ');
                    }
                }
            };

            recognitionRef.current.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed' || event.error === 'audio-capture') {
                    setIsListening(false);
                }
            };
            
            recognitionRef.current.onend = () => {
                // If it stops automatically, but we expect it to be listening, we can restart it.
                // For simplicity, we just set isListening to false here.
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
            } catch (e) {
                console.error(e);
            }
        } else {
            console.warn('SpeechRecognition not supported in this browser.');
            alert('Speech Recognition is not supported in this browser. Please use Chrome or Safari.');
        }
    };

    const stopListening = () => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            setIsListening(false);
        }
    };

    return { isListening, startListening, stopListening, transcript, setTranscript };
}

interface VisitRoomProps {
    role: 'patient' | 'provider';
    patientName: string;
    providerName: string;
    videoLink?: string; // e.g. Doxy.me link
    onEndVisit?: (transcript: string) => void;
}

export const VisitRoom: React.FC<VisitRoomProps> = ({ role, patientName, providerName, videoLink, onEndVisit }) => {
    const [status, setStatus] = useState<'waiting' | 'ready' | 'connected'>('waiting');
    const [cameraOn, setCameraOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const { isListening, startListening, stopListening, transcript } = useSpeechRecognition();
    const sdkRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (role === 'provider' && status === 'connected' && videoLink && containerRef.current) {
            const { destroy } = embedDoxyMe(containerRef.current, {
                url: videoLink,
                width: '100%',
                height: '100%',
                allow: DOXY_IFRAME_ALLOW,
            });
            sdkRef.current = destroy;
        }
        return () => {
            if (sdkRef.current) {
                sdkRef.current();
                sdkRef.current = null;
            }
        };
    }, [status, videoLink, role]);

    /* --- PATIENT WAITING ROOM --- */
    if (role === 'patient' && status === 'waiting') {
        return (
            <div className="flex h-screen bg-navy text-white items-center justify-center p-6">
                <div className="w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 p-8 shadow-2xl">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <div className="text-emerald-400 text-sm font-semibold mb-2 flex items-center gap-2">
                                <span className="animate-pulse w-2 h-2 bg-emerald-400 rounded-full"></span>
                                READY FOR VISIT
                            </div>
                            <h1 className="text-2xl font-bold">Waiting for {providerName}</h1>
                            <p className="text-slate-400 mt-1">Your provider will admit you shortly.</p>
                        </div>
                        <div className="bg-slate-800 p-3 rounded-xl border border-slate-700">
                            <Clock className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>

                    {/* Vitals Mini-Form (Disabled/Read-only for now) */}
                    <div className="space-y-4 mb-8 bg-slate-950/50 p-4 rounded-xl border border-slate-800/50">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">BP</span>
                            <span className="font-mono">120/80</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Heart Rate</span>
                            <span className="font-mono">72 bpm</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Weight</span>
                            <span className="font-mono">185 lbs</span>
                        </div>
                    </div>

                    {/* Camera Preview */}
                    <div className="aspect-video bg-black rounded-xl mb-6 relative overflow-hidden group border border-slate-700">
                        <div className="absolute inset-0 flex items-center justify-center text-slate-600 dark:text-slate-300 bg-slate-900">
                            {cameraOn ? (
                                <div className="text-center">
                                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                    <span className="text-sm">Camera Active</span>
                                </div>
                            ) : (
                                <span>Camera Off</span>
                            )}
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-full ${micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20 text-red-500'} backdrop-blur-md transition-all`}>
                                <Mic className="w-5 h-5" />
                            </button>
                            <button onClick={() => setCameraOn(!cameraOn)} className={`p-3 rounded-full ${cameraOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500/20 text-red-500'} backdrop-blur-md transition-all`}>
                                <Camera className="w-5 h-5" />
                            </button>
                            <button className="p-3 rounded-full bg-slate-700 hover:bg-slate-600 backdrop-blur-md transition-all">
                                <Settings className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex items-start gap-3 mb-6">
                        <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-200/80">
                            <strong className="text-blue-200 block mb-1">HIPAA Secure Connection</strong>
                            Your visit is end-to-end encrypted. No video is recorded.
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    /* --- PROVIDER ROOM --- */
    if (role === 'provider') {
        return (
            <div className="flex h-screen bg-slate-50 dark:bg-slate-900/50">
                {/* Sidebar */}
                <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <h2 className="font-bold text-navy">Waiting Room (1)</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        <div className="p-3 border border-blue-200 bg-blue-50 rounded-xl cursor-pointer hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-navy">{patientName}</span>
                                <span className="text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Checked In</span>
                            </div>
                            <div className="text-xs text-slate-500 mb-2">Waiting since 9:45 AM (5m)</div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setStatus('connected')}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                                >
                                    Admit Patient
                                </button>
                                <button className="px-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-semibold">
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Stage */}
                <div className="flex-1 flex flex-col relative bg-slate-900">
                            {status === 'connected' && videoLink ? (
                                <>
                                    <div ref={containerRef} className="flex-1 w-full border-none" />
                                    {/* Provider Controls Footer */}
                                    <div className="h-20 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-6 shrink-0">

                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={isListening ? stopListening : startListening}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold transition-all ${
                                            isListening ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                                        }`}
                                    >
                                        <Bot className={`w-5 h-5 ${isListening ? 'animate-pulse' : ''}`} />
                                        {isListening ? 'AI Scribe Active' : 'Enable AI Scribe'}
                                    </button>
                                    
                                    {isListening && (
                                        <div className="text-xs text-slate-400 max-w-md truncate">
                                            {transcript ? `"...${transcript.slice(-50)}"` : 'Listening...'}
                                        </div>
                                    )}
                                </div>
                                 <button 
                                     onClick={() => {
                                         sdkRef.current?.();
                                         stopListening();
                                         onEndVisit?.(transcript);
                                     }}
                                     className="flex items-center gap-2 px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-all"
                                 >

                                    <StopCircle className="w-5 h-5" />
                                    End Visit
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 flex-col">
                            <UserCheck className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a patient to start visit</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return null;
};
