"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    User,
    LogOut,
    Link as LinkIcon,
    Settings,
    Calendar,
    MessageSquare,
    CreditCard,
    HelpCircle,
    UserCircle,
    Check,
    Palette,
    Moon,
    Sun
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'react-hot-toast';

export function UserIdentityMenu() {
    const [isOpen, setIsOpen] = useState(false);
    const [theme, setTheme] = useState<string>('light');
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const profile = useUserProfile(auth.currentUser);

    useEffect(() => {
        // Initialize theme from localStorage
        const stored = localStorage.getItem('theme');
        if (stored) {
            setTheme(stored);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    const handleLogout = async () => {
        await auth.signOut();
        router.push('/login');
    };

    const copyProfileLink = () => {
        const origin = window.location.origin;
        const path = profile.normalizedRole === 'patient' ? '/patient/profile' : '/dashboard/profile';
        const url = `${origin}${path}`;

        navigator.clipboard.writeText(url).then(() => {
            toast.success('Copied profile link', {
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
        });
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        if (newTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    if (profile.loading) {
        return (
            <div className="p-4 mx-4 mb-6 rounded-2xl bg-slate-800/10 dark:bg-slate-800/50 animate-pulse h-16"></div>
        );
    }

    const patientMenu = [
        { label: 'My Profile', href: '/patient/profile', icon: UserCircle },
        { label: 'Appointments', href: '/patient/appointments', icon: Calendar },
        { label: 'Messages', href: '/patient/messages', icon: MessageSquare },
        { label: 'Billing', href: '/patient/billing', icon: CreditCard },
    ];

    const providerMenu = [
        { label: 'Provider Profile', href: '/dashboard/profile', icon: UserCircle },
        { label: 'My Schedule', href: '/calendar', icon: Calendar },
        { label: 'Availability', href: '/calendar', icon: Settings }, // Using calendar for availability fallback
        { label: 'Inbox', href: '/inbox', icon: MessageSquare },
    ];

    const currentMenu = profile.normalizedRole === 'patient' ? patientMenu : providerMenu;
    const helpHref = profile.normalizedRole === 'patient' ? '/patient/help' : '/dashboard/help';

    return (
        <div className="relative w-full px-4 mb-6" ref={dropdownRef}>
            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute bottom-full left-4 right-4 mb-2 bg-white dark:bg-slate-900 rounded-[24px] shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
                    {/* Header */}
                    <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 flex flex-shrink-0 items-center justify-center text-white font-black text-sm shadow-md">
                                {profile.initials}
                            </div>
                            <div className="min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                    {profile.displayName}
                                </h4>
                                <p className="text-[10px] font-medium text-slate-400 truncate">
                                    {profile.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={copyProfileLink}
                            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
                            title="Copy Profile Link"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                        <div className="px-3 py-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Account</span>
                        </div>
                        <div className="space-y-1">
                            {currentMenu.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all group"
                                >
                                    <item.icon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    {item.label}
                                </Link>
                            ))}

                            {/* Theme Toggle Inline */}
                            <button
                                onClick={toggleTheme}
                                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <Palette className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                    <span>Theme</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className={`p-1 rounded-md ${theme === 'light' ? 'bg-white shadow-sm text-amber-500' : 'text-slate-400'}`}>
                                        <Sun className="w-3 h-3" />
                                    </div>
                                    <div className={`p-1 rounded-md ${theme === 'dark' ? 'bg-slate-700 shadow-sm text-indigo-400' : 'text-slate-400'}`}>
                                        <Moon className="w-3 h-3" />
                                    </div>
                                </div>
                            </button>
                        </div>

                        <div className="px-3 pt-4 pb-2">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Additional</span>
                        </div>
                        <div className="space-y-1">
                            <Link
                                href={helpHref}
                                onClick={() => setIsOpen(false)}
                                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all group"
                            >
                                <HelpCircle className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                Get Help
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
                            >
                                <LogOut className="w-4 h-4 text-red-300 group-hover:text-red-500 transition-colors" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom-left Identity Block (Trigger) */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-3 p-3 rounded-[24px] cursor-pointer transition-all relative overflow-hidden group
                    ${isOpen
                        ? 'bg-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none'
                        : 'bg-slate-900 border border-slate-800 shadow-xl hover:bg-slate-800'}
                `}
            >
                {!isOpen && <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-transparent pointer-events-none"></div>}

                <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center text-white font-black text-sm shadow-md ring-2 transition-all
                    ${isOpen ? 'bg-white text-indigo-600 ring-indigo-500' : 'bg-indigo-500 ring-slate-900'}
                `}>
                    {profile.initials}
                </div>

                <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold truncate drop-shadow-sm transition-colors
                        ${isOpen ? 'text-white' : 'text-white'}
                    `}>
                        {profile.displayName}
                    </h4>
                    <p className={`text-[10px] font-black uppercase tracking-widest truncate transition-colors
                        ${isOpen ? 'text-indigo-200' : 'text-slate-400'}
                    `}>
                        {profile.normalizedRole}
                    </p>
                </div>

                <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    <User className={`w-4 h-4 ${isOpen ? 'text-white' : 'text-slate-500'}`} />
                </div>
            </div>
        </div>
    );
}
