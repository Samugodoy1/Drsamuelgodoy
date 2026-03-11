import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method, query } = req;
  const id = query.id as string;

  try {
    if (method === 'DELETE') {
      await pool.query('DELETE FROM patient_files WHERE id = $1', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Files API error:', error);
    return res.status(500).json({ error: error.message });
  }
}
