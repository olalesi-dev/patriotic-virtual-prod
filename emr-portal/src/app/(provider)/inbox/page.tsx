"use client";

import { format } from "date-fns";
import {
	addDoc,
	collection,
	doc,
	increment,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	where,
} from "firebase/firestore";
import {
	AlertCircle,
	ArrowLeft,
	Inbox,
	MessageSquare,
	RefreshCw,
	Search,
	Send,
	ShieldCheck,
	User,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { auth, db } from "@/lib/firebase";

type ThreadCategory =
	| "General"
	| "Medication"
	| "Test Results"
	| "Appointment Request"
	| "Urgent";
type ThreadStatus = "open" | "closed";
type SenderType = "patient" | "provider";

interface InboxThread {
	id: string;
	patientId: string;
	patientName: string;
	providerId: string;
	providerName: string;
	subject: string;
	category: ThreadCategory;
	status: ThreadStatus;
	lastMessage: string;
	lastMessageAt: Timestamp | null;
	providerUnreadCount: number;
}

interface ThreadMessage {
	id: string;
	senderId: string;
	senderType: SenderType;
	body: string;
	createdAt: Timestamp | null;
	read: boolean;
	attachment?: {
		name: string;
		type: string;
		url: string;
	} | null;
	optimistic?: boolean;
}

function toTimestamp(value: unknown): Timestamp | null {
	if (value instanceof Timestamp) return value;
	if (value instanceof Date) return Timestamp.fromDate(value);
	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : Timestamp.fromDate(parsed);
	}
	return null;
}

function toText(value: unknown): string {
	if (typeof value !== "string") return "";
	return value.trim();
}

function normalizeThread(
	data: Record<string, unknown>,
	id: string,
): InboxThread {
	const statusValue = toText(data.status).toLowerCase();
	const categoryValue = toText(data.category) as ThreadCategory;
	const unreadLegacy =
		typeof data.unreadCount === "number" ? data.unreadCount : 0;
	const providerUnreadRaw =
		typeof data.providerUnreadCount === "number"
			? data.providerUnreadCount
			: unreadLegacy;
	const providerUnread =
		providerUnreadRaw > 0 ? providerUnreadRaw : data.unread === true ? 1 : 0;

	return {
		id,
		patientId: toText(data.patientId) || toText(data.patientUid),
		patientName: toText(data.patientName) || toText(data.patient) || "Patient",
		providerId: toText(data.providerId),
		providerName: toText(data.providerName),
		subject: toText(data.subject) || "Secure message",
		category: [
			"General",
			"Medication",
			"Test Results",
			"Appointment Request",
			"Urgent",
		].includes(categoryValue)
			? categoryValue
			: "General",
		status: statusValue === "closed" ? "closed" : "open",
		lastMessage: toText(data.lastMessage) || "No messages yet",
		lastMessageAt:
			toTimestamp(data.lastMessageAt) ?? toTimestamp(data.updatedAt) ?? null,
		providerUnreadCount: providerUnread,
	};
}

function normalizeMessage(
	data: Record<string, unknown>,
	id: string,
): ThreadMessage {
	return {
		id,
		senderId: toText(data.senderId),
		senderType: toText(data.senderType) === "provider" ? "provider" : "patient",
		body: toText(data.body) || "",
		createdAt: toTimestamp(data.createdAt),
		read: data.read === true,
		attachment:
			typeof data.attachment === "object" && data.attachment !== null
				? (data.attachment as ThreadMessage["attachment"])
				: null,
	};
}

function getThreadTimeLabel(value: Timestamp | null): string {
	if (!value) return "";
	const date = value.toDate();
	const now = new Date();
	const sameDay = date.toDateString() === now.toDateString();
	return sameDay ? format(date, "h:mm a") : format(date, "MMM d");
}

export default function InboxPage() {
	const [providerId, setProviderId] = useState<string | null>(null);
	const [providerName, setProviderName] = useState<string>("Provider");
	const [threads, setThreads] = useState<InboxThread[]>([]);
	const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
	const [messages, setMessages] = useState<ThreadMessage[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [replyText, setReplyText] = useState("");
	const [loadingThreads, setLoadingThreads] = useState(true);
	const [loadingMessages, setLoadingMessages] = useState(false);
	const [isSending, setIsSending] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isMobileListVisible, setIsMobileListVisible] = useState(true);
	const scrollRef = useRef<HTMLDivElement>(null);

	const selectedThread = useMemo(
		() => threads.find((thread) => thread.id === selectedThreadId) ?? null,
		[threads, selectedThreadId],
	);

	const filteredThreads = useMemo(() => {
		const normalizedSearch = searchTerm.trim().toLowerCase();
		const baseThreads = [...threads].sort((first, second) => {
			const firstMillis = first.lastMessageAt?.toMillis() ?? 0;
			const secondMillis = second.lastMessageAt?.toMillis() ?? 0;
			return secondMillis - firstMillis;
		});

		if (!normalizedSearch) return baseThreads;
		return baseThreads.filter(
			(thread) =>
				thread.patientName.toLowerCase().includes(normalizedSearch) ||
				thread.subject.toLowerCase().includes(normalizedSearch) ||
				thread.lastMessage.toLowerCase().includes(normalizedSearch),
		);
	}, [searchTerm, threads]);

	useEffect(() => {
		let unsubscribeThreads: (() => void) | null = null;
		const unsubscribeAuth = auth.onAuthStateChanged((user) => {
			if (unsubscribeThreads) {
				unsubscribeThreads();
				unsubscribeThreads = null;
			}

			setProviderId(user?.uid ?? null);
			setProviderName(user?.displayName ?? "Provider");
			setMessages([]);
			setSelectedThreadId(null);
			setError(null);

			if (!user) {
				setThreads([]);
				setLoadingThreads(false);
				setError("Please sign in to access provider inbox.");
				return;
			}

			setLoadingThreads(true);
			const threadsQuery = query(
				collection(db, "threads"),
				where("providerId", "==", user.uid),
			);

			unsubscribeThreads = onSnapshot(
				threadsQuery,
				(snapshot) => {
					const nextThreads = snapshot.docs.map((docSnap) =>
						normalizeThread(
							docSnap.data() as Record<string, unknown>,
							docSnap.id,
						),
					);

					setThreads(nextThreads);
					setSelectedThreadId((previous) => {
						if (
							previous &&
							nextThreads.some((thread) => thread.id === previous)
						)
							return previous;
						return nextThreads[0]?.id ?? null;
					});
					setLoadingThreads(false);
				},
				(listenerError) => {
					console.error("Provider thread listener error:", listenerError);
					setError("Unable to load inbox threads.");
					setLoadingThreads(false);
				},
			);
		});

		return () => {
			unsubscribeAuth();
			if (unsubscribeThreads) {
				unsubscribeThreads();
			}
		};
	}, []);

	useEffect(() => {
		if (!providerId || !selectedThreadId) {
			setMessages([]);
			return;
		}

		setLoadingMessages(true);
		const messagesQuery = query(
			collection(db, "threads", selectedThreadId, "messages"),
			orderBy("createdAt", "asc"),
		);

		const unsubscribeMessages = onSnapshot(
			messagesQuery,
			async (snapshot) => {
				const nextMessages = snapshot.docs.map((docSnap) =>
					normalizeMessage(
						docSnap.data() as Record<string, unknown>,
						docSnap.id,
					),
				);
				setMessages(nextMessages);
				setLoadingMessages(false);

				const unreadPatientMessages = snapshot.docs.filter((docSnap) => {
					const data = docSnap.data() as Record<string, unknown>;
					return toText(data.senderType) === "patient" && data.read !== true;
				});

					if (unreadPatientMessages.length > 0) {
						try {
							await Promise.all(
								unreadPatientMessages.map((docSnap) =>
									updateDoc(
										doc(db, "threads", selectedThreadId, "messages", docSnap.id),
										{ read: true },
									),
								),
							);

							await updateDoc(doc(db, "threads", selectedThreadId), {
								providerUnreadCount: 0,
								updatedAt: serverTimestamp(),
							});
						} catch (markReadError) {
							console.error("Provider mark-read error:", markReadError);
						}
					}
			},
			(listenerError) => {
				console.error("Provider message listener error:", listenerError);
				setError("Unable to load thread messages.");
				setLoadingMessages(false);
			},
		);

		return () => unsubscribeMessages();
	}, [providerId, selectedThreadId]);

	useEffect(() => {
		if (!scrollRef.current) return;
		scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
	}, [messages]);

	const handleThreadSelect = (threadId: string) => {
		setSelectedThreadId(threadId);
		setIsMobileListVisible(false);
	};

	const handleSendReply = async (event: React.FormEvent) => {
		event.preventDefault();
		if (!providerId || !selectedThread || !replyText.trim() || isSending)
			return;

		const messageText = replyText.trim();
		const optimisticId = `optimistic-${Date.now()}`;
		setReplyText("");
		setIsSending(true);
		setError(null);

		const optimisticMessage: ThreadMessage = {
			id: optimisticId,
			senderId: providerId,
			senderType: "provider",
			body: messageText,
			createdAt: Timestamp.now(),
			read: true,
			optimistic: true,
		};

		setMessages((previous) => [...previous, optimisticMessage]);

		try {
			await addDoc(collection(db, "threads", selectedThread.id, "messages"), {
				senderId: providerId,
				senderType: "provider",
				body: messageText,
				createdAt: serverTimestamp(),
				read: false,
			});

			await updateDoc(doc(db, "threads", selectedThread.id), {
				providerId,
				providerName,
				lastMessage: messageText,
				lastMessageAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				unreadCount: increment(1),
				patientUnreadCount: increment(1),
				providerUnreadCount: 0,
			});
		} catch (sendError) {
			console.error("Provider send message error:", sendError);
			setMessages((previous) =>
				previous.filter((message) => message.id !== optimisticId),
			);
			setReplyText(messageText);
			setError("Unable to send message.");
			toast.error("Message send failed");
		} finally {
			setIsSending(false);
		}
	};

	const handleRefreshSelection = () => {
		if (!selectedThreadId) return;
		setSelectedThreadId((previous) => previous);
	};

	const totalUnread = useMemo(
		() =>
			threads.reduce(
				(accumulator, thread) => accumulator + thread.providerUnreadCount,
				0,
			),
		[threads],
	);

	return (
		<div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
			<aside
				className={`
                w-full md:w-96 border-r border-slate-100 flex flex-col bg-white
                ${isMobileListVisible ? "flex" : "hidden md:flex"}
            `}
			>
				<div className="p-5 border-b border-slate-100">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
							<Inbox className="w-5 h-5 text-brand" />
							Provider Inbox
						</h2>
						<span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
							{totalUnread} unread
						</span>
					</div>
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
						<input
							type="text"
							value={searchTerm}
							onChange={(event) => setSearchTerm(event.target.value)}
							placeholder="Search patient or subject..."
							className="w-full bg-slate-50 border border-slate-100 rounded-xl py-2.5 pl-9 pr-3 text-sm text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-brand/20"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-2">
					{loadingThreads ? (
						<div className="h-full flex items-center justify-center">
							<div className="w-8 h-8 border-4 border-slate-100 border-t-brand rounded-full animate-spin"></div>
						</div>
					) : filteredThreads.length === 0 ? (
						<div className="h-full flex flex-col items-center justify-center text-center px-6">
							<MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
							<p className="text-sm font-bold text-slate-500">
								No conversations yet.
							</p>
							<p className="text-xs text-slate-400 mt-1">
								Patient messages will appear here in real time.
							</p>
						</div>
					) : (
						filteredThreads.map((thread) => (
							<button
								key={thread.id}
								onClick={() => handleThreadSelect(thread.id)}
								className={`w-full text-left px-4 py-3 rounded-xl transition-all mb-1 border ${
									selectedThreadId === thread.id
										? "bg-brand/5 border-brand/20"
										: "bg-white border-transparent hover:bg-slate-50"
								}`}
							>
								<div className="flex items-center justify-between mb-1">
									<span className="text-xs font-black uppercase tracking-wider text-slate-400">
										{thread.category}
									</span>
									<span className="text-[10px] font-bold text-slate-400">
										{getThreadTimeLabel(thread.lastMessageAt)}
									</span>
								</div>
								<div className="flex items-center gap-2 mb-1">
									<span className="font-bold text-sm text-slate-800 truncate">
										{thread.patientName}
									</span>
									{thread.providerUnreadCount > 0 && (
										<span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-brand text-white text-[10px] font-black flex items-center justify-center">
											{thread.providerUnreadCount > 9
												? "9+"
												: thread.providerUnreadCount}
										</span>
									)}
								</div>
								<p className="text-xs text-slate-500 truncate font-medium">
									{thread.subject}
								</p>
								<p className="text-xs text-slate-400 truncate mt-0.5">
									"{thread.lastMessage}"
								</p>
							</button>
						))
					)}
				</div>
			</aside>

			<section
				className={`
                flex-1 flex flex-col min-w-0
                ${isMobileListVisible ? "hidden md:flex" : "flex"}
            `}
			>
				{selectedThread ? (
					<>
						<div className="h-20 border-b border-slate-100 px-6 flex items-center justify-between bg-white">
							<div className="flex items-center gap-3 min-w-0">
								<button
									onClick={() => setIsMobileListVisible(true)}
									className="md:hidden p-2 -ml-2 rounded-lg hover:bg-slate-100 text-slate-500"
								>
									<ArrowLeft className="w-5 h-5" />
								</button>
								<div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
									<User className="w-5 h-5" />
								</div>
								<div className="min-w-0">
									<h3 className="font-black text-slate-800 text-base truncate">
										{selectedThread.patientName}
									</h3>
									<p className="text-xs text-slate-400 font-bold uppercase tracking-widest truncate">
										{selectedThread.subject}
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
									<ShieldCheck className="w-3.5 h-3.5" />
									<span className="text-[10px] font-black uppercase tracking-widest">
										HIPAA Secure
									</span>
								</div>
								<button
									onClick={handleRefreshSelection}
									className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
									title="Refresh"
								>
									<RefreshCw className="w-4 h-4" />
								</button>
							</div>
						</div>

						{error && (
							<div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
								<AlertCircle className="w-4 h-4 flex-shrink-0" />
								<span>{error}</span>
							</div>
						)}

						<div
							ref={scrollRef}
							className="flex-1 overflow-y-auto p-6 bg-slate-50/40 space-y-4"
						>
							{loadingMessages ? (
								<div className="h-full flex items-center justify-center">
									<div className="w-8 h-8 border-4 border-slate-100 border-t-brand rounded-full animate-spin"></div>
								</div>
							) : messages.length === 0 ? (
								<div className="h-full flex flex-col items-center justify-center text-center">
									<MessageSquare className="w-8 h-8 text-slate-200 mb-2" />
									<p className="text-sm font-bold text-slate-500">
										No messages yet.
									</p>
									<p className="text-xs text-slate-400">
										Send the first response to start the conversation.
									</p>
								</div>
							) : (
								messages.map((message) => {
									const isProvider = message.senderType === "provider";
									return (
										<div
											key={message.id}
											className={`flex ${isProvider ? "justify-end" : "justify-start"}`}
										>
											<div className="max-w-[80%] md:max-w-[65%] space-y-1">
												<div
													className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
														isProvider
															? "bg-brand text-white rounded-tr-none"
															: "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
													}`}
												>
													{message.body}
													{message.attachment?.url && (
														<a
															href={message.attachment.url}
															target="_blank"
															rel="noreferrer"
															className={`mt-2 block text-xs underline ${isProvider ? "text-white/90" : "text-brand"}`}
														>
															{message.attachment.name || "View attachment"}
														</a>
													)}
												</div>
												<div
													className={`text-[10px] font-bold text-slate-400 uppercase px-1 ${isProvider ? "text-right" : "text-left"}`}
												>
													{message.createdAt
														? format(message.createdAt.toDate(), "h:mm a")
														: "Sending..."}
												</div>
											</div>
										</div>
									);
								})
							)}
						</div>

						<form
							onSubmit={handleSendReply}
							className="p-4 bg-white border-t border-slate-100 flex items-end gap-3"
						>
							<div className="flex-1">
								<textarea
									value={replyText}
									onChange={(event) => setReplyText(event.target.value)}
									placeholder="Type your secure response..."
									className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none min-h-[50px] max-h-40"
								/>
							</div>
							<button
								type="submit"
								disabled={!replyText.trim() || isSending}
								className="h-12 px-4 rounded-xl bg-brand text-white font-bold text-sm flex items-center gap-2 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
							>
								<Send className="w-4 h-4" />
								Send
							</button>
						</form>
					</>
				) : (
					<div className="h-full flex flex-col items-center justify-center text-center p-8">
						<MessageSquare className="w-10 h-10 text-slate-200 mb-3" />
						<h3 className="text-lg font-black text-slate-700">
							Select a conversation
						</h3>
						<p className="text-sm text-slate-400 mt-1">
							New patient messages will sync here instantly.
						</p>
					</div>
				)}
			</section>
		</div>
	);
}
