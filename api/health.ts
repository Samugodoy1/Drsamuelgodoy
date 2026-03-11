import type { VercelRequest, VercelResponse } from '@vercel/node';
import pool from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await pool.query('SELECT NOW()');
    return res.status(200).json({ status: 'ok', database: 'connected', time: result.rows[0].now });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', error: error.message });
  }
}
