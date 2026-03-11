import type { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-for-dev-only';

export interface AuthUser {
  id: number;
  name: string;
  role: string;
}

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: '/'
};

export async function logSecurityEvent(userId: number | null, eventType: string, description: string, req: VercelRequest) {
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

export function verifyToken(req: VercelRequest): AuthUser | null {
  // Check Authorization header first
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.auth_token) {
    // Check cookie if header is missing
    token = req.cookies.auth_token;
  }

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser;
    return decoded;
  } catch (error) {
    return null;
  }
}

export function requireAuth(req: VercelRequest, res: VercelResponse): AuthUser | null {
  const user = verifyToken(req);
  if (!user) {
    res.status(401).json({ error: 'Não autorizado. Faça login novamente.' });
    return null;
  }
  return user;
}
