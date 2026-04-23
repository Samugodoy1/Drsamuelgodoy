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
      <div className="flex min-h-[calc(100vh-110px)] w-full flex-col">
        <div className="px-1 pt-1 pb-4">
          <div>
            <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.02em] text-[#0A0F1A] sm:text-[40px]">Olá, {firstName} 👋</h1>
            <p className="mt-2 text-[20px] leading-[1.25] text-[#5D6575] sm:text-[24px]">
              {moment === 'emergency' ? 'Conte com a gente.' : moment === 'post_operative' ? 'Sua recuperação é importante para nós.' : 'Estamos aqui para cuidar de você.'}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col items-center rounded-[24px] border border-[#E5E5EA] bg-[#F4F4F6] px-5 pt-8 text-center sm:px-8 sm:pt-12">
          <div className={`flex h-[88px] w-[88px] items-center justify-center rounded-full sm:h-[112px] sm:w-[112px] ${content.iconWrap}`}>
            {content.icon}
          </div>

          <p className={`mt-6 text-[26px] font-semibold sm:mt-8 sm:text-[30px] ${content.accent}`}>{content.kicker}</p>
          <h2 className="mt-4 whitespace-pre-line text-[44px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#090F1D] sm:mt-5 sm:text-[56px]">
            {content.title}
          </h2>
          <p className="mt-5 text-[30px] leading-[1.26] text-[#5D6575] whitespace-pre-line sm:mt-7 sm:text-[38px]">{content.subtitle}</p>
          {content.tertiary && <p className="mt-4 text-[24px] text-[#5D6575] sm:mt-5 sm:text-[28px]">🦷 {content.tertiary}</p>}

          <button
            onClick={content.onPrimaryClick}
            className={`mt-10 flex h-[64px] w-full items-center justify-center gap-2 rounded-full px-4 text-[26px] font-semibold transition active:scale-[0.99] sm:mt-14 sm:h-[76px] sm:text-[34px] ${content.primaryClass}`}
          >
            {content.primaryIcon}
            {content.primaryLabel}
          </button>

          {nextAppointment && moment !== 'post_operative' && moment !== 'emergency' && (
            <>
              <div className="my-8 flex w-full items-center gap-4 text-[#6F7685]">
                <div className="h-px flex-1 bg-[#D9DCE3]" />
                <span className="text-[24px] sm:text-[28px]">ou</span>
                <div className="h-px flex-1 bg-[#D9DCE3]" />
              </div>

              <div className="grid w-full grid-cols-2 gap-3">
                <button
                  onClick={() => onRescheduleAppointment(nextAppointment)}
                  className="h-[60px] rounded-full bg-[#ECEDEF] text-[22px] font-medium text-[#1D2433] sm:h-[68px] sm:text-[26px]"
                >
                  Reagendar
                </button>
                <button
                  onClick={() => window.open('https://maps.google.com', '_blank')}
                  className="h-[60px] rounded-full bg-[#ECEDEF] text-[22px] font-medium text-[#1D2433] sm:h-[68px] sm:text-[26px]"
                >
                  Como chegar
                </button>
              </div>
            </>
          )}

          {content.secondaryLabel && <p className="mt-6 text-[24px] text-[#5D6575] sm:text-[30px]">{content.secondaryLabel}</p>}

          <button onClick={onOpenDepth} className="mt-8 text-[22px] text-[#6B7280] sm:text-[26px]">Ver histórico completo</button>

          <div className="mt-auto pb-8 pt-8 flex items-center gap-2 text-[20px] text-[#6B7280] sm:text-[24px]">
            <Lock size={20} />
            Seus dados estão protegidos
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 border-t border-[#E5E5EA] bg-[#F9F9FB] px-3 py-4 rounded-t-2xl">
          <button className="flex flex-col items-center gap-2 text-[#08A055]">
            <Home size={24} />
            <span className="text-[18px] sm:text-[20px]">Início</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#6B7280]" onClick={() => setShowGuidedConversation(true)}>
            <MessageCircle size={24} />
            <span className="text-[18px] sm:text-[20px]">Mensagens</span>
          </button>
          <button className="flex flex-col items-center gap-2 text-[#6B7280]" onClick={onOpenDepth}>
            <User size={24} />
            <span className="text-[18px] sm:text-[20px]">Perfil</span>
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
