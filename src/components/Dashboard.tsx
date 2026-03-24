import React, { useEffect, useState } from 'react';
import { ClipboardList, MessageCircle, Calendar, CalendarPlus, ChevronRight, AlertTriangle, UserX, TrendingUp, Clock, Sparkles, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';

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

interface DashboardProps {
  user: any;
  patients: any[];
  nextAppointments: any[];
  todayAppointmentsTotalCount: number;
  todayAppointmentsRemainingCount: number;
  tomorrowUnconfirmedCount: number;
  todayRevenue: number;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  openPatientRecord: (id: number) => void;
  setIsModalOpen: (open: boolean) => void;
  setActiveTab: (tab: any) => void;
  sendReminder: (appointment: any) => void;
  onReschedule?: (appointment: any) => void;
  onSchedulePatient?: (patientId: number, date: string, startTime: string, endTime: string) => void;
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
  nextAppointments = [],
  todayAppointmentsRemainingCount = 0,
  tomorrowUnconfirmedCount = 0,
  todayRevenue = 0,
  openPatientRecord,
  setActiveTab,
  sendReminder,
  onReschedule,
  onSchedulePatient
}) => {
  const [intelligence, setIntelligence] = useState<DashboardIntelligence | null>(null);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingSuggestion[]>([]);
  const [loading, setLoading] = useState(true);

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
        <section className="ios-card flex flex-col items-center justify-center py-24 text-center rounded-[32px]">
          <div className="w-20 h-20 bg-[#F2F2F7] rounded-full flex items-center justify-center text-[#8E8E93] mb-8">
            <Calendar size={36} />
          </div>
          <p className="text-[19px] font-semibold text-[#1C1C1E]">Nenhuma consulta para agora</p>
          <p className="text-[15px] text-[#8E8E93] mt-2">Sua agenda está livre no momento</p>
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
                      onClick={() => onSchedulePatient?.(sug.patient.patient_id, sug.suggested_slot.date, sug.suggested_slot.start, sug.suggested_slot.end)}
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
              className="bg-primary text-white px-8 py-4 rounded-[999px] text-[14px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.1)] w-full sm:w-auto"
            >
              Enviar lembretes
            </motion.button>
          </div>
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
