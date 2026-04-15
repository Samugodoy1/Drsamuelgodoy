import { Request, Response } from 'express';
import { query } from '../utils/db.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/config.js';

// ─── Generate portal access link for a patient (dentist-side) ───
export const generatePortalLink = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const { patient_id } = req.body;

    if (!patient_id) {
      return res.status(400).json({ error: 'ID do paciente é obrigatório' });
    }

    // Verify patient belongs to this dentist
    const patientCheck = await query(
      'SELECT id, name, email FROM patients WHERE id = $1 AND dentist_id = $2',
      [patient_id, dentistId]
    );
    if (patientCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000); // No practical expiration

    // Invalidate previous tokens for this patient
    await query(
      'UPDATE patient_portal_tokens SET used = TRUE WHERE patient_id = $1 AND used = FALSE',
      [patient_id]
    );

    await query(
      `INSERT INTO patient_portal_tokens (patient_id, dentist_id, token, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [patient_id, dentistId, token, expiresAt]
    );

    // Check if patient has any finished appointments (first visit = no finished appointments)
    const finishedCheck = await query(
      `SELECT 1 FROM appointments WHERE patient_id = $1 AND dentist_id = $2 AND status = 'FINISHED' LIMIT 1`,
      [patient_id, dentistId]
    );
    const isFirstVisit = finishedCheck.rows.length === 0;

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const portalUrl = `${baseUrl}/portal/${token}`;
    const preAtendimentoUrl = `${baseUrl}/pre-atendimento/${token}`;

    res.json({
      portal_url: portalUrl,
      pre_atendimento_url: isFirstVisit ? preAtendimentoUrl : null,
      is_first_visit: isFirstVisit,
      token,
      expires_at: expiresAt,
      patient: patientCheck.rows[0]
    });
  } catch (error: any) {
    console.error('Error generating portal link:', error);
    res.status(500).json({ error: 'Erro ao gerar link do portal' });
  }
};

// ─── Authenticate patient via portal token ───
export const authenticatePortalToken = async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    if (!token || token.length < 32) {
      return res.status(400).json({ error: 'Token inválido' });
    }

    const result = await query(
      `SELECT ppt.*, p.name as patient_name, p.email as patient_email, p.phone,
              p.cpf, p.birth_date, p.photo_url,
              u.name as dentist_name, u.clinic_name, u.clinic_address, u.photo_url as dentist_photo
       FROM patient_portal_tokens ppt
       JOIN patients p ON p.id = ppt.patient_id
       JOIN users u ON u.id = ppt.dentist_id
       WHERE ppt.token = $1 AND ppt.used = FALSE AND ppt.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Link expirado ou inválido. Solicite um novo link à sua clínica.' });
    }

    const data = result.rows[0];

    // Generate a short-lived JWT for portal session (24h)
    const portalJwt = jwt.sign(
      { 
        patient_id: data.patient_id, 
        dentist_id: data.dentist_id, 
        type: 'portal' 
      },
      getJwtSecret(),
      { expiresIn: '24h' }
    );

    res.json({
      session_token: portalJwt,
      patient: {
        id: data.patient_id,
        name: data.patient_name,
        email: data.patient_email,
        phone: data.phone,
        cpf: data.cpf,
        birth_date: data.birth_date,
        photo_url: data.photo_url
      },
      clinic: {
        dentist_name: data.dentist_name,
        clinic_name: data.clinic_name,
        clinic_address: data.clinic_address,
        dentist_photo: data.dentist_photo
      }
    });
  } catch (error: any) {
    console.error('Error authenticating portal token:', error);
    res.status(500).json({ error: 'Erro ao validar acesso' });
  }
};

// ─── Middleware: verify portal JWT ───
export const verifyPortalAuth = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso não autorizado' });
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    if (decoded.type !== 'portal' || !decoded.patient_id) {
      return res.status(401).json({ error: 'Token de portal inválido' });
    }
    (req as any).portal = {
      patient_id: decoded.patient_id,
      dentist_id: decoded.dentist_id
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão expirada. Acesse novamente pelo link enviado.' });
  }
};

// ─── Submit pre-attendance intake form ───
export const submitIntakeForm = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const {
      medical_history, allergies, medications, chief_complaint,
      habits, family_history, cpf, birth_date, personal_documents,
      emergency_contact_name, emergency_contact_phone, health_insurance, health_insurance_number
    } = req.body;

    // Upsert anamnesis
    await query(
      `INSERT INTO anamnesis (patient_id, medical_history, allergies, medications, chief_complaint, habits, family_history, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       ON CONFLICT (patient_id) DO UPDATE SET
         medical_history = COALESCE(EXCLUDED.medical_history, anamnesis.medical_history),
         allergies = COALESCE(EXCLUDED.allergies, anamnesis.allergies),
         medications = COALESCE(EXCLUDED.medications, anamnesis.medications),
         chief_complaint = COALESCE(EXCLUDED.chief_complaint, anamnesis.chief_complaint),
         habits = COALESCE(EXCLUDED.habits, anamnesis.habits),
         family_history = COALESCE(EXCLUDED.family_history, anamnesis.family_history),
         updated_at = NOW()`,
      [portal.patient_id, medical_history, allergies, medications, chief_complaint, habits, family_history]
    );

    // Update patient contact info if provided
    if (emergency_contact_name || emergency_contact_phone || health_insurance || cpf || birth_date) {
      await query(
        `UPDATE patients SET
           emergency_contact_name = COALESCE($2, emergency_contact_name),
           emergency_contact_phone = COALESCE($3, emergency_contact_phone),
           health_insurance = COALESCE($4, health_insurance),
           health_insurance_number = COALESCE($5, health_insurance_number),
           cpf = COALESCE($6, cpf),
           birth_date = COALESCE($7, birth_date)
         WHERE id = $1`,
        [portal.patient_id, emergency_contact_name, emergency_contact_phone, health_insurance, health_insurance_number, cpf, birth_date]
      );
    }

    // Save intake record
    await query(
      `INSERT INTO patient_intake_forms (patient_id, dentist_id, form_data, status)
       VALUES ($1, $2, $3, 'SUBMITTED')`,
      [portal.patient_id, portal.dentist_id, JSON.stringify(req.body)]
    );

    res.json({ message: 'Ficha de pré-atendimento enviada com sucesso!' });
  } catch (error: any) {
    console.error('Error submitting intake form:', error);
    res.status(500).json({ error: 'Erro ao enviar ficha' });
  }
};

// ─── Sign digital consent/terms ───
export const signConsent = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { consent_type, signature_data } = req.body;

    if (!consent_type || !signature_data) {
      return res.status(400).json({ error: 'Tipo de consentimento e assinatura são obrigatórios' });
    }

    const validTypes = ['TREATMENT_CONSENT', 'DATA_PRIVACY', 'GENERAL_TERMS'];
    if (!validTypes.includes(consent_type)) {
      return res.status(400).json({ error: 'Tipo de consentimento inválido' });
    }

    await query(
      `INSERT INTO patient_consent_signatures (patient_id, dentist_id, consent_type, signature_data, ip_address, signed_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [portal.patient_id, portal.dentist_id, consent_type, signature_data, req.ip]
    );

    // Update consent status on patient
    await query(
      'UPDATE patients SET consent_accepted = TRUE, consent_date = NOW()::TEXT WHERE id = $1',
      [portal.patient_id]
    );

    res.json({ message: 'Termo assinado com sucesso!' });
  } catch (error: any) {
    console.error('Error signing consent:', error);
    res.status(500).json({ error: 'Erro ao assinar termo' });
  }
};

// ─── Get patient portal data (history, appointments, documents, budgets) ───
export const getPortalData = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;

    const [patientRes, appointmentsRes, filesRes, evolutionRes, plansRes, consentsRes, anamnesisRes, transactionsRes, installmentsRes] = await Promise.all([
      query(
        `SELECT id, name, email, phone, cpf, birth_date, photo_url, address,
                consent_accepted, consent_date, emergency_contact_name, emergency_contact_phone,
                health_insurance, health_insurance_number, treatment_plan
         FROM patients WHERE id = $1 AND dentist_id = $2`,
        [portal.patient_id, portal.dentist_id]
      ),
      query(
        `SELECT a.id, a.start_time, a.end_time, a.status, a.notes, u.name as dentist_name
         FROM appointments a
         JOIN users u ON u.id = a.dentist_id
         WHERE a.patient_id = $1
         ORDER BY a.start_time DESC
         LIMIT 50`,
        [portal.patient_id]
      ),
      query(
        `SELECT id, file_url, file_type, description, created_at
         FROM patient_files WHERE patient_id = $1
         ORDER BY created_at DESC`,
        [portal.patient_id]
      ),
      query(
        `SELECT ce.id, ce.date, ce.procedure_performed, ce.notes, u.name as dentist_name
         FROM clinical_evolution ce
         JOIN users u ON u.id = ce.dentist_id
         WHERE ce.patient_id = $1
         ORDER BY ce.date DESC
         LIMIT 30`,
        [portal.patient_id]
      ),
      query(
        `SELECT pp.id, pp.procedure, pp.total_amount, pp.installments_count, pp.status, pp.created_at,
                json_agg(json_build_object(
                  'number', i.number, 'amount', i.amount, 'due_date', i.due_date, 
                  'status', i.status, 'payment_date', i.payment_date
                ) ORDER BY i.number) as installments
         FROM payment_plans pp
         LEFT JOIN installments i ON i.payment_plan_id = pp.id
         WHERE pp.patient_id = $1 AND pp.dentist_id = $2
         GROUP BY pp.id
         ORDER BY pp.created_at DESC`,
        [portal.patient_id, portal.dentist_id]
      ),
      query(
        `SELECT consent_type, signed_at FROM patient_consent_signatures
         WHERE patient_id = $1 ORDER BY signed_at DESC`,
        [portal.patient_id]
      ),
      query(
        `SELECT medical_history, allergies, medications, chief_complaint, habits, family_history
         FROM anamnesis WHERE patient_id = $1`,
        [portal.patient_id]
      ),
      query(
        `SELECT * FROM transactions
         WHERE patient_id = $1 AND dentist_id = $2
         ORDER BY date DESC`,
        [portal.patient_id, portal.dentist_id]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT i.*, p.procedure
         FROM installments i
         JOIN payment_plans p ON i.payment_plan_id = p.id
         WHERE i.patient_id = $1 AND i.dentist_id = $2
         ORDER BY i.due_date ASC`,
        [portal.patient_id, portal.dentist_id]
      ).catch(() => ({ rows: [] }))
    ]);

    if (patientRes.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    // Get clinic info
    const clinicRes = await query(
      'SELECT name, clinic_name, clinic_address, phone, photo_url, specialty FROM users WHERE id = $1',
      [portal.dentist_id]
    );

    res.json({
      patient: patientRes.rows[0],
      anamnesis: anamnesisRes.rows[0] || null,
      appointments: appointmentsRes.rows,
      files: filesRes.rows,
      evolution: evolutionRes.rows,
      payment_plans: plansRes.rows,
      transactions: transactionsRes.rows,
      installments: installmentsRes.rows,
      consents: consentsRes.rows,
      clinic: clinicRes.rows[0] || null
    });
  } catch (error: any) {
    console.error('Error fetching portal data:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do portal' });
  }
};

// ─── Request appointment (patient side) ───
export const requestAppointment = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { preferred_date, preferred_time, notes } = req.body;

    if (!preferred_date) {
      return res.status(400).json({ error: 'Data preferencial é obrigatória' });
    }

    await query(
      `INSERT INTO appointment_requests (patient_id, dentist_id, preferred_date, preferred_time, notes, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDING')`,
      [portal.patient_id, portal.dentist_id, preferred_date, preferred_time || null, notes || null]
    );

    res.json({ message: 'Solicitação de agendamento enviada! A clínica entrará em contato para confirmar.' });
  } catch (error: any) {
    console.error('Error requesting appointment:', error);
    res.status(500).json({ error: 'Erro ao solicitar agendamento' });
  }
};

// ─── Get appointment requests (dentist side) ───
export const getAppointmentRequests = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const result = await query(
      `SELECT ar.id, ar.patient_id, ar.dentist_id, ar.status, ar.notes, ar.preferred_time,
              ar.preferred_date::text as preferred_date, ar.created_at,
              p.name as patient_name, p.phone as patient_phone
       FROM appointment_requests ar
       JOIN patients p ON p.id = ar.patient_id
       WHERE ar.dentist_id = $1
       ORDER BY ar.created_at DESC
       LIMIT 50`,
      [dentistId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching appointment requests:', error);
    res.status(500).json({ error: 'Erro ao buscar solicitações' });
  }
};

// ─── Update appointment request status (dentist side) ───
export const updateAppointmentRequest = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    await query(
      'UPDATE appointment_requests SET status = $1 WHERE id = $2 AND dentist_id = $3',
      [status, id, dentistId]
    );

    res.json({ message: 'Solicitação atualizada' });
  } catch (error: any) {
    console.error('Error updating appointment request:', error);
    res.status(500).json({ error: 'Erro ao atualizar solicitação' });
  }
};

// ─── Upload document from portal (patient side) ───
export const uploadPortalDocument = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const file = req.file as any;

    if (!file) {
      return res.status(400).json({ error: 'Arquivo não enviado' });
    }

    await query(
      `INSERT INTO patient_files (patient_id, file_url, file_public_id, file_type, description, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [portal.patient_id, file.path, file.filename, req.body.file_type || 'document', req.body.description || 'Enviado pelo portal']
    );

    res.json({ message: 'Documento enviado com sucesso!' });
  } catch (error: any) {
    console.error('Error uploading portal document:', error);
    res.status(500).json({ error: 'Erro ao enviar documento' });
  }
};

// ─── Get intake forms (dentist side) ───
export const getIntakeForms = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const result = await query(
      `SELECT pif.id, pif.patient_id, pif.form_data, pif.status, pif.created_at,
              p.name as patient_name, p.phone as patient_phone
       FROM patient_intake_forms pif
       JOIN patients p ON p.id = pif.patient_id
       WHERE pif.dentist_id = $1
       ORDER BY pif.created_at DESC
       LIMIT 100`,
      [dentistId]
    );
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching intake forms:', error);
    res.status(500).json({ error: 'Erro ao buscar fichas' });
  }
};

// ─── Mark intake form as reviewed (dentist side) ───
export const reviewIntakeForm = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const { id } = req.params;
    await query(
      'UPDATE patient_intake_forms SET status = $1, reviewed_at = NOW() WHERE id = $2 AND dentist_id = $3',
      ['REVIEWED', id, dentistId]
    );
    res.json({ message: 'Ficha marcada como revisada' });
  } catch (error: any) {
    console.error('Error reviewing intake form:', error);
    res.status(500).json({ error: 'Erro ao revisar ficha' });
  }
};

// ─── Cancel appointment request (patient side) ───
export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { appointment_id, reason } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ error: 'ID da consulta é obrigatório' });
    }

    // Verify appointment belongs to this patient
    const appt = await query(
      `SELECT id, status FROM appointments WHERE id = $1 AND patient_id = $2 AND status IN ('SCHEDULED', 'CONFIRMED')`,
      [appointment_id, portal.patient_id]
    );
    if (appt.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada ou não pode ser cancelada' });
    }

    // Create cancellation request
    await query(
      `INSERT INTO appointment_requests (patient_id, dentist_id, preferred_date, notes, status, request_type, appointment_id)
       VALUES ($1, $2, CURRENT_DATE, $3, 'PENDING', 'CANCEL', $4)`,
      [portal.patient_id, portal.dentist_id, reason || 'Paciente solicitou cancelamento', appointment_id]
    );

    res.json({ message: 'Solicitação de cancelamento enviada. A clínica confirmará em breve.' });
  } catch (error: any) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Erro ao solicitar cancelamento' });
  }
};

// ─── Reschedule appointment request (patient side) ───
export const rescheduleAppointment = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { appointment_id, preferred_date, preferred_time, reason } = req.body;

    if (!appointment_id || !preferred_date) {
      return res.status(400).json({ error: 'ID da consulta e nova data são obrigatórios' });
    }

    // Verify appointment belongs to this patient
    const appt = await query(
      `SELECT id, status FROM appointments WHERE id = $1 AND patient_id = $2 AND status IN ('SCHEDULED', 'CONFIRMED')`,
      [appointment_id, portal.patient_id]
    );
    if (appt.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada ou não pode ser reagendada' });
    }

    await query(
      `INSERT INTO appointment_requests (patient_id, dentist_id, preferred_date, preferred_time, notes, status, request_type, appointment_id)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', 'RESCHEDULE', $6)`,
      [portal.patient_id, portal.dentist_id, preferred_date, preferred_time || null, reason || 'Paciente solicitou reagendamento', appointment_id]
    );

    res.json({ message: 'Solicitação de reagendamento enviada. A clínica confirmará em breve.' });
  } catch (error: any) {
    console.error('Error rescheduling appointment:', error);
    res.status(500).json({ error: 'Erro ao solicitar reagendamento' });
  }
};

// ─── Confirm appointment (patient side) ───
export const confirmAppointment = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { appointment_id } = req.body;

    if (!appointment_id) {
      return res.status(400).json({ error: 'ID da consulta é obrigatório' });
    }

    // patient_id é suficiente — getPortalData lista consultas de todos os dentistas
    const appt = await query(
      `SELECT id, status, start_time, dentist_id
       FROM appointments
       WHERE id = $1
         AND patient_id = $2
         AND status IN ('SCHEDULED', 'CONFIRMED')`,
      [appointment_id, portal.patient_id]
    );

    if (appt.rows.length === 0) {
      return res.status(404).json({ error: 'Consulta não encontrada ou não pode ser confirmada' });
    }

    const row = appt.rows[0];

    if (row.status !== 'CONFIRMED') {
      await query(
        `UPDATE appointments SET status = 'CONFIRMED' WHERE id = $1 AND patient_id = $2`,
        [appointment_id, portal.patient_id]
      );

      const scheduledAt = new Date(row.start_time).toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      await query(
        `INSERT INTO portal_messages (patient_id, dentist_id, sender, message)
         VALUES ($1, $2, 'patient', $3)`,
        [portal.patient_id, row.dentist_id, `Confirmei minha presença para a consulta de ${scheduledAt}.`]
      );
    }

    res.json({ message: 'Consulta confirmada com sucesso!' });
  } catch (error: any) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ error: 'Erro ao confirmar consulta' });
  }
};

// ─── Send message (patient side) ───
export const sendPortalMessage = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máx. 2000 caracteres)' });
    }

    await query(
      `INSERT INTO portal_messages (patient_id, dentist_id, sender, message) VALUES ($1, $2, 'patient', $3)`,
      [portal.patient_id, portal.dentist_id, message.trim()]
    );

    res.json({ message: 'Mensagem enviada!' });
  } catch (error: any) {
    console.error('Error sending portal message:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

// ─── Get messages (patient side) ───
export const getPortalMessages = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;

    const result = await query(
      `SELECT id, sender, message, read, created_at FROM portal_messages
       WHERE patient_id = $1 AND dentist_id = $2
       ORDER BY created_at ASC
       LIMIT 100`,
      [portal.patient_id, portal.dentist_id]
    );

    // Mark dentist messages as read
    await query(
      `UPDATE portal_messages SET read = TRUE WHERE patient_id = $1 AND dentist_id = $2 AND sender = 'dentist' AND read = FALSE`,
      [portal.patient_id, portal.dentist_id]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching portal messages:', error);
    res.status(500).json({ error: 'Erro ao carregar mensagens' });
  }
};

// ─── Get messages (dentist side) ───
export const getDentistMessages = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const { patient_id } = req.params;

    const result = await query(
      `SELECT id, sender, message, read, created_at FROM portal_messages
       WHERE patient_id = $1 AND dentist_id = $2
       ORDER BY created_at ASC
       LIMIT 100`,
      [patient_id, dentistId]
    );

    // Mark patient messages as read
    await query(
      `UPDATE portal_messages SET read = TRUE WHERE patient_id = $1 AND dentist_id = $2 AND sender = 'patient' AND read = FALSE`,
      [patient_id, dentistId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching dentist messages:', error);
    res.status(500).json({ error: 'Erro ao carregar mensagens' });
  }
};

// ─── Send message (dentist side) ───
export const sendDentistMessage = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;
    const { patient_id } = req.params;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Mensagem não pode ser vazia' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Mensagem muito longa (máx. 2000 caracteres)' });
    }

    // Verify patient belongs to dentist
    const check = await query('SELECT id FROM patients WHERE id = $1 AND dentist_id = $2', [patient_id, dentistId]);
    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    await query(
      `INSERT INTO portal_messages (patient_id, dentist_id, sender, message) VALUES ($1, $2, 'dentist', $3)`,
      [patient_id, dentistId, message.trim()]
    );

    res.json({ message: 'Mensagem enviada!' });
  } catch (error: any) {
    console.error('Error sending dentist message:', error);
    res.status(500).json({ error: 'Erro ao enviar mensagem' });
  }
};

// ─── Get unread message counts (dentist side) ───
export const getUnreadMessageCounts = async (req: Request, res: Response) => {
  try {
    const dentistId = req.user?.id;

    const result = await query(
      `SELECT pm.patient_id, p.name as patient_name, COUNT(*) as unread_count, MAX(pm.created_at) as last_message_at
       FROM portal_messages pm
       JOIN patients p ON p.id = pm.patient_id
       WHERE pm.dentist_id = $1 AND pm.sender = 'patient' AND pm.read = FALSE
       GROUP BY pm.patient_id, p.name
       ORDER BY last_message_at DESC`,
      [dentistId]
    );

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching unread counts:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens não lidas' });
  }
};

// ─── Inform payment (patient side) ───
export const informPayment = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;
    const { installment_id, amount, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Valor é obrigatório' });
    }

    // Create a message to the dentist informing payment
    const msg = installment_id
      ? `💰 Informo que realizei o pagamento da parcela #${installment_id} no valor de R$ ${Number(amount).toFixed(2)}. ${notes || ''}`
      : `💰 Informo que realizei um pagamento no valor de R$ ${Number(amount).toFixed(2)}. ${notes || ''}`;

    await query(
      `INSERT INTO portal_messages (patient_id, dentist_id, sender, message) VALUES ($1, $2, 'patient', $3)`,
      [portal.patient_id, portal.dentist_id, msg.trim()]
    );

    res.json({ message: 'Pagamento informado! A clínica confirmará o recebimento.' });
  } catch (error: any) {
    console.error('Error informing payment:', error);
    res.status(500).json({ error: 'Erro ao informar pagamento' });
  }
};

// ─── Get clinic PIX info (patient side) ───
export const getClinicPixInfo = async (req: Request, res: Response) => {
  try {
    const portal = (req as any).portal;

    const result = await query(
      `SELECT pix_key, pix_key_type, pix_beneficiary_name, name, clinic_name FROM users WHERE id = $1`,
      [portal.dentist_id]
    );

    if (result.rows.length === 0 || !result.rows[0].pix_key) {
      return res.json({ has_pix: false });
    }

    const row = result.rows[0];
    res.json({
      has_pix: true,
      pix_key: row.pix_key,
      pix_key_type: row.pix_key_type,
      beneficiary_name: row.pix_beneficiary_name || row.clinic_name || row.name
    });
  } catch (error: any) {
    console.error('Error fetching PIX info:', error);
    res.status(500).json({ error: 'Erro ao buscar dados PIX' });
  }
};

