"use client";

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { Share2, Plus, MessageSquare, Heart, Image as ImageIcon, Send, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function SocialMediaClient() {
    const [draftText, setDraftText] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [posts, setPosts] = useState<any[]>([]);
    
    // Connected accounts mockup
    const connectedAccounts = [
        { platform: 'Twitter / X', handle: '@PatriotCare', status: 'connected', icon: Share2, color: 'text-neutral-900 dark:text-white', bg: 'bg-neutral-100 dark:bg-neutral-800' },
        { platform: 'Facebook', handle: 'Patriotic Telehealth', status: 'connected', icon: User, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/30' },
        { platform: 'Instagram', handle: '@patriotcare.health', status: 'disconnected', icon: ImageIcon, color: 'text-pink-600', bg: 'bg-pink-50 dark:bg-pink-900/30' },
    ];

    useEffect(() => {
        const q = query(collection(db, 'social-posts'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPosts(data);
        });
        return () => unsubscribe();
    }, []);

    const handlePublish = async () => {
        if (!draftText.trim()) return;
        setIsSaving(true);
        try {
            await addDoc(collection(db, 'social-posts'), {
                text: draftText,
                status: 'published',
                createdAt: serverTimestamp(),
                author: 'Admin',
                platforms: ['Twitter / X', 'Facebook']
            });
            setDraftText('');
            toast.success('Post published to connected platforms!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to publish post');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24 text-slate-900 dark:text-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-8 rounded-[36px] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-sky-50 dark:bg-sky-900/30 rounded-2xl flex items-center justify-center border border-sky-100 dark:border-sky-800/50">
                            <Share2 className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                        </div>
                        <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">Social Media Hub</h1>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl leading-relaxed mt-2 pl-15">
                        Manage your connected social accounts, schedule broadcasts, and interact with the community feed.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composer & Accounts */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Post Composer */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <h2 className="text-lg font-black mb-4 flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-500" /> Create Post
                        </h2>
                        
                        <textarea 
                            value={draftText}
                            onChange={(e) => setDraftText(e.target.value)}
                            placeholder="What's happening in your practice?"
                            className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 min-h-[120px] resize-none outline-none focus:ring-2 focus:ring-indigo-500/50 border-none placeholder:text-slate-400 font-medium text-sm transition-all"
                        />
                        
                        <div className="flex items-center justify-between mt-4">
                            <div className="flex gap-2">
                                <button className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-400 flex items-center justify-center hover:text-indigo-500 hover:bg-slate-100 transition-colors">
                                    <ImageIcon className="w-5 h-5" />
                                </button>
                                <button className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900/50 text-slate-400 flex items-center justify-center hover:text-indigo-500 hover:bg-slate-100 transition-colors">
                                    <Clock className="w-5 h-5" />
                                </button>
                            </div>
                            <button 
                                onClick={handlePublish}
                                disabled={isSaving || !draftText.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 font-bold uppercase tracking-widest text-[11px] text-white px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all shadow-md active:scale-95"
                            >
                                <Send className="w-4 h-4" /> Publish Now
                            </button>
                        </div>
                    </div>

                    {/* Published Feed */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-black ml-2 pt-2">Recent Broadcasts</h3>
                        {posts.length === 0 ? (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[32px] text-center text-slate-500 border border-slate-100 dark:border-slate-700 font-medium text-sm">
                                No recent broadcasts found. Start by composing a post above.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {posts.map((post) => (
                                    <div key={post.id} className="bg-white dark:bg-slate-800 p-6 rounded-[24px] border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center font-bold">PT</div>
                                                <div>
                                                    <p className="font-bold text-sm tracking-tight">{post.author}</p>
                                                    <p className="text-xs text-slate-400 tracking-wider">
                                                        {post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : 'Just now'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                {post.platforms?.map((p: string, i: number) => (
                                                    <span key={i} className="text-[10px] bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded uppercase tracking-widest font-black text-slate-500">
                                                        {p.split(' ')[0]}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{post.text}</p>
                                        <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-700/50 flex gap-4 text-slate-400">
                                            <button className="flex items-center gap-1.5 text-xs font-bold hover:text-rose-500 transition-colors">
                                                <Heart className="w-4 h-4" /> 0 Likes
                                            </button>
                                            <button className="flex items-center gap-1.5 text-xs font-bold hover:text-sky-500 transition-colors">
                                                <Share2 className="w-4 h-4" /> 0 Retweets
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-8">
                    {/* Connection Status */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden">
                        <h2 className="text-lg font-black mb-6">Connected Channels</h2>
                        <div className="space-y-4">
                            {connectedAccounts.map((acc, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${acc.bg} ${acc.color}`}>
                                            <acc.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-100">{acc.platform}</p>
                                            <p className="text-xs text-slate-400">{acc.handle}</p>
                                        </div>
                                    </div>
                                    {acc.status === 'connected' ? (
                                        <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 p-1.5 rounded-lg" title="Connected">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    ) : (
                                        <button className="bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-indigo-500 p-1.5 rounded-lg transition-colors" title="Connect Account">
                                            <Plus className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Alert */}
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex gap-4 text-blue-800 dark:text-blue-300 text-sm font-medium leading-relaxed">
                        <AlertCircle className="w-6 h-6 shrink-0 text-blue-500" />
                        <p>Your social posts use API automations to post simultaneously to X, Facebook, and the internal Patriotic Community platform.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
