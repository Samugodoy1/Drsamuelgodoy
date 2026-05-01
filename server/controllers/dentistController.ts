import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import bcrypt from 'bcryptjs';

export const getDentists = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    if (user.role?.toUpperCase() === 'ADMIN') {
      const result = await query("SELECT id, name, email, role FROM users WHERE role = 'DENTIST' AND status = 'active'");
      return res.status(200).json(result.rows);
    } else {
      const result = await query("SELECT id, name, email, role FROM users WHERE id = $1", [user.id]);
      return res.status(200).json(result.rows);
    }
  } catch (error: any) {
    console.error('getDentists error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const createDentist = async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role?.toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Apenas administradores podem cadastrar dentistas' });
  }
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
      "INSERT INTO users (name, email, password, role, status) VALUES ($1, $2, $3, 'DENTIST', 'active') RETURNING id",
      [name, email, hashedPassword]
    );
    await query(
      `INSERT INTO user_product_access (user_id, product, plan, product_role, approval_status)
       VALUES ($1, 'odontohub', 'free', 'DENTIST', 'approved')
       ON CONFLICT (user_id, product) DO NOTHING`,
      [result.rows[0].id]
    );
    return res.status(201).json({ id: result.rows[0].id });
  } catch (error: any) {
    console.error('createDentist error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};

export const deleteDentist = async (req: Request, res: Response) => {
  const user = req.user!;
  if (user.role?.toUpperCase() !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  const { id } = req.params;
  try {
    await query('DELETE FROM users WHERE id = $1 AND role = \'DENTIST\'', [id]);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('deleteDentist error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
