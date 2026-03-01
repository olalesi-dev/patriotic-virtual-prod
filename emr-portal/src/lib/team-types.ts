export interface TeamMemberSummary {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
}

export interface TeamSummary {
    id: string;
    name: string;
    description: string | null;
    color: string;
    ownerId: string;
    ownerName: string;
    memberIds: string[];
    members: TeamMemberSummary[];
    patientIds: string[];
    pendingInviteDoctorIds: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ProviderSummary {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
}

export interface PatientSummary {
    id: string;
    name: string;
    email: string | null;
    teamId: string | null;
}
