import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getJwtSecret } from '../utils/config.js';

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

export const academyLogin = async (req: Request, res: Response) => {
  const { email, password, rememberMe } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Brute force protection
    const attemptsResult = await query(
      `SELECT count(*) FROM login_attempts 
       WHERE email = $1 AND success = FALSE 
       AND attempted_at > NOW() - INTERVAL '15 minutes'`,
      [email]
    );
    
    if (parseInt(attemptsResult.rows[0].count) >= 5) {
      await logSecurityEvent(null, 'ACADEMY_LOGIN_BLOCKED', `Muitas tentativas para: ${email}`, req);
      return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em 15 minutos.' });
    }

    // Find student user (role = 'STUDENT')
    const result = await query(
      'SELECT id, name, email, password, role, status FROM users WHERE email = $1 AND role = $2',
      [email, 'STUDENT']
    );

    const user = result.rows[0];

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        // Students don't need admin approval, but check status if needed
        if (user.status && user.status !== 'active') {
          return res.status(403).json({ error: 'Sua conta ainda não foi ativada.' });
        }

        // Log success
        await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, TRUE)', [email, ip]);
        await logSecurityEvent(user.id, 'ACADEMY_LOGIN_SUCCESS', `Login Academy: ${email}`, req);

        // Token expiration
        const expiresIn = rememberMe ? '30d' : '24h';
        const token = jwt.sign(
          { id: user.id, name: user.name, role: 'STUDENT' },
          getJwtSecret(),
          { expiresIn }
        );

        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json({ user: { ...userWithoutPassword, role: 'STUDENT' }, token });
      }
    }

    // Failed login
    await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, FALSE)', [email, ip]);
    await logSecurityEvent(null, 'ACADEMY_LOGIN_FAILURE', `Falha para: ${email}`, req);
    return res.status(401).json({ error: 'Email ou senha incorretos' });

  } catch (error: any) {
    console.error('Academy login error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const academyRegister = async (req: Request, res: Response) => {
  const { name, email, password, acceptedTerms, acceptedPrivacyPolicy, acceptedResponsibility } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  if (!acceptedTerms || !acceptedPrivacyPolicy || !acceptedResponsibility) {
    return res.status(400).json({ error: 'Você deve aceitar todos os termos para continuar' });
  }

  // Password validation: min 8 chars, upper, lower, number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: 'Senha deve ter 8+ caracteres, letras maiúsculas, minúsculas e números.' 
    });
  }

  try {
    // Check if email already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Este email já está registrado' });
    }

    // Create new student user
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await query(
      `INSERT INTO users (name, email, password, role, status, accepted_terms, accepted_terms_at, accepted_privacy_policy) 
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7) 
       RETURNING id, name, email, role`,
      [name, email, hashedPassword, 'STUDENT', 'active', acceptedTerms, acceptedPrivacyPolicy]
    );

    const newUser = result.rows[0];
    await logSecurityEvent(newUser.id, 'ACADEMY_REGISTER', `Novo estudante: ${email}`, req);

    // Generate token immediately after registration
    const token = jwt.sign(
      { id: newUser.id, name: newUser.name, role: 'STUDENT' },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    return res.status(201).json({ 
      message: 'Cadastro realizado com sucesso! Você já pode acessar a Academy.',
      user: { ...newUser, role: 'STUDENT' },
      token 
    });

  } catch (error: any) {
    console.error('Academy register error:', error);
    return res.status(500).json({ error: 'Erro ao realizar cadastro. Tente novamente.' });
  }
};
