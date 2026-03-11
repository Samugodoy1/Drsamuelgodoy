import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query } from '../db.js';
import { requireAuth, logSecurityEvent } from '../auth/utils.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  if (user.role?.toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
  }

  const { method } = req;

  try {
    if (method === 'GET') {
      const result = await query('SELECT id, name, email, role, status FROM users ORDER BY id DESC');
      return res.status(200).json(result.rows);
    }

    if (method === 'PATCH') {
      let id = req.query.id;
      
      if (!id && req.url) {
        const parts = req.url.split('/').filter(Boolean);
        const usersIndex = parts.indexOf('users');
        if (usersIndex !== -1 && parts[usersIndex + 1]) {
          const possibleId = parts[usersIndex + 1];
          if (!isNaN(Number(possibleId))) {
            id = possibleId;
          }
        }
        
        if (!id) {
          id = parts.find(p => !isNaN(Number(p)));
        }
      }

      const { status, name, email } = req.body;
      
      if (status) {
        await query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
        await logSecurityEvent(user.id, 'USER_STATUS_CHANGE', `Status do usuário ${id} alterado para ${status}`, req);
      } else if (name && email) {
        await query('UPDATE users SET name = $1, email = $2 WHERE id = $3', [name, email, id]);
        await logSecurityEvent(user.id, 'USER_UPDATE', `Dados do usuário ${id} atualizados`, req);
      }
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Admin users error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
