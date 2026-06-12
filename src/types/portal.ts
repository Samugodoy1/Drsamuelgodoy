// Tipos da atividade iniciada pelo paciente via portal (GET /api/portal/activity)

export type PortalRequestType = 'NEW' | 'RESCHEDULE' | 'CANCEL';

export interface PortalAppointmentRequest {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  preferred_date: string;
  preferred_time: string | null;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  request_type: PortalRequestType;
  appointment_id: number | null;
  appointment_start_time: string | null;
  created_at: string;
}

export interface PortalIntakeFormSummary {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  created_at: string;
}

export interface PortalUnreadThread {
  patient_id: number;
  patient_name: string;
  unread_count: number;
  last_message_at: string;
}

export interface PortalConfirmation {
  id: number;
  patient_id: number;
  patient_name: string;
  start_time: string;
  confirmed_at: string;
}

export interface PortalActivity {
  requests: PortalAppointmentRequest[];
  intakeForms: PortalIntakeFormSummary[];
  unreadThreads: PortalUnreadThread[];
  recentConfirmations: PortalConfirmation[];
}
