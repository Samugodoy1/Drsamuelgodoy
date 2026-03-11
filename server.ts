import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import type { Request, Response } from 'express';

dotenv.config();

process.on('uncaughtException', (err) => {
  fs.appendFileSync('server-debug.log', `Uncaught Exception: ${err.message}\n${err.stack}\n`);
});

process.on('unhandledRejection', (reason, promise) => {
  fs.appendFileSync('server-debug.log', `Unhandled Rejection at: ${promise} reason: ${reason}\n`);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;

const VALID_ACCOUNT_STATUS = new Set(['active', 'blocked', 'pending']);
const VALID_APPOINTMENT_STATUS = new Set(['SCHEDULED', 'CONFIRMED', 'CANCELLED', 'IN_PROGRESS', 'FINISHED']);

const parsePositiveInt = (value: unknown): number | null => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const getSqliteErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return 'Erro inesperado no banco de dados';
};

const requireDentistId = (req: Request, res: Response): number | null => {
  const dentistId = parsePositiveInt(req.query.dentist_id);
  if (!dentistId) {
    res.status(400).json({ error: 'dentist_id deve ser um inteiro positivo' });
    return null;
  }
  return dentistId;
};

async function startServer() {
  // Inicialização do Banco de Dados (Schema)
  try {
    db = new Database('dev.db');
    // Migrações seguras
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[];
    const tableNames = tables.map(t => t.name);

    if (tableNames.includes('users')) {
      const columns = db.prepare("PRAGMA table_info(users)").all() as any[];
      if (!columns.find(c => c.name === 'status')) {
        db.exec("ALTER TABLE users ADD COLUMN status TEXT CHECK(status IN ('pending', 'active', 'blocked')) DEFAULT 'pending'");
      }
      if (!columns.find(c => c.name === 'created_at')) {
        db.exec("ALTER TABLE users ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
      }
    }

    if (tableNames.includes('patients')) {
      const columns = db.prepare("PRAGMA table_info(patients)").all() as any[];
      if (!columns.find(c => c.name === 'dentist_id')) {
        db.exec("ALTER TABLE patients ADD COLUMN dentist_id INTEGER REFERENCES users(id)");
      }
    }

    if (tableNames.includes('clinical_evolution')) {
      const columns = db.prepare("PRAGMA table_info(clinical_evolution)").all() as any[];
      if (!columns.find(c => c.name === 'dentist_id')) {
        db.exec("ALTER TABLE clinical_evolution ADD COLUMN dentist_id INTEGER REFERENCES users(id)");
      }
    }

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT CHECK(role IN ('ADMIN', 'RECEPTIONIST', 'DENTIST')) NOT NULL,
        status TEXT CHECK(status IN ('pending', 'active', 'blocked')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS patients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        dentist_id INTEGER,
        name TEXT NOT NULL,
        cpf TEXT,
        birth_date TEXT,
        phone TEXT,
        email TEXT,
        address TEXT,
        consent_accepted BOOLEAN DEFAULT 0,
        consent_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (dentist_id) REFERENCES users(id)
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
        dentist_id INTEGER,
        appointment_id INTEGER,
        date DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        procedure_performed TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id),
        FOREIGN KEY (dentist_id) REFERENCES users(id),
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

      CREATE TABLE IF NOT EXISTS odontograms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        patient_id INTEGER UNIQUE NOT NULL,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (patient_id) REFERENCES patients(id)
      );
    `);

    // Inserir usuário admin padrão se não existir
    const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@clinica.com');
    if (!adminExists) {
      db.prepare('INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, ?, ?)').run(
        'Dr. Administrador',
        'admin@clinica.com',
        'admin123',
        'ADMIN',
        'active'
      );
    }

    // Atribuir registros órfãos ao admin padrão
    const admin = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1").get() as any;
    if (admin) {
      try { db.prepare("UPDATE patients SET dentist_id = ? WHERE dentist_id IS NULL").run(admin.id); } catch (e) {}
      try { db.prepare("UPDATE clinical_evolution SET dentist_id = ? WHERE dentist_id IS NULL").run(admin.id); } catch (e) {}
    }
  } catch (err) {
    console.error('Database initialization error:', err);
    fs.appendFileSync('server-debug.log', `Database error: ${err}\n`);
  }

  const app = express();
  app.use(express.json());

  // Request logging
  app.use((req, res, next) => {
    const log = `${new Date().toISOString()} - ${req.method} ${req.url}\n`;
    fs.appendFileSync('server-debug.log', log);
    next();
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', database: 'connected' });
  });

  // Auth
  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
      }
      const user = db.prepare('SELECT id, name, email, role, status FROM users WHERE email = ? AND password = ?').get(email, password) as any;
      
      if (user) {
        if (user.status !== 'active') {
          return res.status(403).json({ error: 'Sua conta ainda não foi liberada pelo administrador.' });
        }
        res.json({ user, token: 'fake-jwt-token' });
      } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
      }
    } catch (err: any) {
      fs.appendFileSync('server-debug.log', `Login error: ${err.message}\n`);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  });

  app.post('/api/auth/register', (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
    }
    try {
      const result = db.prepare("INSERT INTO users (name, email, password, role, status) VALUES (?, ?, ?, 'DENTIST', 'pending')").run(name, email, password);
      res.status(201).json({ id: result.lastInsertRowid, message: 'Cadastro realizado com sucesso. Aguarde a aprovação do administrador.' });
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
      }
      res.status(400).json({ error: err.message });
    }
  });

  // Admin Routes
  app.get('/api/admin/users', (req, res) => {
    // Em um app real, verificaríamos o token e o role aqui
    const users = db.prepare('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC').all();
    res.json(users);
  });

  app.patch('/api/admin/users/:id/status', (req, res) => {
    const { status } = req.body;
    const userId = parsePositiveInt(req.params.id);

    if (!userId) {
      return res.status(400).json({ error: 'ID de usuário inválido' });
    }

    if (!VALID_ACCOUNT_STATUS.has(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    try {
      db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: getSqliteErrorMessage(err) });
    }
  });

  // Patients (Multi-tenant)
  app.get('/api/patients', (req, res) => {
    const dentistId = requireDentistId(req, res);
    if (!dentistId) return;

    const patients = db.prepare('SELECT * FROM patients WHERE dentist_id = ? ORDER BY name ASC').all(dentistId);
    res.json(patients);
  });

  app.get('/api/patients/:id', (req, res) => {
    const dentistId = requireDentistId(req, res);
    if (!dentistId) return;

    const patientId = parsePositiveInt(req.params.id);
    if (!patientId) return res.status(400).json({ error: 'ID de paciente inválido' });

    const patient = db.prepare('SELECT * FROM patients WHERE id = ? AND dentist_id = ?').get(patientId, dentistId);
    if (patient) {
      const anamnesis = db.prepare('SELECT * FROM anamnesis WHERE patient_id = ?').get(patientId);
      const evolution = db.prepare('SELECT * FROM clinical_evolution WHERE patient_id = ? AND dentist_id = ? ORDER BY date DESC').all(patientId, dentistId);
      const files = db.prepare('SELECT * FROM patient_files WHERE patient_id = ? ORDER BY created_at DESC').all(patientId);
      const odontogram = db.prepare('SELECT * FROM odontograms WHERE patient_id = ?').get(patientId);
      res.json({ ...patient, anamnesis, evolution, files, odontogram: odontogram ? JSON.parse((odontogram as any).data) : null });
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
    const { notes, procedure_performed, appointment_id, dentist_id } = req.body;
    if (!dentist_id) return res.status(400).json({ error: 'dentist_id é obrigatório' });
    try {
      const result = db.prepare(`
        INSERT INTO clinical_evolution (patient_id, dentist_id, appointment_id, notes, procedure_performed) 
        VALUES (?, ?, ?, ?, ?)
      `).run(req.params.id, dentist_id, appointment_id, notes, procedure_performed);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/patients/:id/odontogram', (req, res) => {
    const { data } = req.body;
    try {
      const exists = db.prepare('SELECT id FROM odontograms WHERE patient_id = ?').get(req.params.id);
      if (exists) {
        db.prepare('UPDATE odontograms SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE patient_id = ?').run(JSON.stringify(data), req.params.id);
      } else {
        db.prepare('INSERT INTO odontograms (patient_id, data) VALUES (?, ?)').run(req.params.id, JSON.stringify(data));
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/patients', (req, res) => {
    const { name, cpf, birth_date, phone, email, address, dentist_id } = req.body;
    if (!dentist_id) return res.status(400).json({ error: 'dentist_id é obrigatório' });
    try {
      const result = db.prepare('INSERT INTO patients (name, cpf, birth_date, phone, email, address, dentist_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        name, cpf, birth_date, phone, email, address, dentist_id
      );
      // Criar anamnese vazia
      db.prepare('INSERT INTO anamnesis (patient_id) VALUES (?)').run(result.lastInsertRowid);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Appointments (Multi-tenant)
  app.get('/api/appointments', (req, res) => {
    const dentistId = requireDentistId(req, res);
    if (!dentistId) return;

    const appointments = db.prepare(`
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, u.name as dentist_name
      FROM appointments a 
      JOIN patients p ON a.patient_id = p.id
      JOIN users u ON a.dentist_id = u.id
      WHERE a.dentist_id = ?
      ORDER BY a.start_time ASC
    `).all(dentistId);
    res.json(appointments);
  });

  app.post('/api/appointments', (req, res) => {
    const { patient_id, dentist_id, start_time, end_time, notes } = req.body;
    console.log('Tentativa de agendamento:', { patient_id, dentist_id, start_time, end_time });
    
    if (!patient_id || !dentist_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'Paciente, dentista, início e término são obrigatórios' });
    }

    try {
      const result = db.prepare('INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, notes) VALUES (?, ?, ?, ?, ?)').run(
        Number(patient_id), 
        Number(dentist_id), 
        start_time, 
        end_time, 
        notes || ''
      );
      console.log('Agendamento realizado com sucesso, ID:', result.lastInsertRowid);
      res.status(201).json({ id: result.lastInsertRowid });
    } catch (err: any) {
      console.error('Erro ao realizar agendamento:', err.message);
      res.status(400).json({ error: err.message });
    }
  });

  app.patch('/api/appointments/:id/status', (req, res) => {
    const { status } = req.body;
    const appointmentId = parsePositiveInt(req.params.id);

    if (!appointmentId) {
      return res.status(400).json({ error: 'ID de agendamento inválido' });
    }

    if (!VALID_APPOINTMENT_STATUS.has(status)) {
      return res.status(400).json({ error: 'Status inválido para agendamento' });
    }

    try {
      db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, appointmentId);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ error: getSqliteErrorMessage(err) });
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
