import React, { useState, useEffect } from 'react';
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
    treatment_plan?: Array<{ id: string; value?: number; status?: string }>;
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
      const res = await fetch('/api/portal/request-appointment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(scheduleForm)
      });
      if (!res.ok) throw new Error('Erro ao solicitar');
      setScheduleSuccess(true);
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleSuccess(false);
        setScheduleForm({ preferred_date: '', preferred_time: '', notes: '' });
      }, 2000);
    } catch {
      setError('Erro ao solicitar agendamento');
    } finally {
      setScheduleSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="w-10 h-10 border-[3px] border-[#C6C6C8] border-t-[#0C9B72] rounded-full animate-spin" />
        <p className="text-[#8E8E93] text-[15px] font-medium tracking-tight">Carregando...</p>
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

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-24">
      {/* ─── Header: frosted, minimal ─── */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[#E5E5EA]">
        <div className="max-w-lg mx-auto px-5 py-4 flex items-center gap-3.5">
          {clinic?.photo_url ? (
            <img src={clinic.photo_url} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-[#C6C6C8]/40" />
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
            <img src={patient.photo_url} alt="" className="w-8 h-8 rounded-full object-cover ring-1 ring-[#C6C6C8]/40" />
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
                {/* Greeting */}
                <div>
                  <p className="text-[#8E8E93] text-[13px] font-medium tracking-wide uppercase">{getGreeting()}</p>
                  <h1 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mt-1">
                    {patient.name.split(' ')[0]}
                  </h1>
                </div>

                {/* Hero: Next Appointment */}
                {futureAppointments.length > 0 && (
                  <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                    <div className="absolute top-0 right-0 w-28 h-28 bg-[#0C9B72]/[0.04] rounded-full blur-2xl -translate-y-6 translate-x-6" />
                    <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-4">Próxima consulta</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[#1C1C1E] text-[22px] font-bold tracking-tight">
                          {new Date(futureAppointments[0].start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}
                        </p>
                        <p className="text-[#8E8E93] text-[14px] mt-0.5">
                          {formatTimeBR(futureAppointments[0].start_time)} · Dr(a). {futureAppointments[0].dentist_name}
                        </p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full text-[11px] font-semibold ${
                        futureAppointments[0].status === 'CONFIRMED'
                          ? 'bg-[#34C759]/10 text-[#34C759]'
                          : 'bg-[#007AFF]/10 text-[#007AFF]'
                      }`}>
                        {statusLabel(futureAppointments[0].status).label}
                      </span>
                    </div>
                    {futureAppointments[0].notes && (
                      <p className="text-[#AEAEB2] text-[13px] mt-3 leading-relaxed">{futureAppointments[0].notes}</p>
                    )}
                  </div>
                )}

                {/* Quick actions row */}
                <div className="grid grid-cols-4 gap-3">
                  <PortalQuickAction icon={CalendarPlus} label="Agendar" onClick={() => setShowScheduleModal(true)} />
                  <PortalQuickAction icon={Activity} label="Evolução" onClick={() => setActiveTab('evolucao')} />
                  <PortalQuickAction icon={FileText} label="Arquivos" onClick={() => setActiveTab('documentos')} />
                  <PortalQuickAction icon={DollarSign} label="Pagamentos" onClick={() => setActiveTab('financeiro')} />
                </div>

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
                    onClick={() => setShowScheduleModal(true)}
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
                        <PortalAppointmentRow key={a.id} appointment={a} formatDate={formatDateBR} formatTime={formatTimeBR} statusLabel={statusLabel} />
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
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
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
                  <h3 className="text-[18px] font-semibold text-[#1C1C1E] mb-1.5 tracking-tight">Solicitação Enviada</h3>
                  <p className="text-[#8E8E93] text-[14px]">A clínica entrará em contato para confirmar.</p>
                </div>
              ) : (
                <div className="px-5 pb-6 pt-3">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[18px] font-semibold text-[#1C1C1E] tracking-tight">Solicitar Consulta</h3>
                    <button
                      onClick={() => setShowScheduleModal(false)}
                      className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <X size={16} className="text-[#8E8E93]" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Data Preferencial</label>
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
                      <label className="block text-[#8E8E93] text-[13px] font-medium mb-2">Observações</label>
                      <textarea
                        placeholder="Motivo da consulta..."
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
                        'Enviar Solicitação'
                      )}
                    </button>
                  </div>
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

function PortalAppointmentRow({ appointment, formatDate, formatTime, statusLabel, past }: any) {
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
