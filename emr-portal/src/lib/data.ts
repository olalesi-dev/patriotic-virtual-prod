
export interface Patient {
    id: number;
    name: string;
    mrn: string;
    dob: string;
    sex: 'Male' | 'Female' | 'Other';
    state: string;
    phone: string;
    email: string;
    status: string;
    statusColor: string;
    serviceLine: string;
    isDemo?: boolean;
    allergies: string[];
    alerts: { label: string; type: 'warning' | 'error' | 'info' | 'success' }[];
    problemList: { code: string; description: string }[];
    activeMedications: { name: string; dosage: string; frequency: string }[];
    recentEncounters: { date: string; title: string; provider: string }[];
    upcomingAppointments: { date: string; time: string; title: string; type: 'Video' | 'In-person' }[];
    weightTrend: number[];
    consents: { title: string; date: string; status: 'Signed' | 'Acknowledged' | 'Pending' }[];
    careTeam: { role: string; name: string }[];
    tags?: { label: string; color: string }[];
    team?: string[];
    notes?: any[];
    orders?: any[];
    imaging?: any[];
    vitalsHistory?: { date: string; weight: number; bp: string; hr: number; bmi: number }[];
    labsHistory?: { date: string; panel: string; results: { test: string; value: string; unit: string; range: string; status: 'Normal' | 'Abnormal' }[] }[];
    documents?: { id: string; name: string; category: string; date: string; type: string; url: string; size: string }[];
    messages?: { id: number; type: 'sent' | 'received' | 'ai'; text: string; timestamp: string; date: string }[];
    billing?: {
        subscription: {
            plan: string;
            status: 'Active' | 'Past Due' | 'Cancelled';
            nextBillingDate: string;
            amount: number;
        };
        balance: number;
        history: {
            id: string;
            date: string;
            description: string;
            amount: number;
            status: 'Paid' | 'Pending' | 'Failed';
            url?: string;
        }[];
    };
}

export const PATIENTS: Patient[] = [
    {
        id: 1,
        name: 'Bobby Doe',
        mrn: 'MRN-001234',
        dob: '1985-05-15',
        sex: 'Male',
        state: 'NY',
        isDemo: true,
        phone: '+1 (800) 555-0100',
        email: 'bobby@example.com',
        serviceLine: 'Primary Care',
        allergies: ['NKDA'],
        alerts: [
            { label: 'Overdue Labs', type: 'error' },
            { label: 'Consent Expiring', type: 'warning' }
        ],
        problemList: [
            { code: 'E66.01', description: 'Morbid obesity, BMI 40+' },
            { code: 'R73.03', description: 'Prediabetes' }
        ],
        activeMedications: [
            { name: 'Semaglutide', dosage: '1.0mg', frequency: 'SQ weekly' },
            { name: 'Testosterone Cyp', dosage: '120mg', frequency: 'IM weekly' }
        ],
        recentEncounters: [
            { date: '2026-02-03', title: 'GLP-1 Follow-up', provider: 'Dr. Olufolaju' },
            { date: '2026-01-06', title: 'Initial Consult', provider: 'Dr. Olufolaju' }
        ],
        upcomingAppointments: [
            { date: '2026-03-03', time: '10:00 AM', title: 'Titration Review', type: 'Video' }
        ],
        weightTrend: [285, 282, 278, 275, 272, 270],
        vitalsHistory: [
            { date: '2026-02-15', weight: 270, bp: '128/82', hr: 72, bmi: 38.5 },
            { date: '2026-02-01', weight: 275, bp: '130/84', hr: 74, bmi: 39.2 },
            { date: '2026-01-15', weight: 282, bp: '132/86', hr: 76, bmi: 40.2 }
        ],
        labsHistory: [
            {
                date: '2026-02-15',
                panel: 'GLP-1 Panel',
                results: [
                    { test: 'HbA1c', value: '5.6', unit: '%', range: '4.0-5.6', status: 'Normal' },
                    { test: 'Glucose', value: '102', unit: 'mg/dL', range: '65-99', status: 'Abnormal' },
                    { test: 'ALT', value: '24', unit: 'U/L', range: '0-44', status: 'Normal' }
                ]
            },
            {
                date: '2026-01-15',
                panel: 'Initial Screening',
                results: [
                    { test: 'HbA1c', value: '6.2', unit: '%', range: '4.0-5.6', status: 'Abnormal' },
                    { test: 'Total Cholesterol', value: '210', unit: 'mg/dL', range: '<200', status: 'Abnormal' }
                ]
            }
        ],
        consents: [
            { title: 'Telehealth Consent', date: '2026-01-06', status: 'Signed' },
            { title: 'HIPAA Notice', date: '2026-01-06', status: 'Acknowledged' },
            { title: 'Treatment Consent', date: '2026-01-06', status: 'Signed' }
        ],
        careTeam: [
            { role: 'Primary', name: 'Dayo Olufolaju, DO' }
        ],
        tags: [
            { label: 'Referral', color: 'bg-amber-100 text-amber-800' },
            { label: 'Telehealth', color: 'bg-emerald-100 text-emerald-800' }
        ],
        status: 'Active',
        statusColor: 'bg-emerald-100 text-emerald-700',
        team: ['OO'],
        notes: [],
        orders: [
            { id: 'ORD-101', type: 'lab', description: 'GLP-1 Panel', date: '2026-02-15', status: 'In Progress', orderedBy: 'Dr. Olufolaju', tests: ['CMP', 'A1C', 'Lipid Panel', 'TSH'] },
            { id: 'ORD-102', type: 'referral', description: 'Cardiology Specialist', date: '2026-01-20', status: 'Resulted', orderedBy: 'Dr. Olufolaju' }
        ],
        imaging: [
            { id: 'IMG-101', modality: 'MRI', bodyPart: 'Brain', date: '2026-02-10', status: 'Reported', facility: 'Orosun Health Network', provider: 'Dr. Olufolaju' },
            { id: 'IMG-102', modality: 'DEXA', bodyPart: 'Full Body', date: '2026-01-15', status: 'Read', facility: 'Orosun Health Network', provider: 'Dr. Olufolaju' }
        ],
        documents: [
            { id: 'DOC-001', name: 'Telehealth Consent Form', category: 'Consent Forms', date: '2026-01-06', type: 'PDF', url: '#', size: '1.2 MB' },
            { id: 'DOC-002', name: 'Comprehensive Metabolic Panel', category: 'Lab Results', date: '2026-02-15', type: 'PDF', url: '#', size: '850 KB' },
            { id: 'DOC-003', name: 'Brain MRI Report', category: 'Imaging Reports', date: '2026-02-10', type: 'PDF', url: '#', size: '2.4 MB' },
            { id: 'DOC-004', name: 'Initial Consult Summary', category: 'Clinical Notes', date: '2026-01-06', type: 'PDF', url: '#', size: '420 KB' },
            { id: 'DOC-005', name: 'Wegovy Prior Auth Approval', category: 'Prior Auth', date: '2026-01-10', type: 'PDF', url: '#', size: '1.1 MB' },
            { id: 'DOC-006', name: 'Insurance Card Front', category: 'Patient-Uploaded', date: '2026-01-05', type: 'JPG', url: '#', size: '2.1 MB' }
        ],
        messages: [
            { id: 1, type: 'received', text: "Hi Dr. Olufolaju, I've been feeling a bit nauseous after the last dose increase. Is this normal?", timestamp: '10:30 AM', date: 'Today' },
            { id: 2, type: 'sent', text: "Hi Bobby, yes that can be a common side effect given the titration schedule. Try eating smaller meals and let's monitor it for another 24 hours.", timestamp: '10:45 AM', date: 'Today' }
        ],
        billing: {
            subscription: {
                plan: 'Comprehensive GLP-1 Care',
                status: 'Active',
                nextBillingDate: '2026-03-06',
                amount: 299.00
            },
            balance: 0.00,
            history: [
                { id: 'INV-1001', date: '2026-02-06', description: 'Monthly Subscription - Feb', amount: 299.00, status: 'Paid', url: '#' },
                { id: 'INV-1000', date: '2026-01-06', description: 'Monthly Subscription - Jan', amount: 299.00, status: 'Paid', url: '#' },
                { id: 'INV-0999', date: '2026-01-06', description: 'Initial Consult Fee', amount: 150.00, status: 'Paid', url: '#' }
            ]
        }
    },
    {
        id: 2,
        name: 'John Doe',
        mrn: 'MRN-001235',
        dob: '1990-11-22',
        sex: 'Male',
        state: 'TX',
        phone: '+2 (800) 555-0101',
        email: 'john@example.com',
        serviceLine: 'Behavioral Health',
        allergies: ['Penicillin (rash)', 'Sulfa (hives)'],
        alerts: [{ label: 'High Churn Risk', type: 'warning' }],
        problemList: [{ code: 'F32.9', description: 'Major depressive disorder, unspecified' }],
        activeMedications: [{ name: 'Sertraline', dosage: '50mg', frequency: 'PO daily' }],
        recentEncounters: [{ date: '2026-01-15', title: 'Psych Eval', provider: 'Dr. Smith' }],
        upcomingAppointments: [],
        weightTrend: [180, 181, 180, 182, 181, 180],
        vitalsHistory: [
            { date: '2026-01-15', weight: 180, bp: '120/80', hr: 68, bmi: 24.5 }
        ],
        labsHistory: [],
        consents: [{ title: 'HIPAA Notice', date: '2026-01-15', status: 'Acknowledged' }],
        careTeam: [{ role: 'Primary', name: 'Dr. Smith' }],
        status: 'Wait List',
        statusColor: 'bg-orange-100 text-orange-700',
        team: ['OO', 'DO', 'img'],
        notes: [],
        orders: [
            { id: 'ORD-201', type: 'lab', description: 'Comprehensive Metabolic Panel', date: '2026-01-15', status: 'Ordered', orderedBy: 'Dr. Smith', tests: ['CMP'] }
        ],
        imaging: [],
        documents: [
            { id: 'DOC-101', name: 'HIPAA Acknowledgement', category: 'Consent Forms', date: '2026-01-15', type: 'PDF', url: '#', size: '1.5 MB' }
        ]
    }
];
