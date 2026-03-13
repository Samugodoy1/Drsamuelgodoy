import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { getJwtSecret, COOKIE_OPTIONS } from '../utils/config.js';
import { sendEmail } from '../utils/email.js';

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

        // Adjust expiration based on rememberMe
        const expiresIn = rememberMe ? '30d' : '24h';
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const token = jwt.sign(
          { id: user.id, name: user.name, role: user.role },
          getJwtSecret(),
          { expiresIn }
        );

        // Set secure cookie
        res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; ${COOKIE_OPTIONS.secure ? 'Secure;' : ''} SameSite=${COOKIE_OPTIONS.sameSite}; Max-Age=${maxAge / 1000}; Path=/`);

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

export const requestPasswordReset = async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório' });
  }

  try {
    const userResult = await query('SELECT id, name FROM users WHERE email = $1', [email]);
    const user = userResult.rows[0];

    // Always return success for security (don't reveal if email exists)
    const successMessage = 'Se o e-mail estiver cadastrado, enviaremos instruções para redefinir sua senha.';

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      await query(
        'INSERT INTO password_resets (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      );

      await logSecurityEvent(user.id, 'PASSWORD_RESET_REQUESTED', `Solicitação de recuperação de senha para: ${email}`, req);

      // Enviar e-mail real
      const resetLink = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        subject: 'Recuperação de Senha - OdontoHub',
        text: `Olá ${user.name},\n\nVocê solicitou a recuperação de senha para sua conta no OdontoHub.\n\nClique no link abaixo para definir uma nova senha:\n\n${resetLink}\n\nEste link expira em 1 hora.\n\nSe você não solicitou isso, ignore este e-mail.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #059669;">Recuperação de Senha</h2>
            <p>Olá <strong>${user.name}</strong>,</p>
            <p>Você solicitou a recuperação de senha para sua conta no <strong>OdontoHub</strong>.</p>
            <p>Clique no botão abaixo para definir uma nova senha:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Redefinir Senha</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">Este link expira em 1 hora.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="color: #94a3b8; font-size: 12px;">Se você não solicitou isso, pode ignorar este e-mail com segurança.</p>
          </div>
        `
      });
    }

    return res.status(200).json({ message: successMessage });
  } catch (error) {
    console.error('Password reset request error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
  }

  // Password validation: min 8 chars, upper, lower, number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({ 
      error: 'A senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.' 
    });
  }

  try {
    const resetResult = await query(
      'SELECT user_id, expires_at FROM password_resets WHERE token = $1',
      [token]
    );

    const reset = resetResult.rows[0];

    if (!reset) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    if (new Date() > new Date(reset.expires_at)) {
      await query('DELETE FROM password_resets WHERE token = $1', [token]);
      return res.status(400).json({ error: 'Token expirado' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, reset.user_id]);
    await query('DELETE FROM password_resets WHERE user_id = $2', [reset.user_id]);

    await logSecurityEvent(reset.user_id, 'PASSWORD_RESET_SUCCESS', 'Senha redefinida com sucesso via token', req);

    return res.status(200).json({ message: 'Sua senha foi redefinida com sucesso.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
