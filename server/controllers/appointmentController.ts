import { Request, Response } from 'express';
import { query } from '../utils/db.js';

const syncAppointmentStatusesForDentist = async (dentistId: number) => {
  await query(
    `
      UPDATE appointments
      SET status = CASE
        WHEN end_time <= NOW() AND status NOT IN ('FINISHED', 'CANCELLED', 'NO_SHOW') THEN 'FINISHED'
        WHEN start_time <= NOW() AND end_time > NOW() AND status NOT IN ('IN_PROGRESS', 'CANCELLED', 'NO_SHOW') THEN 'IN_PROGRESS'
        ELSE status
      END
      WHERE dentist_id = $1
        AND status NOT IN ('CANCELLED', 'NO_SHOW')
        AND (
          (end_time <= NOW() AND status NOT IN ('FINISHED', 'CANCELLED', 'NO_SHOW'))
          OR (start_time <= NOW() AND end_time > NOW() AND status NOT IN ('IN_PROGRESS', 'CANCELLED', 'NO_SHOW'))
        )
    `,
    [dentistId]
  );
};

export const getAppointments = async (req: Request, res: Response) => {
  const user = req.user!;
  try {
    await syncAppointmentStatusesForDentist(user.id);

    const sql = `
      SELECT a.*, p.name as patient_name, p.phone as patient_phone, d.name as dentist_name 
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN users d ON a.dentist_id = d.id
      WHERE a.dentist_id = $1
    `;
    const result = await query(sql, [user.id]);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error('getAppointments error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const createAppointment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { patient_id, start_time, end_time, notes } = req.body;

  try {
    // Verify patient belongs to this dentist
    const patientCheck = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [patient_id, user.id]);
    if (patientCheck.rows.length === 0) return res.status(403).json({ error: 'Paciente não encontrado ou acesso negado' });

    // Apple-style: Check for conflicting appointments (overlap)
    const conflictCheck = await query(
      `SELECT id FROM appointments
        WHERE dentist_id = $1
          AND status NOT IN ('CANCELLED')
          AND (
            (start_time < $3::timestamp AND end_time > $2::timestamp)
          )
      `,
      [user.id, start_time, end_time]
    );
    if (conflictCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Já existe um agendamento conflitante neste horário.' });
    }

    const result = await query(
      'INSERT INTO appointments (patient_id, dentist_id, start_time, end_time, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [
        patient_id,
        user.id,
        new Date(start_time).toISOString(),
        new Date(end_time).toISOString(),
        notes
      ]
    );
    return res.status(201).json({ id: result.rows[0].id });
  } catch (error: any) {
    console.error('createAppointment error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { status } = req.body;
  try {
    const result = await query('UPDATE appointments SET status = $1 WHERE id = $2 AND dentist_id = $3', [status, id, user.id]);
    if (result.rowCount === 0) return res.status(403).json({ error: 'Acesso negado ou agendamento não encontrado' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateAppointmentStatus error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const updateAppointment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  const { patient_id, start_time, end_time, notes } = req.body;

  try {
    const check = await query('SELECT id FROM appointments WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado ou agendamento não encontrado' });

    const patientCheck = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [patient_id, user.id]);
    if (patientCheck.rows.length === 0) return res.status(403).json({ error: 'Paciente não encontrado ou acesso negado' });

    await query(
      'UPDATE appointments SET patient_id = $1, start_time = $2, end_time = $3, notes = $4 WHERE id = $5 AND dentist_id = $6',
      [patient_id, start_time, end_time, notes, id, user.id]
    );

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('updateAppointment error:', error);
    return res.status(500).json({ error: error.message });
  }
};

export const remindAppointment = async (req: Request, res: Response) => {
  const user = req.user!;
  const { id } = req.params;
  try {
    const check = await query('SELECT id FROM appointments WHERE id = $1 AND dentist_id = $2', [id, user.id]);
    if (check.rows.length === 0) return res.status(403).json({ error: 'Acesso negado' });
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('remindAppointment error:', error);
    return res.status(500).json({ error: error.message });
  }
};
