"use client";

import React, { useState } from 'react';
import {
    ChevronLeft, ChevronRight, ChevronDown, Plus, Filter, Settings,
    Calendar as CalendarIcon, User, Search, Grid, List
} from 'lucide-react';
import {
    format, addWeeks, subWeeks, startOfWeek, endOfWeek,
    eachDayOfInterval, isSameDay, isToday, addDays
} from 'date-fns';
import { useRouter } from 'next/navigation'; // Import useRouter

export default function CalendarPage() {
    // 1. Core State: The 'anchor date' for the current view (default: today)
    const [currentDate, setCurrentDate] = useState(new Date());

    // Load appointments from local storage
    const [appointments, setAppointments] = useState<any[]>([]);

    // UseEffect to load appointments on mount or when window focuses (simple sync)
    React.useEffect(() => {
        const load = () => {
            const saved = JSON.parse(localStorage.getItem('emr_appointments') || '[]');
            setAppointments(saved);
        };
        load();
        window.addEventListener('focus', load);
        return () => window.removeEventListener('focus', load);
    }, []);

    // 2. Compute the week's range based on currentDate
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 }); // Sunday start
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // 3. Navigation Controls
    const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
    const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
    const jumpToToday = () => setCurrentDate(new Date());

    // 4. Mock Data for Collapsible Sections
    const services = [
        { id: 's1', label: 'Initial Consultation', color: 'bg-emerald-100 text-emerald-700' },
        { id: 's2', label: 'Follow-up (Video)', color: 'bg-indigo-100 text-indigo-700' },
        { id: 's3', label: 'Physical Exam', color: 'bg-orange-100 text-orange-700' },
        { id: 's4', label: 'Lab Review', color: 'bg-blue-100 text-blue-700' },
    ];

    const locations = [
        { id: 'l1', label: 'Main Clinic - Room 101' },
        { id: 'l2', label: 'Main Clinic - Room 102' },
        { id: 'l3', label: 'Telehealth (Virtual)' },
    ];

    const events = [
        { id: 'e1', label: 'Staff Meeting', color: 'bg-slate-100 text-slate-700' },
        { id: 'e2', label: 'Lunch Break', color: 'bg-slate-100 text-slate-700' },
        { id: 'e3', label: 'Training', color: 'bg-slate-100 text-slate-700' },
    ];

    // Helper to get appointment position
    const getAppointmentStyle = (appt: any) => {
        const apptDate = new Date(appt.date + 'T' + appt.time);
        const startHour = 7; // Calendar starts at 7 AM
        const hour = apptDate.getHours();
        const minutes = apptDate.getMinutes();

        // Calculate pixels from top (assuming 80px per hour row)
        const top = ((hour - startHour) * 80) + ((minutes / 60) * 80);
        return { top: `${top}px`, height: '80px' }; // Fixed 1h height for demo
    };

    const router = useRouter(); // Import useRouter at top level if not present

    return (
        <div className="flex h-[calc(100vh-6rem)] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-sans">

            {/* SIDEBAR */}
            <aside className="w-64 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col overflow-y-auto custom-scrollbar">

                {/* Mini Calendar Widget */}
                <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-900 capitalize">
                            {format(currentDate, 'MMMM yyyy')}
                        </span>
                        <div className="flex gap-1">
                            <button onClick={prevWeek} className="p-1 hover:bg-slate-100 rounded transition-colors"><ChevronLeft className="w-4 h-4 text-slate-500" /></button>
                            <button onClick={nextWeek} className="p-1 hover:bg-slate-100 rounded transition-colors"><ChevronRight className="w-4 h-4 text-slate-500" /></button>
                        </div>
                    </div>

                    {/* Simplified Mini Grid (Static representation for layout consistency) */}
                    <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 font-medium mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => <div key={d}>{d}</div>)}
                    </div>
                    {/* Render days of current week + surrounding */}
                    <div className="grid grid-cols-7 text-center gap-y-2 text-xs text-slate-700 font-medium">
                        {/* Just showing the active week logic for demo effect in mini-cal */}
                        {weekDays.map((day, i) => {
                            const isSelected = isSameDay(day, currentDate);
                            return (
                                <div key={i}
                                    onClick={() => setCurrentDate(day)}
                                    className={`w-6 h-6 rounded-full flex items-center justify-center mx-auto cursor-pointer transition-all ${isSelected ? 'bg-brand text-white shadow-sm' :
                                        isToday(day) ? 'bg-indigo-50 text-brand font-bold' :
                                            'hover:bg-slate-100'
                                        }`}
                                >
                                    {format(day, 'd')}
                                </div>
                            );
                        })}
                        {/* Fillers for visual completeness */}
                        <div className="text-slate-300">15</div><div className="text-slate-300">16</div>
                    </div>
                </div>

                {/* FILTERS */}
                <div className="flex-1 overflow-y-auto">
                    <FilterSection title="Team members" defaultOpen>
                        {/* All Checkbox */}
                        <div className="flex items-center gap-3 mb-2">
                            <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand flex-shrink-0" />
                            <span className="text-sm text-slate-600">All team members</span>
                        </div>

                        <TeamMemberCheckbox name="Dayo Olufolaju" initials="DO" color="bg-purple-100 text-purple-700" checked />
                        <TeamMemberCheckbox name="Nyah Spencer" initials="NS" color="bg-teal-100 text-teal-700" />
                        <TeamMemberCheckbox name="Wendy Smith" isDemo />
                    </FilterSection>

                    <FilterSection title="Services">
                        {services.map(s => (
                            <div key={s.id} className="flex items-center gap-3 mb-2">
                                <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                                <span className={`w-3 h-3 rounded-full ${s.color.split(' ')[0]}`}></span>
                                <span className="text-sm text-slate-600">{s.label}</span>
                            </div>
                        ))}
                    </FilterSection>

                    <FilterSection title="Other events">
                        {events.map(e => (
                            <div key={e.id} className="flex items-center gap-3 mb-2">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                                <span className="text-sm text-slate-600">{e.label}</span>
                            </div>
                        ))}
                    </FilterSection>

                    <FilterSection title="Locations">
                        {locations.map(l => (
                            <div key={l.id} className="flex items-center gap-3 mb-2">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                                <span className="text-sm text-slate-600">{l.label}</span>
                            </div>
                        ))}
                    </FilterSection>
                </div>

            </aside>

            {/* MAIN CALENDAR CONTENT */}
            <div className="flex-1 flex flex-col min-w-0 bg-white">

                {/* TOOLBAR */}
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white z-10 shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={jumpToToday}
                            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            Today
                        </button>
                        <div className="flex items-center gap-1 bg-slate-50 p-0.5 rounded-lg border border-slate-200">
                            <button onClick={prevWeek} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronLeft className="w-4 h-4 text-slate-600" /></button>
                            <button onClick={nextWeek} className="p-1 hover:bg-white rounded shadow-sm transition-all"><ChevronRight className="w-4 h-4 text-slate-600" /></button>
                        </div>
                        <span className="text-lg font-bold text-slate-800">
                            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                        </span>

                        <div className="relative">
                            <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                                Week <ChevronDown className="w-3 h-3 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-3 py-1.5 border border-brand text-brand rounded-lg text-sm font-bold hover:bg-indigo-50 flex items-center gap-2 transition-colors">
                            Booking
                        </button>
                        <button className="px-3 py-1.5 bg-brand text-white rounded-lg text-sm font-bold hover:bg-indigo-600 flex items-center gap-2 shadow-sm transition-all active:scale-95">
                            <Plus className="w-4 h-4" /> New
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><Filter className="w-4 h-4" /></button>
                        <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-500 transition-colors"><Settings className="w-4 h-4" /></button>
                    </div>
                </header>

                {/* CALENDAR GRID */}
                <div className="flex-1 overflow-hidden flex flex-col relative">

                    {/* Header Row (Days) */}
                    <div className="flex border-b border-slate-200 pr-4 shrink-0">
                        <div className="w-14 flex-shrink-0 border-r border-slate-100 bg-white"></div> {/* Time axis spacer */}
                        {weekDays.map((day, i) => {
                            const isCurrent = isSameDay(day, new Date());
                            const isSelected = isSameDay(day, currentDate);

                            return (
                                <div
                                    key={i}
                                    onClick={() => setCurrentDate(day)}
                                    className={`flex-1 py-3 text-center border-r border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${isCurrent ? 'bg-indigo-50/50' : ''
                                        } ${isSelected ? 'border-b-2 border-b-brand bg-indigo-50' : ''}`}
                                >
                                    <span className={`text-sm font-semibold block ${(isCurrent || isSelected) ? 'text-brand' : 'text-slate-600'}`}>
                                        {format(day, 'EEE d')}
                                    </span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Scrollable Body */}
                    <div className="flex-1 overflow-y-auto flex custom-scrollbar relative">

                        {/* Time Column */}
                        <div className="w-14 flex-shrink-0 border-r border-slate-100 bg-white flex flex-col sticky left-0 z-10">
                            {['7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM', '5 PM', '6 PM', '7 PM'].map((time, i) => (
                                <div key={i} className="h-20 text-[10px] items-start justify-center flex pt-2 text-slate-400 relative">
                                    <span className="-mt-2.5 bg-white px-1 relative z-10">{time}</span>
                                </div>
                            ))}
                        </div>

                        {/* Grid Columns */}
                        <div className="flex-1 flex relative min-h-[900px]"> {/* Ensure distinct scroll area */}
                            {/* Horizontal Lines */}
                            <div className="absolute inset-0 flex flex-col pointer-events-none w-full">
                                {Array.from({ length: 13 }).map((_, i) => (
                                    <div key={i} className="h-20 border-b border-slate-100 w-full"></div>
                                ))}
                            </div>

                            {/* Vertical Columns */}
                            {weekDays.map((day, colIndex) => {
                                const isSelected = isSameDay(day, currentDate);

                                // Find appointments for this day
                                const dayAppts = appointments.filter(a => isSameDay(new Date(a.date + 'T00:00:00'), day));

                                return (
                                    <div key={colIndex} className={`flex-1 border-r border-slate-100 relative h-full transition-colors ${isSelected ? 'bg-indigo-50/20' : ''}`}>

                                        {/* Render Appointments */}
                                        {dayAppts.map((appt) => {
                                            const style = getAppointmentStyle(appt);
                                            return (
                                                <div
                                                    key={appt.id}
                                                    style={style}
                                                    onClick={() => router.push(`/telehealth?appointmentId=${appt.id}`)}
                                                    className={`absolute left-1 right-1 border-l-4 rounded p-1 text-xs shadow-sm cursor-pointer hover:scale-[1.02] transition-transform z-10 ${appt.type === 'video'
                                                        ? 'bg-purple-100 border-purple-500 text-purple-700'
                                                        : 'bg-blue-100 border-blue-500 text-blue-700'
                                                        }`}
                                                >
                                                    <div className="font-bold truncate">{appt.type === 'video' ? '📹 ' : '👤 '}{appt.patient}</div>
                                                    <div className="opacity-80 text-[10px]">{appt.time} - {parseInt(appt.time.split(':')[0]) + 1}:00</div>
                                                </div>
                                            );
                                        })}

                                        {/* Current Time Indicator */}
                                        {isToday(day) && (
                                            <div className="absolute top-[320px] w-full border-t-2 border-red-400 z-20 pointer-events-none">
                                                <div className="w-2 h-2 bg-red-400 rounded-full -mt-[5px] -ml-[1px]"></div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// --- SUB-COMPONENTS ---

function FilterSection({ title, children, defaultOpen = false }: any) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="px-4 py-2 border-b border-slate-50 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full py-2 text-left group hover:bg-slate-50 rounded px-1 -mx-1 transition-colors"
            >
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wide group-hover:text-brand transition-colors">{title}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
    )
}

function TeamMemberCheckbox({ name, initials, color, checked, isDemo }: any) {
    return (
        <div className="flex items-center gap-3 mb-2 cursor-pointer group">
            <input type="checkbox" defaultChecked={checked} className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand flex-shrink-0 cursor-pointer" />

            {initials ? (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${color}`}>
                    {initials}
                </div>
            ) : (
                <div className="w-6 h-6 rounded-full overflow-hidden border border-slate-200 flex items-center justify-center bg-orange-100 text-[8px] text-orange-600 font-bold">
                    WS
                </div>
            )}

            <span className="text-sm text-slate-600 font-medium group-hover:text-slate-900 transition-colors">{name}</span>
            {isDemo && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded ml-auto">Demo</span>}
        </div>
    )
}
