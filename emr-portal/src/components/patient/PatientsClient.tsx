"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Search, Plus, Filter, Save, Eye, MoreHorizontal, ChevronDown,
    Calendar, X, Users, Tag, ChevronRight, Settings, DollarSign, Activity, BookOpen,
    CreditCard, FileText, Zap, Layout
} from 'lucide-react';
import { PATIENTS as INITIAL_PATIENTS, Patient } from '@/lib/data';
import { PatientChart } from '@/components/patient/PatientChart';
import NewPatientRegistration from '@/components/patient/NewPatientRegistration';

export default function PatientsClient() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientIdParam = searchParams.get('id');

    const [patients, setPatients] = useState<any[]>(INITIAL_PATIENTS);
    const [filteredPatients, setFilteredPatients] = useState<any[]>(INITIAL_PATIENTS);
    const [filters, setFilters] = useState({ tags: [] as string[], team: [] as string[], status: [] as string[] });
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
    const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Auto-select patient from URL
    React.useEffect(() => {
        if (patientIdParam) {
            const p = patients.find(p => p.id === parseInt(patientIdParam));
            if (p) setSelectedPatient(p);
        }
    }, [patientIdParam, patients]);

    // Filter Logic
    React.useEffect(() => {
        const results = patients.filter(patient => {
            if (searchTerm && !patient.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !patient.phone.includes(searchTerm) && !patient.email.toLowerCase().includes(searchTerm.toLowerCase())) return false;
            if (filters.tags.length > 0 && !patient.tags?.some((t: any) => filters.tags.includes(t.label))) return false;
            if (filters.team.length > 0 && !patient.team?.some((t: string) => filters.team.includes(t))) return false;
            if (filters.status.length > 0 && !filters.status.includes(patient.status)) return false;
            return true;
        });
        setFilteredPatients(results);
    }, [patients, filters, searchTerm]);

    const toggleFilter = (type: 'tags' | 'team' | 'status', value: string) => {
        setFilters(prev => {
            const current = prev[type];
            return {
                ...prev,
                [type]: current.includes(value) ? current.filter(v => v !== value) : [...current, value]
            };
        });
    };

    const handleCreatePatient = (data: any) => {
        const newPatient = {
            id: data.id,
            name: `${data.firstName} ${data.lastName}`,
            mrn: data.mrn,
            dob: data.dob,
            sex: data.sexAtBirth,
            state: data.state,
            phone: data.phone,
            email: data.email,
            status: data.status,
            statusColor:
                data.status === 'Active' ? 'bg-emerald-100 text-emerald-700' :
                    data.status === 'Pending Intake' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700',
            team: ['DO'],
            isDemo: false,
            tags: data.tags.map((t: string) => ({ label: t, color: 'bg-indigo-50 text-indigo-700' })),
            notes: [],
            address1: data.address1,
            city: data.city,
            zipCode: data.zipCode,
            primaryConcern: data.primaryConcern
        };
        setPatients([newPatient, ...patients]);
        setIsNewPatientOpen(false);
    };

    const updatePatientStatus = (patientId: number, newStatus: string) => {
        setPatients(patients.map(c => {
            if (c.id === patientId) {
                let newColor = 'bg-slate-100 text-slate-700';
                if (newStatus === 'Active') newColor = 'bg-emerald-100 text-emerald-700';
                if (newStatus === 'Lead') newColor = 'bg-purple-100 text-purple-700';
                if (newStatus === 'Wait List') newColor = 'bg-orange-100 text-orange-700';
                if (newStatus === 'Inactive') newColor = 'bg-red-100 text-red-700';
                return { ...c, status: newStatus, statusColor: newColor };
            }
            return c;
        }));
    };

    const toggleSelect = (id: number) => {
        if (selectedPatientIds.includes(id)) {
            setSelectedPatientIds(selectedPatientIds.filter(cid => cid !== id));
        } else {
            setSelectedPatientIds([...selectedPatientIds, id]);
        }
    };

    const updatePatientNotes = (patientId: number, newNote: any) => {
        setPatients(prevPatients => prevPatients.map(c => {
            if (c.id === patientId) {
                return { ...c, notes: [newNote, ...(c.notes || [])] };
            }
            return c;
        }));

        if (selectedPatient && selectedPatient.id === patientId) {
            setSelectedPatient((prev: any) => ({ ...prev, notes: [newNote, ...(prev.notes || [])] }));
        }
    };

    // If a patient is selected, show the detail view
    if (selectedPatient) {
        return <PatientChart patient={selectedPatient} onBack={() => setSelectedPatient(null)} onAddNote={(note: any) => updatePatientNotes(selectedPatient.id, note)} />;
    }

    // Otherwise show the list view
    return (
        <div className="flex flex-col h-[calc(100vh-6rem)] font-sans bg-white relative">

            {/* HEADER */}
            <div className="flex justify-between items-center px-8 py-6 pb-2">
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
                        <Users className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">Patients</h1>
                </div>
                <button
                    onClick={() => setIsNewPatientOpen(true)}
                    className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                >
                    <Plus className="w-5 h-5" /> New patient
                </button>
            </div>

            {/* FILTER BAR */}
            <div className="px-8 py-4 flex items-center flex-wrap gap-4 border-b border-slate-100">
                <span className="font-bold text-slate-900 whitespace-nowrap">{filteredPatients.length} Patients</span>

                {/* Search */}
                <div className="relative flex-1 min-w-[300px] max-w-xl">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                        type="text"
                        placeholder="Search by patient name, email or phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand placeholder:text-slate-400"
                    />
                </div>

                {/* Filter Chips */}
                <div className="flex items-center gap-2">
                    <FilterDropdown
                        label="Tags" icon={Tag}
                        options={Array.from(new Set(patients.flatMap(c => c.tags?.map((t: any) => t.label) || [])))}
                        selected={filters.tags}
                        onChange={(val: string) => toggleFilter('tags', val)}
                    />
                    <FilterDropdown
                        label="Team" icon={Users}
                        options={Array.from(new Set(patients.flatMap(c => c.team || [])))}
                        selected={filters.team}
                        onChange={(val: string) => toggleFilter('team', val)}
                    />
                    <FilterDropdown
                        label="Status"
                        options={['Active', 'Pending Intake', 'Inactive', 'Lead', 'Wait List']}
                        selected={filters.status}
                        onChange={(val: string) => toggleFilter('status', val)}
                    />

                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-brand text-xs font-bold rounded-full border-2 border-transparent hover:bg-indigo-50 hover:border-indigo-100 transition-all">
                        <Plus className="w-3 h-3 bg-brand text-white rounded-full p-0.5" />
                        <span>View</span>
                    </button>

                    <button
                        onClick={() => setFilters({ tags: [], team: [], status: [] })}
                        className="text-brand text-xs font-bold hover:underline ml-2"
                    >
                        Reset
                    </button>
                </div>

                <div className="flex-1"></div>

                {/* Right Actions */}
                <div className="flex items-center gap-4">
                    <button className="flex items-center gap-2 text-brand text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                        <Filter className="w-4 h-4" /> Show
                    </button>
                    <button
                        onClick={() => alert("View saved successfully!")}
                        className="flex items-center gap-2 text-brand text-sm font-bold hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        <Save className="w-4 h-4" /> Save view
                    </button>
                </div>
            </div>

            {/* TABLE */}
            <div className="flex-1 overflow-auto bg-slate-50 relative">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 text-xs font-bold text-slate-500 sticky top-0 z-10 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 w-12 text-center">
                                <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand" />
                            </th>
                            <th className="px-6 py-4 cursor-pointer hover:text-brand flex items-center gap-1">
                                Patient name <ChevronDown className="w-3 h-3" />
                            </th>
                            <th className="px-6 py-4">Phone number</th>
                            <th className="px-6 py-4">Email</th>
                            <th className="px-6 py-4">Tags</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Assigned Team</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredPatients.length > 0 ? filteredPatients.map((patient) => (
                            <tr key={patient.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedPatientIds.includes(patient.id)}
                                        onChange={() => toggleSelect(patient.id)}
                                        className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setSelectedPatient(patient)}
                                            className="font-bold text-brand hover:underline"
                                        >
                                            {patient.name}
                                        </button>
                                        {patient.isDemo && (
                                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[10px] uppercase font-bold rounded border border-slate-200">
                                                Demo
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 font-medium text-slate-700">{patient.phone}</td>
                                <td className="px-6 py-4 text-slate-600">{patient.email}</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {patient.tags?.map((tag: any) => (
                                            <span key={tag.label} className={`px-2 py-0.5 text-xs font-bold rounded-full border border-black/5 ${tag.color}`}>
                                                {tag.label}
                                            </span>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <StatusCell
                                        status={patient.status}
                                        color={patient.statusColor}
                                        onUpdate={(newStatus: string) => updatePatientStatus(patient.id, newStatus)}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex -space-x-2">
                                        {patient.team?.map((member: any, i: number) => (
                                            member === 'img' ? (
                                                <img key={i} src={`https://i.pravatar.cc/150?u=${patient.id}`} alt="User" className="w-7 h-7 rounded-full border-2 border-white" />
                                            ) : (
                                                <div key={i} className="w-7 h-7 rounded-full bg-cyan-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-cyan-700">
                                                    {member}
                                                </div>
                                            )
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                                            <Search className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <p className="text-slate-800 font-bold">No patients found</p>
                                        <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
                                        <button
                                            onClick={() => {
                                                setSearchTerm('');
                                                setFilters({ tags: [], team: [], status: [] });
                                            }}
                                            className="mt-2 text-brand font-bold text-sm hover:underline"
                                        >
                                            Clear all filters
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Floating Action Buttons */}
                <div className="absolute right-8 bottom-8 flex flex-col gap-3">
                    <FloatingButton icon={Calendar} />
                    <FloatingButton icon={Calendar} label="2" />
                    <FloatingButton icon={X} />
                </div>
            </div>

            {/* NEW PATIENT REGISTRATION */}
            {isNewPatientOpen && <NewPatientRegistration onClose={() => setIsNewPatientOpen(false)} onComplete={handleCreatePatient} />}
        </div>
    );
}

function FilterDropdown({ label, icon: Icon, options, selected, onChange }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: any) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all ${selected.length > 0
                    ? 'bg-brand-50 border-brand-100 text-brand'
                    : 'bg-slate-50 border-transparent text-slate-700 hover:bg-indigo-50 hover:border-indigo-100' // Keeping it slate-700 similar to Status style
                    }`}
            >
                {Icon ? (
                    <Icon className={`w-3 h-3 ${selected.length > 0 ? 'text-brand' : 'bg-brand text-white rounded-full p-0.5'}`} />
                ) : (
                    <div className="w-3 h-3 flex items-center justify-center">
                        <X className="w-3 h-3 bg-slate-400 text-white rounded-full p-0.5" />
                    </div>
                )}
                <span className={selected.length > 0 ? 'text-brand' : 'text-slate-700'}>{label}</span>
                {selected.length > 0 && (
                    <span className="ml-1 bg-brand text-white text-[10px] px-1.5 py-0.5 rounded-full">{selected.length}</span>
                )}
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 max-h-60 overflow-y-auto">
                        {options.map((option: string) => (
                            <label key={option} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={selected.includes(option)}
                                    onChange={() => onChange(option)}
                                    className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand"
                                />
                                <span className="text-sm text-slate-700 font-medium">{option}</span>
                            </label>
                        ))}
                        {options.length === 0 && <div className="p-2 text-xs text-slate-400 text-center">No options available</div>}
                    </div>
                </div>
            )}
        </div>
    );
}

function StatusCell({ status, color, onUpdate }: any) {
    const [isOpen, setIsOpen] = useState(false);
    const ref = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: any) {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref]);

    const options = ['Active', 'Lead', 'Wait List', 'Inactive'];

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold ${color} hover:opacity-80 transition-opacity`}
            >
                {status}
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-32 bg-white rounded-lg shadow-xl border border-slate-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={(e) => { e.stopPropagation(); onUpdate(opt); setIsOpen(false); }}
                            className="block w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

function FloatingButton({ icon: Icon, label }: any) {
    return (
        <button className="w-12 h-12 bg-white rounded-full shadow-lg border border-slate-100 flex items-center justify-center hover:bg-slate-50 transition-colors group relative">
            <Icon className="w-5 h-5 text-slate-500 group-hover:text-slate-700" />
            {label && <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center border-2 border-white">{label}</span>}
        </button>
    )
}
