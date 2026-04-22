import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Stethoscope, Heart, AlertCircle, Activity } from '../icons';
import { usePatientMoment, type PatientMomentState } from '../hooks/usePatientMoment';
import { GuidedConversation } from './GuidedConversation';
import { PostOperativeCheckIn } from './PostOperativeCheckIn';
import { getStatusConfig, getCountdownLabel, getCountdownColor } from '../constants/statusConfig';

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
        >
          <p className="text-[#8E8E93] text-[13px] font-medium tracking-wide uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mt-1">
            {firstName}
          </h1>
        </motion.div>

        {/* ─── ATO 2: EMERGÊNCIA ─── */}
        {moment === 'emergency' && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF3B30]/5 to-[#FF1744]/5 backdrop-blur-xl border-2 border-[#FF3B30]/30"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF3B30]/[0.08] rounded-full blur-3xl opacity-80 animate-pulse" />
            
            <div className="relative z-10 p-8 sm:p-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-14 h-14 bg-[#FF3B30]/20 rounded-full flex items-center justify-center shrink-0">
                  <AlertCircle size={28} className="text-[#FF3B30] animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#FF3B30] text-[12px] font-bold uppercase tracking-wider">
                    ⚠ Situação de Urgência
                  </p>
                  <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mt-2">
                    Você está com dor aguda
                  </h2>
                  <p className="text-[#8E8E93] text-[15px] mt-2">
                    Podemos tentar um encaixe imediato para aliviar seu desconforto
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGuidedConversation(true)}
                  className="w-full h-12 px-5 rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF1744] text-white text-[15px] font-semibold tracking-tight active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <AlertCircle size={18} />
                  Solicitar Atendimento Urgente
                </motion.button>

                <button
                  onClick={() => {
                    // Swipe para descartar e ir para próximo momento
                  }}
                  className="w-full text-[#8E8E93] text-[15px] font-medium py-3 hover:text-[#1C1C1E] transition-colors"
                >
                  Não é urgente agora
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── ATO 3: Tratamento em Progresso ─── */}
        {moment === 'treatment_progress' && context.treatmentPhase && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#007AFF]/5 to-[#5AC8FA]/5 backdrop-blur-xl border border-[#007AFF]/20"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#007AFF]/[0.08] rounded-full blur-3xl opacity-60" />
            
            <div className="relative z-10 p-8 sm:p-10">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 bg-[#007AFF]/10 rounded-full flex items-center justify-center shrink-0">
                  <Stethoscope size={24} className="text-[#007AFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[#007AFF] text-[12px] font-bold uppercase tracking-wider">
                    Tratamento em Progresso
                  </p>
                  <h2 className="text-[#1C1C1E] text-[20px] font-bold tracking-tight mt-1">
                    {context.treatmentPhase}
                  </h2>
                  <p className="text-[#8E8E93] text-[14px] mt-2">
                    Você está no meio de um tratamento. Próximas etapas virão conforme programado.
                  </p>
                </div>
              </div>

              {nextAppointment && (
                <button
                  onClick={onOpenDepth}
                  className="w-full text-[#007AFF] text-[15px] font-semibold py-3 hover:opacity-70 transition-opacity flex items-center justify-center gap-2"
                >
                  Ver plano de tratamento
                  <ChevronDown size={16} />
                </button>
              )}
            </div>
          </motion.div>
        )}

        {['confirming_appointment', 'has_appointment_confirmed'].includes(moment) && nextAppointment && (() => {
          const nextDate = new Date(nextAppointment.start_time);
          const now = new Date();
          const diffMs = nextDate.getTime() - now.getTime();
          const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const isConfirmed = moment === 'has_appointment_confirmed';

          return (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#F9FAFB] backdrop-blur-xl border border-white/80 group transition-all duration-300"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#0C9B72]/[0.08] rounded-full blur-3xl group-hover:opacity-100 opacity-60 transition-opacity duration-500" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0C9B72]/[0.04] rounded-full blur-3xl" />

              <div className="relative z-10 p-8 sm:p-10">
                <div className="flex items-start justify-between gap-4 mb-7">
                  <div className="flex-1 min-w-0">
                    <p className="text-[#0C9B72] text-[12px] font-bold uppercase tracking-wider">
                      {isConfirmed ? 'Próxima Consulta Confirmada' : 'Sua Consulta'}
                    </p>
                    <p className="text-[#1C1C1E] text-[40px] font-bold tracking-tight mt-2 leading-tight">
                      {nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                    </p>
                    <div className="mt-4 space-y-1">
                      <p className="text-[#0C9B72] text-[16px] font-semibold">
                        {formatTimeBR(nextAppointment.start_time)}
                      </p>
                      <p className="text-[#8E8E93] text-[14px] font-medium">
                        Dr(a). {nextAppointment.dentist_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2.5 shrink-0">
                    <motion.span
                      whileHover={{ scale: 1.05 }}
                      className={`px-5 py-3 rounded-full text-[13px] font-bold ${getCountdownColor(daysUntil)}`}
                    >
                      {getCountdownLabel(daysUntil)}
                    </motion.span>
                    <span
                      className={`px-5 py-2.5 rounded-full text-[12px] font-semibold ${getStatusConfig(nextAppointment.status).color}`}
                    >
                      {getStatusConfig(nextAppointment.status).label}
                    </span>
                  </div>
                </div>

                {nextAppointment.notes && (
                  <div className="pb-7 border-b border-[#E5E5EA]">
                    <p className="text-[#3A3A3C] text-[15px] leading-relaxed font-medium">
                      {nextAppointment.notes}
                    </p>
                  </div>
                )}

                {!isConfirmed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-7 pt-7 border-t border-[#E5E5EA]"
                  >
                    <p className="text-[#1C1C1E] text-[16px] font-semibold mb-4">
                      {getConfirmationQuestion(nextAppointment.start_time)}
                    </p>
                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onConfirmAppointment(nextAppointment.id)}
                        disabled={appointmentSubmittingId === nextAppointment.id}
                        className="flex-1 h-12 px-5 rounded-full bg-gradient-to-r from-[#0C9B72] to-[#0A7D5C] text-white text-[15px] font-semibold tracking-tight active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center"
                      >
                        {appointmentSubmittingId === nextAppointment.id ? (
                          <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                        ) : (
                          'Confirmar'
                        )}
                      </motion.button>
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => onRescheduleAppointment(nextAppointment)}
                        disabled={appointmentSubmittingId === nextAppointment.id}
                        className="flex-1 h-12 px-5 rounded-full border-2 border-[#0C9B72]/30 text-[#1C1C1E] text-[15px] font-semibold tracking-tight active:scale-95 transition-all hover:border-[#0C9B72]/60 hover:bg-[#0C9B72]/5"
                      >
                        Reagendar
                      </motion.button>
                    </div>
                    {confirmedAppointmentId === nextAppointment.id && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[#34C759] text-[14px] font-semibold mt-4 flex items-center gap-2"
                      >
                        ✓ Horário confirmado
                      </motion.p>
                    )}
                    {rescheduleRequestedAppointmentId === nextAppointment.id && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-[#007AFF] text-[14px] font-semibold mt-4"
                      >
                        Pedido de reagendamento enviado
                      </motion.p>
                    )}
                  </motion.div>
                )}

                {isConfirmed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-7 pt-7 border-t border-[#E5E5EA] text-center"
                  >
                    <div className="w-12 h-12 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Heart size={24} className="text-[#34C759]" />
                    </div>
                    <p className="text-[#34C759] text-[16px] font-semibold">
                      Consulta confirmada com sucesso!
                    </p>
                    <p className="text-[#8E8E93] text-[14px] mt-2">
                      Te esperamos no dia marcado
                    </p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          );
        })()}

        {/* ─── ATO 4: Sem Consulta ─── */}
        {moment === 'no_appointment' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white to-[#F9FAFB] backdrop-blur-xl border border-white/80"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#0C9B72]/[0.08] rounded-full blur-3xl opacity-60" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#0C9B72]/[0.04] rounded-full blur-3xl" />

            <div className="relative z-10 p-8 sm:p-10 text-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="w-16 h-16 bg-[#0C9B72]/10 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Heart size={28} className="text-[#0C9B72]" />
              </motion.div>

              <h2 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mb-8">
                Tudo certo com seu sorriso?
              </h2>

              <div className="space-y-3">
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGuidedConversation(true)}
                  className="w-full h-12 px-5 rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF1744] text-white text-[15px] font-semibold tracking-tight active:scale-95 transition-all"
                >
                  Preciso de Ajuda
                </motion.button>

                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowGuidedConversation(true)}
                  className="w-full h-12 px-5 rounded-full border-2 border-[#0C9B72]/30 text-[#0C9B72] text-[15px] font-semibold tracking-tight active:scale-95 transition-all hover:border-[#0C9B72]/60 hover:bg-[#0C9B72]/5"
                >
                  Quero Agendar
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}



        {/* ─── ATO 6: Pós-Operatório (Ação Ativa) ─── */}
        {moment === 'post_operative' && recentProcedures.length > 0 && (() => {
          const proc = recentProcedures[0];
          const procDate = new Date(proc.date);
          const daysSinceProc = Math.floor(
            (new Date().getTime() - procDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          return (
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(255, 149, 0, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowPostOpCheckIn(true)}
              className="w-full text-left relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF9500]/15 to-[#FF6347]/5 border-2 border-[#FF9500]/30 p-6 transition-all group"
            >
              {/* Animated background elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-[#FF9500]/20 rounded-full blur-3xl group-hover:blur-2xl group-hover:opacity-100 opacity-60 transition-all duration-500" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#FF6347]/10 rounded-full blur-3xl" />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="text-[28px] mt-0.5 flex-shrink-0">🏥</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#FF9500] text-[12px] font-bold uppercase tracking-wider">
                        ⏱ Pós-Operatório ({daysSinceProc}d)
                      </p>
                      <h3 className="text-[#1C1C1E] text-[18px] font-bold tracking-tight mt-1">
                        Como você está?
                      </h3>
                      <p className="text-[#8E8E93] text-[13px] mt-2">
                        Após {proc.procedure}
                      </p>
                    </div>
                  </div>
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#FF9500]/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Activity size={20} className="text-[#FF9500] group-hover:animate-pulse" />
                  </div>
                </div>
                
                <div className="pt-4 border-t border-[#FF9500]/20">
                  <p className="text-[#FF9500] text-[13px] font-semibold flex items-center gap-2">
                    Responda nosso check-in rápido
                    <span className="text-[12px]">→</span>
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })()}

        {/* ─── Divider ─── */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#E5E5EA] to-transparent" />

        {/* ─── ATO 6: Ver Mais (Profundidade) ─── */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onOpenDepth}
          className="w-full flex items-center justify-center gap-2 py-4 text-[#0C9B72] text-[15px] font-semibold hover:opacity-70 transition-opacity"
        >
          Ver seu histórico completo
          <ChevronDown size={16} className="rotate-90" />
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
