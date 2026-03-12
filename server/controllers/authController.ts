import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

async function logSecurityEvent(userId: number | null, eventType: string, description: string, req: Request) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  try {
    await query(
      'INSERT INTO security_logs (user_id, event_type, description, ip_address) VALUES ($1, $2, $3, $4)',
      [userId, eventType, description, ip]
    );
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Brute force protection: check last 5 attempts in 15 minutes
    const attemptsResult = await query(
      `SELECT count(*) FROM login_attempts 
       WHERE email = $1 AND success = FALSE 
       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
      [email]
    );
    
    if (parseInt(attemptsResult.rows[0].count) >= 5) {
      await logSecurityEvent(null, 'LOGIN_BLOCKED', `Muitas tentativas de login para: ${email}`, req);
      return res.status(429).json({ error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' });
    }

    const result = await query(
      'SELECT id, name, email, password, role, status FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        if (user.status !== 'active') {
          return res.status(403).json({ error: 'Sua conta ainda não foi liberada pelo administrador.' });
        }

        // Log success
        await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, TRUE)', [email, ip]);
        await logSecurityEvent(user.id, 'LOGIN_SUCCESS', `Login bem-sucedido: ${email}`, req);

        const token = jwt.sign(
          { id: user.id, name: user.name, role: user.role },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        // Set secure cookie
        res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; ${COOKIE_OPTIONS.secure ? 'Secure;' : ''} SameSite=Strict; Max-Age=${COOKIE_OPTIONS.maxAge / 1000}; Path=/`);

        // Don't send password back
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({ user: userWithoutPassword, token });
      }
    }

    // Generic error message for security
    await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, FALSE)', [email, ip]);
    await logSecurityEvent(null, 'LOGIN_FAILURE', `Tentativa de login falha para: ${email}`, req);
    return res.status(401).json({ error: 'Credenciais inválidas' });

  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const register = async (req: Request, res: Response) => {
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
};
