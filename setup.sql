-- SQL para criar as tabelas no PostgreSQL (Neon)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK (role IN ('ADMIN', 'RECEPTIONIST', 'DENTIST')) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'active', 'blocked')) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    id SERIAL PRIMARY KEY,
    dentist_id INTEGER REFERENCES users(id),
    name TEXT NOT NULL,
    cpf TEXT,
    birth_date TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    consent_accepted BOOLEAN DEFAULT FALSE,
    consent_date TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anamnesis (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER UNIQUE NOT NULL REFERENCES patients(id),
    medical_history TEXT,
    allergies TEXT,
    medications TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    dentist_id INTEGER NOT NULL REFERENCES users(id),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    status TEXT CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'FINISHED', 'NO_SHOW')) DEFAULT 'SCHEDULED',
    notes TEXT
);

CREATE TABLE IF NOT EXISTS clinical_evolution (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    dentist_id INTEGER REFERENCES users(id),
    appointment_id INTEGER REFERENCES appointments(id),
    date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    procedure_performed TEXT
);

CREATE TABLE IF NOT EXISTS patient_files (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL REFERENCES patients(id),
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS odontograms (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER UNIQUE NOT NULL REFERENCES patients(id),
    data TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir usuário admin padrão
INSERT INTO users (name, email, password, role, status)
VALUES ('Dr. Administrador', 'admin@clinica.com', 'admin123', 'ADMIN', 'active')
ON CONFLICT (email) DO NOTHING;
