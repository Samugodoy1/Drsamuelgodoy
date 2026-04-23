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
}

export function PatientPortalHome({
  patient,
  futureAppointments,
  recentProcedures,
  onOpenDepth,
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
  const { moment, urgency, context } = momentState;

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
      <div className="mx-auto flex min-h-[840px] w-full max-w-[460px] flex-col overflow-hidden rounded-[38px] border border-[#E5E5EA] bg-[#F4F4F6]">
        <div className="px-6 pt-6 text-[34px] font-semibold text-[#0A0A0A] leading-none">9:41</div>

        <div className="px-6 pt-8 pb-4 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[52px] leading-[1.02] font-semibold tracking-[-0.02em] text-[#0A0F1A]">Olá, {firstName} 👋</h1>
            <p className="mt-2 text-[36px] leading-[1.2] text-[#5D6575]">
              {moment === 'emergency' ? 'Conte com a gente.' : moment === 'post_operative' ? 'Sua recuperação é importante para nós.' : 'Estamos aqui para cuidar de você.'}
            </p>
          </div>
          <div className="mt-1 h-[60px] w-[60px] overflow-hidden rounded-full bg-[#D9DDE6]">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt={patient.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#546074]">{firstName[0]}</div>
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center px-8 pt-12 text-center">
          <div className={`flex h-[112px] w-[112px] items-center justify-center rounded-full ${content.iconWrap}`}>
            {content.icon}
          </div>

          <p className={`mt-8 text-[40px] font-semibold ${content.accent}`}>{content.kicker}</p>
          <h2 className="mt-5 whitespace-pre-line text-[72px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#090F1D]">
            {content.title}
          </h2>
          <p className="mt-7 text-[46px] leading-[1.26] text-[#5D6575] whitespace-pre-line">{content.subtitle}</p>
          {content.tertiary && <p className="mt-5 text-[38px] text-[#5D6575]">🦷 {content.tertiary}</p>}

          <button
            onClick={content.onPrimaryClick}
            className={`mt-14 flex h-[84px] w-full items-center justify-center gap-3 rounded-full text-[44px] font-semibold transition active:scale-[0.99] ${content.primaryClass}`}
          >
            {content.primaryIcon}
            {content.primaryLabel}
          </button>

          {nextAppointment && moment !== 'post_operative' && moment !== 'emergency' && (
            <>
              <div className="my-8 flex w-full items-center gap-4 text-[#6F7685]">
                <div className="h-px flex-1 bg-[#D9DCE3]" />
                <span className="text-[34px]">ou</span>
                <div className="h-px flex-1 bg-[#D9DCE3]" />
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  onClick={() => onRescheduleAppointment(nextAppointment)}
                  className="h-[78px] rounded-full bg-[#ECEDEF] text-[36px] font-medium text-[#1D2433]"
                >
                  Reagendar
                </button>
                <button
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="h-[78px] rounded-full bg-[#ECEDEF] text-[36px] font-medium text-[#1D2433]"
                >
                  Como chegar
                </button>
              </div>
            </>
          )}

          {content.secondaryLabel && <p className="mt-6 text-[40px] text-[#5D6575]">{content.secondaryLabel}</p>}

          <button onClick={onOpenDepth} className="mt-8 text-[34px] text-[#6B7280]">Ver histórico completo</button>

          <div className="mt-auto pb-8 pt-8 flex items-center gap-2 text-[34px] text-[#6B7280]">
            <Lock size={20} />
            Seus dados estão protegidos
          </div>
        </div>

        <div className="grid grid-cols-3 border-t border-[#E5E5EA] bg-[#F9F9FB] px-3 py-4">
          <button className="flex flex-col items-center gap-2 text-[#08A055]">
            <Home size={24} />
            <span className="text-[30px]">Início</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#6B7280]" onClick={() => setShowGuidedConversation(true)}>
            <MessageCircle size={24} />
            <span className="text-[30px]">Mensagens</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#6B7280]" onClick={onOpenDepth}>
            <User size={24} />
            <span className="text-[30px]">Perfil</span>
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
