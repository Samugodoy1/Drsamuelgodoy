import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { requireAuth } from '../auth/utils.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { method } = req;

  try {
    if (method === 'GET') {
      // If admin, can see all. If dentist, can only see themselves.
      if (user.role?.toUpperCase() === 'ADMIN') {
        const result = await query("SELECT id, name, email, role FROM users WHERE role = 'DENTIST' AND status = 'active'");
        return res.status(200).json(result.rows);
      } else {
        const result = await query("SELECT id, name, email, role FROM users WHERE id = $1", [user.id]);
        return res.status(200).json(result.rows);
      }
    }

    if (method === 'POST') {
      // Only admin can create dentists
      if (user.role?.toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Apenas administradores podem cadastrar dentistas' });
      }
      const { name, email, password } = req.body;
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await query(
        "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'DENTIST', 'active') RETURNING id",
        [name, email, hashedPassword]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    if (method === 'DELETE') {
      // Only admin can delete dentists
      if (user.role?.toUpperCase() !== 'ADMIN') {
        return res.status(403).json({ error: 'Acesso negado' });
      }
      const { id } = req.query;
      await query('DELETE FROM users WHERE id = $1 AND role = \'DENTIST\'', [id]);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Dentists error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
