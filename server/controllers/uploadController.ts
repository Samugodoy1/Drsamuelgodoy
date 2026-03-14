import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import { deleteImage } from '../services/cloudinaryService.js';

export const uploadPatientFile = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { description, file_type } = req.body;
  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const checkOwnership = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) {
      // Se falhar a posse, devemos deletar o arquivo que acabou de subir no Cloudinary
      if (file.filename) await deleteImage(file.filename);
      return res.status(403).json({ error: 'Acesso negado' });
    }

    const result = await query(
      'INSERT INTO patient_files (patient_id, file_url, file_public_id, file_type, description) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, file.path, file.filename, file_type || 'image', description]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('uploadPatientFile error:', error);
    if (file && file.filename) await deleteImage(file.filename);
    return res.status(500).json({ error: error.message });
  }
};

export const uploadProfilePhoto = async (req: Request, res: Response) => {
  const user = req.user!;
  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    // Buscar foto antiga para deletar
    const oldPhoto = await query('SELECT photo_public_id FROM users WHERE id = $1', [user.id]);
    if (oldPhoto.rows[0]?.photo_public_id) {
      await deleteImage(oldPhoto.rows[0].photo_public_id);
    }

    await query(
      'UPDATE users SET photo_url = $1, photo_public_id = $2 WHERE id = $3',
      [file.path, file.filename, user.id]
    );

    return res.status(200).json({ url: file.path, public_id: file.filename });
  } catch (error: any) {
    console.error('uploadProfilePhoto error:', error);
    if (file && file.filename) await deleteImage(file.filename);
    return res.status(500).json({ error: error.message });
  }
};

export const uploadPatientPhoto = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const file = (req as any).file;

  if (!file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado' });
  }

  try {
    const checkOwnership = await query('SELECT id, photo_public_id FROM patients WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (checkOwnership.rows.length === 0) {
      if (file.filename) await deleteImage(file.filename);
      return res.status(403).json({ error: 'Acesso negado' });
    }

    // Deletar foto antiga se existir
    if (checkOwnership.rows[0].photo_public_id) {
      await deleteImage(checkOwnership.rows[0].photo_public_id);
    }

    await query(
      'UPDATE patients SET photo_url = $1, photo_public_id = $2 WHERE id = $3',
      [file.path, file.filename, id]
    );

    return res.status(200).json({ url: file.path, public_id: file.filename });
  } catch (error: any) {
    console.error('uploadPatientPhoto error:', error);
    if (file && file.filename) await deleteImage(file.filename);
    return res.status(500).json({ error: error.message });
  }
};
