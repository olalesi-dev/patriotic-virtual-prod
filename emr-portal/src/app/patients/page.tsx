"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Search, Plus, Filter, Save, Eye, MoreHorizontal, ChevronDown,
    Calendar, X, Users, Tag, ChevronRight, Settings, DollarSign, Activity, BookOpen,
    CreditCard, FileText, Zap, Layout
} from 'lucide-react';
import { PATIENTS as INITIAL_PATIENTS } from '@/lib/data';

export default function PatientsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const patientIdParam = searchParams.get('id');

    const [patients, setPatients] = useState<any[]>(INITIAL_PATIENTS);
    const [filteredPatients, setFilteredPatients] = useState<any[]>(INITIAL_PATIENTS);
    const [filters, setFilters] = useState({ tags: [] as string[], team: [] as string[], status: [] as string[] });
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [selectedPatientIds, setSelectedPatientIds] = useState<number[]>([]);
    const [isNewPatientOpen, setIsNewPatientOpen] = useState(false);

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
            if (filters.tags.length > 0 && !patient.tags?.some((t: any) => filters.tags.includes(t.label))) return false;
            if (filters.team.length > 0 && !patient.team?.some((t: string) => filters.team.includes(t))) return false;
            if (filters.status.length > 0 && !filters.status.includes(patient.status)) return false;
            return true;
        });
        setFilteredPatients(results);
    }, [patients, filters]);

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
            id: Math.max(...patients.map(c => c.id), 0) + 1,
            name: `${data.firstName} ${data.lastName}`,
            phone: data.phone,
            email: data.email,
            status: data.status,
            statusColor: data.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700',
            team: ['DO'],
            isDemo: false,
            tags: [],
            notes: []
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
        return <PatientDetailView patient={selectedPatient} onBack={() => setSelectedPatient(null)} onAddNote={(note: any) => updatePatientNotes(selectedPatient.id, note)} />;
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
                        placeholder="Search by patient name, patient ID or phone number"
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
                        options={['Active', 'Inactive', 'Lead', 'Wait List']}
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
                        {filteredPatients.map((patient) => (
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
                        ))}
                    </tbody>
                </table>

                {/* Floating Action Buttons */}
                <div className="absolute right-8 bottom-8 flex flex-col gap-3">
                    <FloatingButton icon={Calendar} />
                    <FloatingButton icon={Calendar} label="2" />
                    <FloatingButton icon={X} />
                </div>
            </div>

            {/* NEW PATIENT MODAL */}
            {isNewPatientOpen && <NewPatientModal onClose={() => setIsNewPatientOpen(false)} onSave={handleCreatePatient} />}
        </div>
    );
}

// --- PATIENT DETAIL COMPONENT ---
function PatientDetailView({ patient, onBack, onAddNote }: any) {
    const [activeTab, setActiveTab] = useState('Overview');
    const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);

    return (
        <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
            {/* TOP HEADER */}
            <div className="bg-white px-8 pt-6 pb-0 border-b border-slate-200">
                <div className="flex items-center gap-1 text-sm text-brand font-bold mb-4 cursor-pointer hover:underline" onClick={onBack}>
                    Patients <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>

                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm border border-slate-300">
                            {patient.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900">{patient.name}</h1>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                            {patient.status} <ChevronDown className="w-3 h-3" />
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 flex items-center gap-2">
                            More actions <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setIsNoteModalOpen(true)}
                            className="px-4 py-2 bg-brand hover:bg-brand-600 text-white font-bold rounded-lg text-sm flex items-center gap-2 shadow-sm"
                        >
                            <BookOpen className="w-4 h-4" /> New note
                        </button>
                        <button className="p-2 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 text-slate-600">
                            <Settings className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-8">
                    {['Overview', 'Personal', 'Relationships', 'Documentation', 'Inbox', 'Billing', 'Insurance'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab
                                ? 'border-brand text-brand'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* CONTENT AREA */}
            <div className="flex-1 overflow-y-auto p-8">

                {activeTab === 'Overview' && <OverviewTab />}
                {activeTab === 'Personal' && <PersonalTab patient={patient} />}
                {activeTab === 'Documentation' && <DocumentationTab notes={patient.notes} />}
                {activeTab === 'Billing' && <BillingTab />}

            </div>

            {/* Floating Action Buttons */}
            <div className="absolute right-8 bottom-8 flex flex-col gap-3">
                <FloatingButton icon={Calendar} />
                <FloatingButton icon={Calendar} label="2" />
                <FloatingButton icon={X} />
            </div>

            {/* SOAP NOTE MODAL */}
            {isNoteModalOpen && <SoapNoteModal onClose={() => setIsNoteModalOpen(false)} onSave={onAddNote} />}
        </div>
    )
}

function OverviewTab() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto">

            {/* LEFT COL: APPOINTMENT HISTORY */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-2 text-slate-800 font-bold">
                        <Calendar className="w-5 h-5 text-slate-500" />
                        <span>Appointment history</span>
                    </div>
                    <div className="flex border border-slate-200 rounded-lg overflow-hidden text-xs font-bold">
                        <button className="px-3 py-1.5 bg-brand text-white">Status</button>
                        <button className="px-3 py-1.5 bg-white text-slate-500 hover:bg-slate-50">Service</button>
                    </div>
                </div>

                {/* DONUT CHART (CSS ONLY MOCK) */}
                <div className="flex justify-center mb-8 relative">
                    <div className="w-48 h-48 rounded-full border-[1.5rem] border-indigo-200 flex items-center justify-center relative">
                        <div className="absolute inset-0 rounded-full border-[1.5rem] border-brand clip-half rotate-45"></div>
                        {/* Simple CSS circle for now */}
                        <div className="bg-white rounded-full w-full h-full flex items-center justify-center">
                            <div className="w-32 h-32 bg-white rounded-full"></div>
                        </div>
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                        {/* Can put total center text here if needed later */}
                    </div>

                    {/* Legend */}
                    <div className="ml-8 self-center">
                        <div className="text-sm font-bold text-slate-800 mb-1">Total appointments (1)</div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <span className="w-3 h-3 rounded-full bg-brand"></span>
                            Confirmed (1)
                        </div>
                    </div>
                </div>

                {/* SUB TABS */}
                <div className="flex gap-6 border-b border-slate-100 mb-6">
                    <button className="pb-2 text-brand font-bold text-sm border-b-2 border-brand">Upcoming (0)</button>
                    <button className="pb-2 text-slate-400 font-bold text-sm hover:text-slate-600">Past (1)</button>
                    <button className="pb-2 text-slate-400 font-bold text-sm hover:text-slate-600">All (1)</button>
                </div>

                {/* TIMELINE */}
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-brand"></div>
                            <div className="w-0.5 flex-1 bg-brand/30 my-1"></div>
                        </div>
                        <div className="flex-1 pb-6">
                            <div className="text-xs font-bold text-slate-500 mb-2">Upcoming appointments</div>
                            <div className="border border-slate-200 rounded-lg p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-slate-400 text-sm">
                                    <div className="p-2 bg-slate-100 rounded-lg"><Calendar className="w-5 h-5" /></div>
                                    No upcoming appointments
                                </div>
                                <button className="text-brand font-bold text-sm hover:underline">+ Book appointment</button>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex flex-col items-center">
                            <div className="w-3 h-3 rounded-full bg-slate-300"></div>
                        </div>
                        <div className="flex-1">
                            <div className="text-xs font-bold text-slate-400">No more appointments</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COL: FINANCIALS & CONDITIONS */}
            <div className="space-y-6">

                {/* FINANCIAL CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
                    <div className="text-4xl font-bold text-slate-900 mb-8 max-w-md mx-auto bg-slate-50/50 py-8 rounded-xl">$0.00</div>
                    <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-xl py-4">
                        <div>
                            <div className="text-sm font-bold text-slate-900">$0.00</div>
                            <div className="text-xs text-slate-500 font-medium">Insurance</div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">$0.00</div>
                            <div className="text-xs text-slate-500 font-medium">Uninvoiced</div>
                        </div>
                        <div>
                            <div className="text-sm font-bold text-slate-900">$0.00</div>
                            <div className="text-xs text-slate-500 font-medium">Account credit</div>
                        </div>
                    </div>
                </div>

                {/* CONDITIONS CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Activity className="w-5 h-5 text-slate-400" />
                            <span>Conditions</span>
                        </div>
                        <button className="text-brand text-xs font-bold hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> New condition
                        </button>
                    </div>

                    <p className="text-xs text-slate-400 mb-4">Manage conditions and onset dates for accurate care planning</p>

                    <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 flex items-center gap-3 text-sm text-slate-500">
                        <div className="p-1 bg-slate-200 rounded text-slate-500 font-serif italic font-bold text-xs">dX</div>
                        No conditions found
                    </div>
                </div>

            </div>

        </div>
    )
}

function PersonalTab({ patient }: any) {
    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* NAME CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <div className="w-5 h-5 bg-slate-600 rounded-sm flex items-center justify-center">
                                <Plus className="w-3 h-3 text-white" />
                            </div>
                            <span>Name</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <button className="text-brand hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> New field</button>
                            <button className="text-brand hover:underline">Edit</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">First name</label>
                            <div className="text-sm font-medium text-slate-900">{patient.name.split(' ')[0]}</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Middle name</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Last name</label>
                            <div className="text-sm font-medium text-slate-900">{patient.name.split(' ')[1]}</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Preferred name</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                    </div>
                </div>

                {/* CONTACT DETAILS CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Users className="w-5 h-5 text-slate-600" />
                            <span>Contact Details</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <button className="text-brand hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> New field</button>
                            <button className="text-brand hover:underline">Edit</button>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Phone number</label>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-slate-900">{patient.phone}</span>
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Default</span>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">Mobile</span>
                            </div>
                            <button className="text-brand text-xs font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add phone number</button>
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Email</label>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-medium text-slate-900">{patient.email}</span>
                                <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">Default</span>
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">Personal</span>
                            </div>
                            <button className="text-brand text-xs font-bold hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> Add email</button>
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Address</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                    </div>
                </div>

                {/* ABOUT PATIENT CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <div className="w-5 h-5 bg-slate-600 rounded-sm flex items-center justify-center">
                                <Plus className="w-3 h-3 text-white" />
                            </div>
                            <span>About Patient</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <button className="text-brand hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> New field</button>
                            <button className="text-brand hover:underline">Edit</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Date of birth</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Gender</label>
                            <div className="text-sm font-bold text-slate-900">Male</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Sex</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Preferred Language</label>
                            <div className="text-sm font-bold text-slate-900">English</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Date First Seen</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Relationship Status</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Employment Status</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Ethnicity</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Patient Notes</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                    </div>
                </div>

                {/* PROVIDER DETAILS CARD */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <div className="w-5 h-5 bg-slate-600 rounded-full flex items-center justify-center text-white">
                                <div className="w-2.5 h-2.5 border-2 border-white rounded-full"></div>
                            </div>
                            <span>Provider Details</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold">
                            <button className="text-brand hover:underline flex items-center gap-1"><Plus className="w-3 h-3" /> New field</button>
                            <button className="text-brand hover:underline">Edit</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Identification Number</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Status</label>
                            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-600 rounded-sm"></div> {patient.status}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Tags</label>
                            <div className="flex flex-wrap gap-2">
                                {patient.tags?.map((tag: any) => (
                                    <span key={tag.label} className={`px-2 py-0.5 text-xs font-bold rounded-full border border-black/5 ${tag.color}`}>
                                        {tag.label}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Assigned Team</label>
                            <div className="inline-flex px-2 py-1 bg-slate-100 rounded-md text-xs font-bold text-slate-700">Olalesi Osunsade</div>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Referred By</label>
                            <div className="text-sm font-medium text-slate-900">-</div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="mt-2">
                <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <Plus className="w-5 h-5" /> Add new section
                </button>
            </div>
        </div>
    )
}

function BillingTab() {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">

            {/* LEFT COLUMN - BILLING DASHBOARD */}
            <div className="lg:col-span-2 space-y-6">

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
                    <div className="p-6 pb-0">
                        {/* Header */}
                        <div className="flex justify-between items-center mb-0">
                            <div className="flex items-center gap-2 font-bold text-slate-800 text-lg">
                                <span className="bg-slate-100 p-0.5 rounded"><Layout className="w-4 h-4 text-slate-500" /></span>
                                Billing
                            </div>
                            <button className="bg-brand hover:bg-brand-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-sm">
                                New <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Sub Tabs */}
                        <div className="flex gap-8 border-b border-slate-100 mt-6 overflow-x-auto">
                            {['Billables', 'Invoices', 'Claims', 'Payments', 'Superbills'].map((tab, i) => (
                                <button
                                    key={tab}
                                    className={`pb-3 text-sm font-bold border-b-2 whitespace-nowrap transition-colors ${i === 0
                                        ? 'border-brand text-brand'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                        }`}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Filters */}
                        <div className="flex justify-end gap-3 my-4">
                            <button className="flex items-center gap-2 bg-indigo-50 text-brand text-xs font-bold px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-colors">
                                <Calendar className="w-3 h-3" /> Default <ChevronDown className="w-3 h-3" />
                            </button>
                            <button className="flex items-center gap-2 bg-indigo-50 text-brand text-xs font-bold px-3 py-1.5 rounded-lg border border-transparent hover:border-indigo-100 transition-colors">
                                All statuses <Filter className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Table Header */}
                    <div className="bg-slate-50 border-y border-slate-100 px-6 py-2 grid grid-cols-12 gap-4 text-xs font-bold text-slate-500">
                        <div className="col-span-2 border-r border-slate-200">Date</div>
                        <div className="col-span-7 border-r border-slate-200">Details</div>
                        <div className="col-span-2 border-r border-slate-200 text-right pr-2">Unpaid</div>
                        <div className="col-span-1 text-right">Paid</div>
                    </div>

                    {/* List Item */}
                    <div className="p-6 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer group">
                        <div className="grid grid-cols-12 gap-4 items-center">
                            <div className="col-span-2 flex items-center justify-center h-10 w-10 bg-slate-100 rounded-lg text-slate-500 border border-slate-200">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div className="col-span-7">
                                <div className="text-sm font-bold text-slate-800">Appointment Dec 23, 2025</div>
                            </div>
                            <div className="col-span-2 text-right text-sm font-medium text-slate-900">$100.00</div>
                            <div className="col-span-1 flex justify-end">
                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* RIGHT COLUMN - SIDEBARS */}
            <div className="space-y-6">

                {/* FINANCIAL CARD - RECYCLED STYLE */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="text-center mb-6 bg-slate-50/50 py-6 rounded-xl">
                        <div className="text-3xl font-bold text-slate-900">$0.00</div>
                    </div>

                    <div className="grid grid-cols-3 divide-x divide-slate-100 bg-slate-50 rounded-xl py-3 mb-4">
                        <div className="text-center px-1">
                            <div className="text-xs font-bold text-slate-900">$0.00</div>
                            <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Insurance</div>
                        </div>
                        <div className="text-center px-1">
                            <div className="text-xs font-bold text-slate-900">$0.00</div>
                            <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Uninvoiced</div>
                        </div>
                        <div className="text-center px-1">
                            <div className="text-xs font-bold text-slate-900">$0.00</div>
                            <div className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Account credit</div>
                        </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-4">
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-medium">Uninvoiced</span>
                            <span className="text-slate-900 font-bold">$0.00</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-medium">Unpaid</span>
                            <span className="text-slate-900 font-bold">$0.00</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-slate-500 font-medium">Unclaimed</span>
                            <span className="text-slate-900 font-bold">$0.00</span>
                        </div>
                    </div>

                    <div className="mt-4">
                        <button className="text-brand text-xs font-bold hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Credit adjustment
                        </button>
                    </div>
                </div>

                {/* PAYMENT METHODS */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-2 font-bold text-slate-800 mb-2">
                        <CreditCard className="w-5 h-5 text-slate-400" />
                        <span>Payment methods</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                        Add and manage your patient's payment methods to streamline their invoicing and billing process.
                    </p>
                    <button className="text-brand text-xs font-bold hover:underline flex items-center gap-1">
                        <Plus className="w-3 h-3" /> New payment method
                    </button>
                </div>

                {/* AUTOGENERATE BILLING */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2 font-bold text-slate-800">
                            <Zap className="w-4 h-4 text-slate-400 fill-slate-400" />
                            <span className="text-sm">Autogenerate billing documents</span>
                        </div>
                        <button className="text-brand text-xs font-bold hover:underline">Edit</button>
                    </div>

                    <p className="text-[10px] text-slate-400 mb-4 leading-relaxed border-b border-slate-100 pb-4">
                        Automated billing documents will be generated on the last day of the month. Invoices and superbill receipts can be created manually anytime.
                    </p>

                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-slate-600">Automatically send superbill receipts</div>
                        <div className="text-[10px] font-medium text-slate-400">Not active</div>
                    </div>
                </div>

            </div>
        </div>
    )
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

function NewPatientModal({ onClose, onSave }: { onClose: () => void, onSave: (data: any) => void }) {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [status, setStatus] = useState('Active');
    const [idNumber, setIdNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    const handleSave = () => {
        if (!firstName || !lastName || !status) return; // Simple validation
        onSave({ firstName, lastName, status, idNumber, phone, email });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                        <Users className="w-5 h-5 text-slate-500" />
                        <span>New patient</span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">
                    {/* Row 1: Name */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">First name *</label>
                            <input
                                type="text"
                                value={firstName} onChange={e => setFirstName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Last name *</label>
                            <input
                                type="text"
                                value={lastName} onChange={e => setLastName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    </div>

                    {/* Row 2: Status & ID */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Status *</label>
                            <div className="relative">
                                <select
                                    value={status} onChange={e => setStatus(e.target.value)}
                                    className="w-full px-3 py-2 pl-9 border border-slate-300 rounded-lg text-sm appearance-none bg-white focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand font-medium text-slate-900"
                                >
                                    <option>Active</option>
                                    <option>Inactive</option>
                                    <option>Lead</option>
                                </select>
                                <div className={`absolute left-3 top-2.5 w-3 h-3 rounded-sm pointer-events-none ${status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Identification number</label>
                            <input
                                type="text"
                                value={idNumber} onChange={e => setIdNumber(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    </div>

                    {/* Row 3: Phone & Email */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Phone number</label>
                            <div className="flex">
                                <div className="flex items-center gap-1 px-3 py-2 border border-r-0 border-slate-300 rounded-l-lg bg-slate-50 text-sm font-bold text-slate-700 whitespace-nowrap">
                                    us +1 <ChevronDown className="w-3 h-3 text-slate-400" />
                                </div>
                                <input
                                    type="text" placeholder="(555) 000-0000"
                                    value={phone} onChange={e => setPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-r-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Email</label>
                            <input
                                type="email"
                                value={email} onChange={e => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                            />
                        </div>
                    </div>

                    {/* Row 4: Team Member */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Assign team member</label>
                        <div className="relative">
                            <div className="w-full px-2 py-1.5 border border-slate-300 rounded-lg text-sm min-h-[42px] flex items-center gap-2 flex-wrap bg-white focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded text-slate-800 font-medium text-xs border border-slate-200">
                                    Dayo Olufolaju <X className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                                </span>
                            </div>
                            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-brand hover:bg-brand-600 text-white font-bold rounded-lg text-sm shadow-sm transition-colors">
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}

function DocumentationTab({ notes }: { notes: any[] }) {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-2 font-bold text-slate-800 mb-6">
                    <FileText className="w-5 h-5 text-slate-500" />
                    <span>SOAP Notes History</span>
                </div>

                {(!notes || notes.length === 0) ? (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-slate-100 border-dashed">
                        <p className="text-slate-500 text-sm">No notes found for this patient.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {notes.map((note, idx) => (
                            <div key={idx} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h3 className="font-bold text-slate-800">{note.subject}</h3>
                                        <p className="text-xs text-slate-500 font-bold">{note.date} • {note.visitType || 'General Visit'}</p>
                                    </div>
                                    <button className="text-brand text-xs font-bold hover:underline">View details</button>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 mt-2">
                                    <div><span className="font-bold text-slate-700">S:</span> {note.subjective}</div>
                                    <div><span className="font-bold text-slate-700">O:</span> {note.objective}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function SoapNoteModal({ onClose, onSave }: any) {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [subject, setSubject] = useState('');
    const [s, setS] = useState('');
    const [o, setO] = useState('');
    const [a, setA] = useState('');
    const [p, setP] = useState('');

    const handleSave = () => {
        onSave({
            date,
            subject,
            subjective: s,
            objective: o,
            assessment: a,
            plan: p,
            visitType: 'Office Visit'
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-lg">
                        <FileText className="w-5 h-5 text-slate-500" />
                        <span>New SOAP Note</span>
                    </div>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Date *</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-bold text-slate-500">Subject *</label>
                            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Initial Consultation" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Subjective</label>
                        <textarea rows={3} value={s} onChange={e => setS(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Patient's description of symptoms/condition..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Objective</label>
                        <textarea rows={3} value={o} onChange={e => setO(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Measurable data, observations, test results..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Assessment</label>
                        <textarea rows={3} value={a} onChange={e => setA(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Analysis of the condition, diagnosis..." />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-slate-500">Plan</label>
                        <textarea rows={2} value={p} onChange={e => setP(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand" placeholder="Treatment plan, follow-up..." />
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0">
                    <button onClick={onClose} className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold text-sm bg-white hover:bg-slate-50 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="px-6 py-2 bg-brand hover:bg-brand-600 text-white font-bold rounded-lg text-sm shadow-sm transition-colors">
                        Save Note
                    </button>
                </div>
            </div>
        </div>
    );
}
