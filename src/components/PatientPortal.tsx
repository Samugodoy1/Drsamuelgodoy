import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  FileText,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Stethoscope,
  Activity,
  CalendarPlus,
  User,
  Heart,
  Shield,
  Download,
  X,
  Home,
  ClipboardList,
  Phone
} from '../icons';

interface PortalData {
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    cpf: string;
    birth_date: string;
    photo_url: string;
    address: string;
    consent_accepted: boolean;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    health_insurance?: string;
    health_insurance_number?: string;
    treatment_plan?: Array<{ id: string; procedure?: string; value?: number; status?: string }>;
  };
  anamnesis: {
    medical_history: string;
    allergies: string;
    medications: string;
    chief_complaint: string;
  } | null;
  appointments: Array<{
    id: number;
    start_time: string;
    end_time: string;
    status: string;
    notes: string;
    dentist_name: string;
  }>;
  files: Array<{
    id: number;
    file_url: string;
    file_type: string;
    description: string;
    created_at: string;
  }>;
  evolution: Array<{
    id: number;
    date: string;
    procedure_performed: string;
    notes: string;
    dentist_name: string;
  }>;
  payment_plans: Array<{
    id: number;
    procedure: string;
    total_amount: number;
    installments_count: number;
    status: string;
    installments: Array<{
      number: number;
      amount: number;
      due_date: string;
      status: string;
      payment_date: string | null;
    }>;
  }>;
  transactions: Array<{
    id: number;
    type: string;
    description: string;
    category: string;
    amount: number;
    payment_method: string;
    date: string;
    status: string;
    procedure: string | null;
    notes: string | null;
  }>;
  installments: Array<{
    id: number;
    payment_plan_id: number;
    number: number;
    amount: number;
    due_date: string;
    status: string;
    payment_date: string | null;
    procedure: string;
  }>;
  consents: Array<{
    consent_type: string;
    signed_at: string;
  }>;
  clinic: {
    name: string;
    clinic_name: string;
    clinic_address: string;
    phone: string;
    photo_url: string;
    specialty: string;
  } | null;
}

type Tab = 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro' | 'agendar';

export function PatientPortal() {
  const { token } = useParams<{ token: string }>();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');

  // Appointment request form
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    preferred_date: '',
    preferred_time: '',
    notes: ''
  });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'new' | 'reschedule'>('new');
  const [scheduleTargetAppointment, setScheduleTargetAppointment] = useState<PortalData['appointments'][number] | null>(null);
  const [appointmentSubmittingId, setAppointmentSubmittingId] = useState<number | null>(null);
  const [confirmedAppointmentId, setConfirmedAppointmentId] = useState<number | null>(null);
  const [rescheduleRequestedAppointmentId, setRescheduleRequestedAppointmentId] = useState<number | null>(null);

  const scheduleModalRef = useRef<HTMLDivElement | null>(null);
  const pixModalRef = useRef<HTMLDivElement | null>(null);

  // Payment
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // Payment
  const [showPixModal, setShowPixModal] = useState<{ amount: number; installment_id?: number; label: string } | null>(null);
  const [pixInfo, setPixInfo] = useState<{ has_pix: boolean; pix_key?: string; pix_key_type?: string; beneficiary_name?: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [paymentInformed, setPaymentInformed] = useState(false);

  useEffect(() => {
    authenticateAndLoad();
  }, [token]);

  const authenticateAndLoad = async () => {
    try {
      const authRes = await fetch(`/api/portal/auth/${token}`);
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || 'Link inválido ou expirado');
        setLoading(false);
        return;
      }
      setSessionToken(authData.session_token);

      // Load portal data
      const dataRes = await fetch('/api/portal/data', {
        headers: { 'Authorization': `Bearer ${authData.session_token}` }
      });
      const portalData = await dataRes.json();
      if (!dataRes.ok) throw new Error(portalData.error);
      setData(portalData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAppointment = async () => {
    if (!scheduleForm.preferred_date) return;
    setScheduleSubmitting(true);
    try {
      const isReschedule = scheduleMode === 'reschedule' && scheduleTargetAppointment;
      const res = await fetch(isReschedule ? '/api/portal/reschedule-appointment' : '/api/portal/request-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(
          isReschedule
            ? {
                appointment_id: scheduleTargetAppointment.id,
                preferred_date: scheduleForm.preferred_date,
                preferred_time: scheduleForm.preferred_time,
                reason: scheduleForm.notes
              }
            : scheduleForm
        )
      });
      if (!res.ok) throw new Error('Erro ao solicitar');
      setScheduleSuccess(true);
      if (isReschedule) {
        setRescheduleRequestedAppointmentId(scheduleTargetAppointment.id);
      }
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleSuccess(false);
        setScheduleMode('new');
        setScheduleTargetAppointment(null);
        setScheduleForm({ preferred_date: '', preferred_time: '', notes: '' });
      }, 2000);
    } catch {
      setError(scheduleMode === 'reschedule' ? 'Erro ao solicitar reagendamento' : 'Erro ao solicitar agendamento');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleConfirmAppointment = async (appointmentId: number) => {
    // Optimistic update — muda status imediatamente na UI
    setData((current) => {
      if (!current) return current;
      return {
        ...current,
        appointments: current.appointments.map((a) =>
          a.id === appointmentId ? { ...a, status: 'CONFIRMED' } : a
        )
      };
    });
    setConfirmedAppointmentId(appointmentId);
    setAppointmentSubmittingId(appointmentId);

    try {
      const res = await fetch('/api/portal/confirm-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ appointment_id: appointmentId })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        // Reverte update otimista em caso de erro
        setData((current) => {
          if (!current) return current;
          return {
            ...current,
            appointments: current.appointments.map((a) =>
              a.id === appointmentId ? { ...a, status: 'SCHEDULED' } : a
            )
          };
        });
        setConfirmedAppointmentId(null);
        throw new Error(payload?.error || 'Erro ao confirmar consulta');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar consulta');
      setTimeout(() => setError(null), 4000);
    } finally {
      setAppointmentSubmittingId(null);
    }
  };

  const loadPixInfo = async () => {
    if (!sessionToken || pixInfo) return;
    try {
      const res = await fetch('/api/portal/pix-info', { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      if (res.ok) setPixInfo(await res.json());
    } catch {}
  };

  const handleInformPayment = async (amount: number, installment_id?: number) => {
    setActionSubmitting(true);
    try {
      const res = await fetch('/api/portal/inform-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ amount, installment_id })
      });
      if (!res.ok) throw new Error();
      setPaymentInformed(true);
      setTimeout(() => { setShowPixModal(null); setPaymentInformed(false); }, 2500);
    } catch { setError('Erro ao informar pagamento'); }
    finally { setActionSubmitting(false); }
  };

  const copyToClipboard = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setPixCopied(true); setTimeout(() => setPixCopied(false), 2000); } catch {}
  };

  // Manage focus + keyboard for modals (basic trap + Escape)
  useEffect(() => {
    if (!showScheduleModal) return;
    const el = scheduleModalRef.current;
    const first = el?.querySelector<HTMLElement>('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeScheduleModal();
      }
      if (e.key === 'Tab') {
        const focusable = el?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const nodes = Array.from(focusable);
        const idx = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (idx === 0) { nodes[nodes.length - 1].focus(); e.preventDefault(); }
        } else {
          if (idx === nodes.length - 1) { nodes[0].focus(); e.preventDefault(); }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showScheduleModal]);

  useEffect(() => {
    if (!showPixModal) return;
    const el = pixModalRef.current;
    const first = el?.querySelector<HTMLElement>('button, input, select, textarea, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!actionSubmitting) setShowPixModal(null);
      }
      if (e.key === 'Tab') {
        const focusable = el?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), textarea, input:not([type="hidden"]), select, [tabindex]:not([tabindex="-1"])');
        if (!focusable || focusable.length === 0) return;
        const nodes = Array.from(focusable);
        const idx = nodes.indexOf(document.activeElement as HTMLElement);
        if (e.shiftKey) {
          if (idx === 0) { nodes[nodes.length - 1].focus(); e.preventDefault(); }
        } else {
          if (idx === nodes.length - 1) { nodes[0].focus(); e.preventDefault(); }
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [showPixModal, actionSubmitting]);

  const openNewScheduleModal = () => {
    setScheduleMode('new');
    setScheduleTargetAppointment(null);
    setScheduleSuccess(false);
    setScheduleForm({ preferred_date: '', preferred_time: '', notes: '' });
    setShowScheduleModal(true);
  };

  const openRescheduleModal = (appointment: PortalData['appointments'][number]) => {
    setScheduleMode('reschedule');
    setScheduleTargetAppointment(appointment);
    setScheduleSuccess(false);
    setScheduleForm({
      preferred_date: new Date(appointment.start_time).toLocaleDateString('en-CA'),
      preferred_time: '',
      notes: ''
    });
    setShowScheduleModal(true);
  };

  const closeScheduleModal = () => {
    if (scheduleSubmitting) return;
    setShowScheduleModal(false);
    setScheduleSuccess(false);
    setScheduleMode('new');
    setScheduleTargetAppointment(null);
    setScheduleForm({ preferred_date: '', preferred_time: '', notes: '' });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-[3px] border-[#C6C6C8] border-t-[#0C9B72] rounded-full animate-spin" />
        <p role="status" aria-live="polite" className="text-[#8E8E93] text-[15px] font-medium tracking-tight">Carregando...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={28} className="text-[#FF3B30]" />
        </div>
        <h2 className="text-[20px] font-semibold text-[#1C1C1E] mb-2 tracking-tight">Acesso Indisponível</h2>
        <p className="text-[#8E8E93] text-[15px] leading-relaxed">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { patient, clinic, appointments, evolution, files, payment_plans, transactions = [], installments = [] } = data;

  const futureAppointments = appointments
    .filter(a => new Date(a.start_time) > new Date() && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const pastAppointments = appointments
    .filter(a => new Date(a.start_time) <= new Date() || a.status === 'CANCELLED')
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: 'inicio', icon: Home, label: 'Início' },
    { id: 'consultas', icon: Calendar, label: 'Consultas' },
    { id: 'evolucao', icon: Activity, label: 'Evolução' },
    { id: 'documentos', icon: FileText, label: 'Documentos' },
    { id: 'financeiro', icon: DollarSign, label: 'Financeiro' },
  ];

  const formatDateBR = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const formatTimeBR = (d: string) => {
    try { return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; }
  };

  const getConfirmationQuestion = (appointmentDate: string) => {
    const date = new Date(appointmentDate);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (left: Date, right: Date) => (
      left.getFullYear() === right.getFullYear()
      && left.getMonth() === right.getMonth()
      && left.getDate() === right.getDate()
    );

    const dayLabel = isSameDay(date, today)
      ? 'hoje'
      : isSameDay(date, tomorrow)
      ? 'amanhã'
      : `dia ${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

    return `Você vem ${dayLabel} às ${formatTimeBR(appointmentDate)}?`;
  };

  const statusLabel = (s: string) => {
    const map: Record<string, { label: string; color: string }> = {
      'SCHEDULED': { label: 'Agendado', color: 'bg-[#007AFF]/10 text-[#007AFF]' },
      'CONFIRMED': { label: 'Confirmado', color: 'bg-[#34C759]/10 text-[#34C759]' },
      'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-[#FF9500]/10 text-[#FF9500]' },
      'FINISHED': { label: 'Finalizado', color: 'bg-[#E5E5EA] text-[#8E8E93]' },
      'CANCELLED': { label: 'Cancelado', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
      'NO_SHOW': { label: 'Faltou', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' }
    };
    return map[s] || { label: s, color: 'bg-[#E5E5EA] text-[#8E8E93]' };
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  // ─── Detect recent procedures for post-care guide ───
  type ProcedureCategory = 'implante' | 'enxerto' | 'extracao' | 'cirurgia' | 'canal' | 'restauracao' | 'clareamento' | 'protese' | 'ortodontia' | 'raspagem' | 'limpeza';

  const PROCEDURE_PATTERNS: Array<{ category: ProcedureCategory; pattern: RegExp; days: number }> = [
    { category: 'implante',    pattern: /implante/i, days: 3 },
    { category: 'enxerto',     pattern: /enxerto/i, days: 3 },
    { category: 'extracao',    pattern: /extração|extraç|exodontia|exo\b|siso|terceiro.?molar/i, days: 3 },
    { category: 'cirurgia',    pattern: /cirurgia|frenectomia|apicectomia|gengivectomia|biópsia|biopsia|alveoloplastia/i, days: 3 },
    { category: 'canal',       pattern: /canal|endo(?:dont|do)|pulpectomia/i, days: 2 },
    { category: 'restauracao', pattern: /restaura[çc]|resina|amálgama|amalgama|obtura[çc]/i, days: 1 },
    { category: 'clareamento', pattern: /clareamento|branqueamento|whitening/i, days: 2 },
    { category: 'protese',     pattern: /prótese|protese|coroa|faceta|lente|onlay|inlay|overlay/i, days: 2 },
    { category: 'ortodontia',  pattern: /ortod|aparelho|bracket|alinhador|invisalign|manuten[çc]ão ortod/i, days: 1 },
    { category: 'raspagem',    pattern: /raspagem|curetagem|periodon/i, days: 2 },
    { category: 'limpeza',     pattern: /limpeza|profilaxia|tartaro|tártaro/i, days: 1 },
  ];

  const detectCategory = (text: string): { category: ProcedureCategory; days: number } | null => {
    for (const p of PROCEDURE_PATTERNS) {
      if (p.pattern.test(text)) return { category: p.category, days: p.days };
    }
    return null;
  };

  const getRecentProcedures = () => {
    const results: Array<{ date: string; procedure: string; category: ProcedureCategory }> = [];
    const seen = new Set<string>();

    // Dates of cancelled appointments — skip any procedures tied to these
    const cancelledDates = new Set(
      appointments.filter(a => a.status === 'CANCELLED').map(a => new Date(a.start_time).toDateString())
    );

    // Words that indicate the procedure is just STARTING, not completed
    const START_KEYWORDS = /início|inicio|preparo|moldagem|planejamento|provisór|escaneamento|cimentação provisória|teste|prova|avaliação|consulta inicial|primeira etapa|1[ªa] etapa|abertura/i;

    // Check evolution records (skip if matching a cancelled appointment date or indicates start of treatment)
    evolution.forEach(e => {
      const text = `${e.procedure_performed || ''} ${e.notes || ''}`;
      const match = detectCategory(text);
      if (!match) return;
      if (START_KEYWORDS.test(e.notes || '') || START_KEYWORDS.test(e.procedure_performed || '')) return;
      const date = new Date(e.date);
      if (isNaN(date.getTime())) return;
      if (cancelledDates.has(date.toDateString())) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - match.days);
      cutoff.setHours(0, 0, 0, 0);
      if (date < cutoff) return;
      const key = `${date.toDateString()}-${match.category}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ date: e.date, procedure: e.procedure_performed || e.notes || 'Procedimento', category: match.category });
    });

    // Also check FINISHED appointments with notes (covers case where no evolution was created)
    appointments.filter(a => a.status === 'FINISHED' && a.notes).forEach(a => {
      const match = detectCategory(a.notes);
      if (!match) return;
      if (START_KEYWORDS.test(a.notes)) return;
      const date = new Date(a.start_time);
      if (cancelledDates.has(date.toDateString())) return;
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - match.days);
      if (date < cutoff) return;
      const key = `${date.toDateString()}-${match.category}`;
      if (seen.has(key)) return;
      seen.add(key);
      results.push({ date: a.start_time, procedure: a.notes, category: match.category });
    });

    return results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const recentProcedures = getRecentProcedures();

  const PROCEDURE_GUIDES: Record<ProcedureCategory, { title: string; color: string; borderColor: string; iconBg: string; items: Array<{ icon: string; text: string }> }> = {
    implante: {
      title: 'Cuidados Pós-Implante',
      color: 'text-[#FF9500]', borderColor: 'border-[#FF9500]/15', iconBg: 'from-[#FF9500]/5 to-[#FF6B00]/5',
      items: [
        { icon: '🧊', text: 'Aplique gelo no rosto (20 min sim / 20 min não) nas primeiras 48h' },
        { icon: '🍽️', text: 'Alimentação pastosa e fria nas primeiras 72h' },
        { icon: '🚫', text: 'Não faça bochechos nas primeiras 24h' },
        { icon: '💊', text: 'Tome a medicação prescrita nos horários corretos' },
        { icon: '🦷', text: 'Evite mastigar do lado operado por 7 dias' },
        { icon: '🚭', text: 'Não fume por pelo menos 7 dias — o cigarro compromete a cicatrização' },
        { icon: '🛌', text: 'Durma com a cabeça elevada nas primeiras 2 noites' },
        { icon: '⚠️', text: 'Sangramento leve nas primeiras 24h é normal. Se persistir, entre em contato' },
      ]
    },
    enxerto: {
      title: 'Cuidados Pós-Enxerto',
      color: 'text-[#FF9500]', borderColor: 'border-[#FF9500]/15', iconBg: 'from-[#FF9500]/5 to-[#FF6B00]/5',
      items: [
        { icon: '🧊', text: 'Aplique gelo no rosto (20 min sim / 20 min não) nas primeiras 48h' },
        { icon: '🍽️', text: 'Alimentação pastosa e fria nas primeiras 72h' },
        { icon: '🚫', text: 'Não toque a região operada com a língua ou os dedos' },
        { icon: '💊', text: 'Tome a medicação prescrita nos horários corretos' },
        { icon: '🦷', text: 'Evite mastigar do lado operado por até 14 dias' },
        { icon: '🚭', text: 'Não fume — o cigarro pode comprometer o enxerto' },
        { icon: '🛌', text: 'Durma com a cabeça elevada nas primeiras 2 noites' },
        { icon: '🏃', text: 'Evite atividades físicas intensas por 5 dias' },
      ]
    },
    extracao: {
      title: 'Cuidados Pós-Extração',
      color: 'text-[#FF9500]', borderColor: 'border-[#FF9500]/15', iconBg: 'from-[#FF9500]/5 to-[#FF6B00]/5',
      items: [
        { icon: '🧊', text: 'Aplique gelo no rosto (20 min sim / 20 min não) nas primeiras 24h' },
        { icon: '🍽️', text: 'Alimentação pastosa e fria nas primeiras 48h' },
        { icon: '🚫', text: 'Não faça bochechos nas primeiras 24h' },
        { icon: '💊', text: 'Tome a medicação prescrita nos horários corretos' },
        { icon: '🩸', text: 'Morda a gaze por 30 minutos para ajudar na coagulação' },
        { icon: '🚭', text: 'Não fume por pelo menos 3 dias' },
        { icon: '🏃', text: 'Evite atividades físicas intensas por 48h' },
        { icon: '⚠️', text: 'Sangramento leve é normal. Se for intenso, entre em contato' },
      ]
    },
    cirurgia: {
      title: 'Cuidados Pós-Cirúrgicos',
      color: 'text-[#FF9500]', borderColor: 'border-[#FF9500]/15', iconBg: 'from-[#FF9500]/5 to-[#FF6B00]/5',
      items: [
        { icon: '🧊', text: 'Aplique gelo no rosto (20 min sim / 20 min não) nas primeiras 24–48h' },
        { icon: '🍽️', text: 'Alimentação pastosa e fria nos primeiros dias' },
        { icon: '🚫', text: 'Não faça bochechos vigorosos nas primeiras 24h' },
        { icon: '💊', text: 'Tome a medicação prescrita nos horários corretos' },
        { icon: '🚭', text: 'Evite fumar durante o período de recuperação' },
        { icon: '🏃', text: 'Evite atividades físicas intensas por 48h' },
        { icon: '🛌', text: 'Durma com a cabeça elevada nas primeiras noites' },
        { icon: '⚠️', text: 'Em caso de dor intensa, sangramento ou inchaço anormal, entre em contato' },
      ]
    },
    canal: {
      title: 'Cuidados Pós-Canal',
      color: 'text-[#AF52DE]', borderColor: 'border-[#AF52DE]/15', iconBg: 'from-[#AF52DE]/5 to-[#8B3FC7]/5',
      items: [
        { icon: '🦷', text: 'Evite mastigar com o dente tratado até a restauração definitiva' },
        { icon: '💊', text: 'Tome a medicação prescrita para dor e inflamação' },
        { icon: '🍽️', text: 'Prefira alimentos macios do lado oposto nas primeiras 24h' },
        { icon: '🚫', text: 'Não morda objetos duros (canetas, gelo, unhas)' },
        { icon: '🪥', text: 'Escove normalmente, mas com cuidado na região tratada' },
        { icon: '⚠️', text: 'Sensibilidade leve nos primeiros dias é normal — se a dor aumentar, entre em contato' },
      ]
    },
    restauracao: {
      title: 'Orientações Pós-Restauração',
      color: 'text-[#007AFF]', borderColor: 'border-[#007AFF]/15', iconBg: 'from-[#007AFF]/5 to-[#005EC4]/5',
      items: [
        { icon: '🍽️', text: 'Evite alimentos muito duros ou pegajosos nas primeiras 24h' },
        { icon: '🥤', text: 'Evite bebidas e alimentos muito quentes ou muito frios nas primeiras horas' },
        { icon: '🦷', text: 'A mordida pode parecer diferente — se incomodar após 2 dias, entre em contato para ajuste' },
        { icon: '🪥', text: 'Escove e use fio dental normalmente' },
        { icon: '⚠️', text: 'Sensibilidade leve é normal e tende a diminuir em alguns dias' },
      ]
    },
    clareamento: {
      title: 'Cuidados Pós-Clareamento',
      color: 'text-[#5AC8FA]', borderColor: 'border-[#5AC8FA]/15', iconBg: 'from-[#5AC8FA]/5 to-[#34AADC]/5',
      items: [
        { icon: '🚫', text: 'Evite alimentos e bebidas com corantes por 48h (café, vinho, açaí, beterraba, molho de tomate)' },
        { icon: '🚭', text: 'Não fume por pelo menos 48h — o tabaco mancha os dentes' },
        { icon: '🍽️', text: 'Prefira a "dieta branca": arroz, frango, leite, banana, água' },
        { icon: '🥤', text: 'Se tomar bebidas escuras, use canudo' },
        { icon: '🪥', text: 'Use creme dental para sensibilidade se houver desconforto' },
        { icon: '⚠️', text: 'Sensibilidade temporária é normal e costuma cessar em 24–48h' },
      ]
    },
    protese: {
      title: 'Orientações para Prótese/Coroa',
      color: 'text-[#34C759]', borderColor: 'border-[#34C759]/15', iconBg: 'from-[#34C759]/5 to-[#28A745]/5',
      items: [
        { icon: '🍽️', text: 'Evite alimentos muito duros ou pegajosos nas primeiras 24h' },
        { icon: '🦷', text: 'A mordida pode parecer diferente no início — isso é normal e se ajusta em alguns dias' },
        { icon: '🪥', text: 'Escove e use fio dental normalmente, passando o fio com cuidado ao redor da peça' },
        { icon: '🚫', text: 'Evite morder objetos duros diretamente sobre a prótese' },
        { icon: '🗓️', text: 'Compareça ao retorno agendado para checagem e ajuste final' },
        { icon: '⚠️', text: 'Se a prótese soltar ou machucar, entre em contato imediatamente' },
      ]
    },
    ortodontia: {
      title: 'Orientações Pós-Ajuste Ortodôntico',
      color: 'text-[#FF2D55]', borderColor: 'border-[#FF2D55]/15', iconBg: 'from-[#FF2D55]/5 to-[#D4234A]/5',
      items: [
        { icon: '💊', text: 'Desconforto e sensibilidade nos dentes é normal por 2–3 dias após o ajuste' },
        { icon: '🍽️', text: 'Prefira alimentos macios nos primeiros dias' },
        { icon: '🚫', text: 'Evite alimentos duros, pegajosos e pipoca que podem soltar bráquetes' },
        { icon: '🪥', text: 'Escove após cada refeição usando escova ortodôntica e fio dental com passa-fio' },
        { icon: '🧴', text: 'Use cera ortodôntica se algum fio ou bráquete estiver machucando' },
        { icon: '⚠️', text: 'Se um bráquete soltar ou o fio machucar, entre em contato antes do próximo ajuste' },
      ]
    },
    raspagem: {
      title: 'Cuidados Pós-Raspagem',
      color: 'text-[#FF9500]', borderColor: 'border-[#FF9500]/15', iconBg: 'from-[#FF9500]/5 to-[#FF6B00]/5',
      items: [
        { icon: '🩸', text: 'Sangramento leve na gengiva é normal nas primeiras 24h' },
        { icon: '🪥', text: 'Escove suavemente e use fio dental — não deixe de escovar mesmo se doer um pouco' },
        { icon: '🧴', text: 'Use enxaguante bucal ou o bochecho prescrito para auxiliar na recuperação gengival' },
        { icon: '🍽️', text: 'Evite alimentos muito condimentados ou ácidos nas primeiras 24h' },
        { icon: '🚭', text: 'Evite fumar — o cigarro prejudica a cicatrização da gengiva' },
        { icon: '⚠️', text: 'Se o sangramento persistir após 48h ou houver febre, entre em contato' },
      ]
    },
    limpeza: {
      title: 'Após sua Limpeza',
      color: 'text-[#34C759]', borderColor: 'border-[#34C759]/15', iconBg: 'from-[#34C759]/5 to-[#28A745]/5',
      items: [
        { icon: '🪥', text: 'Mantenha a escovação 3x ao dia e use fio dental diariamente' },
        { icon: '🧴', text: 'Enxaguante bucal após as refeições ajuda a manter a saúde gengival' },
        { icon: '🍬', text: 'Reduza o consumo de açúcar para prevenir cáries' },
        { icon: '💧', text: 'Beba bastante água — ela ajuda a manter a boca limpa' },
        { icon: '🗓️', text: 'Agende seu retorno para daqui a 6 meses para manter os dentes saudáveis' },
      ]
    },
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      {/* Accessible announcer for screen readers */}
      <div id="a11y-announcer" aria-live="polite" className="sr-only">
        {error || (scheduleSuccess ? (scheduleMode === 'reschedule' ? 'Pedido de reagendamento enviado' : 'Solicitação de agendamento enviada') : '') || (paymentInformed ? 'Pagamento informado' : '') || (pixCopied ? 'Chave PIX copiada' : '')}
      </div>
      {/* ─── Header: frosted, minimal ─── */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3.5">
          {clinic?.photo_url ? (
            <img src={clinic.photo_url} alt={clinic?.clinic_name || clinic?.name || 'Minha Clínica'} className="w-9 h-9 rounded-full object-cover ring-1 ring-[#C6C6C8]/40" />
          ) : (
            <div className="w-9 h-9 bg-[#E5E5EA] rounded-full flex items-center justify-center">
              <Stethoscope size={18} className="text-[#8E8E93]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[#1C1C1E] text-[15px] font-semibold tracking-tight truncate">
              {clinic?.clinic_name || clinic?.name || 'Minha Clínica'}
            </p>
          </div>
          {patient.photo_url ? (
            <img src={patient.photo_url} alt={patient.name} className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C6C6C8]/40" />
          ) : (
            <div className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center text-[13px] font-semibold text-[#8E8E93]">
              {patient.name.charAt(0)}
            </div>
          )}
        </div>
      </div>

      {/* ─── Content ─── */}
      <div className="max-w-lg mx-auto px-5 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            {/* ═══ HOME TAB ═══ */}
            {activeTab === 'inicio' && (
              <div className="space-y-6">
                {/* ── Greeting with dentist's personal touch ── */}
                {(() => {
                  const firstName = patient.name.split(' ')[0];
                  const dentistFirstName = clinic?.name?.split(' ').slice(0, 2).join(' ') || 'seu dentista';
                  const treatmentPlan = patient.treatment_plan || [];
                  const hasActiveTreatment = treatmentPlan.some((t: any) => String(t.status || '').toUpperCase() !== 'REALIZADO');
                  const completed = treatmentPlan.filter((t: any) => String(t.status || '').toUpperCase() === 'REALIZADO').length;
                  const total = treatmentPlan.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  const nextStep = treatmentPlan.find((t: any) => String(t.status || '').toUpperCase() !== 'REALIZADO');

                  // Build a warm, contextual dentist message
                  const lastEvolution = evolution.length > 0 ? evolution[0] : null;
                  const nextAppt = futureAppointments.length > 0 ? futureAppointments[0] : null;

                  let personalMessage = '';
                  if (pct === 100 && total > 0) {
                    personalMessage = `${firstName}, seu tratamento foi concluído com sucesso! Cuide bem do seu sorriso e lembre-se dos retornos periódicos.`;
                  } else if (nextStep && pct >= 50) {
                    personalMessage = `${firstName}, estamos na reta final! A próxima etapa é ${nextStep.procedure || 'importante'} — cada passo conta para o resultado.`;
                  } else if (nextStep && lastEvolution) {
                    personalMessage = `${firstName}, na última sessão fizemos ${lastEvolution.procedure_performed || 'um bom avanço'}. Agora o próximo passo é ${nextStep.procedure || 'continuar o tratamento'}.`;
                  } else if (nextAppt && !hasActiveTreatment) {
                    personalMessage = `${firstName}, te espero na próxima consulta! Qualquer dúvida, é só chamar.`;
                  } else if (nextStep) {
                    personalMessage = `${firstName}, vamos começar com ${nextStep.procedure || 'o tratamento'}. Estou te acompanhando em cada etapa.`;
                  } else {
                    personalMessage = `${firstName}, que bom ter você aqui! Estou acompanhando sua saúde bucal de perto.`;
                  }

                  // Treatment case name (derived from plan procedures)
                  const uniqueProcedures = [...new Set(treatmentPlan.map((t: any) => t.procedure).filter(Boolean))];
                  const caseName = uniqueProcedures.length === 1
                    ? uniqueProcedures[0]
                    : uniqueProcedures.length <= 3
                    ? uniqueProcedures.join(', ')
                    : `${uniqueProcedures.slice(0, 2).join(', ')} e mais ${uniqueProcedures.length - 2}`;

                  return (
                    <>
                      <div>
                        <p className="text-[#8E8E93] text-[13px] font-medium tracking-wide uppercase">{getGreeting()}</p>
                        <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mt-1">
                          {firstName}
                        </h1>
                      </div>

                      {/* Dentist message card */}
                      <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-[#0C9B72]/[0.02] rounded-full blur-3xl -translate-y-10 translate-x-10" />
                        <div className="p-5">
                          <div className="flex items-start gap-3.5">
                            {clinic?.photo_url ? (
                              <img src={clinic.photo_url} alt="" className="w-10 h-10 rounded-full object-cover ring-2 ring-[#0C9B72]/20 shrink-0 mt-0.5" />
                            ) : (
                              <div className="w-10 h-10 bg-[#0C9B72]/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <Stethoscope size={18} className="text-[#0C9B72]" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-[#1C1C1E] text-[14px] font-semibold tracking-tight">Dr(a). {dentistFirstName}</p>
                              <p className="text-[#3A3A3C] text-[14px] leading-relaxed mt-1.5 italic">
                                "{personalMessage}"
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Treatment progress — only if has plan */}
                      {total > 0 && (
                        <div className="rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-4">
                          <div className="flex items-center justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-[#8E8E93] text-[11px] font-medium uppercase tracking-wider">Seu tratamento</p>
                              {caseName && (
                                <p className="text-[#1C1C1E] text-[15px] font-semibold tracking-tight mt-0.5 truncate">{caseName}</p>
                              )}
                              <p className="text-[#8E8E93] text-[12px] mt-1">{completed} de {total} etapas</p>
                            </div>
                            {/* Minimal thin bar */}
                            <div className="w-12 h-12 shrink-0 ml-4 relative">
                              <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
                                <circle cx="24" cy="24" r="20" fill="none" stroke="#F2F2F7" strokeWidth="3" />
                                <circle
                                  cx="24" cy="24" r="20" fill="none"
                                  stroke="#0C9B72"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={`${2 * Math.PI * 20}`}
                                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - pct / 100)}`}
                                />
                              </svg>
                              <span className="absolute inset-0 flex items-center justify-center text-[#1C1C1E] text-[11px] font-bold">{pct}%</span>
                            </div>
                          </div>

                          {/* Next step — one line */}
                          {nextStep && (
                            <div className="mt-3 pt-3 border-t border-[#F2F2F7] flex items-center gap-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#0C9B72] shrink-0" />
                              <p className="text-[#3A3A3C] text-[13px] truncate">
                                Próxima: <span className="font-medium">{nextStep.procedure || nextStep.id}</span>
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* Hero: Next Appointment + Checklist */}
                {futureAppointments.length > 0 && (() => {
                  const next = futureAppointments[0];
                  const nextDate = new Date(next.start_time);
                  const now = new Date();
                  const diffMs = nextDate.getTime() - now.getTime();
                  const daysUntil = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                  const hoursUntil = Math.ceil(diffMs / (1000 * 60 * 60));

                  const countdownLabel = daysUntil <= 0
                    ? 'Hoje!'
                    : daysUntil === 1
                    ? hoursUntil <= 24 ? `Em ${hoursUntil}h` : 'Amanhã'
                    : `Em ${daysUntil} dias`;

                  // Friendly reminders based on context
                  const reminders: string[] = [];

                  if (daysUntil <= 1) {
                    reminders.push('Não esqueça de trazer um documento com foto 😊');
                  }

                  if (patient.health_insurance) {
                    reminders.push('Lembre-se de trazer a carteirinha do convênio');
                  }

                  if (!data.anamnesis || (!data.anamnesis.allergies && !data.anamnesis.medications && !data.anamnesis.medical_history)) {
                    reminders.push('Se possível, anote os medicamentos que você toma — isso ajuda no seu atendimento');
                  }

                  const pendingInstallments = installments.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
                  if (pendingInstallments.length > 0) {
                    const overdue = pendingInstallments.some(i => i.status === 'OVERDUE' || new Date(i.due_date) < now);
                    if (overdue) {
                      reminders.push('Você tem uma parcela pendente — que tal resolver antes da consulta?');
                    }
                  }

                  if (daysUntil <= 3 && next.status !== 'CONFIRMED') {
                    reminders.push('Confirme sua presença para garantir seu horário');
                  }

                  if (reminders.length < 2) {
                    reminders.push('Escove bem os dentes antes de sair de casa — seu dentista agradece 🪥');
                  }

                  // Pick just one reminder, rotating based on the current day
                  const todayIndex = new Date().getDate() % reminders.length;
                  const singleReminder = reminders[todayIndex];

                  return (
                    <div className="relative overflow-hidden rounded-2xl bg-white shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#0C9B72]/[0.03] rounded-full blur-2xl -translate-y-8 translate-x-8" />

                      {/* Countdown badge */}
                      <div className="px-5 pt-5 pb-0 flex items-start justify-between">
                        <div>
                          <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-2">Próxima consulta</p>
                          <p className="text-[#1C1C1E] text-[22px] font-bold tracking-tight">
                            {nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                          </p>
                          <p className="text-[#8E8E93] text-[14px] mt-0.5">
                            {formatTimeBR(next.start_time)} · Dr(a). {next.dentist_name}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`px-3 py-1.5 rounded-full text-[11px] font-bold ${
                            daysUntil <= 1
                              ? 'bg-[#FF9500]/10 text-[#FF9500]'
                              : next.status === 'CONFIRMED'
                              ? 'bg-[#34C759]/10 text-[#34C759]'
                              : 'bg-[#007AFF]/10 text-[#007AFF]'
                          }`}>
                            {countdownLabel}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${statusLabel(next.status).color}`}>
                            {statusLabel(next.status).label}
                          </span>
                        </div>
                      </div>

                      {next.notes && (
                        <div className="px-5 pt-2">
                          <p className="text-[#AEAEB2] text-[13px] leading-relaxed">{next.notes}</p>
                        </div>
                      )}

                      {/* Friendly reminder */}
                      {singleReminder && (
                        <div className="mx-5 mt-4 mb-5 bg-[#F9F5EC] rounded-xl px-4 py-3">
                          <p className="text-[#5C4A1E] text-[13px] leading-relaxed">
                            💡 {singleReminder}
                          </p>
                        </div>
                      )}

                      {next.status === 'SCHEDULED' && (
                        <div className="mx-5 mb-4 border-t border-[#F2F2F7] pt-4">
                          <p className="text-[#1C1C1E] text-[15px] font-semibold tracking-tight mb-3">
                            {getConfirmationQuestion(next.start_time)}
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmAppointment(next.id)}
                              disabled={appointmentSubmittingId === next.id}
                              className="h-9 px-5 rounded-full bg-[#1C1C1E] text-white text-[13px] font-semibold tracking-tight active:scale-[0.97] transition-transform disabled:opacity-40 flex items-center justify-center"
                            >
                              {appointmentSubmittingId === next.id ? (
                                <div className="w-4 h-4 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                              ) : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => openRescheduleModal(next)}
                              disabled={appointmentSubmittingId === next.id}
                              className="h-9 px-5 rounded-full border border-[#D1D1D6] text-[#3A3A3C] text-[13px] font-semibold tracking-tight active:scale-[0.97] transition-transform"
                            >
                              Reagendar
                            </button>
                          </div>
                          {confirmedAppointmentId === next.id && (
                            <p className="text-[#34C759] text-[12px] font-medium mt-2.5">Horário confirmado ✓</p>
                          )}
                          {rescheduleRequestedAppointmentId === next.id && (
                            <p className="text-[#007AFF] text-[12px] font-medium mt-2.5">Pedido enviado à clínica.</p>
                          )}
                        </div>
                      )}

                      {!singleReminder && <div className="pb-5" />}
                    </div>
                  );
                })()}

                {/* Quick actions row */}
                <div className="grid grid-cols-4 gap-3">
                  <PortalQuickAction icon={CalendarPlus} label="Agendar" onClick={openNewScheduleModal} />
                  <PortalQuickAction icon={Activity} label="Evolução" onClick={() => setActiveTab('evolucao')} />
                  <PortalQuickAction icon={FileText} label="Arquivos" onClick={() => setActiveTab('documentos')} />
                  <PortalQuickAction icon={DollarSign} label="Pagamentos" onClick={() => setActiveTab('financeiro')} />
                </div>

                {/* Post-procedure care guides */}
                {recentProcedures.map((proc, idx) => {
                  const guide = PROCEDURE_GUIDES[proc.category];
                  if (!guide) return null;
                  const surgeryDate = new Date(proc.date);
                  const daysAgo = Math.floor((Date.now() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24));
                  const daysLabel = daysAgo === 0 ? 'Hoje' : daysAgo === 1 ? 'Ontem' : `Há ${daysAgo} dias`;

                  return (
                    <div key={`${proc.category}-${idx}`} className={`bg-gradient-to-br ${guide.iconBg} rounded-2xl border ${guide.borderColor} overflow-hidden`}>
                      <div className="px-5 pt-5 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield size={16} className={guide.color} />
                          <p className={`${guide.color} text-[11px] font-bold uppercase tracking-widest`}>{guide.title}</p>
                        </div>
                        <p className="text-[#3A3A3C] text-[14px] font-semibold mt-1">{proc.procedure}</p>
                        <p className="text-[#8E8E93] text-[12px] mt-0.5">{daysLabel} · {formatDateBR(proc.date)}</p>
                      </div>
                      <div className="px-5 pb-5 space-y-2.5">
                        {guide.items.map((item, i) => (
                          <div key={i} className="flex items-start gap-3">
                            <span className="text-[16px] mt-0.5 shrink-0">{item.icon}</span>
                            <p className="text-[#3A3A3C] text-[13px] leading-relaxed">{item.text}</p>
                          </div>
                        ))}
                      </div>
                      {clinic?.phone && (
                        <div className="px-5 pb-5">
                          <a
                            href={`tel:${clinic.phone}`}
                            className={`flex items-center justify-center gap-2 w-full h-11 rounded-xl text-[14px] font-semibold active:scale-[0.98] transition-transform ${
                              guide.color.replace('text-', 'text-') + ' ' + guide.iconBg.replace('from-', 'bg-').split(' ')[0]
                            }`}
                            style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}
                          >
                            <Phone size={15} />
                            Ligar para a clínica
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <PortalStatCard value={appointments.length} label="Consultas" />
                  <PortalStatCard value={files.length} label="Documentos" />
                  <PortalStatCard value={payment_plans.length} label="Planos" />
                </div>

                {/* Upcoming appointments scroll */}
                {futureAppointments.length > 1 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-[#1C1C1E] text-[17px] font-semibold tracking-tight">Próximas Consultas</h2>
                      <button onClick={() => setActiveTab('consultas')} className="text-[#0C9B72] text-[13px] font-medium">
                        Ver tudo
                      </button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-5 px-5 pb-1">
                      {futureAppointments.slice(1, 6).map(a => (
                        <div key={a.id} className="min-w-[200px] bg-white rounded-2xl p-4 shrink-0 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                          <p className="text-[#1C1C1E] text-[15px] font-semibold tracking-tight">
                            {new Date(a.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                          </p>
                          <p className="text-[#8E8E93] text-[13px] mt-0.5">{formatTimeBR(a.start_time)}</p>
                          <p className="text-[#AEAEB2] text-[12px] mt-2 truncate">Dr(a). {a.dentist_name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Health summary */}
                {data.anamnesis && (data.anamnesis.allergies || data.anamnesis.medications) && (
                  <div>
                    <h2 className="text-[#1C1C1E] text-[17px] font-semibold tracking-tight mb-3">Saúde</h2>
                    <div className="bg-white rounded-2xl divide-y divide-[#E5E5EA] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                      {data.anamnesis.allergies && (
                        <div className="px-4 py-3.5 flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#FF3B30]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <AlertCircle size={15} className="text-[#FF3B30]" />
                          </div>
                          <div>
                            <p className="text-[#8E8E93] text-[11px] font-medium uppercase tracking-wider">Alergias</p>
                            <p className="text-[#3A3A3C] text-[14px] mt-0.5 leading-relaxed">{data.anamnesis.allergies}</p>
                          </div>
                        </div>
                      )}
                      {data.anamnesis.medications && (
                        <div className="px-4 py-3.5 flex items-start gap-3">
                          <div className="w-8 h-8 bg-[#AF52DE]/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                            <Heart size={15} className="text-[#AF52DE]" />
                          </div>
                          <div>
                            <p className="text-[#8E8E93] text-[11px] font-medium uppercase tracking-wider">Medicamentos</p>
                            <p className="text-[#3A3A3C] text-[14px] mt-0.5 leading-relaxed">{data.anamnesis.medications}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Clinic contact */}
                {clinic && (
                  <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center gap-3">
                      {clinic.photo_url ? (
                        <img src={clinic.photo_url} alt="" className="w-11 h-11 rounded-xl object-cover" />
                      ) : (
                        <div className="w-11 h-11 bg-[#E5E5EA] rounded-xl flex items-center justify-center">
                          <Stethoscope size={20} className="text-[#8E8E93]" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[#1C1C1E] text-[15px] font-semibold truncate">{clinic.clinic_name || clinic.name}</p>
                        {clinic.clinic_address && (
                          <p className="text-[#8E8E93] text-[13px] truncate mt-0.5">{clinic.clinic_address}</p>
                        )}
                      </div>
                      {clinic.phone && (
                        <a
                          href={`tel:${clinic.phone}`}
                          className="w-10 h-10 bg-[#0C9B72]/10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
                        >
                          <Phone size={16} className="text-[#0C9B72]" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ APPOINTMENTS TAB ═══ */}
            {activeTab === 'consultas' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">Consultas</h1>
                  <button
                    onClick={openNewScheduleModal}
                    className="h-9 px-4 bg-[#0C9B72] text-white rounded-full text-[13px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
                  >
                    <CalendarPlus size={14} /> Solicitar
                  </button>
                </div>

                {futureAppointments.length > 0 && (
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">Próximas</p>
                    <div className="bg-white rounded-2xl divide-y divide-[#E5E5EA] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                      {futureAppointments.map(a => (
                        <PortalAppointmentRow
                          key={a.id}
                          appointment={a}
                          formatDate={formatDateBR}
                          formatTime={formatTimeBR}
                          statusLabel={statusLabel}
                          actionContent={a.status === 'SCHEDULED' ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfirmAppointment(a.id)}
                                disabled={appointmentSubmittingId === a.id}
                                className="h-8 px-4 rounded-full bg-[#1C1C1E] text-white text-[12px] font-semibold active:scale-[0.97] transition-transform disabled:opacity-40 flex items-center justify-center"
                              >
                                {appointmentSubmittingId === a.id ? (
                                  <div className="w-3.5 h-3.5 border-[1.5px] border-white/25 border-t-white rounded-full animate-spin" />
                                ) : 'Confirmar'}
                              </button>
                              <button
                                onClick={() => openRescheduleModal(a)}
                                className="h-8 px-4 rounded-full border border-[#D1D1D6] text-[#3A3A3C] text-[12px] font-semibold active:scale-[0.97] transition-transform"
                              >
                                Reagendar
                              </button>
                            </div>
                          ) : null}
                          actionNotice={confirmedAppointmentId === a.id
                            ? 'Confirmado ✓'
                            : rescheduleRequestedAppointmentId === a.id
                            ? 'Pedido enviado.'
                            : null}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">Histórico</p>
                    <div className="bg-white rounded-2xl divide-y divide-[#E5E5EA] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                      {pastAppointments.slice(0, 20).map(a => (
                        <PortalAppointmentRow key={a.id} appointment={a} formatDate={formatDateBR} formatTime={formatTimeBR} statusLabel={statusLabel} past />
                      ))}
                    </div>
                  </div>
                )}

                {appointments.length === 0 && (
                  <PortalEmptyState icon={Calendar} text="Nenhuma consulta registrada" />
                )}
              </div>
            )}

            {/* ═══ EVOLUTION TAB ═══ */}
            {activeTab === 'evolucao' && (
              <div className="space-y-5">
                <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">Evolução</h1>
                {evolution.length > 0 ? (
                  <div className="bg-white rounded-2xl divide-y divide-[#E5E5EA] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                    {evolution.map(e => (
                      <div key={e.id} className="px-4 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[#8E8E93] text-[12px] font-medium">{formatDateBR(e.date)}</span>
                          <span className="text-[#AEAEB2] text-[12px]">Dr(a). {e.dentist_name}</span>
                        </div>
                        {e.procedure_performed && (
                          <p className="text-[#1C1C1E] text-[15px] font-semibold tracking-tight">{e.procedure_performed}</p>
                        )}
                        {e.notes && (
                          <p className="text-[#8E8E93] text-[14px] mt-1 leading-relaxed">{e.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <PortalEmptyState icon={Activity} text="Nenhuma evolução clínica registrada" />
                )}
              </div>
            )}

            {/* ═══ DOCUMENTS TAB ═══ */}
            {activeTab === 'documentos' && (
              <div className="space-y-5">
                <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">Documentos</h1>
                {files.length > 0 ? (
                  <div className="bg-white rounded-2xl divide-y divide-[#E5E5EA] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                    {files.map(f => (
                      <a
                        key={f.id}
                        href={f.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3.5 px-4 py-3.5 active:bg-[#F2F2F7] transition-colors"
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F2F2F7] flex items-center justify-center shrink-0">
                          {f.file_type?.includes('image') ? (
                            <img src={f.file_url} alt="" className="w-10 h-10 object-cover" />
                          ) : (
                            <FileText size={18} className="text-[#007AFF]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[#1C1C1E] text-[15px] font-medium truncate">{f.description || 'Documento'}</p>
                          <p className="text-[#AEAEB2] text-[13px] mt-0.5">{formatDateBR(f.created_at)}</p>
                        </div>
                        <Download size={16} className="text-[#C7C7CC] shrink-0" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <PortalEmptyState icon={FileText} text="Nenhum documento disponível" />
                )}
              </div>
            )}

            {/* ═══ FINANCIAL TAB ═══ */}
            {activeTab === 'financeiro' && (
              <div className="space-y-5">
                <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">Financeiro</h1>

                {/* Summary — identical to prontuário */}
                {(() => {
                  const treatmentPlan = patient.treatment_plan || [];
                  const financialTotal = treatmentPlan.reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
                  const completedTotal = treatmentPlan
                    .filter((item: any) => String(item.status || '').toUpperCase() === 'REALIZADO')
                    .reduce((acc: number, item: any) => acc + (Number(item.value) || 0), 0);
                  const received = transactions
                    .filter(t => t.type === 'INCOME')
                    .reduce((sum, t) => sum + Number(t.amount || 0), 0);
                  const pct = financialTotal > 0 ? Math.min(100, Math.round((received / financialTotal) * 100)) : 0;
                  const remaining = Math.max(0, financialTotal - received);

                  if (financialTotal === 0 && received === 0 && payment_plans.length === 0 && transactions.length === 0) return null;

                  return (
                    <div className="bg-white rounded-2xl p-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)] space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-1">Orçamento total</p>
                          <p className="text-[#1C1C1E] text-[18px] font-bold tracking-tight">
                            {financialTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#34C759] text-[11px] font-semibold uppercase tracking-widest mb-1">Concluído</p>
                          <p className="text-[#34C759] text-[18px] font-bold tracking-tight">
                            {completedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      </div>
                      <div className="pt-2 border-t border-[#F2F2F7]">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest">Recebido</p>
                          <span className="text-[#8E8E93] text-[12px] font-semibold">{pct}%</span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-2">
                          <p className="text-[#34C759] text-[16px] font-bold tracking-tight">
                            {received.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                          {remaining > 0 && (
                            <p className="text-[#AEAEB2] text-[12px]">
                              falta {remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                        <div className="h-[6px] bg-[#E5E5EA] rounded-full overflow-hidden">
                          <div className="h-full bg-[#34C759] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Pending installments — same as prontuário */}
                {(() => {
                  const pending = installments.filter(i => i.status === 'PENDING' || i.status === 'OVERDUE');
                  if (pending.length === 0) return null;
                  return (
                    <div>
                      <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">Parcelas Pendentes</p>
                      <div className="space-y-2">
                        {pending.map((inst) => {
                          const isOverdue = inst.status === 'OVERDUE' || new Date(inst.due_date) < new Date();
                          return (
                            <div key={inst.id} className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                              isOverdue ? 'bg-[#FF3B30]/[0.04] border-[#FF3B30]/15' : 'bg-[#FF9500]/[0.04] border-[#FF9500]/15'
                            }`}>
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                isOverdue ? 'bg-[#FF3B30]/10' : 'bg-[#FF9500]/10'
                              }`}>
                                <DollarSign size={15} className={isOverdue ? 'text-[#FF3B30]' : 'text-[#FF9500]'} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[#1C1C1E] text-[14px] font-semibold truncate">
                                  {inst.procedure || `Parcela ${inst.number}`}
                                </p>
                                <p className={`text-[12px] font-medium ${isOverdue ? 'text-[#FF3B30]' : 'text-[#FF9500]'}`}>
                                  {isOverdue ? 'Vencida em' : 'Vence em'} {formatDateBR(inst.due_date)}
                                </p>
                              </div>
                              <span className={`text-[14px] font-bold shrink-0 ${isOverdue ? 'text-[#FF3B30]' : 'text-[#1C1C1E]'}`}>
                                R$ {Number(inst.amount).toFixed(2)}
                              </span>
                              <button
                                onClick={() => { loadPixInfo(); setShowPixModal({ amount: Number(inst.amount), installment_id: inst.id, label: inst.procedure || `Parcela ${inst.number}` }); }}
                                className="h-8 px-3 rounded-full bg-[#34C759]/10 text-[#34C759] text-[12px] font-semibold active:scale-95 transition-transform shrink-0"
                              >
                                Pagar
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Payment plans */}
                {payment_plans.length > 0 && (
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">Planos de Pagamento</p>
                    {payment_plans.map(plan => {
                      const planInstallments = installments.filter(i => i.payment_plan_id === plan.id);
                      const paidCount = planInstallments.filter(i => i.status === 'PAID').length;
                      const total = plan.installments_count || 1;
                      const progress = Math.round((paidCount / total) * 100);

                      return (
                        <div key={plan.id} className="bg-white rounded-2xl overflow-hidden shadow-[0_1px_6px_rgba(0,0,0,0.05)] mb-3">
                          <div className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <p className="text-[#1C1C1E] text-[16px] font-semibold tracking-tight">{plan.procedure}</p>
                                <p className="text-[#8E8E93] text-[13px] mt-0.5">
                                  {plan.installments_count}x de R$ {(plan.total_amount / plan.installments_count).toFixed(2)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[#1C1C1E] text-[18px] font-bold tracking-tight">
                                  R$ {Number(plan.total_amount).toFixed(2)}
                                </p>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  plan.status === 'COMPLETED' ? 'bg-[#34C759]/10 text-[#34C759]' :
                                  plan.status === 'ACTIVE' ? 'bg-[#007AFF]/10 text-[#007AFF]' :
                                  'bg-[#8E8E93]/10 text-[#8E8E93]'
                                }`}>
                                  {plan.status === 'ACTIVE' ? 'Ativo' : plan.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1 h-1.5 bg-[#E5E5EA] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#34C759] rounded-full transition-all duration-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                              <span className="text-[#8E8E93] text-[12px] font-medium shrink-0">{paidCount}/{total}</span>
                            </div>
                          </div>

                          {/* Installments detail */}
                          {planInstallments.length > 0 && (
                            <div className="border-t border-[#E5E5EA]">
                              {planInstallments.map((inst) => (
                                <div
                                  key={inst.id}
                                  className="flex items-center px-4 py-3 border-b border-[#F2F2F7] last:border-0"
                                >
                                  <span className="text-[#8E8E93] text-[13px] w-20 shrink-0">Parcela {inst.number}</span>
                                  <span className="text-[#AEAEB2] text-[13px] flex-1">{formatDateBR(inst.due_date)}</span>
                                  <span className="text-[#3A3A3C] text-[13px] font-medium mr-3">R$ {Number(inst.amount).toFixed(2)}</span>
                                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                                    inst.status === 'PAID' ? 'bg-[#34C759]/10 text-[#34C759]' :
                                    inst.status === 'OVERDUE' ? 'bg-[#FF3B30]/10 text-[#FF3B30]' :
                                    'bg-[#FF9500]/10 text-[#FF9500]'
                                  }`}>
                                    {inst.status === 'PAID' ? 'Pago' : inst.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Transactions — same as prontuário */}
                {transactions.length > 0 && (
                  <div>
                    <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">Movimentações</p>
                    <div className="bg-white rounded-2xl divide-y divide-[#F2F2F7] shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
                      {transactions.map(t => {
                        const isIncome = t.type === 'INCOME';
                        return (
                          <div key={t.id} className="flex items-center gap-3.5 px-4 py-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              isIncome ? 'bg-[#34C759]/10' : 'bg-[#FF3B30]/10'
                            }`}>
                              <DollarSign size={16} className={isIncome ? 'text-[#34C759]' : 'text-[#FF3B30]'} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#1C1C1E] text-[15px] font-medium truncate">
                                {t.procedure || t.description}
                              </p>
                              <p className="text-[#AEAEB2] text-[12px] mt-0.5">
                                {formatDateBR(t.date)}
                              </p>
                            </div>
                            <p className={`text-[15px] font-semibold tracking-tight shrink-0 ${
                              isIncome ? 'text-[#34C759]' : 'text-[#FF3B30]'
                            }`}>
                              {isIncome ? '+' : '-'}R$ {Number(t.amount).toFixed(2)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {transactions.length === 0 && payment_plans.length === 0 && (
                  <PortalEmptyState icon={DollarSign} text="Nenhuma movimentação financeira" />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Bottom Tab Bar (iOS style) ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-t border-[#E5E5EA]">
        <div className="max-w-lg mx-auto flex pb-[env(safe-area-inset-bottom)]">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 active:opacity-60 transition-opacity"
              >
                <tab.icon
                  size={22}
                  className={isActive ? 'text-[#0C9B72]' : 'text-[#C7C7CC]'}
                  strokeWidth={isActive ? 2.2 : 1.5}
                />
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#0C9B72]' : 'text-[#C7C7CC]'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Schedule Modal (iOS sheet) ─── */}
      <AnimatePresence>
          {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center"
            onClick={closeScheduleModal}
          >
            <motion.div
              ref={scheduleModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="schedule-modal-title"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl"
            >
              {/* Drag indicator */}
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-9 h-1 bg-[#C6C6C8] rounded-full" />
              </div>

              {scheduleSuccess ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={28} className="text-[#34C759]" />
                  </div>
                  <h3 id="schedule-modal-title" className="text-[18px] font-semibold text-[#1C1C1E] mb-1.5 tracking-tight">
                    {scheduleMode === 'reschedule' ? 'Pedido Enviado' : 'Solicitação Enviada'}
                  </h3>
                  <p className="text-[#8E8E93] text-[14px]">
                    {scheduleMode === 'reschedule'
                      ? 'A clínica vai revisar o novo horário e retornar para você.'
                      : 'A clínica entrará em contato para confirmar.'}
                  </p>
                </div>
              ) : (
                <div className="px-5 pb-6 pt-3">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 id="schedule-modal-title" className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">
                        {scheduleMode === 'reschedule' ? 'Reagendar Consulta' : 'Solicitar Consulta'}
                      </h3>
                      {scheduleTargetAppointment && (
                        <p className="text-[#8E8E93] text-[12px] mt-1">
                          Atual: {formatDateBR(scheduleTargetAppointment.start_time)} às {formatTimeBR(scheduleTargetAppointment.start_time)}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={closeScheduleModal}
                      aria-label="Fechar"
                      className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <X size={16} className="text-[#8E8E93]" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">
                        {scheduleMode === 'reschedule' ? 'Nova Data Preferencial' : 'Data Preferencial'}
                      </label>
                      <input
                        type="date"
                        value={scheduleForm.preferred_date}
                        min={new Date().toLocaleDateString('en-CA')}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, preferred_date: e.target.value })}
                        className="w-full h-12 px-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#0C9B72]/40 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Horário Preferencial</label>
                      <select
                        value={scheduleForm.preferred_time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, preferred_time: e.target.value })}
                        className="w-full h-12 px-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#0C9B72]/40 transition-colors appearance-none"
                      >
                        <option value="">Qualquer horário</option>
                        <option value="manha">Manhã (08h–12h)</option>
                        <option value="tarde">Tarde (13h–18h)</option>
                        <option value="noite">Noite (18h–21h)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">
                        {scheduleMode === 'reschedule' ? 'Preferências' : 'Observações'}
                      </label>
                      <textarea
                        placeholder={scheduleMode === 'reschedule' ? 'Conte qual horário funciona melhor para você...' : 'Motivo da consulta...'}
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#0C9B72]/40 transition-colors resize-none placeholder:text-[#C7C7CC]"
                      />
                    </div>
                    <button
                      onClick={handleRequestAppointment}
                      disabled={!scheduleForm.preferred_date || scheduleSubmitting}
                      className="w-full h-12 bg-[#0C9B72] text-white rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-all disabled:opacity-30 disabled:scale-100 flex items-center justify-center gap-2"
                    >
                      {scheduleSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        scheduleMode === 'reschedule' ? 'Enviar Pedido de Reagendamento' : 'Enviar Solicitação'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── PIX Payment Modal ─── */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center"
            onClick={() => !actionSubmitting && setShowPixModal(null)}>
            <motion.div
              ref={pixModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="pix-modal-title"
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              {paymentInformed ? (
                <div className="text-center py-12 px-6">
                  <div className="w-14 h-14 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={28} className="text-[#34C759]" />
                  </div>
                  <h3 id="pix-modal-title" className="text-[18px] font-semibold text-[#1C1C1E] mb-1">Pagamento Informado</h3>
                  <p className="text-[#8E8E93] text-[14px]">A clínica confirmará o recebimento.</p>
                </div>
              ) : (
                <div className="px-5 pb-6 pt-3">
                  <div className="flex items-center justify-between mb-5">
                    <h3 id="pix-modal-title" className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Pagar</h3>
                    <button type="button" onClick={() => setShowPixModal(null)} aria-label="Fechar" className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center"><X size={16} className="text-[#8E8E93]" /></button>
                  </div>

                  <div className="bg-[#F2F2F7] rounded-xl p-4 mb-4 text-center">
                    <p className="text-[#8E8E93] text-[12px] mb-1">{showPixModal.label}</p>
                    <p className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">
                      R$ {showPixModal.amount.toFixed(2)}
                    </p>
                  </div>

                  {pixInfo?.has_pix ? (
                    <div className="space-y-3 mb-5">
                      <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest">Chave PIX</p>
                      <button onClick={() => copyToClipboard(pixInfo.pix_key!)}
                        className="w-full flex items-center gap-3 p-3.5 bg-[#F2F2F7] rounded-xl active:bg-[#E5E5EA] transition-colors">
                        <div className="w-10 h-10 bg-[#0C9B72]/10 rounded-xl flex items-center justify-center shrink-0">
                          <DollarSign size={18} className="text-[#0C9B72]" />
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-[#1C1C1E] text-[15px] font-medium truncate">{pixInfo.pix_key}</p>
                          <p className="text-[#8E8E93] text-[12px]">{pixInfo.pix_key_type} · {pixInfo.beneficiary_name}</p>
                        </div>
                        <span className="text-[#0C9B72] text-[12px] font-semibold shrink-0">
                          {pixCopied ? 'Copiado!' : 'Copiar'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="bg-[#FF9500]/[0.06] rounded-xl p-4 mb-5">
                      <p className="text-[#FF9500] text-[13px]">
                        A clínica ainda não configurou o PIX. Entre em contato para combinar o pagamento.
                      </p>
                    </div>
                  )}

                  <button onClick={() => handleInformPayment(showPixModal.amount, showPixModal.installment_id)}
                    disabled={actionSubmitting}
                    className="w-full h-12 bg-[#34C759] text-white rounded-xl font-semibold text-[15px] active:scale-[0.98] transition-all disabled:opacity-30 flex items-center justify-center">
                    {actionSubmitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Já Paguei — Informar Clínica'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

// ─── Helper Components ───

function PortalQuickAction({ icon: Icon, label, onClick }: {
  icon: React.ElementType; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-white shadow-[0_1px_6px_rgba(0,0,0,0.05)] active:scale-95 transition-transform"
    >
      <div className="w-10 h-10 bg-[#F2F2F7] rounded-full flex items-center justify-center">
        <Icon size={18} className="text-[#0C9B72]" />
      </div>
      <span className="text-[#8E8E93] text-[11px] font-medium">{label}</span>
    </button>
  );
}

function PortalStatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <p className="text-[#1C1C1E] text-[24px] font-bold tracking-tight">{value}</p>
      <p className="text-[#AEAEB2] text-[11px] font-medium uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function PortalAppointmentRow({ appointment, formatDate, formatTime, statusLabel, past, actionContent, actionNotice }: any) {
  const s = statusLabel(appointment.status);
  const statusColors: Record<string, string> = {
    'SCHEDULED': 'bg-[#007AFF]/10 text-[#007AFF]',
    'CONFIRMED': 'bg-[#34C759]/10 text-[#34C759]',
    'IN_PROGRESS': 'bg-[#FF9500]/10 text-[#FF9500]',
    'FINISHED': 'bg-[#E5E5EA] text-[#8E8E93]',
    'CANCELLED': 'bg-[#FF3B30]/10 text-[#FF3B30]',
    'NO_SHOW': 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };
  return (
    <div className={`px-4 py-3.5 ${past ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-[#F2F2F7] rounded-xl flex items-center justify-center shrink-0">
          <Calendar size={16} className="text-[#8E8E93]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[#1C1C1E] text-[15px] font-medium">{formatDate(appointment.start_time)}</p>
          <p className="text-[#8E8E93] text-[13px] mt-0.5">
            {formatTime(appointment.start_time)} · Dr(a). {appointment.dentist_name}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[appointment.status] || 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
          {s.label}
        </span>
      </div>
      {appointment.notes && (
        <p className="text-[#C7C7CC] text-[13px] mt-2 ml-[54px]">{appointment.notes}</p>
      )}
      {actionContent && !past && (
        <div className="mt-3 ml-[54px]">
          {actionContent}
        </div>
      )}
      {actionNotice && !past && (
        <p className="text-[#34C759] text-[12px] font-medium mt-1.5 ml-[54px]">{actionNotice}</p>
      )}
    </div>
  );
}

function PortalEmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="py-16 text-center">
      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
        <Icon size={24} className="text-[#C7C7CC]" />
      </div>
      <p className="text-[#AEAEB2] text-[15px]">{text}</p>
    </div>
  );
}
