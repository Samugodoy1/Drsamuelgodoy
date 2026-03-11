import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const result = await pool.query(
      'SELECT id, name, email, role, status FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    const user = result.rows[0];

    if (user) {
      if (user.status !== 'active') {
        return res.status(403).json({ error: 'Sua conta ainda não foi liberada pelo administrador.' });
      }
      return res.status(200).json({ user, token: 'fake-jwt-token' });
    } else {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
