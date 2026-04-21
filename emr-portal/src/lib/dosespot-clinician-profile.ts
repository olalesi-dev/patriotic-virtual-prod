import { z } from 'zod';

export const DOSESPOT_PHONE_TYPES = [
    'Undefined',
    'Beeper',
    'Cell',
    'Fax',
    'Home',
    'Work',
    'Night',
    'Primary'
] as const;

export const DOSESPOT_CLINICIAN_SPECIALTIES = [
    'AllergyAndImmunology',
    'Dermatology',
    'Dentistry',
    'BehavioralHealth',
    'FamilyMedicine',
    'InternalMedicine',
    'ObstetricsAndGynecology',
    'Orthopedics',
    'Pediatrics',
    'PhysicalMedicine',
    'Psychiatry',
    'Urology'
] as const;

export const DOSESPOT_PDMP_ROLE_TYPES = [
    'Physician',
    'Dentist',
    'NursePractitioner',
    'PhysiciansAssistant',
    'Resident',
    'Intern',
    'Psychologist',
    'Optometrist',
    'NaturopathicPhysician'
] as const;

export const ADMIN_USER_ROLES = ['patient', 'provider', 'admin', 'staff'] as const;

const optionalShortText = (max: number) => z.string().trim().max(max).default('');

const dateField = z.string().trim().default('').refine((value) => (
    value.length === 0 || /^\d{4}-\d{2}-\d{2}$/.test(value)
), 'Enter a valid date.');

const sexField = z.enum(['Male', 'Female', 'Non-binary', 'Prefer not to say']).or(z.literal('')).default('');
const LEGACY_PDMP_ROLE_TYPE_ALIASES: Record<string, typeof DOSESPOT_PDMP_ROLE_TYPES[number]> = {
    NursePracticioner: 'NursePractitioner'
};

const providerDoseSpotFieldsSchema = z.object({
    prefix: optionalShortText(10),
    middleName: optionalShortText(35),
    suffix: optionalShortText(10),
    address1: optionalShortText(35),
    address2: optionalShortText(35),
    city: optionalShortText(35),
    state: optionalShortText(20),
    zipCode: optionalShortText(10),
    primaryPhoneType: z.enum(DOSESPOT_PHONE_TYPES).default('Work'),
    primaryFax: optionalShortText(25),
    npiNumber: optionalShortText(35),
    deaNumber: optionalShortText(35),
    stateLicenseNumber: optionalShortText(35),
    stateLicenseState: optionalShortText(20),
    clinicianSpecialtyType: z.enum(DOSESPOT_CLINICIAN_SPECIALTIES).or(z.literal('')).default(''),
    pdmpRoleType: z.preprocess(
        (value) => {
            if (typeof value !== 'string') return value;
            const normalized = value.trim();
            return LEGACY_PDMP_ROLE_TYPE_ALIASES[normalized] ?? normalized;
        },
        z.enum(DOSESPOT_PDMP_ROLE_TYPES).or(z.literal(''))
    ).default(''),
    epcsRequested: z.boolean().default(true),
    active: z.boolean().default(true)
});

const baseAdminUserFields = z.object({
    firstName: z.string().trim().min(1, 'First name is required.').max(35, 'First name is too long.'),
    lastName: z.string().trim().min(1, 'Last name is required.').max(35, 'Last name is too long.'),
    email: z.string().trim().email('Enter a valid email address.'),
    phone: optionalShortText(25),
    dob: dateField,
    sex: sexField,
    role: z.enum(ADMIN_USER_ROLES),
    ...providerDoseSpotFieldsSchema.shape
});

function validateProviderFields(
    value: z.infer<typeof baseAdminUserFields>,
    ctx: z.RefinementCtx
) {
    if (value.role !== 'provider') {
        return;
    }

    const requiredFields: Array<[keyof typeof value, string]> = [
        ['dob', 'Date of birth is required for providers.'],
        ['phone', 'Primary phone is required for providers.'],
        ['address1', 'Address line 1 is required for DoseSpot sync.'],
        ['city', 'City is required for DoseSpot sync.'],
        ['state', 'State is required for DoseSpot sync.'],
        ['zipCode', 'ZIP code is required for DoseSpot sync.'],
        ['primaryFax', 'Primary fax is required for DoseSpot sync.'],
        ['npiNumber', 'NPI number is required for prescribing clinicians.'],
    ];

    for (const [field, message] of requiredFields) {
        const fieldValue = value[field];
        if (typeof fieldValue === 'string' && fieldValue.trim().length === 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [field],
                message
            });
        }
    }
}

export const adminCreateUserSchema = baseAdminUserFields.extend({
    password: z.string().min(8, 'Password must be at least 8 characters.')
}).superRefine(validateProviderFields);

export const adminUpdateUserSchema = baseAdminUserFields.superRefine(validateProviderFields);

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUpdateUserInput = z.infer<typeof adminUpdateUserSchema>;

export interface DoseSpotSyncSnapshot {
    synced?: boolean;
    registrationStatus?: string | null;
    lastSyncError?: string | null;
}

export function createAdminUserFormDefaults(): AdminCreateUserInput {
    return {
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        dob: '',
        sex: '',
        role: 'patient',
        prefix: '',
        middleName: '',
        suffix: '',
        address1: '',
        address2: '',
        city: '',
        state: '',
        zipCode: '',
        primaryPhoneType: 'Work',
        primaryFax: '',
        npiNumber: '',
        deaNumber: '',
        stateLicenseNumber: '',
        stateLicenseState: '',
        clinicianSpecialtyType: '',
        pdmpRoleType: '',
        epcsRequested: true,
        active: true
    };
}

export function createAdminUserUpdateDefaults(): AdminUpdateUserInput {
    const { password: _password, ...defaults } = createAdminUserFormDefaults();
    return defaults;
}

export function formatDoseSpotEnumLabel(value: string): string {
    return value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
        .trim();
}

export function normalizeDoseSpotPdmpRoleType(value: string | null | undefined): string {
    if (!value) return '';
    return LEGACY_PDMP_ROLE_TYPE_ALIASES[value.trim()] ?? value.trim();
}

function normalizePhone(value: string): string {
    return value.replace(/\s+/g, ' ').trim();
}

export function buildAdminUserProfileFields(
    input: AdminCreateUserInput | AdminUpdateUserInput,
    options: {
        uid: string;
        disabled?: boolean;
        existingDoseSpot?: DoseSpotSyncSnapshot | null;
        includeCreatedAt?: boolean;
    }
): Record<string, unknown> {
    const displayName = `${input.firstName} ${input.lastName}`.trim();
    const now = new Date();
    const base: Record<string, unknown> = {
        uid: options.uid,
        email: input.email,
        displayName,
        name: displayName,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: normalizePhone(input.phone),
        dob: input.dob || null,
        dateOfBirth: input.dob || null,
        sex: input.sex || null,
        gender: input.sex || null,
        address: input.address1 || '',
        address1: input.address1 || '',
        address2: input.address2 || '',
        city: input.city || '',
        state: input.state || '',
        zip: input.zipCode || '',
        zipCode: input.zipCode || '',
        role: input.role,
        status: options.disabled ? 'disabled' : (input.active === false ? 'inactive' : 'active'),
        updatedAt: now
    };

    if (options.includeCreatedAt) {
        base.createdAt = now;
    }

    if (input.role !== 'provider') {
        return base;
    }

    return {
        ...base,
        prefix: input.prefix || '',
        middleName: input.middleName || '',
        suffix: input.suffix || '',
        primaryPhoneType: input.primaryPhoneType,
        primaryFax: input.primaryFax || '',
        specialty: input.clinicianSpecialtyType || '',
        clinicianSpecialtyType: input.clinicianSpecialtyType || '',
        pdmpRoleType: normalizeDoseSpotPdmpRoleType(input.pdmpRoleType) || null,
        npi: input.npiNumber || '',
        npiNumber: input.npiNumber || '',
        deaNumber: input.deaNumber || '',
        stateLicenseNumber: input.stateLicenseNumber || '',
        stateLicenseState: input.stateLicenseState || '',
        clinicianRoleTypes: ['PrescribingClinician'],
        epcsRequested: input.epcsRequested,
        active: input.active,
        doseSpot: {
            synced: options.existingDoseSpot?.synced ?? false,
            registrationStatus: options.existingDoseSpot?.registrationStatus ?? null,
            lastSyncError: options.existingDoseSpot?.lastSyncError ?? null
        }
    };
}
