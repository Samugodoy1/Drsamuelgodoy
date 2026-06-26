/**
 * Orthodontics — tipos do domínio isolado (frontend).
 * Espelham o contrato retornado por GET /patients/:id/orthodontics.
 */

export type OrthoStatus = 'planejamento' | 'ativo' | 'pausado' | 'finalizado' | 'contencao';
export type CollaborationLevel = 'excelente' | 'boa' | 'regular' | 'baixa' | 'muito_baixa';
export type PhotoStage = 'inicial' | 'intermediaria' | 'atual' | 'final';

export interface OrthoTreatment {
  id: number;
  patient_id: number;
  dentist_id: number;
  status: OrthoStatus;
  start_date: string | null;
  estimated_end_date: string | null;
  notes: string | null;
  created_at: string;
}

export interface OrthoVisit {
  id: number;
  treatment_id: number;
  date: string;
  upper_arch: string | null;
  lower_arch: string | null;
  procedures: string[] | null;
  accessories_added: ToothAccessoryRef[] | null;
  accessories_removed: ToothAccessoryRef[] | null;
  photos: string[] | null;
  collaboration: CollaborationLevel | null;
  guidance: string | null;
  notes: string | null;
  summary_text: string | null;
  created_at: string;
}

export interface OrthoArch {
  id: number;
  arch: 'superior' | 'inferior';
  material: string | null;
  gauge: string | null;
  installed_date: string;
  notes: string | null;
  days_installed: number | null;
}

export interface ToothAccessoryRef {
  type: string;
  tooth?: number;
}

export interface OrthoTooth {
  id: number;
  treatment_id: number;
  tooth_number: number;
  accessories: string[];
  notes: string | null;
  updated_at: string;
}

export interface OrthoPhoto {
  id: number;
  treatment_id: number;
  visit_id: number | null;
  file_url: string;
  stage: PhotoStage;
  taken_date: string;
  notes: string | null;
}

export interface PatientCollaboration {
  id: number;
  treatment_id: number;
  level: CollaborationLevel;
  notes: string | null;
  date: string;
}

export interface OrthoHeader {
  status: OrthoStatus;
  statusLabel: string;
  startDate: string | null;
  estimatedEndDate: string | null;
  lastVisitDate: string | null;
  nextReturnDate: string | null;
  daysSinceLastVisit: number | null;
  daysUntilReturn: number | null;
  isOverdue: boolean;
  visitCount: number;
  monthsActive: number | null;
}

export interface AttentionItem {
  id: string;
  label: string;
  severity: 'high' | 'medium' | 'low';
}

export interface OrthodonticsResponse {
  enabled: boolean;
  treatments: OrthoTreatment[];
  activeTreatment?: OrthoTreatment;
  visits?: OrthoVisit[];
  arches?: OrthoArch[];
  teeth?: OrthoTooth[];
  photos?: OrthoPhoto[];
  collaborations?: PatientCollaboration[];
  header?: OrthoHeader;
  summaryText?: string[];
  attention?: AttentionItem[];
}

export interface OrthodonticsApi {
  apiFetch: (input: string, init?: any) => Promise<Response>;
}
