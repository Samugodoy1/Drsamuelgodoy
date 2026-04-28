import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  ChevronRight,
  CheckCircle2,
  ClipboardList,
  FileText,
  Heart,
  Home,
  LogOut,
  MapPin,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  UserCircle,
} from '../icons';

type PortalTab = 'home' | 'cuidados' | 'consultas' | 'perfil';
type HomeAssistantState =
  | 'confirmar_presenca'
  | 'consulta_hoje'
  | 'consulta_amanha'
  | 'consulta_futura'
  | 'solicitacao_pendente'
  | 'solicitacao_recusada'
  | 'sem_pendencias';
type UpdateTone = 'success' | 'warning' | 'danger' | 'neutral';
type ProfileActionKey = 'edit_profile' | 'renew_anamnesis' | 'insurance' | 'documents' | 'preferences' | 'support';
type FeedbackTone = 'success' | 'error' | 'info';

interface PortalData {
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    birth_date: string;
    address: string;
    health_insurance?: string;
    health_insurance_number?: string;
    treatment_plan?: Array<{ id: string; procedure?: string; value?: number; status?: string }>;
  };
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
  appointment_requests: Array<{
    id: number;
    status: string;
    reason_category?: string;
    desired_period?: string;
    notes?: string;
    created_at: string;
  }>;
  clinic: {
    name?: string;
    clinic_name?: string;
    phone?: string;
  } | null;
}

const statusLabel: Record<string, string> = {
  PENDING: 'Em análise',
  ANALYZING: 'Em análise',
  EM_ANALISE: 'Em análise',
  APPROVED: 'Confirmada',
  CONFIRMED: 'Confirmada',
  SCHEDULED: 'Confirmada',
  REJECTED: 'Horário indisponível',
  DECLINED: 'Horário indisponível',
  DENIED: 'Horário indisponível',
  REFUSED: 'Horário indisponível',
  RECUSADA: 'Horário indisponível',
  CANCELLED: 'Cancelada',
  CANCELED: 'Cancelada',
  CANCELED_BY_PATIENT: 'Cancelada',
  CANCELED_BY_CLINIC: 'Cancelada',
  COMPLETED: 'Concluída',
  FINISHED: 'Concluída',
};

function getStatusLabel(status?: string) {
  if (!status) return 'Em análise';
  return statusLabel[status.toUpperCase()] || 'Em análise';
}

function getStatusChipClasses(status?: string) {
  const normalized = (status || '').toUpperCase();
  if (['APPROVED', 'CONFIRMED', 'SCHEDULED', 'FINISHED', 'COMPLETED'].includes(normalized)) {
    return 'bg-[#EAF4EE] text-[#166534]';
  }
  if (['PENDING', 'ANALYZING', 'EM_ANALISE'].includes(normalized)) {
    return 'bg-[#FFFBEB] text-[#B45309]';
  }
  if (['REJECTED', 'DECLINED', 'DENIED', 'REFUSED', 'RECUSADA', 'CANCELLED', 'CANCELED', 'CANCELED_BY_PATIENT', 'CANCELED_BY_CLINIC'].includes(normalized)) {
    return 'bg-[#FEF2F2] text-[#B42318]';
  }
  return 'bg-[#F2F4F7] text-[#667085]';
}

export function PatientPortal() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('home');
  const [appointmentSubmittingId, setAppointmentSubmittingId] = useState<number | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [activeProfileAction, setActiveProfileAction] = useState<ProfileActionKey | null>(null);
  const [feedback, setFeedback] = useState<{ tone: FeedbackTone; message: string } | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [supportSending, setSupportSending] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({
    health_insurance: '',
    health_insurance_number: '',
  });
  const [scheduleForm, setScheduleForm] = useState({ preferred_date: '', preferred_time: '', notes: '', is_urgent: false });

  useEffect(() => {
    const authenticateAndLoad = async () => {
      try {
        const authRes = await fetch(`/api/portal/auth/${token}`);
        const authData = await authRes.json();
        if (!authRes.ok) throw new Error(authData.error || 'Link inválido ou expirado');

        setSessionToken(authData.session_token);

        const dataRes = await fetch('/api/portal/data', {
          headers: { Authorization: `Bearer ${authData.session_token}` },
        });
        const portalData = await dataRes.json();
        if (!dataRes.ok) throw new Error(portalData.error || 'Erro ao carregar dados');
        setData(portalData);
        setInsuranceForm({
          health_insurance: portalData.patient.health_insurance || '',
          health_insurance_number: portalData.patient.health_insurance_number || '',
        });
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar o portal');
      } finally {
        setLoading(false);
      }
    };

    authenticateAndLoad();
  }, [token]);

  const portalFetch = async (url: string, options: RequestInit = {}) => {
    if (!sessionToken) throw new Error('Sessão expirada. Entre novamente pelo link da clínica.');
    return fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${sessionToken}`,
        ...(options.headers || {}),
      },
    });
  };

  const refreshPortalData = async () => {
    const response = await portalFetch('/api/portal/data');
    const portalData = await response.json();
    if (!response.ok) throw new Error(portalData.error || 'Não foi possível atualizar os dados');
    setData(portalData);
    setInsuranceForm({
      health_insurance: portalData.patient.health_insurance || '',
      health_insurance_number: portalData.patient.health_insurance_number || '',
    });
  };

  const handleConfirmAppointment = async (appointmentId: number) => {
    if (!sessionToken) return;
    setAppointmentSubmittingId(appointmentId);

    setData((current) =>
      current
        ? {
            ...current,
            appointments: current.appointments.map((a) => (a.id === appointmentId ? { ...a, status: 'CONFIRMED' } : a)),
          }
        : current,
    );

    try {
      const res = await fetch('/api/portal/confirm-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });

      if (!res.ok) throw new Error('Erro ao confirmar consulta');
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar consulta');
    } finally {
      setAppointmentSubmittingId(null);
    }
  };

  const handleRequestAppointment = async () => {
    if (!sessionToken || !scheduleForm.preferred_date) return;
    setScheduleSubmitting(true);

    try {
      const res = await fetch('/api/portal/request-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(scheduleForm),
      });

      if (!res.ok) throw new Error('Erro ao solicitar consulta');
      setShowScheduleModal(false);
      setScheduleForm({ preferred_date: '', preferred_time: '', notes: '', is_urgent: false });
    } catch (err: any) {
      setError(err.message || 'Erro ao solicitar consulta');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const computed = useMemo(() => {
    if (!data) return null;

    const now = new Date();
    const appointments = [...data.appointments];
    const upcoming = appointments
      .filter((a) => new Date(a.start_time) > now && !['CANCELLED', 'CANCELED'].includes(a.status?.toUpperCase()))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const history = appointments
      .filter((a) => new Date(a.start_time) <= now || ['CANCELLED', 'CANCELED'].includes(a.status?.toUpperCase()))
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const requests = [...(data.appointment_requests || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const latestPendingRequest = requests.find((r) => ['PENDING', 'ANALYZING', 'EM_ANALISE'].includes(r.status?.toUpperCase()));
    const latestRejectedRequest = requests.find((r) => ['REJECTED', 'DENIED', 'RECUSADA', 'REFUSED'].includes(r.status?.toUpperCase()));

    const lastFinished = history.find((a) => a.status === 'FINISHED');
    const monthsWithoutVisit = lastFinished
      ? Math.floor((now.getTime() - new Date(lastFinished.start_time).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : null;

    const nextAppointment = upcoming[0];
    const nextAppointmentStatus = nextAppointment?.status?.toUpperCase() || '';
    const needsConfirmation =
      !!nextAppointment &&
      ['SCHEDULED', 'CONFIRMATION_PENDING', 'PENDING_CONFIRMATION', 'AWAITING_CONFIRMATION'].includes(nextAppointmentStatus);

    const appointmentDayDiff = nextAppointment
      ? Math.floor(
          (new Date(nextAppointment.start_time).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) /
            (1000 * 60 * 60 * 24),
        )
      : null;

    let homeState: HomeAssistantState = 'sem_pendencias';
    if (needsConfirmation) homeState = 'confirmar_presenca';
    else if (nextAppointment && appointmentDayDiff === 0) homeState = 'consulta_hoje';
    else if (nextAppointment && appointmentDayDiff === 1) homeState = 'consulta_amanha';
    else if (nextAppointment) homeState = 'consulta_futura';
    else if (latestPendingRequest) homeState = 'solicitacao_pendente';
    else if (latestRejectedRequest) homeState = 'solicitacao_recusada';

    const treatmentPlan = data.patient.treatment_plan || [];
    const activeTreatmentItems = treatmentPlan.filter((item) => !['DONE', 'COMPLETED', 'FINISHED', 'CANCELLED'].includes((item.status || '').toUpperCase()));

    return {
      upcoming,
      history,
      requests,
      latestPendingRequest,
      latestRejectedRequest,
      activeTreatmentItems,
      monthsWithoutVisit,
      homeState,
      nextAppointment,
      lastFinished,
    };
  }, [data]);

  const openSupportWhatsApp = () => {
    const digits = (data?.clinic?.phone || '').replace(/\D/g, '');
    if (!digits) return false;
    const text = encodeURIComponent('Olá, preciso de ajuda pelo portal do paciente.');
    window.open(`https://wa.me/${digits}?text=${text}`, '_blank', 'noopener,noreferrer');
    return true;
  };

  const openSupportPhone = () => {
    const rawPhone = data?.clinic?.phone || '';
    if (!rawPhone) return false;
    window.location.href = `tel:${rawPhone}`;
    return true;
  };

  const handleSupport = () => {
    if (openSupportWhatsApp()) return;
    if (openSupportPhone()) return;
    setActiveProfileAction('support');
  };

  const handleRenewAnamnesis = () => {
    if (token) {
      window.location.href = `/pre-atendimento/${token}`;
      return;
    }
    setActiveProfileAction('renew_anamnesis');
  };

  const handleSaveInsurance = async () => {
    try {
      setPortalLoading(true);
      setFeedback(null);
      const response = await portalFetch('/api/portal/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          health_insurance: insuranceForm.health_insurance.trim() || null,
          health_insurance_number: insuranceForm.health_insurance_number.trim() || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erro ao salvar convênio');
      await refreshPortalData();
      setFeedback({ tone: 'success', message: 'Convênio atualizado com sucesso.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', message: err.message || 'Não foi possível salvar o convênio.' });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUploadDocument = async (file?: File) => {
    if (!file || !sessionToken) return;
    try {
      setUploadingDocument(true);
      setFeedback(null);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', `Documento: ${file.name}`);
      formData.append('file_type', file.type.includes('image') ? 'image' : 'document');
      const response = await fetch('/api/portal/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Falha ao enviar documento');
      await refreshPortalData();
      setFeedback({ tone: 'success', message: 'Documento enviado com sucesso.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', message: err.message || 'Não foi possível enviar o documento.' });
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSendSupportMessage = async () => {
    if (!supportMessage.trim()) return;
    try {
      setSupportSending(true);
      setFeedback(null);
      const response = await portalFetch('/api/portal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: supportMessage.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Não foi possível enviar sua mensagem');
      setSupportMessage('');
      setFeedback({ tone: 'success', message: 'Mensagem enviada para a clínica.' });
    } catch (err: any) {
      setFeedback({ tone: 'error', message: err.message || 'Erro ao enviar mensagem.' });
    } finally {
      setSupportSending(false);
    }
  };

  const handleLogout = () => {
    setSessionToken(null);
    setData(null);
    sessionStorage.clear();
    localStorage.removeItem('portal_session_token');
    window.location.replace('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] px-4 py-10">
        <div className="mx-auto max-w-md space-y-4 animate-pulse">
          <div className="h-7 w-44 rounded-xl bg-[#e5e7eb]" />
          <div className="h-28 rounded-3xl bg-white" />
          <div className="h-16 rounded-2xl bg-white" />
          <div className="h-16 rounded-2xl bg-white" />
        </div>
      </div>
    );
  }

  if (error || !data || !computed) {
    return (
      <div className="min-h-screen bg-[#f5f5f7] flex items-center justify-center px-6">
        <div className="max-w-sm rounded-3xl border border-[#f1d4d3] bg-white p-6 text-center shadow-sm">
          <AlertCircle size={28} className="mx-auto text-[#bf3f3f]" />
          <p className="mt-3 text-sm text-[#6b7280]">{error || 'Não foi possível carregar seus dados.'}</p>
        </div>
      </div>
    );
  }

  const firstName = data.patient.name.split(' ')[0];
  const greeting = new Date().getHours() < 12 ? 'Bom dia' : new Date().getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const formatMainDate = (dateISO: string) =>
    new Date(dateISO)
      .toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
      })
      .replace(/^\w/, (letter) => letter.toUpperCase());

  const recentUpdates = [
    computed.upcoming[0]
      ? {
          id: `upcoming-${computed.upcoming[0].id}`,
          text: `Consulta marcada para ${new Date(computed.upcoming[0].start_time).toLocaleDateString('pt-BR')}`,
          tone: 'success' as UpdateTone,
        }
      : null,
    computed.requests[0]
      ? {
          id: `request-${computed.requests[0].id}`,
          text: ['REJECTED', 'DENIED', 'RECUSADA', 'REFUSED'].includes(computed.requests[0].status?.toUpperCase())
            ? `Horário indisponível para a solicitação #${computed.requests[0].id}`
            : ['PENDING', 'ANALYZING', 'EM_ANALISE'].includes(computed.requests[0].status?.toUpperCase())
              ? `Solicitação #${computed.requests[0].id} recebida e em análise`
              : `Solicitação #${computed.requests[0].id} atualizada`,
          tone: ['REJECTED', 'DENIED', 'RECUSADA', 'REFUSED'].includes(computed.requests[0].status?.toUpperCase())
            ? ('danger' as UpdateTone)
            : ['PENDING', 'ANALYZING', 'EM_ANALISE'].includes(computed.requests[0].status?.toUpperCase())
              ? ('warning' as UpdateTone)
              : ('neutral' as UpdateTone),
        }
      : null,
    computed.lastFinished
      ? {
          id: `finished-${computed.lastFinished.id}`,
          text: `Consulta concluída em ${new Date(computed.lastFinished.start_time).toLocaleDateString('pt-BR')}`,
          tone: 'success' as UpdateTone,
        }
      : null,
  ].filter(Boolean).slice(0, 3) as Array<{ id: string; text: string; tone: UpdateTone }>;

  const progressPct = data.patient.treatment_plan?.length
    ? Math.round((((data.patient.treatment_plan.length - computed.activeTreatmentItems.length) / data.patient.treatment_plan.length) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#F6F8F7] text-[#0F172A]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-x-hidden px-5 pb-[calc(140px+env(safe-area-inset-bottom))] pt-6">
        <header>
          <PatientPortalHeader
            greeting={greeting}
            firstName={firstName}
            clinicName={data.clinic?.clinic_name || data.clinic?.name || 'OdontoHub'}
          />
        </header>

        <main className="mt-5 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.section key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-5">
                <PatientMainStatusCard
                  state={computed.homeState}
                  nextAppointment={computed.nextAppointment}
                  pendingRequest={computed.latestPendingRequest}
                  rejectedRequest={computed.latestRejectedRequest}
                  onOpenAppointments={() => setActiveTab('consultas')}
                  onOpenSchedule={() => setShowScheduleModal(true)}
                  onCallClinic={() => (window.location.href = `tel:${data.clinic?.phone || data.patient.phone}`)}
                  formatDate={formatMainDate}
                  appointmentSubmittingId={appointmentSubmittingId}
                  onConfirmAppointment={handleConfirmAppointment}
                />

                <section className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <p className="text-xs uppercase tracking-[0.14em] text-[#98A2B3]">Precisa de ajuda?</p>
                  <button
                    onClick={() => (window.location.href = `tel:${data.clinic?.phone || data.patient.phone}`)}
                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#174F35]"
                  >
                    <Phone size={16} />
                    Falar com a clínica
                  </button>
                </section>
              </motion.section>
            )}

            {activeTab === 'cuidados' && (
              <motion.section key="care" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                {computed.activeTreatmentItems.length > 0 && progressPct > 0 ? (
                  <>
                    <div className="rounded-3xl bg-white p-5 shadow-sm border border-white/70">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">Plano de cuidado</p>
                      <h2 className="mt-2 text-lg font-semibold">Etapa atual em andamento</h2>
                      <p className="mt-2 text-sm text-[#6b7280]">Progresso geral do plano: {progressPct}%</p>
                      <div className="mt-3 h-2 rounded-full bg-[#e5e7eb]">
                        <div className="h-2 rounded-full bg-[#111827]" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                    <MiniList
                      title="Etapas do tratamento"
                      iconType="phase"
                      items={computed.activeTreatmentItems.slice(0, 4).map((item) => {
                        const label = item.procedure || 'Procedimento planejado';
                        return label.replace('Restauracao', 'Restauração').replace('Extracao', 'Extração');
                      })}
                    />
                    <MiniList
                      title="Orientações"
                      iconType="guidance"
                      items={['Siga os horários de medicação orientados.', 'Evite esforços nas primeiras 24h após o procedimento.', 'Se houver dor forte, fale com a clínica.']}
                    />
                    <MiniList
                      title="Alertas e documentos"
                      iconType="alert"
                      items={[data.files[0] ? `${data.files.length} arquivo(s) disponível(is)` : 'Ainda não há arquivos para este tratamento']}
                    />
                  </>
                ) : (
                  <>
                    <section className="rounded-3xl border border-[#E4E7EC] bg-white px-5 py-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#98A2B3]">Cuidados e orientações</p>
                      <p className="mt-2 text-sm text-[#667085]">Veja recomendações importantes para seu tratamento e consultas.</p>
                      <div className="mt-4 grid grid-cols-1 gap-2.5">
                        <button onClick={() => setActiveTab('cuidados')} className="rounded-xl bg-[#F7F8F6] px-3 py-2.5 text-left text-sm font-medium text-[#0F172A]">Ver orientações</button>
                        <button onClick={() => setActiveTab('perfil')} className="rounded-xl bg-[#F7F8F6] px-3 py-2.5 text-left text-sm font-medium text-[#0F172A]">Atualizar anamnese</button>
                        <button onClick={() => (window.location.href = `tel:${data.clinic?.phone || data.patient.phone}`)} className="rounded-xl bg-[#F7F8F6] px-3 py-2.5 text-left text-sm font-medium text-[#0F172A]">Falar com a clínica</button>
                      </div>
                    </section>
                    <MiniList title="Plano de cuidado" iconType="phase" items={['Revisão preventiva semestral', 'Acompanhamento da saúde gengival']} />
                    <MiniList title="Orientações diárias" iconType="guidance" items={['Escovação suave 3x ao dia', 'Uso de fio dental noturno', 'Enxaguante sem álcool quando indicado']} />
                  </>
                )}
              </motion.section>
            )}

            {activeTab === 'consultas' && (
              <motion.section key="appointments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4 pb-6">
                {computed.upcoming.length === 0 ? (
                  <section className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <h3 className="text-base font-semibold text-[#0F172A]">Nenhuma consulta marcada</h3>
                    <p className="mt-1.5 text-sm text-[#667085]">Quando você solicitar um horário, a clínica acompanha tudo por aqui.</p>
                    <button onClick={() => setShowScheduleModal(true)} className="mt-4 rounded-xl bg-[#174F35] px-4 py-2.5 text-sm font-medium text-white">Solicitar consulta</button>
                  </section>
                ) : (
                  <section className="rounded-2xl border border-[#E4E7EC] bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">Próxima consulta</p>
                    <p className="mt-2 text-base font-semibold text-[#0F172A]">
                      {new Date(computed.upcoming[0].start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                    </p>
                    <p className="text-sm text-[#667085]">
                      {new Date(computed.upcoming[0].start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • Dr(a). {computed.upcoming[0].dentist_name}
                    </p>
                    <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusChipClasses(computed.upcoming[0].status)}`}>
                      {getStatusLabel(computed.upcoming[0].status)}
                    </span>
                  </section>
                )}

                {computed.requests.length > 0 && (
                  <ListCard title="Solicitações">
                    {computed.requests.slice(0, 5).map((request) => (
                      <div key={request.id} className="flex items-start justify-between rounded-xl border border-[#ECEFF3] px-3 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{request.reason_category || 'Consulta geral'}</p>
                          <p className="text-xs text-[#667085]">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${getStatusChipClasses(request.status)}`}>{getStatusLabel(request.status)}</span>
                      </div>
                    ))}
                  </ListCard>
                )}

                {computed.upcoming[0] && (
                  <PatientBeforeAppointment
                    appointment={computed.upcoming[0]}
                    onUpdateAnamnesis={() => setActiveTab('perfil')}
                    onViewGuidance={() => setActiveTab('cuidados')}
                    onDirections={() =>
                      window.open(`https://maps.google.com/?q=${encodeURIComponent(data.clinic?.clinic_name || data.clinic?.name || 'clínica odontológica')}`, '_blank')
                    }
                    onConfirmAppointment={handleConfirmAppointment}
                    appointmentSubmittingId={appointmentSubmittingId}
                  />
                )}

                <PatientRecentUpdates updates={recentUpdates} />

                <section className="rounded-2xl border border-[#E4E7EC] bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#98A2B3]">Histórico</h3>
                  {computed.history.length === 0 ? (
                    <p className="mt-3 text-sm text-[#667085]">Sem histórico ainda.</p>
                  ) : (
                    <ul className="mt-3 space-y-3">
                      {computed.history.slice(0, 5).map((appointment) => (
                        <li key={appointment.id} className="flex items-center justify-between gap-3 border-b border-[#F2F4F7] pb-3 last:border-b-0 last:pb-0">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-[#0F172A]">{new Date(appointment.start_time).toLocaleDateString('pt-BR')}</p>
                            <p className="truncate text-xs text-[#667085]">Dr(a). {appointment.dentist_name}</p>
                          </div>
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085]">
                            <span className={`h-2 w-2 rounded-full ${getStatusChipClasses(appointment.status).includes('FEF2F2') ? 'bg-[#DC2626]' : getStatusChipClasses(appointment.status).includes('FFFBEB') ? 'bg-[#F59E0B]' : 'bg-[#16A34A]'}`} />
                            {getStatusLabel(appointment.status)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </motion.section>
            )}

            {activeTab === 'perfil' && (
              <motion.section key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                <section className="rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EAF4EE] text-sm font-semibold text-[#174F35]">
                      {firstName[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{data.patient.name}</p>
                      <p className="text-xs text-[#667085]">Paciente de Dr. Samuel Godoy</p>
                    </div>
                  </div>
                </section>
                <ListButton
                  icon={<UserCircle size={18} />}
                  label="Editar dados pessoais"
                  value={data.patient.email}
                  onClick={() => setActiveProfileAction('edit_profile')}
                />
                <ListButton icon={<FileText size={18} />} label="Renovar anamnese" value="Revisar minhas respostas" badgeTone="warning" onClick={handleRenewAnamnesis} />
                <ListButton
                  icon={<Shield size={18} />}
                  label="Convênio"
                  value={data.patient.health_insurance || 'Convênio não informado'}
                  badgeTone={!data.patient.health_insurance ? 'warning' : 'neutral'}
                  onClick={() => setActiveProfileAction('insurance')}
                />
                <ListButton
                  icon={<FileText size={18} />}
                  label="Documentos"
                  value={`${data.files.length} arquivo(s)`}
                  badgeTone={data.files.length === 0 ? 'warning' : 'neutral'}
                  onClick={() => setActiveProfileAction('documents')}
                />
                <ListButton
                  icon={<Sparkles size={18} />}
                  label="Preferências"
                  value="Ainda não disponível"
                  badgeTone="warning"
                  onClick={() => setActiveProfileAction('preferences')}
                />
                <ListButton icon={<MessageCircle size={18} />} label="Suporte" value="WhatsApp, telefone ou mensagem" onClick={handleSupport} />
                <button onClick={handleLogout} className="mt-2 flex w-full items-center justify-between rounded-2xl border border-[#FEE4E2] bg-[#FFF7F7] px-4 py-3 text-left">
                  <div className="flex items-center gap-3">
                    <LogOut size={18} className="text-[#B42318]" />
                    <div>
                      <p className="text-sm font-medium text-[#B42318]">Sair</p>
                      <p className="text-xs text-[#B42318]/80">Encerrar sessão do portal</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-[#FDA29B]" />
                </button>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      <PatientBottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      <AnimatePresence>
        {showScheduleModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end bg-black/35 p-4">
            <motion.div initial={{ y: 30 }} animate={{ y: 0 }} exit={{ y: 30 }} className="mx-auto w-full max-w-md rounded-3xl bg-white p-5">
              <h3 className="text-lg font-semibold">Agendar consulta</h3>
              <p className="mt-1 text-sm text-[#6b7280]">Escolha data e horário preferenciais.</p>
              <div className="mt-4 space-y-3">
                <input type="date" className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" value={scheduleForm.preferred_date} onChange={(e) => setScheduleForm((s) => ({ ...s, preferred_date: e.target.value }))} />
                <input type="time" className="w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" value={scheduleForm.preferred_time} onChange={(e) => setScheduleForm((s) => ({ ...s, preferred_time: e.target.value }))} />
                <textarea placeholder="Observações (opcional)" className="h-24 w-full rounded-xl border border-[#d1d5db] px-3 py-2 text-sm" value={scheduleForm.notes} onChange={(e) => setScheduleForm((s) => ({ ...s, notes: e.target.value }))} />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setShowScheduleModal(false)} className="flex-1 rounded-xl border border-[#d1d5db] px-3 py-2 text-sm">Cancelar</button>
                <button onClick={handleRequestAppointment} disabled={scheduleSubmitting} className="flex-1 rounded-xl bg-[#111827] px-3 py-2 text-sm text-white">{scheduleSubmitting ? 'Enviando...' : 'Enviar'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeProfileAction && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end bg-black/40 p-4">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} exit={{ y: 20 }} className="mx-auto w-full max-w-md rounded-3xl bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-4">
                <h3 className="text-lg font-semibold text-[#0F172A]">
                  {activeProfileAction === 'edit_profile' && 'Editar dados pessoais'}
                  {activeProfileAction === 'insurance' && 'Convênio'}
                  {activeProfileAction === 'documents' && 'Documentos'}
                  {activeProfileAction === 'preferences' && 'Preferências'}
                  {activeProfileAction === 'support' && 'Suporte'}
                  {activeProfileAction === 'renew_anamnesis' && 'Renovar anamnese'}
                </h3>
                <button className="text-sm text-[#667085]" onClick={() => setActiveProfileAction(null)}>Fechar</button>
              </div>
              {feedback && (
                <p
                  className={`mb-3 rounded-xl px-3 py-2 text-sm ${
                    feedback.tone === 'success'
                      ? 'bg-[#EAF4EE] text-[#166534]'
                      : feedback.tone === 'error'
                        ? 'bg-[#FEF2F2] text-[#B42318]'
                        : 'bg-[#F2F4F7] text-[#475467]'
                  }`}
                >
                  {feedback.message}
                </p>
              )}

              {activeProfileAction === 'edit_profile' && (
                <div className="space-y-3">
                  <div className="space-y-2 rounded-xl border border-[#EAECF0] p-3">
                    <p className="text-sm text-[#475467]"><span className="font-medium text-[#0F172A]">Nome:</span> {data.patient.name}</p>
                    <p className="text-sm text-[#475467]"><span className="font-medium text-[#0F172A]">Telefone:</span> {data.patient.phone || 'Não informado'}</p>
                    <p className="text-sm text-[#475467]"><span className="font-medium text-[#0F172A]">E-mail:</span> {data.patient.email || 'Não informado'}</p>
                    <p className="text-sm text-[#475467]"><span className="font-medium text-[#0F172A]">Nascimento:</span> {data.patient.birth_date ? new Date(data.patient.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                    <p className="text-sm text-[#475467]"><span className="font-medium text-[#0F172A]">Endereço:</span> {data.patient.address || 'Não informado'}</p>
                  </div>
                  <p className="rounded-xl bg-[#F7F8F6] px-3 py-2 text-sm text-[#475467]">
                    Para alterar seus dados, fale com a clínica.
                  </p>
                  <button onClick={handleSupport} className="w-full rounded-xl bg-[#174F35] px-3 py-2.5 text-sm font-semibold text-white">
                    Falar com a clínica
                  </button>
                </div>
              )}

              {activeProfileAction === 'insurance' && (
                <div className="space-y-3">
                  <input value={insuranceForm.health_insurance} onChange={(e) => setInsuranceForm((s) => ({ ...s, health_insurance: e.target.value }))} placeholder="Nome do convênio" className="w-full rounded-xl border border-[#D0D5DD] px-3 py-2 text-sm" />
                  <input value={insuranceForm.health_insurance_number} onChange={(e) => setInsuranceForm((s) => ({ ...s, health_insurance_number: e.target.value }))} placeholder="Número da carteirinha (opcional)" className="w-full rounded-xl border border-[#D0D5DD] px-3 py-2 text-sm" />
                  <button onClick={handleSaveInsurance} disabled={portalLoading} className="w-full rounded-xl bg-[#174F35] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {portalLoading ? 'Salvando...' : 'Salvar alterações'}
                  </button>
                </div>
              )}

              {activeProfileAction === 'documents' && (
                <div className="space-y-3">
                  <div className="max-h-44 space-y-2 overflow-auto rounded-xl border border-[#EAECF0] p-2.5">
                    {data.files.length === 0 ? (
                      <p className="text-sm text-[#667085]">Nenhum documento enviado ainda.</p>
                    ) : (
                      data.files.map((file) => (
                        <a key={file.id} href={file.file_url} target="_blank" rel="noreferrer" className="block rounded-lg bg-[#F7F8F6] px-3 py-2 text-sm text-[#0F172A]">
                          {file.description || 'Documento'} • {new Date(file.created_at).toLocaleDateString('pt-BR')}
                        </a>
                      ))
                    )}
                  </div>
                  <label className="block w-full cursor-pointer rounded-xl border border-dashed border-[#98A2B3] px-3 py-2.5 text-center text-sm text-[#475467]">
                    {uploadingDocument ? 'Enviando documento...' : 'Enviar novo documento'}
                    <input type="file" className="hidden" onChange={(e) => handleUploadDocument(e.target.files?.[0])} disabled={uploadingDocument} />
                  </label>
                </div>
              )}

              {activeProfileAction === 'preferences' && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-[#F7F8F6] px-3 py-2 text-sm text-[#475467]">Preferências ainda não disponíveis.</p>
                  <p className="text-sm text-[#667085]">A clínica usará os canais cadastrados para entrar em contato.</p>
                </div>
              )}

              {activeProfileAction === 'support' && (
                <div className="space-y-3">
                  {data.clinic?.phone ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={openSupportWhatsApp} className="rounded-xl bg-[#174F35] px-3 py-2.5 text-sm font-semibold text-white">WhatsApp</button>
                      <button onClick={openSupportPhone} className="rounded-xl border border-[#D0D5DD] px-3 py-2.5 text-sm font-medium text-[#174F35]">Ligar</button>
                    </div>
                  ) : (
                    <p className="rounded-xl bg-[#F7F8F6] px-3 py-2 text-sm text-[#475467]">Nenhum canal de suporte foi configurado pela clínica.</p>
                  )}
                  <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Escreva sua mensagem para a clínica" className="h-24 w-full rounded-xl border border-[#D0D5DD] px-3 py-2 text-sm" />
                  <button onClick={handleSendSupportMessage} disabled={supportSending || !supportMessage.trim()} className="w-full rounded-xl bg-[#111827] px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
                    {supportSending ? 'Enviando...' : 'Enviar mensagem'}
                  </button>
                </div>
              )}

              {activeProfileAction === 'renew_anamnesis' && (
                <div className="space-y-3">
                  <p className="rounded-xl bg-[#F7F8F6] px-3 py-2 text-sm text-[#475467]">A renovação da anamnese ainda não está disponível por aqui.</p>
                  <p className="text-sm text-[#667085]">Fale com a clínica para atualizar suas informações de saúde.</p>
                  <button onClick={handleSupport} className="w-full rounded-xl bg-[#174F35] px-3 py-2.5 text-sm font-semibold text-white">Falar com a clínica</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PatientPortalHeader({ greeting, firstName, clinicName }: { greeting: string; firstName: string; clinicName: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[15px] font-medium text-[#667085]">{greeting}, {firstName}</p>
      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#0F172A]">Portal do Paciente</h1>
      <p className="text-sm text-[#667085]">{clinicName}</p>
    </div>
  );
}

function PatientMainStatusCard({
  state,
  nextAppointment,
  pendingRequest,
  rejectedRequest,
  onOpenAppointments,
  onOpenSchedule,
  onCallClinic,
  onConfirmAppointment,
  appointmentSubmittingId,
  formatDate,
}: {
  state: HomeAssistantState;
  nextAppointment?: PortalData['appointments'][number];
  pendingRequest?: PortalData['appointment_requests'][number];
  rejectedRequest?: PortalData['appointment_requests'][number];
  onOpenAppointments: () => void;
  onOpenSchedule: () => void;
  onCallClinic: () => void;
  onConfirmAppointment: (appointmentId: number) => void;
  appointmentSubmittingId: number | null;
  formatDate: (dateISO: string) => string;
}) {
  if ((state === 'confirmar_presenca' || state === 'consulta_hoje' || state === 'consulta_amanha' || state === 'consulta_futura') && nextAppointment) {
    const appointmentDate = formatDate(nextAppointment.start_time);
    const appointmentTime = new Date(nextAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dentist = `Com Dr(a). ${nextAppointment.dentist_name}`;

    if (state === 'confirmar_presenca') {
      return (
        <section className="rounded-[32px] border border-[#CDE8D8] bg-white p-5 shadow-[0_16px_30px_rgba(15,42,29,0.08)]">
          <h2 className="text-[28px] font-semibold leading-tight text-[#0F172A]">Confirme sua presença</h2>
          <p className="mt-2 text-sm text-[#667085]">Sua consulta é {appointmentDate.toLowerCase()} às {appointmentTime}.</p>
          <p className="mt-1.5 text-sm font-medium text-[#0F172A]">{dentist}</p>
          <div className="mt-5 space-y-2.5">
            <button
              onClick={() => onConfirmAppointment(nextAppointment.id)}
              className="w-full rounded-2xl bg-[#174F35] px-4 py-3 text-sm font-semibold text-white"
            >
              {appointmentSubmittingId === nextAppointment.id ? 'Confirmando...' : 'Confirmar presença'}
            </button>
            <button onClick={onOpenAppointments} className="w-full rounded-2xl border border-[#D0D5DD] px-4 py-3 text-sm font-medium text-[#174F35]">
              Preciso remarcar
            </button>
          </div>
        </section>
      );
    }

    if (state === 'consulta_hoje' || state === 'consulta_amanha') {
      return (
        <section className="rounded-[32px] border border-[#CDE8D8] bg-white p-5 shadow-[0_16px_30px_rgba(15,42,29,0.08)]">
          <h2 className="text-[28px] font-semibold leading-tight text-[#0F172A]">{state === 'consulta_hoje' ? 'Sua consulta é hoje' : 'Sua consulta é amanhã'}</h2>
          <p className="mt-2 text-sm text-[#667085]">
            {appointmentTime} • Dr(a). {nextAppointment.dentist_name}
          </p>
          <button onClick={onOpenAppointments} className="mt-5 w-full rounded-2xl bg-[#174F35] px-4 py-3 text-sm font-semibold text-white">
            Ver detalhes da consulta
          </button>
          <ul className="mt-5 space-y-2 text-sm text-[#475467]">
            <li className="rounded-xl bg-[#F7F8F6] px-3 py-2">Chegue 10 minutos antes</li>
            <li className="rounded-xl bg-[#F7F8F6] px-3 py-2">Traga um documento</li>
            <li className="rounded-xl bg-[#F7F8F6] px-3 py-2">Fale com a clínica se precisar remarcar</li>
          </ul>
        </section>
      );
    }

    return (
      <section className="rounded-[32px] border border-[#CDE8D8] bg-white p-5 shadow-[0_16px_30px_rgba(15,42,29,0.08)]">
        <h2 className="text-[28px] font-semibold leading-tight text-[#0F172A]">Sua consulta está marcada</h2>
        <p className="mt-2 text-base font-semibold text-[#174F35]">{appointmentDate} às {appointmentTime}</p>
        <p className="mt-1.5 text-sm text-[#667085]">{dentist}</p>
        <div className="mt-5 space-y-2.5">
          <button onClick={onOpenAppointments} className="w-full rounded-2xl bg-[#174F35] px-4 py-3 text-sm font-semibold text-white">
            Ver minha consulta
          </button>
          <button onClick={onOpenAppointments} className="w-full rounded-2xl border border-[#D0D5DD] px-4 py-3 text-sm font-medium text-[#174F35]">
            Preciso remarcar
          </button>
        </div>
        <button onClick={onCallClinic} className="mt-4 text-sm font-medium text-[#174F35]">Falar com a clínica</button>
      </section>
    );
  }

  if (state === 'solicitacao_pendente') {
    return (
      <section className="rounded-[32px] border border-[#FDE68A] bg-[#FFFBEB] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-[#0F172A]">Pedido recebido</h2>
        <p className="mt-2 text-sm text-[#667085]">A clínica está analisando o horário solicitado.</p>
        {pendingRequest?.desired_period && <p className="mt-2 text-sm font-medium text-[#0F172A]">Período solicitado: {pendingRequest.desired_period}</p>}
        <button onClick={onOpenAppointments} className="mt-5 w-full rounded-2xl bg-[#174F35] px-4 py-3 text-sm font-semibold text-white">Ver pedido</button>
        <p className="mt-3 text-xs text-[#667085]">Você receberá uma resposta por aqui.</p>
        <button onClick={onCallClinic} className="mt-3 text-sm font-medium text-[#174F35]">Falar com a clínica</button>
      </section>
    );
  }

  if (state === 'solicitacao_recusada') {
    return (
      <section className="rounded-[32px] border border-[#FEE4E2] bg-[#FFF7F7] p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <h2 className="text-2xl font-semibold text-[#0F172A]">Esse horário não está disponível</h2>
        <p className="mt-2 text-sm text-[#667085]">Escolha outro horário para a clínica avaliar.</p>
        {rejectedRequest?.desired_period && <p className="mt-2 text-sm text-[#667085]">Último período solicitado: {rejectedRequest.desired_period}</p>}
        <button onClick={onOpenSchedule} className="mt-5 w-full rounded-2xl bg-[#174F35] px-4 py-3 text-sm font-semibold text-white">Escolher outro horário</button>
        <button onClick={onCallClinic} className="mt-3 w-full rounded-2xl border border-[#E4E7EC] bg-white px-4 py-3 text-sm font-medium text-[#174F35]">Falar com a clínica</button>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] bg-[#185A3D] p-4 text-white shadow-[0_12px_24px_rgba(15,42,29,0.16)]">
      <h2 className="text-[22px] font-semibold leading-tight tracking-[-0.01em]">Vamos marcar sua consulta?</h2>
      <p className="mt-2 text-sm text-white/85">Escolha um horário e a clínica confirma com você.</p>
      <button onClick={onOpenSchedule} className="mt-4 w-full rounded-xl bg-white px-3.5 py-2.5 text-sm font-semibold text-[#174F35]">Solicitar consulta</button>
      <button onClick={onCallClinic} className="mt-2 w-full rounded-xl border border-white/35 bg-[rgba(255,255,255,0.12)] px-3.5 py-2.5 text-sm font-medium text-white">Falar com a clínica</button>
    </section>
  );
}

function PatientBeforeAppointment({
  appointment,
  onUpdateAnamnesis,
  onViewGuidance,
  onDirections,
  onConfirmAppointment,
  appointmentSubmittingId,
}: {
  appointment: PortalData['appointments'][number];
  onUpdateAnamnesis: () => void;
  onViewGuidance: () => void;
  onDirections: () => void;
  onConfirmAppointment: (appointmentId: number) => void;
  appointmentSubmittingId: number | null;
}) {
  const items = [
    { label: 'Atualizar anamnese', icon: <ClipboardList size={18} className="text-[#174F35]" />, action: onUpdateAnamnesis },
    { label: 'Ver orientações', icon: <Heart size={18} className="text-[#174F35]" />, action: onViewGuidance },
    { label: 'Como chegar', icon: <MapPin size={18} className="text-[#174F35]" />, action: onDirections },
  ];

  const showConfirmAction = !['CONFIRMED', 'FINISHED'].includes(appointment.status.toUpperCase());
  if (showConfirmAction) {
    items.push({
      label: appointmentSubmittingId === appointment.id ? 'Confirmando presença...' : 'Confirmar presença',
      icon: <CheckCircle2 size={18} className="text-[#16A34A]" />,
      action: () => onConfirmAppointment(appointment.id),
    });
  }

  return (
    <section className="rounded-[28px] border border-[#EAECF0] bg-white p-4 shadow-[0_6px_14px_rgba(15,23,42,0.04)]">
      <h3 className="text-sm font-semibold text-[#0F172A]">Antes da consulta</h3>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.label}>
            <button onClick={item.action} className="flex w-full items-center justify-between rounded-2xl bg-[#F7F8F6] px-3 py-3 text-left">
              <span className="flex items-center gap-2.5 text-sm text-[#0F172A]">
                {item.icon}
                {item.label}
              </span>
              <ChevronRight size={16} className="text-[#98A2B3]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function PatientRecentUpdates({ updates }: { updates: Array<{ id: string; text: string; tone: UpdateTone }> }) {
  const toneClasses: Record<UpdateTone, string> = {
    success: 'bg-[#EAF4EE] text-[#166534] border-[#CFE8D8]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border-[#FEE7B0]',
    danger: 'bg-[#FEF2F2] text-[#B42318] border-[#FECACA]',
    neutral: 'bg-[#F2F4F7] text-[#667085] border-[#E4E7EC]',
  };
  return (
    <section className="rounded-[28px] border border-[#EAECF0] bg-white p-4 shadow-[0_6px_14px_rgba(15,23,42,0.04)]">
      <h3 className="text-sm font-semibold text-[#0F172A]">Últimas atualizações</h3>
      <div className="mt-3 space-y-2">
        {updates.length === 0 ? (
          <p className="rounded-2xl bg-[#F7F8F6] px-3 py-2.5 text-sm text-[#667085]">Nenhuma atualização recente.</p>
        ) : (
          updates.map((update) => (
            <p key={update.id} className={`rounded-2xl border border-transparent px-3 py-2.5 text-sm ${toneClasses[update.tone]}`}>
              {update.text}
            </p>
          ))
        )}
      </div>
    </section>
  );
}

function PatientBottomNav({ activeTab, onChangeTab }: { activeTab: PortalTab; onChangeTab: (tab: PortalTab) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-md grid-cols-4 rounded-[26px] border border-[#EAECF0] bg-white/95 p-2 shadow-[0_4px_16px_rgba(15,23,42,0.08)] backdrop-blur">
        <BottomNavItem label="Início" icon={<Home size={20} />} isActive={activeTab === 'home'} onClick={() => onChangeTab('home')} />
        <BottomNavItem label="Consultas" icon={<Calendar size={20} />} isActive={activeTab === 'consultas'} onClick={() => onChangeTab('consultas')} />
        <BottomNavItem label="Cuidados" icon={<Heart size={20} />} isActive={activeTab === 'cuidados'} onClick={() => onChangeTab('cuidados')} />
        <BottomNavItem label="Perfil" icon={<UserCircle size={20} />} isActive={activeTab === 'perfil'} onClick={() => onChangeTab('perfil')} />
      </div>
    </nav>
  );
}

function BottomNavItem({ label, icon, isActive, onClick }: { label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition ${isActive ? 'bg-[#EAF4EE] text-[#174F35]' : 'text-[#98A2B3]'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MiniList({ title, items, iconType = 'guidance' }: { title: string; items: string[]; iconType?: 'phase' | 'guidance' | 'alert' }) {
  const iconByType = {
    phase: <Calendar size={14} className="mt-0.5 text-[#98A2B3]" />,
    guidance: <Heart size={14} className="mt-0.5 text-[#98A2B3]" />,
    alert: <AlertCircle size={14} className="mt-0.5 text-[#98A2B3]" />,
  };
  return (
    <section className="rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.04)]">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">{title}</h3>
      <ul className="mt-2.5 space-y-2.5">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex items-start gap-2 text-sm text-[#374151]">
            {iconByType[iconType]}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E4E7EC] bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function ListButton({
  icon,
  label,
  value,
  badgeTone = 'neutral',
  onClick,
  disabled = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  badgeTone?: 'neutral' | 'warning';
  onClick?: () => void;
  disabled?: boolean;
}) {
  const badgeClass = badgeTone === 'warning' ? 'bg-[#FFFBEB] text-[#B45309]' : 'bg-[#F2F4F7] text-[#667085]';
  const baseClass = disabled
    ? 'cursor-default border-[#EAECF0] bg-[#F8FAFC]'
    : 'border-[#E4E7EC] bg-white shadow-[0_2px_8px_rgba(15,23,42,0.04)]';
  return (
    <button onClick={onClick} disabled={disabled} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left ${baseClass}`}>
      <div className="flex items-center gap-3">
        <div className="text-[#667085]">{icon}</div>
        <div>
          <p className="text-sm font-medium text-[#0F172A]">{label}</p>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${badgeClass}`}>{value}</span>
        </div>
      </div>
      {!disabled && <ChevronRight size={16} className="text-[#98A2B3]" />}
    </button>
  );
}
