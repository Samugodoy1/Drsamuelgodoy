import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarPlus,
  ClipboardList,
  CheckCircle2,
  X,
  ChevronRight,
  Clock,
  Check,
  AlertCircle,
  User,
  Phone,
  FileText,
  Heart,
  Pill,
  Stethoscope,
  Calendar
} from '../icons';

interface AppointmentRequest {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  preferred_date: string;
  preferred_time: string | null;
  notes: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
}

interface IntakeForm {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  status: 'SUBMITTED' | 'REVIEWED';
  created_at: string;
  form_data: {
    medical_history?: string;
    allergies?: string;
    medications?: string;
    chief_complaint?: string;
    habits?: string;
    family_history?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    health_insurance?: string;
    health_insurance_number?: string;
  };
}

interface PortalInboxProps {
  apiFetch: (url: string, options?: any) => Promise<Response>;
  onSchedulePatient?: (patientId: number, patientName: string, preferredDate: string) => void;
  onOpenPatient?: (patientId: number) => void;
}

export function PortalInbox({ apiFetch, onSchedulePatient, onOpenPatient }: PortalInboxProps) {
  const [activeSection, setActiveSection] = useState<'requests' | 'intake' | 'messages'>('requests');
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [intakeForms, setIntakeForms] = useState<IntakeForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<IntakeForm | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Messages
  const [unreadThreads, setUnreadThreads] = useState<Array<{ patient_id: number; patient_name: string; unread_count: number; last_message_at: string }>>([]);
  const [openThread, setOpenThread] = useState<{ patient_id: number; patient_name: string } | null>(null);
  const [threadMessages, setThreadMessages] = useState<Array<{ id: number; sender: string; message: string; created_at: string }>>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, formRes, msgRes] = await Promise.all([
        apiFetch('/api/portal/appointment-requests'),
        apiFetch('/api/portal/intake-forms'),
        apiFetch('/api/portal/messages/unread')
      ]);
      if (reqRes.ok) setRequests(await reqRes.json());
      if (formRes.ok) setIntakeForms(await formRes.json());
      if (msgRes.ok) setUnreadThreads(await msgRes.json());
    } catch (e) {
      console.error('Error loading portal inbox:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadThread = async (patientId: number) => {
    try {
      const res = await apiFetch(`/api/portal/messages/${patientId}`);
      if (res.ok) setThreadMessages(await res.json());
    } catch {}
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !openThread || sendingReply) return;
    setSendingReply(true);
    try {
      const res = await apiFetch(`/api/portal/messages/${openThread.patient_id}`, {
        method: 'POST', body: JSON.stringify({ message: replyText.trim() })
      });
      if (res.ok) {
        setReplyText('');
        loadThread(openThread.patient_id);
        // Refresh unread counts
        const msgRes = await apiFetch('/api/portal/messages/unread');
        if (msgRes.ok) setUnreadThreads(await msgRes.json());
      }
    } finally { setSendingReply(false); }
  };

  const handleUpdateRequest = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setUpdatingId(id);
    try {
      await apiFetch(`/api/portal/appointment-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReviewForm = async (id: number) => {
    await apiFetch(`/api/portal/intake-forms/${id}/review`, { method: 'PATCH' });
    setIntakeForms(prev => prev.map(f => f.id === id ? { ...f, status: 'REVIEWED' } : f));
    if (selectedForm?.id === id) setSelectedForm(prev => prev ? { ...prev, status: 'REVIEWED' } : null);
  };

  const pendingRequests = requests.filter(r => r.status === 'PENDING');
  const pendingForms = intakeForms.filter(f => f.status === 'SUBMITTED');

  const totalPending = pendingRequests.length + pendingForms.length + unreadThreads.length;

  const formatDateBR = (d: string) => {
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch { return d; }
  };

  const timeLabel = (t: string | null) => {
    if (!t) return 'Qualquer horário';
    const map: Record<string, string> = { manha: 'Manhã (08h–12h)', tarde: 'Tarde (13h–18h)', noite: 'Noite (18h–21h)' };
    return map[t] || t;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* ── Solicitações de Agendamento (apenas pendentes) ── */}
      <div className="space-y-3">
          {pendingRequests.length === 0 ? (
            <EmptyState icon={CalendarPlus} text="Nenhuma solicitação de agendamento pendente" />
          ) : (
            pendingRequests.map(req => (
              <div
                key={req.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
                  req.status === 'PENDING' ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                      {req.patient_name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm">{req.patient_name}</p>
                      <p className="text-xs text-slate-400">{req.patient_phone}</p>
                    </div>
                  </div>
                  <StatusBadgeReq status={req.status} />
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <InfoChip icon={Calendar} label="Data preferida" value={formatDateBR(req.preferred_date)} />
                  <InfoChip icon={Clock} label="Horário" value={timeLabel(req.preferred_time)} />
                </div>

                {req.notes && (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3 mb-3 italic">
                    "{req.notes}"
                  </p>
                )}

                <div className="text-[10px] text-slate-400 mb-3">
                  Solicitado em {formatDateBR(req.created_at)}
                </div>

                {req.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        handleUpdateRequest(req.id, 'APPROVED');
                        if (onSchedulePatient) {
                          onSchedulePatient(req.patient_id, req.patient_name, req.preferred_date);
                        }
                      }}
                      disabled={updatingId === req.id}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <Check size={13} /> Aprovar e Agendar
                    </button>
                    <button
                      onClick={() => handleUpdateRequest(req.id, 'REJECTED')}
                      disabled={updatingId === req.id}
                      className="px-4 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Recusar
                    </button>
                    {onOpenPatient && (
                      <button
                        onClick={() => onOpenPatient(req.patient_id)}
                        className="px-3 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                        title="Ver prontuário"
                      >
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                )}

                {req.status !== 'PENDING' && onOpenPatient && (
                  <button
                    onClick={() => onOpenPatient(req.patient_id)}
                    className="w-full py-2 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    Ver Prontuário <ChevronRight size={13} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>

      {/* ── Mensagens dos Pacientes ── */}
      {(unreadThreads.length > 0 || openThread) && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <AlertCircle size={14} className="text-blue-500" />
            Mensagens de Pacientes
            {unreadThreads.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-bold rounded-full">{unreadThreads.length}</span>
            )}
          </h3>

          {openThread ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-slate-100">
                <button onClick={() => { setOpenThread(null); setThreadMessages([]); }}
                  className="w-7 h-7 bg-slate-100 rounded-full flex items-center justify-center hover:bg-slate-200 transition-colors">
                  <ChevronRight size={14} className="text-slate-500 rotate-180" />
                </button>
                <p className="font-bold text-slate-800 text-sm">{openThread.patient_name}</p>
              </div>
              <div className="max-h-80 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
                {threadMessages.map(msg => (
                  <div key={msg.id} className={`flex ${msg.sender === 'dentist' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm ${
                      msg.sender === 'dentist' ? 'bg-emerald-600 text-white rounded-br-md' : 'bg-white text-slate-800 rounded-bl-md shadow-sm border border-slate-100'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                      <p className={`text-[10px] mt-1 ${msg.sender === 'dentist' ? 'text-white/60' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSendReply(); }}
                  placeholder="Responder..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-300"
                />
                <button onClick={handleSendReply} disabled={!replyText.trim() || sendingReply}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-30">
                  Enviar
                </button>
              </div>
            </div>
          ) : (
            unreadThreads.map(thread => (
              <button key={thread.patient_id}
                onClick={() => { setOpenThread({ patient_id: thread.patient_id, patient_name: thread.patient_name }); loadThread(thread.patient_id); }}
                className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-blue-100 shadow-sm hover:bg-blue-50/30 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-blue-500/10 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {thread.patient_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm">{thread.patient_name}</p>
                  <p className="text-xs text-slate-400">{thread.unread_count} mensagem(ns) não lida(s)</p>
                </div>
                <ChevronRight size={14} className="text-slate-300 shrink-0" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper components ───

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-10 text-center">
      <Icon size={32} className="text-slate-200 mx-auto mb-2" />
      <p className="text-sm text-slate-400">{text}</p>
    </div>
  );
}

function StatusBadgeReq({ status }: { status: string }) {
  if (status === 'PENDING') return (
    <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1">
      <Clock size={10} /> Pendente
    </span>
  );
  if (status === 'APPROVED') return (
    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
      <CheckCircle2 size={10} /> Aprovado
    </span>
  );
  return (
    <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full flex items-center gap-1">
      <X size={10} /> Recusado
    </span>
  );
}

function InfoChip({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-2.5">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={11} className="text-slate-400" />
        <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-xs font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function FormSection({ icon: Icon, label, value, highlight }: {
  icon: React.ElementType; label: string; value?: string; highlight?: string;
}) {
  if (!value) return null;
  return (
    <div className={`rounded-xl p-3 ${highlight === 'rose' ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50'}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={highlight === 'rose' ? 'text-rose-500' : 'text-slate-400'} />
        <span className={`text-xs font-bold uppercase tracking-wider ${highlight === 'rose' ? 'text-rose-600' : 'text-slate-500'}`}>{label}</span>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed">{value}</p>
    </div>
  );
}
