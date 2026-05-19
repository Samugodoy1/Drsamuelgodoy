import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Calendar, CalendarPlus, CheckCircle2, ChevronRight, ClipboardList, Clock, Plus, Sparkles, Users } from '../icons';
import { formatAppointmentTime, getAppointmentTime, parseAppointmentDateTime } from '../utils/dateUtils';
import { buildParaFecharRows, deriveAcademyPatientState } from '../utils/deriveAcademyPatientState';

interface AcademyDashboardProps {
  user?: any;
  patients: any[];
  appointments: any[];
  openPatientRecord: (id: number) => void;
  openPatientEvolution?: (patientId: number, appointment: any) => void;
  setActiveTab: (tab: any) => void;
  setIsPatientModalOpen: (open: boolean) => void;
  openAppointmentModal: () => void;
}

const ACTIVE_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const parseDate = (value?: string) => {
  if (!value) return null;
  return parseAppointmentDateTime(value);
};

const firstName = (name?: string) => (name || 'paciente').trim().split(' ')[0] || 'paciente';

const getGreetingName = (user?: any) => {
  const name = user?.name || '';
  return name.replace(/^(Dr\.|Dra\.|Dr|Dra)\s+/i, '').split(' ')[0];
};

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
};

const getGreetingEmoji = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return '☀️';
  if (hour >= 12 && hour < 18) return '👋';
  return '🌙';
};

const formatTime = (value?: string) => {
  const time = formatAppointmentTime(value);
  return time === '--:--' ? null : time;
};

const formatDayLabel = (value?: string) => {
  const parsed = parseDate(value);
  if (!parsed) return null;

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (sameDay(parsed, today)) return 'Hoje';
  if (sameDay(parsed, tomorrow)) return 'Amanhã';
  return parsed.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
};

const formatDayTime = (value?: string) => {
  const day = formatDayLabel(value);
  const time = formatTime(value);
  if (!day && !time) return null;
  if (!time) return day;
  return `${day}, ${time}`;
};

const formatAppointmentChipTime = (value?: string) => {
  const day = formatDayLabel(value);
  const time = formatTime(value);
  return [day, time].filter(Boolean).join(' · ');
};

const formatAgendaListDateTime = (value?: string) => {
  const parsed = parseDate(value);
  const time = formatTime(value);
  if (!parsed || !time) return { date: '', time: time || '' };

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (sameDay(parsed, today)) return { date: 'Hoje', time };
  if (sameDay(parsed, tomorrow)) return { date: 'Amanhã', time };

  const dateLabel = parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return { date: dateLabel, time };
};

const getStatusLabel = (status?: string) => {
  const labels: Record<string, string> = {
    SCHEDULED: 'Agendado',
    CONFIRMED: 'Agendado',
    FINISHED: 'Concluído',
    CANCELLED: 'Cancelado',
    NO_SHOW: 'Faltou',
    IN_PROGRESS: 'Em atendimento'
  };
  return labels[status || ''] || null;
};

const getPatient = (patients: any[], patientId: number) => patients.find(patient => patient.id === patientId);

const getLastEvolution = (patient?: any) => {
  const evolutions = patient?.evolution || patient?.clinicalEvolution || [];
  if (!Array.isArray(evolutions) || evolutions.length === 0) return null;

  return [...evolutions]
    .filter(item => item?.date || item?.created_at)
    .sort((a, b) => new Date(b.date || b.created_at).getTime() - new Date(a.date || a.created_at).getTime())[0] || null;
};

const getEvolutionSummary = (patient?: any) => {
  const evolution = getLastEvolution(patient);
  if (!evolution) return null;

  const text = [
    evolution.procedure,
    evolution.procedure_performed,
    evolution.notes
  ].find(Boolean);

  if (!text) return null;
  return String(text).trim();
};

const hasEvolutionAfterAppointment = (patient: any, appointment: any) => {
  const start = parseDate(appointment?.start_time);
  if (!start) return false;

  const lastEvolutionDate = parseDate(patient?.last_evolution_date);
  if (lastEvolutionDate && lastEvolutionDate >= start) return true;

  const evolutions = patient?.evolution || patient?.clinicalEvolution || [];
  if (!Array.isArray(evolutions)) return false;

  return evolutions.some(item => {
    const date = parseDate(item?.date || item?.created_at);
    return date ? date >= start : false;
  });
};

const getProcedureHint = (appointment?: any, patient?: any) => {
  const treatment = patient?.treatmentPlan?.find((item: any) =>
    item?.status === 'PLANEJADO' || item?.status === 'APROVADO'
  );

  return appointment?.notes || appointment?.procedure || treatment?.procedure || null;
};

const ANAMNESIS_FIELDS = [
  'medical_history',
  'allergies',
  'medications',
  'systemic_diseases',
  'clinical_notes',
  'chief_complaint',
  'habits',
  'family_history',
  'vital_signs'
];

const hasFilledAnamnesis = (anamnesis?: any) => {
  if (!anamnesis) return false;

  return ANAMNESIS_FIELDS.some((field) => {
    const value = anamnesis[field];
    return typeof value === 'string' ? value.trim().length > 0 : Boolean(value);
  });
};

const hasObjectData = (value: any) => {
  if (!value) return false;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed === '{}') return false;
    try {
      return hasObjectData(JSON.parse(trimmed));
    } catch {
      return trimmed.length > 0;
    }
  }
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
};

const hasOdontogramData = (patient?: any) => {
  if (!patient) return false;
  if (hasObjectData(patient.odontogram) || hasObjectData(patient.odontogram_data)) return true;

  const treatmentPlan = patient.treatmentPlan || patient.treatment_plan || [];
  if (Array.isArray(treatmentPlan) && treatmentPlan.length > 0) return true;

  const procedures = patient.procedures || [];
  if (Array.isArray(procedures) && procedures.length > 0) return true;

  return patient.has_odontogram_record === true;
};

const getPatientAppointments = (appointments: any[], patientId?: number) => {
  if (!patientId) return [];
  return appointments
    .filter(app => app.patient_id === patientId)
    .filter(app => !['CANCELLED', 'NO_SHOW'].includes(String(app.status || '').toUpperCase()));
};

const hasTreatmentActivity = (patient?: any) => {
  if (!patient) return false;
  const treatmentPlan = patient.treatmentPlan || patient.treatment_plan || [];
  if (Array.isArray(treatmentPlan) && treatmentPlan.length > 0) return true;

  const evolutions = patient.evolution || patient.clinicalEvolution || [];
  if (Array.isArray(evolutions) && evolutions.length > 0) return true;

  return Boolean(patient.last_evolution_date || Number(patient.evolution_count || 0) > 0);
};

const getAnamnesisAlert = (
  patient: any,
  appointments: any[],
  now: Date,
  options: { includeFirstVisitGuidance?: boolean } = {}
) => {
  if (hasFilledAnamnesis(patient.anamnesis)) return null;

  const patientAppointments = getPatientAppointments(appointments, patient.id);
  const finishedAppointments = patientAppointments.filter(app => String(app.status || '').toUpperCase() === 'FINISHED');
  if (finishedAppointments.length > 0 || hasTreatmentActivity(patient)) return 'Anamnese pendente.';

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const futureOrTodayAppointments = patientAppointments
    .filter(app => ACTIVE_STATUSES.has(String(app.status || '').toUpperCase()))
    .map(app => ({ appointment: app, parsedStart: parseDate(app.start_time) }))
    .filter((item): item is { appointment: any; parsedStart: Date } =>
      Boolean(item.parsedStart && item.parsedStart >= todayStart)
    )
    .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime());

  if (futureOrTodayAppointments.length > 0) {
    const firstAppointment = futureOrTodayAppointments[0];
    if (options.includeFirstVisitGuidance && sameDay(firstAppointment.parsedStart, now)) {
      return 'Comece pela anamnese.';
    }
    return null;
  }

  return 'Anamnese pendente.';
};

const getOdontogramAlert = (
  patient: any,
  appointments: any[],
  now: Date,
  options: { includeFirstVisitGuidance?: boolean } = {}
) => {
  if (hasOdontogramData(patient)) return null;

  const patientAppointments = getPatientAppointments(appointments, patient.id);
  const finishedAppointments = patientAppointments.filter(app => String(app.status || '').toUpperCase() === 'FINISHED');
  if (finishedAppointments.length > 0 || hasTreatmentActivity(patient)) return 'Odontograma pendente.';

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const futureOrTodayAppointments = patientAppointments
    .filter(app => ACTIVE_STATUSES.has(String(app.status || '').toUpperCase()))
    .map(app => ({ appointment: app, parsedStart: parseDate(app.start_time) }))
    .filter((item): item is { appointment: any; parsedStart: Date } =>
      Boolean(item.parsedStart && item.parsedStart >= todayStart)
    )
    .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime());

  if (futureOrTodayAppointments.length > 0) {
    const firstAppointment = futureOrTodayAppointments[0];
    if (options.includeFirstVisitGuidance && sameDay(firstAppointment.parsedStart, now)) {
      return 'Comece pelo odontograma.';
    }
    return null;
  }

  return 'Odontograma pendente.';
};

const getClinicalAlert = (
  patient?: any,
  appointments: any[] = [],
  now: Date = new Date(),
  options: { includeFirstVisitGuidance?: boolean } = {}
) => {
  if (!patient) return null;
  const anamnesisAlert = getAnamnesisAlert(patient, appointments, now, options);
  if (anamnesisAlert) return anamnesisAlert;
  const odontogramAlert = getOdontogramAlert(patient, appointments, now, options);
  if (odontogramAlert) return odontogramAlert;
  return null;
};

const getFirstVisitAnamnesisMessage = (patient: any, appointments: any[], now: Date) => {
  if (!patient || hasFilledAnamnesis(patient.anamnesis) || hasTreatmentActivity(patient)) return null;

  const patientAppointments = getPatientAppointments(appointments, patient.id);
  const hasFinishedAppointment = patientAppointments.some(app => String(app.status || '').toUpperCase() === 'FINISHED');
  if (hasFinishedAppointment) return null;

  const nextFirstAppointment = patientAppointments
    .filter(app => ACTIVE_STATUSES.has(String(app.status || '').toUpperCase()))
    .map(app => ({ appointment: app, parsedStart: parseDate(app.start_time) }))
    .filter((item): item is { appointment: any; parsedStart: Date } => Boolean(item.parsedStart))
    .sort((a, b) => a.parsedStart.getTime() - b.parsedStart.getTime())[0];

  if (!nextFirstAppointment) return null;
  return sameDay(nextFirstAppointment.parsedStart, now)
    ? 'Primeira consulta: comece pela anamnese.'
    : 'Primeira consulta: revise a anamnese antes do box.';
};

const getClinicalPending = (patients: any[], appointments: any[], now: Date) => {
  return patients.find(patient => Boolean(getClinicalAlert(patient, appointments, now))) || null;
};

const pickContextMessage = (messages: string[], seed: string) => {
  if (messages.length === 0) return '';
  const value = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return messages[value % messages.length];
};

const getShortClinicalMoment = (focus: any) => {
  const text = String(getProcedureHint(focus.appointment, focus.patient) || '').trim();
  if (!text) return null;

  const lower = text.toLowerCase();
  if (lower.includes('restaura')) return 'restaurar';
  if (lower.includes('endo') || lower.includes('canal')) return 'endodontia';
  if (lower.includes('extra') || lower.includes('cirurg')) return 'cirurgia';
  if (lower.includes('limpeza') || lower.includes('profil')) return 'profilaxia';
  if (lower.includes('clare')) return 'clareamento';
  if (lower.includes('avali') || lower.includes('consulta')) return 'avaliar';

  return text.length > 34 ? `${text.slice(0, 31).trim()}...` : text;
};

const getClinicalActionCopy = (moment: string) => {
  if (moment === 'restaurar') return 'Confira isolamento e material.';
  if (moment === 'endodontia') return 'Confira radiografia e conduta.';
  if (moment === 'cirurgia') return 'Confira anamnese e medicação.';
  if (moment === 'profilaxia') return 'Confira periodonto e orientação.';
  if (moment === 'clareamento') return 'Confira protocolo e sensibilidade.';
  if (moment === 'avaliar') return 'Comece pela queixa principal.';
  return 'Revise a conduta.';
};

const formatDashboardStartLabel = (value?: string, now: Date = new Date()) => {
  const parsed = parseDate(value);
  if (!parsed) return null;

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  if (sameDay(parsed, now)) return 'Hoje';
  if (sameDay(parsed, tomorrow)) return 'Amanhã';

  const label = parsed.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  return label.charAt(0).toUpperCase() + label.slice(1);
};

const getClinicalAlertCopy = (patient: any, appointment: any, appointments: any[], now: Date) => {
  const firstVisitMessage = getFirstVisitAnamnesisMessage(patient, appointments, now);
  if (firstVisitMessage) return firstVisitMessage;

  const alert = getClinicalAlert(patient, appointments, now, { includeFirstVisitGuidance: true });
  if (alert?.toLowerCase().includes('anamnese')) return 'Anamnese pendente: revise antes do box.';
  if (alert?.toLowerCase().includes('odontograma')) return 'Odontograma pendente: complete antes do box.';

  const clinicalMoment = getShortClinicalMoment({ appointment, patient });
  if (clinicalMoment) return getClinicalActionCopy(clinicalMoment);

  return 'Confira plano e última evolução.';
};

const getAppointmentActionCopy = (patient: any, appointment: any, appointments: any[], now: Date) => {
  const alert = getClinicalAlert(patient, appointments, now, { includeFirstVisitGuidance: true });
  if (alert?.toLowerCase().includes('anamnese')) return 'Revisar anamnese';
  if (alert?.toLowerCase().includes('odontograma')) return 'Revisar odontograma';

  const clinicalMoment = getShortClinicalMoment({ appointment, patient });
  if (clinicalMoment === 'restaurar') return 'Separar material';
  if (clinicalMoment === 'endodontia') return 'Revisar radiografia';
  if (clinicalMoment === 'cirurgia') return 'Revisar anamnese';
  if (clinicalMoment === 'profilaxia') return 'Revisar periodonto';
  if (clinicalMoment === 'clareamento') return 'Conferir protocolo';
  if (clinicalMoment === 'avaliar') return 'Revisar queixa';
  if (getEvolutionSummary(patient)) return 'Revisar última evolução';

  return 'Abrir preparo do caso';
};

const getSmartDashboardMessage = (
  focus: any,
  context: {
    now: Date;
    todayCount: number;
    upcomingCount: number;
    evolutionPendingCount: number;
    hasClinicalPending: boolean;
    appointments: any[];
  }
) => {
  const patientName = firstName(focus.patient?.name || focus.appointment?.patient_name);
  const startLabel = formatDashboardStartLabel(focus.appointment?.start_time, context.now);
  const dayPart = context.now.getHours() < 12 ? 'morning' : context.now.getHours() < 18 ? 'afternoon' : 'night';
  const seed = [
    focus.kind,
    patientName,
    context.now.toDateString(),
    dayPart,
    context.todayCount,
    context.upcomingCount,
    context.evolutionPendingCount,
    context.hasClinicalPending ? 'pending' : 'clear'
  ].join('|');

  if (focus.kind === 'evolution') {
    const count = context.evolutionPendingCount;
    return pickContextMessage([
      count > 1
        ? `${count} atendimentos para fechar.`
        : `Falta registrar a evolução para fechar o atendimento.`,
      `${patientName} já foi atendido. Feche o atendimento.`,
      `Atendimento concluído. Registre a evolução para fechar.`
    ], seed);
  }

  if (focus.kind === 'today') {
    if (context.todayCount > 2) {
      return pickContextMessage([
        `Hoje a clínica pede foco.`,
        `Dia cheio. Comece com ${patientName}.`,
        `Hoje começa com ${patientName}.`
      ], seed);
    }

    return pickContextMessage([
      `Hoje começa com ${patientName}.`,
      `${patientName} abre a clínica hoje.`,
      `Primeiro box: ${patientName}.`
    ], seed);
  }

  if (focus.kind === 'next') {
    return pickContextMessage([
      `${startLabel || 'A clínica'} começa com ${patientName}.`,
      `${patientName} abre o próximo box.`,
      `Próximo atendimento: ${patientName}.`
    ], seed);
  }

  if (focus.kind === 'paused') {
    const name = firstName(focus.patient?.name);
    return pickContextMessage([
      `${name} ficou sem retorno. Revise o plano.`,
      `Caso parado: ${name}. Defina o próximo passo.`,
      `${name} precisa de follow-up. Veja a evolução.`
    ], seed);
  }

  if (focus.kind === 'pending') {
    const name = firstName(focus.patient?.name);
    const alert = getClinicalAlert(focus.patient, context.appointments, context.now) || 'Pendência clínica.';
    return pickContextMessage([
      `${name}: ${alert}`,
      `Antes da clínica: revise ${name}.`,
      `${name} tem ajuste no prontuário.`
    ], seed);
  }

  if (focus.kind === 'start') {
    return pickContextMessage([
      `Cadastre o primeiro paciente.`,
      `Comece pelo primeiro caso.`,
      `Monte sua base clínica.`
    ], seed);
  }

  return pickContextMessage([
    `Sem paciente marcado hoje. Organize retornos.`,
    `Agenda livre. Revise casos antigos.`,
    `Hoje sem box. Atualize prontuários.`
  ], seed);
};

export const AcademyDashboard: React.FC<AcademyDashboardProps> = ({
  user,
  patients,
  appointments,
  openPatientRecord,
  openPatientEvolution,
  setActiveTab,
  setIsPatientModalOpen,
  openAppointmentModal
}) => {
  const now = new Date();

  const usableAppointments = useMemo(() => {
    return appointments
      .filter(app => app.status !== 'CANCELLED')
      .sort((a, b) => getAppointmentTime(a.start_time) - getAppointmentTime(b.start_time));
  }, [appointments]);

  const paraFecharRows = useMemo(() => {
    return buildParaFecharRows(patients, usableAppointments, now);
  }, [patients, usableAppointments]);

  const finishedWithoutEvolution = useMemo(() => {
    return paraFecharRows.map(row => usableAppointments.find(a => a.id === row.appointmentId)).filter(Boolean) as typeof usableAppointments;
  }, [paraFecharRows, usableAppointments]);

  const todayAppointments = useMemo(() => {
    return usableAppointments
      .filter(app => {
        const start = parseDate(app.start_time);
        return !!start && sameDay(start, now);
      })
      .filter(app => ACTIVE_STATUSES.has(app.status))
      .sort((a, b) => getAppointmentTime(a.start_time) - getAppointmentTime(b.start_time));
  }, [usableAppointments]);

  const nextTodayAppointment = useMemo(() => {
    return todayAppointments.find(app => getAppointmentTime(app.start_time) >= now.getTime()) || todayAppointments[0] || null;
  }, [todayAppointments]);

  const nextAppointment = useMemo(() => {
    return usableAppointments.find(app =>
      getAppointmentTime(app.start_time) > now.getTime() &&
      ACTIVE_STATUSES.has(app.status)
    ) || null;
  }, [usableAppointments]);

  const nextAppointments = useMemo(() => {
    return usableAppointments
      .filter(app => getAppointmentTime(app.start_time) > now.getTime() && ACTIVE_STATUSES.has(app.status))
      .slice(0, 4);
  }, [usableAppointments]);

  const pausedCase = useMemo(() => {
    const scheduledIds = new Set(nextAppointments.map(app => app.patient_id));

    return patients
      .filter(patient => !scheduledIds.has(patient.id))
      .map(patient => {
        const lastEvolution = getLastEvolution(patient);
        const reference = parseDate(lastEvolution?.date || lastEvolution?.created_at || patient.last_evolution_date || patient.created_at);
        const days = reference ? (now.getTime() - reference.getTime()) / 86400000 : 0;
        return { patient, days };
      })
      .filter(item => item.days >= 30)
      .sort((a, b) => b.days - a.days)[0]?.patient || null;
  }, [patients, nextAppointments]);

  const clinicalPending = useMemo(() => getClinicalPending(patients, usableAppointments, now), [patients, usableAppointments, now]);

  const focus = (() => {
    const pendingApp = finishedWithoutEvolution[0];
    if (pendingApp) {
      const patient = getPatient(patients, pendingApp.patient_id);
      const pendingRow = paraFecharRows.find(r => r.appointmentId === pendingApp.id);
      const procedureLabel = pendingRow?.procedure || pendingApp.notes || pendingApp.procedure || 'Atendimento';
      const dateLabel = pendingRow?.appointmentLabel || '';
      return {
        kind: 'evolution',
        eyebrow: 'Atendimento concluído',
        title: `${firstName(patient?.name || pendingApp.patient_name)} já foi atendido.`,
        subtitle: dateLabel
          ? `Fechar atendimento de ${procedureLabel} · ${dateLabel}`
          : 'Falta registrar a evolução para fechar o atendimento.',
        actionLabel: `Fechar atendimento${procedureLabel !== 'Atendimento' ? ` de ${procedureLabel}` : ''}`,
        patient,
        appointment: pendingApp,
        pendingProcedure: procedureLabel,
        pendingDateLabel: dateLabel,
        action: () => openPatientEvolution
          ? openPatientEvolution(pendingApp.patient_id, pendingApp)
          : openPatientRecord(pendingApp.patient_id)
      };
    }

    if (nextTodayAppointment) {
      const patient = getPatient(patients, nextTodayAppointment.patient_id);
      return {
        kind: 'today',
        eyebrow: 'A seguir',
        title: getAppointmentActionCopy(patient, nextTodayAppointment, usableAppointments, now),
        subtitle: getClinicalAlertCopy(patient, nextTodayAppointment, usableAppointments, now),
        actionLabel: 'Abrir caso',
        patient,
        appointment: nextTodayAppointment,
        action: () => openPatientRecord(nextTodayAppointment.patient_id)
      };
    }

    if (nextAppointment) {
      const patient = getPatient(patients, nextAppointment.patient_id);
      return {
        kind: 'next',
        eyebrow: 'Próximo',
        title: getAppointmentActionCopy(patient, nextAppointment, usableAppointments, now),
        subtitle: getClinicalAlertCopy(patient, nextAppointment, usableAppointments, now),
        actionLabel: 'Revisar caso',
        patient,
        appointment: nextAppointment,
        action: () => openPatientRecord(nextAppointment.patient_id)
      };
    }

    if (pausedCase) {
      return {
        kind: 'paused',
        eyebrow: 'Retorno',
        title: 'Caso sem próximo passo.',
        subtitle: 'Revise a última evolução e defina o retorno.',
        actionLabel: 'Revisar caso',
        patient: pausedCase,
        appointment: null,
        action: () => openPatientRecord(pausedCase.id)
      };
    }

    if (clinicalPending) {
      return {
        kind: 'pending',
        eyebrow: 'Prontuário',
        title: 'Dado clínico pendente.',
        subtitle: getClinicalAlert(clinicalPending, usableAppointments, now) || 'Complete o prontuário antes do próximo atendimento.',
        actionLabel: 'Abrir prontuário',
        patient: clinicalPending,
        appointment: null,
        action: () => openPatientRecord(clinicalPending.id)
      };
    }

    if (patients.length === 0) {
      return {
        kind: 'start',
        eyebrow: 'Primeiro passo',
        title: 'Cadastre o primeiro paciente.',
        subtitle: 'A rotina começa pelo caso clínico, não pela agenda.',
        actionLabel: 'Cadastrar paciente',
        patient: null,
        appointment: null,
        action: () => setIsPatientModalOpen(true)
      };
    }

    return {
      kind: 'calm',
      eyebrow: 'Sem box hoje',
      title: 'Organize retornos.',
      subtitle: 'Bom momento para revisar evoluções e pendências.',
      actionLabel: 'Ver pacientes',
      patient: null,
      appointment: null,
      action: () => setActiveTab('pacientes')
    };
  })();

  const greetingName = getGreetingName(user);
  const smartMessage = getSmartDashboardMessage(focus, {
    now,
    todayCount: todayAppointments.length,
    upcomingCount: nextAppointments.length,
    evolutionPendingCount: finishedWithoutEvolution.length,
    hasClinicalPending: Boolean(clinicalPending),
    appointments: usableAppointments
  });

  const focusPatientName = focus.patient?.name || focus.appointment?.patient_name || null;
  const focusPhoto = focus.patient?.photo_url || focus.appointment?.photo_url || null;
  const focusInitial = (focusPatientName || '?').charAt(0).toUpperCase();
  const isFinishedFocus = focus.appointment?.status === 'FINISHED';
  const pendingDateLabel = (focus as any).pendingDateLabel || '';
  const statusLabel = isFinishedFocus && focus.kind === 'evolution'
    ? `Evolução pendente${pendingDateLabel ? ` · ${pendingDateLabel}` : ''}`
    : getStatusLabel(focus.appointment?.status);
  const scheduleLabel = formatAppointmentChipTime(focus.appointment?.start_time);
  const appointmentMetaLabel = [
    statusLabel,
    !isFinishedFocus ? scheduleLabel : null
  ].filter(Boolean).join(' · ');
  const procedureHint = getProcedureHint(focus.appointment, focus.patient);
  const lastEvolution = getEvolutionSummary(focus.patient);
  const clinicalAlert = getClinicalAlert(focus.patient, usableAppointments, now, { includeFirstVisitGuidance: true });
  const otherAppointments = nextAppointments
    .filter(app => app.id !== focus.appointment?.id)
    .slice(0, 3);
  const pendingRows = [
    ...paraFecharRows.slice(0, 2).map(row => ({
      id: row.id,
      patientId: row.patientId,
      appointmentId: row.appointmentId,
      title: row.title,
      meta: row.meta,
      tone: 'coral' as const
    })),
    ...(clinicalPending && !paraFecharRows.some(row => row.patientId === clinicalPending.id)
      ? [{
        id: `clinical-${clinicalPending.id}`,
        patientId: clinicalPending.id,
        appointmentId: 0,
        title: clinicalPending.name,
        meta: getClinicalAlert(clinicalPending, usableAppointments, now) || 'Complete o prontuário.',
        tone: 'coral' as const
      }]
      : [])
  ].slice(0, 3);

  const studySuggestion = useMemo(() => {
    if (focus.kind === 'evolution' || focus.kind === 'calm' || focus.kind === 'start') return null;

    const procedure = procedureHint;
    if (!procedure) return null;

    const patientName = focusPatientName ? firstName(focusPatientName) : null;
    const reason = patientName
      ? `Para o caso de ${patientName}.`
      : 'Para o próximo atendimento.';

    return {
      topic: procedure,
      reason,
      duration: '8 min',
    };
  }, [focus.kind, procedureHint, focusPatientName]);

  return (
    <div className="max-w-2xl mx-auto px-5 sm:px-6 space-y-12 pt-8 pb-32">
      <section className="space-y-8">
        <div className="pt-6">
          <p className="text-[16px] font-medium text-academy-muted mb-2">
            {getTimeGreeting()}{greetingName ? `, ${greetingName}` : ''} {getGreetingEmoji()}
          </p>
          <h2 className="text-[34px] sm:text-[38px] font-bold text-academy-text leading-[1.1] tracking-tight mt-1">
            {smartMessage}
          </h2>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.08 }}
          className="flex items-start gap-3 rounded-2xl px-5 py-4 bg-academy-neutral/80 border border-academy-border/70"
        >
          <Sparkles size={16} className="mt-0.5 shrink-0 text-academy-primary" />
          <p className="text-[14px] font-medium text-[#3A3A3C] leading-snug">
            {focus.subtitle}
          </p>
        </motion.div>
      </section>

      <div className="space-y-4">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div
            className="relative overflow-hidden rounded-[32px] bg-academy-primary shadow-[0_24px_80px_rgba(82,5,123,0.22)] flex flex-col"
            style={{ minHeight: 'min(60svh, 520px)' }}
          >
            <div className="absolute inset-x-0 top-0 h-1.5 bg-white/10" />
            <div className="flex-1 px-8 pt-12 pb-6 flex flex-col gap-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <span className="text-white/55 text-[10px] font-bold uppercase tracking-[0.14em]">
                    {focus.eyebrow}
                  </span>
                  <h2 className="text-[34px] sm:text-[40px] font-bold text-white leading-[1.1] tracking-[-0.025em] mt-1.5 break-words">
                    {focusPatientName || focus.title}
                  </h2>
                </div>
                {focusPatientName ? (
                  focusPhoto ? (
                    <img
                      src={focusPhoto}
                      alt={focusPatientName}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-[22px] object-cover border-2 border-white/20 shrink-0 mt-1 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-[22px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-1 font-bold text-[26px] text-white shadow-inner">
                      {focusInitial}
                    </div>
                  )
                ) : (
                  <div className="w-16 h-16 rounded-[22px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-1 text-white shadow-inner">
                    {focus.kind === 'calm' ? <CheckCircle2 size={28} /> : focus.kind === 'start' ? <Plus size={28} /> : <ClipboardList size={28} />}
                  </div>
                )}
              </div>
  
              <div className="flex items-center gap-2.5 flex-wrap">
                {appointmentMetaLabel && (
                  <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-white/15 text-white">
                    {appointmentMetaLabel}
                  </span>
                )}
              </div>
  
              <div className="mt-auto pt-4 space-y-5">
                <div>
                  <span className="text-white/55 text-[10px] font-bold uppercase tracking-[0.12em]">Próxima ação</span>
                  <p className="text-[22px] sm:text-[26px] font-bold text-white mt-1 leading-snug">
                    {focus.title}
                  </p>
                </div>
  
                <div className="grid gap-3">
                  {procedureHint && (
                    <HeroDetail label="Conduta" value={procedureHint} />
                  )}
                  {lastEvolution && (
                    <HeroDetail label="Última evolução" value={lastEvolution} />
                  )}
                  {clinicalAlert && !isFinishedFocus && (
                    <HeroDetail label="Antes do box" value={clinicalAlert} />
                  )}
                  {clinicalAlert && isFinishedFocus && (
                    <HeroDetail label="Pendente no prontuário" value={clinicalAlert.replace('pendente.', 'não registrada.')} />
                  )}
                  {isFinishedFocus && (
                    <HeroDetail
                      label="Para fechar"
                      value={pendingDateLabel
                        ? `Registre o que foi feito neste atendimento.`
                        : 'Registre a evolução clínica.'}
                    />
                  )}
                </div>
              </div>
            </div>
  
            <div className="px-7 pb-8 pt-5 space-y-3">
              <motion.button
                whileTap={{ scale: 0.98, opacity: 0.92 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                onClick={focus.action}
                className="w-full py-[20px] rounded-[26px] text-[18px] font-bold bg-white shadow-[0_12px_30px_rgba(0,0,0,0.18)] transition-all text-academy-primary"
              >
                {focus.actionLabel}
              </motion.button>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.98, opacity: 0.9 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={() => setActiveTab('pacientes')}
                  className="flex items-center justify-center gap-2 px-5 py-[15px] rounded-[20px] bg-white/15 border border-white/20 text-[14px] font-bold text-white transition-all"
                >
                  <Users size={16} />
                  Casos
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98, opacity: 0.9 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={openAppointmentModal}
                  className="flex items-center justify-center gap-2 py-[15px] rounded-[20px] bg-white/15 border border-white/20 text-[14px] font-bold text-white transition-all"
                >
                  <CalendarPlus size={16} />
                  Agendar
                </motion.button>
              </div>
            </div>
          </div>
        </motion.section>

        <div className="flex items-center justify-end gap-2">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsPatientModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-[12px] rounded-xl bg-academy-soft text-academy-primary border border-academy-primary/12 text-[13px] font-bold transition-all shadow-[0_6px_18px_rgba(82,5,123,0.06)]"
          >
            <Plus size={14} strokeWidth={2.5} />
            Caso
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={openAppointmentModal}
            className="flex items-center gap-1.5 px-4 py-[12px] rounded-xl bg-academy-primary text-white text-[13px] font-bold transition-all shadow-sm"
          >
            <CalendarPlus size={14} strokeWidth={2.5} />
            Atendimento
          </motion.button>
        </div>
      </div>

      {studySuggestion && (
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="rounded-[24px] bg-white border border-academy-border/70 shadow-[0_8px_28px_rgba(15,23,42,0.05)] overflow-hidden">
            <div className="px-6 pt-6 pb-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-[12px] bg-academy-neutral flex items-center justify-center">
                  <BookOpen size={16} className="text-academy-muted" />
                </div>
                <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-academy-muted">Antes do box</span>
              </div>
              <h3 className="text-[20px] font-bold text-academy-text leading-snug">
                {studySuggestion.topic}
              </h3>
              <p className="text-[13px] text-academy-muted mt-1.5 leading-relaxed">
                {studySuggestion.reason}
              </p>
            </div>
            <div className="px-6 pb-5 pt-4 flex items-center justify-between">
              <span className="text-[12px] font-semibold text-academy-muted/70 flex items-center gap-1.5">
                <Clock size={12} />
                {studySuggestion.duration}
              </span>
              <motion.button
                whileTap={{ scale: 0.96, opacity: 0.9 }}
                onClick={() => setActiveTab('estudos')}
                className="px-5 py-2.5 rounded-[14px] bg-academy-primary text-white text-[13px] font-bold transition-all shadow-sm"
              >
                Revisar
              </motion.button>
            </div>
          </div>
        </motion.section>
      )}

      {pendingRows.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-academy-attention-text rounded-full" />
              <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Para fechar</h3>
            </div>
            <span className="text-[12px] font-bold text-academy-attention-text">{pendingRows.length}</span>
          </div>
          <div className="rounded-[20px] overflow-hidden bg-white border border-rose-100 shadow-[0_8px_28px_rgba(225,29,72,0.08)]">
            {pendingRows.map(row => (
              <React.Fragment key={row.id}>
                <ListRow
                  title={row.title}
                  meta={row.meta}
                  accent="coral"
                  onClick={() => {
                    if (row.appointmentId && openPatientEvolution) {
                      const app = usableAppointments.find(a => a.id === row.appointmentId);
                      if (app) {
                        openPatientEvolution(row.patientId, app);
                        return;
                      }
                    }
                    openPatientRecord(row.patientId);
                  }}
                />
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {otherAppointments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 bg-academy-primary rounded-full" />
              <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Próximos boxes</h3>
            </div>
            <button onClick={() => setActiveTab('agenda')} className="text-[13px] font-semibold text-academy-primary">
              Ver tudo
            </button>
          </div>
          <div className="rounded-[20px] overflow-hidden bg-white border border-academy-border/80 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
            {otherAppointments.map((app, index) => {
              const dateTime = formatAgendaListDateTime(app.start_time);
              return (
                <motion.div
                  key={app.id}
                  whileTap={{ backgroundColor: 'var(--academy-bg)' }}
                  transition={{ duration: 0.15 }}
                  onClick={() => openPatientRecord(app.patient_id)}
                  className={`flex items-center justify-between px-5 py-[16px] transition-colors cursor-pointer ${index !== otherAppointments.length - 1 ? 'border-b border-academy-border' : ''}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col items-start shrink-0 w-14">
                      <span className="text-[12px] font-bold text-academy-primary leading-none">
                        {dateTime.date}
                      </span>
                      <span className="text-[15px] font-bold text-academy-primary leading-none mt-1">
                        {dateTime.time}
                      </span>
                    </div>
                    <div className="w-px h-8 bg-academy-primary/12 shrink-0" />
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[15px] font-semibold text-academy-text truncate">{app.patient_name}</span>
                      <span className="text-[12px] text-academy-muted truncate">{app.notes || 'Atendimento'}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {pausedCase && focus.patient?.id !== pausedCase.id && (
        <section>
          <motion.button
            whileTap={{ scale: 0.98, opacity: 0.9 }}
            onClick={() => openPatientRecord(pausedCase.id)}
            className="w-full flex items-center gap-4 bg-academy-alert rounded-[20px] px-5 py-4 transition-all"
          >
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-academy-alert-text shadow-sm shrink-0">
              <Clock size={20} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-semibold text-academy-text">Retorno sem data</p>
              <p className="text-[12px] text-academy-muted truncate">{pausedCase.name}</p>
            </div>
            <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
          </motion.button>
        </section>
      )}

      {patients.length > 0 && pendingRows.length === 0 && otherAppointments.length === 0 && !pausedCase && (
        <section>
          <div className="w-full flex items-center gap-4 bg-academy-success rounded-[20px] px-5 py-4">
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-academy-success-text shadow-sm shrink-0">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-semibold text-academy-text">Sem paciente marcado hoje.</p>
              <p className="text-[12px] text-academy-muted">Revise retornos e prontuários abertos.</p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const HeroDetail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-[18px] bg-white/10 border border-white/15 px-4 py-3">
    <span className="text-white/55 text-[10px] font-bold uppercase tracking-[0.12em]">{label}</span>
    <p className="text-[14px] font-semibold text-white mt-0.5 leading-snug line-clamp-2">{value}</p>
  </div>
);

const ListRow = ({
  title,
  meta,
  accent,
  onClick
}: {
  title: string;
  meta: string;
  accent: 'coral';
  onClick: () => void;
}) => {
  const metaLines = meta.split('\n').filter(Boolean);
  return (
    <motion.div
      whileTap={{ backgroundColor: 'var(--academy-bg)' }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-4 p-5 cursor-pointer border-b border-[#C6C6C8]/5 last:border-b-0"
      onClick={onClick}
    >
      <div className="relative">
        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-[13px] overflow-hidden border shrink-0 bg-academy-attention text-academy-attention-text border-rose-100">
          {(title || '?').charAt(0).toUpperCase()}
        </div>
        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-academy-attention-text border-2 border-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-academy-text truncate">{title}</p>
        {metaLines.map((line, i) => (
          <p key={i} className={`text-[12px] ${i === 0 && metaLines.length > 1 ? 'font-medium text-academy-text/70' : 'text-academy-muted'} ${i === 0 ? 'mt-0.5' : 'mt-0'} truncate`}>
            {line}
          </p>
        ))}
      </div>
      <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
    </motion.div>
  );
};
