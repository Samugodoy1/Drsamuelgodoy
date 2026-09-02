export type ControlPhase = 'opening' | 'clinic' | 'closing' | 'night';

export type ControlTab =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'financeiro'
  | 'documentos'
  | 'configuracoes'
  | 'admin';

export type WidgetTone = 'neutral' | 'live' | 'warn' | 'urgent' | 'money' | 'ok';

export type WidgetSize = 's' | 'm' | 'l';

export const SIZE_LABEL: Record<WidgetSize, string> = {
  s: '1 × 1',
  m: '2 × 1',
  l: '2 × 2',
};

export function cycleWidgetSize(size: WidgetSize): WidgetSize {
  if (size === 's') return 'm';
  if (size === 'm') return 'l';
  return 's';
}

export type LiveWidgetId =
  | 'proximo'
  | 'confirmar'
  | 'caixa'
  | 'recuperar'
  | 'portal'
  | 'amanha'
  | 'ritmo'
  | 'encaixe'
  | 'agenda'
  | 'sala'
  | 'pausa'
  | 'fila'
  | 'receber'
  | 'semana';

export interface ControlAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  start_time: string;
  end_time: string;
  notes?: string;
  status: string;
}

export interface ControlCenterInput {
  now: Date;
  appointments: ControlAppointment[];
  todayRevenue?: number;
  weekRevenue?: number;
  pendingReceivables?: number;
  portalPendingCount?: number;
  noShowRescheduleCount?: number;
  patientCount?: number;
  freeSlotCount?: number;
}

export interface ControlVoice {
  greeting: string;
  headline: string;
  detail: string;
  phase: ControlPhase;
}

export interface ControlWidget {
  id: LiveWidgetId | ControlTab;
  tab: ControlTab;
  title: string;
  value: string;
  hint: string;
  tone: WidgetTone;
  icon: LiveWidgetId | ControlTab;
  live: boolean;
  score: number;
  size: WidgetSize;
  patientId?: number;
}

export interface ControlCenterView {
  voice: ControlVoice;
  featured: {
    label: string;
    hint: string;
    clock: string;
    attending: boolean;
    done: number;
    total: number;
  };
  widgets: ControlWidget[];
}

const DONE = new Set(['FINISHED', 'CANCELLED', 'NO_SHOW']);
const INACTIVE = new Set(['CANCELLED']);

export function firstGivenName(name?: string | null): string {
  const cleaned = (name || '').replace(/^(Dr\.|Dra\.|Dr|Dra)\s+/i, '').trim();
  return cleaned.split(/\s+/)[0] || '';
}

export function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Bom dia';
  if (hour >= 12 && hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function getControlPhase(now: Date): ControlPhase {
  const hour = now.getHours();
  if (hour >= 5 && hour < 11) return 'opening';
  if (hour >= 11 && hour < 17) return 'clinic';
  if (hour >= 17 && hour < 21) return 'closing';
  return 'night';
}

export function formatClock(now: Date): string {
  return now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatTime(value: Date): string {
  return value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function formatBRL(value: number): string {
  const amount = Number.isFinite(value) ? value : 0;
  if (amount >= 10_000) {
    const thousands = amount / 1000;
    const compact = thousands.toLocaleString('pt-BR', {
      minimumFractionDigits: thousands >= 100 ? 0 : 1,
      maximumFractionDigits: thousands >= 100 ? 0 : 1,
    });
    return `R$ ${compact} mil`;
  }
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
}

export function formatUntil(start: Date, now: Date): string {
  const mins = Math.round((start.getTime() - now.getTime()) / 60_000);
  if (mins <= 0) return 'agora';
  if (mins < 60) return `em ${mins} min`;
  if (mins < 90) {
    const hours = Math.floor(mins / 60);
    const rest = mins % 60;
    return rest > 0 ? `em ${hours}h ${rest}min` : `em ${hours}h`;
  }
  return `às ${formatTime(start)}`;
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setDate(base.getDate() + days);
  return next;
}

function parseWhen(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function deriveClinicFacts(input: ControlCenterInput) {
  const now = input.now;
  const tomorrow = addDays(now, 1);

  const today = input.appointments
    .map(appointment => ({ appointment, start: parseWhen(appointment.start_time), end: parseWhen(appointment.end_time) }))
    .filter((item): item is { appointment: ControlAppointment; start: Date; end: Date } => {
      if (!item.start || !item.end) return false;
      if (INACTIVE.has(item.appointment.status)) return false;
      return sameDay(item.start, now);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const tomorrowItems = input.appointments
    .map(appointment => ({ appointment, start: parseWhen(appointment.start_time) }))
    .filter((item): item is { appointment: ControlAppointment; start: Date } => {
      if (!item.start) return false;
      if (INACTIVE.has(item.appointment.status)) return false;
      return sameDay(item.start, tomorrow);
    })
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const attending = today.find(({ appointment, start, end }) => {
    if (appointment.status === 'NO_SHOW') return false;
    if (appointment.status === 'FINISHED') return false;
    if (appointment.status === 'IN_PROGRESS') return true;
    return now >= start && now < end;
  }) ?? null;

  const remaining = today.filter(({ appointment, end }) => {
    if (DONE.has(appointment.status)) return false;
    return end > now || appointment.status === 'IN_PROGRESS';
  });

  const next = remaining.find(({ start, appointment }) => {
    if (attending && appointment.id === attending.appointment.id) return false;
    return start.getTime() > now.getTime();
  }) ?? remaining[0] ?? null;

  const finished = today.filter(({ appointment }) => appointment.status === 'FINISHED').length;
  const morning = today.filter(({ start }) => start.getHours() < 12).length;
  const afternoon = today.filter(({ start }) => start.getHours() >= 12).length;
  const unconfirmedTomorrow = tomorrowItems.filter(({ appointment }) => appointment.status !== 'CONFIRMED');

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = addDays(weekStart, 7);
  const weekCount = input.appointments.filter(appointment => {
    if (INACTIVE.has(appointment.status)) return false;
    const start = parseWhen(appointment.start_time);
    return !!start && start >= weekStart && start < weekEnd;
  }).length;

  const gapMinutes = next
    ? Math.round((next.start.getTime() - now.getTime()) / 60_000)
    : null;

  return {
    now,
    phase: getControlPhase(now),
    today,
    tomorrow: tomorrowItems,
    attending,
    remaining,
    next,
    first: remaining[0] ?? today[0] ?? null,
    finished,
    morning,
    afternoon,
    unconfirmedTomorrow,
    weekCount,
    gapMinutes,
    todayRevenue: input.todayRevenue || 0,
    weekRevenue: input.weekRevenue || 0,
    pendingReceivables: input.pendingReceivables || 0,
    portalPendingCount: input.portalPendingCount || 0,
    noShowRescheduleCount: input.noShowRescheduleCount || 0,
    patientCount: input.patientCount || 0,
    freeSlotCount: input.freeSlotCount || 0,
  };
}

type ClinicFacts = ReturnType<typeof deriveClinicFacts>;

function patientFirst(item: ClinicFacts['next']): string {
  return firstGivenName(item?.appointment.patient_name) || 'paciente';
}

export function buildControlVoice(facts: ClinicFacts): ControlVoice {
  const greeting = greetingForHour(facts.now.getHours());
  const phase = facts.phase;
  const remaining = facts.remaining.length;
  const nextName = patientFirst(facts.next);
  const firstName = patientFirst(facts.first);

  if (facts.attending) {
    const attendingName = patientFirst(facts.attending);
    const nextLine = facts.next
      ? `Próxima: ${nextName} ${formatUntil(facts.next.start, facts.now)}`
      : remaining <= 1
        ? 'Último atendimento do dia'
        : `${remaining - 1} pela frente`;
    return { greeting, phase, headline: `Atendendo ${attendingName}`, detail: nextLine };
  }

  if (facts.next) {
    const until = formatUntil(facts.next.start, facts.now);
    const soon = (facts.next.start.getTime() - facts.now.getTime()) / 60_000 <= 20;
    const isFirst = facts.finished === 0 && facts.next === facts.first;
    const headline = soon
      ? `${nextName} ${until}`
      : isFirst
        ? `Primeira ${until}`
        : `Próxima ${until}`;
    const procedure = facts.next.appointment.notes?.trim();
    const queue = remaining === 1
      ? (procedure || 'Última consulta do dia')
      : `${remaining} pela frente${procedure ? ` · ${procedure}` : ''}`;
    return { greeting, phase, headline, detail: queue };
  }

  if (remaining === 0 && facts.today.length > 0) {
    const money = facts.todayRevenue > 0 ? formatBRL(facts.todayRevenue) : '';
    const tomorrow = facts.tomorrow.length > 0
      ? `Amanhã: ${facts.tomorrow.length} consulta${facts.tomorrow.length === 1 ? '' : 's'}`
      : 'Nada marcado pra amanhã';
    return {
      greeting,
      phase,
      headline: phase === 'opening' ? 'Agenda do dia já foi' : 'Dia encerrado',
      detail: [money, tomorrow].filter(Boolean).join(' · ') || tomorrow,
    };
  }

  if (facts.today.length === 0) {
    if (facts.noShowRescheduleCount > 0) {
      return {
        greeting,
        phase,
        headline: 'Agenda livre hoje',
        detail: `${facts.noShowRescheduleCount} falta${facts.noShowRescheduleCount === 1 ? '' : 's'} pra recuperar`,
      };
    }
    if (facts.unconfirmedTomorrow.length > 0) {
      return {
        greeting,
        phase,
        headline: phase === 'night' || phase === 'closing' ? 'Hoje ficou livre' : 'Agenda livre hoje',
        detail: `${facts.unconfirmedTomorrow.length} de amanhã sem confirmar`,
      };
    }
    if (facts.tomorrow.length > 0) {
      const firstTomorrow = facts.tomorrow[0];
      return {
        greeting,
        phase,
        headline: `Amanhã às ${formatTime(firstTomorrow.start)}`,
        detail: `${facts.tomorrow.length} consulta${facts.tomorrow.length === 1 ? '' : 's'} · ${facts.unconfirmedTomorrow.length === 0 ? 'todas confirmadas' : `${facts.unconfirmedTomorrow.length} sem confirmar`}`,
      };
    }
    return {
      greeting,
      phase,
      headline: phase === 'night' ? 'Clínica em silêncio' : 'Agenda livre hoje',
      detail: facts.patientCount > 0 ? 'Sem consultas — bom momento pra organizar' : 'Comece pelo próximo paciente',
    };
  }

  if ((phase === 'closing' || phase === 'night') && facts.tomorrow.length > 0) {
    return {
      greeting,
      phase,
      headline: `Amanhã às ${formatTime(facts.tomorrow[0].start)}`,
      detail: `${facts.tomorrow.length} consulta${facts.tomorrow.length === 1 ? '' : 's'} · ${firstGivenName(facts.tomorrow[0].appointment.patient_name) || 'primeiro paciente'}`,
    };
  }

  return {
    greeting,
    phase,
    headline: firstName ? `Olhando ${firstName}` : 'Sua clínica',
    detail: remaining > 0 ? `${remaining} no radar` : 'Tudo em ordem por agora',
  };
}

function buildLiveWidgets(facts: ClinicFacts): ControlWidget[] {
  const widgets: ControlWidget[] = [];

  if (facts.attending) {
    widgets.push({
      id: 'sala',
      tab: 'dashboard',
      title: 'Na cadeira',
      value: patientFirst(facts.attending),
      hint: facts.attending.appointment.notes?.trim() || 'Em atendimento',
      tone: 'live',
      icon: 'sala',
      live: true,
      score: 104,
      size: 'm',
      patientId: facts.attending.appointment.patient_id,
    });
  }

  if (facts.next) {
    const soon = (facts.next.start.getTime() - facts.now.getTime()) / 60_000 <= 20;
    widgets.push({
      id: 'proximo',
      tab: 'agenda',
      title: facts.attending ? 'Próxima' : 'Agora',
      value: formatUntil(facts.next.start, facts.now),
      hint: patientFirst(facts.next),
      tone: soon || facts.attending ? 'live' : 'neutral',
      icon: 'proximo',
      live: true,
      score: facts.phase === 'clinic' ? 100 : facts.phase === 'opening' ? 70 : 55,
      size: soon || facts.attending ? 'm' : 's',
      patientId: facts.next.appointment.patient_id,
    });
  }

  const needsConfirm = facts.unconfirmedTomorrow.length > 0;
  if (needsConfirm) {
    const count = facts.unconfirmedTomorrow.length;
    widgets.push({
      id: 'confirmar',
      tab: 'agenda',
      title: 'Confirmar',
      value: String(count),
      hint: count === 1 ? 'amanhã sem ok' : 'de amanhã sem ok',
      tone: count >= 3 ? 'urgent' : 'warn',
      icon: 'confirmar',
      live: true,
      score: facts.phase === 'opening' ? 92 : facts.phase === 'night' ? 88 : facts.phase === 'closing' ? 78 : 48,
      size: 's',
    });
  }

  if (facts.gapMinutes != null && facts.gapMinutes >= 25 && !facts.attending) {
    widgets.push({
      id: 'pausa',
      tab: 'agenda',
      title: 'Pausa',
      value: formatUntil(facts.next!.start, facts.now),
      hint: 'até o próximo paciente',
      tone: 'ok',
      icon: 'pausa',
      live: true,
      score: 44,
      size: 's',
    });
  }

  if (facts.remaining.length >= 2) {
    const names = facts.remaining.slice(0, 3).map(item => patientFirst(item)).join(' · ');
    widgets.push({
      id: 'fila',
      tab: 'agenda',
      title: 'Fila',
      value: String(facts.remaining.length),
      hint: names,
      tone: 'neutral',
      icon: 'fila',
      live: true,
      score: facts.phase === 'clinic' ? 62 : 40,
      size: 'm',
    });
  }

  if (facts.todayRevenue > 0 || facts.pendingReceivables > 0 || facts.weekRevenue > 0) {
    const closing = facts.phase === 'closing' || facts.phase === 'night';
    const value = facts.todayRevenue > 0
      ? formatBRL(facts.todayRevenue)
      : facts.pendingReceivables > 0
        ? formatBRL(facts.pendingReceivables)
        : formatBRL(facts.weekRevenue);
    const hint = facts.todayRevenue > 0
      ? (closing ? 'fechar o caixa' : 'faturado hoje')
      : facts.pendingReceivables > 0
        ? 'a receber'
        : 'esta semana';
    widgets.push({
      id: 'caixa',
      tab: 'financeiro',
      title: closing && facts.todayRevenue > 0 ? 'Caixa' : 'Caixa',
      value,
      hint,
      tone: 'money',
      icon: 'caixa',
      live: true,
      score: facts.todayRevenue > 0
        ? (closing ? 86 : facts.phase === 'clinic' ? 52 : 28)
        : facts.pendingReceivables > 0
          ? 46
          : 22,
      size: 's',
    });
  }

  if (facts.todayRevenue > 0 && facts.pendingReceivables > 0) {
    widgets.push({
      id: 'receber',
      tab: 'financeiro',
      title: 'A receber',
      value: formatBRL(facts.pendingReceivables),
      hint: 'pendências em aberto',
      tone: 'warn',
      icon: 'receber',
      live: true,
      score: 47,
      size: 's',
    });
  }

  if (facts.weekCount > 0) {
    widgets.push({
      id: 'semana',
      tab: 'agenda',
      title: 'Semana',
      value: String(facts.weekCount),
      hint: facts.weekCount === 1 ? 'consulta nesta semana' : 'consultas nesta semana',
      tone: 'neutral',
      icon: 'semana',
      live: true,
      score: 34,
      size: 's',
    });
  }

  if (facts.noShowRescheduleCount > 0) {
    const count = facts.noShowRescheduleCount;
    widgets.push({
      id: 'recuperar',
      tab: 'dashboard',
      title: 'Recuperar',
      value: String(count),
      hint: count === 1 ? 'falta sem remarcação' : 'faltas sem remarcação',
      tone: 'urgent',
      icon: 'recuperar',
      live: true,
      score: facts.phase === 'opening' ? 76 : facts.phase === 'night' ? 72 : facts.phase === 'closing' ? 58 : 36,
      size: 's',
    });
  }

  if (facts.portalPendingCount > 0) {
    const count = facts.portalPendingCount;
    widgets.push({
      id: 'portal',
      tab: 'pacientes',
      title: 'Portal',
      value: String(count),
      hint: count === 1 ? 'pedido de consulta' : 'pedidos de consulta',
      tone: 'warn',
      icon: 'portal',
      live: true,
      score: 82,
      size: 's',
    });
  }

  if (!needsConfirm && facts.tomorrow.length > 0 && (facts.phase === 'closing' || facts.phase === 'night' || facts.today.length === 0)) {
    const first = facts.tomorrow[0];
    const confirmed = facts.tomorrow.length - facts.unconfirmedTomorrow.length;
    widgets.push({
      id: 'amanha',
      tab: 'agenda',
      title: 'Amanhã',
      value: formatTime(first.start),
      hint: `${facts.tomorrow.length} consulta${facts.tomorrow.length === 1 ? '' : 's'} · ${confirmed} ok`,
      tone: facts.unconfirmedTomorrow.length > 0 ? 'warn' : 'ok',
      icon: 'amanha',
      live: true,
      score: facts.phase === 'night' ? 90 : facts.phase === 'closing' ? 80 : 42,
      size: 'm',
    });
  }

  if (facts.today.length > 0 && (facts.morning > 0 || facts.afternoon > 0) && facts.phase === 'opening') {
    widgets.push({
      id: 'ritmo',
      tab: 'agenda',
      title: 'Ritmo',
      value: `${facts.morning} · ${facts.afternoon}`,
      hint: 'manhã · tarde',
      tone: 'neutral',
      icon: 'ritmo',
      live: true,
      score: 50,
      size: 'm',
    });
  }

  if (facts.freeSlotCount > 0 && facts.remaining.length <= 4 && facts.phase !== 'night') {
    widgets.push({
      id: 'encaixe',
      tab: 'agenda',
      title: 'Encaixe',
      value: String(facts.freeSlotCount),
      hint: facts.freeSlotCount === 1 ? 'janela livre hoje' : 'janelas livres hoje',
      tone: 'live',
      icon: 'encaixe',
      live: true,
      score: facts.remaining.length === 0 ? 64 : facts.phase === 'clinic' ? 58 : 38,
      size: 's',
    });
  }

  if (facts.today.length > 0) {
    widgets.push({
      id: 'agenda',
      tab: 'agenda',
      title: 'Agenda',
      value: String(facts.remaining.length),
      hint: facts.remaining.length === 1 ? 'consulta pela frente' : 'consultas pela frente',
      tone: 'neutral',
      icon: 'agenda',
      live: true,
      score: 26,
      size: 's',
    });
  }

  return widgets;
}

const NAV_WIDGETS: Array<Omit<ControlWidget, 'score'> & { score?: number }> = [
  { id: 'agenda', tab: 'agenda', title: 'Agenda', value: '', hint: 'Consultas', tone: 'neutral', icon: 'agenda', live: false, score: 0, size: 's' },
  { id: 'pacientes', tab: 'pacientes', title: 'Pacientes', value: '', hint: 'Prontuários', tone: 'neutral', icon: 'pacientes', live: false, score: 0, size: 's' },
  { id: 'financeiro', tab: 'financeiro', title: 'Caixa', value: '', hint: 'Receber', tone: 'neutral', icon: 'financeiro', live: false, score: 0, size: 's' },
  { id: 'documentos', tab: 'documentos', title: 'Papéis', value: '', hint: 'Receita e atestado', tone: 'neutral', icon: 'documentos', live: false, score: 0, size: 's' },
  { id: 'configuracoes', tab: 'configuracoes', title: 'Clínica', value: '', hint: 'Perfil e plano', tone: 'neutral', icon: 'configuracoes', live: false, score: 0, size: 's' },
  { id: 'admin', tab: 'admin', title: 'Equipe', value: '', hint: 'Dentistas', tone: 'neutral', icon: 'admin', live: false, score: 0, size: 's' },
];

export function buildFeatured(facts: ClinicFacts) {
  const total = facts.today.length;
  const done = Math.min(facts.finished + facts.today.filter(({ appointment }) => appointment.status === 'NO_SHOW').length, total);
  if (facts.attending) {
    return {
      label: 'Atendendo',
      hint: patientFirst(facts.attending),
      clock: formatClock(facts.now),
      attending: true,
      done,
      total,
    };
  }
  if (facts.next) {
    const isFirst = facts.finished === 0;
    return {
      label: isFirst ? 'Hoje' : 'Hoje',
      hint: `${patientFirst(facts.next)} ${formatUntil(facts.next.start, facts.now)}`,
      clock: formatClock(facts.now),
      attending: false,
      done,
      total,
    };
  }
  if (total > 0 && facts.remaining.length === 0) {
    return {
      label: 'Hoje',
      hint: facts.todayRevenue > 0 ? `${formatBRL(facts.todayRevenue)} no caixa` : 'Dia encerrado',
      clock: formatClock(facts.now),
      attending: false,
      done,
      total,
    };
  }
  return {
    label: 'Hoje',
    hint: facts.tomorrow.length > 0 ? `Amanhã: ${facts.tomorrow.length}` : 'O dia da clínica',
    clock: formatClock(facts.now),
    attending: false,
    done,
    total,
  };
}

export function deriveControlCenter(
  input: ControlCenterInput,
  options: {
    hiddenLive?: string[];
    pins?: ControlTab[];
    allowAdmin?: boolean;
    maxLive?: number; // default 6
    sizes?: Partial<Record<string, WidgetSize>>;
    order?: string[];
  } = {},
): ControlCenterView {
  const facts = deriveClinicFacts(input);
  const hidden = new Set(options.hiddenLive || []);
  const maxLive = options.maxLive ?? 6;
  const pins = (options.pins || ['dashboard', 'agenda', 'pacientes', 'financeiro']).filter(
    tab => options.allowAdmin || tab !== 'admin',
  );

  const live = buildLiveWidgets(facts)
    .filter(widget => !hidden.has(widget.id))
    .sort((a, b) => b.score - a.score);

  const chosenLive: ControlWidget[] = [];
  const usedTabs = new Set<ControlTab>();
  const usedIds = new Set<string>();

  for (const widget of live) {
    if (chosenLive.length >= maxLive) break;
    if (widget.score < 30 && chosenLive.length >= 2) continue;
    if (usedIds.has(widget.id)) continue;
    if (widget.id === 'agenda' && usedTabs.has('agenda')) continue;
    chosenLive.push(widget);
    usedIds.add(widget.id);
    usedTabs.add(widget.tab);
  }

  const nav = NAV_WIDGETS
    .filter(widget => pins.includes(widget.tab))
    .filter(widget => widget.tab !== 'dashboard')
    .filter(widget => options.allowAdmin || widget.tab !== 'admin')
    .filter(widget => {
      if (widget.tab === 'financeiro' && usedTabs.has('financeiro')) return false;
      if (widget.tab === 'agenda' && chosenLive.some(item => item.tab === 'agenda')) return false;
      return !usedIds.has(widget.id);
    })
    .map(widget => ({ ...widget, score: 0 }));

  const sized = [...chosenLive, ...nav].map(widget => ({
    ...widget,
    size: options.sizes?.[widget.id] || widget.size,
  }));

  const order = options.order || [];
  const widgets = sized.slice().sort((a, b) => {
    const ai = order.indexOf(a.id);
    const bi = order.indexOf(b.id);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return {
    voice: buildControlVoice(facts),
    featured: buildFeatured(facts),
    widgets,
  };
}

export function listHideableLiveWidgets(input: ControlCenterInput, hiddenLive: string[] = []): ControlWidget[] {
  const facts = deriveClinicFacts(input);
  const hidden = new Set(hiddenLive);
  return buildLiveWidgets(facts).filter(widget => hidden.has(widget.id) && widget.score >= 30);
}

export type MobileGlanceChip = {
  id: LiveWidgetId;
  label: string;
  detail: string;
  tone: WidgetTone;
  tab: ControlTab;
  patientId?: number;
};

const MOBILE_GLANCE_ORDER: LiveWidgetId[] = ['sala', 'proximo', 'confirmar', 'recuperar', 'portal'];
const MOBILE_NEXT_WINDOW_MIN = 45;
const MOBILE_GLANCE_LIMIT = 2;

function glanceCopy(widget: ControlWidget): Pick<MobileGlanceChip, 'label' | 'detail'> {
  if (widget.id === 'sala') return { label: widget.value, detail: 'na cadeira' };
  if (widget.id === 'proximo') return { label: widget.hint, detail: widget.value };
  if (widget.id === 'confirmar') {
    return {
      label: widget.value === '1' ? 'Confirmar' : `${widget.value} confirmar`,
      detail: widget.value === '1' ? 'amanhã' : '',
    };
  }
  if (widget.id === 'recuperar') {
    return {
      label: widget.value === '1' ? 'Recuperar' : `${widget.value} recuperar`,
      detail: '',
    };
  }
  if (widget.id === 'portal') {
    return {
      label: widget.value === '1' ? 'Portal' : `${widget.value} no portal`,
      detail: '',
    };
  }
  return { label: widget.title, detail: widget.value };
}

export function pickMobileGlance(input: ControlCenterInput, currentTab?: string): MobileGlanceChip[] {
  const facts = deriveClinicFacts(input);
  const live = buildLiveWidgets(facts);
  const byId = new Map(live.map(widget => [widget.id, widget]));
  const chips: MobileGlanceChip[] = [];

  for (const id of MOBILE_GLANCE_ORDER) {
    if (chips.length >= MOBILE_GLANCE_LIMIT) break;
    const widget = byId.get(id);
    if (!widget) continue;

    if (id === 'proximo') {
      const mins = facts.gapMinutes;
      if (!facts.attending && (mins == null || mins > MOBILE_NEXT_WINDOW_MIN)) continue;
    }
    if (currentTab === 'agenda' && id === 'confirmar') continue;
    if (currentTab === 'dashboard' && id === 'recuperar') continue;
    if (currentTab === 'pacientes' && id === 'portal') continue;

    chips.push({
      id,
      ...glanceCopy(widget),
      tone: widget.tone,
      tab: widget.tab,
      patientId: widget.patientId,
    });
  }

  return chips;
}
