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
      let sql = `
        SELECT a.*, p.name as patient_name, p.phone as patient_phone, d.name as dentist_name 
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users d ON a.dentist_id = d.id
      `;
      
      let params = [user.id];
      sql += ' WHERE a.dentist_id = $1';
      
      const result = await query(sql, params);
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (subRoute === 'remind') {
        // Verify ownership before sending reminder
        const check = await query('SELECT id FROM appointments WHERE id = $1 AND dentist_id = $2', [id, user.id]);
        if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });
        return res.status(200).json({ success: true });
      }

      const { patient_id, start_time, end_time, notes } = req.body;
      
      // Verify patient belongs to this dentist
      const patientCheck = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [patient_id, user.id]);
      if (patientCheck.rows.length === 0) return res.status(403).json({ error: 'Paciente não encontrado ou acesso negado' });

      const result = await query(
        'INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [patient_id, user.id, start_time, end_time, notes]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    if (method === 'PATCH') {
      const { status } = req.body;
      // Verify ownership before update
      const result = await query('UPDATE appointments SET status = $1 WHERE id = $2 AND dentist_id = $3', [status, id, user.id]);
      if (result.rowCount === 0) return res.status(403).json({ error: 'Acesso negado ou agendamento não encontrado' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
