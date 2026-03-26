import React, { useEffect, useRef, useState } from 'react';
import { ClipboardList, MessageCircle, Calendar, CalendarPlus, ChevronRight, AlertTriangle, UserX, TrendingUp, Clock, Sparkles, ThumbsUp, X, UserPlus, ArrowRight, Check, Users, DollarSign, FileText, Stethoscope, Plus } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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
  todayAppointmentsTotalCount: number;
  todayAppointmentsRemainingCount: number;
  totalAppointmentsCount: number;
  tomorrowUnconfirmedCount: number;
  tomorrowUnconfirmedAppointments: ReminderAppointment[];
  todayRevenue: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openPatientRecord: (id: number) => void;
  setIsModalOpen: (open: boolean) => void;
  setActiveTab: (tab: any) => void;
  sendReminder: (appointment: any) => void;
  onReschedule?: (appointment: any) => void;
  onSchedulePatient?: (patientId: number, date: string, startTime: string, endTime: string, procedure?: string | null) => void;
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
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return `${Math.floor(days / 365)} anos atrás`;
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
  onSchedulePatient
}) => {
  const [intelligence, setIntelligence] = useState<DashboardIntelligence | null>(null);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchIntelligence = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Accept': 'application/json' };
        if (token && token !== 'null') {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-auth-token'] = token;
        }
        const [dashRes, schedRes] = await Promise.all([
          fetch('/api/intelligence/dashboard', { headers }),
          fetch('/api/intelligence/scheduling', { headers }),
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
    const totalPatients = intelligence?.stats?.totalPatients || 0;

    // Use a daily seed so the variant stays consistent throughout the day
    const daySeed = new Date().toISOString().slice(0, 10);
    const pick = (arr: string[]) => arr[
      Math.abs([...daySeed].reduce((a, c) => a + c.charCodeAt(0), 0)) % arr.length
    ];

    // Priority 1 — urgent patients
    if (urgentCount > 0) {
      const msgs = urgentCount === 1
        ? [
            '1 paciente precisa da sua atenção agora',
            'Tem um paciente aguardando seu cuidado',
            'Atenção: 1 paciente precisa de você hoje',
          ]
        : [
            `${urgentCount} pacientes precisam da sua atenção`,
            `Você tem ${urgentCount} oportunidades de cuidado hoje`,
            `${urgentCount} pacientes contam com você hoje`,
          ];
      return pick(msgs);
    }

    // Priority 2 — abandonment risk
    if (abandonCount > 0) {
      const msgs = abandonCount === 1
        ? [
            '1 paciente pode estar se afastando — que tal um contato?',
            'Um paciente está sumido. Um "oi" pode fazer a diferença',
          ]
        : [
            `${abandonCount} pacientes prontos para reagendamento`,
            `${abandonCount} pacientes estão sentindo falta de você`,
          ];
      return pick(msgs);
    }

    // Priority 3 — empty agenda with suggestions
    if (remaining === 0 && suggestionsCount > 0) {
      return pick([
        `Agenda livre — ${suggestionsCount} sugestão${suggestionsCount > 1 ? 'ões' : ''} esperando por você`,
        'Sua agenda está vazia — vamos preencher?',
        `${suggestionsCount} oportunidade${suggestionsCount > 1 ? 's' : ''} para encaixar hoje`,
      ]);
    }

    // Priority 4 — empty agenda, nothing to suggest
    if (remaining === 0) {
      if (hour < 12) {
        return pick([
          'Manhã tranquila. Bom momento para organizar a semana',
          'Sem consultas por enquanto — aproveite para respirar',
        ]);
      }
      if (hour < 18) {
        return pick([
          'Tarde livre! Que tal revisar prontuários pendentes?',
          'Agenda leve hoje — é raro, aproveite',
        ]);
      }
      return pick([
        'Dia encerrado. Descanse, você mereceu',
        'Tudo feito por hoje — até amanhã!',
      ]);
    }

    // Priority 5 — last patient
    if (remaining === 1) {
      return pick([
        'Falta só 1 — reta final do dia!',
        'Último atendimento do dia, vamos lá!',
        'Quase lá — 1 paciente e o dia é seu',
      ]);
    }

    // Priority 6 — few patients remaining
    if (remaining <= 3) {
      return pick([
        `Mais ${remaining} e o dia está feito`,
        `Faltam ${remaining} atendimentos — você está voando`,
        `Só ${remaining} pela frente, quase lá!`,
      ]);
    }

    // Priority 7 — busy day
    if (remaining > 3) {
      return pick([
        `Dia cheio: ${remaining} atendimentos pela frente`,
        `${remaining} pacientes contam com você hoje — bora!`,
        `Agenda forte hoje com ${remaining} consultas`,
      ]);
    }

    return 'Vamos fazer um ótimo dia!';
  };

  const getInsightCard = (): { text: string; icon: React.ReactNode; accent: string } | null => {
    const abandonCount = intelligence?.abandonmentRisk?.length || 0;
    const suggestionsCount = schedulingSuggestions.length;
    const remaining = todayAppointmentsRemainingCount;
    const unconfirmed = tomorrowUnconfirmedCount;
    const revenue = todayRevenue || 0;

    const daySeed = new Date().toISOString().slice(0, 10);
    const variant = Math.abs([...daySeed].reduce((a, c) => a + c.charCodeAt(0), 0)) % 3;

    // Show only one insight — pick the most relevant
    if (remaining === 0 && suggestionsCount > 0) {
      return {
        text: suggestionsCount === 1
          ? 'Encontrei 1 horário ideal para um paciente que precisa voltar'
          : `Encontrei ${suggestionsCount} encaixes inteligentes para sua agenda`,
        icon: <Sparkles size={16} />,
        accent: 'violet',
      };
    }

    if (abandonCount >= 2) {
      return {
        text: variant % 2 === 0
          ? `${abandonCount} pacientes não voltam há semanas — uma mensagem rápida pode trazê-los de volta`
          : `${abandonCount} pacientes sumiram. Um lembrete carinhoso resolve`,
        icon: <UserX size={16} />,
        accent: 'rose',
      };
    }

    if (unconfirmed >= 2) {
      return {
        text: `${unconfirmed} consultas de amanhã sem confirmação — um lembrete agora evita faltas`,
        icon: <MessageCircle size={16} />,
        accent: 'amber',
      };
    }

    if (revenue > 0 && remaining === 0) {
      return {
        text: `Dia encerrado com ${revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — bom trabalho!`,
        icon: <TrendingUp size={16} />,
        accent: 'emerald',
      };
    }

    return null;
  };

  const insightCard = !loading ? getInsightCard() : null;

  const statChips = intelligence
    ? [
        {
          key: 'in-treatment',
          value: intelligence.stats.inTreatment,
          text: `${intelligence.stats.inTreatment} em tratamento`,
          className: 'text-sky-600',
        },
        {
          key: 'attention',
          value: intelligence.stats.attention,
          text: `${intelligence.stats.attention} ${intelligence.stats.attention === 1 ? 'atenção' : 'atenções'}`,
          className: 'text-amber-600',
        },
        {
          key: 'abandonment',
          value: intelligence.stats.abandonment,
          text: `${intelligence.stats.abandonment} risco${intelligence.stats.abandonment === 1 ? '' : 's'} de abandono`,
          className: 'text-rose-600',
        },
        {
          key: 'completed',
          value: intelligence.stats.completed,
          text: `${intelligence.stats.completed} finalizado${intelligence.stats.completed === 1 ? '' : 's'}`,
          className: 'text-emerald-600',
        },
      ].filter((item) => item.value > 0)
    : [];

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

  // ─── Intelligence patient row ───────────────────────────────────────────

  const renderIntelligencePatient = (p: PatientIntelligence, showPriority = true) => {
    const cfg = priorityConfig[p.priority];
    return (
      <motion.div
        key={p.patient_id}
        whileTap={{ backgroundColor: '#F2F2F7', scale: 0.995 }}
        transition={{ duration: 0.2 }}
        className="flex items-center gap-4 p-5 cursor-pointer transition-colors border-b border-[#C6C6C8]/5 last:border-b-0"
        onClick={() => openPatientRecord(p.patient_id)}
      >
        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm overflow-hidden border border-primary/20 shrink-0">
          {p.photo_url ? (
            <img src={p.photo_url} alt={p.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            (p.patient_name || '?').charAt(0).toUpperCase()
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{p.patient_name}</p>
          <p className="text-[12px] text-[#8E8E93] mt-0.5 truncate">
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
              className="w-8 h-8 flex items-center justify-center rounded-xl text-[#8E8E93] hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
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
  const onboardingKey = `odontohub_onboarding_done_${user?.id ?? 'unknown'}`;
  const welcomeKey = `odontohub_welcome_seen_${user?.id ?? 'unknown'}`;
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => localStorage.getItem(onboardingKey) === '1');
  const [welcomeSeen, setWelcomeSeen] = useState(() => localStorage.getItem(welcomeKey) === '1');
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
            <h1 className="text-[32px] font-bold tracking-tight text-[#1C1C1E]">
              Bem-vindo ao OdontoHub
            </h1>
            <p className="text-[17px] text-[#8E8E93] leading-relaxed max-w-md mx-auto">
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
          <h2 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-widest px-2">
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
                icon: <Calendar size={20} className="text-violet-600" />,
                bg: 'bg-violet-50',
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
                  <p className="text-[15px] font-semibold text-[#1C1C1E]">{item.title}</p>
                  <p className="text-[13px] text-[#8E8E93] mt-0.5">{item.desc}</p>
                </div>
                <div className="flex items-center justify-center w-6 h-6 bg-slate-50 rounded-full text-[11px] font-bold text-[#8E8E93] shrink-0 mt-1">
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
          <h2 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-widest px-2">
            Onde encontrar cada coisa
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Users size={18} />, label: 'Pacientes', desc: 'Cadastro e prontuário', color: 'text-primary', bg: 'bg-primary/5 border-primary/10' },
              { icon: <Calendar size={18} />, label: 'Agenda', desc: 'Consultas do dia', color: 'text-violet-600', bg: 'bg-violet-50/50 border-violet-100' },
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
                <p className="text-[14px] font-bold text-[#1C1C1E]">{item.label}</p>
                <p className="text-[11px] text-[#8E8E93]">{item.desc}</p>
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
              localStorage.setItem(welcomeKey, '1');
              setWelcomeSeen(true);
            }}
            className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-[20px] text-[16px] font-bold shadow-[0_12px_36px_rgba(38,78,54,0.15)] hover:opacity-90 transition-all"
          >
            Começar a usar o OdontoHub
            <ArrowRight size={18} />
          </motion.button>
          <p className="text-center text-[12px] text-[#8E8E93] mt-3">
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
          <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E]">
            {timeGreeting.text}, {getGreetingName()} <span className="text-[14px] align-middle">{timeGreeting.emoji}</span>
          </h1>
          <p className="text-[17px] font-medium text-[#8E8E93]">
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
          <span className="text-[12px] font-bold text-[#8E8E93] shrink-0">
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
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#1C1C1E] tracking-tight">
                  {hasPatients ? 'Paciente cadastrado' : 'Cadastre seu primeiro paciente'}
                </h3>
                <p className="text-[14px] text-[#8E8E93] mt-1 leading-relaxed">
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
                      <p className="text-[13px] font-semibold text-[#1C1C1E]">Maria Silva</p>
                      <p className="text-[11px] text-[#8E8E93]">Última visita: há 3 dias · Em tratamento</p>
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
                  className="flex items-center gap-2.5 bg-primary text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all"
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
              <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                <Check size={12} className="text-white" strokeWidth={3} />
              </div>
            ) : (
              <div className={`w-5 h-5 rounded-full border-2 ${hasPatients ? 'border-violet-500' : 'border-slate-200'}`} />
            )}
            <span className={`text-[11px] font-bold uppercase tracking-widest ${
              hasPatients ? 'text-violet-600' : 'text-slate-300'
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
              hasAppointments ? 'border-violet-200' : hasPatients ? 'border-slate-100' : 'border-slate-50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-violet-50 rounded-[18px] flex items-center justify-center shrink-0">
                {hasAppointments ? (
                  <Check size={22} className="text-violet-500" />
                ) : (
                  <Calendar size={22} className="text-violet-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#1C1C1E] tracking-tight">
                  {hasAppointments ? 'Agenda ativa' : 'Agende a primeira consulta'}
                </h3>
                <p className="text-[14px] text-[#8E8E93] mt-1 leading-relaxed">
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
                    <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Prévia da sua agenda</span>
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { time: '09:00', name: patients[0]?.name?.split(' ')[0] || 'Paciente', proc: 'Avaliação', color: 'bg-primary/10 text-primary' },
                      { time: '10:30', name: '—', proc: 'Horário livre', color: 'bg-slate-100 text-slate-400' },
                      { time: '14:00', name: '—', proc: 'Horário livre', color: 'bg-slate-100 text-slate-400' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3 py-1.5">
                        <span className="text-[12px] font-bold text-[#1C1C1E] w-10 shrink-0">{row.time}</span>
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
                  className="flex items-center gap-2.5 bg-violet-600 text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(109,40,217,0.15)] hover:bg-violet-700 transition-all"
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
                <h3 className="text-[18px] sm:text-[20px] font-bold text-[#1C1C1E] tracking-tight">Pronto! Explore seu painel</h3>
                <p className="text-[14px] text-[#8E8E93] mt-1 leading-relaxed">
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
                    localStorage.setItem(onboardingKey, '1');
                    setOnboardingDismissed(true);
                  }}
                  className="flex items-center gap-2.5 bg-primary text-white px-6 py-3.5 rounded-[18px] text-[14px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all"
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
    <div className="flex flex-col gap-14 pb-32 pt-10 px-2 max-w-2xl mx-auto">
      {/* 1. HEADER */}
      <header className="space-y-1.5 px-2">
        <h1 className="text-[28px] font-bold tracking-tight text-[#1C1C1E]">
          {timeGreeting.text}, {getGreetingName()} <span className="text-[14px] align-middle">{timeGreeting.emoji}</span>
        </h1>
        <p className="text-[17px] font-medium text-[#8E8E93]">
          {getSmartMessage()}
        </p>
      </header>

      {/* 1.5 INSIGHT CARD */}
      {insightCard && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className={`mx-1 -mt-6 flex items-start gap-3.5 rounded-2xl px-5 py-4 border ${
            insightCard.accent === 'violet' ? 'bg-violet-50/60 border-violet-100' :
            insightCard.accent === 'rose' ? 'bg-rose-50/60 border-rose-100' :
            insightCard.accent === 'amber' ? 'bg-amber-50/60 border-amber-100' :
            'bg-emerald-50/60 border-emerald-100'
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

      {/* 1.8 QUICK ACTIONS — always-visible primary actions */}
      <section className="px-1 -mt-4">
        <div className="flex gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab('pacientes')}
            className="flex-1 flex items-center justify-center gap-2.5 bg-white border border-slate-100 rounded-[18px] py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-primary/20 transition-all"
          >
            <Plus size={16} className="text-primary" />
            <span className="text-[13px] font-bold text-[#1C1C1E]">Novo Paciente</span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsModalOpen(true)}
            className="flex-1 flex items-center justify-center gap-2.5 bg-white border border-slate-100 rounded-[18px] py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:border-violet-200 transition-all"
          >
            <CalendarPlus size={16} className="text-violet-600" />
            <span className="text-[13px] font-bold text-[#1C1C1E]">Nova Consulta</span>
          </motion.button>
        </div>
      </section>

      {/* 2. INTELLIGENCE STATS — Compact summary */}
      {intelligence && !loading && statChips.length > 0 && (
        <section className="px-2">
          <div className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
            {statChips.map((item, index) => (
              <React.Fragment key={item.key}>
                {index > 0 && <span className="text-[#C7C7CC]">•</span>}
                <span className={item.className}>{item.text}</span>
              </React.Fragment>
            ))}
          </div>
        </section>
      )}

      {/* Leads panel removed — using patient list for lead management */}

      {/* 3. NEEDS ACTION TODAY — "What should I do now?" */}
      {intelligence && intelligence.needsActionToday.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse" />
              <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Precisam da sua ação</h3>
            </div>
            <span className="text-[13px] font-bold text-rose-500">{intelligence.needsActionToday.length}</span>
          </div>
          <div className="ios-card !p-0 overflow-hidden border border-rose-100 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {intelligence.needsActionToday.slice(0, 5).map(p => renderIntelligencePatient(p))}
          </div>
          {intelligence.needsActionToday.length > 5 && (
            <button type="button" onClick={() => setActiveTab('pacientes')} className="text-[14px] font-bold text-primary px-2">
              Ver todos os {intelligence.needsActionToday.length} pacientes →
            </button>
          )}
        </section>
      )}

      {/* 4. PRIMARY CARD — NEXT APPOINTMENT */}
      {nextPatient ? (
        <section className="space-y-5">
          <div className="px-2">
            <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Próximo atendimento</h3>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="ios-card !p-12 space-y-12 shadow-[0_8px_40px_rgba(0,0,0,0.02)] border border-[#C6C6C8]/5 rounded-[32px]"
          >
            <div className="flex justify-between items-start gap-8">
              <div className="space-y-4">
                <h2 className="text-[34px] font-bold text-[#1C1C1E] leading-[1.15] tracking-[-0.02em]">
                  {nextPatient.patient_name}
                </h2>
                <div className="flex items-center gap-2">
                  {(() => {
                    const badge = getStatusBadge(nextPatient);
                    return (
                      <span className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${badge.className}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="text-right shrink-0 pt-2">
                <span className="text-[21px] font-bold text-[#1C1C1E] block leading-none">
                  {new Date(nextPatient.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-5">
                <div className="w-12 h-12 rounded-[22px] bg-[#F2F2F7] flex items-center justify-center text-[#1C1C1E]">
                  <ClipboardList size={22} />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest">Procedimento</span>
                  <span className="text-[17px] font-semibold text-[#1C1C1E]">{nextPatient.notes || 'Avaliação Geral'}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-5 pt-2">
              <motion.button
                whileTap={{ scale: 0.98, opacity: 0.9 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                onClick={() => openPatientRecord(nextPatient.patient_id)}
                className="bg-primary text-white w-full py-[22px] rounded-[30px] text-[17px] font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] transition-all"
              >
                Atender
              </motion.button>
              <div className="grid grid-cols-2 gap-5">
                <motion.button
                  whileTap={{ scale: 0.98, opacity: 0.9 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={() => sendReminder(nextPatient)}
                  className="flex items-center justify-center gap-2.5 px-6 py-[18px] rounded-[26px] border border-[#C6C6C8]/50 text-[15px] font-bold text-[#1C1C1E] bg-[#F9F9FB] transition-all"
                >
                  <MessageCircle size={18} className="text-primary" />
                  WhatsApp
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.98, opacity: 0.9 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onClick={() => onReschedule?.(nextPatient)}
                  className="flex items-center justify-center gap-2.5 py-[18px] rounded-[26px] text-[15px] font-bold text-[#8E8E93] hover:text-[#1C1C1E] transition-all"
                >
                  Reagendar
                </motion.button>
              </div>
            </div>
          </motion.div>
        </section>
      ) : (
        <section className="ios-card flex flex-col items-center justify-center py-16 text-center rounded-[32px] space-y-6">
          <div className="w-20 h-20 bg-[#F2F2F7] rounded-full flex items-center justify-center text-[#8E8E93]">
            <Calendar size={36} />
          </div>
          <div className="space-y-2">
            <p className="text-[19px] font-semibold text-[#1C1C1E]">Nenhuma consulta para agora</p>
            <p className="text-[15px] text-[#8E8E93]">Sua agenda está livre no momento</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-[16px] text-[13px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.1)]"
            >
              <CalendarPlus size={15} />
              Agendar consulta
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveTab('agenda')}
              className="flex items-center gap-2 bg-[#F2F2F7] text-[#1C1C1E] px-5 py-3 rounded-[16px] text-[13px] font-bold"
            >
              Ver agenda completa
            </motion.button>
          </div>
        </section>
      )}

      {/* 5. TODAY'S SCHEDULE */}
      {otherAppointments.length > 0 && (
        <section className="space-y-7">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Próximos da agenda</h3>
            <button onClick={() => setActiveTab('agenda')} className="text-[15px] font-bold text-primary">
              Ver tudo
            </button>
          </div>
          <div className="ios-card !p-0 overflow-hidden border border-[#C6C6C8]/5 rounded-[32px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {otherAppointments.map((app, index) => (
              <motion.div
                key={app.id}
                whileTap={{ backgroundColor: '#F2F2F7', scale: 0.995 }}
                transition={{ duration: 0.2 }}
                onClick={() => openPatientRecord(app.patient_id)}
                className={`flex items-center justify-between p-8 transition-colors cursor-pointer ${index !== otherAppointments.length - 1 ? 'border-b border-[#C6C6C8]/5' : ''}`}
              >
                <div className="flex items-center gap-7">
                  <span className="text-[15px] font-bold text-[#1C1C1E] w-12">
                    {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[17px] font-semibold text-[#1C1C1E]">{app.patient_name}</span>
                    <span className="text-[13px] text-[#8E8E93] font-medium">{app.notes || 'Consulta'}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-[#C6C6C8]" />
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* 6. ABANDONMENT RISK */}
      {intelligence && intelligence.abandonmentRisk.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <UserX size={18} className="text-rose-500" />
              <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Risco de abandono</h3>
            </div>
            <span className="text-[13px] font-bold text-[#8E8E93]">{intelligence.abandonmentRisk.length}</span>
          </div>
          <div className="ios-card !p-0 overflow-hidden border border-[#C6C6C8]/5 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {intelligence.abandonmentRisk.slice(0, 4).map(p => renderIntelligencePatient(p, false))}
          </div>
          {intelligence.abandonmentRisk.length > 4 && (
            <button type="button" onClick={() => setActiveTab('pacientes')} className="text-[14px] font-bold text-primary px-2">
              Ver todos →
            </button>
          )}
        </section>
      )}

      {/* 7. ATTENTION NEEDED */}
      {intelligence && intelligence.attentionNeeded.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <AlertTriangle size={18} className="text-amber-500" />
              <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Precisam de atenção</h3>
            </div>
            <span className="text-[13px] font-bold text-[#8E8E93]">{intelligence.attentionNeeded.length}</span>
          </div>
          <div className="ios-card !p-0 overflow-hidden border border-[#C6C6C8]/5 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            {intelligence.attentionNeeded.slice(0, 3).map(p => renderIntelligencePatient(p, false))}
          </div>
        </section>
      )}

      {/* 8. SMART SCHEDULING SUGGESTIONS */}
      {schedulingSuggestions.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2.5">
              <Calendar size={18} className="text-violet-500" />
              <h3 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Sugestões para hoje</h3>
            </div>
            <span className="text-[13px] font-bold text-violet-500">{schedulingSuggestions.length} horários</span>
          </div>
          <p className="text-[13px] text-[#8E8E93] px-2 -mt-2">
            Melhores encaixes para hoje
          </p>
          <div className="space-y-3">
            {schedulingSuggestions.slice(0, 4).map((sug, i) => {
              const dayLabel = (() => {
                const d = new Date(sug.suggested_slot.date + 'T12:00:00');
                const today = new Date(); today.setHours(0,0,0,0);
                const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
                if (d.toDateString() === today.toDateString()) return 'Hoje';
                if (d.toDateString() === tomorrow.toDateString()) return 'Amanhã';
                return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
              })();
              const beh = sug.behavior;
              const hasInsight = beh && (beh.confidence_label || beh.insight);
              const suggestionLabel = beh && (beh.attendance_rate !== null && beh.attendance_rate >= 0.75 || beh.confidence_label === 'Melhor horário' || beh.confidence_label === 'Alta chance de presença')
                ? 'Maior chance de comparecimento'
                : 'Baseado no histórico';

              const confidenceBadge = {
                bg: suggestionLabel === 'Maior chance de comparecimento' ? 'bg-emerald-50' : 'bg-violet-50',
                text: suggestionLabel === 'Maior chance de comparecimento' ? 'text-emerald-700' : 'text-violet-700',
                border: suggestionLabel === 'Maior chance de comparecimento' ? 'border-emerald-100' : 'border-violet-100',
              };

              const procedureLabel = sug.procedure || 'Consulta';
              const durationLabel = sug.duration_minutes ? `${sug.duration_minutes} min` : '30 min';

              return (
                <motion.div
                  key={`sug-${i}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white rounded-[20px] border border-violet-100 p-5 shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-11 h-11 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center font-bold text-sm overflow-hidden border border-violet-100 shrink-0">
                      {sug.patient.photo_url ? (
                        <img src={sug.patient.photo_url} alt={sug.patient.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        (sug.patient.patient_name || '?').charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{sug.patient.patient_name}</p>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 shrink-0">
                          {procedureLabel}
                        </span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${confidenceBadge.bg} ${confidenceBadge.text} border ${confidenceBadge.border} shrink-0`}>
                          {suggestionLabel}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#8E8E93] mb-2">{sug.reason}</p>

                      {/* Behavioral insight */}
                      {hasInsight && beh!.insight && (
                        <div className="flex items-start gap-1.5 mb-3 bg-[#F9F9FB] rounded-xl px-3 py-2">
                          <Sparkles size={11} className="text-violet-400 mt-0.5 shrink-0" />
                          <p className="text-[11px] text-[#636366] leading-snug font-medium">
                            {beh!.insight}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1.5 rounded-full">
                          <Calendar size={12} className="text-violet-600" />
                          <span className="text-[12px] font-bold text-violet-700">{dayLabel}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-violet-50 px-3 py-1.5 rounded-full">
                          <Clock size={12} className="text-violet-600" />
                          <span className="text-[12px] font-bold text-violet-700">{sug.suggested_slot.start} – {sug.suggested_slot.end}</span>
                        </div>
                        <div className="flex items-center gap-1.5 bg-[#F2F2F7] px-3 py-1.5 rounded-full">
                          <span className="text-[12px] font-bold text-[#636366]">{durationLabel}</span>
                        </div>
                        {beh?.attendance_rate !== null && beh?.attendance_rate !== undefined && beh.attendance_rate >= 0.5 && (
                          <div className="flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-full">
                            <ThumbsUp size={11} className="text-emerald-600" />
                            <span className="text-[11px] font-bold text-emerald-700">{Math.round(beh.attendance_rate * 100)}% presença</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSchedulePatient?.(sug.patient.patient_id, sug.suggested_slot.date, sug.suggested_slot.start, sug.suggested_slot.end, sug.procedure)}
                      className="flex-1 flex items-center justify-center gap-2 bg-violet-600 text-white py-3 rounded-2xl text-[13px] font-bold shadow-[0_4px_16px_rgba(109,40,217,0.15)] hover:bg-violet-700 transition-colors"
                    >
                      <CalendarPlus size={14} />
                      Agendar
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openPatientRecord(sug.patient.patient_id)}
                      className="px-5 py-3 rounded-2xl text-[13px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
                    >
                      Ver prontuário
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          {schedulingSuggestions.length > 4 && (
            <button type="button" onClick={() => setActiveTab('agenda')} className="text-[14px] font-bold text-violet-600 px-2">
              Ver todas as {schedulingSuggestions.length} sugestões →
            </button>
          )}
        </section>
      )}

      {/* 9. WHATSAPP REMINDERS */}
      {tomorrowUnconfirmedCount > 0 && (
        <section className="px-1">
          <div className="ios-card !bg-[#F2F2F7] !p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-none rounded-[32px]">
            <div className="flex items-center gap-6">
              <div className="w-14 h-14 bg-white rounded-[22px] flex items-center justify-center text-primary shadow-[0_4px_12px_rgba(0,0,0,0.03)] shrink-0">
                <MessageCircle size={28} />
              </div>
              <div className="flex flex-col gap-0.5">
                <h4 className="text-[17px] font-bold text-[#1C1C1E]">Lembretes de amanhã</h4>
                <p className="text-[14px] text-[#8E8E93] font-medium">{tomorrowUnconfirmedCount} paciente{tomorrowUnconfirmedCount === 1 ? '' : 's'} para confirmar</p>
              </div>
            </div>
            <motion.button
              whileTap={{ scale: 0.97, opacity: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={openReminderModal}
              className="bg-primary text-white px-8 py-4 rounded-[999px] text-[14px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.1)] w-full sm:w-auto"
            >
              Enviar lembretes
            </motion.button>
          </div>

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
                      <h4 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">Confirmações de amanhã</h4>
                      <p className="text-[14px] text-[#8E8E93] mt-1">
                        {tomorrowUnconfirmedAppointments.length} paciente{tomorrowUnconfirmedAppointments.length === 1 ? '' : 's'} aguardando mensagem de confirmação
                      </p>
                    </div>
                    <button
                      onClick={() => setIsReminderModalOpen(false)}
                      className="w-9 h-9 rounded-full bg-[#F2F2F7] text-[#8E8E93] hover:text-[#1C1C1E] transition-colors flex items-center justify-center shrink-0"
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
                              <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{appointment.patient_name}</p>
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700">
                                Pendente
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1.5 text-[13px] text-[#8E8E93] font-medium flex-wrap">
                              <span>{startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              <span>•</span>
                              <span>{appointment.notes || 'Consulta'}</span>
                            </div>
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => sendReminder(appointment)}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-[18px] bg-primary text-white text-[13px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.1)]"
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
                      className="w-full h-[46px] rounded-[16px] bg-[#F2F2F7] text-[#4B5250] text-[14px] font-medium hover:bg-[#E9E9EE] transition-colors"
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

      {/* 10. FINANCIAL SUMMARY */}
      <section className="flex justify-center pt-10 pb-20">
        <p className="text-[15px] font-medium text-[#8E8E93]">
          Faturamento hoje: <span className="text-[#1C1C1E] font-bold">{(todayRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </p>
      </section>
    </div>
  );
};
