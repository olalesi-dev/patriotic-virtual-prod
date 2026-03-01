"use client";

import { format } from "date-fns";
import {
	addDoc,
	collection,
	doc,
	getDocs,
	increment,
	onSnapshot,
	orderBy,
	query,
	serverTimestamp,
	Timestamp,
	updateDoc,
	where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
	AlertCircle,
	ArrowLeft,
	CheckCheck,
	Download,
	FileText,
	Inbox,
	Link as LinkIcon,
	MessageSquare,
	MoreVertical,
	Paperclip,
	Plus,
	Search,
	Send,
	ShieldCheck,
	User,
	X,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { auth, db, storage } from "@/lib/firebase";

// --- Types ---
interface Thread {
	id: string;
	patientId: string;
	providerId: string;
	providerName: string;
	subject: string;
	category:
		| "General"
		| "Medication"
		| "Test Results"
		| "Appointment Request"
		| "Urgent";
	lastMessage: string;
	lastMessageAt: Timestamp;
	unreadCount: number;
	patientUnreadCount?: number;
	providerUnreadCount?: number;
	updatedAt: Timestamp;
}

interface Message {
	id: string;
	senderId: string;
	senderType: "patient" | "provider";
	body: string;
	createdAt: Timestamp;
	read: boolean;
	attachment?: {
		name: string;
		url: string;
		type: string;
	};
	optimistic?: boolean;
}

const CATEGORIES = [
	"General",
	"Medication",
	"Test Results",
	"Appointment Request",
	"Urgent",
];

export default function MessagesPage() {
	const [threads, setThreads] = useState<Thread[]>([]);
	const [activeThread, setActiveThread] = useState<Thread | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [loading, setLoading] = useState(true);
	const [sidebarOpen, setSidebarOpen] = useState(true);

	// UI State
	const [newMessage, setNewMessage] = useState("");
	const [isSending, setIsSending] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [isComposing, setIsComposing] = useState(false);

	// Compose Form
	const [composeData, setComposeData] = useState({
		recipientId: "",
		recipientName: "",
		subject: "",
		category: "General" as Thread["category"],
		body: "",
	});
	const [providers, setProviders] = useState<any[]>([]);

	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const unsubscribeAuth = auth.onAuthStateChanged((user) => {
			if (user) {
				// Threads Listener
				const threadsRef = collection(db, "threads");
				const q = query(
					threadsRef,
					where("patientId", "==", user.uid),
					orderBy("lastMessageAt", "desc"),
				);

				const unsub = onSnapshot(q, (snapshot) => {
					const data = snapshot.docs.map(
						(d) => ({ id: d.id, ...d.data() }) as Thread,
					);
					setThreads(data);
					setLoading(false);
				});

				fetchProviders();
				return () => unsub();
			}
		});
		return () => unsubscribeAuth();
	}, []);

	useEffect(() => {
		if (!activeThread || !auth.currentUser) return;

		// Messages Listener
		const msgsRef = collection(db, "threads", activeThread.id, "messages");
		const q = query(msgsRef, orderBy("createdAt", "asc"));

		const unsub = onSnapshot(q, (snapshot) => {
			const data = snapshot.docs.map(
				(d) => ({ id: d.id, ...d.data() }) as Message,
			);
			setMessages(data);

			// Mark as read
			snapshot.docs.forEach((d) => {
				const msg = d.data() as Message;
				if (msg.senderType === "provider" && !msg.read) {
					updateDoc(doc(db, "threads", activeThread.id, "messages", d.id), {
						read: true,
					});
				}
			});
			// Update patient unread counters
			updateDoc(doc(db, "threads", activeThread.id), {
				unreadCount: 0,
				patientUnreadCount: 0,
			});
		});

		return () => unsub();
	}, [activeThread]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const fetchProviders = async () => {
		try {
			const q = query(
				collection(db, "users"),
				where("role", "in", ["provider", "doctor", "admin"]),
			);
			const snip = await getDocs(q);
			setProviders(
				snip.docs.map((d) => {
					const data = d.data();
					return {
						id: d.id,
						name: data.name || data.displayName || "Unnamed Provider",
						specialty:
							data.specialty ||
							(data.role === "admin"
								? "Systems Administrator"
								: "Clinical Provider"),
					};
				}),
			);
		} catch (e) {
			console.error("Error fetching providers:", e);
		}
	};

	const handleSendMessage = async (e?: React.FormEvent, attachment?: any) => {
		e?.preventDefault();
		if (
			(!newMessage.trim() && !attachment) ||
			!activeThread ||
			!auth.currentUser
		)
			return;

		setIsSending(true);
		const text = newMessage.trim();
		setNewMessage("");

		const optimisticId = `optimistic-${Date.now()}`;
		setMessages((previous) => [
			...previous,
			{
				id: optimisticId,
				senderId: auth.currentUser!.uid,
				senderType: "patient",
				body: text,
				createdAt: Timestamp.now(),
				read: false,
				attachment: attachment || null,
				optimistic: true,
			},
		]);

		try {
			const msgsRef = collection(db, "threads", activeThread.id, "messages");
			await addDoc(msgsRef, {
				senderId: auth.currentUser.uid,
				senderType: "patient",
				body: text,
				createdAt: serverTimestamp(),
				read: false,
				attachment: attachment || null,
			});

			// Update Thread
			await updateDoc(doc(db, "threads", activeThread.id), {
				lastMessage: text || "View Attachment",
				lastMessageAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				providerUnreadCount: increment(1),
			});
		} catch (error) {
			toast.error("Failed to send message");
			setMessages((previous) =>
				previous.filter((message) => message.id !== optimisticId),
			);
			setNewMessage(text);
		} finally {
			setIsSending(false);
		}
	};

	const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file || !auth.currentUser || !activeThread) return;

		setIsUploading(true);
		try {
			const fileRef = ref(
				storage,
				`message_attachments/${Date.now()}_${file.name}`,
			);
			const uploadSnapshot = await uploadBytes(fileRef, file);
			const downloadUrl = await getDownloadURL(uploadSnapshot.ref);

			await handleSendMessage(undefined, {
				name: file.name,
				url: downloadUrl,
				type: file.type,
			});
			toast.success("File attached");
		} catch (error) {
			console.error(error);
			toast.error("File upload failed");
		} finally {
			setIsUploading(false);
		}
	};

	const handleCompose = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!auth.currentUser || !composeData.recipientId) return;

		setIsSending(true);
		try {
			const threadRef = await addDoc(collection(db, "threads"), {
				patientId: auth.currentUser.uid,
				patientName:
					auth.currentUser.displayName || auth.currentUser.email || "Patient",
				providerId: composeData.recipientId,
				providerName: composeData.recipientName,
				subject: composeData.subject,
				category: composeData.category,
				lastMessage: composeData.body,
				lastMessageAt: serverTimestamp(),
				updatedAt: serverTimestamp(),
				status: "open",
				unreadCount: 0,
				patientUnreadCount: 0,
				providerUnreadCount: 1,
			});

			await addDoc(collection(db, "threads", threadRef.id, "messages"), {
				senderId: auth.currentUser.uid,
				senderType: "patient",
				body: composeData.body,
				createdAt: serverTimestamp(),
				read: false,
			});

			setIsComposing(false);
			setComposeData({
				recipientId: "",
				recipientName: "",
				subject: "",
				category: "General",
				body: "",
			});
			toast.success("Conversation started");
		} catch (error) {
			toast.error("Failed to start conversation");
		} finally {
			setIsSending(false);
		}
	};

	if (loading)
		return (
			<div className="flex items-center justify-center min-h-[400px]">
				<div className="w-8 h-8 border-4 border-sky-100 border-t-[#0EA5E9] rounded-full animate-spin"></div>
			</div>
		);

	return (
		<div className="h-[calc(100vh-160px)] -mt-4 bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-sky-900/5 flex overflow-hidden">
			{/* THREAD LIST */}
			<div
				className={`
                ${sidebarOpen ? "w-full md:w-80 lg:w-96" : "w-0"}
                ${activeThread && sidebarOpen ? "hidden md:flex" : "flex"}
                border-r border-slate-50 flex flex-col transition-all duration-300
            `}
			>
				<div className="p-6 border-b border-slate-50 flex items-center justify-between">
					<h2 className="text-xl font-black text-slate-800 tracking-tight">
						Inbox
					</h2>
					<button
						onClick={() => setIsComposing(true)}
						className="w-10 h-10 bg-[#0EA5E9] text-white rounded-xl shadow-lg shadow-sky-100 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
					>
						<Plus className="w-5 h-5" />
					</button>
				</div>

				<div className="p-4 border-b border-slate-50 bg-slate-50/50">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
						<input
							type="text"
							placeholder="Search messages..."
							className="w-full bg-white border-none rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-sky-100 transition-all font-sans"
						/>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-2 space-y-1">
					{threads.length > 0 ? (
						threads.map((t) => (
							<button
								key={t.id}
								onClick={() => setActiveThread(t)}
								className={`w-full p-4 rounded-2xl text-left transition-all ${activeThread?.id === t.id ? "bg-sky-50" : "hover:bg-slate-50"}`}
							>
								<div className="flex justify-between items-start mb-1">
									<span
										className={`text-[10px] font-black uppercase tracking-widest ${t.category === "Urgent" ? "text-rose-500" : "text-slate-400"}`}
									>
										{t.category}
									</span>
									<span className="text-[10px] font-bold text-slate-300">
										{format(t.lastMessageAt?.toDate() || new Date(), "h:mm a")}
									</span>
								</div>
								<div className="flex justify-between items-center gap-2">
									<h4
										className={`text-sm tracking-tight truncate flex-1 ${t.unreadCount > 0 ? "font-black text-slate-900" : "font-bold text-slate-600"}`}
									>
										{t.subject}
									</h4>
									{t.unreadCount > 0 && (
										<span className="w-2 h-2 bg-[#0EA5E9] rounded-full"></span>
									)}
								</div>
								<p className="text-xs text-slate-400 truncate mt-0.5">
									{t.providerName}
								</p>
								<p className="text-xs text-slate-400 truncate mt-1 italic">
									"{t.lastMessage}"
								</p>
							</button>
						))
					) : (
						<div className="flex flex-col items-center justify-center h-40 text-slate-300">
							<Inbox className="w-10 h-10 mb-2 opacity-20" />
							<p className="text-xs font-bold uppercase tracking-widest">
								No conversations yet
							</p>
						</div>
					)}
				</div>
			</div>

			{/* CHAT VIEW */}
			<div
				className={`
                flex-1 flex flex-col min-w-0
                ${!activeThread && !isComposing ? "hidden md:flex" : "flex"}
            `}
			>
				{activeThread ? (
					<>
						{/* Chat Header */}
						<div className="h-20 border-b border-slate-50 flex items-center justify-between px-6 shrink-0">
							<div className="flex items-center gap-4">
								<button
									onClick={() => setActiveThread(null)}
									className="md:hidden p-2 -ml-2 text-slate-400"
								>
									<ArrowLeft className="w-5 h-5" />
								</button>
								<div className="w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-[#0EA5E9]">
									<User className="w-5 h-5" />
								</div>
								<div className="min-w-0">
									<h3 className="font-black text-slate-800 tracking-tight text-sm truncate">
										{activeThread.providerName}
									</h3>
									<p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">
										{activeThread.subject}
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
								<button className="p-2 text-slate-400 hover:text-slate-600">
									<MoreVertical className="w-5 h-5" />
								</button>
							</div>
						</div>

						{/* Messages Area */}
						<div
							ref={scrollRef}
							className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/30"
						>
							{messages.map((msg, i) => {
								const isMe = msg.senderType === "patient";
								return (
									<div
										key={msg.id}
										className={`flex ${isMe ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
									>
										<div
											className={`max-w-[80%] md:max-w-[70%] lg:max-w-[60%] space-y-1`}
										>
											<div
												className={`
                                                p-4 rounded-[28px] text-sm font-bold leading-relaxed shadow-sm
                                                ${
																									isMe
																										? "bg-[#0EA5E9] text-white rounded-tr-none"
																										: "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
																								}
                                            `}
											>
												{msg.body}
												{msg.attachment && (
													<div
														className={`mt-3 p-3 rounded-2xl flex items-center gap-3 border ${isMe ? "bg-white/10 border-white/20" : "bg-slate-50 border-slate-100"}`}
													>
														<div className="w-8 h-8 rounded-lg bg-[#0EA5E9]/10 flex items-center justify-center text-[#0EA5E9]">
															<FileText className="w-4 h-4" />
														</div>
														<div className="flex-1 min-w-0">
															<p
																className={`text-[10px] font-black truncate uppercase tracking-widest ${isMe ? "text-white/80" : "text-slate-400"}`}
															>
																{msg.attachment.name}
															</p>
														</div>
														<a
															href={msg.attachment.url}
															target="_blank"
															rel="noopener"
															className={`p-1.5 rounded-lg hover:bg-black/5 ${isMe ? "text-white" : "text-slate-400"}`}
														>
															<Download className="w-4 h-4" />
														</a>
													</div>
												)}
											</div>
											<div
												className={`flex items-center gap-2 px-2 ${isMe ? "justify-end" : "justify-start"}`}
											>
												<span className="text-[9px] font-bold text-slate-300 uppercase">
													{format(
														msg.createdAt?.toDate() || new Date(),
														"h:mm a",
													)}
												</span>
												{isMe && msg.read && (
													<CheckCheck className="w-3 h-3 text-emerald-500" />
												)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{/* Input Area */}
						<div className="p-6 border-t border-slate-50 shrink-0 bg-white">
							<form
								onSubmit={handleSendMessage}
								className="flex items-end gap-3 max-w-4xl mx-auto"
							>
								<div className="relative">
									<input
										type="file"
										id="file-upload"
										className="hidden"
										onChange={handleFileUpload}
										accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
									/>
									<label
										htmlFor="file-upload"
										className={`w-12 h-12 rounded-2xl flex items-center justify-center cursor-pointer border transition-all ${isUploading ? "bg-slate-50 text-slate-300" : "bg-white border-slate-100 text-slate-400 hover:border-[#0EA5E9] hover:text-[#0EA5E9]"}`}
									>
										<Paperclip
											className={`w-5 h-5 ${isUploading ? "animate-spin" : ""}`}
										/>
									</label>
								</div>
								<div className="flex-1 relative">
									<input
										type="text"
										placeholder="Type a clinical message..."
										className="w-full bg-slate-50 border-none rounded-2xl py-3.5 px-6 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100 transition-all font-sans"
										value={newMessage}
										onChange={(e) => setNewMessage(e.target.value)}
										disabled={isSending}
									/>
								</div>
								<button
									className="w-12 h-12 bg-[#0EA5E9] text-white rounded-2xl shadow-lg shadow-sky-100 flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
									disabled={!newMessage.trim() || isSending}
								>
									<Send className="w-5 h-5" />
								</button>
							</form>
						</div>
					</>
				) : isComposing ? (
					/* COMPOSE VIEW */
					<div className="flex-1 flex flex-col p-10 max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
						<div className="flex justify-between items-center">
							<h2 className="text-3xl font-black text-slate-800 tracking-tight">
								New Conversation
							</h2>
							<button
								onClick={() => setIsComposing(false)}
								className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600"
							>
								<X className="w-6 h-6" />
							</button>
						</div>

						<form onSubmit={handleCompose} className="space-y-6">
							<div className="space-y-2">
								<label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
									Select Recipient
								</label>
								<select
									required
									className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100"
									onChange={(e) => {
										const p = providers.find((p) => p.id === e.target.value);
										setComposeData({
											...composeData,
											recipientId: p.id,
											recipientName: p.name,
										});
									}}
								>
									<option value="">Select a doctor...</option>
									{providers.map((p) => (
										<option key={p.id} value={p.id}>
											{p.name} ({p.specialty})
										</option>
									))}
								</select>
							</div>

							<div className="grid grid-cols-2 gap-6">
								<div className="space-y-2">
									<label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
										Subject Line
									</label>
									<input
										required
										type="text"
										className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100"
										placeholder="e.g. Question about my labs"
										value={composeData.subject}
										onChange={(e) =>
											setComposeData({
												...composeData,
												subject: e.target.value,
											})
										}
									/>
								</div>
								<div className="space-y-2">
									<label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
										Category
									</label>
									<select
										className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100"
										value={composeData.category}
										onChange={(e) =>
											setComposeData({
												...composeData,
												category: e.target.value as any,
											})
										}
									>
										{CATEGORIES.map((c) => (
											<option key={c} value={c}>
												{c}
											</option>
										))}
									</select>
								</div>
							</div>

							<div className="space-y-2">
								<label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
									Initial Message
								</label>
								<textarea
									required
									className="w-full bg-slate-50 border-none rounded-3xl p-6 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-sky-100 min-h-[150px] placeholder:text-slate-300"
									placeholder="Type your message here..."
									value={composeData.body}
									onChange={(e) =>
										setComposeData({ ...composeData, body: e.target.value })
									}
								/>
							</div>

							<div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-3">
								<ShieldCheck className="w-5 h-5" /> This message is encrypted
								and HIPAA-secure
							</div>

							<button
								className="w-full bg-[#0EA5E9] text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-sky-100 hover:bg-sky-600 transition-all flex items-center justify-center gap-2"
								disabled={isSending}
							>
								Send Message <Send className="w-4 h-4" />
							</button>
						</form>
					</div>
				) : (
					/* EMPTY STATE */
					<div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
						<div className="w-24 h-24 bg-sky-50 rounded-[32px] flex items-center justify-center text-[#0EA5E9] animate-pulse">
							<MessageSquare className="w-10 h-10" />
						</div>
						<div className="max-w-xs">
							<h3 className="text-xl font-black text-slate-800 tracking-tight">
								Select a Conversation
							</h3>
							<p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
								Securely message your care team. Your messages are private and
								encrypted.
							</p>
						</div>
						<button
							onClick={() => setIsComposing(true)}
							className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
						>
							Start New Conversation
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
