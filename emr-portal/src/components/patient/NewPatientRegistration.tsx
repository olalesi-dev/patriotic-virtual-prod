"use client";

import React, { useState, useEffect } from 'react';
import {
    X, ChevronRight, Check, AlertCircle, Search,
    Calendar, MapPin, Phone, Mail, User, ShieldCheck,
    CreditCard, Zap, Sparkles, ClipboardCheck, Info,
    ChevronDown, Plus, Download, Send, PhoneCall, FileText
} from 'lucide-react';

interface NewPatientRegistrationProps {
    onClose: () => void;
    onComplete: (patientData: any) => void;
}

const LICENSED_STATES = [
    'California', 'Texas', 'Florida', 'New York', 'New Jersey',
    'Pennsylvania', 'Georgia', 'Ohio', 'North Carolina', 'Michigan', 'Washington'
];

const PRIMARY_CONCERNS = [
    'Weight Loss', 'Men\'s Health', 'Hair Loss', 'Sexual Health', 'Hormone Optimization', 'General'
];

const REFERRAL_SOURCES = [
    'Instagram', 'TikTok', 'Google', 'Facebook', 'Friend/Family', 'Provider Referral', 'Other'
];

const STATUS_OPTIONS = [
    'Pending Intake', 'Active', 'Inactive', 'Waitlist', 'Discharged'
];

const ASSIGNED_PROVIDERS = [
    { id: 1, name: 'Dr. Dayo Olufolaju', specialty: 'Family Medicine' },
    { id: 2, name: 'Dr. Jane Smith', specialty: 'Endocrinology' },
    { id: 3, name: 'Dr. Michael Chen', specialty: 'Internal Medicine' }
];

export default function NewPatientRegistration({ onClose, onComplete }: NewPatientRegistrationProps) {
    const [step, setStep] = useState(1); // 1: Form, 2: Consent, 3: Success Queue
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        dob: '',
        sexAtBirth: '',
        genderIdentity: '',
        state: '',
        address1: '',
        address2: '',
        city: '',
        zipCode: '',
        phone: '',
        email: '',
        emergencyContactName: '',
        emergencyContactPhone: '',
        preferredPharmacy: '',
        primaryConcern: '',
        referralSource: '',
        assignedProviderId: '',
        status: 'Pending Intake',
        tags: [] as string[]
    });

    const [generatedMrn, setGeneratedMrn] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tagInput, setTagInput] = useState('');

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.firstName || formData.firstName.length > 50) newErrors.firstName = 'Required, max 50 chars';
        if (!formData.lastName || formData.lastName.length > 50) newErrors.lastName = 'Required, max 50 chars';

        if (!formData.dob) {
            newErrors.dob = 'Required';
        } else {
            const birthDate = new Date(formData.dob);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) newErrors.dob = 'Registration blocked: Patient must be 18+';
        }

        if (!formData.sexAtBirth) newErrors.sexAtBirth = 'Required';
        if (!formData.state) {
            newErrors.state = 'Required';
        } else if (!LICENSED_STATES.includes(formData.state)) {
            newErrors.state = 'We do not yet serve your state.';
        }

        if (!formData.address1) newErrors.address1 = 'Required';
        if (!formData.city) newErrors.city = 'Required';
        if (!formData.zipCode || !/^\d{5}(-\d{4})?$/.test(formData.zipCode)) newErrors.zipCode = 'Valid US Zip required';
        if (!formData.phone || !/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/.test(formData.phone)) newErrors.phone = 'Valid US phone required';
        if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Valid email required';

        if (!formData.emergencyContactName) newErrors.emergencyContactName = 'Required for telehealth';
        if (!formData.emergencyContactPhone) {
            newErrors.emergencyContactPhone = 'Required';
        } else if (formData.emergencyContactPhone === formData.phone) {
            newErrors.emergencyContactPhone = 'Must be different from patient phone';
        }

        if (!formData.primaryConcern) newErrors.primaryConcern = 'Required for routing';
        if (!formData.assignedProviderId) newErrors.assignedProviderId = 'Provider assignment required';
        if (!formData.status) newErrors.status = 'Required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Auto-fill city from ZIP
    useEffect(() => {
        if (formData.zipCode.length === 5) {
            const mockZipMap: Record<string, string> = {
                '90210': 'Beverly Hills', '10001': 'New York', '33101': 'Miami',
                '75001': 'Dallas', '60601': 'Chicago', '30301': 'Atlanta',
                '19101': 'Philadelphia', '43201': 'Columbus', '28201': 'Charlotte',
                '48201': 'Detroit', '98101': 'Seattle'
            };
            if (mockZipMap[formData.zipCode]) {
                setFormData(prev => ({ ...prev, city: mockZipMap[formData.zipCode] }));
            }
        }
    }, [formData.zipCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        // 1) MRN auto-generated (Stable)
        const newMrn = `PT-${Math.floor(100000 + Math.random() * 900000)}`;
        setGeneratedMrn(newMrn);

        // Simulate API Calls
        await new Promise(resolve => setTimeout(resolve, 1500));

        // 3) Stripe customer created and linked (Simulated)
        // 4) Welcome email/SMS sent (Simulated)
        // 5) AI intake invitation sent (Simulated)

        setIsSubmitting(false);
        setStep(2); // Move to Consent Step
    };

    const handleCompleteRegistration = () => {
        const finalData = {
            ...formData,
            mrn: generatedMrn,
            id: Date.now()
        };
        onComplete(finalData);
    };

    const addTag = () => {
        if (tagInput && !formData.tags.includes(tagInput)) {
            setFormData({ ...formData, tags: [...formData.tags, tagInput] });
            setTagInput('');
        }
    };

    const removeTag = (tag: string) => {
        setFormData({ ...formData, tags: formData.tags.filter(t => t !== tag) });
    };

    if (step === 3) {
        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                    <div className="p-12 text-center">
                        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-8">
                            <Check className="w-12 h-12 text-emerald-500" />
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-4">Registration Complete!</h2>
                        <div className="bg-brand/5 border border-brand/10 p-4 rounded-3xl mb-8 flex flex-col items-center">
                            <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-1">Generated Identifier (MRN)</span>
                            <span className="text-2xl font-black text-slate-900 tracking-tighter">{generatedMrn}</span>
                        </div>
                        <p className="text-slate-500 font-medium mb-8">Patient has been added to the queue, and all invitations have been dispatched.</p>

                        <div className="space-y-3 mb-10">
                            {[
                                { text: 'MRN Generated', icon: ClipboardCheck },
                                { text: 'Consent Forms Sent', icon: FileText },
                                { text: 'Stripe Account Created', icon: CreditCard },
                                { text: 'Welcome Comms Sent', icon: Send },
                                { text: 'AI Intake Invitation Sent', icon: Sparkles }
                            ].map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    <item.icon className="w-5 h-5 text-brand" />
                                    <span className="text-sm font-bold text-slate-700">{item.text}</span>
                                    <Check className="w-4 h-4 text-emerald-500 ml-auto" />
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={handleCompleteRegistration}
                            className="w-full py-4 bg-brand text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95"
                        >
                            Back to Registry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
                    <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <span className="text-[10px] font-black text-brand uppercase tracking-[0.2em] mb-2 block">Step 2 of 3</span>
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Consent & Disclosures</h2>
                        </div>
                        <button onClick={onClose} className="p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 hover:text-slate-600 transition-all">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-[2.5rem] flex gap-4">
                            <ShieldCheck className="w-6 h-6 text-indigo-600 shrink-0" />
                            <div>
                                <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight mb-2">Legal Verification Required</h4>
                                <p className="text-xs text-indigo-700 font-medium leading-relaxed">Please confirm you have presented the following disclosures to the patient and obtained verbal or written authorization.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { title: 'Telehealth Consent', desc: 'Patient agrees to synchronous and asynchronous virtual care.' },
                                { title: 'HIPAA Privacy Disclosure', desc: 'Authorizes the storage and sharing of PHI for TPO purposes.' },
                                { title: 'Financial Policy', desc: 'Patient accepts responsibility for membership fees and late cancellation charges.' },
                                { title: 'Arbitration Agreement', desc: 'Standard clinical dispute resolution terms.' }
                            ].map((item, i) => (
                                <div key={i} className="flex items-start gap-4 p-5 rounded-[2rem] border border-slate-100 hover:border-brand/20 hover:bg-brand/5 transition-all cursor-pointer group">
                                    <div className="w-6 h-6 rounded-lg border-2 border-slate-200 group-hover:border-brand flex items-center justify-center transition-colors mt-0.5">
                                        <div className="w-3 h-3 bg-brand rounded-sm opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    </div>
                                    <div>
                                        <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.title}</h5>
                                        <p className="text-xs text-slate-500 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-4">
                        <button onClick={() => setStep(1)} className="px-8 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all">
                            Back
                        </button>
                        <button
                            onClick={() => setStep(3)}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Finalize Registration <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-12 duration-700">
                {/* Header */}
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-brand/10">
                        <div className="h-full bg-brand transition-all duration-500" style={{ width: '33.33%' }}></div>
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-2 h-2 rounded-full bg-brand animate-pulse"></span>
                            <span className="text-[10px] font-black text-brand uppercase tracking-[0.3em]">Patient Onboarding</span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">New Registration</h2>
                    </div>
                    <button onClick={onClose} className="p-4 bg-slate-50 hover:bg-brand/5 rounded-3xl border border-slate-100 text-slate-400 hover:text-brand transition-all">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                        {/* SECTION 1: PERSONAL INFORMATION */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <User className="w-5 h-5 text-brand" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Identity & Demographics</h3>
                            </div>

                            <RegistrationField label="First Name" required value={formData.firstName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, firstName: e.target.value })} error={errors.firstName} />
                            <RegistrationField label="Last Name" required value={formData.lastName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lastName: e.target.value })} error={errors.lastName} />
                            <RegistrationField label="Date of Birth" required type="date" value={formData.dob} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dob: e.target.value })} error={errors.dob} helper="Must be 18+" />

                            <div className="grid grid-cols-2 gap-4">
                                <RegistrationSelect label="Sex at Birth" required value={formData.sexAtBirth} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, sexAtBirth: e.target.value })} error={errors.sexAtBirth} options={['Male', 'Female']} />
                                <RegistrationSelect label="Gender Identity" value={formData.genderIdentity} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, genderIdentity: e.target.value })} options={['Man', 'Woman', 'Non-binary', 'Prefer not to say']} />
                            </div>
                        </div>

                        {/* SECTION 2: CONTACT & ADDRESS */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <MapPin className="w-5 h-5 text-brand" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Location & Contact</h3>
                            </div>

                            <RegistrationSelect
                                label="State of Residence"
                                required
                                value={formData.state}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, state: e.target.value })}
                                error={errors.state}
                                options={LICENSED_STATES}
                                helper="Registration blocked for non-licensed states"
                            />

                            <RegistrationField label="Address Line 1" required value={formData.address1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, address1: e.target.value })} error={errors.address1} />

                            <div className="grid grid-cols-2 gap-4">
                                <RegistrationField label="City" required value={formData.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, city: e.target.value })} error={errors.city} />
                                <RegistrationField label="Zip Code" required value={formData.zipCode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, zipCode: e.target.value })} error={errors.zipCode} placeholder="12345" />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <RegistrationField label="Phone Number" required value={formData.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })} error={errors.phone} placeholder="(555) 000-0000" />
                                <RegistrationField label="Email Address" required type="email" value={formData.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })} error={errors.email} />
                            </div>
                        </div>

                        {/* SECTION 3: CLINICAL & OPERATIONS */}
                        <div className="space-y-8">
                            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                                <ClipboardCheck className="w-5 h-5 text-brand" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Clinical Routing</h3>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-3xl space-y-4">
                                <RegistrationSelect label="Primary Concern" required value={formData.primaryConcern} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, primaryConcern: e.target.value })} error={errors.primaryConcern} options={PRIMARY_CONCERNS} />
                                <RegistrationSelect label="Assigned Provider" required value={formData.assignedProviderId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, assignedProviderId: e.target.value })} error={errors.assignedProviderId} options={ASSIGNED_PROVIDERS.map(p => p.name)} />
                                <RegistrationSelect label="Starting Status" required value={formData.status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, status: e.target.value })} error={errors.status} options={STATUS_OPTIONS} />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Internal Tags</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)}
                                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                                            placeholder="VIP, Spanish..."
                                            className="flex-1 px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all placeholder:text-slate-300"
                                        />
                                        <button type="button" onClick={addTag} className="p-4 bg-brand text-white rounded-2xl hover:bg-brand-600 transition-all">
                                            <Plus className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {formData.tags.map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand/5 border border-brand/10 rounded-xl text-brand text-xs font-black uppercase tracking-tight">
                                                {tag}
                                                <X className="w-3 h-3 cursor-pointer hover:text-brand-600" onClick={() => removeTag(tag)} />
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Emergency Contact */}
                        <div className="bg-rose-50/50 border border-rose-100 p-8 rounded-[3rem] space-y-6">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-rose-500" />
                                <h3 className="text-xs font-black text-rose-500 uppercase tracking-[0.2em]">Emergency Contact (Required)</h3>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RegistrationField label="Contact Full Name" required value={formData.emergencyContactName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, emergencyContactName: e.target.value })} error={errors.emergencyContactName} />
                                <RegistrationField label="Contact Phone" required value={formData.emergencyContactPhone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, emergencyContactPhone: e.target.value })} error={errors.emergencyContactPhone} placeholder="(555) 000-0000" />
                            </div>
                        </div>

                        {/* Marketing & Pharmacy */}
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <RegistrationSelect label="Referral Source" value={formData.referralSource} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, referralSource: e.target.value })} options={REFERRAL_SOURCES} />
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex justify-between items-center">
                                        Preferred Pharmacy
                                        <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded italic lowercase font-medium">DoseSpot Integrated</span>
                                    </label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                                        <input
                                            type="text"
                                            placeholder="Search pharmacies..."
                                            className="w-full pl-11 pr-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 focus:ring-brand/10 transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="p-10 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                    <div className="flex items-center gap-4 text-slate-400">
                        <div className="flex -space-x-3">
                            {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black">PT</div>)}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest">37 other registrations today</span>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-10 py-4 text-slate-500 font-black text-xs uppercase tracking-widest hover:text-slate-900 transition-all">
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-12 py-5 bg-brand text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-brand/20 hover:bg-brand-600 transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50 disabled:scale-100"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Registering...
                                </>
                            ) : (
                                <>
                                    Create Account <ChevronRight className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RegistrationField({ label, required, type = 'text', value, onChange, error, placeholder, helper }: any) {
    return (
        <div className="space-y-1.5 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-1 group-focus-within:text-brand transition-colors">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm font-bold focus:outline-none focus:ring-4 transition-all placeholder:text-slate-300 ${error ? 'border-rose-400 focus:ring-rose-400/10 text-rose-600' : 'border-slate-200 focus:ring-brand/10 text-slate-900'
                    }`}
            />
            {error && <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-tight mt-1 ml-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
            {helper && !error && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1 ml-1">{helper}</div>}
        </div>
    );
}

function RegistrationSelect({ label, required, value, onChange, error, options, helper }: any) {
    return (
        <div className="space-y-1.5 group">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-brand transition-colors">
                {label} {required && <span className="text-rose-500">*</span>}
            </label>
            <div className="relative">
                <select
                    value={value}
                    onChange={onChange}
                    className={`w-full px-5 py-4 bg-slate-50 border rounded-2xl text-sm font-bold appearance-none focus:outline-none focus:ring-4 transition-all cursor-pointer ${error ? 'border-rose-400 focus:ring-rose-400/10 text-rose-600' : 'border-slate-200 focus:ring-brand/10 text-slate-900 group-focus-within:border-brand-300'
                        }`}
                >
                    <option value="">Select...</option>
                    {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
                <ChevronDown className="absolute right-5 top-5 w-4 h-4 text-slate-400 pointer-events-none group-focus-within:text-brand transition-colors" />
            </div>
            {error && <div className="flex items-center gap-1 text-[9px] font-black text-rose-500 uppercase tracking-tight mt-1 ml-1"><AlertCircle className="w-3 h-3" /> {error}</div>}
            {helper && !error && <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1 ml-1">{helper}</div>}
        </div>
    );
}
