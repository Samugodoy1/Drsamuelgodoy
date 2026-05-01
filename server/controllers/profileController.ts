import { Request, Response } from 'express';
import { query as dbQuery } from '../utils/db.js';
import bcrypt from 'bcryptjs';
import { PRODUCTS, type Product } from '../utils/auth.js';

function parseProduct(product: unknown, fallback: Product = 'odontohub'): Product {
  if (typeof product !== 'string') return fallback;
  const normalized = product.toLowerCase();
  return PRODUCTS.includes(normalized as Product) ? normalized as Product : fallback;
}

export const getProfile = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    const result = await dbQuery(
      'SELECT id, name, email, role, phone, cro, specialty, bio, photo_url, clinic_name, clinic_address, onboarding_done, welcome_seen, record_opened, pix_key, pix_key_type, pix_beneficiary_name FROM users WHERE id = $1',
      [user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario nao encontrado' });
    }

    const accessResult = await dbQuery(
      `SELECT product, plan, product_role, approval_status, onboarding_completed
       FROM user_product_access
       WHERE user_id = $1
       ORDER BY product ASC`,
      [user.id]
    );

    return res.status(200).json({
      ...result.rows[0],
      current_product: user.product,
      product_accesses: accessResult.rows
    });
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
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          error: 'A nova senha deve ter pelo menos 8 caracteres, incluindo letras maiusculas, minusculas e numeros.'
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      sql += `, password = $10 WHERE id = $11`;
      params.push(hashedPassword);
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

export const updateOnboarding = async (req: Request, res: Response) => {
  const user = req.user!;
  const { onboarding_done, welcome_seen, record_opened, onboarding_completed } = req.body;
  const product = parseProduct(req.body.product || user.product);

  try {
    if (onboarding_done === true || onboarding_completed === true) {
      await dbQuery(
        `UPDATE user_product_access
         SET onboarding_completed = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND product = $2`,
        [user.id, product]
      );
    }
    if (welcome_seen === true) {
      await dbQuery('UPDATE users SET welcome_seen = TRUE WHERE id = $1', [user.id]);
    }
    if (record_opened === true) {
      await dbQuery('UPDATE users SET record_opened = TRUE WHERE id = $1', [user.id]);
    }
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateOnboarding error:', error);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
};
