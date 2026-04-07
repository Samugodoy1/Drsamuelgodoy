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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/30 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Carregando seu portal...</p>
      </div>
    </div>
  );

  if (error && !data) return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle size={32} className="text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Indisponível</h2>
        <p className="text-slate-500">{error}</p>
      </div>
    </div>
  );

  if (!data) return null;

  const { patient, clinic, appointments, evolution, files, payment_plans } = data;

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
      'SCHEDULED': { label: 'Agendado', color: 'bg-blue-100 text-blue-700' },
      'CONFIRMED': { label: 'Confirmado', color: 'bg-emerald-100 text-emerald-700' },
      'IN_PROGRESS': { label: 'Em Atendimento', color: 'bg-amber-100 text-amber-700' },
      'FINISHED': { label: 'Finalizado', color: 'bg-slate-100 text-slate-600' },
      'CANCELLED': { label: 'Cancelado', color: 'bg-red-100 text-red-600' },
      'NO_SHOW': { label: 'Faltou', color: 'bg-rose-100 text-rose-600' }
    };
    return map[s] || { label: s, color: 'bg-slate-100 text-slate-600' };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50/20 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4 mb-4">
            {clinic?.photo_url ? (
              <img src={clinic.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                <Stethoscope size={24} />
              </div>
            )}
            <div className="flex-1">
              <h1 className="font-bold text-lg">{clinic?.clinic_name || clinic?.name || 'Minha Clínica'}</h1>
              <p className="text-emerald-100 text-sm">{clinic?.specialty || 'Odontologia'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {patient.photo_url ? (
              <img src={patient.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-white/30" />
            ) : (
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                {patient.name.charAt(0)}
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">Olá, {patient.name.split(' ')[0]}!</p>
              <p className="text-emerald-200 text-xs">Bem-vindo ao seu portal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            {/* ─── HOME TAB ─── */}
            {activeTab === 'inicio' && (
              <div className="space-y-4">
                {/* Next appointment card */}
                {futureAppointments.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Próxima Consulta</h3>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <Calendar size={20} className="text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{formatDateBR(futureAppointments[0].start_time)}</p>
                        <p className="text-sm text-slate-500">
                          {formatTimeBR(futureAppointments[0].start_time)} — Dr(a). {futureAppointments[0].dentist_name}
                        </p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${statusLabel(futureAppointments[0].status).color}`}>
                        {statusLabel(futureAppointments[0].status).label}
                      </span>
                    </div>
                    {futureAppointments[0].notes && (
                      <p className="text-xs text-slate-400 mt-2 pl-15">{futureAppointments[0].notes}</p>
                    )}
                  </div>
                )}

                {/* Quick actions */}
                <div className="grid grid-cols-2 gap-3">
                  <QuickAction
                    icon={CalendarPlus}
                    label="Solicitar Consulta"
                    color="emerald"
                    onClick={() => setShowScheduleModal(true)}
                  />
                  <QuickAction
                    icon={ClipboardList}
                    label="Minha Evolução"
                    color="blue"
                    onClick={() => setActiveTab('evolucao')}
                  />
                  <QuickAction
                    icon={FileText}
                    label="Documentos"
                    color="purple"
                    onClick={() => setActiveTab('documentos')}
                  />
                  <QuickAction
                    icon={DollarSign}
                    label="Financeiro"
                    color="amber"
                    onClick={() => setActiveTab('financeiro')}
                  />
                </div>

                {/* Summary stats */}
                <div className="grid grid-cols-3 gap-3">
                  <StatCard label="Consultas" value={appointments.length.toString()} icon={Calendar} />
                  <StatCard label="Documentos" value={files.length.toString()} icon={FileText} />
                  <StatCard label="Planos" value={payment_plans.length.toString()} icon={DollarSign} />
                </div>

                {/* Health info card */}
                {data.anamnesis && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Heart size={16} className="text-rose-500" />
                      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resumo de Saúde</h3>
                    </div>
                    {data.anamnesis.allergies && (
                      <div className="mb-2">
                        <span className="text-xs font-semibold text-slate-600">Alergias: </span>
                        <span className="text-xs text-slate-500">{data.anamnesis.allergies}</span>
                      </div>
                    )}
                    {data.anamnesis.medications && (
                      <div>
                        <span className="text-xs font-semibold text-slate-600">Medicamentos: </span>
                        <span className="text-xs text-slate-500">{data.anamnesis.medications}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Clinic contact */}
                {clinic && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Contato da Clínica</h3>
                    <p className="text-sm font-semibold text-slate-800">{clinic.clinic_name || clinic.name}</p>
                    {clinic.clinic_address && <p className="text-xs text-slate-500 mt-1">{clinic.clinic_address}</p>}
                    {clinic.phone && (
                      <a href={`tel:${clinic.phone}`} className="inline-flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-2">
                        <Phone size={12} /> {clinic.phone}
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── APPOINTMENTS TAB ─── */}
            {activeTab === 'consultas' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800">Minhas Consultas</h2>
                  <button
                    onClick={() => setShowScheduleModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors"
                  >
                    <CalendarPlus size={14} /> Solicitar
                  </button>
                </div>

                {futureAppointments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Próximas</h3>
                    {futureAppointments.map(a => (
                      <AppointmentCard key={a.id} appointment={a} formatDate={formatDateBR} formatTime={formatTimeBR} statusLabel={statusLabel} />
                    ))}
                  </div>
                )}

                {pastAppointments.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Anteriores</h3>
                    {pastAppointments.slice(0, 20).map(a => (
                      <AppointmentCard key={a.id} appointment={a} formatDate={formatDateBR} formatTime={formatTimeBR} statusLabel={statusLabel} />
                    ))}
                  </div>
                )}

                {appointments.length === 0 && (
                  <EmptyState icon={Calendar} text="Nenhuma consulta registrada ainda" />
                )}
              </div>
            )}

            {/* ─── EVOLUTION TAB ─── */}
            {activeTab === 'evolucao' && (
              <div className="space-y-4">
                <h2 className="font-bold text-slate-800">Evolução Clínica</h2>
                {evolution.length > 0 ? evolution.map(e => (
                  <div key={e.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-400">{formatDateBR(e.date)}</span>
                      <span className="text-xs text-slate-400">Dr(a). {e.dentist_name}</span>
                    </div>
                    {e.procedure_performed && (
                      <p className="text-sm font-semibold text-emerald-700 mb-1">{e.procedure_performed}</p>
                    )}
                    {e.notes && (
                      <p className="text-sm text-slate-600">{e.notes}</p>
                    )}
                  </div>
                )) : (
                  <EmptyState icon={Activity} text="Nenhuma evolução clínica registrada" />
                )}
              </div>
            )}

            {/* ─── DOCUMENTS TAB ─── */}
            {activeTab === 'documentos' && (
              <div className="space-y-4">
                <h2 className="font-bold text-slate-800">Meus Documentos</h2>
                {files.length > 0 ? files.map(f => (
                  <a
                    key={f.id}
                    href={f.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      {f.file_type?.includes('image') ? (
                        <img src={f.file_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <FileText size={18} className="text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{f.description || 'Documento'}</p>
                      <p className="text-xs text-slate-400">{formatDateBR(f.created_at)} • {f.file_type || 'arquivo'}</p>
                    </div>
                    <Download size={16} className="text-slate-400 shrink-0" />
                  </a>
                )) : (
                  <EmptyState icon={FileText} text="Nenhum documento disponível" />
                )}
              </div>
            )}

            {/* ─── FINANCIAL TAB ─── */}
            {activeTab === 'financeiro' && (
              <div className="space-y-4">
                <h2 className="font-bold text-slate-800">Financeiro</h2>

                {payment_plans.length > 0 ? payment_plans.map(plan => (
                  <div key={plan.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-bold text-slate-800">{plan.procedure}</p>
                        <p className="text-xs text-slate-400">
                          {plan.installments_count}x de R$ {(plan.total_amount / plan.installments_count).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-800">
                          R$ {Number(plan.total_amount).toFixed(2)}
                        </p>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          plan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                          plan.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {plan.status === 'ACTIVE' ? 'Ativo' : plan.status === 'COMPLETED' ? 'Concluído' : 'Cancelado'}
                        </span>
                      </div>
                    </div>

                    {/* Installments */}
                    {plan.installments && plan.installments[0]?.number && (
                      <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100">
                        {plan.installments.map((inst, i) => (
                          <div key={i} className="flex items-center justify-between text-xs">
                            <span className="text-slate-500">Parcela {inst.number}</span>
                            <span className="text-slate-400">{formatDateBR(inst.due_date)}</span>
                            <span className="font-medium text-slate-700">R$ {Number(inst.amount).toFixed(2)}</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded-full ${
                              inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-600' :
                              inst.status === 'OVERDUE' ? 'bg-red-100 text-red-600' :
                              'bg-amber-100 text-amber-600'
                            }`}>
                              {inst.status === 'PAID' ? 'Pago' : inst.status === 'OVERDUE' ? 'Vencido' : 'Pendente'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )) : (
                  <EmptyState icon={DollarSign} text="Nenhum plano financeiro registrado" />
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="max-w-2xl mx-auto flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 transition-colors ${
                activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'stroke-[2.5px]' : ''} />
              <span className="text-[10px] font-semibold">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Schedule modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200] flex items-end sm:items-center justify-center"
            onClick={() => setShowScheduleModal(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6 shadow-2xl"
            >
              {scheduleSuccess ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={32} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-1">Solicitação Enviada!</h3>
                  <p className="text-sm text-slate-500">A clínica entrará em contato para confirmar.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Solicitar Consulta</h3>
                    <button onClick={() => setShowScheduleModal(false)} className="text-slate-400 hover:text-slate-600">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Data Preferencial</label>
                      <input
                        type="date"
                        value={scheduleForm.preferred_date}
                        min={new Date().toLocaleDateString('en-CA')}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, preferred_date: e.target.value })}
                        className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Horário Preferencial</label>
                      <select
                        value={scheduleForm.preferred_time}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, preferred_time: e.target.value })}
                        className="w-full h-12 px-4 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 bg-white"
                      >
                        <option value="">Qualquer horário</option>
                        <option value="manha">Manhã (08h–12h)</option>
                        <option value="tarde">Tarde (13h–18h)</option>
                        <option value="noite">Noite (18h–21h)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Observações</label>
                      <textarea
                        placeholder="Descreva o motivo da consulta ou observações..."
                        value={scheduleForm.notes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
                      />
                    </div>
                    <button
                      onClick={handleRequestAppointment}
                      disabled={!scheduleForm.preferred_date || scheduleSubmitting}
                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {scheduleSubmitting ? (
                        <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>Enviar Solicitação <ChevronRight size={16} /></>
                      )}
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Helper Components ───

function QuickAction({ icon: Icon, label, color, onClick }: {
  icon: React.ElementType; label: string; color: string; onClick: () => void;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${colorMap[color]}`}
    >
      <Icon size={22} className="mb-1.5" />
      <span className="text-xs font-semibold">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 text-center shadow-sm">
      <Icon size={18} className="text-slate-400 mx-auto mb-1" />
      <p className="text-xl font-bold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</p>
    </div>
  );
}

function AppointmentCard({ appointment, formatDate, formatTime, statusLabel }: any) {
  const s = statusLabel(appointment.status);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Calendar size={16} className="text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{formatDate(appointment.start_time)}</p>
            <p className="text-xs text-slate-400">{formatTime(appointment.start_time)} — Dr(a). {appointment.dentist_name}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${s.color}`}>{s.label}</span>
      </div>
      {appointment.notes && <p className="text-xs text-slate-400 mt-2 ml-13">{appointment.notes}</p>}
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
      <Icon size={32} className="text-slate-300 mx-auto mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}
