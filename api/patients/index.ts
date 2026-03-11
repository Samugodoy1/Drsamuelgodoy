import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const id = query.id as string;

  try {
    if (method === 'GET') {
      if (id) {
        // Get single patient with anamnesis, evolution, files, odontogram
        const patientResult = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
        if (patientResult.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
        
        const patient = patientResult.rows[0];
        
        const [anamnesis, evolution, files, odontogram] = await Promise.all([
          pool.query('SELECT * FROM anamnesis WHERE patient_id = $1', [id]),
          pool.query('SELECT * FROM clinical_evolution WHERE patient_id = $1 ORDER BY date DESC', [id]),
          pool.query('SELECT * FROM patient_files WHERE patient_id = $1 ORDER BY created_at DESC', [id]),
          pool.query('SELECT * FROM odontograms WHERE patient_id = $1', [id])
        ]);

        return res.status(200).json({
          ...patient,
          anamnesis: anamnesis.rows[0] || { medical_history: '', allergies: '', medications: '' },
          evolution: evolution.rows,
          files: files.rows,
          odontogram: odontogram.rows[0] ? JSON.parse(odontogram.rows[0].data) : {}
        });
      } else {
        const { dentist_id } = query;
        const result = await pool.query('SELECT * FROM patients WHERE dentist_id = $1 ORDER BY name ASC', [dentist_id]);
        return res.status(200).json(result.rows);
      }
    }

    if (method === 'POST') {
      // Check if it's a sub-route like /api/patients/123/evolution
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (subRoute === 'evolution') {
        const { notes, procedure_performed, dentist_id } = req.body;
        await pool.query(
          'INSERT INTO clinical_evolution (patient_id, notes, procedure_performed, dentist_id) VALUES ($1, $2, $3, $4)',
          [id, notes, procedure_performed, dentist_id]
        );
        return res.status(201).json({ success: true });
      }

      if (subRoute === 'odontogram') {
        const { data } = req.body;
        await pool.query(
          'INSERT INTO odontograms (patient_id, data) VALUES ($1, $2) ON CONFLICT (patient_id) DO UPDATE SET data = $2, updated_at = CURRENT_TIMESTAMP',
          [id, JSON.stringify(data)]
        );
        return res.status(200).json({ success: true });
      }

      if (subRoute === 'files') {
        const { file_url, file_type, description } = req.body;
        await pool.query(
          'INSERT INTO patient_files (patient_id, file_url, file_type, description) VALUES ($1, $2, $3, $4)',
          [id, file_url, file_type, description]
        );
        return res.status(201).json({ success: true });
      }

      // Default POST: Create patient
      const { name, cpf, birth_date, phone, email, address, dentist_id } = req.body;
      const result = await pool.query(
        'INSERT INTO patients (name, cpf, birth_date, phone, email, address, dentist_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id',
        [name, cpf, birth_date, phone, email, address, dentist_id]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    if (method === 'PUT') {
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (subRoute === 'anamnesis') {
        const { medical_history, allergies, medications } = req.body;
        await pool.query(
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
