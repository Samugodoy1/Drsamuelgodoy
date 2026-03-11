import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  try {
    if (method === 'GET') {
      const result = await pool.query("SELECT id, name, email, role FROM users WHERE role = 'DENTIST' AND status = 'active'");
      return res.status(200).json(result.rows);
    }

    if (method === 'POST') {
      const { name, email, password } = req.body;
      const result = await pool.query(
        "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'DENTIST', 'active') RETURNING id",
        [name, email, password]
      );
      return res.status(201).json({ id: result.rows[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Dentists error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
