import { Request, Response } from 'express';
import { query as dbQuery } from '../utils/db.js';
import bcrypt from 'bcryptjs';

export const getProfile = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await dbQuery(
      'SELECT id, name, email, role, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address FROM users WHERE id = $1',
      [user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error('getProfile error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = req.user!;
  const { name, email, phone, cro, specialty, bio, clinic_name, clinic_address, password } = req.body;
  let { photo_url } = req.body;
  
  try {
    let sql = `
      UPDATE users 
      SET name = $1, email = $2, phone = $3, cro = $4, specialty = $5, bio = $6, photo_url = $7, clinic_name = $8, clinic_address = $9
    `;
    let params: any[] = [name, email, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address, user.id];
    
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
      // logSecurityEvent logic could be here too
    } else {
      sql += ` WHERE id = $10`;
    }

    await dbQuery(sql, params);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateProfile error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
