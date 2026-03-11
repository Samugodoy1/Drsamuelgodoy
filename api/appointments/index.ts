import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const id = query.id as string;

  try {
    if (method === 'GET') {
      const { dentist_id } = query;
      const sql = `
        SELECT a.*, p.name as patient_name, p.phone as patient_phone, d.name as dentist_name 
        FROM appointments a
        JOIN patients p ON a.patient_id = p.id
        JOIN users d ON a.dentist_id = d.id
        WHERE a.dentist_id = $1
      `;
      const result = await pool.query(sql, [dentist_id]);
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const pathParts = req.url?.split('/') || [];
      const subRoute = pathParts[pathParts.length - 1];

      if (subRoute === 'remind') {
        // Just a placeholder for reminder logic
        return res.status(200).json({ success: true });
      }

      const { patient_id, dentist_id, start_time, end_time, notes } = req.body;
      const result = await pool.query(
        'INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [patient_id, dentist_id, start_time, end_time, notes]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    if (method === 'PATCH') {
      const { status } = req.body;
      await pool.query('UPDATE appointments SET status = $1 WHERE id = $2', [status, id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Appointments API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
