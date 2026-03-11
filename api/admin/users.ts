import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const result = await pool.query('SELECT id, name, email, role, status, created_at FROM users ORDER BY created_at DESC');
      return res.status(200).json(result.rows);
    }

    if (method === 'PATCH') {
      // Assuming URL like /api/admin/users?id=123
      const { id } = req.query;
      const { status } = req.body;
      await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
