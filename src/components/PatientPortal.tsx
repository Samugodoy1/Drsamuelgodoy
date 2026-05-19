import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { API_URL } from '../config';
import {
  Activity,
  AlertCircle,
  Calendar,
  CalendarPlus,
  Check,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Home,
  Info,
  Lock,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Shield,
  Stethoscope,
  User,
  WalletCards,
  X,
} from '../icons';
import {
  PortalAction,
  PortalAppointment,
  PortalDataForState,
  buildPatientPortalState,
  formatPortalTime,
} from '../utils/patientPortalState';

interface PortalData extends PortalDataForState {
  patient: PortalDataForState['patient'] & {
    id: number;
    email: string;
    phone: string;
    cpf: string;
    birth_date: string;
    photo_url: string;
    address: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    health_insurance?: string;
    health_insurance_number?: string;
  };
  appointments: Array<PortalAppointment & { dentist_name: string }>;
  files: Array<{
    id: number;
    file_url: string;
    file_type: string;
    description: string;
    created_at: string;
  }>;
  payment_plans: Array<{
    id: number;
    procedure: string;
    total_amount: number;
    installments_count: number;
    status: string;
    installments?: Array<{
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

type Tab = 'inicio' | 'consultas' | 'evolucao' | 'documentos' | 'financeiro';
type MedicalForm = {
  allergies: string;
  medications: string;
  systemic_diseases: string;
  blood_pressure_or_diabetes: string;
  anticoagulant_use: string;
  pregnancy: string;
  important_notes: string;
};

type MessageContext = 'clinic' | 'post-care';

const emptyMedicalForm: MedicalForm = {
  allergies: '',
  medications: '',
  systemic_diseases: '',
  blood_pressure_or_diabetes: '',
  anticoagulant_use: '',
  pregnancy: '',
  important_notes: '',
};

export function PatientPortal() {
  const { token } = useParams<{ token: string }>();
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('inicio');

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ preferred_date: '', preferred_time: '', notes: '' });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<'new' | 'reschedule'>('new');
  const [scheduleTargetAppointment, setScheduleTargetAppointment] = useState<PortalAppointment | null>(null);
  const [appointmentSubmittingId, setAppointmentSubmittingId] = useState<number | null>(null);

  const [showMedicalModal, setShowMedicalModal] = useState(false);
  const [medicalForm, setMedicalForm] = useState<MedicalForm>(emptyMedicalForm);
  const [medicalSubmitting, setMedicalSubmitting] = useState(false);

  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageContext, setMessageContext] = useState<MessageContext>('clinic');
  const [messageBody, setMessageBody] = useState('');
  const [messageSubmitting, setMessageSubmitting] = useState(false);

  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [instructionMode, setInstructionMode] = useState<'pre' | 'post'>('pre');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pixInfo, setPixInfo] = useState<{ has_pix: boolean; pix_key?: string; pix_key_type?: string; beneficiary_name?: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [paymentSubmittingId, setPaymentSubmittingId] = useState<number | null>(null);

  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    authenticateAndLoad();
  }, [token]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    if (!showScheduleModal && !showMedicalModal && !showMessageModal && !showInstructionsModal && !showPaymentModal) return;
    const first = modalRef.current?.querySelector<HTMLElement>('button, input, textarea, select, [tabindex]:not([tabindex="-1"])');
    first?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAnyModal();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showScheduleModal, showMedicalModal, showMessageModal, showInstructionsModal, showPaymentModal]);

  const portalState = useMemo(() => data ? buildPatientPortalState(data) : null, [data]);

  const futureAppointments = useMemo(() => {
    const now = new Date();
    return (data?.appointments || [])
      .filter((appointment) => {
        const status = (appointment.status || '').toUpperCase();
        return new Date(appointment.end_time || appointment.start_time) >= now && !['CANCELLED', 'FINISHED', 'NO_SHOW'].includes(status);
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [data]);

  const pastAppointments = useMemo(() => {
    const now = new Date();
    return (data?.appointments || [])
      .filter((appointment) => new Date(appointment.end_time || appointment.start_time) < now || ['CANCELLED', 'FINISHED', 'NO_SHOW'].includes((appointment.status || '').toUpperCase()))
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  }, [data]);

  const pendingInstallments = useMemo(() => {
    return (data?.installments || []).filter((installment) => {
      const status = (installment.status || '').toUpperCase();
      return status === 'PENDING' || status === 'OVERDUE';
    });
  }, [data]);

  const authenticateAndLoad = async () => {
    setLoading(true);
    setError(null);
    try {
      const authRes = await fetch(`${API_URL}/api/portal/auth/${token}`, { credentials: API_URL ? 'include' : 'same-origin' });
      const authData = await authRes.json();
      if (!authRes.ok) {
        setError(authData.error || 'Link invalido ou expirado');
        return;
      }
      setSessionToken(authData.session_token);

      const portalData = await loadPortalData(authData.session_token);
      setData(portalData);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados do portal');
    } finally {
      setLoading(false);
    }
  };

  const loadPortalData = async (jwt: string) => {
    const dataRes = await fetch(`${API_URL}/api/portal/data`, {
      headers: { Authorization: `Bearer ${jwt}` },
      credentials: API_URL ? 'include' : 'same-origin',
    });
    const payload = await dataRes.json();
    if (!dataRes.ok) throw new Error(payload.error || 'Erro ao carregar dados do portal');
    return payload as PortalData;
  };

  const refreshPortalData = async () => {
    if (!sessionToken) return;
    const fresh = await loadPortalData(sessionToken);
    setData(fresh);
  };

  const handleAction = (action: PortalAction) => {
    switch (action.id) {
      case 'confirmAppointment':
        if (action.appointmentId) handleConfirmAppointment(action.appointmentId);
        break;
      case 'viewInstructions':
        setInstructionMode('pre');
        setShowInstructionsModal(true);
        break;
      case 'viewAppointment':
        setActiveTab('consultas');
        break;
      case 'requestAppointment':
        openNewScheduleModal();
        break;
      case 'openMedicalForm':
        openMedicalFormModal();
        break;
      case 'openMessages':
        openMessageModal('clinic');
        break;
      case 'openPostCare':
        setInstructionMode('post');
        setShowInstructionsModal(true);
        break;
      case 'openDirections':
        openDirections();
        break;
      case 'openPayment':
        openPaymentModal();
        break;
      case 'openHistory':
        setActiveTab('evolucao');
        break;
    }
  };

  const handleConfirmAppointment = async (appointmentId: number) => {
    if (!sessionToken || !data) return;
    setAppointmentSubmittingId(appointmentId);
    const confirmedAt = new Date().toISOString();
    const previous = data;
    setData({
      ...data,
      appointments: data.appointments.map((appointment) =>
        appointment.id === appointmentId
          ? { ...appointment, status: 'CONFIRMED', confirmed_at: confirmedAt }
          : appointment
      ),
    });

    try {
      const res = await fetch(`${API_URL}/api/portal/confirm-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
        body: JSON.stringify({ appointment_id: appointmentId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Erro ao confirmar consulta');
      setNotice('Presenca confirmada.');
      await refreshPortalData();
    } catch (err: any) {
      setData(previous);
      setError(err.message || 'Nao foi possivel confirmar a consulta');
    } finally {
      setAppointmentSubmittingId(null);
    }
  };

  const handleRequestAppointment = async () => {
    if (!sessionToken || !scheduleForm.preferred_date) return;
    setScheduleSubmitting(true);
    setError(null);
    try {
      const isReschedule = scheduleMode === 'reschedule' && scheduleTargetAppointment;
      const res = await fetch(`${API_URL}/api/portal/${isReschedule ? 'reschedule-appointment' : 'request-appointment'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
        body: JSON.stringify(isReschedule ? {
          appointment_id: scheduleTargetAppointment.id,
          preferred_date: scheduleForm.preferred_date,
          preferred_time: scheduleForm.preferred_time,
          reason: scheduleForm.notes,
        } : scheduleForm),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Erro ao solicitar horario');
      setNotice(isReschedule ? 'Pedido de reagendamento enviado.' : 'Solicitacao enviada para a clinica.');
      closeAnyModal();
      await refreshPortalData();
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel solicitar horario');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  const handleSaveMedicalForm = async () => {
    if (!sessionToken || !data) return;
    setMedicalSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/portal/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
        body: JSON.stringify({
          allergies: medicalForm.allergies,
          medications: medicalForm.medications,
          medical_history: medicalForm.systemic_diseases,
          systemic_diseases: medicalForm.systemic_diseases,
          blood_pressure_or_diabetes: medicalForm.blood_pressure_or_diabetes,
          anticoagulant_use: medicalForm.anticoagulant_use,
          pregnancy: medicalForm.pregnancy,
          important_notes: medicalForm.important_notes,
          habits: medicalForm.important_notes,
          vital_signs: medicalForm.blood_pressure_or_diabetes,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Erro ao salvar ficha medica');

      setData({
        ...data,
        anamnesis: {
          ...(data.anamnesis || {}),
          allergies: medicalForm.allergies,
          medications: medicalForm.medications,
          medical_history: medicalForm.systemic_diseases,
          vital_signs: medicalForm.blood_pressure_or_diabetes,
          habits: medicalForm.important_notes,
          family_history: [
            medicalForm.anticoagulant_use ? `Anticoagulante: ${medicalForm.anticoagulant_use}` : null,
            medicalForm.pregnancy ? `Gravidez: ${medicalForm.pregnancy}` : null,
          ].filter(Boolean).join('\n'),
        },
        latest_intake_form: {
          id: data.latest_intake_form?.id || Date.now(),
          status: 'SUBMITTED',
          created_at: new Date().toISOString(),
          form_data: { ...medicalForm },
        },
      });
      setNotice('Ficha medica atualizada.');
      closeAnyModal();
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel salvar a ficha medica');
    } finally {
      setMedicalSubmitting(false);
    }
  };

  const handleSendMessage = async () => {
    if (!sessionToken || !messageBody.trim()) return;
    setMessageSubmitting(true);
    setError(null);
    try {
      const prefix = messageContext === 'post-care' ? 'Duvida pos-atendimento: ' : '';
      const res = await fetch(`${API_URL}/api/portal/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
        body: JSON.stringify({ message: `${prefix}${messageBody.trim()}` }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Erro ao enviar mensagem');
      setNotice('Mensagem enviada para a clinica.');
      setMessageBody('');
      closeAnyModal();
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel enviar a mensagem');
    } finally {
      setMessageSubmitting(false);
    }
  };

  const handleInformPayment = async (installmentId: number, amount: number) => {
    if (!sessionToken) return;
    setPaymentSubmittingId(installmentId);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/portal/inform-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
        body: JSON.stringify({ installment_id: installmentId, amount }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Erro ao informar pagamento');
      setNotice('Pagamento informado. A clinica vai conferir o recebimento.');
    } catch (err: any) {
      setError(err.message || 'Nao foi possivel informar pagamento');
    } finally {
      setPaymentSubmittingId(null);
    }
  };

  const loadPixInfo = async () => {
    if (!sessionToken || pixInfo) return;
    try {
      const res = await fetch(`${API_URL}/api/portal/pix-info`, {
        headers: { Authorization: `Bearer ${sessionToken}` },
        credentials: API_URL ? 'include' : 'same-origin',
      });
      if (res.ok) setPixInfo(await res.json());
    } catch {
      setPixInfo({ has_pix: false });
    }
  };

  const openPaymentModal = () => {
    setShowPaymentModal(true);
    loadPixInfo();
  };

  const openMedicalFormModal = () => {
    setMedicalForm(buildMedicalForm(data));
    setShowMedicalModal(true);
  };

  const openMessageModal = (context: MessageContext) => {
    setMessageContext(context);
    setMessageBody('');
    setShowMessageModal(true);
  };

  const openNewScheduleModal = () => {
    setScheduleMode('new');
    setScheduleTargetAppointment(null);
    setScheduleForm({ preferred_date: '', preferred_time: '', notes: '' });
    setShowScheduleModal(true);
  };

  const openRescheduleModal = (appointment: PortalAppointment) => {
    setScheduleMode('reschedule');
    setScheduleTargetAppointment(appointment);
    setScheduleForm({
      preferred_date: new Date(appointment.start_time).toLocaleDateString('en-CA'),
      preferred_time: '',
      notes: '',
    });
    setShowScheduleModal(true);
  };

  const openDirections = () => {
    if (!data?.clinic?.clinic_address) return;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(data.clinic.clinic_address)}`, '_blank', 'noopener,noreferrer');
  };

  const copyPix = async () => {
    if (!pixInfo?.pix_key) return;
    await navigator.clipboard.writeText(pixInfo.pix_key);
    setPixCopied(true);
    window.setTimeout(() => setPixCopied(false), 2200);
  };

  const closeAnyModal = () => {
    if (scheduleSubmitting || medicalSubmitting || messageSubmitting || paymentSubmittingId) return;
    setShowScheduleModal(false);
    setShowMedicalModal(false);
    setShowMessageModal(false);
    setShowInstructionsModal(false);
    setShowPaymentModal(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-6">
        <div className="flex flex-col items-center gap-5">
          <div className="h-10 w-10 rounded-full border-[3px] border-[#D6DADF] border-t-[#216153] animate-spin" />
          <p role="status" className="text-[15px] font-medium text-[#667085]">Carregando portal...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-[#F6F7F8] flex items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
            <AlertCircle size={28} className="text-red-500" />
          </div>
          <h2 className="text-[22px] font-bold tracking-tight text-[#111827]">Acesso indisponivel</h2>
          <p className="mt-2 text-[15px] leading-6 text-[#667085]">{error}</p>
        </div>
      </div>
    );
  }

  if (!data || !portalState) return null;

  const clinicName = data.clinic?.clinic_name || data.clinic?.name || 'OdontoHub';

  return (
    <div className="min-h-screen bg-[#F6F7F8] pb-28 text-[#111827]">
      <div className="mx-auto w-full max-w-3xl px-4 pt-5 sm:px-6 sm:pt-8">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#216153] text-[15px] font-black text-white shadow-sm">
              OH
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#216153]">Portal do paciente</p>
              <p className="mt-0.5 max-w-[220px] truncate text-[13px] font-semibold text-[#667085]">{clinicName}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-[12px] font-semibold text-[#667085] shadow-sm ring-1 ring-black/5">
            <Lock size={14} className="text-[#216153]" />
            Seguro
          </div>
        </header>

        <div id="portal-announcer" aria-live="polite" className="sr-only">
          {notice || error || ''}
        </div>

        <AnimatePresence>
          {(notice || error) && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className={`mb-4 rounded-2xl px-4 py-3 text-[14px] font-semibold shadow-sm ${error ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'}`}
            >
              {error || notice}
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'inicio' && (
          <main className="space-y-5">
            <section className="overflow-hidden rounded-[28px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/[0.04]">
              <div className="px-5 pb-5 pt-6 sm:px-7 sm:pt-8">
                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-[34px] font-bold leading-[1.05] tracking-tight text-[#0F172A] sm:text-[42px]">
                      {portalState.headline}
                    </h1>
                    <p className="mt-3 max-w-xl text-[17px] font-semibold leading-7 text-[#216153]">
                      {portalState.subheadline}
                    </p>
                  </div>
                  {portalState.appointmentContext.isConfirmed && (
                    <div className="hidden rounded-full bg-emerald-50 px-3 py-2 text-[12px] font-black uppercase tracking-wide text-emerald-700 sm:block">
                      Presenca confirmada
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleAction(portalState.primaryAction)}
                  disabled={portalState.primaryAction.id === 'confirmAppointment' && appointmentSubmittingId === portalState.primaryAction.appointmentId}
                  className="flex h-14 w-full items-center justify-center gap-2.5 rounded-[18px] bg-[#216153] px-5 text-[16px] font-bold text-white shadow-[0_14px_34px_rgba(33,97,83,0.26)] transition active:scale-[0.99] disabled:opacity-70 sm:h-16 sm:text-[17px]"
                >
                  {portalState.primaryAction.id === 'confirmAppointment' && appointmentSubmittingId === portalState.primaryAction.appointmentId ? (
                    <span className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <CheckCircle2 size={22} />
                  )}
                  {portalState.primaryAction.label}
                </button>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {portalState.secondaryActions.map((action) => (
                    <ContextActionButton key={`${action.id}-${action.label}`} action={action} onClick={() => handleAction(action)} />
                  ))}
                </div>
              </div>

              <div className="border-t border-[#EEF0F3] bg-[#FBFCFD] px-5 py-4 sm:px-7">
                <div className="flex gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F2ECFF] text-[#7C3AED]">
                    <Info size={18} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#7C3AED]">Dica de hoje</p>
                    <p className="mt-1 text-[14px] font-medium leading-6 text-[#667085]">{portalState.tip}</p>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              <StatusChip icon={Calendar} label="Consultas" value={String(data.appointments.length)} />
              <StatusChip icon={ClipboardList} label="Ficha" value={portalState.patientFlags.medicalFormPending ? 'Pendente' : 'Atualizada'} />
              <StatusChip icon={WalletCards} label="Pagamentos" value={portalState.patientFlags.hasPendingPayment ? currency(portalState.patientFlags.pendingPaymentAmount) : 'Em dia'} />
            </section>

            {portalState.appointmentContext.nextAppointment && (
              <AppointmentSummary
                appointment={portalState.appointmentContext.nextAppointment}
                procedureText={portalState.appointmentContext.procedureText}
                isConfirmed={portalState.appointmentContext.isConfirmed}
                onReschedule={() => openRescheduleModal(portalState.appointmentContext.nextAppointment!)}
              />
            )}
          </main>
        )}

        {activeTab === 'consultas' && (
          <ListPanel title="Consultas" emptyText="Nenhuma consulta encontrada." icon={Calendar}>
            {futureAppointments.map((appointment) => (
              <AppointmentRow
                key={appointment.id}
                appointment={appointment}
                onConfirm={() => handleConfirmAppointment(appointment.id)}
                onReschedule={() => openRescheduleModal(appointment)}
                confirming={appointmentSubmittingId === appointment.id}
              />
            ))}
            {pastAppointments.map((appointment) => (
              <AppointmentRow key={appointment.id} appointment={appointment} past />
            ))}
          </ListPanel>
        )}

        {activeTab === 'evolucao' && (
          <ListPanel title="Historico clinico" emptyText="Ainda nao ha evolucoes registradas." icon={Activity}>
            {(data.evolution || []).map((entry) => (
              <div key={entry.id || `${entry.date}-${entry.procedure_performed}`} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                <p className="text-[13px] font-semibold text-[#667085]">{formatDate(entry.date)}</p>
                <p className="mt-1 text-[16px] font-bold text-[#111827]">{entry.procedure_performed || 'Atendimento'}</p>
                {entry.notes && <p className="mt-2 text-[14px] leading-6 text-[#667085]">{entry.notes}</p>}
              </div>
            ))}
          </ListPanel>
        )}

        {activeTab === 'documentos' && (
          <ListPanel title="Documentos" emptyText="Nenhum documento disponivel." icon={FileText}>
            {(data.files || []).map((file) => (
              <a
                key={file.id}
                href={file.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-[#216153]">
                  <Download size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-[#111827]">{file.description || 'Documento'}</p>
                  <p className="mt-0.5 text-[12px] font-medium text-[#667085]">{formatDate(file.created_at)}</p>
                </div>
              </a>
            ))}
          </ListPanel>
        )}

        {activeTab === 'financeiro' && (
          <ListPanel title="Financeiro" emptyText="Nenhum pagamento em aberto." icon={DollarSign}>
            {pendingInstallments.map((installment) => (
              <PaymentCard
                key={installment.id}
                installment={installment}
                onOpenPayment={openPaymentModal}
              />
            ))}
            {(data.payment_plans || []).length > 0 && (
              <div className="pt-2">
                <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#98A2B3]">Planos</p>
                {data.payment_plans.map((plan) => (
                  <div key={plan.id} className="mb-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
                    <p className="text-[15px] font-bold text-[#111827]">{plan.procedure}</p>
                    <p className="mt-1 text-[13px] font-semibold text-[#667085]">{currency(Number(plan.total_amount))} - {plan.status}</p>
                  </div>
                ))}
              </div>
            )}
          </ListPanel>
        )}
      </div>

      <BottomTabs activeTab={activeTab} onChange={setActiveTab} />

      <AnimatePresence>
        {showScheduleModal && (
          <PortalModal title={scheduleMode === 'reschedule' ? 'Solicitar reagendamento' : 'Solicitar novo horario'} onClose={closeAnyModal} modalRef={modalRef}>
            <div className="space-y-4">
              <Input label="Data preferencial" type="date" value={scheduleForm.preferred_date} onChange={(value) => setScheduleForm({ ...scheduleForm, preferred_date: value })} />
              <Select label="Melhor periodo" value={scheduleForm.preferred_time} onChange={(value) => setScheduleForm({ ...scheduleForm, preferred_time: value })} options={[
                ['', 'Sem preferencia'],
                ['manha', 'Manha'],
                ['tarde', 'Tarde'],
                ['noite', 'Noite'],
              ]} />
              <TextArea label="Observacoes para a clinica" value={scheduleForm.notes} onChange={(value) => setScheduleForm({ ...scheduleForm, notes: value })} placeholder="Conte o motivo ou uma preferencia de horario." />
              <button
                onClick={handleRequestAppointment}
                disabled={!scheduleForm.preferred_date || scheduleSubmitting}
                className="h-12 w-full rounded-2xl bg-[#216153] text-[15px] font-bold text-white disabled:opacity-50"
              >
                {scheduleSubmitting ? 'Enviando...' : 'Enviar solicitacao'}
              </button>
            </div>
          </PortalModal>
        )}

        {showMedicalModal && (
          <PortalModal title="Atualizar ficha medica" onClose={closeAnyModal} modalRef={modalRef}>
            <div className="space-y-4">
              <TextArea label="Alergias" value={medicalForm.allergies} onChange={(value) => setMedicalForm({ ...medicalForm, allergies: value })} placeholder="Ex: dipirona, latex, penicilina..." />
              <TextArea label="Medicamentos em uso" value={medicalForm.medications} onChange={(value) => setMedicalForm({ ...medicalForm, medications: value })} placeholder="Liste medicamentos e doses, se souber." />
              <TextArea label="Doencas sistemicas" value={medicalForm.systemic_diseases} onChange={(value) => setMedicalForm({ ...medicalForm, systemic_diseases: value })} placeholder="Ex: hipertensao, diabetes, cardiopatias..." />
              <Input label="Pressao/diabetes" value={medicalForm.blood_pressure_or_diabetes} onChange={(value) => setMedicalForm({ ...medicalForm, blood_pressure_or_diabetes: value })} placeholder="Ex: pressao controlada, diabetes tipo 2..." />
              <Input label="Uso de anticoagulante" value={medicalForm.anticoagulant_use} onChange={(value) => setMedicalForm({ ...medicalForm, anticoagulant_use: value })} placeholder="Ex: nao uso, AAS, rivaroxabana..." />
              <Input label="Gravidez, se aplicavel" value={medicalForm.pregnancy} onChange={(value) => setMedicalForm({ ...medicalForm, pregnancy: value })} placeholder="Ex: nao, 20 semanas..." />
              <TextArea label="Observacoes importantes" value={medicalForm.important_notes} onChange={(value) => setMedicalForm({ ...medicalForm, important_notes: value })} placeholder="Qualquer informacao que a clinica deve saber." />
              <button
                onClick={handleSaveMedicalForm}
                disabled={medicalSubmitting}
                className="h-12 w-full rounded-2xl bg-[#216153] text-[15px] font-bold text-white disabled:opacity-50"
              >
                {medicalSubmitting ? 'Salvando...' : 'Salvar ficha'}
              </button>
            </div>
          </PortalModal>
        )}

        {showMessageModal && (
          <PortalModal title={messageContext === 'post-care' ? 'Duvida pos-atendimento' : 'Falar com a clinica'} onClose={closeAnyModal} modalRef={modalRef}>
            <div className="space-y-4">
              <TextArea
                label="Mensagem"
                value={messageBody}
                onChange={setMessageBody}
                placeholder={messageContext === 'post-care' ? 'Conte sua duvida, sintoma ou desconforto.' : 'Escreva sua mensagem para a equipe.'}
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageBody.trim() || messageSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#216153] text-[15px] font-bold text-white disabled:opacity-50"
              >
                <Send size={18} />
                {messageSubmitting ? 'Enviando...' : 'Enviar mensagem'}
              </button>
            </div>
          </PortalModal>
        )}

        {showInstructionsModal && (
          <PortalModal title={portalState.appointmentContext.procedureGuide.title} onClose={closeAnyModal} modalRef={modalRef}>
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#F6F7F8] p-4">
                <p className="text-[12px] font-black uppercase tracking-wide text-[#98A2B3]">Procedimento</p>
                <p className="mt-1 text-[16px] font-bold text-[#111827]">{portalState.appointmentContext.procedureText}</p>
              </div>

              {(instructionMode === 'pre' || portalState.patientFlags.hasPreCare) && (
                <GuideSection title={portalState.appointmentContext.procedureGuide.isSurgical ? 'Antes da cirurgia' : 'Antes da consulta'} items={portalState.appointmentContext.procedureGuide.pre} />
              )}
              {(instructionMode === 'post' || portalState.patientFlags.hasPostCare) && (
                <GuideSection title="Depois do atendimento" items={portalState.appointmentContext.procedureGuide.post} />
              )}
              <button
                onClick={() => openMessageModal(portalState.patientFlags.hasPostCare ? 'post-care' : 'clinic')}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E4E7EC] bg-white text-[15px] font-bold text-[#216153]"
              >
                <MessageCircle size={18} />
                Falar com a clinica
              </button>
            </div>
          </PortalModal>
        )}

        {showPaymentModal && (
          <PortalModal title="Pagamento" onClose={closeAnyModal} modalRef={modalRef}>
            <div className="space-y-4">
              {pendingInstallments.length === 0 ? (
                <p className="rounded-2xl bg-emerald-50 p-4 text-[14px] font-semibold text-emerald-700">Nao ha pagamento pendente no momento.</p>
              ) : (
                pendingInstallments.map((installment) => (
                  <div key={installment.id} className="rounded-2xl border border-[#E4E7EC] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[15px] font-bold text-[#111827]">{installment.procedure || 'Parcela'}</p>
                        <p className="mt-1 text-[13px] font-semibold text-[#667085]">Vencimento {formatDate(installment.due_date)}</p>
                      </div>
                      <p className="text-[17px] font-black text-[#111827]">{currency(Number(installment.amount))}</p>
                    </div>
                    <button
                      onClick={() => handleInformPayment(installment.id, Number(installment.amount))}
                      disabled={paymentSubmittingId === installment.id}
                      className="mt-4 h-11 w-full rounded-2xl bg-[#216153] text-[14px] font-bold text-white disabled:opacity-50"
                    >
                      {paymentSubmittingId === installment.id ? 'Informando...' : 'Informar pagamento'}
                    </button>
                  </div>
                ))
              )}

              {pixInfo?.has_pix && (
                <div className="rounded-2xl bg-[#F6F7F8] p-4">
                  <p className="text-[12px] font-black uppercase tracking-wide text-[#98A2B3]">PIX da clinica</p>
                  <p className="mt-2 break-all text-[15px] font-bold text-[#111827]">{pixInfo.pix_key}</p>
                  <p className="mt-1 text-[13px] text-[#667085]">{pixInfo.pix_key_type} - {pixInfo.beneficiary_name}</p>
                  <button onClick={copyPix} className="mt-3 h-10 rounded-xl bg-white px-4 text-[13px] font-bold text-[#216153] shadow-sm">
                    {pixCopied ? 'Chave copiada' : 'Copiar chave PIX'}
                  </button>
                </div>
              )}
            </div>
          </PortalModal>
        )}
      </AnimatePresence>
    </div>
  );
}

function ContextActionButton({ action, onClick }: { action: PortalAction; onClick: () => void }) {
  const Icon = action.id === 'openPayment' ? CreditCard
    : action.id === 'openMedicalForm' ? User
    : action.id === 'openDirections' ? MapPin
    : action.id === 'openPostCare' || action.id === 'openMessages' ? MessageCircle
    : action.id === 'viewInstructions' ? ClipboardList
    : action.id === 'openHistory' ? Activity
    : Calendar;

  const toneClass = action.tone === 'warning'
    ? 'bg-amber-50 text-amber-800 ring-amber-100'
    : action.tone === 'success'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-100'
      : 'bg-white text-[#111827] ring-black/[0.06]';

  return (
    <button
      onClick={onClick}
      className={`flex min-h-[64px] items-center gap-3 rounded-[18px] px-4 text-left text-[15px] font-bold shadow-sm ring-1 transition active:scale-[0.99] ${toneClass}`}
    >
      <Icon size={21} className="shrink-0" />
      <span className="min-w-0 flex-1 leading-snug">{action.label}</span>
    </button>
  );
}

function StatusChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-center gap-2 text-[#216153]">
        <Icon size={18} />
        <p className="text-[12px] font-black uppercase tracking-wide">{label}</p>
      </div>
      <p className="mt-2 text-[18px] font-bold text-[#111827]">{value}</p>
    </div>
  );
}

function AppointmentSummary({ appointment, procedureText, isConfirmed, onReschedule }: {
  appointment: PortalAppointment;
  procedureText: string;
  isConfirmed: boolean;
  onReschedule: () => void;
}) {
  return (
    <section className="rounded-[24px] bg-white p-5 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-black uppercase tracking-wide text-[#98A2B3]">Proxima consulta</p>
          <p className="mt-1 text-[20px] font-bold text-[#111827]">{formatDate(appointment.start_time)} as {formatPortalTime(appointment.start_time)}</p>
          <p className="mt-1 text-[14px] font-medium text-[#667085]">{procedureText}</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[12px] font-bold ${isConfirmed ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>
          {isConfirmed ? 'Confirmada' : 'A confirmar'}
        </span>
      </div>
      <button onClick={onReschedule} className="mt-4 text-[14px] font-bold text-[#216153]">
        Solicitar reagendamento
      </button>
    </section>
  );
}

function AppointmentRow({ appointment, past, onConfirm, onReschedule, confirming }: {
  appointment: PortalAppointment;
  past?: boolean;
  onConfirm?: () => void;
  onReschedule?: () => void;
  confirming?: boolean;
}) {
  const status = (appointment.status || '').toUpperCase();
  return (
    <div className={`rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04] ${past ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-bold text-[#111827]">{formatDate(appointment.start_time)} as {formatPortalTime(appointment.start_time)}</p>
          <p className="mt-1 text-[13px] font-semibold text-[#667085]">Dr(a). {appointment.dentist_name || 'Clinica'}</p>
          {appointment.notes && <p className="mt-2 text-[14px] leading-6 text-[#667085]">{appointment.notes}</p>}
        </div>
        <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase ${status === 'CONFIRMED' ? 'bg-emerald-50 text-emerald-700' : status === 'SCHEDULED' ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
          {status === 'CONFIRMED' ? 'Confirmada' : status === 'SCHEDULED' ? 'Agendada' : status}
        </span>
      </div>
      {!past && (
        <div className="mt-4 flex flex-wrap gap-2">
          {status === 'SCHEDULED' && onConfirm && (
            <button onClick={onConfirm} disabled={confirming} className="rounded-full bg-[#216153] px-4 py-2 text-[13px] font-bold text-white disabled:opacity-50">
              {confirming ? 'Confirmando...' : 'Confirmar ida'}
            </button>
          )}
          {onReschedule && (
            <button onClick={onReschedule} className="rounded-full bg-slate-100 px-4 py-2 text-[13px] font-bold text-[#475467]">
              Reagendar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function PaymentCard({ installment, onOpenPayment }: { installment: PortalData['installments'][number]; onOpenPayment: () => void }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-bold text-[#111827]">{installment.procedure || 'Pagamento pendente'}</p>
          <p className="mt-1 text-[13px] font-semibold text-[#667085]">Vencimento {formatDate(installment.due_date)}</p>
        </div>
        <p className="text-[17px] font-black text-[#111827]">{currency(Number(installment.amount))}</p>
      </div>
      <button onClick={onOpenPayment} className="mt-4 rounded-full bg-[#216153] px-4 py-2 text-[13px] font-bold text-white">
        Ver pagamento
      </button>
    </div>
  );
}

function ListPanel({ title, emptyText, icon: Icon, children }: {
  title: string;
  emptyText: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <section className="space-y-3">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#216153] shadow-sm ring-1 ring-black/[0.04]">
          <Icon size={20} />
        </div>
        <h1 className="text-[26px] font-bold tracking-tight text-[#111827]">{title}</h1>
      </div>
      {items.length > 0 ? items : (
        <div className="rounded-[24px] bg-white p-10 text-center shadow-sm ring-1 ring-black/[0.04]">
          <p className="text-[15px] font-semibold text-[#98A2B3]">{emptyText}</p>
        </div>
      )}
    </section>
  );
}

function BottomTabs({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  const tabs: Array<{ id: Tab; label: string; icon: React.ElementType }> = [
    { id: 'inicio', label: 'Inicio', icon: Home },
    { id: 'consultas', label: 'Consultas', icon: Calendar },
    { id: 'evolucao', label: 'Historico', icon: Activity },
    { id: 'documentos', label: 'Docs', icon: FileText },
    { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 px-3">
      <div className="mx-auto grid max-w-3xl grid-cols-5 rounded-[24px] border border-white/70 bg-white/95 p-1.5 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur-2xl">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[18px] text-[11px] font-bold transition ${activeTab === id ? 'bg-[#216153] text-white' : 'text-[#667085]'}`}
          >
            <Icon size={20} />
            <span className="truncate">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function PortalModal({ title, children, onClose, modalRef }: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  modalRef: React.MutableRefObject<HTMLDivElement | null>;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-0 backdrop-blur-md sm:items-center sm:px-4"
      onClick={onClose}
    >
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[30px] sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-[20px] font-bold tracking-tight text-[#111827]">{title}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-[#667085]">
            <X size={18} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

function GuideSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-black uppercase tracking-wide text-[#98A2B3]">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-2xl bg-[#F6F7F8] p-3">
            <Check size={17} className="mt-0.5 shrink-0 text-[#216153]" />
            <p className="text-[14px] font-medium leading-6 text-[#475467]">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, type = 'text', placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-[#344054]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-[15px] font-medium outline-none transition focus:border-[#216153] focus:ring-4 focus:ring-[#216153]/10"
      />
    </label>
  );
}

function Select({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-[#344054]">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 text-[15px] font-medium outline-none transition focus:border-[#216153] focus:ring-4 focus:ring-[#216153]/10"
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>{optionLabel}</option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-bold text-[#344054]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-2xl border border-[#D0D5DD] bg-white px-4 py-3 text-[15px] font-medium leading-6 outline-none transition focus:border-[#216153] focus:ring-4 focus:ring-[#216153]/10"
      />
    </label>
  );
}

function buildMedicalForm(data: PortalData | null): MedicalForm {
  if (!data) return emptyMedicalForm;
  const formData = data.latest_intake_form?.form_data || {};
  return {
    allergies: String(formData.allergies ?? data.anamnesis?.allergies ?? ''),
    medications: String(formData.medications ?? data.anamnesis?.medications ?? ''),
    systemic_diseases: String(formData.systemic_diseases ?? formData.medical_history ?? data.anamnesis?.medical_history ?? ''),
    blood_pressure_or_diabetes: String(formData.blood_pressure_or_diabetes ?? data.anamnesis?.vital_signs ?? ''),
    anticoagulant_use: String(formData.anticoagulant_use ?? ''),
    pregnancy: String(formData.pregnancy ?? ''),
    important_notes: String(formData.important_notes ?? data.anamnesis?.habits ?? ''),
  };
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function currency(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
