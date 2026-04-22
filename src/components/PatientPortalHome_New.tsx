import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  Stethoscope,
  Heart,
  AlertCircle,
  Activity,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  CheckCircle2,
} from '../icons';
import { usePatientMoment } from '../hooks/usePatientMoment';
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
    phone?: string;
    whatsapp?: string;
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
    pendingComplaints: [],
  });
  const { moment } = momentState;

  const [showGuidedConversation, setShowGuidedConversation] = useState(false);
  const [showPostOpCheckIn, setShowPostOpCheckIn] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(false);
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
      return new Date(d).toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const firstName = patient.name.split(' ')[0];
  const nextAppointment = futureAppointments[0];
  const isConfirmed = nextAppointment?.status === 'CONFIRMED';

  // Get appointment metadata
  const getAppointmentMetadata = (notes: string) => {
    const lines = notes?.split('\n') || [];
    return {
      procedure: lines[0] || 'Consulta',
      duration: lines[1] || '30 min',
      type: lines[2]?.includes('limpeza') ? 'routine' : 'treatment',
    };
  };

  const appointmentMeta = nextAppointment
    ? getAppointmentMetadata(nextAppointment.notes)
    : null;

  // Pre-appointment checklist items
  const CHECKLIST_ITEMS = [
    { icon: '📋', label: 'Documentos', desc: 'CPF, identidade ou comprovante' },
    { icon: '🏥', label: 'Cartão de saúde', desc: 'Se tiver convênio' },
    { icon: '🧴', label: 'Higiene bucal', desc: 'Escove os dentes antes de vir' },
    { icon: '⏰', label: 'Chegue cedo', desc: '10 minutos antes do horário' },
    { icon: '📱', label: 'Seu telefone', desc: 'Em caso de dúvidas' },
  ];

  const daysUntilAppointment = nextAppointment
    ? Math.ceil(
        (new Date(nextAppointment.start_time).getTime() -
          new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <>
      <div className="space-y-6">
        {/* ─── SECTION 1: GREETING ─── */}
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

        {/* ─── CONFIRMED APPOINTMENT: NEW DESIGN ─── */}
        {isConfirmed && nextAppointment && (
          <>
            {/* PRIMARY ACTION: Call Clinic / Message */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-2 gap-3"
            >
              <button
                onClick={() => {
                  if (clinic?.phone) {
                    window.location.href = `tel:${clinic.phone}`;
                  }
                }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0C9B72] to-[#0A7D5C] p-4 text-white transition-all hover:shadow-lg active:scale-95"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                  <Phone size={20} className="shrink-0" />
                  <span className="text-[13px] font-semibold">Ligar</span>
                </div>
              </button>

              <button
                onClick={() => {
                  if (clinic?.whatsapp) {
                    const msg = encodeURIComponent(
                      `Oi! Tenho uma consulta marcada para ${formatDateBR(
                        nextAppointment.start_time
                      )} às ${formatTimeBR(nextAppointment.start_time)}`
                    );
                    window.location.href = `https://wa.me/${clinic.whatsapp}?text=${msg}`;
                  }
                }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#25D366] to-[#128C7E] p-4 text-white transition-all hover:shadow-lg active:scale-95"
              >
                <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10 flex flex-col items-center gap-2 text-center">
                  <MessageCircle size={20} className="shrink-0" />
                  <span className="text-[13px] font-semibold">WhatsApp</span>
                </div>
              </button>
            </motion.div>

            {/* APPOINTMENT DETAILS: Compact, Scannable */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="rounded-2xl bg-[#F9FAFB] border border-[#E5E5EA] p-5 space-y-4"
            >
              {/* Status badge + days until */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-full bg-[#34C759] animate-pulse" />
                  <span className="text-[#34C759] text-[12px] font-bold uppercase">
                    Confirmado
                  </span>
                </div>
                <span
                  className={`text-[12px] font-semibold px-3 py-1.5 rounded-full ${getCountdownColor(
                    daysUntilAppointment
                  )}`}
                >
                  {getCountdownLabel(daysUntilAppointment)}
                </span>
              </div>

              {/* Date, Time, Provider */}
              <div className="space-y-2.5">
                <div>
                  <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-wide">
                    Data e Hora
                  </p>
                  <p className="text-[#1C1C1E] text-[17px] font-bold mt-1">
                    {new Date(nextAppointment.start_time).toLocaleDateString(
                      'pt-BR',
                      {
                        weekday: 'long',
                        day: '2-digit',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      }
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-wide">
                    Profissional
                  </p>
                  <p className="text-[#1C1C1E] text-[15px] font-semibold mt-1">
                    Dr(a). {nextAppointment.dentist_name}
                  </p>
                </div>
              </div>

              {/* Procedure type */}
              {appointmentMeta?.procedure && (
                <div className="pt-3 border-t border-[#E5E5EA]">
                  <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-wide">
                    Tipo
                  </p>
                  <p className="text-[#1C1C1E] text-[15px] font-semibold mt-1">
                    {appointmentMeta.procedure}
                  </p>
                </div>
              )}
            </motion.div>

            {/* PREPARATION SECTION: High Value Content */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="space-y-3"
            >
              <button
                onClick={() => setExpandedChecklist(!expandedChecklist)}
                className="w-full rounded-2xl bg-white border border-[#E5E5EA] p-5 flex items-center justify-between hover:border-[#0C9B72]/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0C9B72]/10 flex items-center justify-center">
                    <CheckCircle2 size={20} className="text-[#0C9B72]" />
                  </div>
                  <div className="text-left">
                    <p className="text-[#1C1C1E] text-[15px] font-semibold">
                      Prepare-se para a visita
                    </p>
                    <p className="text-[#8E8E93] text-[12px] mt-0.5">
                      {expandedChecklist
                        ? 'Mostrar menos'
                        : `${CHECKLIST_ITEMS.length} coisas a fazer`}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  size={20}
                  className={`text-[#8E8E93] transition-transform ${
                    expandedChecklist ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Expandable checklist */}
              <AnimatePresence>
                {expandedChecklist && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-2 overflow-hidden"
                  >
                    {CHECKLIST_ITEMS.map((item, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="flex gap-3 rounded-xl bg-white border border-[#E5E5EA] p-4 hover:border-[#0C9B72]/50 transition-colors"
                      >
                        <span className="text-[18px] shrink-0">{item.icon}</span>
                        <div>
                          <p className="text-[#1C1C1E] text-[14px] font-semibold">
                            {item.label}
                          </p>
                          <p className="text-[#8E8E93] text-[12px] mt-0.5">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* SECONDARY ACTIONS */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="grid grid-cols-3 gap-2"
            >
              <button
                onClick={() => onRescheduleAppointment(nextAppointment)}
                className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
              >
                <Calendar size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
                <p className="text-[#1C1C1E] text-[12px] font-semibold">Reagendar</p>
              </button>

              <button
                onClick={onOpenDepth}
                className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
              >
                <Stethoscope size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
                <p className="text-[#1C1C1E] text-[12px] font-semibold">Traço</p>
              </button>

              <button
                onClick={() => {
                  const startDate = new Date(nextAppointment.start_time);
                  const endDate = new Date(nextAppointment.end_time || startDate.getTime() + 30 * 60000);
                  const title = `Consulta Dentária - Dr(a). ${nextAppointment.dentist_name}`;
                  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                    title
                  )}&dates=${startDate.toISOString().replace(/[-:]/g, '').slice(0, 15)}Z/${endDate
                    .toISOString()
                    .replace(/[-:]/g, '')
                    .slice(0, 15)}Z`;
                  window.open(url, '_blank');
                }}
                className="rounded-xl bg-white border border-[#E5E5EA] p-3 text-center hover:border-[#0C9B72]/50 transition-colors active:scale-95"
              >
                <MapPin size={18} className="text-[#0C9B72] mx-auto mb-1.5" />
                <p className="text-[#1C1C1E] text-[12px] font-semibold">Localização</p>
              </button>
            </motion.div>

            {/* TREATMENT PROGRESS (if applicable) */}
            {recentProcedures.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="rounded-2xl bg-[#F9FAFB] border border-[#E5E5EA] p-5"
              >
                <p className="text-[#0C9B72] text-[11px] font-bold uppercase tracking-wide mb-3">
                  Acompanhamento
                </p>
                <div className="space-y-2">
                  {recentProcedures.slice(0, 2).map((proc, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-[#34C759] flex items-center justify-center shrink-0">
                        <CheckCircle2 size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[#1C1C1E] text-[13px] font-semibold">
                          {proc.procedure}
                        </p>
                        <p className="text-[#8E8E93] text-[11px] mt-0.5">
                          {formatDateBR(proc.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* FALLBACK: Other moments (emergency, no appointment, etc remain unchanged) */}
        {moment === 'emergency' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FF3B30]/5 to-[#FF1744]/5 border-2 border-[#FF3B30]/30 p-8"
          >
            <div className="flex items-start gap-4 mb-4">
              <AlertCircle size={28} className="text-[#FF3B30] animate-pulse shrink-0" />
              <div>
                <h2 className="text-[#1C1C1E] text-[22px] font-bold">
                  Você está com dor aguda
                </h2>
                <p className="text-[#8E8E93] text-[15px] mt-1">
                  Podemos tentar um encaixe imediato
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGuidedConversation(true)}
              className="w-full h-12 px-5 rounded-full bg-gradient-to-r from-[#FF3B30] to-[#FF1744] text-white text-[15px] font-semibold"
            >
              Solicitar Atendimento Urgente
            </button>
          </motion.div>
        )}

        {moment === 'no_appointment' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-center space-y-6"
          >
            <Heart size={40} className="text-[#0C9B72] mx-auto" />
            <h2 className="text-[#1C1C1E] text-[28px] font-bold">
              Tudo certo com seu sorriso?
            </h2>
            <button
              onClick={() => setShowGuidedConversation(true)}
              className="w-full h-12 px-5 rounded-full bg-gradient-to-r from-[#0C9B72] to-[#0A7D5C] text-white text-[15px] font-semibold"
            >
              Quero Agendar
            </button>
          </motion.div>
        )}

        {moment === 'post_operative' && recentProcedures.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            onClick={() => setShowPostOpCheckIn(true)}
            className="w-full rounded-2xl bg-gradient-to-br from-[#FF9500]/15 to-[#FF6347]/5 border-2 border-[#FF9500]/30 p-6 text-left hover:border-[#FF9500]/50 transition-colors"
          >
            <p className="text-[#FF9500] text-[12px] font-bold uppercase">
              Pós-Operatório
            </p>
            <p className="text-[#1C1C1E] text-[18px] font-bold mt-2">
              Como você está?
            </p>
            <p className="text-[#FF9500] text-[14px] font-semibold mt-3 flex items-center gap-2">
              Responda nosso check-in →
            </p>
          </motion.button>
        )}
      </div>

      <GuidedConversation
        isOpen={showGuidedConversation}
        onClose={() => setShowGuidedConversation(false)}
        onScheduleRequest={() => {}}
        isSubmitting={isSubmittingSchedule}
        urgency="medium"
        hasActivePostOperative={false}
        postOperativeDaysElapsed={0}
      />

      <AnimatePresence>
        {showPostOpCheckIn && recentProcedures.length > 0 && (
          <PostOperativeCheckIn
            procedure={recentProcedures[0].procedure}
            daysSinceProc={Math.floor(
              (new Date().getTime() -
                new Date(recentProcedures[0].date).getTime()) /
                (1000 * 60 * 60 * 24)
            )}
            onClose={() => setShowPostOpCheckIn(false)}
            onRequestCallback={() => {}}
            onRequestAppointment={() => setShowGuidedConversation(true)}
            sessionToken={sessionToken}
          />
        )}
      </AnimatePresence>
    </>
  );
}
