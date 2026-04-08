"use client";

import React, { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase';
import { apiFetchJson } from '@/lib/api-client';
import {
    collection,
    doc,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where
} from 'firebase/firestore';
import {
    Inbox, Send, File, ChevronDown, Plus, MessageSquare,
    Search, User, Users, MoreHorizontal, ShieldCheck, X, Paperclip, ArrowLeft, FileText, Lock
} from 'lucide-react';
import { AITextarea } from '@/components/ui/AITextarea';

type ParticipantSummary = {
    id: string;
    name: string;
    role: string | null;
};

type InboxThread = {
    id: string;
    subject: string;
    category?: string;
    threadType?: 'patient_provider' | 'provider_provider';
    patientId?: string;
    patientName?: string;
    providerId?: string;
    providerName?: string;
    participantIds?: string[];
    participantSummaries?: ParticipantSummary[];
    teamId?: string;
    teamName?: string;
    lastMessage?: string;
    lastMessageAt?: { toDate?: () => Date; toMillis?: () => number } | Date | string | null;
    unreadCount?: number;
    providerUnreadCount?: number;
    folder: 'inbox' | 'sent' | 'draft' | 'deleted';
    status: 'open' | 'closed';
};

type InboxMessage = {
    id: string;
    senderId?: string;
    senderType: 'patient' | 'provider' | 'system';
    body: string;
    createdAt?: { toDate?: () => Date } | Date | string | null;
    read: boolean;
    attachment?: {
        name: string;
        url: string;
        type: string;
    } | null;
};

type PatientOption = {
    id: string;
    name: string;
    email: string | null;
};

type TeamRecipientOption = {
    key: string;
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    teamId: string;
    teamName: string;
};

interface PatientListApiResponse {
    success?: boolean;
    error?: string;
    patients?: Array<{
        id: string;
        name: string;
        email: string | null;
    }>;
}

interface TeamsApiResponse {
    success?: boolean;
    error?: string;
    teams?: Array<{
        id: string;
        name: string;
        members: Array<{
            id: string;
            name: string;
            email: string | null;
            role: string | null;
        }>;
    }>;
}

interface SendMessageApiResponse {
    success?: boolean;
    error?: string;
    threadId?: string;
}

function getTimestampMillis(value: InboxThread['lastMessageAt']) {
    if (!value) return 0;
    if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
        return (value as { toMillis: () => number }).toMillis();
    }
    if (!(value instanceof Date) && typeof value !== 'string') {
        return 0;
    }

    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getMessageTime(value: InboxMessage['createdAt']) {
    if (!value) return 'Now';
    const parsed = typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : (value instanceof Date ? value : typeof value === 'string' ? new Date(value) : new Date(0));
    if (Number.isNaN(parsed.getTime())) return 'Now';

    return parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getThreadDate(value: InboxThread['lastMessageAt']) {
    if (!value) return 'New';
    const parsed = typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : (value instanceof Date ? value : typeof value === 'string' ? new Date(value) : new Date(0));
    if (Number.isNaN(parsed.getTime())) return 'New';

    return parsed.toLocaleDateString();
}

export default function InboxPage() {
    const [activeFolder, setActiveFolder] = useState<'all' | 'sent' | 'draft'>('all');
    const [activeTab, setActiveTab] = useState('Open');
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [showBanner, setShowBanner] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeUser, setActiveUser] = useState(auth.currentUser);
    const [threads, setThreads] = useState<InboxThread[]>([]);
    const [messages, setMessages] = useState<InboxMessage[]>([]);
    const [replyText, setReplyText] = useState('');
    const [composeRecipientType, setComposeRecipientType] = useState<'patient' | 'provider'>('patient');
    const [composeRecipient, setComposeRecipient] = useState('');
    const [composeMessage, setComposeMessage] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeTeamId, setComposeTeamId] = useState('');
    const [composeTeamName, setComposeTeamName] = useState('');
    const [patients, setPatients] = useState<PatientOption[]>([]);
    const [teamRecipients, setTeamRecipients] = useState<TeamRecipientOption[]>([]);
    const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
    const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
    const [connectedInboxes, setConnectedInboxes] = useState<{ id: string, name: string, type: 'google' | 'microsoft' | string }[]>([]);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setActiveUser(user);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!activeUser) {
            setThreads([]);
            setPatients([]);
            setTeamRecipients([]);
            return;
        }

        let patientThreads: InboxThread[] = [];
        let providerThreads: InboxThread[] = [];

        const syncThreads = () => {
            const byId = new Map<string, InboxThread>();
            [...patientThreads, ...providerThreads].forEach((thread) => {
                byId.set(thread.id, thread);
            });

            setThreads(Array.from(byId.values()).sort((first, second) => (
                getTimestampMillis(second.lastMessageAt) - getTimestampMillis(first.lastMessageAt)
            )));
        };

        const unsubscribePatientThreads = onSnapshot(
            query(collection(db, 'threads'), where('providerId', '==', activeUser.uid)),
            (snap) => {
                patientThreads = snap.docs
                    .map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                        folder: 'inbox',
                        status: 'open'
                    } as InboxThread))
                    .filter((thread) => (thread.threadType ?? 'patient_provider') === 'patient_provider');
                syncThreads();
            },
            (error) => {
                console.error('Patient-provider threads snapshot error:', error);
            }
        );

        const unsubscribeProviderThreads = onSnapshot(
            query(collection(db, 'threads'), where('participantIds', 'array-contains', activeUser.uid)),
            (snap) => {
                providerThreads = snap.docs
                    .map((docSnap) => ({
                        id: docSnap.id,
                        ...docSnap.data(),
                        folder: 'inbox',
                        status: 'open'
                    } as InboxThread))
                    .filter((thread) => thread.threadType === 'provider_provider');
                syncThreads();
            },
            (error) => {
                console.error('Provider-provider threads snapshot error:', error);
            }
        );

        const loadComposeOptions = async () => {
            try {
                const [patientPayload, teamsPayload] = await Promise.all([
                    apiFetchJson<PatientListApiResponse>('/api/patients/list?pageSize=100&sortField=name&sortDir=asc', {
                        method: 'GET',
                        user: activeUser,
                        cache: 'no-store'
                    }),
                    apiFetchJson<TeamsApiResponse>('/api/teams', {
                        method: 'GET',
                        user: activeUser,
                        cache: 'no-store'
                    })
                ]);

                if (patientPayload.success) {
                    setPatients((patientPayload.patients ?? []).map((patient) => ({
                        id: patient.id,
                        name: patient.name,
                        email: patient.email
                    })));
                }

                if (teamsPayload.success) {
                    const teammateMap = new Map<string, TeamRecipientOption>();
                    (teamsPayload.teams ?? []).forEach((team) => {
                        team.members.forEach((member) => {
                            if (member.id === activeUser.uid) return;
                            const key = `${member.id}:${team.id}`;
                            teammateMap.set(key, {
                                key,
                                id: member.id,
                                name: member.name,
                                email: member.email,
                                role: member.role,
                                teamId: team.id,
                                teamName: team.name
                            });
                        });
                    });
                    setTeamRecipients(Array.from(teammateMap.values()).sort((first, second) => (
                        first.name.localeCompare(second.name)
                    )));
                }
            } catch (error) {
                console.error('Failed to load inbox compose options:', error);
            }
        };

        void loadComposeOptions();

        return () => {
            unsubscribePatientThreads();
            unsubscribeProviderThreads();
        };
    }, [activeUser]);

    useEffect(() => {
        if (!selectedThreadId || !activeUser) return;

        const selectedThread = threads.find((thread) => thread.id === selectedThreadId);
        const isTeamThread = selectedThread?.threadType === 'provider_provider';
        const unsubscribe = onSnapshot(
            query(collection(db, 'threads', selectedThreadId, 'messages'), orderBy('createdAt', 'asc')),
            (snap) => {
                const nextMessages = snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() } as InboxMessage));
                setMessages(nextMessages);

                snap.docs.forEach((docSnap) => {
                    const message = docSnap.data() as InboxMessage;
                    const shouldMarkRead = isTeamThread
                        ? message.senderId !== activeUser.uid && !message.read
                        : message.senderType === 'patient' && !message.read;
                    if (shouldMarkRead) {
                        updateDoc(doc(db, 'threads', selectedThreadId, 'messages', docSnap.id), { read: true }).catch(() => {});
                    }
                });

                updateDoc(doc(db, 'threads', selectedThreadId), { providerUnreadCount: 0 }).catch(() => {});
            },
            (error) => {
                console.error('Thread message snapshot error:', error);
                setMessages([]);
            }
        );

        return () => unsubscribe();
    }, [selectedThreadId, activeUser, threads]);

    const getThreadDisplayName = (thread: InboxThread) => {
        if (thread.threadType === 'provider_provider') {
            return thread.participantSummaries?.find((participant) => participant.id !== activeUser?.uid)?.name
                ?? thread.providerName
                ?? 'Team member';
        }

        return thread.patientName || 'Patient';
    };

    const getThreadParticipantsLabel = (thread: InboxThread) => {
        if (thread.threadType === 'provider_provider') {
            const names = (thread.participantSummaries ?? []).map((participant) => participant.name);
            return names.join(', ') || thread.teamName || 'Care team';
        }

        return thread.patientName || 'Patient';
    };

    const filteredThreads = threads.filter((thread) => {
        if (activeFolder === 'sent' && thread.folder !== 'sent') return false;
        if (activeFolder === 'draft' && thread.folder !== 'draft') return false;
        if (activeFolder === 'all' && thread.folder === 'deleted') return false;
        if (activeTab === 'Open' && thread.status !== 'open') return false;
        if (activeTab === 'Closed' && thread.status !== 'closed') return false;
        if (!searchTerm) return true;

        const lowerSearch = searchTerm.toLowerCase();
        return (
            (thread.subject || '').toLowerCase().includes(lowerSearch) ||
            getThreadDisplayName(thread).toLowerCase().includes(lowerSearch)
        );
    });

    const selectedThread = threads.find((thread) => thread.id === selectedThreadId);

    const handleComposeRecipientChange = (value: string) => {
        setComposeRecipient(value);
        if (composeRecipientType === 'provider') {
            const selectedRecipient = teamRecipients.find((option) => option.key === value);
            setComposeTeamId(selectedRecipient?.teamId ?? '');
            setComposeTeamName(selectedRecipient?.teamName ?? '');
            return;
        }

        setComposeTeamId('');
        setComposeTeamName('');
    };

    const handleComposeTypeChange = (value: 'patient' | 'provider') => {
        setComposeRecipientType(value);
        setComposeRecipient('');
        setComposeTeamId('');
        setComposeTeamName('');
    };

    const handleCompose = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeUser || !composeRecipient || !composeSubject || !composeMessage.trim()) return;

        try {
            const resolvedRecipientId = composeRecipientType === 'provider'
                ? teamRecipients.find((option) => option.key === composeRecipient)?.id
                : composeRecipient;
            if (!resolvedRecipientId) return;

            const payload = await apiFetchJson<SendMessageApiResponse>('/api/messages/send', {
                method: 'POST',
                user: activeUser,
                body: {
                    recipientId: resolvedRecipientId,
                    recipientType: composeRecipientType,
                    subject: composeSubject,
                    category: composeRecipientType === 'provider' ? 'Team' : 'General',
                    body: composeMessage,
                    teamId: composeRecipientType === 'provider' ? composeTeamId : undefined,
                    teamName: composeRecipientType === 'provider' ? composeTeamName : undefined
                }
            });

            if (!payload.success || !payload.threadId) {
                throw new Error(payload.error || 'Failed to send message.');
            }

            setIsComposeOpen(false);
            setComposeMessage('');
            setComposeSubject('');
            setComposeRecipient('');
            setComposeTeamId('');
            setComposeTeamName('');
            setSelectedThreadId(payload.threadId);
        } catch (error) {
            console.error(error);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyText.trim() || !selectedThreadId || !activeUser) return;

        const text = replyText;
        setReplyText('');

        try {
            const payload = await apiFetchJson<SendMessageApiResponse>('/api/messages/send', {
                method: 'POST',
                user: activeUser,
                body: {
                    threadId: selectedThreadId,
                    body: text
                }
            });

            if (!payload.success) {
                throw new Error(payload.error || 'Failed to send reply.');
            }
        } catch (error) {
            console.error(error);
            setReplyText(text);
        }
    };

    const handlePatientClick = (patient: PatientOption) => {
        const thread = threads.find((entry) => (entry.threadType ?? 'patient_provider') === 'patient_provider' && entry.patientId === patient.id);
        if (thread) {
            setSelectedThreadId(thread.id);
            setActiveFolder('all');
            return;
        }

        setComposeRecipientType('patient');
        setComposeRecipient(patient.id);
        setComposeTeamId('');
        setComposeTeamName('');
        setComposeSubject(`Message for ${patient.name}`);
        setIsComposeOpen(true);
    };

    const handleTeamClick = (recipient: TeamRecipientOption) => {
        const thread = threads.find((entry) => (
            entry.threadType === 'provider_provider'
            && entry.teamId === recipient.teamId
            && (entry.participantIds ?? []).includes(recipient.id)
        ));

        if (thread) {
            setSelectedThreadId(thread.id);
            setActiveFolder('all');
            return;
        }

        setComposeRecipientType('provider');
        setComposeRecipient(recipient.key);
        setComposeTeamId(recipient.teamId);
        setComposeTeamName(recipient.teamName);
        setComposeSubject(`${recipient.teamName} conversation`);
        setIsComposeOpen(true);
    };

    const handleConnect = (provider: string) => {
        setConnectingProvider(provider);
        setTimeout(() => {
            setConnectingProvider(null);
            setIsConnectModalOpen(false);
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
        <div className="flex h-[calc(100vh-6rem)] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden font-sans">
            <aside className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
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
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide mb-2 cursor-pointer hover:text-brand">
                        <div className="flex items-center gap-1">
                            <Inbox className="w-4 h-4" /> Inboxes
                            <ChevronDown className="w-3 h-3" />
                        </div>
                        <button onClick={() => setIsConnectModalOpen(true)} className="text-brand flex items-center gap-1 hover:underline">
                            <Plus className="w-3 h-3" /> New
                        </button>
                    </div>
                    <div className="space-y-1 mt-1 pl-2">
                        {connectedInboxes.map((inbox) => (
                            <div
                                key={inbox.id}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg cursor-pointer transition-colors"
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
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-700 border border-brand text-brand hover:bg-brand-50 dark:hover:bg-slate-600 font-bold py-2 rounded-lg transition-colors shadow-sm"
                    >
                        <MessageSquare className="w-4 h-4" />
                        <span>Secure message</span>
                    </button>
                </div>

                <div className="px-4 py-2 flex-1 overflow-y-auto">
                    <CollapsibleSection icon={User} label="Patient" defaultOpen>
                        <div className="space-y-1 mt-1 pl-2">
                            {patients.slice(0, 10).map((patient) => {
                                const initials = patient.name.substring(0, 2).toUpperCase();
                                return (
                                    <div
                                        key={patient.id}
                                        onClick={() => handlePatientClick(patient)}
                                        className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg cursor-pointer transition-colors"
                                    >
                                        <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">{initials}</div>
                                        <span className="truncate">{patient.name.split(' ')[0]}</span>
                                    </div>
                                );
                            })}
                            {patients.length === 0 && (
                                <div className="text-xs text-slate-400 italic px-3">No patients found</div>
                            )}
                        </div>
                    </CollapsibleSection>

                    <CollapsibleSection icon={Users} label="Team" className="mt-4" defaultOpen>
                        <div className="space-y-1 mt-1 pl-2">
                            {teamRecipients.map((recipient) => (
                                <div
                                    key={recipient.key}
                                    onClick={() => handleTeamClick(recipient)}
                                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg cursor-pointer transition-colors"
                                >
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                        {recipient.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate">{recipient.name}</div>
                                        <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">{recipient.teamName}</div>
                                    </div>
                                </div>
                            ))}
                            {teamRecipients.length === 0 && (
                                <div className="text-xs text-slate-400 italic px-3">No team members available</div>
                            )}
                        </div>
                    </CollapsibleSection>
                </div>
            </aside>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50 dark:bg-slate-900/30 relative">
                <div className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 shrink-0">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            {selectedThreadId && (
                                <button onClick={() => setSelectedThreadId(null)} className="md:hidden mr-2 p-1 hover:bg-slate-100 rounded">
                                    <ArrowLeft className="w-5 h-5 text-slate-500" />
                                </button>
                            )}
                            <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-500 dark:text-slate-400">
                                <Inbox className="w-5 h-5" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Inbox</h2>
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

                    {showBanner && !selectedThreadId && (
                        <div className="mx-6 mb-6 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-indigo-950/40 p-8 relative overflow-hidden border border-indigo-100 dark:border-indigo-900/40 animate-fade-in-up">
                            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                                <div className="absolute top-10 left-10 text-brand"><ShieldCheck className="w-12 h-12" /></div>
                                <div className="absolute top-20 right-20 text-brand"><MessageSquare className="w-16 h-16 rotate-12" /></div>
                            </div>
                            <div className="relative z-10 text-center">
                                <h3 className="text-2xl font-bold text-brand mb-2">Secure messaging</h3>
                                <p className="text-slate-600 dark:text-slate-300 font-medium mb-6">Establish a secure line of communication with your team and patients</p>
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

                {selectedThread ? (
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-800 animate-fade-in">
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/20">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedThread.subject}</h3>
                                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                                    <User className="w-3 h-3" />
                                    {getThreadParticipantsLabel(selectedThread)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button className="p-2 hover:bg-slate-100 rounded text-slate-500"><MoreHorizontal className="w-5 h-5" /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {messages.map((message) => {
                                const isMe = message.senderId === activeUser?.uid;
                                return (
                                    <div key={message.id} className={`flex gap-4 ${isMe ? 'flex-row-reverse' : ''}`}>
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isMe ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'}`}>
                                            <span className="text-xs font-bold">{isMe ? 'P' : (selectedThread.threadType === 'provider_provider' ? 'TM' : 'Pt')}</span>
                                        </div>
                                        <div className={`max-w-[70%] space-y-1 ${isMe ? 'text-right' : ''}`}>
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <span>{isMe ? 'Provider' : (selectedThread.threadType === 'provider_provider' ? 'Team member' : 'Patient')}</span>
                                                <span>•</span>
                                                <span>{getMessageTime(message.createdAt)}</span>
                                            </div>
                                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe
                                                ? 'bg-brand text-white rounded-tr-none'
                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-tl-none'
                                            }`}>
                                                {message.body}
                                            </div>
                                            {message.attachment && (
                                                <a href={message.attachment.url} target="_blank" rel="noopener noreferrer" className="block mt-2 text-xs text-brand hover:underline">
                                                    {message.attachment.name}
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <form onSubmit={handleReply} className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex gap-4 items-end">
                            <button type="button" className="p-2 text-slate-400 hover:bg-slate-50 rounded-lg hover:text-slate-600 transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <div className="flex-1 relative">
                                <AITextarea
                                    value={replyText}
                                    onValueChange={setReplyText}
                                    placeholder="Type your secure response..."
                                    className="w-full min-h-[120px] pl-4 pr-12 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 resize-y shadow-inner"
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
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="px-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                            <div className="flex gap-6 mb-4 overflow-x-auto">
                                {['Open', 'Closed', 'Scheduled', 'Deleted', 'Other'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`pb-2 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === tab
                                            ? 'border-brand text-brand'
                                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="px-6 py-3 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 flex items-center gap-4">
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{filteredThreads.length} conversation{filteredThreads.length !== 1 && 's'}</span>
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search conversations"
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-800">
                            {filteredThreads.length > 0 ? (
                                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredThreads.map((thread) => (
                                        <div
                                            key={thread.id}
                                            onClick={() => setSelectedThreadId(thread.id)}
                                            className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors group"
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                    {(thread.providerUnreadCount ?? 0) > 0 && (
                                                        <div className="w-2 h-2 bg-brand rounded-full"></div>
                                                    )}
                                                    <span className={`text-sm ${(thread.providerUnreadCount ?? 0) > 0 ? 'font-bold text-slate-900 dark:text-slate-100' : 'font-medium text-slate-700 dark:text-slate-300'}`}>
                                                        {getThreadDisplayName(thread)}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-slate-400">
                                                    {getThreadDate(thread.lastMessageAt)}
                                                </span>
                                            </div>
                                            <div className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-1">{thread.subject}</div>
                                            <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{thread.lastMessage}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                    <div className="w-48 h-48 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6 relative">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-100/50 to-transparent rounded-full animate-pulse-slow"></div>
                                        <MessageSquare className="w-16 h-16 text-indigo-300 relative z-10" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-1">No conversations found</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs">There are no {activeFolder} messages in this view.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isComposeOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-700">
                        <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4" /> Secure Message</h3>
                            <button onClick={() => setIsComposeOpen(false)} className="hover:bg-white/20 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCompose} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleComposeTypeChange('patient')}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${composeRecipientType === 'patient' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                                >
                                    Patient
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleComposeTypeChange('provider')}
                                    className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${composeRecipientType === 'provider' ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'}`}
                                >
                                    Team member
                                </button>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">To</label>
                                <select
                                    required
                                    value={composeRecipient}
                                    onChange={(e) => handleComposeRecipientChange(e.target.value)}
                                    className="w-full bg-slate-800 border bg-transparent outline-none border-brand/40 text-sm text-white rounded-lg px-4 py-2.5"
                                >
                                    <option value="" className="text-slate-900">Select Recipient...</option>
                                    {composeRecipientType === 'patient'
                                        ? patients.map((patient) => (
                                            <option key={patient.id} value={patient.id} className="text-slate-900">
                                                {patient.name}
                                            </option>
                                        ))
                                        : teamRecipients.map((recipient) => (
                                            <option key={recipient.key} value={recipient.key} className="text-slate-900">
                                                {recipient.name} ({recipient.teamName})
                                            </option>
                                        ))
                                    }
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Subject</label>
                                <input value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} type="text" placeholder="e.g. Lab Results" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none font-medium" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Message</label>
                                <AITextarea required value={composeMessage} onValueChange={setComposeMessage} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-brand/20 outline-none min-h-[150px] resize-y" placeholder="Type your secure message..." />
                            </div>
                            {composeRecipientType === 'provider' && composeTeamName && (
                                <div className="rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-xs font-semibold text-indigo-700">
                                    Team-scoped conversation: {composeTeamName}
                                </div>
                            )}
                            <div className="flex justify-end pt-2">
                                <button type="submit" className="bg-brand hover:bg-brand-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 transition-all active:scale-95 flex items-center gap-2">
                                    <Send className="w-4 h-4" /> Send Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isConnectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden animate-scale-up border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                                <Inbox className="w-6 h-6" />
                                <h3 className="text-xl font-bold">Connect inbox</h3>
                            </div>
                            <button onClick={() => setIsConnectModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto">
                            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-lg">Connect your apps to seamlessly send, receive, and track all your communications in one centralized place.</p>

                            <h4 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white mb-4">
                                <div className="w-6 flex justify-center"><Inbox className="w-5 h-5" /></div>
                                Email
                            </h4>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                        </svg>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">Google</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 h-10">Add a Gmail account or Google group list</p>
                                    <button
                                        onClick={() => handleConnect('Google')}
                                        disabled={!!connectingProvider}
                                        className="w-full py-2 border border-slate-300 rounded-lg text-brand font-bold hover:bg-brand-50 hover:border-brand-200 transition-colors disabled:opacity-50"
                                    >
                                        {connectingProvider === 'Google' ? 'Connecting...' : 'Connect'}
                                    </button>
                                </div>

                                <div className="border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 rounded-xl p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3 mb-3">
                                        <svg className="w-6 h-6" viewBox="0 0 23 23">
                                            <path fill="#f25022" d="M1 1h10v10H1z" />
                                            <path fill="#00a4ef" d="M12 1h10v10H12z" />
                                            <path fill="#7fba00" d="M1 12h10v10H1z" />
                                            <path fill="#ffb900" d="M12 12h10v10H12z" />
                                        </svg>
                                        <span className="font-bold text-slate-900 dark:text-slate-100 text-lg">Microsoft</span>
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 h-10">Add a Outlook, Office365 or Exchange account</p>
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

                        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-700">
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

function SidebarItem({ icon: Icon, label, active, onClick }: any) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${active
                ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 font-bold'
                : 'text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50'
            }`}
        >
            <Icon className={`w-4 h-4 ${active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
            <span className="text-sm">{label}</span>
        </div>
    );
}

function CollapsibleSection({ icon: Icon, label, children, className, defaultOpen }: any) {
    const [open, setOpen] = useState(defaultOpen || false);
    return (
        <div className={className}>
            <div
                onClick={() => setOpen(!open)}
                className="flex items-center justify-between px-2 py-1 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-md transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{label}</span>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </div>
            {open && children}
        </div>
    );
}
