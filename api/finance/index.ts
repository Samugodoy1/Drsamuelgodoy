import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { requireAuth } from '../auth/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { method, query: urlQuery } = req;
  const id = urlQuery.id as string;

  try {
    if (method === 'GET') {
      const result = await query(
        'SELECT * FROM transactions WHERE dentist_id = $1 ORDER BY date DESC, created_at DESC',
        [user.id]
      );
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const { 
        type, 
        description, 
        category, 
        amount, 
        payment_method, 
        date, 
        status, 
        patient_id, 
        patient_name, 
        procedure, 
        notes 
      } = req.body;

      const result = await query(
        `INSERT INTO transactions 
        (dentist_id, type, description, category, amount, payment_method, date, status, patient_id, patient_name, procedure, notes) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) 
        RETURNING *`,
        [
          user.id, 
          type, 
          description, 
          category, 
          amount, 
          payment_method, 
          date || new Date().toISOString().split('T')[0], 
          status || 'PAID', 
          patient_id || null, 
          patient_name || null, 
          procedure || null, 
          notes || null
        ]
      );
      return res.status(201).json(result.rows[0]);
    }

    if (method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'ID is required' });
      const result = await query(
        'DELETE FROM transactions WHERE id = $1 AND dentist_id = $2 RETURNING id',
        [id, user.id]
      );
      if (result.rows.length === 0) return res.status(403).json({ error: 'Acesso negado ou transação não encontrada' });
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Finance API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
