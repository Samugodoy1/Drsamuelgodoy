import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Heart,
  Home,
  MessageCircle,
  Phone,
  Shield,
  Sparkles,
  UserCircle,
} from '../icons';

type PortalTab = 'home' | 'cuidados' | 'consultas' | 'perfil';
type HomeState = 'consulta_proxima' | 'solicitacao_pendente' | 'tratamento_ativo' | 'revisao_atrasada' | 'sem_pendencias';

interface PortalData {
  patient: {
    id: number;
    name: string;
    email: string;
    phone: string;
    birth_date: string;
    address: string;
    health_insurance?: string;
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
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Recusada',
  CONFIRMED: 'Confirmada',
  SCHEDULED: 'Agendada',
  FINISHED: 'Concluída',
};

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
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar o portal');
      } finally {
        setLoading(false);
      }
    };

    authenticateAndLoad();
  }, [token]);

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
      .filter((a) => new Date(a.start_time) > now && a.status !== 'CANCELLED')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const history = appointments
      .filter((a) => new Date(a.start_time) <= now || a.status === 'CANCELLED')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    const requests = [...(data.appointment_requests || [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    const latestPendingRequest = requests.find((r) => ['PENDING', 'ANALYZING', 'EM_ANALISE'].includes(r.status?.toUpperCase()));

    const treatmentPlan = data.patient.treatment_plan || [];
    const activeTreatmentItems = treatmentPlan.filter((item) => !['DONE', 'COMPLETED', 'FINISHED', 'CANCELLED'].includes((item.status || '').toUpperCase()));

    const lastFinished = history.find((a) => a.status === 'FINISHED');
    const monthsWithoutVisit = lastFinished
      ? Math.floor((now.getTime() - new Date(lastFinished.start_time).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : null;

    let homeState: HomeState = 'sem_pendencias';
    if (upcoming[0]) homeState = 'consulta_proxima';
    else if (latestPendingRequest) homeState = 'solicitacao_pendente';
    else if (activeTreatmentItems.length > 0) homeState = 'tratamento_ativo';
    else if ((monthsWithoutVisit || 0) >= 6) homeState = 'revisao_atrasada';

    return {
      upcoming,
      history,
      requests,
      latestPendingRequest,
      activeTreatmentItems,
      monthsWithoutVisit,
      homeState,
      lastFinished,
    };
  }, [data]);

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

  const homeContent: Record<HomeState, { title: string; description: string; cta: string; action: () => void }> = {
    consulta_proxima: {
      title: `Seu retorno é ${new Date(computed.upcoming[0].start_time).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })} às ${new Date(computed.upcoming[0].start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
      description: `Com Dr(a). ${computed.upcoming[0].dentist_name}`,
      cta: 'Ver detalhes',
      action: () => setActiveTab('consultas'),
    },
    solicitacao_pendente: {
      title: 'Recebemos seu pedido e estamos analisando',
      description: 'Você será notificado assim que houver atualização.',
      cta: 'Falar com clínica',
      action: () => window.location.href = `tel:${data.clinic?.phone || data.patient.phone}`,
    },
    tratamento_ativo: {
      title: 'Próxima etapa do tratamento disponível',
      description: `${computed.activeTreatmentItems.length} etapa(s) em andamento.`,
      cta: 'Ver progresso',
      action: () => setActiveTab('cuidados'),
    },
    revisao_atrasada: {
      title: `Já faz ${computed.monthsWithoutVisit} meses desde sua última visita`,
      description: 'Manter a revisão em dia previne urgências e reduz custos.',
      cta: 'Agendar revisão',
      action: () => setShowScheduleModal(true),
    },
    sem_pendencias: {
      title: 'Seu sorriso está em dia',
      description: 'Tudo certo por enquanto. Que tal programar seu próximo check-up?',
      cta: 'Agendar check-up',
      action: () => setShowScheduleModal(true),
    },
  };

  const homePrimary = homeContent[computed.homeState];
  const progressPct = data.patient.treatment_plan?.length
    ? Math.round((((data.patient.treatment_plan.length - computed.activeTreatmentItems.length) / data.patient.treatment_plan.length) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#111827]">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-28 pt-6">
        <header>
          <p className="text-sm text-[#6b7280]">{greeting}, {firstName}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Portal do Paciente</h1>
          <p className="mt-1 text-xs text-[#9ca3af]">{data.clinic?.clinic_name || data.clinic?.name || 'OdontoHub'}</p>
        </header>

        <main className="mt-5 flex-1">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.section key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <div className="rounded-3xl border border-white/70 bg-white p-5 shadow-[0_8px_30px_rgba(17,24,39,0.06)]">
                  <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">Prioridade de hoje</p>
                  <h2 className="mt-2 text-xl font-semibold leading-tight">{homePrimary.title}</h2>
                  <p className="mt-2 text-sm text-[#6b7280]">{homePrimary.description}</p>
                  <button onClick={homePrimary.action} className="mt-4 w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-medium text-white active:scale-[0.99]">
                    {homePrimary.cta}
                  </button>
                </div>

                <MiniList
                  title="Próximas movimentações"
                  items={[
                    computed.upcoming[0] ? `Consulta em ${new Date(computed.upcoming[0].start_time).toLocaleDateString('pt-BR')}` : 'Sem consultas agendadas',
                    computed.latestPendingRequest ? 'Solicitação aguardando análise' : 'Nenhuma solicitação pendente',
                  ]}
                />
                <MiniList
                  title="Mensagens recentes"
                  items={[
                    computed.requests[0] ? `Solicitação #${computed.requests[0].id} • ${statusLabel[computed.requests[0].status] || computed.requests[0].status}` : 'Sem mensagens recentes',
                    'Use “Falar com clínica” para atendimento rápido',
                  ]}
                />
                <MiniList
                  title="Lembretes importantes"
                  items={[
                    computed.monthsWithoutVisit && computed.monthsWithoutVisit >= 6 ? 'Revisão preventiva recomendada agora' : 'Higiene e fio dental diariamente',
                    'Chegue 10 minutos antes em consultas presenciais',
                  ]}
                />
              </motion.section>
            )}

            {activeTab === 'cuidados' && (
              <motion.section key="care" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                {computed.activeTreatmentItems.length > 0 ? (
                  <>
                    <div className="rounded-3xl bg-white p-5 shadow-sm border border-white/70">
                      <p className="text-xs uppercase tracking-[0.16em] text-[#9ca3af]">Tratamento ativo</p>
                      <h2 className="mt-2 text-lg font-semibold">Etapa atual em andamento</h2>
                      <p className="mt-2 text-sm text-[#6b7280]">Progresso geral do plano: {progressPct}%</p>
                      <div className="mt-3 h-2 rounded-full bg-[#e5e7eb]">
                        <div className="h-2 rounded-full bg-[#111827]" style={{ width: `${progressPct}%` }} />
                      </div>
                    </div>
                    <MiniList title="Próximas fases" items={computed.activeTreatmentItems.slice(0, 4).map((item) => item.procedure || 'Procedimento planejado')} />
                    <MiniList title="Orientações" items={['Siga os horários de medicação orientados.', 'Evite esforços nas primeiras 24h pós-procedimento.', 'Em caso de dor forte, fale com a clínica.']} />
                    <MiniList title="Documentos e imagens" items={[data.files[0] ? `${data.files.length} arquivo(s) disponível(is)` : 'Ainda não há arquivos para este tratamento']} />
                  </>
                ) : (
                  <>
                    <MiniList title="Prevenção personalizada" items={['Faça revisão semestral para manter estabilidade clínica.', 'Atualize sua anamnese anualmente para maior segurança.']} />
                    <MiniList title="Higiene bucal premium" items={['Escovação suave 3x ao dia', 'Uso de fio dental noturno', 'Enxaguante sem álcool quando indicado']} />
                    <MiniList title="Lembretes" items={['Agende seu próximo check-up preventivo', 'Mantenha hidratação e evite açúcar frequente']} />
                  </>
                )}
              </motion.section>
            )}

            {activeTab === 'consultas' && (
              <motion.section key="appointments" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-4">
                <button onClick={() => setShowScheduleModal(true)} className="w-full rounded-2xl bg-[#111827] px-4 py-3 text-sm font-medium text-white">
                  Agendar consulta
                </button>

                <ListCard title="Próximas consultas">
                  {computed.upcoming.length === 0 ? <EmptyRow text="Nenhuma consulta futura." /> : computed.upcoming.map((appointment) => (
                    <div key={appointment.id} className="rounded-2xl border border-[#eceff3] p-3">
                      <p className="text-sm font-medium">{new Date(appointment.start_time).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="text-xs text-[#6b7280]">Dr(a). {appointment.dentist_name} • {statusLabel[appointment.status] || appointment.status}</p>
                      <div className="mt-2 flex gap-2">
                        <button onClick={() => handleConfirmAppointment(appointment.id)} className="rounded-xl bg-[#ecfdf3] px-3 py-1.5 text-xs font-medium text-[#0f766e]">
                          {appointmentSubmittingId === appointment.id ? 'Confirmando...' : 'Confirmar'}
                        </button>
                        <button onClick={() => setShowScheduleModal(true)} className="rounded-xl bg-[#f3f4f6] px-3 py-1.5 text-xs font-medium text-[#374151]">Reagendar</button>
                      </div>
                    </div>
                  ))}
                </ListCard>

                <ListCard title="Solicitações enviadas">
                  {computed.requests.length === 0 ? <EmptyRow text="Nenhuma solicitação enviada." /> : computed.requests.map((request) => (
                    <div key={request.id} className="flex items-start justify-between rounded-2xl border border-[#eceff3] p-3">
                      <div>
                        <p className="text-sm font-medium">#{request.id} • {request.reason_category || 'Consulta geral'}</p>
                        <p className="text-xs text-[#6b7280]">{new Date(request.created_at).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className="rounded-full bg-[#f3f4f6] px-2 py-1 text-xs text-[#4b5563]">{statusLabel[request.status] || request.status}</span>
                    </div>
                  ))}
                </ListCard>

                <ListCard title="Histórico anterior">
                  {computed.history.length === 0 ? <EmptyRow text="Sem histórico ainda." /> : computed.history.slice(0, 5).map((appointment) => (
                    <div key={appointment.id} className="flex items-center justify-between rounded-2xl border border-[#eceff3] p-3">
                      <div>
                        <p className="text-sm font-medium">{new Date(appointment.start_time).toLocaleDateString('pt-BR')}</p>
                        <p className="text-xs text-[#6b7280]">Dr(a). {appointment.dentist_name}</p>
                      </div>
                      <span className="text-xs text-[#6b7280]">{statusLabel[appointment.status] || appointment.status}</span>
                    </div>
                  ))}
                </ListCard>

                <button onClick={() => (window.location.href = `tel:${data.clinic?.phone || data.patient.phone}`)} className="w-full rounded-2xl border border-[#d1d5db] bg-white px-4 py-3 text-sm font-medium text-[#111827]">
                  Falar com clínica
                </button>
              </motion.section>
            )}

            {activeTab === 'perfil' && (
              <motion.section key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
                <ListButton icon={<UserCircle size={18} />} label="Editar dados pessoais" value={data.patient.email} />
                <ListButton icon={<FileText size={18} />} label="Renovar anamnese" value="Atualize suas informações clínicas" />
                <ListButton icon={<Shield size={18} />} label="Convênio" value={data.patient.health_insurance || 'Não informado'} />
                <ListButton icon={<FileText size={18} />} label="Documentos" value={`${data.files.length} arquivo(s)`} />
                <ListButton icon={<Sparkles size={18} />} label="Preferências" value="Notificações e idioma" />
                <ListButton icon={<MessageCircle size={18} />} label="Suporte" value="Atendimento da clínica" />
                <ListButton icon={<Phone size={18} />} label="Sair" value="Encerrar sessão do portal" />
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-3 z-40 px-4">
        <div className="mx-auto grid max-w-md grid-cols-4 rounded-[24px] border border-white/80 bg-white/90 p-2 shadow-[0_8px_30px_rgba(17,24,39,0.16)] backdrop-blur-xl">
          <TabButton label="Home" icon={<Home size={20} />} isActive={activeTab === 'home'} onClick={() => setActiveTab('home')} />
          <TabButton label="Cuidados" icon={<Heart size={20} />} isActive={activeTab === 'cuidados'} onClick={() => setActiveTab('cuidados')} />
          <TabButton label="Consultas" icon={<Calendar size={20} />} isActive={activeTab === 'consultas'} onClick={() => setActiveTab('consultas')} />
          <TabButton label="Perfil" icon={<UserCircle size={20} />} isActive={activeTab === 'perfil'} onClick={() => setActiveTab('perfil')} />
        </div>
      </nav>

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
    </div>
  );
}

function TabButton({ label, icon, isActive, onClick }: { label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 rounded-2xl py-2 text-[11px] transition ${isActive ? 'bg-[#f3f4f6] text-[#111827]' : 'text-[#6b7280]'}`}>
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function MiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <li key={`${title}-${idx}`} className="flex items-start gap-2 text-sm text-[#374151]">
            <Clock size={14} className="mt-0.5 text-[#9ca3af]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/70 bg-white p-4 shadow-sm">
      <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="rounded-xl bg-[#f9fafb] px-3 py-2 text-sm text-[#6b7280]">{text}</p>;
}

function ListButton({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <button className="flex w-full items-center justify-between rounded-2xl border border-white/70 bg-white px-4 py-3 text-left shadow-sm">
      <div className="flex items-center gap-3">
        <div className="text-[#6b7280]">{icon}</div>
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-[#6b7280]">{value}</p>
        </div>
      </div>
      <CheckCircle2 size={16} className="text-[#d1d5db]" />
    </button>
  );
}
