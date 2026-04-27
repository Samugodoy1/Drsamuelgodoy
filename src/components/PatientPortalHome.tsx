import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Calendar, CheckCircle2, Heart, Lock, MessageCircle, Phone, User, Home, AlertCircle } from '../icons';
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
  appointmentRequests,
  activeTab,
  onChangeTab,
}: PatientPortalHomeProps) {
  const momentState = usePatientMoment({
    futureAppointments,
    recentProcedures,
    pendingComplaints: []
  });
  const { moment, urgency, context } = momentState;

  const [showGuidedConversation, setShowGuidedConversation] = useState(false);
  const [showPostOpCheckIn, setShowPostOpCheckIn] = useState(false);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  const handleScheduleRequest = async (payload: { complaint: string; desiredPeriod: string; observation?: string; isUrgent?: boolean }) => {
    setIsSubmittingSchedule(true);
    try {
      const res = await fetch('/api/portal/request-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          preferred_date: new Date().toLocaleDateString('en-CA'),
          desired_period: payload.desiredPeriod,
          reason_category: payload.complaint,
          is_urgent: payload.isUrgent ?? false,
          notes: payload.observation || null
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
  const latestRequest = appointmentRequests?.[0];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const weekdayCap = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    const fullDate = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${weekdayCap}\n${fullDate} às ${time}`;
  };

  const getScreenContent = () => {
    if (moment === 'emergency') {
      return {
        accent: 'text-[#FF3B30]',
        iconWrap: 'bg-[#FFE8E6]',
        icon: <AlertCircle size={42} className="text-[#FF3B30]" />,
        kicker: 'Atenção',
        title: 'Parece que algo\nnão está bem.',
        subtitle: 'Nossa equipe precisa conversar\ncom você o quanto antes.',
        primaryLabel: 'Falar com a clínica agora',
        primaryClass: 'bg-[#FF3B30] text-white',
        primaryIcon: <Phone size={24} className="text-white" />,
        secondaryLabel: 'Atendimento imediato',
        onPrimaryClick: () => setShowGuidedConversation(true),
      };
    }

    if (moment === 'post_operative' && recentProcedures.length > 0) {
      return {
        accent: 'text-[#FF8A00]',
        iconWrap: 'bg-[#F8ECD9]',
        icon: <Heart size={42} className="text-[#FF8A00]" />,
        kicker: 'Pós-operatório',
        title: 'Como você\nestá hoje?',
        subtitle: 'Leva menos de 10 segundos\ne ajuda muito no seu cuidado.',
        primaryLabel: 'Responder agora',
        primaryClass: 'bg-[#FF9500] text-white',
        primaryIcon: <Heart size={24} className="text-white" />,
        secondaryLabel: '',
        onPrimaryClick: () => setShowPostOpCheckIn(true),
      };
    }

    if (nextAppointment) {
      return {
        accent: 'text-[#0B9B59]',
        iconWrap: 'bg-[#E6F3EC]',
        icon: <Calendar size={42} className="text-[#0B9B59]" />,
        kicker: 'Sua consulta está próxima',
        title: formatDate(nextAppointment.start_time),
        subtitle: `com Dr. ${nextAppointment.dentist_name}`,
        tertiary: nextAppointment.notes || 'Restauração dente 22',
        primaryLabel: appointmentSubmittingId === nextAppointment.id ? 'Confirmando...' : 'Confirmar presença',
        primaryClass: 'bg-[#08A055] text-white',
        primaryIcon: <CheckCircle2 size={24} className="text-white" />,
        secondaryLabel: '',
        onPrimaryClick: () => onConfirmAppointment(nextAppointment.id),
      };
    }

    return {
      accent: 'text-[#0B9B59]',
      iconWrap: 'bg-[#E6F3EC]',
      icon: <Calendar size={42} className="text-[#0B9B59]" />,
      kicker: 'Cuidado contínuo',
      title: 'Vamos agendar\nsua próxima visita?',
      subtitle: 'Conte com a gente.',
      primaryLabel: 'Agendar agora',
      primaryClass: 'bg-[#08A055] text-white',
      primaryIcon: <Calendar size={24} className="text-white" />,
      secondaryLabel: '',
      onPrimaryClick: () => setShowGuidedConversation(true),
    };
  };

  const content = getScreenContent();

  return (
    <>
      <div className="flex min-h-[calc(100vh-132px)] w-full flex-col pb-[116px]">
        <div className="px-1 pb-5 pt-2.5">
          <h1 className="text-[40px] font-semibold leading-[1.03] tracking-[-0.03em] text-[#0A0F1A]">Olá, {firstName} 👋</h1>
          <p className="mt-2 text-[18px] leading-[1.35] text-[#5D6575]">
            {moment === 'emergency' ? 'Conte com a gente.' : moment === 'post_operative' ? 'Sua recuperação é importante para nós.' : 'Estamos aqui para cuidar de você.'}
          </p>
          {latestRequest && (
            <div className="mt-4 rounded-2xl border border-[#DDE2EA] bg-white px-4 py-3 text-left">
              <p className="text-[12px] uppercase tracking-[0.14em] text-[#8A93A4]">Solicitação mais recente</p>
              <p className="mt-1 text-[15px] font-semibold text-[#111827]">Status: {latestRequest.status}</p>
              <p className="text-[13px] text-[#4B5563]">
                {latestRequest.reason_category || 'Motivo não informado'} • {latestRequest.desired_period || 'Primeiro disponível'}
              </p>
            </div>
          )}
        </div>

        <div className="mx-auto flex w-full max-w-xl flex-1 flex-col rounded-[30px] border border-white/75 bg-white/65 px-5 pt-7 text-center shadow-[0_18px_44px_rgba(15,23,42,0.07)] backdrop-blur-xl sm:px-7 sm:pt-8">
          <p className="text-[12px] uppercase tracking-[0.2em] text-[#8A93A4]">Resumo da sua próxima etapa</p>

          <div className={`mx-auto mt-5 flex h-[78px] w-[78px] items-center justify-center rounded-full ${content.iconWrap}`}>
            {content.icon}
          </div>

          <p className={`mt-5 text-[18px] font-semibold tracking-[-0.01em] ${content.accent}`}>{content.kicker}</p>
          <h2 className="mt-2 whitespace-pre-line text-[35px] font-semibold leading-[1.08] tracking-[-0.024em] text-[#090F1D]">
            {content.title}
          </h2>
          <p className="mt-3.5 whitespace-pre-line text-[18px] leading-[1.35] text-[#5D6575]">{content.subtitle}</p>

          {content.tertiary && (
            <div className="mt-5 space-y-2">
              <div className="mx-auto w-fit rounded-full bg-[#F3F5F8] px-4 py-2 text-[16px] text-[#4A5261]">
                🦷 {content.tertiary}
              </div>
            </div>
          )}

          <button
            onClick={content.onPrimaryClick}
            className={`mt-8 flex h-[56px] w-full items-center justify-center gap-2 rounded-full px-4 text-[19px] font-semibold transition active:scale-[0.99] ${content.primaryClass}`}
          >
            {content.primaryIcon}
            {content.primaryLabel}
          </button>

          {nextAppointment && moment !== 'post_operative' && moment !== 'emergency' && (
            <>
              <div className="my-6 flex w-full items-center gap-3 text-[#6F7685]">
                <div className="h-px flex-1 bg-[#D9DCE3]" />
                <span className="text-[14px] uppercase tracking-[0.18em]">ou</span>
                <div className="h-px flex-1 bg-[#D9DCE3]" />
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  onClick={() => onRescheduleAppointment(nextAppointment)}
                  className="h-[48px] rounded-full border border-[#DDE2EA] bg-[#F8FAFC] text-[16px] font-medium text-[#1D2433]"
                >
                  Reagendar
                </button>
                <button
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(clinic?.clinic_name || clinic?.name || 'clínica odontológica')}`, '_blank')}
                  className="h-[48px] rounded-full border border-[#DDE2EA] bg-[#F8FAFC] text-[16px] font-medium text-[#1D2433]"
                >
                  Como chegar
                </button>
              </div>
            </>
          )}

          {content.secondaryLabel && <p className="mt-5 text-[17px] text-[#5D6575]">{content.secondaryLabel}</p>}

          <button onClick={onOpenDepth} className="mt-7 text-[16px] font-medium text-[#6B7280]">Ver histórico completo</button>

          <div className="mt-auto flex items-center gap-2 pb-7 pt-8 text-[14px] text-[#6B7280]">
            <Lock size={16} />
            Seus dados estão protegidos
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-3 z-40 px-4">
        <div className="mx-auto grid w-full max-w-xl grid-cols-3 rounded-[24px] border border-white/70 bg-white/90 px-2 py-2 shadow-[0_18px_45px_rgba(12,18,32,0.18)] backdrop-blur-2xl">
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'inicio' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => onChangeTab('inicio')}>
            <Home size={22} />
            <span className="text-[13px] font-medium">Início</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'consultas' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('consultas'); setShowGuidedConversation(true); }}>
            <MessageCircle size={22} />
            <span className="text-[13px] font-medium">Mensagens</span>
          </button>
          <button className={`flex flex-col items-center gap-1.5 rounded-2xl py-2 ${activeTab === 'evolucao' ? 'text-[#08A055]' : 'text-[#6B7280]'}`} onClick={() => { onChangeTab('evolucao'); onOpenDepth(); }}>
            <User size={22} />
            <span className="text-[13px] font-medium">Perfil</span>
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
