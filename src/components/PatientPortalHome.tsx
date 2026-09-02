import React, { useState } from 'react';
import { API_URL } from '../config';
import { AnimatePresence } from 'framer-motion';
import { Lock, MessageCircle, Home, MapPin } from '../icons';
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
      const res = await fetch(`${API_URL}/api/portal/request-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
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
      <div className="min-h-screen bg-[#f5f5f7] px-5 pb-28 pt-10">
        <div className="mx-auto w-full max-w-md">
          <p className="mb-8 text-[13px] text-[#86868b]">Portal do Paciente</p>

          <h1 className="apple-display-ink text-[44px]">Olá, {firstName}.</h1>
          <p className="mt-4 apple-subhead text-[17px]">{nextVisitText}</p>

          <button
            onClick={() => (hasAppointment ? onConfirmAppointment(nextAppointment!.id) : setShowGuidedConversation(true))}
            className="mt-10 w-full apple-btn"
          >
            <span>{appointmentSubmittingId === nextAppointment?.id ? 'Confirmando' : 'Confirmar minha ida'}</span>
          </button>

          <div className="mt-8 space-y-3">
            <button onClick={onOpenDepth} className="flex h-[56px] w-full items-center justify-between rounded-[16px] bg-white px-5 text-left">
              <span className="text-[17px] text-[#1d1d1f]">Orientações da cirurgia</span>
              <span className="text-[#2997ff]">›</span>
            </button>
            <button onClick={() => onChangeTab('evolucao')} className="flex h-[56px] w-full items-center justify-between rounded-[16px] bg-white px-5 text-left">
              <span className="text-[17px] text-[#1d1d1f]">Atualizar ficha médica</span>
              <span className="text-[#2997ff]">›</span>
            </button>
            <button onClick={() => setShowGuidedConversation(true)} className="flex h-[56px] w-full items-center justify-between rounded-[16px] bg-white px-5 text-left">
              <span className="text-[17px] text-[#1d1d1f]">Dúvidas pós-atendimento</span>
              <span className="text-[#2997ff]">›</span>
            </button>
          </div>

          <p className="mt-10 text-[17px] text-[#86868b] leading-snug">Beba bastante água após o procedimento.</p>
          <div className="mt-8 flex items-center gap-2 text-[13px] text-[#86868b]"><Lock size={14} strokeWidth={1.5} /> Dados protegidos</div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-40 px-4">
        <div className="mx-auto grid w-full max-w-md grid-cols-3 ios-glass px-2 py-1 min-h-[44px]">
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'inicio' ? 'text-[#1d1d1f]' : 'text-[#6B7280]'}`} onClick={() => onChangeTab('inicio')}>
            <Home size={22} />
            <span className="text-[13px] font-medium">Início</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'consultas' ? 'text-[#1d1d1f]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('consultas'); setShowGuidedConversation(true); }}>
            <MessageCircle size={22} />
            <span className="text-[13px] font-medium">Mensagens</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'evolucao' ? 'text-[#1d1d1f]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('evolucao'); onRescheduleAppointment(nextAppointment || { id: 0 }); }}>
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
