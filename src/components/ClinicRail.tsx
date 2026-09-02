import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Clock,
  DollarSign,
  FileText,
  Home,
  LogOut,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  Users,
  X,
} from '../icons';

export type RailTab =
  | 'dashboard'
  | 'agenda'
  | 'pacientes'
  | 'financeiro'
  | 'documentos'
  | 'configuracoes'
  | 'admin';

export type WidgetId = RailTab | 'amanha';

export type RailAppointment = {
  id: number;
  patient_id: number;
  patient_name: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
};

export type RailMoney = {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: string;
};

export type RailInstallment = {
  status: string;
  amount: number;
};

type TileDef = {
  id: WidgetId;
  label: string;
  icon: typeof Home;
  tab: RailTab;
  wide?: boolean;
  locked?: boolean;
};

const TILES: TileDef[] = [
  { id: 'dashboard', label: 'Hoje', icon: Home, tab: 'dashboard', locked: true, wide: true },
  { id: 'agenda', label: 'Agenda', icon: Calendar, tab: 'agenda' },
  { id: 'pacientes', label: 'Pacientes', icon: Users, tab: 'pacientes' },
  { id: 'financeiro', label: 'Caixa', icon: DollarSign, tab: 'financeiro' },
  { id: 'amanha', label: 'Amanhã', icon: Clock, tab: 'agenda', wide: true },
  { id: 'documentos', label: 'Papéis', icon: FileText, tab: 'documentos' },
  { id: 'configuracoes', label: 'Clínica', icon: Settings, tab: 'configuracoes' },
  { id: 'admin', label: 'Equipe', icon: UserCog, tab: 'admin' },
];

const DEFAULT_PINS: WidgetId[] = ['dashboard', 'agenda', 'pacientes', 'financeiro'];

const storageKey = (userId: string | number) => `odontohub.rail.${userId}`;

function firstNameOf(name?: string | null) {
  const part = (name || '').trim().split(/\s+/)[0];
  return part || '';
}

function greetingForHour(h: number) {
  if (h >= 5 && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function brl(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function hhmm(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function effectiveStatus(app: RailAppointment, now: Date) {
  if (app.status === 'NO_SHOW' || app.status === 'CANCELLED' || app.status === 'FINISHED') return app.status;
  const start = new Date(app.start_time);
  const end = new Date(app.end_time);
  if (now >= end) return 'FINISHED';
  if (now >= start && now < end) return 'IN_PROGRESS';
  return app.status;
}

function minsUntil(target: Date, now: Date) {
  return Math.round((target.getTime() - now.getTime()) / 60_000);
}

type NowKind = 'attending' | 'ready' | 'soon' | 'next' | 'free' | 'done' | 'empty';

export type RoutineSnapshot = {
  pulse: string;
  now: {
    kind: NowKind;
    kicker: string;
    title: string;
    detail: string;
    time: string;
    patientId?: number;
    progress?: { done: number; total: number };
    dark: boolean;
  };
  agenda: { metric: string; hint: string; badge?: number };
  caixa: { metric: string; hint: string };
  pacientes: { metric: string; hint: string; badge?: number };
  amanha: { metric: string; hint: string; badge?: number; relevant: boolean };
  papeis: { metric: string; hint: string };
  clinica: { metric: string; hint: string };
  equipe: { metric: string; hint: string };
};

function buildRoutine(
  now: Date,
  args: {
    displayName: string;
    clinicLine: string;
    appointments: RailAppointment[];
    transactions: RailMoney[];
    installments: RailInstallment[];
    patientsCount: number;
    portalPendingCount: number;
  },
): RoutineSnapshot {
  const {
    displayName,
    clinicLine,
    appointments,
    transactions,
    installments,
    patientsCount,
    portalPendingCount,
  } = args;

  const today = appointments.filter(a => sameDay(new Date(a.start_time), now) && a.status !== 'CANCELLED');
  const activeToday = today.filter(a => {
    const s = effectiveStatus(a, now);
    return s !== 'FINISHED' && s !== 'NO_SHOW';
  });
  const doneToday = today.filter(a => effectiveStatus(a, now) === 'FINISHED').length;
  const attending = activeToday.find(a => effectiveStatus(a, now) === 'IN_PROGRESS');
  const upcoming = activeToday
    .filter(a => new Date(a.start_time) >= now || effectiveStatus(a, now) === 'IN_PROGRESS')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  const next = attending || upcoming[0];

  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(now.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const tomorrow = appointments.filter(a => {
    const d = new Date(a.start_time);
    return d >= tomorrowStart && d <= tomorrowEnd && a.status !== 'CANCELLED';
  });
  const tomorrowOpen = tomorrow.filter(a => a.status !== 'CONFIRMED').length;

  const todayStr = now.toLocaleDateString('en-CA');
  const todayIncome = transactions
    .filter(t => t.type === 'INCOME' && t.date?.split('T')[0] === todayStr)
    .reduce((acc, t) => acc + Number(t.amount), 0);
  const toReceive = installments
    .filter(i => i.status === 'PENDING' || i.status === 'OVERDUE')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const hour = now.getHours();
  const remaining = activeToday.length;
  const progress = today.length > 0 ? { done: doneToday, total: today.length } : undefined;

  let kind: NowKind = 'free';
  if (patientsCount === 0) kind = 'empty';
  else if (attending) kind = 'attending';
  else if (next) {
    const mins = minsUntil(new Date(next.start_time), now);
    if (mins <= 0) kind = 'ready';
    else if (mins <= 20) kind = 'soon';
    else kind = 'next';
  } else if (today.length > 0) kind = 'done';

  const who = firstNameOf(next?.patient_name) || 'Paciente';
  const nextTime = next ? hhmm(new Date(next.start_time)) : hhmm(now);
  const procedure = (next?.notes || '').trim() || 'Consulta';

  const nowCard: RoutineSnapshot['now'] = {
    kind,
    kicker: 'Hoje',
    title: 'Agenda livre',
    detail: hour < 12 ? 'Manhã aberta na cadeira' : hour < 18 ? 'Nenhuma cadeira ocupada' : 'Expediente em silêncio',
    time: hhmm(now),
    patientId: next?.patient_id,
    progress,
    dark: kind === 'attending' || kind === 'ready',
  };

  if (kind === 'empty') {
    nowCard.kicker = 'Começar';
    nowCard.title = 'Esperando um nome';
    nowCard.detail = 'O primeiro paciente abre o resto';
  } else if (kind === 'attending') {
    nowCard.kicker = 'Na cadeira';
    nowCard.title = who;
    nowCard.detail = procedure;
    nowCard.time = nextTime;
  } else if (kind === 'ready') {
    nowCard.kicker = 'Na porta';
    nowCard.title = who;
    nowCard.detail = procedure;
    nowCard.time = nextTime;
  } else if (kind === 'soon') {
    const m = Math.max(1, minsUntil(new Date(next!.start_time), now));
    nowCard.kicker = `Em ${m} min`;
    nowCard.title = who;
    nowCard.detail = procedure;
    nowCard.time = nextTime;
  } else if (kind === 'next') {
    nowCard.kicker = 'Próxima';
    nowCard.title = who;
    nowCard.detail = `${nextTime} · ${procedure}`;
    nowCard.time = nextTime;
  } else if (kind === 'done') {
    nowCard.kicker = 'Encerrada';
    nowCard.title = 'Cadeira livre';
    nowCard.detail = tomorrow.length
      ? `Amanhã · ${tomorrow.length} consulta${tomorrow.length === 1 ? '' : 's'}`
      : 'O dia da sala acabou';
  }

  let pulse = `${greetingForHour(hour)}, ${displayName}.`;
  if (kind === 'attending') pulse = `A sala é da ${who} agora.`;
  else if (kind === 'ready') pulse = `${who} já pode entrar.`;
  else if (kind === 'soon') {
    const m = Math.max(1, minsUntil(new Date(next!.start_time), now));
    pulse = `Faltam ${m} min para ${who}.`;
  } else if (kind === 'empty') pulse = 'A clínica ainda vai ganhar o primeiro nome.';
  else if (portalPendingCount > 0) {
    pulse = portalPendingCount === 1
      ? '1 pedido esperando no portal.'
      : `${portalPendingCount} pedidos esperando no portal.`;
  } else if (hour >= 16 && tomorrowOpen > 0) {
    pulse = tomorrowOpen === 1
      ? 'Amanhã tem 1 consulta sem confirmar.'
      : `Amanhã: ${tomorrowOpen} ainda sem confirmar.`;
  } else if (kind === 'next') pulse = `Próxima às ${nextTime}.`;
  else if (kind === 'done') pulse = tomorrow.length ? 'Hoje acabou. Olha o amanhã.' : 'Cadeira encerrada por hoje.';
  else if (hour < 12) pulse = 'Manhã livre na cadeira.';
  else pulse = 'Ninguém na cadeira por agora.';

  const laterCount = Math.max(0, remaining - (next ? 1 : 0));
  const agenda = remaining === 0
    ? { metric: 'Livre', hint: today.length ? 'Dia cumprido' : 'Nada marcado', badge: undefined as number | undefined }
    : next
      ? { metric: nextTime, hint: laterCount > 0 ? `${who} · ${laterCount} depois` : who, badge: remaining }
      : { metric: String(remaining), hint: remaining === 1 ? 'pela frente' : 'pela frente', badge: remaining };

  const caixa = todayIncome > 0
    ? { metric: brl(todayIncome), hint: 'hoje' }
    : toReceive > 0
      ? { metric: brl(toReceive), hint: 'a receber' }
      : { metric: 'R$ 0', hint: 'hoje' };

  const pacientes = portalPendingCount > 0
    ? { metric: String(portalPendingCount), hint: portalPendingCount === 1 ? 'no portal' : 'no portal', badge: portalPendingCount }
    : patientsCount === 0
      ? { metric: '—', hint: 'sem prontuário' }
      : { metric: String(patientsCount), hint: patientsCount === 1 ? 'na base' : 'na base', badge: undefined };

  const amanha = {
    metric: tomorrow.length === 0 ? 'Livre' : `${tomorrow.length}`,
    hint: tomorrow.length === 0
      ? 'Nada amanhã ainda'
      : tomorrowOpen > 0
        ? `${tomorrowOpen} sem confirmar`
        : tomorrow.length === 1
          ? 'confirmada'
          : 'consultas',
    badge: tomorrowOpen || undefined,
    relevant: tomorrow.length > 0,
  };

  return {
    pulse,
    now: nowCard,
    agenda,
    caixa,
    pacientes,
    amanha,
    papeis: { metric: 'Receita', hint: 'Atestado e ficha' },
    clinica: { metric: 'Clínica', hint: clinicLine },
    equipe: { metric: 'Equipe', hint: 'Dentistas' },
  };
}

function liveFor(id: WidgetId, routine: RoutineSnapshot): { metric: string; hint: string; badge?: number } {
  switch (id) {
    case 'agenda': return routine.agenda;
    case 'financeiro': return routine.caixa;
    case 'pacientes': return routine.pacientes;
    case 'amanha': return routine.amanha;
    case 'documentos': return routine.papeis;
    case 'configuracoes': return routine.clinica;
    case 'admin': return routine.equipe;
    default: return { metric: '', hint: '' };
  }
}

function loadPins(userId: string | number | undefined, allowAdmin: boolean): WidgetId[] {
  const allowed = new Set(TILES.filter(t => allowAdmin || t.id !== 'admin').map(t => t.id));
  if (userId != null) {
    try {
      const raw = localStorage.getItem(storageKey(userId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const pins = parsed.filter((id: string) => allowed.has(id as WidgetId)) as WidgetId[];
          if (!pins.includes('dashboard')) pins.unshift('dashboard');
          if (pins.length) return pins;
        }
      }
    } catch {
      /* keep defaults */
    }
  }
  return DEFAULT_PINS.filter(id => allowed.has(id));
}

interface ClinicRailProps {
  activeTab: string;
  setActiveTab: (tab: RailTab) => void;
  setIsSidebarOpen: (open: boolean) => void;
  navigate: (path: string) => void;
  isSidebarOpen: boolean;
  user: { id?: number | string; name?: string; role?: string } | null;
  profile: {
    name?: string;
    photo_url?: string;
    clinic_name?: string;
    cro?: string;
    specialty?: string;
  } | null;
  isAdmin?: boolean;
  onLogout: () => void;
  appointments?: RailAppointment[];
  transactions?: RailMoney[];
  installments?: RailInstallment[];
  patientsCount?: number;
  portalPendingCount?: number;
  onOpenPatient?: (id: number) => void;
  onNewAppointment?: () => void;
}

export function ClinicRail({
  activeTab,
  setActiveTab,
  setIsSidebarOpen,
  navigate,
  isSidebarOpen,
  user,
  profile,
  isAdmin = false,
  onLogout,
  appointments = [],
  transactions = [],
  installments = [],
  patientsCount = 0,
  portalPendingCount = 0,
  onOpenPatient,
  onNewAppointment,
}: ClinicRailProps) {
  const [editing, setEditing] = useState(false);
  const [pins, setPins] = useState<WidgetId[]>(() => loadPins(user?.id, isAdmin));
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    setPins(loadPins(user?.id, isAdmin));
  }, [user?.id, isAdmin]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const persist = useCallback(
    (next: WidgetId[]) => {
      setPins(next);
      if (user?.id != null) localStorage.setItem(storageKey(user.id), JSON.stringify(next));
    },
    [user?.id],
  );

  const catalog = useMemo(
    () => TILES.filter(t => isAdmin || t.id !== 'admin'),
    [isAdmin],
  );

  const displayName = firstNameOf(profile?.name || user?.name) || 'Doutor';
  const clinicLine = profile?.clinic_name || (profile?.cro ? `CRO ${profile.cro}` : profile?.specialty) || 'Sua clínica';

  const routine = useMemo(
    () => buildRoutine(now, {
      displayName,
      clinicLine,
      appointments,
      transactions,
      installments,
      patientsCount,
      portalPendingCount,
    }),
    [now, displayName, clinicLine, appointments, transactions, installments, patientsCount, portalPendingCount],
  );

  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || user?.id == null) return;
    if (localStorage.getItem(storageKey(user.id))) {
      seededRef.current = true;
      return;
    }
    if (!routine.amanha.relevant) return;
    seededRef.current = true;
    persist(['dashboard', 'agenda', 'amanha', 'pacientes', 'financeiro']);
  }, [user?.id, routine.amanha.relevant, persist]);

  const restPins = pins
    .filter(id => id !== 'dashboard')
    .map(id => catalog.find(t => t.id === id))
    .filter(Boolean) as TileDef[];

  const unusedTiles = useMemo(() => {
    const unused = catalog.filter(t => t.id !== 'dashboard' && !pins.includes(t.id));
    unused.sort((a, b) => {
      const score = (id: WidgetId) => {
        if (id === 'amanha' && routine.amanha.relevant) return 0;
        if (id === 'documentos') return 2;
        if (id === 'configuracoes') return 3;
        return 1;
      };
      return score(a.id) - score(b.id);
    });
    return unused;
  }, [catalog, pins, routine.amanha.relevant]);

  const goTab = (tab: RailTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
    navigate('/');
  };

  const activate = (tile: TileDef) => {
    if (editing) return;
    goTab(tile.tab);
  };

  const onHero = () => {
    if (editing) return;
    const { kind, patientId } = routine.now;
    if ((kind === 'attending' || kind === 'ready') && patientId && onOpenPatient) {
      setIsSidebarOpen(false);
      onOpenPatient(patientId);
      return;
    }
    if (kind === 'empty') {
      goTab('pacientes');
      return;
    }
    if (kind === 'free' && onNewAppointment) {
      setIsSidebarOpen(false);
      onNewAppointment();
      return;
    }
    goTab('dashboard');
  };

  const togglePin = (id: WidgetId) => {
    if (id === 'dashboard') return;
    if (pins.includes(id)) persist(pins.filter(p => p !== id));
    else persist([...pins, id]);
  };

  const onDrop = (target: WidgetId) => {
    if (!dragging || dragging === target || target === 'dashboard') return;
    const next = pins.filter(p => p !== dragging);
    const at = next.indexOf(target);
    next.splice(at < 0 ? next.length : at, 0, dragging);
    if (!next.includes('dashboard')) next.unshift('dashboard');
    persist(next);
    setDragging(null);
  };

  const hour = now.getHours();
  const heroOn = routine.now.dark || activeTab === 'dashboard';
  const heroLetter = (routine.now.kind === 'empty' ? displayName : routine.now.title).charAt(0).toUpperCase();

  const widthClass = isSidebarOpen
    ? 'translate-x-0 w-[19.5rem]'
    : '-translate-x-full w-[19.5rem] tablet-l:w-[5.25rem] desktop:w-[19.5rem]';

  const tileClass = (on: boolean, extra = '') =>
    `relative flex flex-col text-left rounded-[26px] transition-colors duration-200 ${extra} ${
      on ? 'clinic-cc-tile-on text-white' : 'clinic-cc-tile text-[#1d1d1f] hover:bg-white'
    } ${editing ? 'clinic-cc-jiggle' : ''}`;

  return (
    <aside
      className={`
        clinic-control-rail
        fixed inset-y-0 left-0 z-[110] flex flex-col
        transition-all duration-300 ease-in-out tablet-l:static tablet-l:translate-x-0 no-print
        ${widthClass}
      `}
    >
      <div className="flex items-start justify-between px-4 pt-6 pb-3 desktop:px-5">
        <div className="min-w-0 tablet-l:hidden desktop:block pr-2">
          <p className="text-[12px] text-[#86868b] tracking-[-0.011em]">
            {greetingForHour(hour)}, {displayName}
          </p>
          <p className="apple-display-ink text-[22px] leading-[1.15] mt-1.5">
            {routine.pulse}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="tablet-l:hidden text-[#86868b] p-1 -mr-1"
          aria-label="Fechar"
        >
          <Plus size={22} className="rotate-45" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 desktop:px-4 pb-3 no-scrollbar">
        <button
          type="button"
          onClick={onHero}
          className={tileClass(
            heroOn,
            'w-full min-h-[128px] p-4 tablet-l:min-h-[52px] tablet-l:items-center tablet-l:justify-center tablet-l:p-2 desktop:items-stretch desktop:min-h-[128px] desktop:p-4',
          )}
        >
          <div className="flex w-full items-center justify-between tablet-l:justify-center desktop:justify-between">
            <span className={`tablet-l:hidden desktop:block text-[12px] tracking-[-0.011em] ${heroOn ? 'text-white/55' : 'text-[#86868b]'}`}>
              {routine.now.kicker}
            </span>
            <span
              className={`
                hidden tablet-l:flex desktop:hidden w-8 h-8 rounded-full items-center justify-center text-[13px] font-semibold
                ${heroOn ? 'bg-white/15 text-white' : 'bg-[#f5f5f7] text-[#1d1d1f]'}
              `}
            >
              {heroLetter}
            </span>
            <span className={`tablet-l:hidden desktop:block text-[15px] font-semibold tabular-nums ${heroOn ? 'text-white' : 'text-[#1d1d1f]'}`}>
              {routine.now.time}
            </span>
          </div>
          <div className="tablet-l:hidden desktop:block mt-3 min-w-0">
            <p className="text-[26px] font-semibold tracking-[-0.025em] leading-[1.05] truncate">
              {routine.now.title}
            </p>
            <p className={`text-[13px] mt-1 truncate ${heroOn ? 'text-white/55' : 'text-[#86868b]'}`}>
              {routine.now.detail}
            </p>
            {routine.now.progress && routine.now.progress.total > 0 && (
              <div className="mt-3.5">
                <div className={heroOn ? 'clinic-cc-progress' : 'clinic-cc-progress clinic-cc-progress-light'}>
                  <span style={{ width: `${Math.round((routine.now.progress.done / routine.now.progress.total) * 100)}%` }} />
                </div>
                <p className={`text-[11px] mt-1.5 ${heroOn ? 'text-white/45' : 'text-[#86868b]'}`}>
                  {routine.now.progress.done} de {routine.now.progress.total}
                </p>
              </div>
            )}
          </div>
        </button>

        <div className="grid grid-cols-2 tablet-l:grid-cols-1 desktop:grid-cols-2 gap-2.5 mt-2.5">
          {restPins.map(tile => {
            const active = activeTab === tile.tab && tile.id !== 'amanha';
            const Icon = tile.icon;
            const live = liveFor(tile.id, routine);
            const span = tile.wide ? 'col-span-2 tablet-l:col-span-1 desktop:col-span-2' : '';
            return (
              <button
                key={tile.id}
                type="button"
                draggable={editing}
                onDragStart={() => setDragging(tile.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => onDrop(tile.id)}
                onClick={() => (editing ? togglePin(tile.id) : activate(tile))}
                className={tileClass(
                  active,
                  `${span} min-h-[104px] p-3.5 items-start justify-between tablet-l:min-h-[52px] tablet-l:items-center tablet-l:justify-center tablet-l:p-2 desktop:items-start desktop:min-h-[104px] desktop:p-3.5`,
                )}
              >
                {editing && (
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#ff3b30] text-white flex items-center justify-center z-10">
                    <X size={11} />
                  </span>
                )}
                <div className="flex w-full items-center justify-between tablet-l:justify-center desktop:justify-between">
                  <Icon size={20} className={active ? 'text-white' : 'text-[#1d1d1f]'} />
                  {live.badge != null && live.badge > 0 && (
                    <span
                      className={`
                        tablet-l:absolute tablet-l:top-1 tablet-l:right-1 desktop:static
                        min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold flex items-center justify-center
                        ${active ? 'bg-white/20 text-white' : 'bg-[#0071e3] text-white'}
                      `}
                    >
                      {live.badge}
                    </span>
                  )}
                </div>
                <div className="tablet-l:hidden desktop:block min-w-0 w-full mt-3">
                  <p className="text-[11px] tracking-[-0.011em] opacity-70">{tile.label}</p>
                  <p className="text-[17px] font-semibold tracking-[-0.022em] leading-tight truncate mt-0.5">
                    {live.metric}
                  </p>
                  <p className={`text-[11px] mt-0.5 truncate ${active ? 'text-white/55' : 'text-[#86868b]'}`}>
                    {live.hint}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {editing && unusedTiles.length > 0 && (
          <div className="mt-7 tablet-l:hidden desktop:block">
            <p className="text-[12px] text-[#86868b] px-1 mb-2.5">Adicionar à sua central</p>
            <div className="grid grid-cols-2 gap-2.5">
              {unusedTiles.map(tile => {
                const Icon = tile.icon;
                const live = liveFor(tile.id, routine);
                const span = tile.wide ? 'col-span-2' : '';
                return (
                  <button
                    key={tile.id}
                    type="button"
                    onClick={() => togglePin(tile.id)}
                    className={`clinic-cc-tile-add relative flex flex-col items-start justify-between text-left rounded-[26px] min-h-[96px] p-3.5 text-[#86868b] ${span}`}
                  >
                    <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-[#30d158] text-white flex items-center justify-center">
                      <Plus size={11} />
                    </span>
                    <Icon size={20} />
                    <div className="mt-3 min-w-0 w-full">
                      <span className="text-[13px] font-semibold text-[#1d1d1f]">{tile.label}</span>
                      <p className="text-[11px] mt-0.5 truncate">{live.hint || live.metric}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 desktop:px-4 pb-6 pt-2 space-y-1.5">
        <button
          type="button"
          onClick={() => {
            if (editing) persist(pins);
            setEditing(v => !v);
          }}
          className="hidden desktop:block w-full text-[13px] text-[#0071e3] text-left px-1 py-2"
        >
          {editing ? 'OK' : 'Personalizar'}
        </button>

        <button
          type="button"
          onClick={() => goTab('configuracoes')}
          className={`w-full flex items-center gap-3 rounded-[22px] px-2 py-2 text-left ${
            activeTab === 'configuracoes' ? 'clinic-cc-tile' : 'hover:bg-white/50'
          }`}
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-white flex items-center justify-center text-[#86868b] shrink-0">
            {profile?.photo_url ? (
              <img src={profile.photo_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          <div className="min-w-0 tablet-l:hidden desktop:block">
            <p className="text-[13px] font-semibold text-[#1d1d1f] truncate">{profile?.name || user?.name}</p>
            <p className="text-[11px] text-[#86868b] truncate">{clinicLine}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-2 py-2 text-[#86868b] hover:text-[#ff3b30] rounded-[18px]"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="text-[13px] tablet-l:hidden desktop:block">Sair</span>
        </button>
      </div>
    </aside>
  );
}
