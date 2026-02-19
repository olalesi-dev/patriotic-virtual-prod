
export interface Patient {
    id: number;
    name: string;
    mrn: string;
    dob: string;
    phone: string;
    email: string;
    status: string;
    statusColor: string;
    serviceLine: string;
    isDemo?: boolean;
    tags?: { label: string; color: string }[];
    team?: string[];
    notes?: any[];
}

export const PATIENTS: Patient[] = [
    {
        id: 1,
        name: 'Bobby Doe',
        mrn: 'MRN-001234',
        dob: '1985-05-15',
        isDemo: true,
        phone: '+1 (800) 555-0100',
        email: 'bobby@example.com',
        serviceLine: 'Primary Care',
        tags: [
            { label: 'Referral', color: 'bg-amber-100 text-amber-800' },
            { label: 'Telehealth', color: 'bg-emerald-100 text-emerald-800' },
            { label: 'Intake', color: 'bg-cyan-100 text-cyan-800' },
            { label: 'Couple', color: 'bg-pink-100 text-pink-800' }
        ],
        status: 'Active',
        statusColor: 'bg-emerald-100 text-emerald-700',
        team: ['OO'],
        notes: []
    },
    {
        id: 2,
        name: 'John Doe',
        mrn: 'MRN-001235',
        dob: '1990-11-22',
        isDemo: true,
        phone: '+2 (800) 555-0101',
        email: 'john@example.com',
        serviceLine: 'Behavioral Health',
        tags: [
            { label: 'Discount', color: 'bg-orange-100 text-orange-800' },
            { label: 'Assessment', color: 'bg-amber-100 text-amber-800' },
            { label: 'Group', color: 'bg-blue-100 text-blue-800' }
        ],
        status: 'Wait List',
        statusColor: 'bg-orange-100 text-orange-700',
        team: ['OO', 'DO', 'img'],
        notes: []
    },
    {
        id: 3,
        name: 'Sarah Doe',
        mrn: 'MRN-001236',
        dob: '1978-03-09',
        isDemo: true,
        phone: '+3 (800) 555-0102',
        email: 'sarah@example.com',
        serviceLine: 'Telehealth',
        tags: [
            { label: 'Elevated Risk', color: 'bg-red-100 text-red-800' },
            { label: 'Insurance', color: 'bg-purple-100 text-purple-800' }
        ],
        status: 'Lead',
        statusColor: 'bg-purple-100 text-purple-700',
        team: ['img'],
        notes: []
    },
    {
        id: 4,
        name: 'Wendy Smith',
        mrn: 'MRN-002001',
        dob: '1982-12-04',
        phone: '+1 (555) 012-3456',
        email: 'wendy@example.com',
        status: 'Active',
        statusColor: 'bg-emerald-100 text-emerald-700',
        serviceLine: 'Concierge Medicine',
        team: ['DO'],
        notes: []
    },
    {
        id: 5,
        name: 'Michael Brown',
        mrn: 'MRN-002002',
        dob: '1965-08-27',
        phone: '+1 (555) 987-6543',
        email: 'michael.b@example.com',
        status: 'Active',
        statusColor: 'bg-emerald-100 text-emerald-700',
        serviceLine: 'Primary Care',
        team: ['OO'],
        notes: []
    }
];
