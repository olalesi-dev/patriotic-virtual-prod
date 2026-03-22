import { 
    Baby, Activity, Heart, Stethoscope, BrainCircuit, ActivitySquare,
    Users, FlaskConical, Bone, Briefcase, PlusSquare
} from 'lucide-react';

export interface SpecialtyModule {
    id: string;
    name: string;
    description: string;
    icon: any; // Lucide icon
    pages: { id: string; title: string }[];
}

export const SPECIALTY_MODULES: SpecialtyModule[] = [
    {
        id: 'pediatrics',
        name: 'Pediatrics',
        description: 'Comprehensive care tools tailored for infants, children, and adolescents.',
        icon: Baby,
        pages: [
            { id: 'vaccination-tracking', title: 'Vaccination Tracking' },
            { id: 'growth-charts', title: 'Growth Charts' },
            { id: 'well-child-visits', title: 'Well-Child Visits' }
        ]
    },
    {
        id: 'gynecology',
        name: "Gynecology & Women's Health",
        description: 'Specialized tools for menstrual tracking, pregnancy profiles, and screenings.',
        icon: Activity,
        pages: [
            { id: 'menstrual-tracking', title: 'Menstrual Tracking' },
            { id: 'pregnancy-profiles', title: 'Pregnancy Profiles' },
            { id: 'routine-screenings', title: 'Routine Screenings' }
        ]
    },
    {
        id: 'cardiology',
        name: 'Cardiology',
        description: 'Advanced monitoring for cardiovascular health including ECG parameters.',
        icon: Heart,
        pages: [
            { id: 'ecg-readings', title: 'ECG Readings' },
            { id: 'hrv-tracking', title: 'Heart Rate Variability (HRV)' },
            { id: 'bp-logs', title: 'Blood Pressure Logs' }
        ]
    },
    {
        id: 'dermatology',
        name: 'Dermatology',
        description: 'Visual tracking and diagnostic support for skin health condition logs.',
        icon: Stethoscope,
        pages: [
            { id: 'rash-diagnosis', title: 'Rash Diagnosis' },
            { id: 'skin-lesion-mapping', title: 'Skin Lesion Mapping' },
            { id: 'acne-care', title: 'Acne Care' }
        ]
    },
    {
        id: 'psychiatry',
        name: 'Mental Health & Psychiatry',
        description: 'Behavioral health assessments, mood tracking, and structured therapy notes.',
        icon: BrainCircuit,
        pages: [
            { id: 'mood-tracking', title: 'Mood Tracking' },
            { id: 'cognitive-assessment', title: 'Cognitive Assessment' },
            { id: 'therapy-notes', title: 'Therapy Notes' }
        ]
    },
    {
        id: 'metabolic',
        name: 'Weight Management & Metabolic',
        description: 'Dedicated workflows for GLP-1 tracking, caloric deficits, and body comp.',
        icon: ActivitySquare,
        pages: [
            { id: 'caloric-deficit', title: 'Caloric Deficit Tracker' },
            { id: 'glp1-adherence', title: 'GLP-1 Adherence' },
            { id: 'bia-trends', title: 'BIA Trends' }
        ]
    },
    {
        id: 'urology',
        name: "Urology & Men's Health",
        description: 'Essential functions for TRT monitoring, PSA panels, and urological diaries.',
        icon: Users,
        pages: [
            { id: 'testosterone-monitoring', title: 'Testosterone Monitoring' },
            { id: 'psa-tracking', title: 'PSA Tracking' },
            { id: 'voiding-diaries', title: 'Voiding Diaries' }
        ]
    },
    {
        id: 'endocrinology',
        name: 'Endocrinology',
        description: 'Comprehensive diabetes management and integrated thyroid panel tracking.',
        icon: FlaskConical,
        pages: [
            { id: 'cgm-sync', title: 'CGM Data Sync' },
            { id: 'insulin-management', title: 'Insulin Management' },
            { id: 'thyroid-panels', title: 'Thyroid Panels' }
        ]
    },
    {
        id: 'orthopedics',
        name: 'Orthopedics & Sports Medicine',
        description: 'Tracking tools for range of motion, therapies, and injection procedures.',
        icon: Bone,
        pages: [
            { id: 'rom-log', title: 'Range of Motion Log' },
            { id: 'physio-protocols', title: 'Physio Protocols' },
            { id: 'joint-injections', title: 'Joint Injection Records' }
        ]
    },
    {
        id: 'urgent-care',
        name: 'Urgent Care & Primary Care',
        description: 'Streamlined intake templates for walk-ins and rapid triage protocols.',
        icon: PlusSquare,
        pages: [
            { id: 'triage-intake', title: 'Triage Intake' },
            { id: 'walk-in-queue', title: 'Walk-in Queue' },
            { id: 'vitals-checklist', title: 'Vitals Checklist' }
        ]
    }
];
