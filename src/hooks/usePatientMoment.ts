import { useMemo } from 'react';

export type PatientMoment = 
  | 'emergency'           // Dor aguda + urgência imediata
  | 'confirming_appointment'
  | 'no_appointment'
  | 'has_appointment_confirmed'
  | 'post_operative'
  | 'treatment_progress' // Tratamento em progresso (múltiplas fases)
  | 'idle';

export type UrgencyLevel = 'critical' | 'high' | 'medium' | 'low';

export interface PatientMomentState {
  moment: PatientMoment;
  urgency: UrgencyLevel;
  needsImmediateEncaixe: boolean; // Se deve sugerir encaixe de urgência
  context: {
    daysUntilNextAppointment?: number;
    postOperativeDaysElapsed?: number;
    hasActivePostOperative: boolean;
    treatmentPhase?: string;
  };
}

interface UsePatientMomentProps {
  futureAppointments: Array<{ id: number; start_time: string; status: string }>;
  recentProcedures: Array<{ date: string; procedure: string; category: string }>;
  pendingComplaints?: Array<{ complaint: string; duration: string; created_at?: string }>;
}

/**
 * Determina o "momento" atual do paciente baseado em:
 * - Status de consultas futuras
 * - Histórico de procedimentos recentes
 * - Queixas pendentes
 * 
 * Usa matriz de prioridades (não if-ladder) para decisão robusta
 */
export function usePatientMoment({ 
  futureAppointments, 
  recentProcedures,
  pendingComplaints = []
}: UsePatientMomentProps): PatientMomentState {
  return useMemo(() => {
    const now = new Date();
    const hasNextAppointment = futureAppointments.length > 0;
    const nextApp = futureAppointments[0];
    
    // ─── CALCULAR CONTEXTO ───
    let context = {
      daysUntilNextAppointment: undefined as number | undefined,
      postOperativeDaysElapsed: 0,
      hasActivePostOperative: false,
      treatmentPhase: undefined as string | undefined,
    };
    
    if (hasNextAppointment) {
      const nextDate = new Date(nextApp.start_time);
      context.daysUntilNextAppointment = Math.ceil(
        (nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    
    // Pós-operatório: procedimento < 7 dias
    if (recentProcedures.length > 0) {
      const lastProc = recentProcedures[0];
      const procDate = new Date(lastProc.date);
      const daysSinceProc = Math.floor(
        (now.getTime() - procDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      
      if (daysSinceProc < 7) {
        context.hasActivePostOperative = true;
        context.postOperativeDaysElapsed = daysSinceProc;
      }
    }
    
    // ─── MATRIZ DE PRIORIDADE (decisão por pontuação) ───
    interface MomentDecision {
      moment: PatientMoment;
      urgency: UrgencyLevel;
      score: number;
      needsImmediateEncaixe: boolean;
    }
    
    const candidates: MomentDecision[] = [];
    
    // 1. EMERGENCY: Dor aguda (hoje) + sem consulta próxima OU consulta > 3 dias
    if (pendingComplaints.some(c => c.complaint === 'dor' && c.duration === 'hoje')) {
      const daysToNextApp = context.daysUntilNextAppointment ?? 999;
      if (daysToNextApp > 3 || !hasNextAppointment) {
        candidates.push({
          moment: 'emergency',
          urgency: 'critical',
          score: 1000,
          needsImmediateEncaixe: true,
        });
      }
    }
    
    // 2. POST_OPERATIVE: Procedimento < 7 dias
    if (context.hasActivePostOperative) {
      candidates.push({
        moment: 'post_operative',
        urgency: context.postOperativeDaysElapsed < 2 ? 'high' : 'medium',
        score: 900 - (context.postOperativeDaysElapsed * 10),
        needsImmediateEncaixe: false,
      });
    }
    
    // 3. TREATMENT_PROGRESS: Tratamento com múltiplas fases (categoria específica)
    if (recentProcedures.some(p => p.category === 'treatment_phase')) {
      const treatmentProc = recentProcedures.find(p => p.category === 'treatment_phase');
      candidates.push({
        moment: 'treatment_progress',
        urgency: 'medium',
        score: 800,
        needsImmediateEncaixe: false,
      });
      if (treatmentProc) {
        context.treatmentPhase = treatmentProc.procedure;
      }
    }
    
    // 4. CONFIRMING_APPOINTMENT: Consulta SCHEDULED
    if (hasNextAppointment && nextApp.status === 'SCHEDULED') {
      const daysUntil = context.daysUntilNextAppointment ?? 999;
      const urgency = daysUntil <= 1 ? 'high' : daysUntil <= 3 ? 'medium' : 'low';
      
      candidates.push({
        moment: 'confirming_appointment',
        urgency,
        score: 700 - (Math.max(0, 3 - daysUntil) * 50), // Prioriza se perto
        needsImmediateEncaixe: false,
      });
    }
    
    // 5. HAS_APPOINTMENT_CONFIRMED: Consulta CONFIRMED
    if (hasNextAppointment && nextApp.status === 'CONFIRMED') {
      candidates.push({
        moment: 'has_appointment_confirmed',
        urgency: 'low',
        score: 600,
        needsImmediateEncaixe: false,
      });
    }
    
    // 6. NO_APPOINTMENT: Sem consulta futura
    if (!hasNextAppointment) {
      candidates.push({
        moment: 'no_appointment',
        urgency: 'low',
        score: 500,
        needsImmediateEncaixe: false,
      });
    }
    
    // 7. IDLE: Fallback
    candidates.push({
      moment: 'idle',
      urgency: 'low',
      score: 0,
      needsImmediateEncaixe: false,
    });
    
    // ─── SELECIONAR VENCEDOR (maior score) ───
    const winner = candidates.length > 0 
      ? candidates.reduce((best, current) => current.score > best.score ? current : best)
      : {
          moment: 'idle' as PatientMoment,
          urgency: 'low' as UrgencyLevel,
          score: 0,
          needsImmediateEncaixe: false,
        };
    
    return {
      moment: winner.moment,
      urgency: winner.urgency,
      needsImmediateEncaixe: winner.needsImmediateEncaixe,
      context,
    };
  }, [futureAppointments, recentProcedures, pendingComplaints]);
}
