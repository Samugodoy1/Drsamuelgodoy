import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { API_URL } from '../config';
import {
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  CalendarPlus,
  User,
  Heart,
  Download,
  X,
  ClipboardList,
  Phone,
  MessageCircle,
  MapPin,
  Copy
} from '../icons';

// ─── Helpers de data ───
// A API envia horários como "YYYY-MM-DD HH:mm:ss" no relógio local da clínica
// (America/Sao_Paulo), sem timezone. Interpretamos os componentes diretamente
// para que o horário exibido seja sempre o horário da clínica, em qualquer aparelho.
const parseWallClock = (s: string): Date => {
  if (!s) return new Date(NaN);
  const dt = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (dt) return new Date(+dt[1], +dt[2] - 1, +dt[3], +dt[4], +dt[5]);
  const d = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (d) return new Date(+d[1], +d[2] - 1, +d[3]);
  return new Date(s);
};

// Data de hoje no formato YYYY-MM-DD usando o relógio local (toISOString usa UTC
// e à noite no Brasil já mostra o dia seguinte).
const localDateISO = (d: Date = new Date()) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Diferença em dias de calendário (0 = hoje, 1 = amanhã), ignorando horas.
const calendarDaysUntil = (target: Date) => {
  const now = new Date();
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86400000);
};

const formatCurrencyBR = (v: number | string) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const phoneDigits = (phone?: string | null) => (phone || '').replace(/\D/g, '');

const whatsappUrl = (phone?: string | null) => {
  const digits = phoneDigits(phone);
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
};

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
  appointment_requests?: Array<{
    id: number;
    status: string;
    request_type: string;
    preferred_date: string;
    preferred_time: string | null;
    notes: string | null;
    created_at: string;
    appointment_id: number | null;
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

export function PatientPortal() {
  const { token } = useParams<{ token: string }>();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorClinic, setErrorClinic] = useState<{ name?: string; phone?: string | null } | null>(null);

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
  const [confirmError, setConfirmError] = useState<{ id: number; message: string } | null>(null);

  // Cancelamento de consulta
  const [cancelTarget, setCancelTarget] = useState<PortalData['appointments'][number] | null>(null);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const scheduleModalRef = useRef<HTMLDivElement | null>(null);
  const pixModalRef = useRef<HTMLDivElement | null>(null);

  // Pre-op, Post-op and Anamnesis modals
  const [showPreOpModal, setShowPreOpModal] = useState(false);
  const [showPostOpModal, setShowPostOpModal] = useState(false);
  const [showAnamnesisModal, setShowAnamnesisModal] = useState(false);
  const [anamnesisForm, setAnamnesisForm] = useState({ allergies: '', medications: '', medical_history: '' });
  const [anamnesisSubmitting, setAnamnesisSubmitting] = useState(false);
  const [anamnesisError, setAnamnesisError] = useState<string | null>(null);
  const [anamnesisSaved, setAnamnesisSaved] = useState(false);

  const openAnamnesisModal = () => {
    if (data?.anamnesis) {
      setAnamnesisForm({
        allergies: data.anamnesis.allergies || '',
        medications: data.anamnesis.medications || '',
        medical_history: data.anamnesis.medical_history || ''
      });
    }
    setAnamnesisError(null);
    setAnamnesisSaved(false);
    setShowAnamnesisModal(true);
  };

  const handleAnamnesisSubmit = async () => {
    if (!sessionToken) return;
    setAnamnesisSubmitting(true);
    setAnamnesisError(null);
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
      if (!res.ok) throw new Error();

      setData((current: any) => current ? {
        ...current,
        anamnesis: { ...current.anamnesis, ...anamnesisForm }
      } : current);

      setAnamnesisSaved(true);
      setTimeout(() => {
        setShowAnamnesisModal(false);
        setAnamnesisSaved(false);
      }, 1600);
    } catch {
      setAnamnesisError('Não foi possível salvar. Verifique sua internet e toque em "Salvar" novamente.');
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
    setLoading(true);
    setError(null);
    setErrorClinic(null);
    try {
      const authRes = await fetch(`${API_URL}/api/portal/auth/${token}`);
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || 'Este link não está mais ativo. Peça um novo link à sua clínica.');
        if (authData.clinic) setErrorClinic(authData.clinic);
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
    } catch {
      setError('Não conseguimos carregar seus dados. Verifique sua internet e tente novamente.');
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
      // Registra localmente para o card "Aguardando a clínica" aparecer na hora
      setData(current => current ? {
        ...current,
        appointment_requests: [
          {
            id: Date.now(),
            status: 'PENDING',
            request_type: isReschedule ? 'RESCHEDULE' : 'NEW',
            preferred_date: scheduleForm.preferred_date,
            preferred_time: scheduleForm.preferred_time || null,
            notes: scheduleForm.notes || null,
            created_at: new Date().toISOString(),
            appointment_id: isReschedule && scheduleTargetAppointment ? scheduleTargetAppointment.id : null
          },
          ...(current.appointment_requests || [])
        ]
      } : current);
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

  // Sem update otimista: o botão mostra "Confirmando..." e só vira
  // "Presença confirmada" depois da resposta da API. Em erro, a mensagem
  // permanece visível até o paciente tentar de novo.
  const handleConfirmAppointment = async (appointmentId: number) => {
    setConfirmError(null);
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
        throw new Error(payload?.error || 'Não foi possível confirmar. Tente novamente.');
      }
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
    } catch (err: any) {
      setConfirmError({ id: appointmentId, message: err.message || 'Não foi possível confirmar. Tente novamente.' });
    } finally {
      setAppointmentSubmittingId(null);
    }
  };

  const handleCancelAppointment = async () => {
    if (!cancelTarget) return;
    setCancelSubmitting(true);
    setCancelError(null);
    try {
      const res = await fetch(`${API_URL}/api/portal/cancel-appointment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ appointment_id: cancelTarget.id })
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => null);
        throw new Error(payload?.error || 'Não foi possível enviar o pedido. Tente novamente.');
      }
      setData(current => current ? {
        ...current,
        appointment_requests: [
          {
            id: Date.now(),
            status: 'PENDING',
            request_type: 'CANCEL',
            preferred_date: localDateISO(),
            preferred_time: null,
            notes: null,
            created_at: new Date().toISOString(),
            appointment_id: cancelTarget.id
          },
          ...(current.appointment_requests || [])
        ]
      } : current);
      setCancelTarget(null);
    } catch (err: any) {
      setCancelError(err.message || 'Não foi possível enviar o pedido. Tente novamente.');
    } finally {
      setCancelSubmitting(false);
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
      preferred_date: localDateISO(parseWallClock(appointment.start_time)),
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
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-[3px] border-[#E2E8F0] border-t-[#216153] rounded-full animate-spin" />
        <p role="status" aria-live="polite" className="text-[#475569] text-[16px] font-medium tracking-tight">Carregando...</p>
      </div>
    </div>
  );

  if (error && !data) {
    const errorPhoneDigits = phoneDigits(errorClinic?.phone);
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center px-6">
        <div className="text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mx-auto mb-5">
            <AlertCircle size={28} className="text-[#FF3B30]" />
          </div>
          <h2 className="text-[22px] font-bold text-[#0F172A] mb-2 tracking-tight">Não foi possível entrar</h2>
          <p className="text-[#475569] text-[16px] leading-relaxed">{error}</p>

          {errorClinic && (
            <div className="mt-6 bg-white border border-[#E2E8F0] rounded-2xl p-5 text-left">
              <p className="text-[#0F172A] text-[16px] font-bold mb-1">
                {errorClinic.name || 'Sua clínica'}
              </p>
              <p className="text-[#475569] text-[15px] leading-relaxed mb-4">
                Ligue e peça um novo link do portal — leva menos de um minuto.
              </p>
              {errorPhoneDigits && (
                <a
                  href={`tel:${errorPhoneDigits}`}
                  className="w-full h-14 bg-[#216153] text-white rounded-xl font-bold text-[16px] flex items-center justify-center gap-3"
                >
                  <Phone size={20} />
                  Ligar: {errorClinic.phone}
                </a>
              )}
            </div>
          )}

          <button
            onClick={authenticateAndLoad}
            className="mt-6 w-full h-14 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl font-bold text-[16px] active:bg-slate-50"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { patient, clinic, appointments, evolution, files, installments = [], appointment_requests = [] } = data;

  const futureAppointments = appointments
    .filter(a => parseWallClock(a.start_time) > new Date() && a.status !== 'CANCELLED')
    .sort((a, b) => parseWallClock(a.start_time).getTime() - parseWallClock(b.start_time).getTime());

  const formatDateBR = (d: string) => {
    try { return parseWallClock(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const formatTimeBR = (d: string) => {
    try {
      const date = parseWallClock(d);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
    } catch { return ''; }
  };

  // "hoje", "amanhã" ou "sexta-feira, dia 15/08" — datas por extenso ajudam todos os públicos
  const friendlyDayLabel = (d: string) => {
    const date = parseWallClock(d);
    const days = calendarDaysUntil(date);
    if (days === 0) return 'hoje';
    if (days === 1) return 'amanhã';
    const weekday = date.toLocaleDateString('pt-BR', { weekday: 'long' });
    const dayMonth = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    return `${weekday}, dia ${dayMonth}`;
  };

  const friendlyTimeLabel = (d: string) => {
    const t = formatTimeBR(d);
    return t.endsWith(':00') ? t.replace(':00', 'h') : t.replace(':', 'h');
  };

  // Parcelas em aberto (financeiro)
  const pendingInstallments = installments
    .filter(i => !i.payment_date && i.status !== 'PAID' && i.status !== 'CANCELLED')
    .sort((a, b) => parseWallClock(a.due_date).getTime() - parseWallClock(b.due_date).getTime());
  const nextInstallment = pendingInstallments[0] || null;

  // Pedidos do paciente aguardando resposta da clínica
  const pendingRequests = appointment_requests.filter(r => r.status === 'PENDING');
  const requestTypeLabel = (t: string) => {
    if (t === 'RESCHEDULE') return 'Pedido para remarcar consulta';
    if (t === 'CANCEL') return 'Pedido para cancelar consulta';
    return 'Pedido de nova consulta';
  };

  const clinicPhoneDigits = phoneDigits(clinic?.phone);
  const clinicWhatsapp = whatsappUrl(clinic?.phone);

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

      {/* ─── Header: clínica + atalho de ligação ─── */}
      <div className="px-6 pt-8 pb-4 max-w-lg mx-auto flex items-center gap-3">
        {clinic?.photo_url ? (
          <img src={clinic.photo_url} alt="" className="w-11 h-11 rounded-[12px] object-cover shadow-[0_2px_8px_rgba(0,0,0,0.08)] border border-slate-100/50" />
        ) : (
          <div className="w-11 h-11 bg-[#216153] rounded-[12px] flex items-center justify-center text-white font-bold text-lg tracking-tight">
            {(clinic?.clinic_name || clinic?.name || 'C').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[#0F172A] text-[16px] font-bold truncate">{clinic?.clinic_name || clinic?.name || 'Sua clínica'}</p>
          <p className="text-[#216153] text-[13px] font-semibold">Portal do Paciente</p>
        </div>
        {clinicPhoneDigits && (
          <a
            href={`tel:${clinicPhoneDigits}`}
            aria-label="Ligar para a clínica"
            className="w-11 h-11 bg-[#216153]/10 rounded-full flex items-center justify-center shrink-0 active:scale-95 transition-transform"
          >
            <Phone size={20} className="text-[#216153]" />
          </a>
        )}
      </div>

      {/* ─── Content ─── */}
      <div className="px-6 pt-6 max-w-lg mx-auto">
        {/* Saudação */}
        <div className="mb-8">
          <h1 className="text-[32px] font-bold text-[#0F172A] leading-tight tracking-tight">
            Olá, {(() => {
              const parts = patient.name.trim().split(/\s+/);
              const firstName = parts[0] || '';
              const firstSurname = parts[1] || '';
              return firstSurname ? `${firstName} ${firstSurname}` : firstName;
            })()}
          </h1>
          {futureAppointments.length === 0 && (
            <p className="text-[#216153] text-[17px] font-semibold mt-2">
              Você não tem consultas marcadas.
            </p>
          )}
        </div>

        {/* ─── Próximas consultas ─── */}
        {futureAppointments.length > 0 && (
          <div className="space-y-4 mb-8">
            {futureAppointments.map((appt, idx) => {
              const isNext = idx === 0;
              const isConfirmed = appt.status === 'CONFIRMED' || confirmedAppointmentId === appt.id;
              const isSubmitting = appointmentSubmittingId === appt.id;
              // Pedidos pendentes vêm da API: persistem mesmo se o paciente recarregar a página
              const rescheduleAsked = pendingRequests.some(r => r.request_type === 'RESCHEDULE' && r.appointment_id === appt.id);
              const cancelAsked = pendingRequests.some(r => r.request_type === 'CANCEL' && r.appointment_id === appt.id);

              return (
                <div
                  key={appt.id}
                  className={`bg-white border rounded-2xl p-5 shadow-sm ${isNext ? 'border-[#216153]/30' : 'border-[#E2E8F0]'}`}
                >
                  <p className="text-[#475569] text-[14px] font-semibold mb-1">
                    {isNext ? 'Sua próxima consulta' : 'Consulta seguinte'}
                  </p>
                  <p className="text-[#0F172A] text-[21px] font-bold leading-snug capitalize">
                    {friendlyDayLabel(appt.start_time)}
                  </p>
                  <p className="text-[#216153] text-[18px] font-bold mt-0.5">
                    às {friendlyTimeLabel(appt.start_time)}
                  </p>
                  {appt.dentist_name && (
                    <p className="text-[#475569] text-[15px] mt-1">Dr(a). {appt.dentist_name}</p>
                  )}

                  {cancelAsked ? (
                    <p className="mt-4 text-[#92600A] text-[15px] font-semibold bg-[#FFF8EB] border border-[#F5E1B8] rounded-xl px-4 py-3">
                      Pedido de cancelamento enviado. A clínica vai confirmar com você.
                    </p>
                  ) : (
                    <>
                      <button
                        onClick={() => !isConfirmed && !isSubmitting && handleConfirmAppointment(appt.id)}
                        disabled={isConfirmed || isSubmitting}
                        className={`w-full h-14 mt-4 rounded-xl flex items-center justify-center gap-3 font-bold text-[16px] transition-transform ${
                          isConfirmed
                            ? 'bg-[#34C759]/10 text-[#1F9D4D] cursor-default'
                            : 'bg-[#216153] text-white active:scale-[0.98] shadow-[0_6px_18px_rgba(33,97,83,0.22)]'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-5 h-5 border-[2px] border-white/25 border-t-white rounded-full animate-spin" />
                            Confirmando...
                          </>
                        ) : isConfirmed ? (
                          <>
                            <CheckCircle2 size={22} />
                            Presença confirmada
                          </>
                        ) : (
                          'Confirmar minha ida'
                        )}
                      </button>
                      {confirmError?.id === appt.id && (
                        <p role="alert" className="mt-3 text-[#C0392B] text-[15px] font-medium bg-[#FF3B30]/5 border border-[#FF3B30]/15 rounded-xl px-4 py-3">
                          {confirmError.message}
                        </p>
                      )}
                      {rescheduleAsked ? (
                        <p className="mt-3 text-[#92600A] text-[15px] font-semibold bg-[#FFF8EB] border border-[#F5E1B8] rounded-xl px-4 py-3">
                          Pedido para remarcar enviado. A clínica vai confirmar com você.
                        </p>
                      ) : (
                        <button
                          onClick={() => { setCancelError(null); setCancelTarget(appt); }}
                          className="w-full h-12 mt-2 text-[#475569] font-semibold text-[15px] rounded-xl active:bg-slate-50"
                        >
                          Não poderei ir nesse dia
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Pedidos aguardando a clínica ───
             Remarcações/cancelamentos já aparecem no card da própria consulta;
             aqui mostramos apenas pedidos de consulta nova. */}
        {(() => {
          const futureIds = new Set(futureAppointments.map(a => a.id));
          const visibleRequests = pendingRequests.filter(
            r => r.request_type === 'NEW' || !r.appointment_id || !futureIds.has(r.appointment_id)
          );
          if (visibleRequests.length === 0) return null;
          return (
            <div className="mb-8 bg-[#FFF8EB] border border-[#F5E1B8] rounded-2xl p-5">
              <p className="text-[#92600A] text-[16px] font-bold mb-2">Aguardando a clínica</p>
              <div className="space-y-2">
                {visibleRequests.map(r => (
                  <p key={r.id} className="text-[#92600A] text-[15px] leading-relaxed">
                    {requestTypeLabel(r.request_type)}
                    {r.request_type !== 'CANCEL' && r.preferred_date ? ` para ${formatDateBR(r.preferred_date)}` : ''}.
                    {' '}A clínica vai entrar em contato para confirmar.
                  </p>
                ))}
              </div>
            </div>
          );
        })()}

        {/* ─── Ações ─── */}
        <div className="space-y-4 mb-10">
          <button onClick={openNewScheduleModal} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <CalendarPlus size={24} className="text-[#216153]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Pedir uma consulta</span>
          </button>

          {futureAppointments.length > 0 && (
            <button onClick={() => setShowPreOpModal(true)} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
              <ClipboardList size={24} className="text-[#216153]" />
              <span className="text-[#0F172A] font-bold text-[16px]">Como me preparar para a consulta</span>
            </button>
          )}

          <button onClick={openAnamnesisModal} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <User size={24} className="text-[#216153]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Atualizar minha ficha médica</span>
          </button>

          <button onClick={() => setShowPostOpModal(true)} className="w-full h-[64px] bg-white border border-[#E2E8F0] rounded-2xl flex items-center px-5 gap-4 active:bg-slate-50 transition-colors shadow-sm">
            <Heart size={24} className="text-[#216153]" />
            <span className="text-[#0F172A] font-bold text-[16px]">Cuidados após o atendimento</span>
          </button>
        </div>

        {/* ─── Pagamentos ─── */}
        {nextInstallment && (
          <div className="mb-10">
            <h2 className="text-[20px] font-bold text-[#0F172A] mb-3">Pagamentos</h2>
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5 shadow-sm">
              {(() => {
                const overdue = calendarDaysUntil(parseWallClock(nextInstallment.due_date)) < 0;
                return (
                  <>
                    <p className="text-[#475569] text-[14px] font-semibold">
                      Próxima parcela{nextInstallment.procedure ? ` — ${nextInstallment.procedure}` : ''}
                    </p>
                    <p className="text-[#0F172A] text-[26px] font-bold mt-1">{formatCurrencyBR(nextInstallment.amount)}</p>
                    <p className={`text-[15px] font-medium mt-0.5 ${overdue ? 'text-[#C0392B]' : 'text-[#475569]'}`}>
                      {overdue ? 'Venceu em' : 'Vence em'} {formatDateBR(nextInstallment.due_date)}
                    </p>
                    <button
                      onClick={() => {
                        setShowPixModal({
                          amount: Number(nextInstallment.amount),
                          installment_id: nextInstallment.id,
                          label: `Parcela ${nextInstallment.number}${nextInstallment.procedure ? ` — ${nextInstallment.procedure}` : ''}`
                        });
                        loadPixInfo();
                      }}
                      className="w-full h-14 mt-4 bg-[#216153] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform"
                    >
                      Ver como pagar (PIX)
                    </button>
                  </>
                );
              })()}

              {pendingInstallments.length > 1 && (
                <details className="mt-4">
                  <summary className="text-[#216153] text-[15px] font-bold cursor-pointer py-2 list-none flex items-center gap-2">
                    Ver todas as parcelas em aberto ({pendingInstallments.length})
                  </summary>
                  <div className="mt-2 divide-y divide-[#F1F5F9]">
                    {pendingInstallments.map(inst => (
                      <div key={inst.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[#0F172A] text-[15px] font-semibold">
                            Parcela {inst.number}{inst.procedure ? ` — ${inst.procedure}` : ''}
                          </p>
                          <p className="text-[#475569] text-[14px]">Vence em {formatDateBR(inst.due_date)}</p>
                        </div>
                        <p className="text-[#0F172A] text-[15px] font-bold shrink-0">{formatCurrencyBR(inst.amount)}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* ─── Meu tratamento (histórico + documentos) ─── */}
        {(evolution.length > 0 || files.length > 0) && (
          <div className="mb-10">
            <h2 className="text-[20px] font-bold text-[#0F172A] mb-3">Meu tratamento</h2>
            <div className="space-y-3">
              {evolution.length > 0 && (
                <details className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 shadow-sm">
                  <summary className="text-[#0F172A] text-[16px] font-bold cursor-pointer list-none flex items-center gap-3 min-h-[44px]">
                    <Calendar size={22} className="text-[#216153] shrink-0" />
                    O que já foi feito ({evolution.length})
                  </summary>
                  <div className="mt-2 divide-y divide-[#F1F5F9]">
                    {evolution.map(e => (
                      <div key={e.id} className="py-3">
                        <p className="text-[#0F172A] text-[15px] font-semibold">{e.procedure_performed || 'Atendimento'}</p>
                        <p className="text-[#475569] text-[14px] mt-0.5">
                          {formatDateBR(e.date)}{e.dentist_name ? ` · Dr(a). ${e.dentist_name}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {files.length > 0 && (
                <details className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 shadow-sm">
                  <summary className="text-[#0F172A] text-[16px] font-bold cursor-pointer list-none flex items-center gap-3 min-h-[44px]">
                    <FileText size={22} className="text-[#216153] shrink-0" />
                    Meus documentos ({files.length})
                  </summary>
                  <div className="mt-2 divide-y divide-[#F1F5F9]">
                    {files.map(f => (
                      <a
                        key={f.id}
                        href={f.file_url}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 flex items-center gap-3 active:bg-slate-50"
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-[#0F172A] text-[15px] font-semibold truncate">{f.description || 'Documento'}</span>
                          <span className="block text-[#475569] text-[14px]">{formatDateBR(f.created_at)}</span>
                        </span>
                        <Download size={20} className="text-[#216153] shrink-0" />
                      </a>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* ─── Dica do dia ─── */}
        <div className="w-full bg-[#FCF8FF] border border-[#F3E8FF] rounded-[24px] p-6 mb-6">
          <h3 className="text-[#6D28D9] text-[14px] font-bold mb-2">Dica do dia</h3>
          <p className="text-[#475569] text-[15px] font-medium leading-relaxed">
            {(() => {
              if (futureAppointments.length > 0) {
                const daysUntil = calendarDaysUntil(parseWallClock(futureAppointments[0].start_time));
                if (daysUntil === 0) return "Sua consulta é hoje! Escove os dentes antes de sair e leve um documento com foto.";
                if (daysUntil === 1) return "Sua consulta é amanhã! Tenha uma boa noite de sono e evite alimentos pesados.";
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
              // Muda a cada dia (e varia entre pacientes)
              const dayIndex = Math.floor(Date.now() / 86400000);
              return generalTips[(dayIndex + (patient.id || 0)) % generalTips.length];
            })()}
          </p>
        </div>

        {/* ─── Falar com a clínica ─── */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[24px] p-6">
          <h3 className="text-[#0F172A] text-[18px] font-bold mb-1">Precisa falar com a clínica?</h3>
          <p className="text-[#475569] text-[15px] leading-relaxed mb-4">
            Para dor forte, dúvidas sobre o tratamento ou remarcação urgente, fale direto com a gente.
          </p>
          <div className="space-y-3">
            {clinicPhoneDigits && (
              <a
                href={`tel:${clinicPhoneDigits}`}
                className="w-full h-14 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-3 font-bold text-[16px] text-[#0F172A] active:bg-slate-50 shadow-sm"
              >
                <Phone size={20} className="text-[#216153]" />
                Ligar: {clinic?.phone}
              </a>
            )}
            {clinicWhatsapp && (
              <a
                href={clinicWhatsapp}
                target="_blank"
                rel="noreferrer"
                className="w-full h-14 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-3 font-bold text-[16px] text-[#0F172A] active:bg-slate-50 shadow-sm"
              >
                <MessageCircle size={20} className="text-[#25A05A]" />
                Chamar no WhatsApp
              </a>
            )}
          </div>
          {clinic?.clinic_address && (
            <p className="text-[#475569] text-[15px] mt-4 flex items-start gap-2">
              <MapPin size={18} className="text-[#216153] shrink-0 mt-0.5" />
              {clinic.clinic_address}
            </p>
          )}
          <p className="text-[#64748B] text-[14px] leading-relaxed mt-4">
            Dica: guarde a mensagem com este link para voltar ao portal quando precisar.
            Se o link parar de funcionar, é só pedir um novo à clínica.
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
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Como me preparar</h3>
                <button type="button" aria-label="Fechar" onClick={() => setShowPreOpModal(false)} className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-95"><X size={18} className="text-[#475569]" /></button>
              </div>
              <div className="p-5 overflow-y-auto">
                {futureAppointments.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-[#475569] text-[15px] leading-relaxed">
                      Para sua próxima consulta no dia <strong className="text-[#1C1C1E]">{formatDateBR(futureAppointments[0].start_time)}</strong>, siga estas orientações:
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-start gap-3"><span className="text-xl">🪥</span><span className="text-[#334155] text-[15px]">Escove bem os dentes antes de sair de casa.</span></li>
                      <li className="flex items-start gap-3"><span className="text-xl">⏱️</span><span className="text-[#334155] text-[15px]">Chegue com 10 minutos de antecedência.</span></li>
                      <li className="flex items-start gap-3"><span className="text-xl">📄</span><span className="text-[#334155] text-[15px]">Traga documento com foto e exames recentes, caso tenha.</span></li>
                      <li className="flex items-start gap-3"><span className="text-xl">💊</span><span className="text-[#334155] text-[15px]">Tome seus remédios de uso diário normalmente, a não ser que a clínica tenha orientado o contrário.</span></li>
                    </ul>
                    <div className="p-4 bg-[#FFF8EB] border border-[#F5E1B8] rounded-xl">
                      <p className="text-[#92600A] text-[15px] font-bold mb-1">Vai passar por cirurgia?</p>
                      <p className="text-[#92600A] text-[15px] leading-relaxed">
                        Siga as orientações de jejum e acompanhante que a clínica passou para você.
                        Se tiver qualquer dúvida, ligue antes da consulta.
                      </p>
                      {clinicPhoneDigits && (
                        <a href={`tel:${clinicPhoneDigits}`} className="mt-3 w-full h-12 bg-white border border-[#F5E1B8] rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] text-[#92600A]">
                          <Phone size={18} />
                          Ligar para a clínica
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[#475569] text-[15px] text-center py-6">Você não possui consultas futuras agendadas.</p>
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
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Cuidados após o atendimento</h3>
                <button type="button" aria-label="Fechar" onClick={() => setShowPostOpModal(false)} className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-95"><X size={18} className="text-[#475569]" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                {recentProcedures.length > 0 ? (
                  <>
                    {recentProcedures.map((proc, idx) => {
                      const guide = PROCEDURE_GUIDES[proc.category];
                      if (!guide) return null;
                      return (
                        <div key={idx} className="mb-6 last:mb-0">
                          <h4 className="text-[#1C1C1E] font-bold text-[16px] mb-2">{guide.title}</h4>
                          <p className="text-[#475569] text-[14px] mb-4">Referente ao procedimento: {proc.procedure}</p>
                          <div className="space-y-3">
                            {guide.items.map((item, i) => (
                              <div key={i} className="flex items-start gap-3">
                                <span className="text-[16px] mt-0.5 shrink-0">{item.icon}</span>
                                <p className="text-[#3A3A3C] text-[15px] leading-relaxed">{item.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                      <p className="text-[#475569] text-[14px] leading-relaxed">
                        Estas são orientações gerais. Em caso de dor forte, sangramento intenso ou febre,
                        ligue para a clínica.
                      </p>
                      {clinicPhoneDigits && (
                        <a href={`tel:${clinicPhoneDigits}`} className="mt-3 w-full h-12 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] text-[#0F172A]">
                          <Phone size={18} className="text-[#216153]" />
                          Ligar para a clínica
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-4">
                    <p className="text-[#475569] text-[15px]">
                      Você não tem procedimento recente no seu histórico.
                      Para dúvidas gerais, fale com a clínica.
                    </p>
                    {clinicPhoneDigits && (
                      <a href={`tel:${clinicPhoneDigits}`} className="w-full h-12 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] text-[#0F172A]">
                        <Phone size={18} className="text-[#216153]" />
                        Ligar para a clínica
                      </a>
                    )}
                  </div>
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
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Minha ficha médica</h3>
                <button type="button" aria-label="Fechar" onClick={() => !anamnesisSubmitting && setShowAnamnesisModal(false)} className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-95"><X size={18} className="text-[#475569]" /></button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-[#334155] text-[15px] font-semibold mb-2">Alergias a remédios</label>
                  <textarea
                    placeholder="Ex: Dipirona, Penicilina..."
                    value={anamnesisForm.allergies}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, allergies: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#94A3B8]"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] text-[15px] font-semibold mb-2">Remédios que tomo todo dia</label>
                  <textarea
                    placeholder="Ex: Losartana, remédio para diabetes..."
                    value={anamnesisForm.medications}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, medications: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#94A3B8]"
                  />
                </div>
                <div>
                  <label className="block text-[#334155] text-[15px] font-semibold mb-2">Problemas de saúde (ex: diabetes, pressão alta)</label>
                  <textarea
                    placeholder="Ex: Diabetes tipo 2 controlada."
                    value={anamnesisForm.medical_history}
                    onChange={e => setAnamnesisForm({ ...anamnesisForm, medical_history: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#94A3B8]"
                  />
                </div>

                {anamnesisError && (
                  <p role="alert" className="text-[#C0392B] text-[15px] font-medium bg-[#FF3B30]/5 border border-[#FF3B30]/15 rounded-xl px-4 py-3">
                    {anamnesisError}
                  </p>
                )}

                <button
                  onClick={handleAnamnesisSubmit}
                  disabled={anamnesisSubmitting || anamnesisSaved}
                  className={`w-full h-14 mt-2 rounded-xl font-bold text-[16px] active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                    anamnesisSaved ? 'bg-[#34C759]/10 text-[#1F9D4D]' : 'bg-[#216153] text-white'
                  }`}
                >
                  {anamnesisSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : anamnesisSaved ? (
                    <>
                      <CheckCircle2 size={20} />
                      Ficha salva!
                    </>
                  ) : 'Salvar ficha médica'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal de agendamento/remarcação ─── */}
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
                    {scheduleMode === 'reschedule' ? 'Remarcar consulta' : 'Pedir uma consulta'}
                  </h3>
                  <button
                    type="button"
                    aria-label="Fechar"
                    onClick={closeScheduleModal}
                    className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                  >
                    <X size={18} className="text-[#475569]" />
                  </button>
                </div>

                {scheduleSuccess ? (
                  <div className="py-6 text-center">
                    <div className="w-16 h-16 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-[#34C759]" />
                    </div>
                    <p className="text-[#1C1C1E] text-[17px] font-semibold mb-2">Pedido enviado!</p>
                    <p className="text-[#475569] text-[15px] leading-relaxed">A clínica vai entrar em contato para confirmar. Você pode acompanhar o pedido na tela inicial do portal.</p>
                  </div>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleRequestAppointment(); }} className="space-y-4">
                    {scheduleMode === 'reschedule' && scheduleTargetAppointment && (
                      <div className="p-4 bg-[#F2F2F7] rounded-xl mb-4">
                        <p className="text-[#475569] text-[14px] font-medium mb-1">Consulta que será remarcada</p>
                        <p className="text-[#1C1C1E] text-[16px] font-semibold">
                          {formatDateBR(scheduleTargetAppointment.start_time)} às {formatTimeBR(scheduleTargetAppointment.start_time)}
                        </p>
                      </div>
                    )}
                    
                    <div>
                      <label className="block text-[#334155] text-[15px] font-semibold mb-2">Qual o melhor dia para você?</label>
                      <input 
                        type="date"
                        required
                        min={localDateISO()}
                        value={scheduleForm.preferred_date}
                        onChange={(e) => setScheduleForm(prev => ({...prev, preferred_date: e.target.value}))}
                        className="w-full px-4 py-3.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-[#334155] text-[15px] font-semibold mb-2">Qual o melhor horário?</label>
                      <select
                        value={scheduleForm.preferred_time}
                        onChange={(e) => setScheduleForm(prev => ({...prev, preferred_time: e.target.value}))}
                        className="w-full px-4 py-3.5 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors appearance-none"
                      >
                        <option value="">Qualquer horário</option>
                        <option value="Manhã">Manhã (08:00 - 12:00)</option>
                        <option value="Tarde">Tarde (13:00 - 18:00)</option>
                        <option value="Noite">Noite (Após 18:00)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#334155] text-[15px] font-semibold mb-2">Qual o motivo?</label>
                      <textarea
                        rows={2}
                        placeholder="Ex: Dor de dente, limpeza de rotina..."
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm(prev => ({...prev, notes: e.target.value}))}
                        className="w-full px-4 py-3 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl text-[#1C1C1E] text-[16px] outline-none focus:border-[#216153]/40 transition-colors resize-none placeholder:text-[#94A3B8]"
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
                        'Enviar pedido'
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal: não poderei ir (remarcar ou cancelar) ─── */}
      <AnimatePresence>
        {cancelTarget && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center" onClick={() => !cancelSubmitting && setCancelTarget(null)}>
            <motion.div role="dialog" aria-modal="true" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              <div className="px-5 pb-6 pt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Não poderá comparecer?</h3>
                  <button type="button" aria-label="Fechar" onClick={() => !cancelSubmitting && setCancelTarget(null)} className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-95">
                    <X size={18} className="text-[#475569]" />
                  </button>
                </div>

                <p className="text-[#475569] text-[16px] leading-relaxed mb-5">
                  Sua consulta está marcada para{' '}
                  <strong className="text-[#1C1C1E]">
                    {formatDateBR(cancelTarget.start_time)} às {friendlyTimeLabel(cancelTarget.start_time)}
                  </strong>. O que você prefere?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      const target = cancelTarget;
                      setCancelTarget(null);
                      if (target) openRescheduleModal(target);
                    }}
                    className="w-full h-14 bg-[#216153] text-white rounded-xl font-bold text-[16px] active:scale-[0.98] transition-transform"
                  >
                    Quero remarcar para outro dia
                  </button>
                  <button
                    onClick={handleCancelAppointment}
                    disabled={cancelSubmitting}
                    className="w-full h-14 bg-white border border-[#FF3B30]/30 text-[#C0392B] rounded-xl font-bold text-[16px] active:bg-red-50 transition-colors flex items-center justify-center"
                  >
                    {cancelSubmitting ? (
                      <div className="w-5 h-5 border-2 border-[#C0392B]/30 border-t-[#C0392B] rounded-full animate-spin" />
                    ) : 'Cancelar esta consulta'}
                  </button>
                </div>

                {cancelError && (
                  <p role="alert" className="mt-3 text-[#C0392B] text-[15px] font-medium bg-[#FF3B30]/5 border border-[#FF3B30]/15 rounded-xl px-4 py-3">
                    {cancelError}
                  </p>
                )}

                <p className="text-[#64748B] text-[14px] leading-relaxed mt-4 text-center">
                  O cancelamento só é efetivado depois que a clínica confirmar.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Modal: pagamento PIX ─── */}
      <AnimatePresence>
        {showPixModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center" onClick={() => !actionSubmitting && setShowPixModal(null)}>
            <motion.div ref={pixModalRef} role="dialog" aria-modal="true" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} onClick={e => e.stopPropagation()} className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-md shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="flex justify-center pt-3 pb-1 sm:hidden"><div className="w-9 h-1 bg-[#C6C6C8] rounded-full" /></div>
              <div className="px-5 pb-4 pt-3 flex items-center justify-between border-b border-[#E5E5EA]">
                <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Pagar com PIX</h3>
                <button type="button" aria-label="Fechar" onClick={() => !actionSubmitting && setShowPixModal(null)} className="w-11 h-11 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-95">
                  <X size={18} className="text-[#475569]" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto">
                {paymentInformed ? (
                  <div className="py-6 text-center">
                    <div className="w-16 h-16 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle2 size={32} className="text-[#34C759]" />
                    </div>
                    <p className="text-[#1C1C1E] text-[17px] font-semibold mb-2">Aviso enviado!</p>
                    <p className="text-[#475569] text-[15px] leading-relaxed">A clínica vai confirmar o recebimento do seu pagamento.</p>
                  </div>
                ) : !pixInfo ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-8 h-8 border-[3px] border-[#E2E8F0] border-t-[#216153] rounded-full animate-spin" />
                  </div>
                ) : pixInfo.has_pix && pixInfo.pix_key ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <p className="text-[#475569] text-[14px] font-semibold">{showPixModal.label}</p>
                      <p className="text-[#0F172A] text-[28px] font-bold mt-1">{formatCurrencyBR(showPixModal.amount)}</p>
                    </div>

                    <div className="p-4 bg-[#F2F2F7] border border-[#E5E5EA] rounded-xl">
                      <p className="text-[#475569] text-[14px] font-semibold mb-1">
                        Chave PIX{pixInfo.pix_key_type ? ` (${pixInfo.pix_key_type})` : ''}
                      </p>
                      <p className="text-[#0F172A] text-[16px] font-semibold break-all">{pixInfo.pix_key}</p>
                      {pixInfo.beneficiary_name && (
                        <p className="text-[#475569] text-[14px] mt-2">Em nome de: <strong className="text-[#1C1C1E]">{pixInfo.beneficiary_name}</strong></p>
                      )}
                    </div>

                    <button
                      onClick={() => copyToClipboard(pixInfo.pix_key!)}
                      className={`w-full h-14 rounded-xl font-bold text-[16px] flex items-center justify-center gap-2 transition-colors ${
                        pixCopied ? 'bg-[#34C759]/10 text-[#1F9D4D]' : 'bg-[#216153] text-white active:scale-[0.98]'
                      }`}
                    >
                      {pixCopied ? (
                        <>
                          <CheckCircle2 size={20} />
                          Chave copiada!
                        </>
                      ) : (
                        <>
                          <Copy size={20} />
                          Copiar chave PIX
                        </>
                      )}
                    </button>

                    <ol className="space-y-2 text-[#475569] text-[15px] leading-relaxed list-decimal pl-5">
                      <li>Abra o aplicativo do seu banco.</li>
                      <li>Escolha <strong className="text-[#1C1C1E]">PIX</strong> e depois <strong className="text-[#1C1C1E]">Pagar com chave</strong>.</li>
                      <li>Cole a chave e confira o nome de quem recebe.</li>
                      <li>Pague o valor de <strong className="text-[#1C1C1E]">{formatCurrencyBR(showPixModal.amount)}</strong>.</li>
                    </ol>

                    <button
                      onClick={() => handleInformPayment(showPixModal.amount, showPixModal.installment_id)}
                      disabled={actionSubmitting}
                      className="w-full h-14 bg-white border border-[#E2E8F0] text-[#0F172A] rounded-xl font-bold text-[16px] active:bg-slate-50 flex items-center justify-center"
                    >
                      {actionSubmitting ? (
                        <div className="w-5 h-5 border-2 border-[#216153]/30 border-t-[#216153] rounded-full animate-spin" />
                      ) : 'Já paguei — avisar a clínica'}
                    </button>

                    {error && (
                      <p role="alert" className="text-[#C0392B] text-[15px] font-medium bg-[#FF3B30]/5 border border-[#FF3B30]/15 rounded-xl px-4 py-3">
                        {error}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="py-4 text-center space-y-4">
                    <p className="text-[#475569] text-[15px] leading-relaxed">
                      A clínica ainda não cadastrou uma chave PIX no portal.
                      Combine o pagamento diretamente com a clínica.
                    </p>
                    {clinicPhoneDigits && (
                      <a href={`tel:${clinicPhoneDigits}`} className="w-full h-12 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center gap-2 font-bold text-[15px] text-[#0F172A]">
                        <Phone size={18} className="text-[#216153]" />
                        Ligar para a clínica
                      </a>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
