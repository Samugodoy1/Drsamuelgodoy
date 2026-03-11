import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from './db.js';
import { requireAuth } from './auth/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { method, query: urlQuery } = req;
  const id = urlQuery.id as string;

  try {
    if (method === 'DELETE') {
      // Verify ownership: file -> patient -> dentist
      const check = await query(
        'SELECT f.id FROM patient_files f JOIN patients p ON f.patient_id = p.id WHERE f.id = $1 AND p.dentist_id = $2',
        [id, user.id]
      );
      if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

      await query('DELETE FROM patient_files WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Files API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
