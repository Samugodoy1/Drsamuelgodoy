export type PortalActionId =
  | 'confirmAppointment'
  | 'viewInstructions'
  | 'viewAppointment'
  | 'requestAppointment'
  | 'openMedicalForm'
  | 'openMessages'
  | 'openPostCare'
  | 'openDirections'
  | 'openPayment'
  | 'openHistory';

export type ProcedureCategory =
  | 'implante'
  | 'enxerto'
  | 'extracao'
  | 'cirurgia'
  | 'canal'
  | 'restauracao'
  | 'clareamento'
  | 'protese'
  | 'ortodontia'
  | 'raspagem'
  | 'limpeza'
  | 'consulta';

export interface PortalAppointment {
  id: number;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string | null;
  dentist_name?: string | null;
  confirmed_at?: string | null;
}

export interface PortalDataForState {
  patient: {
    name: string;
    consent_accepted?: boolean;
    treatment_plan?: Array<{ procedure?: string; status?: string; value?: number }>;
  };
  anamnesis: {
    medical_history?: string | null;
    allergies?: string | null;
    medications?: string | null;
    chief_complaint?: string | null;
    habits?: string | null;
    family_history?: string | null;
    vital_signs?: string | null;
  } | null;
  latest_intake_form?: {
    form_data?: Record<string, any> | null;
    status?: string;
    created_at?: string;
  } | null;
  appointments: PortalAppointment[];
  evolution: Array<{
    date: string;
    procedure_performed?: string | null;
    notes?: string | null;
  }>;
  installments?: Array<{
    id: number;
    amount: number;
    due_date: string;
    status: string;
    procedure?: string | null;
  }>;
  payment_plans?: Array<{
    id: number;
    procedure: string;
    total_amount: number;
    status: string;
  }>;
  transactions?: Array<{
    id: number;
    amount: number;
    status: string;
  }>;
  clinic?: {
    clinic_address?: string | null;
    phone?: string | null;
  } | null;
}

export interface PortalAction {
  id: PortalActionId;
  label: string;
  tone?: 'primary' | 'neutral' | 'success' | 'warning';
  appointmentId?: number;
}

export interface ProcedureGuide {
  category: ProcedureCategory;
  title: string;
  pre: string[];
  post: string[];
  isSurgical: boolean;
}

export interface PatientPortalState {
  headline: string;
  subheadline: string;
  primaryAction: PortalAction;
  secondaryActions: PortalAction[];
  tip: string;
  appointmentContext: {
    nextAppointment: PortalAppointment | null;
    nextAppointmentLabel: string | null;
    isToday: boolean;
    isTomorrow: boolean;
    isConfirmed: boolean;
    status: string | null;
    procedureText: string;
    procedureCategory: ProcedureCategory;
    procedureGuide: ProcedureGuide;
    hasRecentAttendance: boolean;
    recentProcedure: { date: string; procedure: string; category: ProcedureCategory } | null;
  };
  patientFlags: {
    medicalFormPending: boolean;
    hasPendingPayment: boolean;
    hasPostCare: boolean;
    hasPreCare: boolean;
    hasDirections: boolean;
    pendingPaymentAmount: number;
  };
}

const SURGICAL_CATEGORIES = new Set<ProcedureCategory>(['implante', 'enxerto', 'extracao', 'cirurgia']);

const PROCEDURE_PATTERNS: Array<{ category: ProcedureCategory; pattern: RegExp; recentDays: number }> = [
  { category: 'implante', pattern: /implante/i, recentDays: 7 },
  { category: 'enxerto', pattern: /enxerto/i, recentDays: 7 },
  { category: 'extracao', pattern: /extracao|extração|exodontia|siso|terceiro.?molar/i, recentDays: 5 },
  { category: 'cirurgia', pattern: /cirurgia|frenectomia|apicectomia|gengivectomia|biopsia|biópsia|sutura|alveoloplastia/i, recentDays: 5 },
  { category: 'canal', pattern: /canal|endodont|pulpectomia/i, recentDays: 3 },
  { category: 'restauracao', pattern: /restauracao|restauração|resina|amalgama|amálgama|obturacao|obturação/i, recentDays: 2 },
  { category: 'clareamento', pattern: /clareamento|branqueamento|whitening/i, recentDays: 2 },
  { category: 'protese', pattern: /protese|prótese|coroa|faceta|lente|onlay|inlay|overlay/i, recentDays: 3 },
  { category: 'ortodontia', pattern: /ortod|aparelho|bracket|alinhador|invisalign/i, recentDays: 2 },
  { category: 'raspagem', pattern: /raspagem|curetagem|periodon/i, recentDays: 3 },
  { category: 'limpeza', pattern: /limpeza|profilaxia|tartaro|tártaro/i, recentDays: 2 },
];

export const PROCEDURE_GUIDES: Record<ProcedureCategory, ProcedureGuide> = {
  implante: {
    category: 'implante',
    title: 'Orientacoes do implante',
    isSurgical: true,
    pre: [
      'Confirme com a clinica se ha medicacao antes do procedimento.',
      'Alimente-se conforme a orientacao recebida e evite chegar em jejum sem recomendacao.',
      'Organize repouso e evite compromissos intensos apos a consulta.',
    ],
    post: [
      'Siga a medicacao prescrita e evite esforço fisico nas primeiras 48 horas.',
      'Use compressa fria se a clinica orientou e prefira alimentos frios ou macios.',
      'Avise a clinica se tiver dor forte, sangramento persistente ou febre.',
    ],
  },
  enxerto: {
    category: 'enxerto',
    title: 'Orientacoes do enxerto',
    isSurgical: true,
    pre: [
      'Confirme as orientacoes de medicacao e alimentacao antes de sair.',
      'Evite fumar e avise a clinica sobre anticoagulantes ou alteracoes de saude.',
      'Reserve tempo para repouso apos o atendimento.',
    ],
    post: [
      'Nao toque a area operada com lingua ou dedos.',
      'Prefira alimentos macios e siga a medicacao prescrita.',
      'Entre em contato se houver sangramento intenso, febre ou dor fora do esperado.',
    ],
  },
  extracao: {
    category: 'extracao',
    title: 'Orientacoes da extracao',
    isSurgical: true,
    pre: [
      'Informe medicamentos em uso, especialmente anticoagulantes.',
      'Siga a orientacao da clinica sobre alimentacao antes da consulta.',
      'Planeje repouso e evite atividades fisicas logo apos o procedimento.',
    ],
    post: [
      'Nao faca bochechos vigorosos nas primeiras 24 horas.',
      'Prefira alimentos frios ou macios e nao fume.',
      'Avise a clinica se houver sangramento intenso, febre ou dor forte.',
    ],
  },
  cirurgia: {
    category: 'cirurgia',
    title: 'Orientacoes da cirurgia',
    isSurgical: true,
    pre: [
      'Revise medicamentos, alergias e exames solicitados antes de sair.',
      'Siga exatamente a orientacao da clinica sobre jejum, alimentacao ou medicacao.',
      'Se possivel, venha acompanhado e organize repouso apos o procedimento.',
    ],
    post: [
      'Siga a medicacao prescrita e mantenha repouso conforme orientado.',
      'Evite bochechos vigorosos, cigarro e atividade fisica nas primeiras 48 horas.',
      'Dor forte, sangramento persistente, febre ou inchaço fora do esperado pedem contato com a clinica.',
    ],
  },
  canal: {
    category: 'canal',
    title: 'Orientacoes do canal',
    isSurgical: false,
    pre: [
      'Se estiver com dor, avise a clinica ao chegar.',
      'Leve exames ou radiografias relacionados, se tiver.',
      'Mantenha-se hidratado hoje e siga as orientacoes recebidas.',
    ],
    post: [
      'Evite mastigar alimentos duros com o dente tratado ate a restauracao definitiva.',
      'Sensibilidade leve pode acontecer, mas dor forte deve ser avisada.',
      'Siga os retornos indicados para concluir o tratamento.',
    ],
  },
  restauracao: {
    category: 'restauracao',
    title: 'Orientacoes da restauracao',
    isSurgical: false,
    pre: [
      'Escove os dentes antes da consulta, se puder.',
      'Avise sobre sensibilidade, dor ou restauracoes que incomodam.',
      'Mantenha-se hidratado hoje e siga as orientacoes da clinica.',
    ],
    post: [
      'Evite alimentos muito duros ou pegajosos nas primeiras horas.',
      'Se a mordida parecer alta ou incomodar, avise a clinica.',
      'Sensibilidade leve costuma melhorar; dor forte precisa de orientacao.',
    ],
  },
  clareamento: {
    category: 'clareamento',
    title: 'Orientacoes do clareamento',
    isSurgical: false,
    pre: [
      'Avise se estiver com sensibilidade dental ou gengival.',
      'Evite alimentos muito pigmentados antes da sessao, se a clinica orientou.',
      'Siga o protocolo indicado pela equipe.',
    ],
    post: [
      'Evite alimentos e bebidas muito pigmentados conforme orientacao.',
      'Sensibilidade temporaria pode acontecer.',
      'Procure a clinica se a sensibilidade for intensa.',
    ],
  },
  protese: {
    category: 'protese',
    title: 'Orientacoes da protese',
    isSurgical: false,
    pre: [
      'Leve informacoes sobre adaptacao, dor ou pontos que machucam.',
      'Avise se alguma peca provisoria soltou ou incomoda.',
      'Siga os horarios de retorno para ajustes.',
    ],
    post: [
      'A mordida pode parecer diferente no inicio.',
      'Se machucar, soltar ou incomodar, entre em contato.',
      'Mantenha a higiene indicada para a peca.',
    ],
  },
  ortodontia: {
    category: 'ortodontia',
    title: 'Orientacoes da consulta ortodontica',
    isSurgical: false,
    pre: [
      'Escove bem dentes e aparelho antes da consulta.',
      'Avise se algum fio, bracket ou alinhador incomodou.',
      'Leve alinhadores ou elasticos, se estiver usando.',
    ],
    post: [
      'Desconforto leve apos ajuste pode acontecer por alguns dias.',
      'Prefira alimentos macios se houver sensibilidade.',
      'Se um fio machucar ou uma peca soltar, fale com a clinica.',
    ],
  },
  raspagem: {
    category: 'raspagem',
    title: 'Orientacoes da raspagem',
    isSurgical: false,
    pre: [
      'Avise sobre sangramento gengival, dor ou sensibilidade.',
      'Informe medicamentos e condicoes de saude relevantes.',
      'Mantenha sua higiene habitual antes da consulta.',
    ],
    post: [
      'Sangramento leve ou sensibilidade podem ocorrer no inicio.',
      'Escove suavemente e use fio dental conforme orientado.',
      'Se houver dor forte ou sangramento persistente, fale com a clinica.',
    ],
  },
  limpeza: {
    category: 'limpeza',
    title: 'Orientacoes da limpeza',
    isSurgical: false,
    pre: [
      'Mantenha sua higiene habitual antes da consulta.',
      'Avise sobre sensibilidade, dor ou sangramento gengival.',
      'Leve duvidas sobre rotina de escovacao e fio dental.',
    ],
    post: [
      'Mantenha escovacao e fio dental diariamente.',
      'Sensibilidade leve pode acontecer por pouco tempo.',
      'Siga o intervalo de retorno recomendado pela clinica.',
    ],
  },
  consulta: {
    category: 'consulta',
    title: 'Orientacoes da consulta',
    isSurgical: false,
    pre: [
      'Chegue alguns minutos antes do horario.',
      'Leve documentos, exames e uma lista de medicamentos em uso.',
      'Se puder, mantenha-se hidratado hoje e siga as orientacoes da clinica.',
    ],
    post: [
      'Apos a consulta, siga as orientacoes recebidas.',
      'Envie uma mensagem se ficar com alguma duvida.',
      'Avise a clinica se tiver dor forte, sangramento ou desconforto inesperado.',
    ],
  },
};

export function detectProcedureCategory(text?: string | null): ProcedureCategory {
  const normalized = text || '';
  const found = PROCEDURE_PATTERNS.find((item) => item.pattern.test(normalized));
  return found?.category || 'consulta';
}

export function formatPortalTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function isSameCalendarDay(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function firstName(name: string) {
  return (name || '').trim().split(/\s+/)[0] || 'Paciente';
}

function relativeAppointmentLabel(value: string, now = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'em breve';

  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = formatPortalTime(value);

  if (isSameCalendarDay(date, now)) return `hoje as ${time}`;
  if (isSameCalendarDay(date, tomorrow)) return `amanha as ${time}`;

  return `${date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} as ${time}`;
}

function getProcedureText(data: PortalDataForState, appointment: PortalAppointment | null) {
  const notes = appointment?.notes?.trim();
  if (notes) return notes.split('\n').find(Boolean)?.trim() || notes;

  const activePlan = data.patient.treatment_plan?.find((plan) => {
    const status = (plan.status || '').toUpperCase();
    return status === 'APROVADO' || status === 'PLANEJADO';
  });
  return activePlan?.procedure || 'Consulta odontologica';
}

function getRecentProcedure(data: PortalDataForState) {
  const now = new Date();
  const cancelledDates = new Set(
    data.appointments
      .filter((appointment) => appointment.status === 'CANCELLED')
      .map((appointment) => new Date(appointment.start_time).toDateString())
  );

  const candidates: Array<{ date: string; procedure: string; category: ProcedureCategory }> = [];

  data.evolution.forEach((entry) => {
    const text = `${entry.procedure_performed || ''} ${entry.notes || ''}`.trim();
    if (!text) return;
    const category = detectProcedureCategory(text);
    if (category === 'consulta') return;
    const date = new Date(entry.date);
    if (Number.isNaN(date.getTime()) || cancelledDates.has(date.toDateString())) return;
    const pattern = PROCEDURE_PATTERNS.find((item) => item.category === category);
    const recentDays = pattern?.recentDays || 2;
    const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (diffDays >= 0 && diffDays <= recentDays) {
      candidates.push({ date: entry.date, procedure: entry.procedure_performed || entry.notes || 'Procedimento', category });
    }
  });

  data.appointments
    .filter((appointment) => appointment.status === 'FINISHED' && appointment.notes)
    .forEach((appointment) => {
      const category = detectProcedureCategory(appointment.notes);
      if (category === 'consulta') return;
      const date = new Date(appointment.start_time);
      if (Number.isNaN(date.getTime()) || cancelledDates.has(date.toDateString())) return;
      const pattern = PROCEDURE_PATTERNS.find((item) => item.category === category);
      const recentDays = pattern?.recentDays || 2;
      const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
      if (diffDays >= 0 && diffDays <= recentDays) {
        candidates.push({ date: appointment.start_time, procedure: appointment.notes || 'Procedimento', category });
      }
    });

  return candidates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
}

function hasMedicalFormPending(data: PortalDataForState) {
  const anamnesis = data.anamnesis;
  const latestForm = data.latest_intake_form?.form_data || {};
  const hasCore =
    Boolean(anamnesis?.allergies || latestForm.allergies)
    && Boolean(anamnesis?.medications || latestForm.medications)
    && Boolean(anamnesis?.medical_history || latestForm.medical_history || latestForm.systemic_diseases);

  return !hasCore;
}

function getPendingPayment(data: PortalDataForState) {
  const pending = (data.installments || []).filter((installment) => {
    const status = (installment.status || '').toUpperCase();
    return status === 'PENDING' || status === 'OVERDUE';
  });

  return {
    hasPendingPayment: pending.length > 0,
    amount: pending.reduce((sum, installment) => sum + Number(installment.amount || 0), 0),
  };
}

export function buildPatientPortalState(data: PortalDataForState, now = new Date()): PatientPortalState {
  const patientFirstName = firstName(data.patient.name);
  const nextAppointment = data.appointments
    .filter((appointment) => {
      const status = (appointment.status || '').toUpperCase();
      return new Date(appointment.end_time || appointment.start_time) >= now
        && !['CANCELLED', 'FINISHED', 'NO_SHOW'].includes(status);
    })
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())[0] || null;

  const isConfirmed = Boolean(nextAppointment && ((nextAppointment.status || '').toUpperCase() === 'CONFIRMED' || nextAppointment.confirmed_at));
  const nextDate = nextAppointment ? new Date(nextAppointment.start_time) : null;
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isToday = Boolean(nextDate && isSameCalendarDay(nextDate, now));
  const isTomorrow = Boolean(nextDate && isSameCalendarDay(nextDate, tomorrow));
  const procedureText = getProcedureText(data, nextAppointment);
  const procedureCategory = detectProcedureCategory(procedureText);
  const procedureGuide = PROCEDURE_GUIDES[procedureCategory];
  const recentProcedure = getRecentProcedure(data);
  const hasRecentAttendance = Boolean(recentProcedure)
    || data.appointments.some((appointment) => {
      const status = (appointment.status || '').toUpperCase();
      const diffDays = Math.floor((now.getTime() - new Date(appointment.end_time || appointment.start_time).getTime()) / 86400000);
      return status === 'FINISHED' && diffDays >= 0 && diffDays <= 7;
    });
  const medicalFormPending = hasMedicalFormPending(data);
  const payment = getPendingPayment(data);
  const nextAppointmentLabel = nextAppointment ? relativeAppointmentLabel(nextAppointment.start_time, now) : null;
  const hasPreCare = Boolean(nextAppointment);
  const hasPostCare = Boolean(recentProcedure || hasRecentAttendance);
  const hasDirections = Boolean(data.clinic?.clinic_address && nextAppointment);

  let headline = `Ola, ${patientFirstName}.`;
  let subheadline = 'Voce ainda nao tem uma proxima visita agendada.';
  let primaryAction: PortalAction = { id: 'requestAppointment', label: 'Solicitar novo horario', tone: 'primary' };

  if (nextAppointment) {
    subheadline = isToday
      ? `Sua consulta e hoje as ${formatPortalTime(nextAppointment.start_time)}.`
      : `Sua proxima visita e ${nextAppointmentLabel}.`;

    if (!isConfirmed && (nextAppointment.status || '').toUpperCase() === 'SCHEDULED') {
      primaryAction = {
        id: 'confirmAppointment',
        label: 'Confirmar minha ida',
        tone: 'primary',
        appointmentId: nextAppointment.id,
      };
    } else if (isToday) {
      primaryAction = {
        id: 'viewInstructions',
        label: 'Ver orientacoes antes de sair',
        tone: 'primary',
        appointmentId: nextAppointment.id,
      };
    } else if (isTomorrow) {
      primaryAction = {
        id: 'viewInstructions',
        label: 'Ver orientacoes para amanha',
        tone: 'primary',
        appointmentId: nextAppointment.id,
      };
    } else {
      primaryAction = {
        id: 'viewAppointment',
        label: 'Ver detalhes da consulta',
        tone: 'primary',
        appointmentId: nextAppointment.id,
      };
    }
  }

  const secondaryActions: PortalAction[] = [];
  const pushSecondary = (action: PortalAction) => {
    if (action.id !== primaryAction.id) {
      secondaryActions.push(action);
    }
  };

  if (nextAppointment && isConfirmed && !isToday) {
    pushSecondary({ id: 'viewAppointment', label: 'Detalhes da consulta', appointmentId: nextAppointment.id });
  }

  if (nextAppointment && procedureGuide.isSurgical) {
    pushSecondary({ id: 'viewInstructions', label: 'Orientacoes da cirurgia', appointmentId: nextAppointment.id, tone: 'warning' });
  } else if (nextAppointment) {
    pushSecondary({ id: 'viewInstructions', label: 'Ver preparo para a consulta', appointmentId: nextAppointment.id });
  }

  if (medicalFormPending) {
    secondaryActions.push({ id: 'openMedicalForm', label: 'Atualizar ficha medica' });
  } else {
    secondaryActions.push({ id: 'openMedicalForm', label: 'Ficha atualizada', tone: 'success' });
  }

  if (payment.hasPendingPayment) {
    secondaryActions.push({ id: 'openPayment', label: payment.amount > 0 ? 'Ver pagamento' : 'Informar pagamento', tone: 'warning' });
  }

  if (hasPostCare) {
    secondaryActions.push({ id: 'openPostCare', label: 'Duvidas pos-atendimento' });
  } else {
    secondaryActions.push({ id: 'openMessages', label: 'Falar com a clinica' });
  }

  if (isToday && hasDirections) {
    secondaryActions.push({ id: 'openDirections', label: 'Como chegar' });
  }

  if (!nextAppointment) {
    secondaryActions.push({ id: 'openHistory', label: 'Ver historico' });
    secondaryActions.push({ id: 'openMessages', label: 'Falar com a clinica' });
  }

  const tip = hasPostCare
    ? 'Apos o procedimento, siga as orientacoes recebidas e avise a clinica se tiver dor forte, sangramento ou duvida.'
    : nextAppointment
      ? 'Se puder, mantenha-se hidratado hoje e siga as orientacoes da clinica antes da consulta.'
      : 'Quando precisar, solicite um novo horario e conte para a clinica o melhor periodo para voce.';

  return {
    headline,
    subheadline,
    primaryAction,
    secondaryActions: dedupeActions(secondaryActions),
    tip,
    appointmentContext: {
      nextAppointment,
      nextAppointmentLabel,
      isToday,
      isTomorrow,
      isConfirmed,
      status: nextAppointment?.status || null,
      procedureText,
      procedureCategory,
      procedureGuide,
      hasRecentAttendance,
      recentProcedure,
    },
    patientFlags: {
      medicalFormPending,
      hasPendingPayment: payment.hasPendingPayment,
      hasPostCare,
      hasPreCare,
      hasDirections,
      pendingPaymentAmount: payment.amount,
    },
  };
}

function dedupeActions(actions: PortalAction[]) {
  const seen = new Set<string>();
  return actions.filter((action) => {
    const key = `${action.id}-${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
