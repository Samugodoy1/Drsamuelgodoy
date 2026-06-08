import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
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
  Phone,
  MessageCircle
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

  // Pre-op, Post-op and Anamnesis modals
  const [showPreOpModal, setShowPreOpModal] = useState(false);
  const [showPostOpModal, setShowPostOpModal] = useState(false);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState({ allergies: '', medications: '', medical_history: '' });
  const [anamnesisSubmitting, setAnamnesisSubmitting] = useState(false);

  const openAnamnesisModal = () => {
    if (data?.anamnesis) {
      setAnamnesisForm({
        allergies: data.anamnesis.allergies || '',
        medications: data.anamnesis.medications || '',
        medical_history: data.anamnesis.medical_history || ''
      });
    }
    setShowAnamnesisModal(true);
  };

  const handleAnamnesisSubmit = async () => {
    if (!sessionToken) return;
    setAnamnesisSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/portal/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          medical_history: anamnesisForm.medical_history,
          allergies: anamnesisForm.allergies,
          medications: anamnesisForm.medications
        })
      });
      if (!res.ok) throw new Error('Erro ao enviar ficha médica');
      
      setData((current: any) => current ? {
        ...current, 
        anamnesis: { ...current.anamnesis, ...anamnesisForm }
      } : current);
      
      setTimeout(() => setShowAnamnesisModal(false), 500);
    } catch (err) {
      console.error(err);
      // Aqui você poderia colocar um estado de erro, se quiser mostrar uma mensagem pro paciente.
    } finally {
      setAnamnesisSubmitting(false);
    }
  };

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
      const authRes = await fetch(`${API_URL}/api/portal/auth/${token}`);
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || 'Link inválido ou expirado');
        setLoading(false);
        return;
      }
      setSessionToken(authData.session_token);

      // Load portal data
      const dataRes = await fetch(`${API_URL}/api/portal/data`, {
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
      const res = await fetch(isReschedule ? `${API_URL}/api/portal/reschedule-appointment` : `${API_URL}/api/portal/request-appointment`, {
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
      const res = await fetch(`${API_URL}/api/portal/confirm-appointment`, {
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
      const res = await fetch(`${API_URL}/api/portal/pix-info`, { headers: { 'Authorization': `Bearer ${sessionToken}` } });
      if (res.ok) setPixInfo(await res.json());
    } catch {}
  };

  const handleInformPayment = async (amount: number, installment_id?: number) => {
    setActionSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/portal/inform-payment`, {
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
        const nodes = Array.from(focusable) as HTMLElement[];
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
        const nodes = Array.from(focusable) as HTMLElement[];
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
    <div className="min-h-screen bg-academy-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-[3px] border-[#C6C6C8] border-t-[#0C9B72] rounded-full animate-spin" />
        <p role="status" aria-live="polite" className="text-academy-muted text-[15px] font-medium tracking-tight">Carregando...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen bg-academy-bg flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mx-auto mb-5">
          <AlertCircle size={28} className="text-[#FF3B30]" />
        </div>
        <h2 className="text-[20px] font-semibold text-academy-text mb-2 tracking-tight">Acesso Indisponível</h2>
        <p className="text-academy-muted text-[15px] leading-relaxed">{error}</p>
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
      'FINISHED': { label: 'Finalizado', color: 'bg-academy-border text-academy-muted' },
      'CANCELLED': { label: 'Cancelado', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' },
      'NO_SHOW': { label: 'Faltou', color: 'bg-[#FF3B30]/10 text-[#FF3B30]' }
    };
    return map[s] || { label: s, color: 'bg-academy-border text-academy-muted' };
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
    <div className="min-h-screen bg-white pb-10">
      {/* Accessible announcer for screen readers */}
      <div id="a11y-announcer" aria-live="polite" className="sr-only">
        {error || (scheduleSuccess ? (scheduleMode === 'reschedule' ? 'Pedido de reagendamento enviado' : 'Solicitação de agendamento enviada') : '') || (paymentInformed ? 'Pagamento informado' : '') || (pixCopied ? 'Chave PIX copiada' : '')}
      </div>

      {/* ─── Header Minimalista ─── */}
      <div className="px-6 pt-10 pb-4 flex items-center gap-3">
        {clinic?.photo_url ? (
          <img src={clinic.photo_url} alt="Dentista" className="w-10 h-10 rounded-[10px] object-cover shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100/50" />
        ) : (
          <div className="w-10 h-10 bg-[#216153] rounded-[10px] flex items-center justify-center text-white font-bold text-lg tracking-tight">
            {clinic?.name ? clinic.name.charAt(0).toUpperCase() : 'OH'}
          </div>
        )}
        <p className="text-[#216153] text-[13px] font-bold tracking-[0.1em]">PORTAL DO PACIENTE</p>
      </div>

      {/* ─── Content ─── */}
      <div className="px-6 pt-8 max-w-lg mx-auto">
        {/* Saudação */}
        <div className="mb-10">
          <h1 className="text-[32px] font-bold text-[#0F172A] leading-tight tracking-tight">
            Olá, {(() => {
              const parts = patient.name.trim().split(/\s+/);
              const firstName = parts[0] || '';
              const firstSurname = parts[1] || '';
              return firstSurname ? `${firstName} ${firstSurname}` : firstName;
            })()}
          </h1>
          {futureAppointments.length > 0 ? (
            (() => {
              const nextDate = new Date(futureAppointments[0].start_time);
              const today = new Date();
              const tomorrow = new Date();
              tomorrow.setDate(today.getDate() + 1);

              const isSameDay = (left: Date, right: Date) => (
                left.getFullYear() === right.getFullYear()
                && left.getMonth() === right.getMonth()
                && left.getDate() === right.getDate()
              );

              const dayLabel = isSameDay(nextDate, today)
                ? 'hoje'
                : isSameDay(nextDate, tomorrow)
                ? 'amanhã'
                : `dia ${nextDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;

              const nextTime = formatTimeBR(futureAppointments[0].start_time);
              const timeLabel = nextTime.endsWith(':00') ? nextTime.replace(':00', 'h') : nextTime.replace(':', 'h');

              return (
                <p className="text-[#216153] text-[17px] font-semibold mt-2">
                  Sua próxima visita é {dayLabel} às {timeLabel}.
                </p>
              );
            })()
          ) : (
            <p className="text-[#216153] text-[17px] font-semibold mt-2">
              Nenhuma visita agendada.
            </p>
          )}
        </div>

        {/* Botões Principais */}
        <div className="space-y-4 mb-14">
          {futureAppointments.length > 0 && (() => {
            const nextAppt = futureAppointments[0];
            const isConfirmed = nextAppt.status === 'CONFIRMED' || confirmedAppointmentId === nextAppt.id;

            return (
              <button
                onClick={() => !isConfirmed ? handleConfirmAppointment(nextAppt.id) : null}
                disabled={isConfirmed || appointmentSubmittingId === nextAppt.id}
                className={`w-full h-[64px] rounded-2xl flex items-center justify-center gap-3 font-bold text-[17px] transition-transform ${
                  isConfirmed 
                    ? 'bg-[#34C759]/10 text-[#34C759] cursor-default' 
                    : 'bg-[#216153] text-white active:scale-[0.98] shadow-[0_8px_24px_rgba(33,97,83,0.25)]'
                }`}
              >
                {appointmentSubmittingId === nextAppt.id ? (
                  <div className="w-5 h-5 border-[2px] border-white/25 border-t-white rounded-full animate-spin" />
                ) : isConfirmed ? (
                  <>
                    <CheckCircle2 size={22} className="text-[#34C759]" />
                    Presença confirmada
                  </>
                ) : (
                  <>
                    <div className="w-[22px] h-[22px] rounded-full border-[1.5px] border-white flex items-center justify-center">
                      <CheckCircle2 size={14} className="text-white" />
                    </div>
                    Confirmar minha ida
                  </>
                )}
              </button>
            );
          })()}

          <button onClick={openNewScheduleModal} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <CalendarPlus size={24} className="text-[#1E293B]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Solicitar consulta</span>
          </button>

          <button onClick={() => setShowPreOpModal(true)} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <ClipboardList size={24} className="text-[#1E293B]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Orientações da cirurgia</span>
          </button>

          <button onClick={openAnamnesisModal} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <User size={24} className="text-[#1E293B]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Atualizar ficha médica</span>
          </button>

          <button onClick={() => setShowPostOpModal(true)} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <MessageCircle size={24} className="text-[#1E293B]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Dúvidas pós-atendimento</span>
          </button>
        </div>

        {/* Dica de Hoje */}
        <div className="w-full bg-[#FCF8FF] border border-[#F3E8FF] rounded-[24px] p-6">
          <h3 className="text-[#7C3AED] text-[11px] font-extrabold tracking-widest uppercase mb-3">DICA DE HOJE</h3>
          <p className="text-[#64748B] text-[15px] font-medium leading-relaxed">
            {(() => {
              if (futureAppointments.length > 0) {
                const nextDate = new Date(futureAppointments[0].start_time);
                const daysUntil = Math.ceil((nextDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                if (daysUntil === 1) return "Sua consulta é amanhã! Lembre-se de ter uma boa noite de sono e evite alimentos pesados.";
                if (daysUntil <= 3) return "Faltam poucos dias para sua consulta. Mantenha a higiene bucal em dia e anote qualquer dúvida para perguntar ao dentista.";
              }
              if (recentProcedures.length > 0 && detectCategory(recentProcedures[0].procedure)) {
                return PROCEDURE_GUIDES[recentProcedures[0].category].items[0].text;
              }
              const generalTips = [
                "Usar o fio dental diariamente previne doenças gengivais e mau hálito.",
                "Beba água! A hidratação ajuda a manter a produção de saliva saudável.",
                "Evite alimentos muito ácidos para proteger o esmalte dos seus dentes.",
                "Uma escova de cerdas macias é a melhor amiga do seu sorriso.",
                "Sorria! Cuidar dos dentes é cuidar de todo o corpo."
              ];
              return generalTips[(patient.id || 0) % generalTips.length] || generalTips[0];
            })()}
          </p>
        </div>
      </div>

      {/* ─── Pre-op Modal ─── */}
      <AnimatePresence>
        {showPreOpModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center" onClick={() => setShowPreOpModal(false)}>
            <motion.div role="dialog" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              <div className="px-5 pb-4 pt-3 flex items-center justify-between border-b border-[#E5E5EA]">
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Orientações Pré-Consulta</h3>
                <button type="button" onClick={() => setShowPreOpModal(false)} className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center"><X size={16} className="text-[#8E8E93]" /></button>
              </div>
              <div className="p-5 overflow-y-auto">
                {futureAppointments.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-[#64748B] text-[15px] leading-relaxed">
                      Para sua próxima consulta no dia <strong className="text-[#1C1C1E]">{new Date(futureAppointments[0].start_time).toLocaleDateString('pt-BR')}</strong>, siga as seguintes orientações gerais:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3"><span className="text-xl">🪥</span><span className="text-[#334155] text-[14px]">Escove bem os dentes antes de sair de casa.</span></li>
                      <li className="flex items-start gap-3"><span className="text-xl">⏱️</span><span className="text-[#334155] text-[14px]">Chegue com 10 minutos de antecedência.</span></li>
                      <li className="flex items-start gap-3"><span className="text-xl">📄</span><span className="text-[#334155] text-[14px]">Traga documento com foto e exames recentes, caso tenha.</span></li>
                      {futureAppointments[0].notes && futureAppointments[0].notes.toLowerCase().match(/cirurgia|implante|extração|siso|enxerto/) && (
                        <>
                          <li className="flex items-start gap-3"><span className="text-xl">💧</span><span className="text-[#334155] text-[14px]">Jejum absoluto de 8 horas (inclusive água) se for receber sedação.</span></li>
                          <li className="flex items-start gap-3"><span className="text-xl">🫂</span><span className="text-[#334155] text-[14px]">Venha com um acompanhante maior de idade.</span></li>
                          <li className="flex items-start gap-3"><span className="text-xl">👕</span><span className="text-[#334155] text-[14px]">Use roupas confortáveis e com mangas folgadas.</span></li>
                        </>
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-[#64748B] text-[15px] text-center py-6">Você não possui consultas futuras agendadas.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Post-op Modal ─── */}
      <AnimatePresence>
        {showPostOpModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center" onClick={() => setShowPostOpModal(false)}>
            <motion.div role="dialog" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              <div className="px-5 pb-4 pt-3 flex items-center justify-between border-b border-[#E5E5EA]">
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Recomendações Pós-Atendimento</h3>
                <button type="button" onClick={() => setShowPostOpModal(false)} className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center"><X size={16} className="text-[#8E8E93]" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                {recentProcedures.length > 0 ? (
                  recentProcedures.map((proc, idx) => {
                    const guide = PROCEDURE_GUIDES[proc.category];
                    if (!guide) return null;
                    return (
                      <div key={idx} className="mb-6 last:mb-0">
                        <h4 className="text-[#1C1C1E] font-bold text-[16px] mb-2">{guide.title}</h4>
                        <p className="text-[#8E8E93] text-[13px] mb-4">Referente ao procedimento: {proc.procedure}</p>
                        <div className="space-y-3">
                          {guide.items.map((item, i) => (
                            <div key={i} className="flex items-start gap-3">
                              <span className="text-[16px] mt-0.5 shrink-0">{item.icon}</span>
                              <p className="text-[#3A3A3C] text-[14px] leading-relaxed">{item.text}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[#64748B] text-[15px] text-center py-6">Não há recomendações de pós-operatório ou procedimento recente no seu histórico no momento. Para dúvidas gerais, entre em contato com a clínica.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Anamnesis Modal ─── */}
      <AnimatePresence>
        {showAnamnesisModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center" onClick={() => !anamnesisSubmitting && setShowAnamnesisModal(false)}>
            <motion.div role="dialog" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              <div className="px-5 pb-4 pt-3 flex items-center justify-between border-b border-[#E5E5EA]">
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Ficha Médica</h3>
                <button type="button" onClick={() => !anamnesisSubmitting && setShowAnamnesisModal(false)} className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center"><X size={16} className="text-[#8E8E93]" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Alergias a Medicamentos</label>
                  <textarea
                    placeholder="Ex: Dipirona, Penicilina..."
                    value={anamnesisForm.allergies}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, allergies: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#8E8E93]"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Medicamentos de Uso Contínuo</label>
                  <textarea
                    placeholder="Ex: Losartana, Anticoncepcional..."
                    value={anamnesisForm.medications}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, medications: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#8E8E93]"
                  />
                </div>
                <div>
                  <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Histórico de Doenças (Ex: Diabetes, Hipertensão)</label>
                  <textarea
                    placeholder="Ex: Diabetes tipo 2 controlada."
                    value={anamnesisForm.medical_history}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, medical_history: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#8E8E93]"
                  />
                </div>
                <button
                  onClick={handleAnamnesisSubmit}
                  disabled={anamnesisSubmitting}
                  className="w-full h-14 mt-2 bg-[#216153] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center"
                >
                  {anamnesisSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Salvar Ficha Médica'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mantendo Modais Existentes ocultos para não quebrar funcionalidade caso sejam abertos por outro meio no futuro */}
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
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-9 h-1 bg-[#C6C6C8] rounded-full" />
              </div>
              <div className="px-5 pb-6 pt-3">
                <div className="flex items-center justify-between mb-6">
                  <h3 id="schedule-modal-title" className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">
                    {scheduleMode === 'reschedule' ? 'Reagendar Consulta' : 'Solicitar Nova Consulta'}
                  </h3>
                  <button
                    type="button"
                    onClick={closeScheduleModal}
                    className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X size={16} className="text-[#8E8E93]" />
                  </button>
                </div>

                {scheduleSuccess ? (
                  <div className="py-6 text-center">
                    <div className="w-16 h-16 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-[#34C759]" />
                    </div>
                    <p className="text-[#1C1C1E] text-[17px] font-semibold mb-2">Pedido Enviado!</p>
                    <p className="text-[#64748B] text-[15px] leading-relaxed">A clínica entrará em contato em breve para confirmar o agendamento.</p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleRequestAppointment(); }} className="space-y-4">
                    {scheduleMode === 'reschedule' && scheduleTargetAppointment && (
                      <div className="p-4 bg-[#F2F2F7] rounded-xl mb-4">
                        <p className="text-[#8E8E93] text-[13px] font-medium mb-1">Consulta original</p>
                        <p className="text-[#1C1C1E] text-[15px] font-semibold">
                          {new Date(scheduleTargetAppointment.start_time).toLocaleDateString('pt-BR')} às {new Date(scheduleTargetAppointment.start_time).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Data de preferência</label>
                      <input 
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={scheduleForm.preferred_date}
                        onChange={(e) => setScheduleForm(prev => ({...prev, preferred_date: e.target.value}))}
                        className="w-full px-4 py-3.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Qual o melhor horário?</label>
                      <select
                        value={scheduleForm.preferred_time}
                        onChange={(e) => setScheduleForm(prev => ({...prev, preferred_time: e.target.value}))}
                        className="w-full px-4 py-3.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors appearance-none"
                      >
                        <option value="">Qualquer horário</option>
                        <option value="Manhã">Manhã (08:00 - 12:00)</option>
                        <option value="Tarde">Tarde (13:00 - 18:00)</option>
                        <option value="Noite">Noite (Após 18:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Motivo / Observações</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Dor de dente, limpeza de rotina..."
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm(prev => ({...prev, notes: e.target.value}))}
                        className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[15px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#8E8E93]"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={scheduleSubmitting || !scheduleForm.preferred_date}
                      className="w-full h-14 mt-2 bg-[#216153] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center disabled:opacity-70"
                    >
                      {scheduleSubmitting ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Enviar Solicitação'
                      )}
                    </button>
                  </form>
                )}
              </div>
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
      <div className="w-10 h-10 bg-academy-bg rounded-full flex items-center justify-center">
        <Icon size={18} className="text-[#0C9B72]" />
      </div>
      <span className="text-academy-muted text-[11px] font-medium">{label}</span>
    </button>
  );
}

function PortalStatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 text-center shadow-[0_1px_6px_rgba(0,0,0,0.05)]">
      <p className="text-academy-text text-[24px] font-bold tracking-tight">{value}</p>
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
    'FINISHED': 'bg-academy-border text-academy-muted',
    'CANCELLED': 'bg-[#FF3B30]/10 text-[#FF3B30]',
    'NO_SHOW': 'bg-[#FF3B30]/10 text-[#FF3B30]',
  };
  return (
    <div className={`px-4 py-3.5 ${past ? 'opacity-40' : ''}`}>
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 bg-academy-bg rounded-xl flex items-center justify-center shrink-0">
          <Calendar size={16} className="text-academy-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-academy-text text-[15px] font-medium">{formatDate(appointment.start_time)}</p>
          <p className="text-academy-muted text-[13px] mt-0.5">
            {formatTime(appointment.start_time)} · Dr(a). {appointment.dentist_name}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0 ${statusColors[appointment.status] || 'bg-academy-border text-academy-muted'}`}>
          {s.label}
        </span>
      </div>
      {appointment.notes && (
        <p className="text-academy-muted text-[13px] mt-2 ml-[54px]">{appointment.notes}</p>
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
        <Icon size={24} className="text-academy-muted" />
      </div>
      <p className="text-[#AEAEB2] text-[15px]">{text}</p>
    </div>
  );
}
