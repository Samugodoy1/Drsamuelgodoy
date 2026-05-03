import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, ClipboardList, Lock, MessageCircle, UserRound, Home, MapPin } from '../icons';
import { usePatientMoment } from '../hooks/usePatientMoment';
import { GuidedConversation } from './GuidedConversation';
import { PostOperativeCheckIn } from './PostOperativeCheckIn';

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
  appointmentRequests: Array<{
    id: number;
    status: string;
    reason_category?: string;
    desired_period?: string;
    created_at: string;
  }>;
  activeTab: 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro';
  onChangeTab: (tab: 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro') => void;
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
  sessionToken,
  activeTab,
  onChangeTab,
}: PatientPortalHomeProps) {
  const momentState = usePatientMoment({ futureAppointments, recentProcedures, pendingComplaints: [] });
  const { urgency, context } = momentState;

  const [showGuidedConversation, setShowGuidedConversation] = useState(false);
  const [showPostOpCheckIn, setShowPostOpCheckIn] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const handleScheduleRequest = async (payload: { complaint: string; desiredPeriod: string; observation?: string; isUrgent?: boolean }) => {
    setIsSubmittingSchedule(true);
    try {
      const res = await fetch('/api/portal/request-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          preferred_date: new Date().toLocaleDateString('en-CA'),
          desired_period: payload.desiredPeriod,
          reason_category: payload.complaint,
          is_urgent: payload.isUrgent ?? false,
          notes: payload.observation || null,
        }),
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
  const hasAppointment = Boolean(nextAppointment);

  const nextVisitText = nextAppointment
    ? `Sua próxima visita é ${new Date(nextAppointment.start_time).toLocaleDateString('pt-BR', { weekday: 'long' })} às ${new Date(nextAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
    : 'Vamos agendar sua próxima visita com nossa equipe.';

  return (
    <>
      <div className="min-h-screen bg-[#ECECEC] px-4 pb-28 pt-4">
        <div className="mx-auto w-full max-w-md rounded-[44px] border-[10px] border-[#0F5A42] bg-[#ECECEC] px-6 pb-8 pt-10 shadow-[0_8px_28px_rgba(0,0,0,0.08)]">
          <div className="mb-12 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#1DBA89] text-xl font-bold text-white">OH</div>
            <p className="text-[18px] font-bold uppercase tracking-[0.12em] text-[#1C5A45]">Portal do Paciente</p>
          </div>

          <h1 className="text-[58px] font-semibold leading-none tracking-tight text-[#172025]">Olá, {firstName}.</h1>
          <p className="mt-4 text-[18px] font-semibold leading-snug text-[#18B987]">{nextVisitText}</p>

          <button
            onClick={() => (hasAppointment ? onConfirmAppointment(nextAppointment!.id) : setShowGuidedConversation(true))}
            className="mt-9 flex h-[76px] w-full items-center justify-center gap-3 rounded-[24px] bg-[#18B987] px-4 text-[24px] font-semibold text-white shadow-[0_8px_14px_rgba(24,185,135,0.28)]"
          >
            <CheckCircle2 size={30} />
            <span>{appointmentSubmittingId === nextAppointment?.id ? 'Confirmando...' : 'Confirmar minha ida'}</span>
          </button>

          <div className="mt-6 space-y-4">
            <button onClick={onOpenDepth} className="flex h-[84px] w-full items-center gap-4 rounded-[20px] border border-[#D7D7D7] bg-[#F7F7F7] px-6 text-left shadow-sm">
              <ClipboardList size={30} className="text-[#1F2A2A]" />
              <span className="text-[20px] font-semibold text-[#172025]">Orientações da cirurgia</span>
            </button>
            <button onClick={() => onChangeTab('evolucao')} className="flex h-[84px] w-full items-center gap-4 rounded-[20px] border border-[#D7D7D7] bg-[#F7F7F7] px-6 text-left shadow-sm">
              <UserRound size={30} className="text-[#1F2A2A]" />
              <span className="text-[20px] font-semibold text-[#172025]">Atualizar ficha médica</span>
            </button>
            <button onClick={() => setShowGuidedConversation(true)} className="flex h-[84px] w-full items-center gap-4 rounded-[20px] border border-[#D7D7D7] bg-[#F7F7F7] px-6 text-left shadow-sm">
              <MessageCircle size={30} className="text-[#1F2A2A]" />
              <span className="text-[20px] font-semibold text-[#172025]">Dúvidas pós-atendimento</span>
            </button>
          </div>

          <div className="mt-14 rounded-[24px] border border-[#D7C8FC] bg-[#E9E3F7] px-6 py-6">
            <p className="text-[16px] font-bold uppercase tracking-wide text-[#7D59E6]">Dica de hoje</p>
            <p className="mt-3 text-[20px] leading-snug text-[#545B65]">Beba bastante água após o procedimento de amanhã.</p>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-[#5F676F]"><Lock size={14} /> Seus dados estão protegidos</div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-40 px-4">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 rounded-[24px] border border-white/70 bg-white/90 px-2 py-2 shadow-[0_18px_45px_rgba(12,18,32,0.18)] backdrop-blur-2xl">
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'inicio' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => onChangeTab('inicio')}>
            <Home size={22} />
            <span className="text-[13px] font-medium">Início</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'consultas' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('consultas'); setShowGuidedConversation(true); }}>
            <MessageCircle size={22} />
            <span className="text-[13px] font-medium">Mensagens</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'evolucao' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('evolucao'); onRescheduleAppointment(nextAppointment || { id: 0 }); }}>
            <MapPin size={22} />
            <span className="text-[13px] font-medium">Ações</span>
          </button>
        </div>
      </div>

      <GuidedConversation
        isOpen={showGuidedConversation}
        onClose={() => setShowGuidedConversation(false)}
        onScheduleRequest={handleScheduleRequest}
        isSubmitting={isSubmittingSchedule}
        urgency={urgency}
        hasActivePostOperative={context.hasActivePostOperative}
        postOperativeDaysElapsed={context.postOperativeDaysElapsed}
      />

      <AnimatePresence>
        {showPostOpCheckIn && recentProcedures.length > 0 && (
          <PostOperativeCheckIn
            procedure={recentProcedures[0].procedure}
            daysSinceProc={Math.floor((new Date().getTime() - new Date(recentProcedures[0].date).getTime()) / (1000 * 60 * 60 * 24))}
            onClose={() => setShowPostOpCheckIn(false)}
            onRequestCallback={handleScheduleRequest}
            onRequestAppointment={() => {
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
