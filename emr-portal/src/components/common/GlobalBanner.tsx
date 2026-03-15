"use client";

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Info, AlertTriangle, AlertCircle, Sparkles, X, HeartHandshake } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface BannerConfig {
    message: string;
    type: 'Informational' | 'Warning' | 'Urgent' | 'Promotional';
    ctaLabel?: string;
    ctaUrl?: string;
    startDate?: string;
    endDate?: string;
    showOnEmr: boolean;
    showOnMarketing: boolean;
    updatedAt: string;
    deactivated?: boolean;
}

export function GlobalBanner({ surface }: { surface: 'emr' | 'marketing' }) {
    const [banner, setBanner] = useState<BannerConfig | null>(null);
    const [dismissedAt, setDismissedAt] = useState<string | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Hydrate dismissal state
        const stored = localStorage.getItem('patriotic-banner-dismissed');
        if (stored) {
            setDismissedAt(stored);
        }

        const loadBanner = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'platform-config', 'active-banner'));
                if (docSnap.exists()) {
                    const data = docSnap.data() as BannerConfig;
                    setBanner(data);
                }
            } catch (e) {
                console.warn("Failed to load banner", e);
            }
        };
        
        loadBanner();
    }, []);

    useEffect(() => {
        if (!banner || banner.deactivated) {
            setIsVisible(false);
            return;
        }

        // Check Surface
        if (surface === 'emr' && !banner.showOnEmr) { setIsVisible(false); return; }
        if (surface === 'marketing' && !banner.showOnMarketing) { setIsVisible(false); return; }

        // Check Window
        const now = new Date();
        if (banner.startDate && now < new Date(banner.startDate)) { setIsVisible(false); return; }
        if (banner.endDate && now > new Date(banner.endDate)) { setIsVisible(false); return; }

        // Check Dismissal (If they dismissed a banner with this specific updatedAt timestamp, don't show it again)
        if (dismissedAt === banner.updatedAt) {
            setIsVisible(false);
            return;
        }

        setIsVisible(true);
    }, [banner, dismissedAt, surface]);

    const handleDismiss = () => {
        if (banner) {
            localStorage.setItem('patriotic-banner-dismissed', banner.updatedAt);
            setDismissedAt(banner.updatedAt);
            setIsVisible(false);
        }
    };

    const handleCtaClick = () => {
        if (banner?.ctaUrl) {
            if (banner.ctaUrl.startsWith('http')) {
                window.open(banner.ctaUrl, '_blank');
            } else {
                router.push(banner.ctaUrl);
            }
        }
    };

    const getColorClasses = (type: string) => {
        switch (type) {
            case 'Informational': return 'bg-teal-600 text-white';
            case 'Warning': return 'bg-amber-500 text-white';
            case 'Urgent': return 'bg-red-600 text-white';
            case 'Promotional': return 'bg-indigo-600 text-white';
            default: return 'bg-slate-800 text-white';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'Informational': return <Info className="w-4 h-4" />;
            case 'Warning': return <AlertTriangle className="w-4 h-4" />;
            case 'Urgent': return <AlertCircle className="w-4 h-4" />;
            case 'Promotional': return <Sparkles className="w-4 h-4" />;
            default: return <Info className="w-4 h-4" />;
        }
    };

    if (!isVisible || !banner) return null;

    const referralLink = auth.currentUser ? `https://patriotictelehealth.com/signup?ref=${auth.currentUser.uid}` : null;

    return (
        <div className={`w-full ${getColorClasses(banner.type)} px-4 py-3 relative z-50 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-6 shadow-md shadow-black/10`}>
            
            <div className="flex items-center gap-2 text-sm font-bold text-center md:text-left leading-tight mx-8">
                {getIcon(banner.type)}
                <span>{banner.message}</span>
            </div>

            <div className="flex items-center gap-4">
                {banner.ctaLabel && banner.ctaUrl && (
                    <button 
                        onClick={handleCtaClick}
                        className="bg-white/20 hover:bg-white/30 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider transition-colors whitespace-nowrap"
                    >
                        {banner.ctaLabel}
                    </button>
                )}

                {/* Referral Link Injection */}
                {banner.type === 'Promotional' && referralLink && (
                    <div className="hidden lg:flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full text-xs font-bold shrink-0">
                        <HeartHandshake className="w-3.5 h-3.5" />
                        <span>Refer a friend & get 30% off!</span>
                        <button 
                            onClick={async () => {
                                await navigator.clipboard.writeText(referralLink);
                                toast.success("Referral link copied to clipboard!");
                            }}
                            className="bg-white text-indigo-600 rounded px-2 py-0.5 hover:bg-indigo-50 ml-1 transition-colors"
                        >
                            Copy Link
                        </button>
                    </div>
                )}
            </div>

            <button 
                onClick={handleDismiss} 
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-white/20 transition-colors opacity-70 hover:opacity-100"
                aria-label="Dismiss banner"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
