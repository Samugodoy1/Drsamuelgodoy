import React, { useEffect, useRef, useState } from 'react';
import { ClipboardList, MessageCircle, Calendar, CalendarPlus, ChevronRight, UserX, TrendingUp, Sparkles, X, UserPlus, ArrowRight, Check, Users, DollarSign, FileText, Stethoscope, Plus } from '../icons';
import { AnimatePresence, motion } from 'framer-motion';
import { API_URL } from '../config';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatientIntelligence {
  patient_id: number;
  patient_name: string;
  phone: string;
  photo_url: string | null;
  status: 'EM_TRATAMENTO' | 'ABANDONO' | 'ATENCAO' | 'FINALIZADO';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  priority_reason: string;
  last_visit_date: string | null;
  next_appointment_date: string | null;
  next_appointment_notes: string | null;
  days_since_last_visit: number | null;
  has_active_treatment: boolean;
  has_future_appointment: boolean;
  pending_teeth: number[];
  urgent_teeth: number[];
}

interface DashboardIntelligence {
  needsActionToday: PatientIntelligence[];
  abandonmentRisk: PatientIntelligence[];
  attentionNeeded: PatientIntelligence[];
  stats: {
    totalPatients: number;
    inTreatment: number;
    attention: number;
    abandonment: number;
    completed: number;
  };
}

interface SchedulingSuggestion {
  patient: PatientIntelligence;
  suggested_slot: { date: string; start: string; end: string };
  reason: string;
  procedure: string | null;
  duration_minutes: number;
  behavior?: {
    preferred_hour: number | null;
    attendance_rate: number | null;
    avg_interval_days: number | null;
    estimated_value: number | null;
    confidence_label: string | null;
    insight: string | null;
  };
}

interface ReminderAppointment {
  id: number;
  patient_id: number;
  patient_name: string;
  start_time: string;
  end_time: string;
  notes?: string;
  status: string;
}

interface DashboardProps {
  user: any;
  patients: any[];
  appointments: any[];
  nextAppointments: any[];
  todayAppointmentsRemainingCount: number;
  totalAppointmentsCount: number;
  tomorrowUnconfirmedCount: number;
  tomorrowUnconfirmedAppointments: ReminderAppointment[];
  todayRevenue: number;
  openPatientRecord: (id: number) => void;
  setIsModalOpen: (open: boolean) => void;
  setActiveTab: (tab: any) => void;
  sendReminder: (appointment: any) => void;
  onReschedule?: (appointment: any) => void;
  onSchedulePatient?: (patientId: number, date: string, startTime: string, endTime: string, procedure?: string | null) => void;
  onDismissOnboarding: () => void;
  onDismissWelcome: () => void;
  product: string;
  portalPendingCount?: number;
  onOpenPortalInbox?: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const priorityConfig = {
  HIGH:   { label: 'Urgente',   bg: 'bg-rose-50',    text: 'text-rose-700' },
  MEDIUM: { label: 'Atenção',   bg: 'bg-amber-50',   text: 'text-amber-700' },
  LOW:    { label: 'Normal',    bg: 'bg-emerald-50',  text: 'text-emerald-700' },
};

const statusLabels: Record<string, string> = {
  EM_TRATAMENTO: 'Em tratamento',
  ABANDONO: 'Risco de abandono',
  ATENCAO: 'Precisa de atenção',
  FINALIZADO: 'Concluído',
};

function formatDaysAgo(days: number | null): string {
  if (days === null) return 'Sem visitas';
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
  const months = Math.floor(days / 30);
  if (days < 365) return `${months} ${months === 1 ? 'mês' : 'meses'} atrás`;
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? 'ano' : 'anos'} atrás`;
}

function openWhatsApp(phone: string, name: string) {
  if (!phone) return;
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10 || cleaned.length === 11) cleaned = `55${cleaned}`;
  else if (cleaned.length > 11 && !cleaned.startsWith('55')) cleaned = `55${cleaned}`;
  const firstName = (name || '').split(' ')[0] || 'Olá';
  const message = `Olá ${firstName}, tudo bem? Notamos que faz um tempo desde sua última consulta. Gostaríamos de agendar um retorno.`;
  window.open(`https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`, '_blank');
}

// ─── Component ───────────────────────────────────────────────────────────────

export const Dashboard: React.FC<DashboardProps> = ({
  user,
  patients = [],
  appointments = [],
  nextAppointments = [],
  todayAppointmentsRemainingCount = 0,
  totalAppointmentsCount = 0,
  tomorrowUnconfirmedCount = 0,
  tomorrowUnconfirmedAppointments = [],
  todayRevenue = 0,
  openPatientRecord,
  setIsModalOpen,
  setActiveTab,
  sendReminder,
  onReschedule,
  onSchedulePatient,
  onDismissOnboarding,
  onDismissWelcome,
  product,
  portalPendingCount = 0,
  onOpenPortalInbox
}) => {
  const [intelligence, setIntelligence] = useState<DashboardIntelligence | null>(null);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchIntelligence = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Accept': 'application/json', 'x-product': product };
        if (token && token !== 'null') {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-auth-token'] = token;
        }
        const [dashRes, schedRes] = await Promise.all([
          fetch(`${API_URL}/api/intelligence/dashboard`, { headers }),
          fetch(`${API_URL}/api/intelligence/scheduling`, { headers }),
        ]);
        if (dashRes.ok && !cancelled) {
          setIntelligence(await dashRes.json());
        }
        if (schedRes.ok && !cancelled) {
          const data = await schedRes.json();
          if (Array.isArray(data)) setSchedulingSuggestions(data);
        }
      } catch (e) {
        console.error('Dashboard intelligence fetch failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchIntelligence();
    return () => { cancelled = true; };
  }, []);

  const nextPatient = nextAppointments[0];
  const otherAppointments = nextAppointments.slice(1, 5);

  const openReminderModal = () => {
    if (tomorrowUnconfirmedAppointments.length === 0) return;
    setIsReminderModalOpen(true);
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: 'Bom dia', emoji: '☀️' };
    if (hour < 18) return { text: 'Boa tarde', emoji: '👋🏻' };
    return { text: 'Boa noite', emoji: '🌙' };
  };
  const timeGreeting = getTimeGreeting();

  const getGreetingName = () => {
    const name = user?.name || '';
    return name.replace(/^(Dr\.|Dra\.|Dr|Dra)\s+/i, '').split(' ')[0];
  };

  const getSmartMessage = () => {
    const hour = new Date().getHours();
    const urgentCount = intelligence?.needsActionToday?.length || 0;
    const abandonCount = intelligence?.abandonmentRisk?.length || 0;
    const remaining = todayAppointmentsRemainingCount;
    const suggestionsCount = schedulingSuggestions.length;

    // Use a daily seed so the variant stays consistent throughout the day
    const daySeed = new Date().toISOString().slice(0, 10);
    const pick = (arr: string[]) => arr[
      Math.abs([...daySeed].reduce((a, c) => a + c.charCodeAt(0), 0)) % arr.length
    ];

    // Priority 1 — urgent patients
    if (urgentCount > 0) {
      return pick(urgentCount === 1
        ? [
            'Tem um paciente que precisa de você agora.',
            'Um paciente está esperando — vamos cuidar dele?',
          ]
        : [
            `${urgentCount} pacientes contando com você hoje.`,
            `Separei ${urgentCount} casos que pedem sua atenção.`,
          ]);
    }

    // Priority 2 — abandonment risk
    if (abandonCount > 0) {
      return pick(abandonCount === 1
        ? [
            'Um paciente sumiu do radar. Uma mensagem resolve.',
            'Tem alguém que não volta faz tempo — lembrar dele?',
          ]
        : [
            `${abandonCount} pacientes sentem sua falta.`,
            `Olha, ${abandonCount} pacientes pararam de vir — dá pra recuperar.`,
          ]);
    }

    // Priority 3 — empty agenda with suggestions
    if (remaining === 0 && suggestionsCount > 0) {
      return pick([
        'Agenda vazia, mas achei encaixes perfeitos pra você.',
        `Sem consultas agora — mas tenho ${suggestionsCount} ideia${suggestionsCount > 1 ? 's' : ''}.`,
      ]);
    }

    // Priority 4 — empty agenda
    if (remaining === 0) {
      if (hour < 12) return pick([
        'Manhã livre. Que tal organizar a semana?',
        'Sem pressa hoje — aproveita pra respirar.',
      ]);
      if (hour < 18) return pick([
        'Tarde tranquila. Bom momento pra revisar prontuários.',
        'Nada na agenda — raro, né? Aproveita.',
      ]);
      return pick([
        'Dia encerrado. Você mandou bem, descansa.',
        'Tudo feito. Até amanhã!',
      ]);
    }

    // Priority 5 — last patient
    if (remaining === 1) {
      return pick([
        'Último paciente. A reta final é sua.',
        'Falta só 1 — depois disso, o dia é todo seu.',
      ]);
    }

    // Priority 6 — few patients
    if (remaining <= 3) {
      return pick([
        `Só mais ${remaining}. Você está voando hoje.`,
        `${remaining} atendimentos e acabou — quase lá.`,
        `Mais ${remaining} e o dia está feito. Tá indo bem.`,
      ]);
    }

    // Priority 7 — busy day
    return pick([
      `${remaining} pacientes pela frente. Dia cheio, bora!`,
      `Agenda forte: ${remaining} consultas. Você dá conta.`,
      `${remaining} atendimentos hoje. Foco e café.`,
    ]);
  };

  const getInsightCard = (): { text: string; icon: React.ReactNode; accent: string } | null => {
    const abandonCount = intelligence?.abandonmentRisk?.length || 0;
    const suggestionsCount = schedulingSuggestions.length;
    const remaining = todayAppointmentsRemainingCount;
    const unconfirmed = tomorrowUnconfirmedCount;
    const revenue = todayRevenue || 0;

    // 1 — Encaixes inteligentes disponíveis
    if (remaining === 0 && suggestionsCount > 0) {
      return {
        text: suggestionsCount === 1
          ? 'Achei um horário perfeito pra encaixar um paciente que precisa voltar.'
          : `Encontrei ${suggestionsCount} encaixes inteligentes. Quer que eu mostre?`,
        icon: <Sparkles size={16} />,
        accent: 'violet',
      };
    }

    // 2 — Risco de abandono
    if (abandonCount >= 2) {
      return {
        text: `${abandonCount} pacientes sumiram — uma mensagem rápida pode mudar isso.`,
        icon: <UserX size={16} />,
        accent: 'rose',
      };
    }
    if (abandonCount === 1) {
      return {
        text: 'Um paciente parou de vir. Um "oi" resolve mais do que parece.',
        icon: <UserX size={16} />,
        accent: 'rose',
      };
    }

    // 3 — Confirmações pendentes
    if (unconfirmed >= 2) {
      return {
        text: `${unconfirmed} pacientes de amanhã ainda não confirmaram. Manda lembrete agora?`,
        icon: <MessageCircle size={16} />,
        accent: 'amber',
      };
    }
    if (unconfirmed === 1) {
      return {
        text: '1 consulta de amanhã sem confirmação. Vale mandar um lembrete.',
        icon: <MessageCircle size={16} />,
        accent: 'amber',
      };
    }

    // 4 — Dia encerrado com receita
    if (revenue > 0 && remaining === 0) {
      return {
        text: `Dia fechado com ${revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Bom trabalho.`,
        icon: <TrendingUp size={16} />,
        accent: 'emerald',
      };
    }

    // 5 — Nenhum insight relevante
    return null;
  };

  const insightCard = !loading ? getInsightCard() : null;

  const getEffectiveStatus = (appointment: any): string => {
    const now = new Date();
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    if (now >= endTime) return 'FINISHED';
    if (now >= startTime && now < endTime) return 'IN_PROGRESS';
    return appointment.status;
  };

  const getStatusBadge = (appointment: any) => {
    const status = getEffectiveStatus(appointment);
    switch (status) {
      case 'CONFIRMED': return { label: 'Confirmado', className: 'bg-[#F0F9F4] text-[#2B8A56]' };
      case 'IN_PROGRESS': return { label: 'Em atendimento', className: 'bg-[#EAF4FF] text-[#1E6ED6]' };
      case 'FINISHED': return { label: 'Finalizado', className: 'bg-[#F9FAFB] text-[#9CA3AF]' };
      case 'CANCELLED': return { label: 'Cancelado', className: 'bg-[#FDECEF] text-[#C53030]' };
      default: return { label: 'Agendado', className: 'bg-[#F9FAFB] text-[#6B7280]' };
    }
  };

  const getCountdown = (appointment: any): string => {
    const start = new Date(appointment.start_time);
    const diffMs = start.getTime() - now.getTime();
    const diffMin = Math.round(diffMs / 60_000);
    if (diffMin <= 0) return 'Em andamento';
    if (diffMin < 60) return `em ${diffMin} min`;
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return m > 0 ? `em ${h}h ${m}min` : `em ${h}h`;
  };

  // ─── Intelligence patient row ───────────────────────────────────────────

  const renderIntelligencePatient = (p: PatientIntelligence, showPriority = true) => {
    const cfg = priorityConfig[p.priority];
    const dotColor = showPriority
      ? 'bg-rose-400'
      : 'bg-amber-400';
    return (
      <motion.div
        key={p.patient_id}
        whileTap={{ backgroundColor: 'var(--academy-bg)' }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-4 p-5 cursor-pointer border-b border-[#C6C6C8]/5 last:border-b-0"
        onClick={() => openPatientRecord(p.patient_id)}
      >
        <div className="relative">
          <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden border border-primary/20 shrink-0">
            {p.photo_url ? (
              <img src={p.photo_url} alt={p.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              (p.patient_name || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full ${dotColor} border-2 border-white`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-academy-text truncate">{p.patient_name}</p>
          <p className="text-[12px] text-academy-muted mt-0.5 truncate">
            {formatDaysAgo(p.days_since_last_visit)} · {statusLabels[p.status] || p.status}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {showPriority && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
          )}
          {p.phone && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openWhatsApp(p.phone, p.patient_name); }}
              className="w-[44px] h-[44px] flex items-center justify-center rounded-xl text-academy-muted hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="WhatsApp"
            >
              <MessageCircle size={15} />
            </button>
          )}
          <ChevronRight size={16} className="text-[#C6C6C8]" />
        </div>
      </motion.div>
    );
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  // ─── Onboarding: welcome + guided setup ──────────────────────────────
  const hasPatients = patients.length > 0;
  const hasAppointments = totalAppointmentsCount > 0;
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => user?.onboarding_done ?? false);
  const [welcomeSeen, setWelcomeSeen] = useState(() => user?.welcome_seen ?? false);
  const wasInOnboarding = useRef(!hasPatients || !hasAppointments);
  const showOnboarding = !onboardingDismissed && (
    !hasPatients || !hasAppointments || wasInOnboarding.current
  );

  const completedSteps = (hasPatients ? 1 : 0) + (hasAppointments ? 1 : 0);
  const step3Active = hasPatients && hasAppointments;
  const totalSteps = 3;

  // ─── Welcome Screen (first contact — before onboarding) ────────────
  if (!welcomeSeen && !hasPatients && !hasAppointments && !onboardingDismissed) {
    return (
      <div className="flex flex-col gap-10 pb-32 pt-8 px-2 max-w-2xl mx-auto">
        {/* Identity */}
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-4 pt-6"
        >
          <div className="w-16 h-16 bg-primary rounded-[20px] flex items-center justify-center text-white shadow-lg shadow-primary/20 mx-auto">
            <Stethoscope size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-[32px] font-bold tracking-tight text-academy-text">
              Bem-vindo ao OdontoHub
            </h1>
            <p className="text-[17px] text-academy-muted leading-relaxed max-w-md mx-auto">
              Seu consultório organizado em um só lugar: pacientes, agenda, prontuários e financeiro.
            </p>
          </div>
        </motion.header>

        {/* How it works — the mental model */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-[13px] font-bold text-academy-muted uppercase tracking-widest px-2">
            Como funciona
          </h2>
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.03)] divide-y divide-slate-50">
            {[
              {
                icon: <UserPlus size={20} className="text-primary" />,
                bg: 'bg-primary/10',
                title: 'Cadastre seus pacientes',
                desc: 'Prontuário, odontograma e histórico completo em um só lugar.',
              },
              {
                icon: <Calendar size={20} className="text-academy-primary" />,
                bg: 'bg-academy-soft',
                title: 'Organize sua agenda',
                desc: 'Agende consultas e o sistema envia lembretes automáticos.',
              },
              {
                icon: <ClipboardList size={20} className="text-sky-600" />,
                bg: 'bg-sky-50',
                title: 'Atenda e registre',
                desc: 'Evolução clínica, procedimentos e plano de tratamento.',
              },
              {
                icon: <DollarSign size={20} className="text-emerald-600" />,
                bg: 'bg-emerald-50',
                title: 'Controle financeiro',
                desc: 'Receitas, despesas e parcelamentos sem planilha.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-5">
                <div className={`w-10 h-10 ${item.bg} rounded-[14px] flex items-center justify-center shrink-0`}>
                  {item.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-academy-text">{item.title}</p>
                  <p className="text-[13px] text-academy-muted mt-0.5">{item.desc}</p>
                </div>
                <div className="flex items-center justify-center w-6 h-6 bg-slate-50 rounded-full text-[11px] font-bold text-academy-muted shrink-0 mt-1">
                  {i + 1}
                </div>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Navigation guide */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-4"
        >
          <h2 className="text-[13px] font-bold text-academy-muted uppercase tracking-widest px-2">
            Onde encontrar cada coisa
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Users size={18} />, label: 'Pacientes', desc: 'Cadastro e prontuário', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
              { icon: <Calendar size={18} />, label: 'Agenda', desc: 'Consultas do dia', color: 'text-academy-primary', bg: 'bg-academy-soft/50 border-violet-100' },
              { icon: <DollarSign size={18} />, label: 'Financeiro', desc: 'Receitas e despesas', color: 'text-emerald-600', bg: 'bg-emerald-50/50 border-emerald-100' },
              { icon: <FileText size={18} />, label: 'Documentos', desc: 'Atestados e receitas', color: 'text-sky-600', bg: 'bg-sky-50/50 border-sky-100' },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.35 + i * 0.05 }}
                className={`rounded-[18px] border p-4 space-y-2 ${item.bg}`}
              >
                <span className={item.color}>{item.icon}</span>
                <p className="text-[14px] font-bold text-academy-text">{item.label}</p>
                <p className="text-[11px] text-academy-muted">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="px-2 pt-4"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              setWelcomeSeen(true);
              onDismissWelcome();
            }}
            className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-[20px] text-[16px] font-bold shadow-[0_12px_36px_rgba(139,92,246,0.15)] hover:opacity-90 transition-all"
          >
            Começar a usar o OdontoHub
            <ArrowRight size={18} />
          </motion.button>
          <p className="text-center text-[12px] text-academy-muted mt-3">
            Leva menos de 2 minutos para configurar
          </p>
        </motion.div>
      </div>
    );
  }

  // ─── Onboarding Steps (after welcome, before setup is complete) ────
  if (showOnboarding) {
    const getOnboardingMessage = () => {
      if (!hasPatients) return 'Vamos configurar seu consultório. Comece cadastrando seu primeiro paciente.';
      if (!hasAppointments) return 'Ótimo! Agora agende a primeira consulta para ativar sua agenda.';
      return 'Tudo pronto! Seu consultório está configurado.';
    };

    return (
      <div className="flex flex-col gap-8 pb-32 pt-10 px-2 max-w-2xl mx-auto">
        {/* Header */}
        <header className="space-y-1.5 px-2">
          <h1 className="text-[28px] font-bold tracking-tight text-academy-text">
            {timeGreeting.text}, {getGreetingName()} <span className="text-[14px] align-middle">{timeGreeting.emoji}</span>
          </h1>
          <p className="text-[17px] font-medium text-academy-muted">
            {getOnboardingMessage()}
          </p>
        </header>

        {/* Progress indicator */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mx-2 flex items-center gap-3"
        >
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max((completedSteps / totalSteps) * 100, 8)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
            />
          </div>
          <span className="text-[12px] font-bold text-academy-muted shrink-0">
            {completedSteps} de {totalSteps}
          </span>
        </motion.div>

        {/* ── Step 1: Add patient ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.35 }}
          className="space-y-3"
        >
          <div className="px-2 flex items-center gap-2">
            {hasPatients ? (
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border-2 border-primary" />
            )}
            <span className="text-[11px] font-bold text-primary uppercase tracking-widest">
              Passo 1
            </span>
            {hasPatients && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-bold text-primary/60 ml-1"
              >
                Concluído
              </motion.span>
            )}
          </div>
          <motion.div
            animate={{ opacity: hasPatients ? 0.55 : 1 }}
            transition={{ duration: 0.25 }}
            className={`bg-white rounded-[28px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7 sm:p-8 space-y-5 ${
              hasPatients ? 'border-primary/20' : 'border-slate-100'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-[18px] flex items-center justify-center shrink-0">
                {hasPatients ? (
                  <Check size={22} className="text-primary" />
                ) : (
                  <UserPlus size={22} className="text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] sm:text-[20px] font-bold text-academy-text tracking-tight">
                  {hasPatients ? 'Paciente cadastrado' : 'Cadastre seu primeiro paciente'}
                </h3>
                <p className="text-[14px] text-academy-muted mt-1 leading-relaxed">
                  {hasPatients
                    ? `${patients.length} paciente${patients.length > 1 ? 's' : ''} no sistema. Clique em "Pacientes" no menu lateral para gerenciar.`
                    : 'Clique no botão abaixo ou acesse "Pacientes" no menu lateral. Prontuário, odontograma e financeiro ficam organizados automaticamente.'
                  }
                </p>
              </div>
            </div>

            {/* Preview: what a patient record looks like */}
            {!hasPatients && (
              <>
                <div className="bg-[#F9FAFB] rounded-2xl p-4 space-y-2.5 border border-slate-100/50">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">M</div>
                    <div>
                      <p className="text-[13px] font-semibold text-academy-text">Maria Silva</p>
                      <p className="text-[11px] text-academy-muted">Última visita: há 3 dias · Em tratamento</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">Prontuário</span>
                    <span className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">Odontograma</span>
                    <span className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">Evolução</span>
                    <span className="px-2.5 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-100">Financeiro</span>
                  </div>
                </div>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveTab('pacientes')}
                  className="flex items-center gap-2.5 bg-primary text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(139,92,246,0.12)] hover:opacity-90 transition-all"
                >
                  Cadastrar primeiro paciente
                  <ArrowRight size={15} />
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.section>

        {/* ── Step 2: Schedule first appointment ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="space-y-3"
        >
          <div className="px-2 flex items-center gap-2">
            {hasAppointments ? (
              <div className="w-5 h-5 bg-academy-soft0 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full border-2 ${hasPatients ? 'border-violet-500' : 'border-slate-200'}`} />
            )}
            <span className={`text-[11px] font-bold uppercase tracking-widest ${
              hasPatients ? 'text-academy-primary' : 'text-slate-300'
            }`}>
              Passo 2
            </span>
            {hasAppointments && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-[11px] font-bold text-violet-400 ml-1"
              >
                Concluído
              </motion.span>
            )}
          </div>
          <motion.div
            animate={{ opacity: hasAppointments ? 0.55 : hasPatients ? 1 : 0.45 }}
            transition={{ duration: 0.25 }}
            className={`bg-white rounded-[28px] border shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7 sm:p-8 space-y-5 ${
              hasAppointments ? 'border-academy-border' : hasPatients ? 'border-slate-100' : 'border-slate-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-academy-soft rounded-[18px] flex items-center justify-center shrink-0">
                {hasAppointments ? (
                  <Check size={22} className="text-violet-500" />
                ) : (
                  <Calendar size={22} className="text-violet-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] sm:text-[20px] font-bold text-academy-text tracking-tight">
                  {hasAppointments ? 'Agenda ativa' : 'Agende a primeira consulta'}
                </h3>
                <p className="text-[14px] text-academy-muted mt-1 leading-relaxed">
                  {hasAppointments
                    ? 'Sua agenda está funcionando. Acesse "Agenda" no menu lateral para ver e gerenciar consultas.'
                    : hasPatients
                      ? 'Clique no botão abaixo ou acesse "Agenda" no menu lateral. O sistema envia lembretes automaticamente para seus pacientes.'
                      : 'Primeiro cadastre um paciente (passo 1), depois você poderá agendar consultas aqui.'
                  }
                </p>
              </div>
            </div>

            {/* Preview: what the agenda looks like */}
            {hasPatients && !hasAppointments && (
              <>
                <div className="bg-[#F9FAFB] rounded-2xl p-4 space-y-2 border border-slate-100/50">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-academy-muted uppercase tracking-wider">Prévia da sua agenda</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { time: '09:00', name: patients[0]?.name?.split(' ')[0] || 'Paciente', proc: 'Avaliação', color: 'bg-primary/10 text-primary' },
                      { time: '10:30', name: '—', proc: 'Horário livre', color: 'bg-slate-100 text-slate-400' },
                      { time: '14:00', name: '—', proc: 'Horário livre', color: 'bg-slate-100 text-slate-400' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5">
                        <span className="text-[12px] font-bold text-academy-text w-10 shrink-0">{row.time}</span>
                        <div className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-medium ${row.color}`}>
                          {row.name} · {row.proc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.25 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-2.5 bg-academy-primary text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(47,143,163,0.15)] hover:bg-academy-primary-dark transition-all"
                >
                  Agendar primeira consulta
                  <ArrowRight size={15} />
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.section>

        {/* ── Step 3: Intelligence ── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          className="space-y-3"
        >
          <div className="px-2 flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full border-2 ${step3Active ? 'border-amber-500' : 'border-slate-200'}`} />
            <span className={`text-[11px] font-bold uppercase tracking-widest ${
              step3Active ? 'text-amber-600' : 'text-slate-300'
            }`}>
              Passo 3
            </span>
          </div>
          <motion.div
            animate={{ opacity: step3Active ? 0.85 : hasPatients ? 0.5 : 0.35 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-[28px] border border-slate-50 shadow-[0_4px_24px_rgba(0,0,0,0.03)] p-7 sm:p-8 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-50 rounded-[18px] flex items-center justify-center shrink-0">
                <Sparkles size={22} className="text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] sm:text-[20px] font-bold text-academy-text tracking-tight">Pronto! Explore seu painel</h3>
                <p className="text-[14px] text-academy-muted mt-1 leading-relaxed">
                  {step3Active
                    ? 'Seu consultório está configurado. A tela de Início mostra seus próximos atendimentos, pacientes que precisam de atenção e sugestões inteligentes.'
                    : 'Após configurar pacientes e agenda, esta tela mostrará tudo que você precisa saber no dia: próximos atendimentos, alertas e oportunidades.'
                  }
                </p>
              </div>
            </div>

            {/* Preview: what intelligence looks like */}
            <div className="bg-[#F9FAFB] rounded-2xl p-4 space-y-2.5 border border-slate-100/50">
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-2 h-2 bg-rose-400 rounded-full animate-pulse shrink-0" />
                <p className="text-[12px] text-[#636366] font-medium">Você pode recuperar 3 pacientes que sumiram</p>
              </div>
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-2 h-2 bg-violet-400 rounded-full shrink-0" />
                <p className="text-[12px] text-[#636366] font-medium">Encaixe sugerido: João, terça às 14h</p>
              </div>
              <div className="flex items-center gap-2.5 py-1">
                <div className="w-2 h-2 bg-emerald-400 rounded-full shrink-0" />
                <p className="text-[12px] text-[#636366] font-medium">Potencial da semana: R$ 4.200 em agenda</p>
              </div>
            </div>

            {step3Active && (
              <>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <Check size={18} className="text-emerald-600 shrink-0" />
                  <p className="text-[13px] font-semibold text-emerald-700">Consultório configurado! Você já pode usar o sistema normalmente.</p>
                </div>
                <motion.button
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.3 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    setOnboardingDismissed(true);
                    onDismissOnboarding();
                  }}
                  className="flex items-center gap-2.5 bg-primary text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(139,92,246,0.12)] hover:opacity-90 transition-all"
                >
                  Ir para o painel principal
                  <ArrowRight size={15} />
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-[calc(env(safe-area-inset-bottom)+80px)] pt-10 px-5 max-w-2xl mx-auto">
      {/* 1. HEADER + CONTEXTO PRÉ-HERO */}
      <div className="space-y-5">
        {/* Saudação — caption level */}
        <p className="text-[13px] font-medium text-academy-muted px-1 tracking-wide">
          {timeGreeting.text}, {getGreetingName()} {timeGreeting.emoji}
        </p>

        {/* Mensagem principal — headline dominante */}
        <h1 className="text-[28px] font-bold tracking-tight text-academy-text leading-[1.2] px-1">
          {getSmartMessage()}
        </h1>

        {/* Insight inteligente — fala humana do sistema */}
        {insightCard && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className={`flex items-start gap-3 rounded-2xl px-4 py-3.5 ${
              insightCard.accent === 'violet' ? 'bg-academy-soft/70' :
              insightCard.accent === 'rose' ? 'bg-rose-50/70' :
              insightCard.accent === 'amber' ? 'bg-amber-50/70' :
              'bg-emerald-50/70'
            }`}
          >
            <span className={`mt-0.5 shrink-0 ${
              insightCard.accent === 'violet' ? 'text-violet-500' :
              insightCard.accent === 'rose' ? 'text-rose-500' :
              insightCard.accent === 'amber' ? 'text-amber-500' :
              'text-emerald-500'
            }`}>
              {insightCard.icon}
            </span>
            <p className="text-[14px] font-medium text-[#3A3A3C] leading-snug">
              {insightCard.text}
            </p>
          </motion.div>
        )}

        {/* Portal banner */}
        {portalPendingCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => onOpenPortalInbox?.()}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl px-4 py-3.5 text-left transition-all"
          >
            <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center shrink-0 shadow-sm">
              <Calendar size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-slate-800">
                {portalPendingCount === 1
                  ? 'Você tem 1 solicitação de consulta'
                  : `Você tem ${portalPendingCount} solicitações de consulta`}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">Toque para revisar</p>
            </div>
            <ChevronRight size={16} className="text-slate-300 shrink-0" />
          </motion.button>
        )}
      </div>

      {/* 2. HERO — PRÓXIMO ATENDIMENTO (protagonista absoluto) */}
      {nextPatient ? (() => {
        const effectiveStatus = getEffectiveStatus(nextPatient);
        const isInProgress = effectiveStatus === 'IN_PROGRESS';
        const isFinished = effectiveStatus === 'FINISHED';
        const badge = getStatusBadge(nextPatient);
        const countdown = getCountdown(nextPatient);
        const gradientClass = isInProgress
          ? 'from-blue-600 via-blue-500 to-blue-400'
          : isFinished
          ? 'from-slate-500 via-slate-400 to-slate-400'
          : 'from-[#1E4430] via-[#264E36] to-[#3A6B4E]';
        const startFormatted = new Date(nextPatient.start_time)
          .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        return (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={`overflow-hidden rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.10)] flex flex-col bg-gradient-to-br ${gradientClass}`}
              style={{ minHeight: 'min(60svh, 520px)' }}>

              {/* ── TOPO: identidade do paciente ── */}
              <div className="flex-1 px-7 pt-9 pb-6 flex flex-col gap-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.14em]">
                      Próximo atendimento
                    </span>
                    <h2 className="text-[36px] sm:text-[40px] font-bold text-white leading-[1.1] tracking-[-0.025em] mt-1.5 break-words">
                      {nextPatient.patient_name}
                    </h2>
                  </div>
                  {/* avatar */}
                  {nextPatient.photo_url ? (
                    <img
                      src={nextPatient.photo_url}
                      alt={nextPatient.patient_name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-[22px] object-cover border-2 border-white/20 shrink-0 mt-1 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-[22px] bg-white/15 border border-white/20 flex items-center justify-center shrink-0 mt-1 font-bold text-[26px] text-white shadow-inner">
                      {(nextPatient.patient_name || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* status + countdown */}
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
                    {badge.label}
                  </span>
                  {!isFinished && (
                    <span className="px-3 py-1.5 rounded-full text-[12px] font-bold bg-white/15 text-white">
                      {countdown}
                    </span>
                  )}
                </div>

                {/* horário + procedimento */}
                <div className="flex items-end justify-between gap-4 mt-auto pt-4">
                  <div>
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.12em]">Procedimento</span>
                    <p className="text-[18px] font-semibold text-white mt-0.5 leading-snug line-clamp-2">
                      {nextPatient.notes || 'Avaliação Geral'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-white/50 text-[10px] font-bold uppercase tracking-[0.12em]">Horário</span>
                    <p className="text-[32px] font-bold text-white leading-none mt-0.5">
                      {startFormatted}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── BASE: CTAs ── */}
              <div className="px-7 pb-8 pt-5 space-y-3">
                <motion.button
                  whileTap={{ scale: 0.98, opacity: 0.92 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  onClick={() => openPatientRecord(nextPatient.patient_id)}
                  className="w-full py-[20px] rounded-[26px] text-[18px] font-bold bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)] transition-all"
                  style={{ color: isInProgress ? '#1E6ED6' : isFinished ? '#374151' : '#1E4430' }}
                >
                  {isFinished ? 'Ver prontuário' : isInProgress ? 'Atender agora' : 'Atender'}
                </motion.button>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.98, opacity: 0.9 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => sendReminder(nextPatient)}
                    className="flex items-center justify-center gap-2 px-5 py-[15px] rounded-[20px] bg-white/15 border border-white/20 text-[14px] font-bold text-white transition-all"
                  >
                    <MessageCircle size={16} />
                    WhatsApp
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98, opacity: 0.9 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    onClick={() => onReschedule?.(nextPatient)}
                    className="flex items-center justify-center gap-2 py-[15px] rounded-[20px] bg-white/15 border border-white/20 text-[14px] font-bold text-white transition-all"
                  >
                    Reagendar
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.section>
        );
      })() : (
        <section className="space-y-5">
          <div className="w-16 h-16 bg-academy-bg rounded-full flex items-center justify-center text-academy-muted mx-auto">
            <Calendar size={32} />
          </div>
          <div className="space-y-1.5 text-center">
            <p className="text-[19px] font-bold text-academy-text">Agenda livre</p>
            <p className="text-[14px] text-academy-muted">
              {schedulingSuggestions.length > 0
                ? `${schedulingSuggestions.length} paciente${schedulingSuggestions.length === 1 ? '' : 's'} aguardando encaixe`
                : 'Nenhuma consulta por agora'}
            </p>
          </div>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-2.5 bg-primary text-white w-full py-[18px] rounded-[22px] text-[16px] font-bold shadow-[0_12px_36px_rgba(139,92,246,0.12)] mx-auto max-w-xs"
          >
            <CalendarPlus size={18} />
            Agendar consulta
          </motion.button>
          <button
            onClick={() => setActiveTab('agenda')}
            className="block text-[13px] font-semibold text-primary text-center mx-auto mt-1"
          >
            Ver agenda completa
          </button>
        </section>
      )}

      {/* 2b. QUICK ACTIONS — anchored to hero (only when hero is visible) */}
      {nextPatient && <div className="-mt-4 flex items-center justify-end gap-2 px-0.5">
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab('pacientes')}
            className="flex items-center gap-1.5 px-3.5 py-[11px] rounded-[12px] bg-primary/10 text-primary text-[12px] font-bold transition-all"
          >
            <Plus size={13} strokeWidth={2.5} />
            Paciente
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-[11px] rounded-[12px] bg-violet-100 text-academy-primary-dark text-[12px] font-bold transition-all"
          >
            <CalendarPlus size={13} strokeWidth={2.5} />
            Consulta
          </motion.button>
      </div>}

      {/* 3. PRECISAM DA SUA AÇÃO — adaptive: inline for 1, atmosphere for 2+ */}
      {intelligence && intelligence.needsActionToday.length > 0 && (
        intelligence.needsActionToday.length === 1 ? (
          <section className="px-0">
            <motion.div
              whileTap={{ scale: 0.98, opacity: 0.9 }}
              onClick={() => openPatientRecord(intelligence.needsActionToday[0].patient_id)}
              className="w-full flex items-center gap-4 bg-rose-50/60 rounded-[20px] px-5 py-4 cursor-pointer transition-all"
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[13px] overflow-hidden border border-primary/20 shrink-0">
                  {intelligence.needsActionToday[0].photo_url ? (
                    <img src={intelligence.needsActionToday[0].photo_url} alt={intelligence.needsActionToday[0].patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    (intelligence.needsActionToday[0].patient_name || '?').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-400 border-2 border-white" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-semibold text-academy-text truncate">{intelligence.needsActionToday[0].patient_name}</p>
                <p className="text-[12px] text-academy-muted">
                  {formatDaysAgo(intelligence.needsActionToday[0].days_since_last_visit)} · {statusLabels[intelligence.needsActionToday[0].status] || intelligence.needsActionToday[0].status}
                </p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityConfig[intelligence.needsActionToday[0].priority].bg} ${priorityConfig[intelligence.needsActionToday[0].priority].text} shrink-0`}>
                {priorityConfig[intelligence.needsActionToday[0].priority].label}
              </span>
              <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
            </motion.div>
          </section>
        ) : (
        <section className="-mx-5 px-5 py-6 bg-gradient-to-b from-rose-50/80 to-rose-50/20 rounded-[20px] space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
              <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Precisam da sua ação</h3>
            </div>
            <span className="text-[12px] font-bold text-rose-400">{intelligence.needsActionToday.length}</span>
          </div>
          <div className="rounded-[20px] overflow-hidden bg-white/80 backdrop-blur-sm border border-rose-100/40 shadow-[0_2px_12px_rgba(244,63,94,0.06)]">
            {intelligence.needsActionToday.slice(0, 5).map(p => renderIntelligencePatient(p))}
          </div>
          {intelligence.needsActionToday.length > 5 && (
            <button type="button" onClick={() => setActiveTab('pacientes')} className="text-[13px] font-semibold text-rose-600 px-1">
              Ver todos os {intelligence.needsActionToday.length} pacientes →
            </button>
          )}
        </section>
        )
      )}

      {/* 4. WHATSAPP REMINDERS — time-sensitive, promoted */}
      {tomorrowUnconfirmedCount > 0 && (
        <section className="px-0">
          <motion.button
            whileTap={{ scale: 0.98, opacity: 0.9 }}
            onClick={openReminderModal}
            className="w-full flex items-center gap-4 bg-academy-bg rounded-[20px] px-5 py-4 transition-all"
          >
            <div className="w-10 h-10 bg-white rounded-[14px] flex items-center justify-center text-primary shadow-sm shrink-0">
              <MessageCircle size={20} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[15px] font-semibold text-academy-text">
                {tomorrowUnconfirmedCount} lembrete{tomorrowUnconfirmedCount === 1 ? '' : 's'} para enviar
              </p>
              <p className="text-[12px] text-academy-muted">Consultas de amanhã sem confirmação</p>
            </div>
            <ChevronRight size={16} className="text-[#C6C6C8] shrink-0" />
          </motion.button>
          <AnimatePresence>
            {isReminderModalOpen && (
              <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsReminderModalOpen(false)}
                  className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                  className="relative w-full sm:max-w-xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-white/30 max-h-[88vh] flex flex-col"
                >
                  <div className="px-6 pt-6 pb-4 border-b border-[#C6C6C8]/20 flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-[20px] font-bold text-academy-text tracking-tight">Confirmações de amanhã</h4>
                      <p className="text-[14px] text-academy-muted mt-1">
                        {tomorrowUnconfirmedAppointments.length} paciente{tomorrowUnconfirmedAppointments.length === 1 ? '' : 's'} aguardando mensagem de confirmação
                      </p>
                    </div>
                    <button
                      onClick={() => setIsReminderModalOpen(false)}
                      className="w-9 h-9 rounded-full bg-academy-bg text-academy-muted hover:text-academy-text transition-colors flex items-center justify-center shrink-0"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="overflow-y-auto px-4 py-4 space-y-3">
                    {tomorrowUnconfirmedAppointments.map((appointment) => {
                      const startTime = new Date(appointment.start_time);
                      return (
                        <div
                          key={appointment.id}
                          className="rounded-[24px] border border-[#C6C6C8]/15 bg-[#FCFCFD] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <p className="text-[15px] font-semibold text-academy-text truncate">{appointment.patient_name}</p>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">
                                Pendente
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[13px] text-academy-muted font-medium flex-wrap">
                              <span>{startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>•</span>
                              <span>{appointment.notes || 'Consulta'}</span>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => sendReminder(appointment)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[18px] bg-primary text-white text-[13px] font-bold shadow-[0_8px_24px_rgba(139,92,246,0.1)]"
                          >
                            <MessageCircle size={15} />
                            Enviar confirmação
                          </motion.button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="px-6 py-4 border-t border-[#C6C6C8]/20 bg-white">
                    <button
                      onClick={() => setIsReminderModalOpen(false)}
                      className="w-full h-[46px] rounded-[16px] bg-academy-bg text-[#4B5250] text-[14px] font-medium hover:bg-[#E9E9EE] transition-colors"
                    >
                      Fechar
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* 5. TODAY'S SCHEDULE — clean with green time accent */}
      {otherAppointments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Próximos da agenda</h3>
            <button onClick={() => setActiveTab('agenda')} className="text-[13px] font-semibold text-primary">
              Ver tudo
            </button>
          </div>
          <div className="rounded-[20px] overflow-hidden bg-white border border-academy-border/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            {otherAppointments.map((app, index) => (
              <motion.div
                key={app.id}
                whileTap={{ backgroundColor: 'var(--academy-bg)' }}
                transition={{ duration: 0.15 }}
                onClick={() => openPatientRecord(app.patient_id)}
                className={`flex items-center justify-between px-5 py-[16px] transition-colors cursor-pointer ${index !== otherAppointments.length - 1 ? 'border-b border-academy-border' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center shrink-0 w-11">
                    <span className="text-[15px] font-bold text-primary leading-none">
                      {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="w-px h-8 bg-primary/15 shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold text-academy-text">{app.patient_name}</span>
                    <span className="text-[12px] text-academy-muted">{app.notes || 'Consulta'}</span>
                  </div>
                </div>
                <ChevronRight size={16} className="text-[#C6C6C8]" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 6+7. PACIENTES QUE PRECISAM DE VOCÊ — neutral with amber accent */}
      {intelligence && (intelligence.abandonmentRisk.length > 0 || intelligence.attentionNeeded.length > 0) && (() => {
        const combined = [
          ...intelligence.abandonmentRisk.map(p => ({ ...p, _reason: 'abandono' as const })),
          ...intelligence.attentionNeeded.filter(p => !intelligence.abandonmentRisk.some(a => a.patient_id === p.patient_id)).map(p => ({ ...p, _reason: 'atencao' as const })),
        ];
        return (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <div className="w-1 h-5 rounded-full bg-amber-400" />
                <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Precisam de atenção</h3>
              </div>
              <span className="text-[12px] font-bold text-academy-muted">{combined.length}</span>
            </div>
            <div className="rounded-[20px] overflow-hidden bg-white border border-academy-border/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              {combined.slice(0, 5).map(p => renderIntelligencePatient(p, false))}
            </div>
            {combined.length > 5 && (
              <button type="button" onClick={() => setActiveTab('pacientes')} className="text-[13px] font-semibold text-primary px-1">
                Ver todos os {combined.length} pacientes →
              </button>
            )}
          </section>
        );
      })()}

      {/* 8. SMART SCHEDULING SUGGESTIONS — neutral with violet accent */}
      {schedulingSuggestions.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2.5">
              <div className="w-1 h-5 rounded-full bg-violet-400" />
              <h3 className="text-[15px] font-bold text-academy-text tracking-tight">Sugestões de encaixe</h3>
            </div>
            <span className="text-[12px] font-bold text-academy-muted">{schedulingSuggestions.length}</span>
          </div>
          <div className="rounded-[20px] overflow-hidden bg-white border border-academy-border/80 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
            {schedulingSuggestions.slice(0, 4).map((sug, i) => {
              const dayLabel = (() => {
                const d = new Date(sug.suggested_slot.date + 'T12:00:00');
                const today = new Date(); today.setHours(0,0,0,0);
                const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                if (d.toDateString() === today.toDateString()) return 'Hoje';
                if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã';
                return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' });
              })();
              return (
                <motion.div
                  key={`sug-${i}`}
                  whileTap={{ backgroundColor: 'var(--academy-bg)' }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-4 px-5 py-[14px] cursor-pointer ${i !== Math.min(schedulingSuggestions.length, 4) - 1 ? 'border-b border-academy-border' : ''}`}
                  onClick={() => openPatientRecord(sug.patient.patient_id)}
                >
                  <div className="w-10 h-10 rounded-full bg-academy-soft text-academy-primary flex items-center justify-center font-bold text-[13px] overflow-hidden border border-violet-100 shrink-0">
                    {sug.patient.photo_url ? (
                      <img src={sug.patient.photo_url} alt={sug.patient.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      (sug.patient.patient_name || '?').charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-academy-text truncate">{sug.patient.patient_name}</p>
                    <p className="text-[12px] text-academy-muted truncate">
                      {dayLabel} · {sug.suggested_slot.start} · {sug.procedure || 'Consulta'}
                    </p>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); onSchedulePatient?.(sug.patient.patient_id, sug.suggested_slot.date, sug.suggested_slot.start, sug.suggested_slot.end, sug.procedure); }}
                    className="shrink-0 px-4 py-[10px] rounded-full bg-academy-primary text-white text-[12px] font-bold"
                  >
                    Agendar
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
          {schedulingSuggestions.length > 4 && (
            <button type="button" onClick={() => setActiveTab('agenda')} className="text-[13px] font-semibold text-academy-primary px-1">
              Ver todas as {schedulingSuggestions.length} sugestões →
            </button>
          )}
        </section>
      )}

      {/* 9. FINANCIAL SUMMARY — emerald accent, tappable */}
      {(todayRevenue || 0) > 0 && (
        <section className="px-0">
          <motion.button
            whileTap={{ scale: 0.98, opacity: 0.9 }}
            onClick={() => setActiveTab('financeiro')}
            className="w-full flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-emerald-50/30 rounded-[20px] px-5 py-5 border border-emerald-100/40 text-left transition-all"
          >
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 bg-emerald-500 rounded-[14px] flex items-center justify-center shadow-sm shrink-0">
                <DollarSign size={20} className="text-white" />
              </div>
              <div>
                <p className="text-[12px] text-emerald-700/60 font-semibold uppercase tracking-wider">Faturamento hoje</p>
                <p className="text-[22px] font-bold text-emerald-900 leading-tight">
                  {(todayRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-emerald-300 shrink-0" />
          </motion.button>
        </section>
      )}
    </div>
  );
};
