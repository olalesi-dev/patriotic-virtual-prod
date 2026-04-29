-- organizations (include patient_mfa_required boolean)
CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    default_telehealth_provider VARCHAR(50) DEFAULT 'DOXY',
    patient_mfa_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- locations
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    address TEXT, -- Changed from LINESTRING to avoid PostGIS dependency
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- roles
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- SuperAdmin, OrgAdmin, Provider, Staff, Biller
    mfa_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- permissions
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL, -- read, write, delete, execute
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- users (include mfa fields)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_enrolled_at TIMESTAMP,
    mfa_secret VARCHAR(255), -- Encrypted
    mfa_type VARCHAR(50) DEFAULT 'SMS',
    organization_id INT REFERENCES organizations(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- user_roles
CREATE TABLE user_roles (
    user_id INT REFERENCES users(id),
    role_id INT REFERENCES roles(id),
    PRIMARY KEY (user_id, role_id)
);

-- providers (extends users)
CREATE TABLE providers (
    user_id INT PRIMARY KEY REFERENCES users(id),
    npi VARCHAR(20),
    specialty VARCHAR(100),
    license_number VARCHAR(50),
    license_state VARCHAR(2),
    bio TEXT,
    doxy_me_link VARCHAR(255),
    zoom_personal_link VARCHAR(255)
);

-- patients
CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(50),
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    preferred_pharmacy TEXT, -- Basic
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- patient_insurance
CREATE TABLE patient_insurance (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    carrier_name VARCHAR(255),
    member_id VARCHAR(100),
    group_id VARCHAR(100),
    image_front_url VARCHAR(255),
    image_back_url VARCHAR(255),
    verified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- appointment_types (video_provider_override enum NULL/ZOOM/GOOGLE_MEET)
CREATE TABLE appointment_types (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    duration_minutes INT DEFAULT 30,
    is_video BOOLEAN DEFAULT TRUE,
    video_provider_override VARCHAR(50), -- ZOOM, GOOGLE_MEET, NULL
    price DECIMAL(10, 2),
    color_code VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- appointments
CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    patient_id INT REFERENCES patients(id),
    provider_id INT REFERENCES providers(user_id),
    appointment_type_id INT REFERENCES appointment_types(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'SCHEDULED', -- SCHEDULED, CHECKED_IN, IN_PROGRESS, COMPLETED, CANCELLED, NO_SHOW
    video_link VARCHAR(255), -- Generated link
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- telehealth_sessions (video_provider_used enum DOXY/ZOOM/GOOGLE_MEET)
CREATE TABLE telehealth_sessions (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    provider_id INT REFERENCES providers(user_id),
    video_provider_used VARCHAR(50) NOT NULL, -- DOXY, ZOOM, GOOGLE_MEET
    session_start_time TIMESTAMP,
    session_end_time TIMESTAMP,
    platform_session_id VARCHAR(255), -- External ID from Zoom/Google
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- telehealth_consent
CREATE TABLE telehealth_consent (
    id SERIAL PRIMARY KEY,
    patient_id INT REFERENCES patients(id),
    appointment_id INT REFERENCES appointments(id),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- encounters
CREATE TABLE encounters (
    id SERIAL PRIMARY KEY,
    appointment_id INT REFERENCES appointments(id),
    provider_id INT REFERENCES providers(user_id),
    patient_id INT REFERENCES patients(id),
    chief_complaint TEXT,
    hpi TEXT, -- History of Present Illness
    ros JSONB, -- Review of Systems (structured)
    vitals JSONB, -- BP, HR, Temp, Weight, Height, BMI
    physical_exam TEXT,
    assessment TEXT,
    plan TEXT,
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, SIGNED, AMENDED
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- encounter_signatures
CREATE TABLE encounter_signatures (
    id SERIAL PRIMARY KEY,
    encounter_id INT REFERENCES encounters(id),
    signer_id INT REFERENCES users(id),
    signature_hash VARCHAR(255),
    signed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- diagnoses (ICD-10)
CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    encounter_id INT REFERENCES encounters(id),
    code VARCHAR(20),
    description VARCHAR(255),
    is_primary BOOLEAN DEFAULT FALSE
);

-- audit_logs (append-only)
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id INT REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- VIEW_PHI, EDIT_CHART, LOGIN, MFA_ENROLL
    resource_type VARCHAR(50), -- PATIENT, APPOINTMENT, USER
    resource_id VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- break_glass_events
CREATE TABLE break_glass_events (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    patient_id INT REFERENCES patients(id),
    reason TEXT NOT NULL,
    accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- integrations
CREATE TABLE integrations (
    id SERIAL PRIMARY KEY,
    organization_id INT REFERENCES organizations(id),
    provider VARCHAR(50) NOT NULL, -- GOOGLE, MICROSOFT, ZOOM
    is_enabled BOOLEAN DEFAULT FALSE,
    config JSONB, -- Encrypted credentials or settings
    full_sync_enabled BOOLEAN DEFAULT FALSE, -- Calendar sync
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- integration_connections (OAuth Tokens)
CREATE TABLE integration_connections (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    integration_id INT REFERENCES integrations(id),
    access_token TEXT, -- Encrypted
    refresh_token TEXT, -- Encrypted
    expires_at TIMESTAMP,
    scope TEXT,
    external_user_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
