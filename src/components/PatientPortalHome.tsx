import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Stethoscope, Heart, AlertCircle, Activity, Calendar, MapPin, Phone, CheckCircle2 } from '../icons';
import { usePatientMoment, type PatientMomentState } from '../hooks/usePatientMoment';
import { GuidedConversation } from './GuidedConversation';
import { PostOperativeCheckIn } from './PostOperativeCheckIn';
import { getStatusConfig, getCountdownLabel, getCountdownColor } from '../constants/statusConfig';
import { ActionCard } from './ActionCard';
import { FeedbackPanel } from './FeedbackPanel';
import { PreparationChecklist } from './PreparationChecklist';
import { ConversationalMoment } from './ConversationalMoment';

interface PatientPortalHomeProps {
  patient: {
    name: string;
    photo_url: string;
  };
  clinic: {
    name?: string;
    clinic_name?: string;
    photo_url?: string;
  } | null;
  futureAppointments: Array<{
    id: number;
    start_time: string;
    end_time: string;
    status: string;
    notes: string;
    dentist_name: string;
  }>;
  recentProcedures: Array<{
    date: string;
    procedure: string;
    category: string;
  }>;
  onOpenDepth: () => void;
  onConfirmAppointment: (id: number) => void;
  onRescheduleAppointment: (apt: any) => void;
  appointmentSubmittingId: number | null;
  confirmedAppointmentId: number | null;
  rescheduleRequestedAppointmentId: number | null;
  sessionToken: string | null;
}

export function PatientPortalHome({
  patient,
  clinic,
  futureAppointments,
  recentProcedures,
  onOpenDepth,
  onConfirmAppointment,
  onRescheduleAppointment,
  appointmentSubmittingId,
  confirmedAppointmentId,
  rescheduleRequestedAppointmentId,
  sessionToken,
}: PatientPortalHomeProps) {
  const momentState = usePatientMoment({ 
    futureAppointments, 
    recentProcedures,
    pendingComplaints: [] // Sem queixas pendentes por enquanto
  });
  const { moment, urgency, needsImmediateEncaixe, context } = momentState;
  const [showGuidedConversation, setShowGuidedConversation] = useState(false);
  const [showPostOpCheckIn, setShowPostOpCheckIn] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const [showPreparationChecklist, setShowPreparationChecklist] = useState(false);
  const [checklist, setChecklist] = useState<Array<{ id: string; label: string; description?: string; completed: boolean }>>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'warning' | 'info' | 'loading'; title: string; message?: string } | null>(null);

  // Inicializar checklist quando há consulta próxima com menos de 2 dias
  useEffect(() => {
    if (futureAppointments.length > 0) {
      const nextAppointment = futureAppointments[0];
      const nextDate = new Date(nextAppointment.start_time);
      const now = new Date();
      const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntil <= 2 && daysUntil > 0) {
        setShowPreparationChecklist(true);
        setChecklist([
          { id: 'docs', label: 'Documentos (RG, CPF, cartão do plano)', completed: false },
          { id: 'hygiene', label: 'Escove bem os dentes antes', completed: false },
          { id: 'early', label: 'Chegue 10 minutos mais cedo', completed: false },
          { id: 'questions', label: 'Prepare suas dúvidas', completed: false },
        ]);
      }
    }
  }, [futureAppointments]);

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const formatDateBR = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  const formatTimeBR = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getConfirmationQuestion = (appointmentDate: string) => {
    const date = new Date(appointmentDate);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (left: Date, right: Date) =>
      left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate();

    const dayLabel = isSameDay(date, today)
      ? 'hoje'
      : isSameDay(date, tomorrow)
      ? 'amanhã'
      : `dia ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    return `Você vem ${dayLabel} às ${formatTimeBR(appointmentDate)}?`;
  };

  const handleScheduleRequest = async (complaint: string, duration: string, isUrgent?: boolean) => {
    setIsSubmittingSchedule(true);
    try {
      const res = await fetch('/api/portal/request-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          preferred_date: '',
          preferred_time: '',
          is_urgent: isUrgent ?? false,
          notes: `${complaint} - há ${duration}${isUrgent ? ' [URGENTE]' : ''}`
        })
      });
      if (!res.ok) throw new Error('Erro ao solicitar');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const firstName = patient.name.split(' ')[0];
  const nextAppointment = futureAppointments[0];

  // Debug: Se nenhum momento for renderizado, mostrar fallback
  if (!moment || !['emergency', 'confirming_appointment', 'treatment_progress', 'no_appointment', 'has_appointment_confirmed', 'post_operative', 'idle'].includes(moment)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Erro ao carregar portal</h2>
          <p className="text-gray-600 mt-2">Momento desconhecido: {moment}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* ─── ATO 1: Chegada ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/70 bg-white/70 p-5 shadow-[0_20px_45px_-35px_rgba(17,24,39,0.5)] backdrop-blur-xl"
        >
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#86868B]">
            {getGreeting()}
          </p>
          <h1 className="mt-1 text-[31px] font-semibold tracking-[-0.02em] text-[#1D1D1F]">
            {firstName}
          </h1>
          <p className="mt-2 text-[14px] text-[#6E6E73]">
            Seu painel foi desenhado para guiar cada próxima decisão com clareza.
          </p>
        </motion.div>

        {/* ─── ATO 2: EMERGÊNCIA ─── */}
        {moment === 'emergency' && (
          <ConversationalMoment
            emoji="🚨"
            question="Você está com dor agora?"
            context="Situação urgente"
            contextColor="red"
            urgencyLevel="critical"
            variant="alert"
            doctorMessage="Dr. Samuel está disponível para atendê-lo agora mesmo"
            lastUpdate="Tentaremos um encaixe imediato"
            primaryCTA={{
              label: 'SIM - Preciso de ajuda AGORA',
              emotion: '⚠️',
              onClick: () => setShowGuidedConversation(true),
            }}
            secondaryCTAs={[
              {
                label: 'Não é urgente agora',
                type: 'dismiss',
                onClick: () => {},
              },
            ]}
          />
        )}

        {/* ─── ATO 3: Tratamento em Progresso ─── */}
        {moment === 'treatment_progress' && context.treatmentPhase && (
          <ActionCard
            icon={<Stethoscope />}
            label="Seu Tratamento"
            title={context.treatmentPhase}
            subtitle="Você está no meio de um tratamento estruturado"
            variant="info"
            primaryAction={{
              label: 'Ver plano de tratamento',
              onClick: onOpenDepth,
              variant: 'primary',
              icon: <ChevronDown size={18} />,
            }}
          />
        )}

        {['confirming_appointment', 'has_appointment_confirmed'].includes(moment) && nextAppointment && (() => {
          const nextDate = new Date(nextAppointment.start_time);
          const now = new Date();
          const diffMs = nextDate.getTime() - now.getTime();
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const isConfirmed = moment === 'has_appointment_confirmed';
          const timeStr = nextDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          const dayName = nextDate.toLocaleDateString('pt-BR', { weekday: 'long' }).replace(/(^|\s)\w/g, (c) => c.toUpperCase());
          
          // Determinar urgência baseado em dias até consulta
          const getUrgency = () => {
            if (daysUntil <= 1) return 'high';
            if (daysUntil <= 3) return 'medium';
            return 'low' as const;
          };

          const getContextMessage = () => {
            if (daysUntil === 0) return 'hoje!';
            if (daysUntil === 1) return 'amanhã';
            if (daysUntil <= 3) return `em ${daysUntil} dias`;
            return `faltam ${daysUntil} dias`;
          };

          const getConversationQuestion = () => {
            if (isConfirmed) {
              return `Podemos contar com você ${dayName} às ${timeStr}?`;
            }
            return `Você consegue vir ${dayName} às ${timeStr}?`;
          };

          return (
            <>
              {/* Checklist de preparação (se consulta em até 2 dias) */}
              {showPreparationChecklist && daysUntil <= 2 && (
                <PreparationChecklist
                  title="Prepare-se para sua consulta"
                  description={`Consulta ${getContextMessage()} às ${timeStr}`}
                  items={checklist}
                  onItemToggle={(itemId) => {
                    setChecklist(prev =>
                      prev.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
                    );
                  }}
                  onComplete={async () => {
                    setFeedback({
                      type: 'success',
                      title: '✓ Você está pronto!',
                      message: `Te esperamos ${dayName} às ${timeStr}`
                    });
                    setTimeout(() => setShowPreparationChecklist(false), 2000);
                  }}
                  allCompleted={checklist.every(i => i.completed)}
                />
              )}

              {/* Feedback imediato (confirmação, etc) */}
              {feedback && (
                <FeedbackPanel
                  type={feedback.type}
                  title={feedback.title}
                  message={feedback.message}
                  autoHideDuration={feedback.type === 'success' ? 3000 : undefined}
                  onClose={() => setFeedback(null)}
                />
              )}

              {/* CONVERSATIONAL MOMENT - Pergunta/Confirmação */}
              <ConversationalMoment
                emoji={isConfirmed ? '💙' : '⏰'}
                question={getConversationQuestion()}
                context={getContextMessage()}
                contextColor={daysUntil <= 1 ? 'red' : daysUntil <= 3 ? 'yellow' : 'green'}
                urgencyLevel={getUrgency()}
                variant={isConfirmed ? 'question' : 'question'}
                doctorMessage={`Dr(a). ${nextAppointment.dentist_name} está te esperando`}
                lastUpdate={nextAppointment.notes ? nextAppointment.notes.substring(0, 50) : undefined}
                primaryCTA={
                  isConfirmed
                    ? {
                        label: 'Adicionar ao calendário',
                        emotion: '✓',
                        onClick: () => {
                          const link = document.createElement('a');
                          const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Clinic//Appointment//EN
BEGIN:VEVENT
UID:${nextAppointment.id}@clinic.com
DTSTAMP:${new Date().toISOString()}
DTSTART:${nextDate.toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTEND:${new Date(nextDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0]}Z
SUMMARY:Consulta com Dr(a). ${nextAppointment.dentist_name}
DESCRIPTION:${nextAppointment.notes || 'Consulta odontológica'}
END:VEVENT
END:VCALENDAR`;
                          link.setAttribute('href', 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics));
                          link.setAttribute('download', 'consulta.ics');
                          link.click();
                          setFeedback({
                            type: 'success',
                            title: 'Calendário atualizado!',
                            message: 'Você receberá um lembrete antes da consulta'
                          });
                        },
                      }
                    : {
                        label: 'Sim, conta comigo!',
                        emotion: '👍',
                        loading: appointmentSubmittingId === nextAppointment.id,
                        onClick: () => {
                          onConfirmAppointment(nextAppointment.id);
                          setFeedback({
                            type: 'success',
                            title: '✓ Confirmado!',
                            message: `Te esperamos ${dayName} às ${timeStr}. Você receberá um lembrete 24h antes.`
                          });
                        },
                      }
                }
                secondaryCTAs={[
                  {
                    label: 'Como chegar?',
                    type: 'alternative',
                    onClick: () => window.open('https://maps.google.com', '_blank'),
                  },
                  {
                    label: 'Tenho dúvida',
                    type: 'alternative',
                    onClick: () => setShowGuidedConversation(true),
                  },
                ]}
              />
            </>
          );
        })()}

        {/* ─── ATO 4: Sem Consulta ─── */}
        {moment === 'no_appointment' && (
          <ConversationalMoment
            emoji="😕"
            question="Quando foi sua última visita?"
            context="Já é hora de cuidar do seu sorriso"
            contextColor="red"
            urgencyLevel="high"
            variant="milestone"
            doctorMessage="Dr. Samuel quer saber como você está"
            primaryCTA={{
              label: 'Agendar agora',
              emotion: '📅',
              onClick: () => setShowGuidedConversation(true),
            }}
            secondaryCTAs={[
              {
                label: 'Preciso falar com a clínica',
                type: 'alternative',
                onClick: () => setShowGuidedConversation(true),
              },
            ]}
          />
        )}



        {/* ─── ATO 5: Pós-Operatório ─── */}
        {moment === 'post_operative' && recentProcedures.length > 0 && (() => {
          const proc = recentProcedures[0];
          const procDate = new Date(proc.date);
          const daysSinceProc = Math.floor(
            (new Date().getTime() - procDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          const getUrgencyPostOp = () => {
            if (daysSinceProc === 0) return 'critical';
            if (daysSinceProc <= 2) return 'high';
            if (daysSinceProc <= 7) return 'medium';
            return 'low' as const;
          };

          return (
            <ConversationalMoment
              emoji={daysSinceProc === 0 ? '🏥' : daysSinceProc <= 2 ? '😊' : '🌟'}
              question={daysSinceProc === 0 ? 'Como se sente agora?' : 'Já se sente melhor?'}
              context={daysSinceProc === 0 ? 'hoje mesmo' : `há ${daysSinceProc} día${daysSinceProc > 1 ? 's' : ''}`}
              contextColor={daysSinceProc === 0 ? 'red' : daysSinceProc <= 2 ? 'yellow' : 'green'}
              urgencyLevel={getUrgencyPostOp()}
              variant="check-in"
              doctorMessage={`Você realizou ${proc.procedure}. Dr. Samuel está acompanhando sua recuperação`}
              lastUpdate={daysSinceProc === 0 ? 'Procedimento realizado hoje' : `${daysSinceProc} dia${daysSinceProc > 1 ? 's' : ''} de recuperação`}
              primaryCTA={{
                label: daysSinceProc === 0 ? 'Fazer check-in' : 'Contar como está',
                emotion: daysSinceProc <= 2 ? '💙' : '✨',
                onClick: () => setShowPostOpCheckIn(true),
              }}
              secondaryCTAs={[
                {
                  label: 'Falar com Dr. Samuel',
                  type: 'alternative',
                  onClick: () => setShowGuidedConversation(true),
                },
              ]}
            />
          );
        })()}

        {/* ─── Divider ─── */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#D2D2D7] to-transparent" />

        {/* ─── ATO 6: Ver Mais (Profundidade) ─── */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onOpenDepth}
          className="group w-full rounded-2xl border border-[#0C9B72]/20 bg-white/70 px-5 py-4 text-[15px] font-semibold text-[#0C9B72] shadow-[0_12px_30px_-24px_rgba(12,155,114,0.55)] transition-all hover:border-[#0C9B72]/40 hover:bg-white"
        >
          <span className="flex items-center justify-center gap-2">
            Ver seu histórico completo
            <ChevronDown size={16} className="rotate-90 transition-transform group-hover:translate-x-0.5" />
          </span>
        </motion.button>
      </div>

      {/* Guided Conversation Modal */}
      <GuidedConversation
        isOpen={showGuidedConversation}
        onClose={() => setShowGuidedConversation(false)}
        onScheduleRequest={handleScheduleRequest}
        isSubmitting={isSubmittingSchedule}
        urgency={urgency}
        hasActivePostOperative={context.hasActivePostOperative}
        postOperativeDaysElapsed={context.postOperativeDaysElapsed}
      />

      {/* Post-Operative Check-In Modal */}
      <AnimatePresence>
        {showPostOpCheckIn && recentProcedures.length > 0 && (
          <PostOperativeCheckIn
            procedure={recentProcedures[0].procedure}
            daysSinceProc={Math.floor(
              (new Date().getTime() - new Date(recentProcedures[0].date).getTime()) / 
              (1000 * 60 * 60 * 24)
            )}
            onClose={() => setShowPostOpCheckIn(false)}
            onRequestCallback={handleScheduleRequest}
            onRequestAppointment={(type) => {
              setShowGuidedConversation(true);
              setShowPostOpCheckIn(false);
            }}
            sessionToken={sessionToken}
          />
        )}
      </AnimatePresence>
    </>
  );
}
