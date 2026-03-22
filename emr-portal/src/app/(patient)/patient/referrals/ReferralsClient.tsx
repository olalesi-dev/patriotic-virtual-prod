"use client";

import React, { useState, useEffect } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Copy, Gift, Users, CheckCircle2, TrendingUp, Sparkles, AlertCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferralsClient() {
    const profile = useUserProfile();
    const [referralCode, setReferralCode] = useState<string>('');
    const [stats, setStats] = useState({ total: 0, pending: 0, converted: 0 });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (!profile.authenticated || profile.loading || !auth.currentUser) return;

        const loadOrCreateReferralCode = async () => {
            if (profile.referralCode) {
                setReferralCode(profile.referralCode);
            } else {
                setGenerating(true);
                try {
                    // Generate a 6 character uppercase alphanumeric code
                    const newCode = Array.from(Array(6), () => Math.floor(Math.random() * 36).toString(36)).join('').toUpperCase();
                    await updateDoc(doc(db, 'users', auth.currentUser!.uid), {
                        referralCode: newCode
                    });
                    setReferralCode(newCode);
                    toast.success('Your unique referral code has been generated!');
                } catch (error) {
                    console.error('Error generating referral code:', error);
                    toast.error('Failed to generate referral code.');
                } finally {
                    setGenerating(false);
                }
            }
        };

        loadOrCreateReferralCode();

        // Listen for referral stats (querying a 'referrals' collection where referrerUid === currentUser.uid)
        // If the collection doesn't exist yet, it'll just be empty
        const q = query(collection(db, 'referrals'), where('referrerUid', '==', auth.currentUser.uid));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(d => d.data());
            const total = list.length;
            const converted = list.filter(r => r.status === 'converted' || r.status === 'subscribed').length;
            const pending = list.filter(r => r.status === 'pending').length;
            setStats({ total, pending, converted });
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        return () => unsub();
    }, [profile]);

    const referralLink = referralCode ? `https://patriotictelehealth.com?ref=${referralCode}` : '';

    const copyToClipboard = () => {
        if (!referralLink) return;
        navigator.clipboard.writeText(referralLink);
        toast.success('Referral link copied to clipboard!');
    };

    if (loading || generating || profile.loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 opacity-50 space-y-4">
                <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-indigo-500 rounded-full animate-spin"></div>
                <p className="font-bold text-slate-500">Loading referral center...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
                    <Gift className="w-8 h-8 text-indigo-500" /> Refer & Earn
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Invite your friends to Patriotic Telehealth and earn rewards for every successful signup.</p>
            </div>

            {/* HERO CARD */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                
                <div className="relative z-10 max-w-lg space-y-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> Give $50, Get $50
                    </div>
                    <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">Share the gift of health.</h2>
                    <p className="text-indigo-100 font-medium text-lg leading-relaxed">
                        When your friend signs up for a Patriot Care membership using your link, they get $50 off their first month, and you earn a $50 store credit!
                    </p>
                </div>

                <div className="relative z-10 w-full md:w-auto bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-xl space-y-4 min-w-[320px]">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest text-center">Your Unique Link</h4>
                    <div className="flex items-center bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <input 
                            type="text" 
                            readOnly 
                            value={referralLink} 
                            className="bg-transparent border-none outline-none w-full text-sm font-bold text-slate-700 dark:text-slate-300 px-2"
                        />
                        <button 
                            onClick={copyToClipboard}
                            className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center hover:bg-indigo-200 dark:hover:bg-indigo-800/50 transition-colors shrink-0"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400">
                        <Users className="w-4 h-4" /> Your Code: <span className="text-indigo-600 dark:text-indigo-400 font-black text-lg ml-1">{referralCode}</span>
                    </div>
                </div>
            </div>

            {/* STATS */}
            <h3 className="text-xl font-bold text-slate-800 dark:text-white pt-4">Your Referral Stats</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-500">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Referrals</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.total}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 bg-amber-50 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center text-amber-500">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Pending Signups</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 flex items-center gap-4 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-500">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Rewards Earned</p>
                        <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">${stats.converted * 50}</p>
                    </div>
                </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex items-start gap-4 text-blue-800 dark:text-blue-300 text-sm font-medium leading-relaxed">
                <AlertCircle className="w-6 h-6 shrink-0 text-blue-500 mt-0.5" />
                <p>Rewards are automatically issued as a Stripe coupon applied to your account for future store purchases or subscription billing once your friend completes their first month's payment.</p>
            </div>
        </div>
    );
}
