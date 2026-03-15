"use client";

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    Activity,
    ArrowLeft,
    Check,
    ChevronsUpDown,
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
    Search,
    Send,
    ShieldCheck,
    Stethoscope,
    UserRound,
    X
} from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { apiFetchJson } from '@/lib/api-client';
import { useAuthUser } from '@/hooks/useAuthUser';
import type {
    PatientDetailBilling,
    PatientDetailDocument,
    PatientDetailImagingStudy,
    PatientDetailMessage,
    PatientDetailObservation,
    PatientDetailOrder,
    PatientDetailRecord,
    PatientDetailResponse
} from '@/lib/patient-registry-types';

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

type MutationAction =
    | 'update_demographics'
    | 'add_problem'
    | 'update_problem'
    | 'add_medication'
    | 'update_medication'
    | 'add_order'
    | 'add_imaging'
    | 'add_observation'
    | 'add_document'
    | 'send_message'
    | 'add_billing_statement';

type MutationPayload = {
    action: MutationAction;
    values: Record<string, unknown>;
};

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

const SEX_OPTIONS = ['Male', 'Female', 'Other', 'Unknown'];
const MEDICATION_ROUTE_OPTIONS = ['PO', 'IM', 'IV', 'SQ', 'Topical', 'Inhaled'];
const MEDICATION_STATUS_OPTIONS = ['Active', 'Held', 'Completed', 'Discontinued'];
const ORDER_TYPE_OPTIONS = ['lab', 'referral', 'consult', 'procedure', 'rx'];
const ORDER_STATUS_OPTIONS = ['Ordered', 'Sent', 'In Progress', 'Scheduled', 'Resulted'];
const IMAGING_MODALITY_OPTIONS = ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'DEXA', 'Mammography'];
const IMAGING_STATUS_OPTIONS = ['Ordered', 'Scheduled', 'Completed', 'Results Available', 'Reported'];
const OBSERVATION_CATEGORY_OPTIONS = ['lab', 'vital'];
const OBSERVATION_STATUS_OPTIONS = ['Recorded', 'Normal', 'Review Needed', 'Abnormal', 'Resulted'];
const DOCUMENT_CATEGORY_OPTIONS = ['Consent Forms', 'Clinical Notes', 'Lab Results', 'Imaging Reports', 'Referral', 'Other'];
const DOCUMENT_STATUS_OPTIONS = ['Available', 'Pending Signature', 'Signed', 'Uploaded'];
const BILLING_STATUS_OPTIONS = ['pending', 'paid', 'overdue', 'failed'];
const COMMON_ALLERGY_OPTIONS = ['NKDA', 'Penicillin', 'Sulfa', 'Latex', 'Peanuts', 'Shellfish'];
const COMMON_ORDER_TEST_OPTIONS = ['CMP', 'CBC', 'HbA1c', 'Lipid Panel', 'TSH', 'BMP', 'Urinalysis'];

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

function formatDateValue(value: string | null) {
    if (!value) return 'Not set';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return format(parsed, 'MMM d, yyyy');
}

function buildTempId(prefix: string) {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultBilling(): PatientDetailBilling {
    return {
        balance: 0,
        status: null,
        nextBillingDate: null,
        membershipPlan: null,
        stripePortalUrl: null,
        statements: []
    };
}

function applyOptimisticPatientUpdate(
    patient: PatientDetailRecord,
    payload: MutationPayload,
    activeUserName: string
): PatientDetailRecord {
    const now = new Date();
    const isoDate = now.toISOString().slice(0, 10);
    const isoDateTime = now.toISOString();

    if (payload.action === 'update_demographics') {
        const firstName = String(payload.values.firstName ?? '').trim();
        const lastName = String(payload.values.lastName ?? '').trim();
        const displayName = [firstName, lastName].filter(Boolean).join(' ') || patient.name;
        return {
            ...patient,
            name: displayName,
            email: String(payload.values.email ?? patient.email ?? '').trim() || patient.email,
            phone: String(payload.values.phone ?? patient.phone ?? '').trim() || patient.phone,
            dob: String(payload.values.dob ?? patient.dob ?? '').trim() || patient.dob,
            sex: String(payload.values.sex ?? patient.sex ?? '').trim() || patient.sex,
            state: String(payload.values.state ?? patient.state ?? '').trim() || patient.state,
            primaryConcern: String(payload.values.primaryConcern ?? patient.primaryConcern ?? '').trim() || patient.primaryConcern,
            preferredPharmacy: String(payload.values.preferredPharmacy ?? patient.preferredPharmacy ?? '').trim() || patient.preferredPharmacy,
            allergies: Array.isArray(payload.values.allergies)
                ? (payload.values.allergies as string[])
                : patient.allergies
        };
    }

    if (payload.action === 'add_problem') {
        return {
            ...patient,
            problemList: [{
                id: buildTempId('problem'),
                code: String(payload.values.code ?? 'DX').trim() || 'DX',
                description: String(payload.values.description ?? '').trim(),
                createdAt: isoDateTime
            }, ...patient.problemList]
        };
    }

    if (payload.action === 'update_problem') {
        const targetId = String(payload.values.id ?? '').trim();
        if (!targetId) return patient;

        return {
            ...patient,
            problemList: patient.problemList.map((problem) => (
                problem.id === targetId
                    ? {
                        ...problem,
                        code: String(payload.values.code ?? problem.code ?? 'DX').trim() || 'DX',
                        description: String(payload.values.description ?? problem.description ?? '').trim() || problem.description
                    }
                    : problem
            ))
        };
    }

    if (payload.action === 'add_medication') {
        return {
            ...patient,
            activeMedications: [{
                id: buildTempId('medication'),
                name: String(payload.values.name ?? '').trim(),
                dosage: String(payload.values.dosage ?? '').trim() || 'N/A',
                frequency: String(payload.values.frequency ?? '').trim() || 'Unspecified',
                route: String(payload.values.route ?? '').trim() || null,
                status: String(payload.values.status ?? 'Active').trim() || 'Active',
                startDate: String(payload.values.startDate ?? isoDate).trim() || isoDate
            }, ...patient.activeMedications]
        };
    }

    if (payload.action === 'update_medication') {
        const targetId = String(payload.values.id ?? '').trim();
        if (!targetId) return patient;

        return {
            ...patient,
            activeMedications: patient.activeMedications.map((medication) => (
                medication.id === targetId
                    ? {
                        ...medication,
                        name: String(payload.values.name ?? medication.name ?? '').trim() || medication.name,
                        dosage: String(payload.values.dosage ?? medication.dosage ?? 'N/A').trim() || 'N/A',
                        frequency: String(payload.values.frequency ?? medication.frequency ?? 'Unspecified').trim() || 'Unspecified',
                        route: String(payload.values.route ?? medication.route ?? '').trim() || null,
                        status: String(payload.values.status ?? medication.status ?? 'Active').trim() || 'Active',
                        startDate: String(payload.values.startDate ?? medication.startDate ?? '').trim() || medication.startDate
                    }
                    : medication
            ))
        };
    }

    if (payload.action === 'add_order') {
        return {
            ...patient,
            orders: [{
                id: buildTempId('order'),
                type: String(payload.values.type ?? 'lab').trim() || 'lab',
                description: String(payload.values.description ?? '').trim(),
                status: String(payload.values.status ?? 'Ordered').trim() || 'Ordered',
                orderedAt: String(payload.values.orderedAt ?? isoDate).trim() || isoDate,
                scheduledFor: String(payload.values.scheduledFor ?? '').trim() || null,
                provider: activeUserName,
                tests: Array.isArray(payload.values.tests) ? (payload.values.tests as string[]) : [],
                notes: String(payload.values.notes ?? '').trim() || null
            }, ...patient.orders]
        };
    }

    if (payload.action === 'add_imaging') {
        return {
            ...patient,
            imagingStudies: [{
                id: buildTempId('imaging'),
                modality: String(payload.values.modality ?? '').trim(),
                bodyPart: String(payload.values.bodyPart ?? '').trim() || 'Unknown',
                status: String(payload.values.status ?? 'Ordered').trim() || 'Ordered',
                date: String(payload.values.date ?? isoDate).trim() || isoDate,
                provider: activeUserName,
                facility: String(payload.values.facility ?? '').trim() || null,
                reportText: String(payload.values.reportText ?? '').trim() || null,
                viewerUrl: String(payload.values.viewerUrl ?? '').trim() || null
            }, ...patient.imagingStudies]
        };
    }

    if (payload.action === 'add_observation') {
        return {
            ...patient,
            observations: [{
                id: buildTempId('observation'),
                category: (String(payload.values.category ?? 'lab').trim() === 'vital' ? 'vital' : 'lab'),
                name: String(payload.values.name ?? '').trim(),
                date: String(payload.values.date ?? isoDate).trim() || isoDate,
                value: String(payload.values.value ?? '').trim(),
                unit: String(payload.values.unit ?? '').trim() || null,
                referenceRange: String(payload.values.referenceRange ?? '').trim() || null,
                status: String(payload.values.status ?? 'Recorded').trim() || 'Recorded',
                notes: String(payload.values.notes ?? '').trim() || null
            }, ...patient.observations]
        };
    }

    if (payload.action === 'add_document') {
        return {
            ...patient,
            documents: [{
                id: buildTempId('document'),
                name: String(payload.values.name ?? '').trim(),
                category: String(payload.values.category ?? 'Other').trim() || 'Other',
                date: String(payload.values.date ?? isoDate).trim() || isoDate,
                type: String(payload.values.type ?? 'File').trim() || 'File',
                url: String(payload.values.url ?? '').trim() || null,
                size: String(payload.values.size ?? '').trim() || null,
                status: String(payload.values.status ?? 'Available').trim() || 'Available'
            }, ...patient.documents]
        };
    }

    if (payload.action === 'send_message') {
        return {
            ...patient,
            messages: [{
                id: buildTempId('message'),
                senderName: activeUserName,
                senderType: 'provider',
                text: String(payload.values.text ?? '').trim(),
                timestamp: isoDateTime,
                unread: false
            }, ...patient.messages]
        };
    }

    if (payload.action === 'add_billing_statement') {
        const amount = Number(payload.values.amount ?? 0);
        const statement = {
            id: buildTempId('statement'),
            date: String(payload.values.date ?? isoDate).trim() || isoDate,
            amount: Number.isFinite(amount) ? amount : 0,
            status: String(payload.values.status ?? 'pending').trim() || 'pending',
            items: [{
                description: String(payload.values.description ?? '').trim(),
                amount: Number.isFinite(amount) ? amount : 0
            }]
        };
        return {
            ...patient,
            billing: {
                ...(patient.billing ?? createDefaultBilling()),
                balance: statement.amount,
                status: String(payload.values.status ?? patient.billing.status ?? 'pending').trim() || 'pending',
                nextBillingDate: String(payload.values.nextBillingDate ?? patient.billing.nextBillingDate ?? '').trim() || patient.billing.nextBillingDate,
                membershipPlan: String(payload.values.membershipPlan ?? patient.billing.membershipPlan ?? '').trim() || patient.billing.membershipPlan,
                statements: [statement, ...(patient.billing?.statements ?? [])]
            }
        };
    }

    return patient;
}

export function PatientDetailClient({ patientId }: { patientId: string }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user: activeUser, isReady } = useAuthUser();
    const [activeTab, setActiveTab] = React.useState<PatientDetailTab>('Overview');
    const [isEditingDemographics, setIsEditingDemographics] = React.useState(false);
    const [showProblemForm, setShowProblemForm] = React.useState(false);
    const [showMedicationForm, setShowMedicationForm] = React.useState(false);
    const [editingProblemId, setEditingProblemId] = React.useState<string | null>(null);
    const [editingMedicationId, setEditingMedicationId] = React.useState<string | null>(null);
    const [showOrderForm, setShowOrderForm] = React.useState(false);
    const [showImagingForm, setShowImagingForm] = React.useState(false);
    const [showObservationForm, setShowObservationForm] = React.useState(false);
    const [showDocumentForm, setShowDocumentForm] = React.useState(false);
    const [showBillingForm, setShowBillingForm] = React.useState(false);
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
        allergies: [] as string[]
    });
    const [problemForm, setProblemForm] = React.useState({ code: '', description: '' });
    const [problemEditForm, setProblemEditForm] = React.useState({ code: '', description: '' });
    const [medicationForm, setMedicationForm] = React.useState({
        name: '',
        dosage: '',
        frequency: '',
        route: 'PO',
        status: 'Active',
        startDate: ''
    });
    const [medicationEditForm, setMedicationEditForm] = React.useState({
        name: '',
        dosage: '',
        frequency: '',
        route: 'PO',
        status: 'Active',
        startDate: ''
    });
    const [orderForm, setOrderForm] = React.useState({
        type: 'lab',
        description: '',
        status: 'Ordered',
        orderedAt: '',
        scheduledFor: '',
        tests: [] as string[],
        notes: ''
    });
    const [imagingForm, setImagingForm] = React.useState({
        modality: 'MRI',
        bodyPart: '',
        status: 'Ordered',
        date: '',
        facility: '',
        reportText: '',
        viewerUrl: ''
    });
    const [observationForm, setObservationForm] = React.useState({
        category: 'lab',
        name: '',
        date: '',
        value: '',
        unit: '',
        referenceRange: '',
        status: 'Recorded',
        notes: ''
    });
    const [documentForm, setDocumentForm] = React.useState({
        name: '',
        category: 'Other',
        date: '',
        type: 'File',
        url: '',
        size: '',
        status: 'Available'
    });
    const [messageForm, setMessageForm] = React.useState({ text: '' });
    const [billingForm, setBillingForm] = React.useState({
        description: '',
        amount: '',
        status: 'pending',
        date: '',
        nextBillingDate: '',
        membershipPlan: ''
    });

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
            allergies: patient.allergies
        });
        setBillingForm((current) => ({
            ...current,
            nextBillingDate: patient.billing?.nextBillingDate ?? '',
            membershipPlan: patient.billing?.membershipPlan ?? ''
        }));
    }, [detailQuery.data]);

    const updateMutation = useMutation({
        mutationFn: async (payload: MutationPayload) => {
            const response = await apiFetchJson<PatientDetailResponse>(`/api/patients/${patientId}`, {
                method: 'PATCH',
                user: activeUser,
                body: payload
            });

            if (!response.success) {
                throw new Error(response.error || 'Failed to update patient.');
            }

            return response.patient ?? null;
        },
        onMutate: async (payload) => {
            await queryClient.cancelQueries({ queryKey: detailQueryKey });
            const previousPatient = queryClient.getQueryData<PatientDetailRecord>(detailQueryKey);

            if (previousPatient) {
                queryClient.setQueryData<PatientDetailRecord>(
                    detailQueryKey,
                    applyOptimisticPatientUpdate(previousPatient, payload, activeUser?.displayName ?? activeUser?.email ?? 'Provider')
                );
            }

            return { previousPatient };
        },
        onError: (error, _variables, context) => {
            if (context?.previousPatient) {
                queryClient.setQueryData(detailQueryKey, context.previousPatient);
            }
            toast.error(error instanceof Error ? error.message : 'Failed to update patient.');
        },
        onSuccess: (patient) => {
            if (patient) {
                queryClient.setQueryData(detailQueryKey, patient);
            }
            void queryClient.invalidateQueries({ queryKey: detailQueryKey });
        }
    });

    const patient = detailQuery.data;
    const age = toAge(patient?.dob ?? null);

    const submitMutation = React.useCallback(async (payload: MutationPayload, successMessage: string, afterSuccess?: () => void) => {
        await updateMutation.mutateAsync(payload);
        afterSuccess?.();
        toast.success(successMessage);
    }, [updateMutation]);

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

    const vitalObservations = patient.observations.filter((observation) => observation.category === 'vital');
    const labObservations = patient.observations.filter((observation) => observation.category === 'lab');

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
                            editingProblemId={editingProblemId}
                            setEditingProblemId={setEditingProblemId}
                            problemEditForm={problemEditForm}
                            setProblemEditForm={setProblemEditForm}
                            onSubmit={() => submitMutation({
                                action: 'add_problem',
                                values: problemForm
                            }, 'Problem added.', () => {
                                setProblemForm({ code: '', description: '' });
                                setShowProblemForm(false);
                            })}
                            onEditSubmit={() => submitMutation({
                                action: 'update_problem',
                                values: { id: editingProblemId, ...problemEditForm }
                            }, 'Problem updated.', () => {
                                setEditingProblemId(null);
                                setProblemEditForm({ code: '', description: '' });
                            })}
                            updatePending={updateMutation.isPending}
                        />
                        <MedicationSection
                            patient={patient}
                            medicationForm={medicationForm}
                            showMedicationForm={showMedicationForm}
                            setShowMedicationForm={setShowMedicationForm}
                            setMedicationForm={setMedicationForm}
                            editingMedicationId={editingMedicationId}
                            setEditingMedicationId={setEditingMedicationId}
                            medicationEditForm={medicationEditForm}
                            setMedicationEditForm={setMedicationEditForm}
                            onSubmit={() => submitMutation({
                                action: 'add_medication',
                                values: medicationForm
                            }, 'Medication added.', () => {
                                setMedicationForm({
                                    name: '',
                                    dosage: '',
                                    frequency: '',
                                    route: 'PO',
                                    status: 'Active',
                                    startDate: ''
                                });
                                setShowMedicationForm(false);
                            })}
                            onEditSubmit={() => submitMutation({
                                action: 'update_medication',
                                values: { id: editingMedicationId, ...medicationEditForm }
                            }, 'Medication updated.', () => {
                                setEditingMedicationId(null);
                                setMedicationEditForm({
                                    name: '',
                                    dosage: '',
                                    frequency: '',
                                    route: 'PO',
                                    status: 'Active',
                                    startDate: ''
                                });
                            })}
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
                            onSubmit={() => submitMutation({
                                action: 'update_demographics',
                                values: demographicsForm
                            }, 'Patient demographics updated.', () => setIsEditingDemographics(false))}
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
                            editingProblemId={editingProblemId}
                            setEditingProblemId={setEditingProblemId}
                            problemEditForm={problemEditForm}
                            setProblemEditForm={setProblemEditForm}
                            onSubmit={() => submitMutation({
                                action: 'add_problem',
                                values: problemForm
                            }, 'Problem added.', () => {
                                setProblemForm({ code: '', description: '' });
                                setShowProblemForm(false);
                            })}
                            onEditSubmit={() => submitMutation({
                                action: 'update_problem',
                                values: { id: editingProblemId, ...problemEditForm }
                            }, 'Problem updated.', () => {
                                setEditingProblemId(null);
                                setProblemEditForm({ code: '', description: '' });
                            })}
                            updatePending={updateMutation.isPending}
                        />
                        <ObservationSection
                            title="Clinical Labs & Vitals"
                            observations={patient.observations}
                            observationForm={observationForm}
                            showForm={showObservationForm}
                            setShowForm={setShowObservationForm}
                            setObservationForm={setObservationForm}
                            onSubmit={() => submitMutation({
                                action: 'add_observation',
                                values: observationForm
                            }, 'Observation recorded.', () => {
                                setObservationForm({
                                    category: 'lab',
                                    name: '',
                                    date: '',
                                    value: '',
                                    unit: '',
                                    referenceRange: '',
                                    status: 'Recorded',
                                    notes: ''
                                });
                                setShowObservationForm(false);
                            })}
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
                            onSubmit={() => submitMutation({
                                action: 'update_demographics',
                                values: demographicsForm
                            }, 'Patient demographics updated.', () => setIsEditingDemographics(false))}
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
                    editingMedicationId={editingMedicationId}
                    setEditingMedicationId={setEditingMedicationId}
                    medicationEditForm={medicationEditForm}
                    setMedicationEditForm={setMedicationEditForm}
                    onSubmit={() => submitMutation({
                        action: 'add_medication',
                        values: medicationForm
                    }, 'Medication added.', () => {
                        setMedicationForm({
                            name: '',
                            dosage: '',
                            frequency: '',
                            route: 'PO',
                            status: 'Active',
                            startDate: ''
                        });
                        setShowMedicationForm(false);
                    })}
                    onEditSubmit={() => submitMutation({
                        action: 'update_medication',
                        values: { id: editingMedicationId, ...medicationEditForm }
                    }, 'Medication updated.', () => {
                        setEditingMedicationId(null);
                        setMedicationEditForm({
                            name: '',
                            dosage: '',
                            frequency: '',
                            route: 'PO',
                            status: 'Active',
                            startDate: ''
                        });
                    })}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Orders' && (
                <OrderSection
                    patient={patient}
                    orderForm={orderForm}
                    showForm={showOrderForm}
                    setShowForm={setShowOrderForm}
                    setOrderForm={setOrderForm}
                    onSubmit={() => submitMutation({
                        action: 'add_order',
                        values: orderForm
                    }, 'Order created.', () => {
                        setOrderForm({
                            type: 'lab',
                            description: '',
                            status: 'Ordered',
                            orderedAt: '',
                            scheduledFor: '',
                            tests: [],
                            notes: ''
                        });
                        setShowOrderForm(false);
                    })}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Imaging' && (
                <ImagingSection
                    studies={patient.imagingStudies}
                    imagingForm={imagingForm}
                    showForm={showImagingForm}
                    setShowForm={setShowImagingForm}
                    setImagingForm={setImagingForm}
                    onSubmit={() => submitMutation({
                        action: 'add_imaging',
                        values: imagingForm
                    }, 'Imaging entry added.', () => {
                        setImagingForm({
                            modality: 'MRI',
                            bodyPart: '',
                            status: 'Ordered',
                            date: '',
                            facility: '',
                            reportText: '',
                            viewerUrl: ''
                        });
                        setShowImagingForm(false);
                    })}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Labs & Vitals' && (
                <div className="grid gap-8 xl:grid-cols-2">
                    <ObservationSection
                        title="Lab Results"
                        observations={labObservations}
                        observationForm={observationForm}
                        showForm={showObservationForm}
                        setShowForm={setShowObservationForm}
                        setObservationForm={setObservationForm}
                        forceCategory="lab"
                        onSubmit={() => submitMutation({
                            action: 'add_observation',
                            values: { ...observationForm, category: 'lab' }
                        }, 'Lab result recorded.', () => {
                            setObservationForm({
                                category: 'lab',
                                name: '',
                                date: '',
                                value: '',
                                unit: '',
                                referenceRange: '',
                                status: 'Recorded',
                                notes: ''
                            });
                            setShowObservationForm(false);
                        })}
                        updatePending={updateMutation.isPending}
                    />
                    <ObservationSection
                        title="Vitals"
                        observations={vitalObservations}
                        observationForm={observationForm}
                        showForm={showObservationForm}
                        setShowForm={setShowObservationForm}
                        setObservationForm={setObservationForm}
                        forceCategory="vital"
                        onSubmit={() => submitMutation({
                            action: 'add_observation',
                            values: { ...observationForm, category: 'vital' }
                        }, 'Vital recorded.', () => {
                            setObservationForm({
                                category: 'vital',
                                name: '',
                                date: '',
                                value: '',
                                unit: '',
                                referenceRange: '',
                                status: 'Recorded',
                                notes: ''
                            });
                            setShowObservationForm(false);
                        })}
                        updatePending={updateMutation.isPending}
                    />
                </div>
            )}

            {activeTab === 'Documents' && (
                <DocumentSection
                    documents={patient.documents}
                    documentForm={documentForm}
                    showForm={showDocumentForm}
                    setShowForm={setShowDocumentForm}
                    setDocumentForm={setDocumentForm}
                    onSubmit={() => submitMutation({
                        action: 'add_document',
                        values: documentForm
                    }, 'Document added.', () => {
                        setDocumentForm({
                            name: '',
                            category: 'Other',
                            date: '',
                            type: 'File',
                            url: '',
                            size: '',
                            status: 'Available'
                        });
                        setShowDocumentForm(false);
                    })}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Encounters' && <EncounterSection patient={patient} />}

            {activeTab === 'Inbox' && (
                <MessageSection
                    messages={patient.messages}
                    messageForm={messageForm}
                    setMessageForm={setMessageForm}
                    onSubmit={() => submitMutation({
                        action: 'send_message',
                        values: messageForm
                    }, 'Message sent.', () => setMessageForm({ text: '' }))}
                    updatePending={updateMutation.isPending}
                />
            )}

            {activeTab === 'Billing' && (
                <BillingSection
                    billing={patient.billing}
                    billingForm={billingForm}
                    showForm={showBillingForm}
                    setShowForm={setShowBillingForm}
                    setBillingForm={setBillingForm}
                    onSubmit={() => submitMutation({
                        action: 'add_billing_statement',
                        values: billingForm
                    }, 'Billing statement added.', () => {
                        setBillingForm({
                            description: '',
                            amount: '',
                            status: 'pending',
                            date: '',
                            nextBillingDate: patient.billing.nextBillingDate ?? '',
                            membershipPlan: patient.billing.membershipPlan ?? ''
                        });
                        setShowBillingForm(false);
                    })}
                    updatePending={updateMutation.isPending}
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
    editingProblemId,
    setEditingProblemId,
    problemEditForm,
    setProblemEditForm,
    onSubmit,
    onEditSubmit,
    updatePending
}: {
    patient: PatientDetailRecord;
    problemForm: { code: string; description: string };
    showProblemForm: boolean;
    setShowProblemForm: React.Dispatch<React.SetStateAction<boolean>>;
    setProblemForm: React.Dispatch<React.SetStateAction<{ code: string; description: string }>>;
    editingProblemId: string | null;
    setEditingProblemId: React.Dispatch<React.SetStateAction<string | null>>;
    problemEditForm: { code: string; description: string };
    setProblemEditForm: React.Dispatch<React.SetStateAction<{ code: string; description: string }>>;
    onSubmit: () => Promise<void>;
    onEditSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell
            icon={<Activity className="h-5 w-5 text-brand" />}
            title="Problem List"
            actionLabel="+ Add Diagnosis"
            onAction={() => setShowProblemForm((current) => !current)}
        >
            {showProblemForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px,minmax(0,1fr),auto]">
                    <InputField label="ICD-10" value={problemForm.code} onChange={(value) => setProblemForm((current) => ({ ...current, code: value }))} />
                    <InputField label="Description" value={problemForm.description} onChange={(value) => setProblemForm((current) => ({ ...current, description: value }))} />
                    <ActionButton className="self-end" label="Add" onClick={() => void onSubmit()} loading={updatePending} />
                </div>
            )}

            <div className="space-y-3">
                {patient.problemList.length > 0 ? patient.problemList.map((problem) => (
                    <div key={problem.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex min-w-0 items-center gap-4">
                                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{problem.code}</span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-slate-900">{problem.description}</div>
                                    <div className="text-xs text-slate-500">Added {problem.createdAt ? formatDateValue(problem.createdAt) : 'recently'}</div>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingProblemId(problem.id);
                                    setProblemEditForm({
                                        code: problem.code,
                                        description: problem.description
                                    });
                                }}
                                className="text-xs font-black uppercase tracking-[0.16em] text-brand hover:underline"
                            >
                                Edit
                            </button>
                        </div>
                    </div>
                )) : <EmptyState text="No active problems recorded." />}
            </div>

            {editingProblemId && (
                <EditDialog
                    title="Edit Diagnosis"
                    description="Update the diagnosis code and description."
                    onClose={() => {
                        setEditingProblemId(null);
                        setProblemEditForm({ code: '', description: '' });
                    }}
                    footer={(
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingProblemId(null);
                                    setProblemEditForm({ code: '', description: '' });
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <ActionButton label="Save Changes" onClick={() => void onEditSubmit()} loading={updatePending} icon={<Save className="h-4 w-4" />} />
                        </>
                    )}
                >
                    <div className="grid gap-3 md:grid-cols-[160px,minmax(0,1fr)]">
                        <InputField label="ICD-10" value={problemEditForm.code} onChange={(value) => setProblemEditForm((current) => ({ ...current, code: value }))} />
                        <InputField label="Description" value={problemEditForm.description} onChange={(value) => setProblemEditForm((current) => ({ ...current, description: value }))} />
                    </div>
                </EditDialog>
            )}
        </SectionShell>
    );
}

function MedicationSection({
    patient,
    medicationForm,
    showMedicationForm,
    setShowMedicationForm,
    setMedicationForm,
    editingMedicationId,
    setEditingMedicationId,
    medicationEditForm,
    setMedicationEditForm,
    onSubmit,
    onEditSubmit,
    updatePending
}: {
    patient: PatientDetailRecord;
    medicationForm: { name: string; dosage: string; frequency: string; route: string; status: string; startDate: string };
    showMedicationForm: boolean;
    setShowMedicationForm: React.Dispatch<React.SetStateAction<boolean>>;
    setMedicationForm: React.Dispatch<React.SetStateAction<{ name: string; dosage: string; frequency: string; route: string; status: string; startDate: string }>>;
    editingMedicationId: string | null;
    setEditingMedicationId: React.Dispatch<React.SetStateAction<string | null>>;
    medicationEditForm: { name: string; dosage: string; frequency: string; route: string; status: string; startDate: string };
    setMedicationEditForm: React.Dispatch<React.SetStateAction<{ name: string; dosage: string; frequency: string; route: string; status: string; startDate: string }>>;
    onSubmit: () => Promise<void>;
    onEditSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell
            icon={<Pill className="h-5 w-5 text-brand" />}
            title="Active Medications"
            actionLabel="+ Add Medication"
            onAction={() => setShowMedicationForm((current) => !current)}
        >
            {showMedicationForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <InputField label="Medication Name" value={medicationForm.name} onChange={(value) => setMedicationForm((current) => ({ ...current, name: value }))} />
                    <InputField label="Dosage" value={medicationForm.dosage} onChange={(value) => setMedicationForm((current) => ({ ...current, dosage: value }))} />
                    <InputField label="Frequency" value={medicationForm.frequency} onChange={(value) => setMedicationForm((current) => ({ ...current, frequency: value }))} />
                    <SelectField label="Route" value={medicationForm.route} options={MEDICATION_ROUTE_OPTIONS} onChange={(value) => setMedicationForm((current) => ({ ...current, route: value }))} />
                    <SelectField label="Status" value={medicationForm.status} options={MEDICATION_STATUS_OPTIONS} onChange={(value) => setMedicationForm((current) => ({ ...current, status: value }))} />
                    <DatePickerField label="Start Date" value={medicationForm.startDate} onChange={(value) => setMedicationForm((current) => ({ ...current, startDate: value }))} />
                    <div className="md:col-span-2">
                        <ActionButton label="Save Medication" onClick={() => void onSubmit()} loading={updatePending} icon={<ClipboardPlus className="h-4 w-4" />} />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {patient.activeMedications.length > 0 ? patient.activeMedications.map((medication) => (
                    <div key={medication.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{medication.name}</div>
                                <div className="text-xs font-semibold text-slate-500">
                                    {medication.dosage} • {medication.frequency}{medication.route ? ` • ${medication.route}` : ''}{medication.startDate ? ` • ${formatDateValue(medication.startDate)}` : ''}
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{medication.status}</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingMedicationId(medication.id);
                                        setMedicationEditForm({
                                            name: medication.name,
                                            dosage: medication.dosage,
                                            frequency: medication.frequency,
                                            route: medication.route ?? 'PO',
                                            status: medication.status,
                                            startDate: medication.startDate ?? ''
                                        });
                                    }}
                                    className="text-xs font-black uppercase tracking-[0.16em] text-brand hover:underline"
                                >
                                    Edit
                                </button>
                            </div>
                        </div>
                    </div>
                )) : <EmptyState text="No active medications recorded." />}
            </div>

            {editingMedicationId && (
                <EditDialog
                    title="Edit Medication"
                    description="Update the existing medication details."
                    onClose={() => {
                        setEditingMedicationId(null);
                        setMedicationEditForm({
                            name: '',
                            dosage: '',
                            frequency: '',
                            route: 'PO',
                            status: 'Active',
                            startDate: ''
                        });
                    }}
                    footer={(
                        <>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingMedicationId(null);
                                    setMedicationEditForm({
                                        name: '',
                                        dosage: '',
                                        frequency: '',
                                        route: 'PO',
                                        status: 'Active',
                                        startDate: ''
                                    });
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                            <ActionButton label="Save Changes" onClick={() => void onEditSubmit()} loading={updatePending} icon={<Save className="h-4 w-4" />} />
                        </>
                    )}
                >
                    <div className="grid gap-3 md:grid-cols-2">
                        <InputField label="Medication Name" value={medicationEditForm.name} onChange={(value) => setMedicationEditForm((current) => ({ ...current, name: value }))} />
                        <InputField label="Dosage" value={medicationEditForm.dosage} onChange={(value) => setMedicationEditForm((current) => ({ ...current, dosage: value }))} />
                        <InputField label="Frequency" value={medicationEditForm.frequency} onChange={(value) => setMedicationEditForm((current) => ({ ...current, frequency: value }))} />
                        <SelectField label="Route" value={medicationEditForm.route} options={MEDICATION_ROUTE_OPTIONS} onChange={(value) => setMedicationEditForm((current) => ({ ...current, route: value }))} />
                        <SelectField label="Status" value={medicationEditForm.status} options={MEDICATION_STATUS_OPTIONS} onChange={(value) => setMedicationEditForm((current) => ({ ...current, status: value }))} />
                        <DatePickerField label="Start Date" value={medicationEditForm.startDate} onChange={(value) => setMedicationEditForm((current) => ({ ...current, startDate: value }))} />
                    </div>
                </EditDialog>
            )}
        </SectionShell>
    );
}

function EncounterSection({ patient }: { patient: PatientDetailRecord }) {
    return (
        <SectionShell icon={<ClipboardPlus className="h-5 w-5 text-brand" />} title="Recent Encounters">
            <div className="space-y-3">
                {patient.recentEncounters.length > 0 ? patient.recentEncounters.map((encounter) => (
                    <div key={encounter.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{encounter.title}</div>
                                <div className="text-xs font-semibold text-slate-500">
                                    {formatDateValue(encounter.date)} • {encounter.provider} • {encounter.type}
                                </div>
                                {encounter.notes && <div className="mt-2 text-xs text-slate-500">{encounter.notes}</div>}
                            </div>
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{encounter.status}</span>
                        </div>
                    </div>
                )) : <EmptyState text="No recent encounters recorded." />}
            </div>
        </SectionShell>
    );
}

function DemographicsSection({
    patient,
    age,
    isEditingDemographics,
    setIsEditingDemographics,
    demographicsForm,
    setDemographicsForm,
    onSubmit,
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
        allergies: string[];
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
        allergies: string[];
    }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell
            icon={<UserRound className="h-5 w-5 text-brand" />}
            title="Demographics"
            actionLabel={isEditingDemographics ? 'Cancel' : 'Edit'}
            onAction={() => setIsEditingDemographics((current) => !current)}
        >
            {isEditingDemographics ? (
                <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <InputField label="First Name" value={demographicsForm.firstName} onChange={(value) => setDemographicsForm((current) => ({ ...current, firstName: value }))} />
                        <InputField label="Last Name" value={demographicsForm.lastName} onChange={(value) => setDemographicsForm((current) => ({ ...current, lastName: value }))} />
                        <DatePickerField label="DOB" value={demographicsForm.dob} onChange={(value) => setDemographicsForm((current) => ({ ...current, dob: value }))} />
                        <SelectField label="Sex" value={demographicsForm.sex} options={SEX_OPTIONS} onChange={(value) => setDemographicsForm((current) => ({ ...current, sex: value }))} />
                        <InputField label="State" value={demographicsForm.state} onChange={(value) => setDemographicsForm((current) => ({ ...current, state: value }))} />
                        <InputField label="Phone" value={demographicsForm.phone} onChange={(value) => setDemographicsForm((current) => ({ ...current, phone: value }))} />
                    </div>
                    <InputField label="Email" value={demographicsForm.email} onChange={(value) => setDemographicsForm((current) => ({ ...current, email: value }))} />
                    <InputField label="Primary Concern" value={demographicsForm.primaryConcern} onChange={(value) => setDemographicsForm((current) => ({ ...current, primaryConcern: value }))} />
                    <InputField label="Preferred Pharmacy" value={demographicsForm.preferredPharmacy} onChange={(value) => setDemographicsForm((current) => ({ ...current, preferredPharmacy: value }))} />
                    <MultiSelectCombobox
                        label="Allergies"
                        placeholder="Select or add allergies"
                        options={COMMON_ALLERGY_OPTIONS}
                        values={demographicsForm.allergies}
                        onChange={(values) => setDemographicsForm((current) => ({ ...current, allergies: values }))}
                    />
                    <ActionButton label="Save" onClick={() => void onSubmit()} loading={updatePending} icon={<Save className="h-4 w-4" />} />
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
        </SectionShell>
    );
}

function CareTeamSection({ patient }: { patient: PatientDetailRecord }) {
    return (
        <SectionShell icon={<ShieldCheck className="h-5 w-5 text-brand" />} title="Care Team">
            <div className="space-y-3">
                {patient.careTeam.length > 0 ? patient.careTeam.map((member, index) => (
                    <div key={`${member.role}-${member.name}-${index}`} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{member.role}</div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{member.name}</div>
                    </div>
                )) : <EmptyState text="No care team assigned." />}
            </div>
        </SectionShell>
    );
}

function OrderSection({
    patient,
    orderForm,
    showForm,
    setShowForm,
    setOrderForm,
    onSubmit,
    updatePending
}: {
    patient: PatientDetailRecord;
    orderForm: { type: string; description: string; status: string; orderedAt: string; scheduledFor: string; tests: string[]; notes: string };
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    setOrderForm: React.Dispatch<React.SetStateAction<{ type: string; description: string; status: string; orderedAt: string; scheduledFor: string; tests: string[]; notes: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell icon={<ClipboardPlus className="h-5 w-5 text-brand" />} title="Orders" actionLabel="+ New Order" onAction={() => setShowForm((current) => !current)}>
            {showForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <SelectField label="Order Type" value={orderForm.type} options={ORDER_TYPE_OPTIONS} onChange={(value) => setOrderForm((current) => ({ ...current, type: value }))} />
                    <SelectField label="Status" value={orderForm.status} options={ORDER_STATUS_OPTIONS} onChange={(value) => setOrderForm((current) => ({ ...current, status: value }))} />
                    <InputField label="Description" value={orderForm.description} onChange={(value) => setOrderForm((current) => ({ ...current, description: value }))} />
                    <DatePickerField label="Ordered At" value={orderForm.orderedAt} onChange={(value) => setOrderForm((current) => ({ ...current, orderedAt: value }))} />
                    <DatePickerField label="Scheduled For" value={orderForm.scheduledFor} onChange={(value) => setOrderForm((current) => ({ ...current, scheduledFor: value }))} />
                    <MultiSelectCombobox label="Tests / Items" placeholder="Select tests" options={COMMON_ORDER_TEST_OPTIONS} values={orderForm.tests} onChange={(values) => setOrderForm((current) => ({ ...current, tests: values }))} />
                    <div className="md:col-span-2">
                        <TextAreaField label="Notes" value={orderForm.notes} onChange={(value) => setOrderForm((current) => ({ ...current, notes: value }))} />
                    </div>
                    <div className="md:col-span-2">
                        <ActionButton label="Create Order" onClick={() => void onSubmit()} loading={updatePending} />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {patient.orders.length > 0 ? patient.orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{order.description}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {order.type.toUpperCase()} • {formatDateValue(order.orderedAt)}{order.provider ? ` • ${order.provider}` : ''}
                                </div>
                                {order.tests.length > 0 && <TagRow values={order.tests} />}
                                {order.notes && <div className="mt-2 text-xs text-slate-500">{order.notes}</div>}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{order.status}</span>
                        </div>
                    </div>
                )) : <EmptyState text="No orders recorded yet." />}
            </div>
        </SectionShell>
    );
}

function ImagingSection({
    studies,
    imagingForm,
    showForm,
    setShowForm,
    setImagingForm,
    onSubmit,
    updatePending
}: {
    studies: PatientDetailImagingStudy[];
    imagingForm: { modality: string; bodyPart: string; status: string; date: string; facility: string; reportText: string; viewerUrl: string };
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    setImagingForm: React.Dispatch<React.SetStateAction<{ modality: string; bodyPart: string; status: string; date: string; facility: string; reportText: string; viewerUrl: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell icon={<Microscope className="h-5 w-5 text-brand" />} title="Imaging" actionLabel="+ New Imaging" onAction={() => setShowForm((current) => !current)}>
            {showForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <SelectField label="Modality" value={imagingForm.modality} options={IMAGING_MODALITY_OPTIONS} onChange={(value) => setImagingForm((current) => ({ ...current, modality: value }))} />
                    <SelectField label="Status" value={imagingForm.status} options={IMAGING_STATUS_OPTIONS} onChange={(value) => setImagingForm((current) => ({ ...current, status: value }))} />
                    <InputField label="Body Part" value={imagingForm.bodyPart} onChange={(value) => setImagingForm((current) => ({ ...current, bodyPart: value }))} />
                    <DatePickerField label="Study Date" value={imagingForm.date} onChange={(value) => setImagingForm((current) => ({ ...current, date: value }))} />
                    <InputField label="Facility" value={imagingForm.facility} onChange={(value) => setImagingForm((current) => ({ ...current, facility: value }))} />
                    <InputField label="Viewer URL" value={imagingForm.viewerUrl} onChange={(value) => setImagingForm((current) => ({ ...current, viewerUrl: value }))} />
                    <div className="md:col-span-2">
                        <TextAreaField label="Report Summary" value={imagingForm.reportText} onChange={(value) => setImagingForm((current) => ({ ...current, reportText: value }))} />
                    </div>
                    <div className="md:col-span-2">
                        <ActionButton label="Save Imaging Entry" onClick={() => void onSubmit()} loading={updatePending} />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {studies.length > 0 ? studies.map((study) => (
                    <div key={study.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{study.modality} • {study.bodyPart}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {formatDateValue(study.date)}{study.facility ? ` • ${study.facility}` : ''}{study.provider ? ` • ${study.provider}` : ''}
                                </div>
                                {study.reportText && <div className="mt-2 text-xs text-slate-500">{study.reportText}</div>}
                                {study.viewerUrl && (
                                    <a href={study.viewerUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand hover:underline">
                                        Open Viewer
                                    </a>
                                )}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{study.status}</span>
                        </div>
                    </div>
                )) : <EmptyState text="No imaging studies recorded yet." />}
            </div>
        </SectionShell>
    );
}

function ObservationSection({
    title,
    observations,
    observationForm,
    showForm,
    setShowForm,
    setObservationForm,
    onSubmit,
    updatePending,
    forceCategory
}: {
    title: string;
    observations: PatientDetailObservation[];
    observationForm: { category: string; name: string; date: string; value: string; unit: string; referenceRange: string; status: string; notes: string };
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    setObservationForm: React.Dispatch<React.SetStateAction<{ category: string; name: string; date: string; value: string; unit: string; referenceRange: string; status: string; notes: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
    forceCategory?: 'lab' | 'vital';
}) {
    const category = forceCategory ?? (observationForm.category === 'vital' ? 'vital' : 'lab');
    return (
        <SectionShell icon={<FlaskConical className="h-5 w-5 text-brand" />} title={title} actionLabel="+ Record" onAction={() => {
            setObservationForm((current) => ({ ...current, category }));
            setShowForm((current) => !current);
        }}>
            {showForm && observationForm.category === category && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    {!forceCategory && (
                        <SelectField label="Category" value={observationForm.category} options={OBSERVATION_CATEGORY_OPTIONS} onChange={(value) => setObservationForm((current) => ({ ...current, category: value }))} />
                    )}
                    <InputField label="Name" value={observationForm.name} onChange={(value) => setObservationForm((current) => ({ ...current, name: value }))} />
                    <DatePickerField label="Date" value={observationForm.date} onChange={(value) => setObservationForm((current) => ({ ...current, date: value }))} />
                    <InputField label="Value" value={observationForm.value} onChange={(value) => setObservationForm((current) => ({ ...current, value: value }))} />
                    <InputField label="Unit" value={observationForm.unit} onChange={(value) => setObservationForm((current) => ({ ...current, unit: value }))} />
                    <InputField label="Reference Range" value={observationForm.referenceRange} onChange={(value) => setObservationForm((current) => ({ ...current, referenceRange: value }))} />
                    <SelectField label="Status" value={observationForm.status} options={OBSERVATION_STATUS_OPTIONS} onChange={(value) => setObservationForm((current) => ({ ...current, status: value }))} />
                    <div className="md:col-span-2">
                        <TextAreaField label="Notes" value={observationForm.notes} onChange={(value) => setObservationForm((current) => ({ ...current, notes: value }))} />
                    </div>
                    <div className="md:col-span-2">
                        <ActionButton label="Save Observation" onClick={() => void onSubmit()} loading={updatePending} />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {observations.length > 0 ? observations.map((observation) => (
                    <div key={observation.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{observation.name}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {observation.value}{observation.unit ? ` ${observation.unit}` : ''}{observation.referenceRange ? ` • ${observation.referenceRange}` : ''} • {formatDateValue(observation.date)}
                                </div>
                                {observation.notes && <div className="mt-2 text-xs text-slate-500">{observation.notes}</div>}
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{observation.status}</span>
                        </div>
                    </div>
                )) : <EmptyState text={`No ${title.toLowerCase()} recorded yet.`} />}
            </div>
        </SectionShell>
    );
}

function DocumentSection({
    documents,
    documentForm,
    showForm,
    setShowForm,
    setDocumentForm,
    onSubmit,
    updatePending
}: {
    documents: PatientDetailDocument[];
    documentForm: { name: string; category: string; date: string; type: string; url: string; size: string; status: string };
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    setDocumentForm: React.Dispatch<React.SetStateAction<{ name: string; category: string; date: string; type: string; url: string; size: string; status: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell icon={<FileText className="h-5 w-5 text-brand" />} title="Documents" actionLabel="+ Add Document" onAction={() => setShowForm((current) => !current)}>
            {showForm && (
                <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <InputField label="Document Name" value={documentForm.name} onChange={(value) => setDocumentForm((current) => ({ ...current, name: value }))} />
                    <SelectField label="Category" value={documentForm.category} options={DOCUMENT_CATEGORY_OPTIONS} onChange={(value) => setDocumentForm((current) => ({ ...current, category: value }))} />
                    <DatePickerField label="Date" value={documentForm.date} onChange={(value) => setDocumentForm((current) => ({ ...current, date: value }))} />
                    <InputField label="Type" value={documentForm.type} onChange={(value) => setDocumentForm((current) => ({ ...current, type: value }))} />
                    <InputField label="URL" value={documentForm.url} onChange={(value) => setDocumentForm((current) => ({ ...current, url: value }))} />
                    <InputField label="Size" value={documentForm.size} onChange={(value) => setDocumentForm((current) => ({ ...current, size: value }))} />
                    <SelectField label="Status" value={documentForm.status} options={DOCUMENT_STATUS_OPTIONS} onChange={(value) => setDocumentForm((current) => ({ ...current, status: value }))} />
                    <div className="md:col-span-2">
                        <ActionButton label="Save Document" onClick={() => void onSubmit()} loading={updatePending} />
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {documents.length > 0 ? documents.map((document) => (
                    <div key={document.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{document.name}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">
                                    {document.category} • {formatDateValue(document.date)}{document.type ? ` • ${document.type}` : ''}{document.size ? ` • ${document.size}` : ''}
                                </div>
                                {document.url && (
                                    <a href={document.url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-xs font-bold text-brand hover:underline">
                                        Open Document
                                    </a>
                                )}
                            </div>
                            {document.status && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-slate-700">{document.status}</span>}
                        </div>
                    </div>
                )) : <EmptyState text="No documents recorded yet." />}
            </div>
        </SectionShell>
    );
}

function MessageSection({
    messages,
    messageForm,
    setMessageForm,
    onSubmit,
    updatePending
}: {
    messages: PatientDetailMessage[];
    messageForm: { text: string };
    setMessageForm: React.Dispatch<React.SetStateAction<{ text: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <SectionShell icon={<Inbox className="h-5 w-5 text-brand" />} title="Inbox">
            <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <TextAreaField label="New Message" value={messageForm.text} onChange={(value) => setMessageForm({ text: value })} rows={4} />
                <div className="mt-3">
                    <ActionButton label="Send Message" onClick={() => void onSubmit()} loading={updatePending} icon={<Send className="h-4 w-4" />} />
                </div>
            </div>

            <div className="space-y-3">
                {messages.length > 0 ? messages.map((message) => (
                    <div key={message.id} className={`rounded-2xl border px-4 py-4 ${message.senderType === 'provider' ? 'border-brand/20 bg-brand/5' : 'border-slate-200 bg-white'}`}>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <div className="text-sm font-black text-slate-900">{message.senderName}</div>
                                <div className="mt-1 text-xs font-semibold text-slate-500">{formatDateValue(message.timestamp)}</div>
                                <div className="mt-2 text-sm text-slate-700">{message.text}</div>
                            </div>
                            {message.unread && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-amber-700">Unread</span>}
                        </div>
                    </div>
                )) : <EmptyState text="No conversation history recorded yet." />}
            </div>
        </SectionShell>
    );
}

function BillingSection({
    billing,
    billingForm,
    showForm,
    setShowForm,
    setBillingForm,
    onSubmit,
    updatePending
}: {
    billing: PatientDetailBilling;
    billingForm: { description: string; amount: string; status: string; date: string; nextBillingDate: string; membershipPlan: string };
    showForm: boolean;
    setShowForm: React.Dispatch<React.SetStateAction<boolean>>;
    setBillingForm: React.Dispatch<React.SetStateAction<{ description: string; amount: string; status: string; date: string; nextBillingDate: string; membershipPlan: string }>>;
    onSubmit: () => Promise<void>;
    updatePending: boolean;
}) {
    return (
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr),minmax(360px,0.8fr)]">
            <SectionShell icon={<CreditCard className="h-5 w-5 text-brand" />} title="Billing History" actionLabel="+ Add Statement" onAction={() => setShowForm((current) => !current)}>
                {showForm && (
                    <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <InputField label="Description" value={billingForm.description} onChange={(value) => setBillingForm((current) => ({ ...current, description: value }))} />
                        <InputField label="Amount" value={billingForm.amount} onChange={(value) => setBillingForm((current) => ({ ...current, amount: value }))} />
                        <SelectField label="Status" value={billingForm.status} options={BILLING_STATUS_OPTIONS} onChange={(value) => setBillingForm((current) => ({ ...current, status: value }))} />
                        <DatePickerField label="Statement Date" value={billingForm.date} onChange={(value) => setBillingForm((current) => ({ ...current, date: value }))} />
                        <DatePickerField label="Next Billing Date" value={billingForm.nextBillingDate} onChange={(value) => setBillingForm((current) => ({ ...current, nextBillingDate: value }))} />
                        <InputField label="Membership Plan" value={billingForm.membershipPlan} onChange={(value) => setBillingForm((current) => ({ ...current, membershipPlan: value }))} />
                        <div className="md:col-span-2">
                            <ActionButton label="Save Statement" onClick={() => void onSubmit()} loading={updatePending} />
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {billing.statements.length > 0 ? billing.statements.map((statement) => (
                        <div key={statement.id} className="rounded-2xl border border-slate-200 px-4 py-4">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <div className="text-sm font-black text-slate-900">
                                        {statement.items[0]?.description ?? 'Statement'}
                                    </div>
                                    <div className="mt-1 text-xs font-semibold text-slate-500">{formatDateValue(statement.date)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-slate-900">${statement.amount.toFixed(2)}</div>
                                    <div className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{statement.status}</div>
                                </div>
                            </div>
                        </div>
                    )) : <EmptyState text="No billing statements recorded yet." />}
                </div>
            </SectionShell>

            <SectionShell icon={<CreditCard className="h-5 w-5 text-brand" />} title="Billing Summary">
                <div className="space-y-4 text-sm">
                    <DataField label="Current Balance" value={`$${billing.balance.toFixed(2)}`} />
                    <DataField label="Status" value={billing.status ?? 'Not recorded'} />
                    <DataField label="Membership Plan" value={billing.membershipPlan ?? 'Not recorded'} />
                    <DataField label="Next Billing Date" value={billing.nextBillingDate ? formatDateValue(billing.nextBillingDate) : 'Not scheduled'} />
                    <DataField label="Statements" value={String(billing.statements.length)} />
                    {billing.stripePortalUrl && (
                        <a href={billing.stripePortalUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">
                            Open Billing Portal
                        </a>
                    )}
                </div>
            </SectionShell>
        </div>
    );
}

function SectionShell({
    icon,
    title,
    children,
    actionLabel,
    onAction
}: {
    icon: React.ReactNode;
    title: string;
    children: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {icon}
                    <h2 className="text-xl font-black text-slate-900">{title}</h2>
                </div>
                {actionLabel && onAction && (
                    <button type="button" onClick={onAction} className="text-sm font-black text-brand transition hover:text-brand-600">
                        {actionLabel}
                    </button>
                )}
            </div>
            {children}
        </section>
    );
}

function InputField({
    label,
    value,
    onChange,
    placeholder
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand"
            />
        </label>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    rows = 3
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    rows?: number;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <textarea
                rows={rows}
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand"
            />
        </label>
    );
}

function SelectField({
    label,
    value,
    options,
    onChange
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
}) {
    return (
        <label className="block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand"
            >
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </label>
    );
}

function DatePickerField({
    label,
    value,
    onChange
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const [open, setOpen] = React.useState(false);
    const selectedDate = value ? new Date(value) : undefined;
    const currentYear = new Date().getFullYear();
    const defaultMonth = selectedDate ?? new Date();

    return (
        <label className="relative block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none focus:border-brand"
            >
                <span>{value ? formatDateValue(value) : 'Select date'}</span>
                <ChevronsUpDown className="h-4 w-4 text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <DayPicker
                        mode="single"
                        selected={selectedDate}
                        defaultMonth={defaultMonth}
                        captionLayout="dropdown"
                        navLayout="after"
                        startMonth={new Date(currentYear - 100, 0)}
                        endMonth={new Date(currentYear + 10, 11)}
                        onSelect={(date) => {
                            onChange(date ? format(date, 'yyyy-MM-dd') : '');
                            setOpen(false);
                        }}
                    />
                </div>
            )}
        </label>
    );
}

function MultiSelectCombobox({
    label,
    options,
    values,
    onChange,
    placeholder
}: {
    label: string;
    options: string[];
    values: string[];
    onChange: (values: string[]) => void;
    placeholder: string;
}) {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState('');
    const allOptions = React.useMemo(
        () => Array.from(new Set([...options, ...values])).sort((first, second) => first.localeCompare(second)),
        [options, values]
    );
    const filteredOptions = React.useMemo(
        () => allOptions.filter((option) => option.toLowerCase().includes(query.toLowerCase())),
        [allOptions, query]
    );

    const toggleValue = (value: string) => {
        if (values.includes(value)) {
            onChange(values.filter((entry) => entry !== value));
        } else {
            onChange([...values, value]);
        }
    };

    const addCustomValue = () => {
        const normalized = query.trim();
        if (!normalized) return;
        if (!values.includes(normalized)) {
            onChange([...values, normalized]);
        }
        setQuery('');
        setOpen(false);
    };

    return (
        <label className="relative block space-y-1">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</span>
            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-sm font-medium text-slate-900"
            >
                <span className="truncate">{values.length > 0 ? values.join(', ') : placeholder}</span>
                <ChevronsUpDown className="h-4 w-4 text-slate-400" />
            </button>
            {open && (
                <div className="absolute z-30 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-transparent text-sm font-medium text-slate-900 outline-none"
                        />
                    </div>
                    <div className="max-h-48 space-y-1 overflow-y-auto">
                        {filteredOptions.map((option) => (
                            <button
                                key={option}
                                type="button"
                                onClick={() => toggleValue(option)}
                                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <span>{option}</span>
                                {values.includes(option) && <Check className="h-4 w-4 text-brand" />}
                            </button>
                        ))}
                    </div>
                    {query.trim().length > 0 && !allOptions.includes(query.trim()) && (
                        <button
                            type="button"
                            onClick={addCustomValue}
                            className="mt-3 w-full rounded-xl bg-brand px-3 py-2 text-sm font-bold text-white"
                        >
                            Add "{query.trim()}"
                        </button>
                    )}
                </div>
            )}
        </label>
    );
}

function ActionButton({
    label,
    onClick,
    loading,
    icon,
    className = ''
}: {
    label: string;
    onClick: () => void;
    loading: boolean;
    icon?: React.ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${className}`}
        >
            {icon}
            {loading ? 'Saving...' : label}
        </button>
    );
}

function EditDialog({
    title,
    description,
    onClose,
    children,
    footer
}: {
    title: string;
    description: string;
    onClose: () => void;
    children: React.ReactNode;
    footer: React.ReactNode;
}) {
    React.useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-8 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-black text-slate-900">{title}</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        aria-label="Close dialog"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div>{children}</div>
                <div className="mt-6 flex items-center justify-end gap-3">
                    {footer}
                </div>
            </div>
        </div>
    );
}

function TagRow({ values }: { values: string[] }) {
    return (
        <div className="mt-2 flex flex-wrap gap-2">
            {values.map((value) => (
                <span key={value} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                    {value}
                </span>
            ))}
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center text-sm font-medium text-slate-500">
            {text}
        </div>
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
