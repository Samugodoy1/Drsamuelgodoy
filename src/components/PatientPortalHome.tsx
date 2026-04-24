import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from '../icons';
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
  activeTab: 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro';
  onChangeTab: (tab: 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro') => void;
}

export function PatientPortalHome({
  patient,
  clinic,
  futureAppointments,
  recentProcedures,
  onConfirmAppointment,
  onRescheduleAppointment,
  appointmentSubmittingId,
  sessionToken,
}: PatientPortalHomeProps) {
  const momentState = usePatientMoment({
    futureAppointments,
    recentProcedures,
    pendingComplaints: []
  });
  const { urgency, context } = momentState;

  const [showGuidedConversation, setShowGuidedConversation] = useState(false);
  const [showPostOpCheckIn, setShowPostOpCheckIn] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const fullDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${weekdayCap}, ${fullDate} · ${time}`;
  };

  return (
    <>
      <div className="flex min-h-[calc(100vh-132px)] w-full items-center justify-center px-4 pb-24">
        <div className="w-full max-w-xl text-center">
          <h1 className="text-[36px] font-semibold tracking-[-0.03em] text-[#0A0F1A]">Olá, {firstName}</h1>

          <p className="mt-10 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#111827]">
            {nextAppointment ? `Nos vemos ${formatDate(nextAppointment.start_time)}` : 'Vamos marcar sua próxima consulta?'}
          </p>
          <p className="mt-3 text-[18px] leading-[1.35] text-[#5D6575]">
            {nextAppointment ? 'Podemos contar com você?' : 'Estamos aqui para cuidar de você.'}
          </p>

          <button
            onClick={nextAppointment ? () => onConfirmAppointment(nextAppointment.id) : () => setShowGuidedConversation(true)}
            className="mt-10 flex h-[56px] w-full items-center justify-center gap-2 rounded-full bg-[#08A055] px-4 text-[19px] font-semibold text-white transition active:scale-[0.99]"
          >
            <CheckCircle2 size={22} className="text-white" />
            {nextAppointment && appointmentSubmittingId === nextAppointment.id ? 'Confirmando...' : nextAppointment ? 'Confirmar presença' : 'Agendar consulta'}
          </button>

          {nextAppointment && (
            <div className="mt-6 text-[15px] text-[#6B7280]">
              <button onClick={() => onRescheduleAppointment(nextAppointment)} className="transition hover:text-[#374151]">
                Reagendar
              </button>
              <span className="px-2">·</span>
              <button onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic?.clinic_name || clinic?.name || 'clínica odontológica')}`, '_blank')} className="transition hover:text-[#374151]">
                Como chegar
              </button>
            </div>
          )}
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
            daysSinceProc={Math.floor(
              (new Date().getTime() - new Date(recentProcedures[0].date).getTime()) /
              (1000 * 60 * 60 * 24)
            )}
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
