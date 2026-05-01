import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getJwtSecret, COOKIE_OPTIONS } from '../utils/config.js';
import { sendPasswordResetEmail } from '../services/emailService.js';
import { PRODUCTS, type Product } from '../utils/auth.js';

function parseProduct(product: unknown): Product | null {
  if (typeof product !== 'string') return null;
  const normalized = product.toLowerCase();
  return PRODUCTS.includes(normalized as Product) ? normalized as Product : null;
}

async function getUserProductAccesses(userId: number) {
  const result = await query(
    `SELECT product, plan, product_role, approval_status, onboarding_completed
     FROM user_product_access
     WHERE user_id = $1
     ORDER BY product ASC`,
    [userId]
  );
  return result.rows;
}

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
  const { email, password, rememberMe } = req.body;
  const product = parseProduct(req.body.product);

  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha sao obrigatorios' });
  }

  if (!product) {
    return res.status(400).json({ error: 'Produto invalido ou nao informado.' });
  }

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
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
      `SELECT 
         u.id, u.name, u.email, u.password, u.role, u.status,
         u.onboarding_done, u.welcome_seen, u.record_opened,
         upa.plan, upa.product_role, upa.approval_status, upa.onboarding_completed
       FROM users u
       LEFT JOIN user_product_access upa
         ON upa.user_id = u.id AND upa.product = $2
       WHERE u.email = $1`,
      [email, product]
    );

    const user = result.rows[0];

    if (user) {
      const passwordMatch = await bcrypt.compare(password, user.password);

      if (passwordMatch) {
        if (user.status !== 'active') {
          return res.status(403).json({ error: 'Sua conta global esta inativa ou bloqueada.' });
        }

        if (user.approval_status !== 'approved') {
          return res.status(403).json({ error: 'Seu acesso a este produto ainda nao foi aprovado.' });
        }

        await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, TRUE)', [email, ip]);
        await logSecurityEvent(user.id, 'LOGIN_SUCCESS', `Login bem-sucedido: ${email}`, req);

        const expiresIn = rememberMe ? '30d' : '24h';
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const token = jwt.sign(
          { id: user.id, name: user.name, role: user.role },
          getJwtSecret(),
          { expiresIn }
        );

        res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; ${COOKIE_OPTIONS.secure ? 'Secure;' : ''} SameSite=${COOKIE_OPTIONS.sameSite}; Max-Age=${maxAge / 1000}; Path=/`);

        const productAccesses = await getUserProductAccesses(user.id);
        const currentAccess = productAccesses.find((access: any) => access.product === product);
        const { password: _, plan, product_role, approval_status, onboarding_completed, ...userWithoutPassword } = user;
        userWithoutPassword.product_accesses = productAccesses;
        userWithoutPassword.current_product = product;
        userWithoutPassword.onboarding_done = currentAccess?.onboarding_completed ?? false;
        return res.status(200).json({ user: userWithoutPassword, token });
      }
    }

    await query('INSERT INTO login_attempts (email, ip_address, success) VALUES ($1, $2, FALSE)', [email, ip]);
    await logSecurityEvent(null, 'LOGIN_FAILURE', `Tentativa de login falha para: ${email}`, req);
    return res.status(401).json({ error: 'Credenciais invalidas' });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const register = async (req: Request, res: Response) => {
  const { name, email, password, acceptedTerms, acceptedPrivacyPolicy } = req.body;
  const product = parseProduct(req.body.product);

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, e-mail e senha sao obrigatorios' });
  }

  if (!product) {
    return res.status(400).json({ error: 'Produto invalido ou nao informado.' });
  }

  if (!acceptedTerms || !acceptedPrivacyPolicy) {
    return res.status(400).json({ error: 'Voce deve aceitar os Termos de Uso e a Politica de Privacidade' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiusculas, minusculas e numeros.'
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const productRole = product === 'academy' ? 'STUDENT' : 'DENTIST';

    const result = await query(
      "INSERT INTO users (name, email, password, role, status, accepted_terms, accepted_terms_at, accepted_privacy_policy) VALUES ($1, $2, $3, 'DENTIST', 'active', $4, CURRENT_TIMESTAMP, $5) RETURNING id",
      [name, email, hashedPassword, acceptedTerms, acceptedPrivacyPolicy]
    );

    const userId = result.rows[0].id;
    await query(
      `INSERT INTO user_product_access (user_id, product, plan, product_role, approval_status)
       VALUES ($1, $2, 'free', $3, 'pending')`,
      [userId, product, productRole]
    );
    await logSecurityEvent(userId, 'USER_REGISTER', `Novo usuario registrado: ${email}`, req);

    return res.status(201).json({
      id: userId,
      message: 'Cadastro realizado com sucesso. Aguarde a aprovacao do administrador.'
    });
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(400).json({ error: 'Este e-mail ja esta cadastrado' });
    }
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail e obrigatorio' });
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const userResult = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];
    const successMessage = 'Se o e-mail estiver cadastrado, enviaremos instrucoes para redefinir sua senha.';

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000);

      await query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      await logSecurityEvent(user.id, 'PASSWORD_RESET_REQUESTED', `Solicitacao de recuperacao de senha para: ${email}`, req);

      const frontendUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:3000';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(email, resetLink);
      } catch (emailError) {
        console.error('Failed to send reset email:', emailError);
      }
    }

    return res.status(200).json({ message: successMessage });
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return res.status(500).json({
      error: 'Erro interno no servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha sao obrigatorios' });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      error: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiusculas, minusculas e numeros.'
    });
  }

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS password_resets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token TEXT NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const resetResult = await query(
      'SELECT user_id, expires_at FROM password_resets WHERE token = $1',
      [token]
    );

    const reset = resetResult.rows[0];

    if (!reset) {
      return res.status(400).json({ error: 'Token invalido ou expirado' });
    }

    if (new Date() > new Date(reset.expires_at)) {
      await query('DELETE FROM password_resets WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Token expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, reset.user_id]);
    await query('DELETE FROM password_resets WHERE user_id = $1', [reset.user_id]);

    await logSecurityEvent(reset.user_id, 'PASSWORD_RESET_SUCCESS', 'Senha redefinida com sucesso via token', req);

    return res.status(200).json({ message: 'Sua senha foi redefinida com sucesso.' });
  } catch (error: any) {
    console.error('Password reset error:', error);
    return res.status(500).json({
      error: 'Erro interno no servidor',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
