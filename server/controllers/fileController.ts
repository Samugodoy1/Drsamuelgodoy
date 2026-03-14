import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import { deleteImage } from '../services/cloudinaryService.js';

export const deleteFile = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    // Verify ownership: file -> patient -> dentist
    const check = await query(
      'SELECT f.id, f.file_public_id FROM patient_files f JOIN patients p ON f.patient_id = p.id WHERE f.id = $1 AND p.dentist_id = $2',
      [id, user.id]
    );
    if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });

    const filePublicId = check.rows[0].file_public_id;

    await query('DELETE FROM patient_files WHERE id = $1', [id]);

    if (filePublicId) {
      await deleteImage(filePublicId);
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('deleteFile error:', error);
    return res.status(500).json({ error: error.message });
  }
};
