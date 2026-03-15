"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ArrowLeft,
    ClipboardPlus,
    CreditCard,
    FileText,
    FlaskConical,
    Inbox,
    LayoutGrid,
    Microscope,
    Pill,
    Plus,
    Save,
    ShieldCheck,
    Stethoscope,
    UserRound
} from 'lucide-react';
import { toast } from 'sonner';
import { apiFetchJson } from '@/lib/api-client';
import { useAuthUser } from '@/hooks/useAuthUser';
import type { PatientDetailRecord, PatientDetailResponse } from '@/lib/patient-registry-types';

type PatientDetailTab =
    | 'Overview'
    | 'Clinical'
    | 'Medications/eRx'
    | 'Orders'
    | 'Imaging'
    | 'Labs & Vitals'
    | 'Documents'
    | 'Encounters'
    | 'Inbox'
    | 'Billing';

const PATIENT_DETAIL_TABS: Array<{ id: PatientDetailTab; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'Overview', icon: LayoutGrid },
    { id: 'Clinical', icon: Stethoscope },
    { id: 'Medications/eRx', icon: Pill },
    { id: 'Orders', icon: ClipboardPlus },
    { id: 'Imaging', icon: Microscope },
    { id: 'Labs & Vitals', icon: FlaskConical },
    { id: 'Documents', icon: FileText },
    { id: 'Encounters', icon: Activity },
    { id: 'Inbox', icon: Inbox },
    { id: 'Billing', icon: CreditCard }
];

function toAge(dob: string | null) {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (Number.isNaN(birthDate.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age -= 1;
    }

    return age;
}

export function PatientDetailClient({ patientId }: { patientId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user: activeUser, isReady } = useAuthUser();
    const [activeTab, setActiveTab] = React.useState<PatientDetailTab>('Overview');
    const [isEditingDemographics, setIsEditingDemographics] = React.useState(false);
    const [showProblemForm, setShowProblemForm] = React.useState(false);
    const [showMedicationForm, setShowMedicationForm] = React.useState(false);
    const [demographicsForm, setDemographicsForm] = React.useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        sex: '',
        state: '',
        primaryConcern: '',
        preferredPharmacy: '',
        allergies: ''
    });
    const [problemForm, setProblemForm] = React.useState({ code: '', description: '' });
    const [medicationForm, setMedicationForm] = React.useState({ name: '', dosage: '', frequency: '', route: '', status: 'Active' });

    const detailQueryKey = React.useMemo(
        () => ['patient-detail', activeUser?.uid ?? 'anonymous', patientId] as const,
        [activeUser?.uid, patientId]
    );

    const detailQuery = useQuery({
        queryKey: detailQueryKey,
        enabled: isReady && Boolean(activeUser),
        queryFn: async () => {
            const payload = await apiFetchJson<PatientDetailResponse>(`/api/patients/${patientId}`, {
                method: 'GET',
                user: activeUser,
                cache: 'no-store'
            });

            if (!payload.success || !payload.patient) {
                throw new Error(payload.error || 'Failed to load patient detail.');
            }

            return payload.patient;
        }
    });

    React.useEffect(() => {
        const patient = detailQuery.data;
        if (!patient) return;

        const [firstName, ...lastNameParts] = patient.name.split(' ');
        setDemographicsForm({
            firstName: firstName ?? '',
            lastName: lastNameParts.join(' '),
            email: patient.email ?? '',
            phone: patient.phone ?? '',
            dob: patient.dob ?? '',
            sex: patient.sex ?? '',
            state: patient.state ?? '',
            primaryConcern: patient.primaryConcern ?? '',
            preferredPharmacy: patient.preferredPharmacy ?? '',
            allergies: patient.allergies.join(', ')
        });
    }, [detailQuery.data]);

    const updateMutation = useMutation({
        mutationFn: async (payload: { action: string; values: Record<string, unknown> }) => {
            const response = await apiFetchJson<PatientDetailResponse>(`/api/patients/${patientId}`, {
                method: 'PATCH',
                user: activeUser,
                body: payload
            });

            if (!response.success || !response.patient) {
                throw new Error(response.error || 'Failed to update patient.');
            }

            return response.patient;
        },
        onSuccess: (patient) => {
            queryClient.setQueryData(detailQueryKey, patient);
        }
    });

    const patient = detailQuery.data;
    const age = toAge(patient?.dob ?? null);

    const handleSaveDemographics = async () => {
        try {
            await updateMutation.mutateAsync({
                action: 'update_demographics',
                values: {
                    ...demographicsForm,
                    allergies: demographicsForm.allergies
                        .split(',')
                        .map((entry) => entry.trim())
                        .filter(Boolean)
                }
            });
            setIsEditingDemographics(false);
            toast.success('Patient demographics updated.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to update patient.');
        }
    };

    const handleAddProblem = async () => {
        try {
            await updateMutation.mutateAsync({
                action: 'add_problem',
                values: problemForm
            });
            setProblemForm({ code: '', description: '' });
            setShowProblemForm(false);
            toast.success('Problem added.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add problem.');
        }
    };

    const handleAddMedication = async () => {
        try {
            await updateMutation.mutateAsync({
                action: 'add_medication',
                values: medicationForm
            });
            setMedicationForm({ name: '', dosage: '', frequency: '', route: '', status: 'Active' });
            setShowMedicationForm(false);
            toast.success('Medication added.');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to add medication.');
        }
    };

    if (!isReady || detailQuery.isLoading) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand" />
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {detailQuery.error instanceof Error ? detailQuery.error.message : 'Patient could not be loaded.'}
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-8">
            <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
                <button
                    type="button"
                    onClick={() => router.push('/patients')}
                    className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-brand"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Registry
                </button>

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-5">
                        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-3xl font-black text-slate-500">
                            {patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}
                        </div>
                        <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-3">
                                <h1 className="text-4xl font-black tracking-tight text-slate-900">{patient.name}</h1>
                                <span className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.18em] ${patient.statusColor}`}>
                                    {patient.statusLabel}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-500">
                                <span>DOB: {patient.dob ?? '—'}{age !== null ? ` (${age}y)` : ''}</span>
                                <span>Sex: {patient.sex ?? '—'}</span>
                                <span>MRN: {patient.mrn}</span>
                                <span>State: {patient.state ?? '—'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-start gap-3 lg:items-end">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
                            <ShieldCheck className="h-4 w-4" />
                            Allergies: {patient.allergies.join(', ')}
                        </div>
                        <div className="text-sm font-semibold text-slate-500">
                            Last activity: {patient.lastActivityAt ? new Date(patient.lastActivityAt).toLocaleString() : 'No recent activity'}
                        </div>
                    </div>
                </div>

                <div className="-mb-8 mt-8 flex gap-1 overflow-x-auto border-t border-slate-100 pt-4">
                    {PATIENT_DETAIL_TABS.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex shrink-0 items-center gap-2 border-b-4 px-4 py-3 text-xs font-black uppercase tracking-[0.16em] transition ${activeTab === tab.id
                                ? 'border-brand bg-brand/5 text-brand'
                                : 'border-transparent text-slate-400 hover:border-slate-200 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.id}
                        </button>
                    ))}
                </div>
            </section>

            {activeTab === 'Overview' && (
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr),minmax(340px,1fr)]">
                    <div className="space-y-8">
                        <ProblemListSection
                            patient={patient}
                            problemForm={problemForm}
                            showProblemForm={showProblemForm}
                            setShowProblemForm={setShowProblemForm}
                            setProblemForm={setProblemForm}
                            handleAddProblem={handleAddProblem}
                            updatePending={updateMutation.isPending}
                        />
                        <MedicationSection
                            patient={patient}
                            medicationForm={medicationForm}
                            showMedicationForm={showMedicationForm}
                            setShowMedicationForm={setShowMedicationForm}
                            setMedicationForm={setMedicationForm}
                            handleAddMedication={handleAddMedication}
                            updatePending={updateMutation.isPending}
                        />
                        <EncounterSection patient={patient} />
                    </div>

                    <aside className="space-y-8">
                        <DemographicsSection
                            patient={patient}
                            age={age}
                            isEditingDemographics={isEditingDemographics}
                            setIsEditingDemographics={setIsEditingDemographics}
                            demographicsForm={demographicsForm}
                            setDemographicsForm={setDemographicsForm}
                            handleSaveDemographics={handleSaveDemographics}
                            updatePending={updateMutation.isPending}
                        />
                    </aside>
                </div>
            )}

            {activeTab === 'Clinical' && (
                <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr),minmax(340px,1fr)]">
                    <div className="space-y-8">
                        <ProblemListSection
                            patient={patient}
                            problemForm={problemForm}
                            showProblemForm={showProblemForm}
                            setShowProblemForm={setShowProblemForm}
                            setProblemForm={setProblemForm}
                            handleAddProblem={handleAddProblem}
                            updatePending={updateMutation.isPending}
                        />
                        <EncounterSection patient={patient} />
                    </div>
                    <aside className="space-y-8">
                        <DemographicsSection
                            patient={patient}
                            age={age}
                            isEditingDemographics={isEditingDemographics}
                            setIsEditingDemographics={setIsEditingDemographics}
                            demographicsForm={demographicsForm}
                            setDemographicsForm={setDemographicsForm}
                            handleSaveDemographics={handleSaveDemographics}
                            updatePending={updateMutation.isPending}
                        />
                        <CareTeamSection patient={patient} />
                    </aside>
                </div>
            )}

            {activeTab === 'Medications/eRx' && (
                <MedicationSection
                    patient={patient}
                    medicationForm={medicationForm}
                    showMedicationForm={showMedicationForm}
                    setShowMedicationForm={setShowMedicationForm}
                    setMedicationForm={setMedicationForm}
                    handleAddMedication={handleAddMedication}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Encounters' && <EncounterSection patient={patient} />}

            {activeTab === 'Orders' && (
                <EmptyTabState
                    title="Orders"
                    description="Orders are not populated from a provider-scoped API yet for this patient."
                />
            )}

            {activeTab === 'Imaging' && (
                <EmptyTabState
                    title="Imaging"
                    description="Imaging results are not populated from a provider-scoped API yet for this patient."
                />
            )}

            {activeTab === 'Labs & Vitals' && (
                <EmptyTabState
                    title="Labs & Vitals"
                    description="Labs and vitals are not populated from a provider-scoped API yet for this patient."
                />
            )}

            {activeTab === 'Documents' && (
                <EmptyTabState
                    title="Documents"
                    description="Documents are not populated from a provider-scoped API yet for this patient."
                />
            )}

            {activeTab === 'Inbox' && (
                <EmptyTabState
                    title="Inbox"
                    description="Patient message history is not populated from a provider-scoped API yet for this patient."
                />
            )}

            {activeTab === 'Billing' && (
                <EmptyTabState
                    title="Billing"
                    description="Billing data is not populated from a provider-scoped API yet for this patient."
                />
            )}
        </div>
    );
}

function ProblemListSection({
    patient,
    problemForm,
    showProblemForm,
    setShowProblemForm,
    setProblemForm,
    handleAddProblem,
    updatePending
}: {
    patient: PatientDetailRecord;
    problemForm: { code: string; description: string };
    showProblemForm: boolean;
    setShowProblemForm: React.Dispatch<React.SetStateAction<boolean>>;
    setProblemForm: React.Dispatch<React.SetStateAction<{ code: string; description: string }>>;
    handleAddProblem: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-brand" />
                    <h2 className="text-xl font-black text-slate-900">Problem List</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowProblemForm((current) => !current)}
                    className="text-sm font-black text-brand transition hover:text-brand-600"
                >
                    + Add Diagnosis
                </button>
            </div>

            {showProblemForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px,minmax(0,1fr),auto]">
                    <input
                        value={problemForm.code}
                        onChange={(event) => setProblemForm((current) => ({ ...current, code: event.target.value }))}
                        placeholder="ICD-10"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <input
                        value={problemForm.description}
                        onChange={(event) => setProblemForm((current) => ({ ...current, description: event.target.value }))}
                        placeholder="Problem description"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <button
                        type="button"
                        onClick={() => void handleAddProblem()}
                        disabled={updatePending}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                        <Plus className="h-4 w-4" />
                        Add
                    </button>
                </div>
            )}

            <div className="space-y-3">
                {patient.problemList.length > 0 ? patient.problemList.map((problem) => (
                    <div key={problem.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 px-4 py-4">
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{problem.code}</span>
                        <div className="min-w-0">
                            <div className="text-sm font-bold text-slate-900">{problem.description}</div>
                            <div className="text-xs text-slate-500">
                                Added {problem.createdAt ? new Date(problem.createdAt).toLocaleDateString() : 'recently'}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
                        No active problems recorded.
                    </div>
                )}
            </div>
        </section>
    );
}

function MedicationSection({
    patient,
    medicationForm,
    showMedicationForm,
    setShowMedicationForm,
    setMedicationForm,
    handleAddMedication,
    updatePending
}: {
    patient: PatientDetailRecord;
    medicationForm: { name: string; dosage: string; frequency: string; route: string; status: string };
    showMedicationForm: boolean;
    setShowMedicationForm: React.Dispatch<React.SetStateAction<boolean>>;
    setMedicationForm: React.Dispatch<React.SetStateAction<{ name: string; dosage: string; frequency: string; route: string; status: string }>>;
    handleAddMedication: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Pill className="h-5 w-5 text-brand" />
                    <h2 className="text-xl font-black text-slate-900">Active Medications</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setShowMedicationForm((current) => !current)}
                    className="text-sm font-black text-brand transition hover:text-brand-600"
                >
                    + Add Medication
                </button>
            </div>

            {showMedicationForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <input
                        value={medicationForm.name}
                        onChange={(event) => setMedicationForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Medication name"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <input
                        value={medicationForm.dosage}
                        onChange={(event) => setMedicationForm((current) => ({ ...current, dosage: event.target.value }))}
                        placeholder="Dosage"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <input
                        value={medicationForm.frequency}
                        onChange={(event) => setMedicationForm((current) => ({ ...current, frequency: event.target.value }))}
                        placeholder="Frequency"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <input
                        value={medicationForm.route}
                        onChange={(event) => setMedicationForm((current) => ({ ...current, route: event.target.value }))}
                        placeholder="Route"
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-brand"
                    />
                    <div className="md:col-span-2">
                        <button
                            type="button"
                            onClick={() => void handleAddMedication()}
                            disabled={updatePending}
                            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                        >
                            <ClipboardPlus className="h-4 w-4" />
                            Save Medication
                        </button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {patient.activeMedications.length > 0 ? patient.activeMedications.map((medication) => (
                    <div key={medication.id} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-4">
                        <div>
                            <div className="text-sm font-black text-slate-900">{medication.name}</div>
                            <div className="text-xs font-semibold text-slate-500">
                                {medication.dosage} • {medication.frequency}{medication.route ? ` • ${medication.route}` : ''}
                            </div>
                        </div>
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
                            {medication.status}
                        </span>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
                        No active medications recorded.
                    </div>
                )}
            </div>
        </section>
    );
}

function EncounterSection({ patient }: { patient: PatientDetailRecord }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <ClipboardPlus className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-black text-slate-900">Recent Encounters</h2>
            </div>
            <div className="space-y-3">
                {patient.recentEncounters.length > 0 ? patient.recentEncounters.map((encounter) => (
                    <div key={encounter.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{encounter.title}</div>
                                <div className="text-xs font-semibold text-slate-500">
                                    {new Date(encounter.date).toLocaleDateString()} • {encounter.provider} • {encounter.type}
                                </div>
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                                {encounter.status}
                            </span>
                        </div>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
                        No recent encounters recorded.
                    </div>
                )}
            </div>
        </section>
    );
}

function DemographicsSection({
    patient,
    age,
    isEditingDemographics,
    setIsEditingDemographics,
    demographicsForm,
    setDemographicsForm,
    handleSaveDemographics,
    updatePending
}: {
    patient: PatientDetailRecord;
    age: number | null;
    isEditingDemographics: boolean;
    setIsEditingDemographics: React.Dispatch<React.SetStateAction<boolean>>;
    demographicsForm: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dob: string;
        sex: string;
        state: string;
        primaryConcern: string;
        preferredPharmacy: string;
        allergies: string;
    };
    setDemographicsForm: React.Dispatch<React.SetStateAction<{
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dob: string;
        sex: string;
        state: string;
        primaryConcern: string;
        preferredPharmacy: string;
        allergies: string;
    }>>;
    handleSaveDemographics: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <UserRound className="h-5 w-5 text-brand" />
                    <h2 className="text-xl font-black text-slate-900">Demographics</h2>
                </div>
                <button
                    type="button"
                    onClick={() => setIsEditingDemographics((current) => !current)}
                    className="text-sm font-black text-brand transition hover:text-brand-600"
                >
                    {isEditingDemographics ? 'Cancel' : 'Edit'}
                </button>
            </div>

            {isEditingDemographics ? (
                <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <Input label="First Name" value={demographicsForm.firstName} onChange={(value) => setDemographicsForm((current) => ({ ...current, firstName: value }))} />
                        <Input label="Last Name" value={demographicsForm.lastName} onChange={(value) => setDemographicsForm((current) => ({ ...current, lastName: value }))} />
                        <Input label="DOB" type="date" value={demographicsForm.dob} onChange={(value) => setDemographicsForm((current) => ({ ...current, dob: value }))} />
                        <Input label="Sex" value={demographicsForm.sex} onChange={(value) => setDemographicsForm((current) => ({ ...current, sex: value }))} />
                        <Input label="State" value={demographicsForm.state} onChange={(value) => setDemographicsForm((current) => ({ ...current, state: value }))} />
                        <Input label="Phone" value={demographicsForm.phone} onChange={(value) => setDemographicsForm((current) => ({ ...current, phone: value }))} />
                    </div>
                    <Input label="Email" value={demographicsForm.email} onChange={(value) => setDemographicsForm((current) => ({ ...current, email: value }))} />
                    <Input label="Primary Concern" value={demographicsForm.primaryConcern} onChange={(value) => setDemographicsForm((current) => ({ ...current, primaryConcern: value }))} />
                    <Input label="Preferred Pharmacy" value={demographicsForm.preferredPharmacy} onChange={(value) => setDemographicsForm((current) => ({ ...current, preferredPharmacy: value }))} />
                    <TextArea label="Allergies (comma separated)" value={demographicsForm.allergies} onChange={(value) => setDemographicsForm((current) => ({ ...current, allergies: value }))} />
                    <button
                        type="button"
                        onClick={() => void handleSaveDemographics()}
                        disabled={updatePending}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
                    >
                        <Save className="h-4 w-4" />
                        Save
                    </button>
                </div>
            ) : (
                <div className="space-y-4 text-sm">
                    <DataField label="Name" value={patient.name} />
                    <DataField label="DOB" value={patient.dob ?? '—'} />
                    <DataField label="Age / Sex" value={`${age ?? '—'} / ${patient.sex ?? '—'}`} />
                    <DataField label="State" value={patient.state ?? '—'} />
                    <DataField label="Primary Concern" value={patient.primaryConcern ?? '—'} />
                    <DataField label="Phone" value={patient.phone ?? '—'} />
                    <DataField label="Email" value={patient.email ?? '—'} />
                    <DataField label="Care Team" value={patient.careTeam.map((member) => member.name).join(', ') || 'Not assigned'} />
                    <DataField label="Preferred Pharmacy" value={patient.preferredPharmacy ?? 'Not recorded'} />
                </div>
            )}
        </section>
    );
}

function CareTeamSection({ patient }: { patient: PatientDetailRecord }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-brand" />
                <h2 className="text-xl font-black text-slate-900">Care Team</h2>
            </div>
            <div className="space-y-3">
                {patient.careTeam.length > 0 ? patient.careTeam.map((member, index) => (
                    <div key={`${member.role}-${member.name}-${index}`} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{member.role}</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{member.name}</div>
                    </div>
                )) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
                        No care team assigned.
                    </div>
                )}
            </div>
        </section>
    );
}

function EmptyTabState({ title, description }: { title: string; description: string }) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto max-w-2xl">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">{title}</h2>
                <p className="mt-3 text-sm font-medium leading-6 text-slate-500">{description}</p>
            </div>
        </section>
    );
}

function Input({
    label,
    value,
    onChange,
    type = 'text'
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <input
                type={type}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand focus:bg-white"
            />
        </label>
    );
}

function TextArea({
    label,
    value,
    onChange
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <textarea
                rows={3}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand focus:bg-white"
            />
        </label>
    );
}

function DataField({ label, value }: { label: string; value: string }) {
    return (
        <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
            <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</div>
            <div className="mt-1 text-base font-bold text-slate-900">{value}</div>
        </div>
    );
}
