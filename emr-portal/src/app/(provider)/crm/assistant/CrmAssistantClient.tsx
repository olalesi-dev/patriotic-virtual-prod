"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, doc, setDoc, serverTimestamp, getDocs, addDoc } from 'firebase/firestore';
import { 
    Send, Bot, User, Copy, Plus, MessageSquare, Loader2, Sparkles, Check, Bird
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ChatMessage {
    role: 'user' | 'model';
    content: string;
    timestamp?: any;
}

interface ChatSession {
    id: string;
    title: string;
    lastUpdated: any;
    messages: ChatMessage[];
}

export default function CrmAssistantClient() {
    const [sessions, setSessions] = useState<ChatSession[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const user = auth.currentUser;

    useEffect(() => {
        if (!user) return;
        
        const q = query(
            collection(db, 'crm-ai-chats', user.uid, 'sessions'),
            orderBy('lastUpdated', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data: ChatSession[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ChatSession));
            setSessions(data);
            
            // Auto-select most recent if none selected
            if (!activeSessionId && data.length > 0) {
                setActiveSessionId(data[0].id);
                setMessages(data[0].messages || []);
            }
        });

        return () => unsubscribe();
    }, [user, activeSessionId]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const selectSession = (session: ChatSession) => {
        setActiveSessionId(session.id);
        setMessages(session.messages || []);
    };

    const createNewSession = () => {
        setActiveSessionId(null);
        setMessages([]);
    };

    const handleSend = async () => {
        if (!input.trim() || !user || isLoading) return;

        const userText = input.trim();
        setInput('');
        const newMessages: ChatMessage[] = [...messages, { role: 'user', content: userText, timestamp: new Date() }];
        setMessages(newMessages);
        setIsLoading(true);

        try {
            // Prepare history payload for API. Don't include the very last user message in the 'history' array.
            const historyPayload = messages.map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/v1/crm-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: userText,
                    history: historyPayload
                })
            });

            if (!response.ok) {
                throw new Error('Failed to get response from AI');
            }

            const data = await response.json();
            const aiText = data.reply || "I couldn't process that request.";

            const finalMessages: ChatMessage[] = [...newMessages, { role: 'model', content: aiText, timestamp: new Date() }];
            setMessages(finalMessages);

            // Save to Firestore
            let sessionId = activeSessionId;
            if (!sessionId) {
                // Determine title from first message
                const newTitle = userText.length > 30 ? userText.substring(0, 30) + '...' : userText;
                const newDocRef = await addDoc(collection(db, 'crm-ai-chats', user.uid, 'sessions'), {
                    title: newTitle,
                    lastUpdated: serverTimestamp(),
                    messages: finalMessages
                });
                setActiveSessionId(newDocRef.id);
            } else {
                await setDoc(doc(db, 'crm-ai-chats', user.uid, 'sessions', sessionId), {
                    messages: finalMessages,
                    lastUpdated: serverTimestamp()
                }, { merge: true });
            }

        } catch (error: any) {
            console.error("AI Error:", error);
            toast.error(error.message || "Failed to generate AI response.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = (text: string, idx: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
        toast.success("Copied to clipboard");
    };

    return (
        <div className="flex h-[calc(100vh-100px)] p-6 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500 gap-6">
            
            {/* Sidebar */}
            <div className="w-80 flex flex-col bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden shrink-0 hidden lg:flex">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <button 
                        onClick={createNewSession}
                        className="w-full bg-sky-50 hover:bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:hover:bg-sky-900/50 dark:text-sky-400 p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-colors"
                    >
                        <Plus className="w-5 h-5" /> New Chat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {sessions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => selectSession(s)}
                            className={`w-full text-left p-4 rounded-2xl flex items-start gap-3 transition-colors ${activeSessionId === s.id ? 'bg-slate-100 dark:bg-slate-700/50 text-slate-900 dark:text-white' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'}`}
                        >
                            <MessageSquare className="w-5 h-5 mt-0.5 shrink-0 opacity-50" />
                            <div className="overflow-hidden">
                                <p className="font-bold text-sm truncate">{s.title}</p>
                                <p className="text-[10px] font-black uppercase tracking-wider opacity-60 mt-1">
                                    {s.lastUpdated?.toDate ? format(s.lastUpdated.toDate(), 'MMM d, h:mm a') : 'Just now'}
                                </p>
                            </div>
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center p-6 text-slate-400 text-sm font-bold">
                            No recent chats
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-sky-50 to-indigo-50 dark:from-sky-900/20 dark:to-indigo-900/20 p-6 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-sky-500">
                        <Bird className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 dark:text-white">Eagle Marketing Agent</h2>
                        <p className="text-xs font-bold text-slate-500">AI-powered marketing mascot</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 scroll-smooth">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto opacity-50 space-y-4">
                            <Bird className="w-12 h-12 text-slate-400" />
                            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200">Hello! I'm Eagle, your Marketing Agent.</h3>
                            <p className="text-sm font-semibold text-slate-500">Draft outreach emails, summarize lead activities, brainstorm campaigns, or get grant writing suggestions.</p>
                        </div>
                    ) : (
                        messages.map((m, idx) => (
                            <div key={idx} className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-2xl flex items-center justify-center ${m.role === 'user' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400'}`}>
                                    {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-5 h-5" />}
                                </div>
                                <div className={`flex flex-col gap-2 max-w-[80%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 md:p-5 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm ${m.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-sm'}`}>
                                        {m.content}
                                    </div>
                                    {m.role === 'model' && (
                                        <button 
                                            onClick={() => handleCopy(m.content, idx)}
                                            className="text-xs font-bold text-slate-400 hover:text-sky-500 transition-colors flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50"
                                        >
                                            {copiedIndex === idx ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                            {copiedIndex === idx ? 'Copied' : 'Copy'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex gap-4">
                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-2xl bg-sky-100 text-sky-600 dark:bg-sky-900/50 dark:text-sky-400 flex items-center justify-center">
                                <Bot className="w-5 h-5" />
                            </div>
                            <div className="p-4 md:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-tl-sm flex items-center gap-2">
                                <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />
                                <span className="text-sm font-bold text-slate-500">Assistant is thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="max-w-4xl mx-auto flex gap-3">
                        <input 
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="Type your message here..."
                            className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-4 text-sm font-bold border border-slate-200 dark:border-slate-700 shadow-sm focus:ring-2 focus:ring-sky-500/50 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                        />
                        <button 
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white w-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95"
                        >
                            <Send className="w-5 h-5 ml-1" />
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
