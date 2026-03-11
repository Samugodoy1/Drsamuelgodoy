import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from '../db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  try {
    const result = await pool.query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'DENTIST', 'pending') RETURNING id",
      [name, email, password]
    );

    return res.status(201).json({ 
      id: result.rows[0].id, 
      message: 'Cadastro realizado com sucesso. Aguarde a aprovação do administrador.' 
    });
  } catch (error: any) {
    if (error.code === '23505') { // Unique constraint violation in PG
      return res.status(400).json({ error: 'Este e-mail já está cadastrado' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
