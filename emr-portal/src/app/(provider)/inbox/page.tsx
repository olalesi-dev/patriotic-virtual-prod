"use client";

import React, { useState, useEffect } from 'react';
import {
    Inbox, Send, File, ChevronDown, Plus, MessageSquare,
    Search, User, Users, MoreHorizontal, ShieldCheck, X, Paperclip, ArrowLeft, FileText, Lock
} from 'lucide-react';

// --- TYPES ---
type Message = {
    id: string;
    sender: string;
    senderType: 'patient' | 'provider' | 'system';
    content: string;
    timestamp: Date;
    read: boolean;
};

type Thread = {
    id: string;
    subject: string;
    participants: string[];
    messages: Message[];
    folder: 'inbox' | 'sent' | 'draft' | 'deleted';
    status: 'open' | 'closed';
    lastActivity: Date;
    tags?: string[];
};

// --- MOCK DATA ---
const INITIAL_THREADS: Thread[] = [
    {
        id: 't1',
        subject: 'Follow-up on blood work',
        participants: ['Wendy Smith'],
        folder: 'inbox',
        status: 'open',
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        messages: [
            { id: 'm1', sender: 'Wendy Smith', senderType: 'patient', content: 'Hi Dr. Dayo, I received my results. Can we discuss them?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24), read: true },
            { id: 'm2', sender: 'Dr. Dayo', senderType: 'provider', content: 'Certainly Wendy. Everything looks stable, but I have a few notes.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), read: true }
        ]
    },
    {
        id: 't2',
        subject: 'Prescription Renewal',
        participants: ['Michael Brown'],
        folder: 'inbox',
        status: 'open',
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 5),
        messages: [
            { id: 'm3', sender: 'Michael Brown', senderType: 'patient', content: 'I am running low on my medication. Can I get a refill?', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5), read: false }
        ]
    },
    {
        id: 't3',
        subject: 'Referral Letter',
        participants: ['Sarah Connor'],
        folder: 'sent',
        status: 'closed',
        lastActivity: new Date(Date.now() - 1000 * 60 * 60 * 48),
        messages: [
            { id: 'm4', sender: 'Dr. Dayo', senderType: 'provider', content: 'Attached is the referral letter we discussed.', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48), read: true }
        ]
    }
];

export default function InboxPage() {
    // --- STATE ---
    const [activeFolder, setActiveFolder] = useState<'all' | 'sent' | 'draft'>('all');
    const [activeTab, setActiveTab] = useState('Open');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [showBanner, setShowBanner] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Data State
    const [threads, setThreads] = useState<Thread[]>(INITIAL_THREADS);
    const [replyText, setReplyText] = useState('');

    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
    const [connectedInboxes, setConnectedInboxes] = useState<{ id: string, name: string, type: 'google' | 'microsoft' | string }[]>([]);

    // --- DERIVED STATE ---
    const filteredThreads = threads.filter(t => {
        // Folder Filter
        if (activeFolder === 'sent' && t.folder !== 'sent') return false;
        if (activeFolder === 'draft' && t.folder !== 'draft') return false;
        if (activeFolder === 'all' && t.folder === 'deleted') return false; // All doesn't show deleted usually

        // Tab Filter (Status)
        if (activeTab === 'Open' && t.status !== 'open') return false;
        if (activeTab === 'Closed' && t.status !== 'closed') return false;

        // Search Filter
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            return t.subject.toLowerCase().includes(lowerSearch) ||
                t.participants.some(p => p.toLowerCase().includes(lowerSearch));
        }

        return true;
    });

    const selectedThread = threads.find(t => t.id === selectedThreadId);

    // --- HANDLERS ---
    const handleCompose = (e: React.FormEvent) => {
        e.preventDefault();
        // In a real app, this would use form data. Mocking a new sent message.
        const newThread: Thread = {
            id: `t${Date.now()}`,
            subject: 'New Secure Message',
            participants: ['Unknown Recipient'],
            folder: 'sent',
            status: 'open',
            lastActivity: new Date(),
            messages: [
                { id: `m${Date.now()}`, sender: 'Dr. Dayo', senderType: 'provider', content: 'This is a secure message.', timestamp: new Date(), read: true }
            ]
        };
        setThreads([newThread, ...threads]);
        setIsComposeOpen(false);
        setActiveFolder('sent');
        setSelectedThreadId(newThread.id);
    };

    const handleReply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedThreadId) return;

        const updatedThreads = threads.map(t => {
            if (t.id === selectedThreadId) {
                return {
                    ...t,
                    lastActivity: new Date(),
                    messages: [
                        ...t.messages,
                        {
                            id: `m${Date.now()}`,
                            sender: 'Dr. Dayo',
                            senderType: 'provider' as const, // Fix literal type
                            content: replyText,
                            timestamp: new Date(),
                            read: true
                        }
                    ]
                };
            }
            return t;
        });

        setThreads(updatedThreads);
        setReplyText('');
    };

    // Auto-select 'open' patient thread when clicking sidebar
    const handlePatientClick = (patientName: string) => {
        const thread = threads.find(t => t.participants.includes(patientName));
        if (thread) {
            setSelectedThreadId(thread.id);
            setActiveFolder('all'); // Ensure it's visible
        } else {
            // If no thread exists, standard behavior is often to start a compose flow
            setIsComposeOpen(true);
        }
    };

    const handleConnect = (provider: string) => {
        setConnectingProvider(provider);
        // Simulate OAuth flow
        setTimeout(() => {
            setConnectingProvider(null);
            setIsConnectModalOpen(false);
            // In a real app, this would add the inbox to the list
            const newInbox = {
                id: `inbox-${Date.now()}`,
                name: `${provider} Inbox`,
                type: provider.toLowerCase()
            };
            setConnectedInboxes([...connectedInboxes, newInbox]);
            alert(`Successfully connected ${provider} account!`);
        }, 1500);
    };

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">

            {/* INNER SIDEBAR */}
            <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">
                <div className="p-4 space-y-1">
                    <SidebarItem
                        icon={Inbox}
                        label="All"
                        active={activeFolder === 'all'}
                        onClick={() => { setActiveFolder('all'); setSelectedThreadId(null); }}
                    />
                    <SidebarItem
                        icon={Send}
                        label="Sent"
                        active={activeFolder === 'sent'}
                        onClick={() => { setActiveFolder('sent'); setSelectedThreadId(null); }}
                    />
                    <SidebarItem
                        icon={File}
                        label="Draft"
                        active={activeFolder === 'draft'}
                        onClick={() => { setActiveFolder('draft'); setSelectedThreadId(null); }}
                    />
                </div>

                <div className="px-4 py-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 uppercase tracking-wide mb-2 cursor-pointer hover:text-brand">
                        <div className="flex items-center gap-1">
                            <Inbox className="w-4 h-4" /> Inboxes
                            <ChevronDown className="w-3 h-3" />
                        </div>
                        <button onClick={() => setIsConnectModalOpen(true)} className="text-brand flex items-center gap-1 hover:underline">
                            <Plus className="w-3 h-3" /> New
                        </button>
                    </div>
                    {/* Connected Inboxes List */}
                    <div className="space-y-1 mt-1 pl-2">
                        {connectedInboxes.map(inbox => (
                            <div
                                key={inbox.id}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                            >
                                <div className={`w-2 h-2 rounded-full ${inbox.type === 'google' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                <span>{inbox.name}</span>
                            </div>
                        ))}
                        {connectedInboxes.length === 0 && (
                            <div className="text-xs text-slate-400 italic px-3">No connected accounts</div>
                        )}
                    </div>
                </div>

                <div className="px-4 mb-6">
                    <button
                        onClick={() => setIsComposeOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-brand text-brand hover:bg-brand-50 font-bold py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Secure message</span>
                    </button>
                </div>

                {/* Patient Section */}
                <div className="px-4 py-2 flex-1 overflow-y-auto">
                    <CollapsibleSection icon={User} label="Patient" defaultOpen>
                        <div className="space-y-1 mt-1 pl-2">
                            <div
                                onClick={() => handlePatientClick('Wendy Smith')}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                            >
                                <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">W</div>
                                <span>Wendy</span>
                                <span className="ml-auto bg-indigo-100 text-indigo-700 text-[10px] px-1.5 py-0.5 rounded">Demo</span>
                            </div>
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection icon={Users} label="Team" className="mt-4">
                        <div className="text-xs text-slate-400 italic pl-8 mt-1">No recent messages</div>
                    </CollapsibleSection>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">

                {/* Header / Banner Area (Visible only if no thread selected or list view) */}
                <div className="bg-white border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            {selectedThreadId && (
                                <button onClick={() => setSelectedThreadId(null)} className="md:hidden mr-2 p-1 hover:bg-slate-100 rounded">
                                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                                </button>
                            )}
                            <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                                <Inbox className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Inbox</h2>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsComposeOpen(true)}
                                className="flex items-center gap-1 px-4 py-2 bg-brand text-white font-bold rounded-lg text-sm hover:bg-brand-600 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4" /> Compose
                            </button>
                        </div>
                    </div>

                    {/* PROMO BANNER */}
                    {showBanner && !selectedThreadId && (
                        <div className="mx-6 mb-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 p-8 relative overflow-hidden border border-indigo-100 animate-fade-in-up">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute top-10 left-10 text-brand"><ShieldCheck className="w-12 h-12" /></div>
                                <div className="absolute top-20 right-20 text-brand"><MessageSquare className="w-16 h-16 rotate-12" /></div>
                            </div>
                            <div className="relative z-10 text-center">
                                <h3 className="text-2xl font-bold text-brand mb-2">Secure messaging</h3>
                                <p className="text-slate-600 font-medium mb-6">Establish a secure line of communication with your team and patients</p>
                                <button
                                    onClick={() => setIsComposeOpen(true)}
                                    className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center gap-2 mx-auto"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Secure message
                                </button>
                            </div>
                            <button onClick={() => setShowBanner(false)} className="absolute top-4 right-4 bg-white/50 hover:bg-white text-slate-500 text-xs px-2 py-1 rounded shadow-sm transition-colors">Got it!</button>
                        </div>
                    )}
                </div>

                {/* CONTENT: SPLIT OR SINGLE VIEW */}
                {/* For standard 'Inbox' feel, if no thread selected, show list. If thread selected, show thread. */}

                {selectedThread ? (
                    // --- THREAD VIEW ---
                    <div className="flex-1 flex flex-col bg-white animate-fade-in">
                        {/* Thread Header */}
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">{selectedThread.subject}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <User className="w-3 h-3" />
                                    {selectedThread.participants.join(', ')}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-100 rounded text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {selectedThread.messages.map((msg) => {
                                const isMe = msg.senderType === 'provider';
                                return (
                                    <div key={msg.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                                            <span className="text-xs font-bold">{msg.sender.charAt(0)}</span>
                                        </div>
                                        <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : ''}`}>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span>{msg.sender}</span>
                                                <span>•</span>
                                                <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                                ? 'bg-brand text-white rounded-tr-none'
                                                : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Reply Box */}
                        <form onSubmit={handleReply} className="p-4 border-t border-slate-100 bg-white flex gap-4 items-end">
                            <button type="button" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hover:text-slate-600 transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <div className="flex-1 relative">
                                <textarea
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Type your secure response..."
                                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none h-12 min-h-[48px] max-h-32 shadow-inner"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={!replyText.trim()}
                                className="p-3 bg-brand text-white rounded-xl hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </div>
                ) : (
                    // --- LIST VIEW ---
                    <div className="flex-1 flex flex-col min-h-0">
                        {/* TABS & SEARCH (Visible in List View) */}
                        <div className="px-6 border-b border-slate-200 bg-white">
                            <div className="flex gap-6 mb-4 overflow-x-auto">
                                {['Open', 'Closed', 'Scheduled', 'Deleted', 'Other'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-brand text-brand'
                                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                            }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center gap-4">
                            <span className="text-sm font-bold text-slate-900">{filteredThreads.length} conversation{filteredThreads.length !== 1 && 's'}</span>
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search conversations"
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                />
                            </div>
                        </div>

                        {/* LIST CONTENT */}
                        <div className="flex-1 overflow-y-auto bg-white">
                            {filteredThreads.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {filteredThreads.map(thread => (
                                        <div
                                            key={thread.id}
                                            onClick={() => setSelectedThreadId(thread.id)}
                                            className="px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    {!thread.messages[thread.messages.length - 1].read && (
                                                        <div className="w-2 h-2 bg-brand rounded-full"></div>
                                                    )}
                                                    <span className={`text-sm ${!thread.messages[thread.messages.length - 1].read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                                                        {thread.participants.join(', ')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">{new Date(thread.lastActivity).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-sm font-medium text-slate-800 mb-1">{thread.subject}</div>
                                            <div className="text-sm text-slate-500 truncate">{thread.messages[thread.messages.length - 1].content}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                // EMPTY STATE
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-48 h-48 bg-indigo-50 rounded-full flex items-center justify-center mb-6 relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-full animate-pulse-slow"></div>
                                        <MessageSquare className="w-16 h-16 text-indigo-300 relative z-10" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-1">No conversations found</h3>
                                    <p className="text-slate-500 text-sm max-w-xs">There are no {activeFolder} messages in this view.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

            </div>

            {/* COMPOSE MODAL */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200">
                        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4" /> Secure Message</h3>
                            <button onClick={() => setIsComposeOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCompose} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">To</label>
                                <select className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none font-medium">
                                    <option>Select Recipient...</option>
                                    <option>Wendy Smith (Patient)</option>
                                    <option>Michael Brown (Patient)</option>
                                    <option>Sarah Connor (Patient)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Subject</label>
                                <input type="text" placeholder="e.g. Lab Results" required className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wide">Message</label>
                                <textarea required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none min-h-[150px] resize-none" placeholder="Type your secure message..."></textarea>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button type="submit" className="bg-brand hover:bg-brand-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
                                    <Send className="w-4 h-4" /> Send Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CONNECT INBOX MODAL */}
            {isConnectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-slate-700">
                                <Inbox className="w-6 h-6" />
                                <h3 className="text-xl font-bold">Connect inbox</h3>
                            </div>
                            <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 md:p-8 overflow-y-auto">
                            <p className="text-slate-500 mb-8 max-w-lg">Connect your apps to seamlessly send, receive, and track all your communications in one centralized place.</p>

                            <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-4">
                                <div className="w-6 flex justify-center"><Inbox className="w-5 h-5" /></div>
                                Email
                            </h4>

                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Google Card */}
                                <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span className="font-bold text-slate-900 text-lg">Google</span>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-6 h-10">Add a Gmail account or Google group list</p>
                                    <button
                                        onClick={() => handleConnect('Google')}
                                        disabled={!!connectingProvider}
                                        className="w-full py-2 border border-slate-300 rounded-lg text-brand font-bold hover:bg-brand-50 hover:border-brand-200 transition-colors disabled:opacity-50"
                                    >
                                        {connectingProvider === 'Google' ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>

                                {/* Microsoft Card */}
                                <div className="border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <svg className="w-6 h-6" viewBox="0 0 23 23">
                                            <path fill="#f25022" d="M1 1h10v10H1z" />
                                            <path fill="#00a4ef" d="M12 1h10v10H12z" />
                                            <path fill="#7fba00" d="M1 12h10v10H1z" />
                                            <path fill="#ffb900" d="M12 12h10v10H12z" />
                                        </svg>
                                        <span className="font-bold text-slate-900 text-lg">Microsoft</span>
                                    </div>
                                    <p className="text-slate-500 text-sm mb-6 h-10">Add a Outlook, Office365 or Exchange account</p>
                                    <button
                                        onClick={() => handleConnect('Microsoft')}
                                        disabled={!!connectingProvider}
                                        className="w-full py-2 border border-slate-300 rounded-lg text-brand font-bold hover:bg-brand-50 hover:border-brand-200 transition-colors disabled:opacity-50"
                                    >
                                        {connectingProvider === 'Microsoft' ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <a href="#" className="flex items-center gap-2 text-brand font-bold text-sm hover:underline">
                                <FileText className="w-4 h-4" /> Guide to set up inbox account
                            </a>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}

// --- SUB COMPONENTS ---

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${active
                ? 'bg-slate-100 text-slate-900 font-bold'
                : 'text-slate-600 font-medium hover:bg-slate-50'
                }`}
        >
            <Icon className={`w-4 h-4 ${active ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-600'}`} />
            <span className="text-sm">{label}</span>
        </div>
    )
}

function CollapsibleSection({ icon: Icon, label, children, className, defaultOpen }: any) {
    const [open, setOpen] = useState(defaultOpen || false);
    return (
        <div className={className}>
            <div
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-slate-50 rounded-md transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500" />
                    <span className="text-sm font-bold text-slate-800">{label}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {open && children}
        </div>
    )
}


