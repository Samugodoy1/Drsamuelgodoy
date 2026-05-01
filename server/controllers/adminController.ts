import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import { PRODUCTS, type Product } from '../utils/auth.js';

function parseProduct(product: unknown): Product {
  if (typeof product !== 'string') return 'odontohub';
  const normalized = product.toLowerCase();
  return PRODUCTS.includes(normalized as Product) ? normalized as Product : 'odontohub';
}

function normalizeApprovalStatus(status: unknown) {
  if (status === 'active') return 'approved';
  if (status === 'approved' || status === 'pending' || status === 'rejected' || status === 'blocked') return status;
  return null;
}

export const getUsers = async (req: Request, res: Response) => {
  const product = parseProduct(req.query.product || req.headers['x-product']);
  try {
    const result = await query(
      `SELECT 
         u.id, u.name, u.email, u.role, u.status AS global_status,
         upa.product, upa.plan, upa.product_role, upa.approval_status, upa.onboarding_completed,
         CASE COALESCE(upa.approval_status, 'pending')
           WHEN 'approved' THEN 'active'
           ELSE COALESCE(upa.approval_status, 'pending')
         END AS status
       FROM users u
       LEFT JOIN user_product_access upa
         ON upa.user_id = u.id AND upa.product = $1
       ORDER BY u.id DESC`,
      [product]
    );
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getUsers error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, approval_status, name, email, product_role, plan, global_status } = req.body;
  const product = parseProduct(req.body.product || req.headers['x-product']);

  try {
    const nextApprovalStatus = normalizeApprovalStatus(approval_status || status);

    if (nextApprovalStatus || product_role || plan) {
      await query(
        `INSERT INTO user_product_access (user_id, product, plan, product_role, approval_status)
         VALUES ($1, $2, COALESCE($3, 'free'), COALESCE($4, 'DENTIST'), COALESCE($5, 'pending'))
         ON CONFLICT (user_id, product)
         DO UPDATE SET
           plan = COALESCE($3, user_product_access.plan),
           product_role = COALESCE($4, user_product_access.product_role),
           approval_status = COALESCE($5, user_product_access.approval_status),
           updated_at = CURRENT_TIMESTAMP`,
        [id, product, plan || null, product_role || null, nextApprovalStatus || null]
      );

      if (nextApprovalStatus === 'approved') {
        await query("UPDATE users SET status = 'active' WHERE id = $1 AND status = 'pending'", [id]);
      }
    } else if (global_status) {
      await query('UPDATE users SET status = $1 WHERE id = $2', [global_status, id]);
    } else if (name && email) {
      await query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);
    }
    
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateUser error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const updateSchema = async (req: Request, res: Response) => {
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
      ADD COLUMN IF NOT EXISTS onboarding_done BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS welcome_seen BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS record_opened BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS user_product_access (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product TEXT NOT NULL CHECK (product IN ('odontohub', 'academy')),
        plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
        product_role TEXT NOT NULL,
        approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected', 'blocked')),
        onboarding_completed BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, product)
      );

      INSERT INTO user_product_access (user_id, product, plan, product_role, approval_status, onboarding_completed)
      SELECT 
        id,
        'odontohub',
        'free',
        role,
        CASE 
          WHEN status = 'active' THEN 'approved'
          WHEN status = 'blocked' THEN 'blocked'
          WHEN status = 'pending' THEN 'pending'
          ELSE 'pending'
        END,
        COALESCE(onboarding_done, FALSE)
      FROM users
      ON CONFLICT (user_id, product) DO NOTHING;

      ALTER TABLE patients
      ADD COLUMN IF NOT EXISTS dentist_id INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS photo_url TEXT,
      ADD COLUMN IF NOT EXISTS treatment_plan JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS procedures JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        dentist_id INTEGER NOT NULL REFERENCES users(id),
        start_time TIMESTAMP WITH TIME ZONE NOT NULL,
        end_time TIMESTAMP WITH TIME ZONE NOT NULL,
        status TEXT NOT NULL DEFAULT 'SCHEDULED',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS anamnesis (
        patient_id INTEGER PRIMARY KEY REFERENCES patients(id) ON DELETE CASCADE,
        medical_history TEXT,
        allergies TEXT,
        medications TEXT,
        chief_complaint TEXT,
        habits TEXT,
        family_history TEXT,
        vital_signs TEXT,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE anamnesis
      ADD COLUMN IF NOT EXISTS chief_complaint TEXT,
      ADD COLUMN IF NOT EXISTS habits TEXT,
      ADD COLUMN IF NOT EXISTS family_history TEXT,
      ADD COLUMN IF NOT EXISTS vital_signs TEXT;

      CREATE TABLE IF NOT EXISTS clinical_evolution (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        dentist_id INTEGER NOT NULL REFERENCES users(id),
        date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        procedure_performed TEXT,
        materials TEXT,
        observations TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE clinical_evolution
      ADD COLUMN IF NOT EXISTS materials TEXT,
      ADD COLUMN IF NOT EXISTS observations TEXT;

      CREATE TABLE IF NOT EXISTS patient_files (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        file_url TEXT NOT NULL,
        file_type TEXT,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS payment_plans (
        id SERIAL PRIMARY KEY,
        dentist_id INTEGER NOT NULL REFERENCES users(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        procedure TEXT NOT NULL,
        total_amount DECIMAL(12, 2) NOT NULL,
        installments_count INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS installments (
        id SERIAL PRIMARY KEY,
        payment_plan_id INTEGER NOT NULL REFERENCES payment_plans(id) ON DELETE CASCADE,
        dentist_id INTEGER NOT NULL REFERENCES users(id),
        patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        number INTEGER NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        due_date DATE NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        payment_date DATE,
        transaction_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE transactions ADD COLUMN IF NOT EXISTS installment_id INTEGER;
    `);

    // Hash default admin password if it exists and is plain text
    const adminResult = await query("SELECT id, password FROM users WHERE email = 'admin@clinica.com'");
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      if (admin.password === 'admin123') {
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.default.hash('admin123', 10);
        await query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, admin.id]);
      }
    }

    return res.status(200).json({ message: 'Schema updated successfully' });
  } catch (error: any) {
    console.error('Schema update error:', error);
    return res.status(500).json({ error: error.message });
  }
};
