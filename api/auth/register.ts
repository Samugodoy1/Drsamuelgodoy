import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import bcrypt from 'bcryptjs';
import { logSecurityEvent } from './utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
  }

  // Password validation: min 8 chars, upper, lower, number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.' 
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'DENTIST', 'pending') RETURNING id",
      [name, email, hashedPassword]
    );

    const userId = result.rows[0].id;
    await logSecurityEvent(userId, 'USER_REGISTER', `Novo usuário registrado: ${email}`, req);

    return res.status(201).json({ 
      id: userId, 
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
