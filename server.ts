import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';

dotenv.config();

const db = new Database('dev.db');

// Inicialização do Banco de Dados (Schema)
const usersSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get() as { sql: string } | undefined;

if (usersSchema && !usersSchema.sql.includes('DENTIST')) {
  console.log('Migrando tabela users para incluir papel DENTIST...');
  db.exec('PRAGMA foreign_keys = OFF;');
  try {
    db.transaction(() => {
      db.exec(`
        ALTER TABLE users RENAME TO users_old;
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          role TEXT CHECK(role IN ('ADMIN', 'RECEPTIONIST', 'DENTIST')) NOT NULL
        );
        INSERT INTO users (id, name, email, password, role)
        SELECT id, name, email, password, role FROM users_old;
        DROP TABLE users_old;
      `);
    })();
    console.log('Migração concluída.');
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('ADMIN', 'RECEPTIONIST', 'DENTIST')) NOT NULL
  );

  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    cpf TEXT UNIQUE,
    birth_date TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    consent_accepted BOOLEAN DEFAULT 0,
    consent_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS anamnesis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER UNIQUE NOT NULL,
    medical_history TEXT,
    allergies TEXT,
    medications TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    dentist_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    status TEXT CHECK(status IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'FINISHED')) DEFAULT 'SCHEDULED',
    notes TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (dentist_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS clinical_evolution (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    appointment_id INTEGER,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    procedure_performed TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );

  CREATE TABLE IF NOT EXISTS patient_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  CREATE TABLE IF NOT EXISTS financial_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    status TEXT CHECK(status IN ('PENDING', 'PAID')) DEFAULT 'PENDING',
    payment_method TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (appointment_id) REFERENCES appointments(id)
  );
`);

// Inserir usuário admin padrão se não existir (senha: admin123 - em prod usar hash!)
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@clinica.com');
if (!adminExists) {
  db.prepare('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)').run(
    'Dr. Administrador',
    'admin@clinica.com',
    'admin123', // Simplificado para o MVP
    'ADMIN'
  );
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // Auth (Simulado para o MVP inicial)
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE email = ? AND password = ?').get(email, password);
    
    if (user) {
      res.json({ user, token: 'fake-jwt-token' });
    } else {
      res.status(401).json({ error: 'Credenciais inválidas' });
    }
  });

  // Patients
  app.get('/api/patients', (req, res) => {
    const patients = db.prepare('SELECT * FROM patients ORDER BY name ASC').all();
    res.json(patients);
  });

  app.get('/api/patients/:id', (req, res) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    if (patient) {
      const anamnesis = db.prepare('SELECT * FROM anamnesis WHERE patient_id = ?').get(req.params.id);
      const evolution = db.prepare('SELECT * FROM clinical_evolution WHERE patient_id = ? ORDER BY date DESC').all(req.params.id);
      const files = db.prepare('SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC').all(req.params.id);
      res.json({ ...patient, anamnesis, evolution, files });
    } else {
      res.status(404).json({ error: 'Paciente não encontrado' });
    }
  });

  app.put('/api/patients/:id/anamnesis', (req, res) => {
    const { medical_history, allergies, medications } = req.body;
    try {
      db.prepare(`
        UPDATE anamnesis 
        SET medical_history = ?, allergies = ?, medications = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE patient_id = ?
      `).run(medical_history, allergies, medications, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/patients/:id/evolution', (req, res) => {
    const { notes, procedure_performed, appointment_id } = req.body;
    try {
      const result = db.prepare(`
        INSERT INTO clinical_evolution (patient_id, appointment_id, notes, procedure_performed) 
        VALUES (?, ?, ?, ?)
      `).run(req.params.id, appointment_id, notes, procedure_performed);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/patients', (req, res) => {
    const { name, cpf, birth_date, phone, email, address } = req.body;
    try {
      const result = db.prepare('INSERT INTO patients (name, cpf, birth_date, phone, email, address) VALUES (?, ?, ?, ?, ?, ?)').run(
        name, cpf, birth_date, phone, email, address
      );
      // Criar anamnese vazia
      db.prepare('INSERT INTO anamnesis (patient_id) VALUES (?)').run(result.lastInsertRowid);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Appointments
  app.get('/api/appointments', (req, res) => {
    const appointments = db.prepare(`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, u.name as dentist_name
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.dentist_id = u.id
      ORDER BY a.start_time ASC
    `).all();
    res.json(appointments);
  });

  app.post('/api/appointments', (req, res) => {
    const { patient_id, dentist_id, start_time, end_time, notes } = req.body;
    try {
      const result = db.prepare('INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?)').run(
        patient_id, dentist_id, start_time, end_time, notes
      );
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/appointments/:id/status', (req, res) => {
    const { status } = req.body;
    try {
      db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/appointments/:id/remind', (req, res) => {
    // Simulação de envio de lembrete
    res.json({ success: true, message: 'Lembrete enviado com sucesso via WhatsApp (simulado)' });
  });

  // Dentists (Users with DENTIST role)
  app.get('/api/dentists', (req, res) => {
    const dentists = db.prepare("SELECT id, name, email, role FROM users WHERE role = 'DENTIST' OR role = 'ADMIN'").all();
    res.json(dentists);
  });

  app.post('/api/dentists', (req, res) => {
    const { name, email, password } = req.body;
    console.log('Tentativa de cadastro de dentista:', { name, email });
    
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }

    try {
      const result = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'DENTIST')").run(name, email, password);
      console.log('Dentista cadastrado com sucesso, ID:', result.lastInsertRowid);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error('Erro ao cadastrar dentista:', err.message);
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/dentists/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM users WHERE id = ? AND role = "DENTIST"').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Patient Files
  app.get('/api/patients/:id/files', (req, res) => {
    const files = db.prepare('SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC').all(req.params.id);
    res.json(files);
  });

  app.post('/api/patients/:id/files', (req, res) => {
    const { file_url, file_type, description } = req.body;
    try {
      const result = db.prepare('INSERT INTO patient_files (patient_id, file_url, file_type, description) VALUES (?, ?, ?, ?)').run(
        req.params.id, file_url, file_type, description
      );
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.delete('/api/files/:id', (req, res) => {
    try {
      db.prepare('DELETE FROM patient_files WHERE id = ?').run(req.params.id);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
