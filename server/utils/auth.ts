import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './config.js';

export interface AuthUser {
  id: number;
  name: string;
  role: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function verifyToken(req: Request): AuthUser | null {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-auth-token'];
  let token = null;

  if (authHeader) {
    if (authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.split(' ')[1];
    } else {
      token = authHeader;
    }
  } else if (customHeader) {
    token = customHeader as string;
  } else if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  } else if (req.query && req.query.token) {
    token = req.query.token as string;
  }

  if (!token || token === 'null' || token === 'undefined' || token === '[object Object]') {
    return null;
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret()) as AuthUser;
    if (!decoded || !decoded.id) {
      console.warn('Token verification failed: Invalid payload');
      return null;
    }
    return decoded;
  } catch (error: any) {
    console.warn('Token verification failed:', error.message);
    return null;
  }
}

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  // Skip authentication for auth and health routes
  const path = req.path || '';
  const url = req.url || '';
  const originalUrl = req.originalUrl || '';
  
  const isPublic = 
    path.includes('/auth/login') || 
    path.includes('/auth/register') || 
    path.includes('/health') ||
    url.includes('/auth/login') || 
    url.includes('/auth/register') || 
    url.includes('/health') ||
    originalUrl.includes('/auth/login') || 
    originalUrl.includes('/auth/register') || 
    originalUrl.includes('/health');

  if (isPublic) {
    return next();
  }

  console.log(`Authenticating request: ${req.method} ${path} (Original: ${originalUrl})`);

  const user = verifyToken(req);
  if (!user) {
    const isHtml = req.headers.accept && req.headers.accept.includes('text/html');
    
    if (isHtml) {
      return res.status(401).send(`
        <html>
          <head>
            <title>Sessão Expirada - OdontoHub</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
          </head>
          <body style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b;">
            <div style="background: white; padding: 2.5rem; border-radius: 1.5rem; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; text-align: center; max-width: 400px; width: 90%;">
              <div style="background: #fee2e2; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem;">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#e11d48" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
              </div>
              <h1 style="color: #0f172a; margin: 0 0 0.5rem; font-size: 1.5rem;">Sessão Expirada</h1>
              <p style="color: #64748b; margin-bottom: 2rem; line-height: 1.5;">Sua sessão expirou ou você não está autorizado a acessar esta página diretamente.</p>
              <button onclick="window.location.href = window.location.origin" style="background: #059669; color: white; padding: 0.875rem 1.5rem; border-radius: 0.75rem; border: none; font-size: 1rem; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s;">
                Voltar para o Sistema
              </button>
            </div>
          </body>
        </html>
      `);
    }
    
    // Check why it failed for debugging
    const authHeader = req.headers.authorization;
    const customHeader = req.headers['x-auth-token'];
    const hasCookie = !!(req.cookies && req.cookies.auth_token);
    const reason = (!authHeader && !customHeader && !hasCookie) ? 'no_token' : 'invalid_token';

    return res.status(401).json({ 
      error: 'Não autorizado. Faça login novamente.',
      debug: reason
    });
  }
  req.user = user;
  next();
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role.toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Requer privilégios de administrador.' });
  }
  next();
};
