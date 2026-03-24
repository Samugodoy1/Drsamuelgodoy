import { Request, Response } from 'express';
import { query } from '../utils/db.js';

export const getPatients = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await query('SELECT * FROM patients WHERE dentist_id = $1 ORDER BY name ASC', [user.id]);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getPatients error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPatientById = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const patientResult = await query('SELECT * FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    
    if (patientResult.rows.length === 0) return res.status(403).json({ error: 'Acesso negado ou paciente não encontrado' });
    
    const patient = patientResult.rows[0];
    
    const [anamnesis, evolution, files, odontogram, toothHistory] = await Promise.all([
      query('SELECT * FROM anamnesis WHERE patient_id = $1', [id]),
      query('SELECT * FROM clinical_evolution WHERE patient_id = $1 ORDER BY date DESC', [id]),
      query('SELECT * FROM patient_files WHERE patient_id = $1 ORDER BY created_at DESC', [id]),
      query('SELECT * FROM odontograms WHERE patient_id = $1', [id]),
      query(`
        SELECT th.*, u.name as dentist_name 
        FROM tooth_history th
        JOIN users u ON th.dentist_id = u.id
        WHERE th.patient_id = $1 
        ORDER BY th.date DESC, th.created_at DESC
      `, [id])
    ]);

    return res.status(200).json({
      ...patient,
      anamnesis: anamnesis.rows[0] || { 
        medical_history: '', 
        allergies: '', 
        medications: '',
        chief_complaint: '',
        habits: '',
        family_history: '',
        vital_signs: ''
      },
      evolution: evolution.rows,
      files: files.rows,
      odontogram: odontogram.rows[0] ? JSON.parse(odontogram.rows[0].data) : {},
      toothHistory: toothHistory.rows,
      treatmentPlan: patient.treatment_plan || [],
      procedures: patient.procedures || []
    });
  } catch (error: any) {
    console.error('getPatientById error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updatePatient = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { name, cpf, birth_date, phone, email, address, treatmentPlan, procedures } = req.body;
  let { photo_url } = req.body;

  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      `UPDATE patients 
       SET name = $1, cpf = $2, birth_date = $3, phone = $4, email = $5, address = $6, photo_url = $7, 
           treatment_plan = $8, procedures = $9 
       WHERE id = $10`,
      [name, cpf, birth_date, phone, email, address, photo_url, JSON.stringify(treatmentPlan || []), JSON.stringify(procedures || []), id]
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updatePatient error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createPatient = async (req: Request, res: Response) => {
  const user = req.user!;
  const { name, cpf, birth_date, phone, email, address } = req.body;
  try {
    const result = await query(
      'INSERT INTO patients (name, cpf, birth_date, phone, email, address, dentist_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      [name, cpf, birth_date, phone, email, address, user.id]
    );
    return res.status(201).json({ id: result.rows[0].id });
  } catch (error: any) {
    console.error('createPatient error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateAnamnesis = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { medical_history, allergies, medications, chief_complaint, habits, family_history, vital_signs } = req.body;
  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      `INSERT INTO anamnesis (patient_id, medical_history, allergies, medications, chief_complaint, habits, family_history, vital_signs) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       ON CONFLICT (patient_id) 
       DO UPDATE SET 
         medical_history = $2, 
         allergies = $3, 
         medications = $4, 
         chief_complaint = $5, 
         habits = $6, 
         family_history = $7, 
         vital_signs = $8, 
         updated_at = CURRENT_TIMESTAMP`,
      [id, medical_history, allergies, medications, chief_complaint, habits, family_history, vital_signs]
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateAnamnesis error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const addEvolution = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { notes, procedure_performed, materials, observations } = req.body;
  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      'INSERT INTO clinical_evolution (patient_id, notes, procedure_performed, materials, observations, dentist_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, notes, procedure_performed, materials, observations, user.id]
    );
    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('addEvolution error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateOdontogram = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { data } = req.body;
  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      'INSERT INTO odontograms (patient_id, data) VALUES ($1, $2) ON CONFLICT (patient_id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP',
      [id, JSON.stringify(data)]
    );
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateOdontogram error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const addToothHistory = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { tooth_number, procedure, notes, date } = req.body;
  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      'INSERT INTO tooth_history (patient_id, dentist_id, tooth_number, procedure, notes, date) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, user.id, tooth_number, procedure, notes, date || new Date().toISOString().split('T')[0]]
    );
    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('addToothHistory error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const addPatientFile = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { file_type, description } = req.body;
  let { file_url } = req.body;

  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    await query(
      'INSERT INTO patient_files (patient_id, file_url, file_type, description) VALUES ($1, $2, $3, $4)',
      [id, file_url, file_type, description]
    );
    return res.status(201).json({ success: true });
  } catch (error: any) {
    console.error('addPatientFile error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const getPatientFinancialHistory = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;

  try {
    // Get transactions
    const transactions = await query(
      'SELECT * FROM transactions WHERE dentist_id = $1 AND patient_id = $2 ORDER BY date DESC',
      [user.id, id]
    );

    // Get payment plans
    const paymentPlans = await query(
      `SELECT pp.*, p.name as patient_name 
       FROM payment_plans pp 
       LEFT JOIN patients p ON pp.patient_id = p.id 
       WHERE pp.dentist_id = $1 AND pp.patient_id = $2 
       ORDER BY pp.created_at DESC`,
      [user.id, id]
    );

    // Get installments
    const installments = await query(
      `SELECT i.*, p.procedure 
       FROM installments i 
       JOIN payment_plans p ON i.payment_plan_id = p.id 
       WHERE i.dentist_id = $1 AND i.patient_id = $2 
       ORDER BY i.due_date ASC`,
      [user.id, id]
    );

    return res.status(200).json({
      transactions: transactions.rows,
      paymentPlans: paymentPlans.rows,
      installments: installments.rows
    });
  } catch (error: any) {
    console.error('getPatientFinancialHistory error:', error);
    return res.status(500).json({ error: error.message });
  }
};
