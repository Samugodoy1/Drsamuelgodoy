import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { requireAuth } from '../auth/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { method, query: urlQuery } = req;
  const idParam = urlQuery.id as string;
  const id = idParam ? idParam.split('/')[0] : null;

  try {
    if (method === 'GET') {
      if (id) {
        // Always filter by dentist_id for isolation
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
          anamnesis: anamnesis.rows[0] || { medical_history: '', allergies: '', medications: '' },
          evolution: evolution.rows,
          files: files.rows,
          odontogram: odontogram.rows[0] ? JSON.parse(odontogram.rows[0].data) : {},
          toothHistory: toothHistory.rows
        });
      } else {
        // List patients - always filter by dentist_id for isolation
        const result = await query('SELECT * FROM patients WHERE dentist_id = $1 ORDER BY name ASC', [user.id]);
        return res.status(200).json(result.rows);
      }
    }

    if (method === 'POST') {
      // Check if it's a sub-route like /api/patients/123/evolution
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (id) {
        // Verify patient ownership before adding sub-data
        const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
        if (checkOwnership.rows.length === 0) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      }

      if (subRoute === 'evolution') {
        const { notes, procedure_performed } = req.body;
        await query(
          'INSERT INTO clinical_evolution (patient_id, notes, procedure_performed, dentist_id) VALUES ($1, $2, $3, $4)',
          [id, notes, procedure_performed, user.id]
        );
        return res.status(201).json({ success: true });
      }

      if (subRoute === 'odontogram') {
        const { data } = req.body;
        await query(
          'INSERT INTO odontograms (patient_id, data) VALUES ($1, $2) ON CONFLICT (patient_id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP',
          [id, JSON.stringify(data)]
        );
        return res.status(200).json({ success: true });
      }

      if (subRoute === 'tooth-history') {
        const { tooth_number, procedure, notes, date } = req.body;
        await query(
          'INSERT INTO tooth_history (patient_id, dentist_id, tooth_number, procedure, notes, date) VALUES ($1, $2, $3, $4, $5, $6)',
          [id, user.id, tooth_number, procedure, notes, date || new Date()]
        );
        return res.status(201).json({ success: true });
      }

      if (subRoute === 'files') {
        const { file_url, file_type, description } = req.body;
        await query(
          'INSERT INTO patient_files (patient_id, file_url, file_type, description) VALUES ($1, $2, $3, $4)',
          [id, file_url, file_type, description]
        );
        return res.status(201).json({ success: true });
      }

      // Default POST: Create patient
      const { name, cpf, birth_date, phone, email, address } = req.body;
      const result = await query(
        'INSERT INTO patients (name, cpf, birth_date, phone, email, address, dentist_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [name, cpf, birth_date, phone, email, address, user.id]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    if (method === 'PUT') {
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (id) {
        // Verify patient ownership
        const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
        if (checkOwnership.rows.length === 0) {
          return res.status(403).json({ error: 'Acesso negado' });
        }
      }

      if (subRoute === 'anamnesis') {
        const { medical_history, allergies, medications } = req.body;
        await query(
          'INSERT INTO anamnesis (patient_id, medical_history, allergies, medications) VALUES ($1, $2, $3, $4) ON CONFLICT (patient_id) DO UPDATE SET medical_history = $2, allergies = $3, medications = $4, updated_at = CURRENT_TIMESTAMP',
          [id, medical_history, allergies, medications]
        );
        return res.status(200).json({ success: true });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Patients API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
