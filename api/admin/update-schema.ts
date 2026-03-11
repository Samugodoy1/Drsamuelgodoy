import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS phone TEXT,
      ADD COLUMN IF NOT EXISTS cro TEXT,
      ADD COLUMN IF NOT EXISTS specialty TEXT,
      ADD COLUMN IF NOT EXISTS bio TEXT,
      ADD COLUMN IF NOT EXISTS photo_url TEXT,
      ADD COLUMN IF NOT EXISTS clinic_name TEXT,
      ADD COLUMN IF NOT EXISTS clinic_address TEXT,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        dentist_id INTEGER NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('INCOME', 'EXPENSE')),
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        payment_method TEXT NOT NULL,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        status TEXT NOT NULL DEFAULT 'PAID',
        patient_id INTEGER,
        patient_name TEXT,
        procedure TEXT,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        ip_address TEXT,
        attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT FALSE
      );

      CREATE TABLE IF NOT EXISTS security_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        event_type TEXT NOT NULL,
        description TEXT,
        ip_address TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS tooth_history (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        dentist_id INTEGER NOT NULL REFERENCES users(id),
        tooth_number INTEGER NOT NULL,
        procedure TEXT NOT NULL,
        notes TEXT,
        date DATE NOT NULL DEFAULT CURRENT_DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS odontograms (
        patient_id INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Hash default admin password if it exists and is plain text
    const adminResult = await query("SELECT id, password FROM users WHERE email = 'admin@clinica.com'");
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      if (admin.password === 'admin123') {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, admin.id]);
      }
    }

    return res.status(200).json({ message: 'Schema updated successfully' });
  } catch (error: any) {
    console.error('Schema update error:', error);
    return res.status(500).json({ error: error.message });
  }
}
