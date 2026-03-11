import type { VercelRequest, VercelResponse } from '@vercel/node';
import { query as dbQuery } from '../db.js';
import { requireAuth, logSecurityEvent } from '../auth/utils.js';
import bcrypt from 'bcryptjs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = requireAuth(req, res);
  if (!user) return;

  const { method } = req;

  try {
    if (method === 'GET') {
      const result = await dbQuery(
        'SELECT id, name, email, role, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address FROM users WHERE id = $1',
        [user.id]
      );
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
      return res.status(200).json(result.rows[0]);
    }

    if (method === 'POST') {
      const { name, email, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address, password } = req.body;
      
      let sql = `
        UPDATE users 
        SET name = $1, email = $2, phone = $3, cro = $4, specialty = $5, bio = $6, photo_url = $7, clinic_name = $8, clinic_address = $9
      `;
      let params = [name, email, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address, user.id];
      
      if (password && password.trim() !== '') {
        // Password validation
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (!passwordRegex.test(password)) {
          return res.status(400).json({ 
            error: 'A nova senha deve ter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas e números.' 
          });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        sql += `, password = $10 WHERE id = $11`;
        params.push(hashedPassword);
        await logSecurityEvent(user.id, 'PASSWORD_CHANGE', 'Usuário alterou a senha', req);
      } else {
        sql += ` WHERE id = $10`;
      }

      await dbQuery(sql, params);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Profile API error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
