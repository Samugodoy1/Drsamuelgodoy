import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Check, CheckCircle2, ChevronLeft, Clock, Home, MessageCircle, Plus, Search, Sparkles, UserCircle } from '../icons';
import { appointments as initialAppointments, cases as initialCases, checklistItems as initialChecklistItems, students, type AcademyAppointment, type AcademyCase, type ChecklistGroup } from '../data/academyMockData';

const statusChipClass: Record<string, string> = {
  'Em andamento': 'bg-[#EAF4EE] text-[#174F35]',
  'Aguardando professor': 'bg-[#FFFBEB] text-[#B45309]',
  'Retorno': 'bg-[#EFF6FF] text-[#1D4ED8]',
  'Pendente': 'bg-[#F2F4F7] text-[#667085]'
};

const AcademyBottomNav = () => {
  const navItems = [
    { to: '/academy', label: 'Início', icon: Home, end: true },
    { to: '/academy/agenda', label: 'Agenda', icon: Calendar },
    { to: '/academy/casos', label: 'Casos', icon: UserCircle },
    { to: '/academy/conteudos', label: 'Academy', icon: Sparkles },
    { to: '/academy/mais', label: 'Mais', icon: Plus }
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
      <div className="mx-auto grid max-w-[480px] grid-cols-5 rounded-[26px] border border-[#EAECF0] bg-white/95 p-2 shadow-[0_4px_16px_rgba(15,23,42,0.08)] backdrop-blur">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-medium transition ${isActive ? 'bg-[#EAF4EE] text-[#174F35]' : 'text-[#98A2B3]'}`}>
            <Icon size={20} />
            <span className="truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28">
    <div className="max-w-[480px] mx-auto px-4 pt-6 space-y-4">{children}</div>
    <AcademyBottomNav />
  </div>
);

const AcademyHeroCard = ({ appointment, onPrepare }: { appointment: AcademyAppointment; onPrepare: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }} className="rounded-[28px] bg-[#174F35] text-white p-5 shadow-[0_16px_40px_rgba(23,79,53,0.24)] space-y-4">
    <div>
      <p className="text-white/75 text-xs uppercase tracking-[0.12em]">Próximo atendimento</p>
      <h2 className="text-[27px] leading-[1.1] font-bold mt-2">{appointment.patientName}</h2>
      <p className="text-white/90 text-sm mt-1">{appointment.procedure}</p>
    </div>
    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-sm text-white/90">
      <p>{appointment.dateLabel}</p>
      <p>{appointment.time}</p>
      <p>{appointment.discipline}</p>
      <p>{appointment.clinic}</p>
    </div>
    <button onClick={onPrepare} className="w-full rounded-2xl bg-white text-[#174F35] font-semibold py-3.5 text-sm shadow-sm active:scale-[0.99] transition">
      Preparar atendimento
    </button>
  </motion.div>
);

const AcademyAppointmentCard = ({ appointment }: { appointment: AcademyAppointment }) => (
  <div className="rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)] space-y-3">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{appointment.time}</p>
        <h3 className="font-semibold text-slate-900 mt-1">{appointment.patientName}</h3>
        <p className="text-sm text-slate-600">{appointment.procedure}</p>
      </div>
      <span className="text-xs px-2.5 py-1 rounded-full bg-[#F2F4F7] text-[#667085]">{appointment.duration}</span>
    </div>
    <div className="flex items-center justify-between text-sm text-slate-500">
      <p>{appointment.discipline}</p>
      <Link to={`/academy/casos/${appointment.caseId}`} className="text-[#174F35] font-semibold">Ver caso</Link>
    </div>
  </div>
);

const AcademyCaseCard = ({ academyCase }: { academyCase: AcademyCase }) => (
  <Link to={`/academy/casos/${academyCase.id}`} className="block rounded-2xl border border-[#EAECF0] bg-white p-4 shadow-[0_4px_12px_rgba(15,23,42,0.04)] space-y-2.5">
    <div className="flex items-center justify-between gap-2">
      <h3 className="font-semibold text-slate-900">{academyCase.patientName}</h3>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusChipClass[academyCase.status] || statusChipClass.Pendente}`}>{academyCase.status}</span>
    </div>
    <p className="text-sm text-slate-600">{academyCase.procedure}</p>
    <p className="text-sm text-slate-900"><span className="text-slate-500">Próximo passo:</span> {academyCase.nextStep}</p>
  </Link>
);

const AcademyChecklistGroup = ({ group, onToggle }: { group: ChecklistGroup; onToggle: (groupId: string, itemId: string) => void }) => (
  <section className="rounded-2xl bg-white p-4 border border-[#EAECF0] space-y-2">
    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{group.title}</h3>
    <div className="space-y-1">
      {group.items.map((item) => (
        <motion.button whileTap={{ scale: 0.99 }} key={item.id} onClick={() => onToggle(group.id, item.id)} className={`w-full flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition ${item.done ? 'bg-[#EAF4EE]' : 'bg-transparent hover:bg-slate-50'}`}>
          <span className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${item.done ? 'bg-[#174F35] border-[#174F35] text-white' : 'border-slate-300 text-transparent'}`}><Check size={12} /></span>
          <span className={`text-sm ${item.done ? 'text-[#174F35] font-medium' : 'text-slate-700'}`}>{item.label}</span>
        </motion.button>
      ))}
    </div>
  </section>
);

const AcademyHome = ({ nextAppointment }: { nextAppointment: AcademyAppointment }) => {
  const navigate = useNavigate();
  return (
    <PageShell>
      <div className="space-y-1">
        <p className="text-slate-500 text-sm">Boa tarde, {students[0].greetingName}.</p>
        <h1 className="text-[28px] leading-[1.15] font-bold tracking-tight">Tudo pronto para sua clínica.</h1>
      </div>
      <AcademyHeroCard appointment={nextAppointment} onPrepare={() => navigate(`/academy/checklist/${nextAppointment.id}`)} />
      <div className="rounded-2xl bg-white p-4 border border-[#EAECF0] text-sm text-slate-600 flex items-center justify-between">
        <span>Pendência principal</span>
        <span className="font-semibold text-amber-700">Assinatura do plano</span>
      </div>
    </PageShell>
  );
};

const AcademyAgenda = ({ appointments }: { appointments: AcademyAppointment[] }) => {
  const [activeTab, setActiveTab] = useState<'Próximos' | 'Dia' | 'Semana'>('Próximos');
  return (
    <PageShell>
      <h1 className="text-2xl font-bold tracking-tight">Agenda</h1>
      <div className="rounded-2xl border border-[#EAECF0] bg-white p-3 flex items-center justify-between">
        <button className="p-2 rounded-full hover:bg-slate-50"><ChevronLeft size={18} /></button>
        <p className="font-medium text-sm">terça, 28 de abril</p>
        <button className="p-2 rounded-full hover:bg-slate-50 rotate-180"><ChevronLeft size={18} /></button>
      </div>
      <div className="grid grid-cols-3 rounded-full bg-[#F2F4F7] p-1">
        {(['Próximos', 'Dia', 'Semana'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>{tab}</button>
        ))}
      </div>
      <div className="space-y-3">{appointments.map((appointment) => <div key={appointment.id}><AcademyAppointmentCard appointment={appointment} /></div>)}</div>
    </PageShell>
  );
};

const AcademyCases = ({ cases }: { cases: AcademyCase[] }) => {
  const [filter, setFilter] = useState('Todos');
  const visibleCases = useMemo(() => filter === 'Todos' ? cases : cases.filter((c) => c.status === filter), [cases, filter]);
  return (
    <PageShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Casos clínicos</h1>
        <p className="text-sm text-slate-500">Paciente, status e próximo passo.</p>
      </div>
      <div className="rounded-2xl bg-white border border-[#EAECF0] px-3 py-2 flex items-center gap-2 text-slate-500">
        <Search size={16} />
        <input className="w-full bg-transparent outline-none text-sm" placeholder="Buscar paciente ou procedimento" />
      </div>
      <div className="flex gap-2 overflow-auto no-scrollbar pb-1">
        {['Todos', 'Em andamento', 'Aguardando professor', 'Retorno'].map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${filter === item ? 'bg-[#174F35] text-white' : 'bg-white border border-[#E4E7EC] text-slate-500'}`}>{item}</button>
        ))}
      </div>
      <div className="space-y-3">{visibleCases.map((academyCase) => <div key={academyCase.id}><AcademyCaseCard academyCase={academyCase} /></div>)}</div>
    </PageShell>
  );
};

const AcademyChecklist = ({ appointments, checklistItems, onReady }: { appointments: AcademyAppointment[]; checklistItems: Record<string, ChecklistGroup[]>; onReady: (id: string) => void }) => {
  const { appointmentId = '' } = useParams();
  const appointment = appointments.find((item) => item.id === appointmentId);
  const [groups, setGroups] = useState<ChecklistGroup[]>(checklistItems[appointmentId] || []);
  const { total, done } = useMemo(() => groups.reduce((acc, group) => ({ total: acc.total + group.items.length, done: acc.done + group.items.filter((item) => item.done).length }), { total: 0, done: 0 }), [groups]);
  const toggleItem = (groupId: string, itemId: string) => setGroups((previous) => previous.map((group) => group.id !== groupId ? group : { ...group, items: group.items.map((item) => item.id === itemId ? { ...item, done: !item.done } : item) }));

  if (!appointment) return <PageShell><p className="text-sm text-slate-500">Checklist indisponível para este atendimento.</p></PageShell>;

  return (
    <PageShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Checklist do atendimento</h1>
        <p className="text-sm text-slate-500">{appointment.patientName} · {appointment.time}</p>
      </div>
      <div className="rounded-2xl bg-white border border-[#EAECF0] p-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-500"><p>{done}/{total} concluídos</p><Clock size={15} /></div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#174F35] transition-all" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} /></div>
      </div>
      <div className="space-y-3">{groups.map((group) => <div key={group.id}><AcademyChecklistGroup group={group} onToggle={toggleItem} /></div>)}</div>
      <div className="sticky bottom-24">
        <button onClick={() => onReady(appointment.id)} className="w-full rounded-2xl bg-[#174F35] text-white py-3.5 font-semibold shadow-[0_8px_24px_rgba(23,79,53,0.28)]">Estou pronto para atender</button>
      </div>
    </PageShell>
  );
};

const AcademyContentModuleCard = ({ label, tone }: { label: string; tone: 'green' | 'blue' }) => (
  <div className={`rounded-2xl p-4 border ${tone === 'green' ? 'bg-[#F4FBF7] border-[#D9EEE2] text-[#174F35]' : 'bg-[#F5F8FF] border-[#DFE8FF] text-[#1D4ED8]'}`}>
    <p className="text-sm font-semibold">{label}</p>
  </div>
);

const AcademyProfileCard = () => (
  <div className="rounded-3xl bg-white p-5 border border-[#EAECF0] shadow-[0_6px_16px_rgba(15,23,42,0.05)] flex items-center gap-3">
    <div className="w-12 h-12 rounded-full bg-[#EAF4EE] text-[#174F35] flex items-center justify-center font-semibold">SG</div>
    <div>
      <h2 className="font-semibold text-slate-900">Samuel Godoy</h2>
      <p className="text-sm text-slate-600">Estudante de Odontologia</p>
      <p className="text-xs text-slate-500">7º período · Faculdade</p>
    </div>
  </div>
);

const AcademySettingsItem = ({ label }: { label: string }) => (
  <button className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition">
    <span>{label}</span>
    <ChevronLeft size={16} className="rotate-180 text-slate-400" />
  </button>
);

const AcademyFormSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="rounded-2xl bg-white border border-[#EAECF0] p-4 space-y-3">
    <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{title}</h3>
    {children}
  </section>
);

const AcademyCaseSummaryCard = ({ academyCase }: { academyCase: AcademyCase }) => (
  <div className="rounded-3xl bg-white p-5 border border-[#EAECF0] shadow-[0_6px_16px_rgba(15,23,42,0.05)] space-y-3">
    <div className="flex items-center justify-between gap-2">
      <h1 className="text-2xl font-bold tracking-tight">{academyCase.patientName}</h1>
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusChipClass[academyCase.status] || statusChipClass.Pendente}`}>{academyCase.status}</span>
    </div>
    <p className="text-sm text-slate-700">{academyCase.procedure}</p>
    <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
      <p><strong>Disciplina:</strong> {academyCase.discipline}</p>
      <p><strong>Professor:</strong> {academyCase.professor}</p>
      <p><strong>Etapa:</strong> {academyCase.currentStage || 'Em avaliação'}</p>
      <p><strong>Próxima:</strong> {academyCase.nextAppointmentLabel}</p>
    </div>
    <p className="text-sm text-slate-900"><span className="text-slate-500">Próximo passo:</span> {academyCase.nextStep}</p>
  </div>
);

const AcademyContents = () => (
  <PageShell>
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">Academy</h1>
      <p className="text-sm text-slate-500">Apoio prático para clínica, sem excesso.</p>
    </div>
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-5 border border-[#EAECF0] shadow-[0_6px_16px_rgba(15,23,42,0.05)] space-y-2.5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Conteúdo em destaque</p>
      <h2 className="text-lg font-semibold text-slate-900">Checklist da primeira clínica</h2>
      <p className="text-sm text-slate-600">Tudo o que você precisa conferir antes de atender.</p>
      <button className="rounded-2xl bg-[#174F35] text-white px-4 py-2.5 text-sm font-semibold">Ver conteúdo</button>
    </motion.div>
    <div className="grid grid-cols-2 gap-2.5">
      <AcademyContentModuleCard label="Dentística" tone="green" />
      <AcademyContentModuleCard label="Endodontia" tone="blue" />
      <AcademyContentModuleCard label="Cirurgia" tone="blue" />
      <AcademyContentModuleCard label="Biossegurança" tone="green" />
    </div>
    <section className="rounded-2xl bg-white border border-[#EAECF0] p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">Continue aprendendo</h3>
      {[['Passo a passo de anamnese', '5 min · Leitura rápida'], ['Preparação de bancada clínica', '8 min · Checklist'], ['Biossegurança sem erro', '6 min · Guia rápido']].map(([title, meta]) => (
        <div key={title} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-700">{title}</p>
            <p className="text-xs text-slate-500">{meta}</p>
          </div>
          <CheckCircle2 size={16} className="text-emerald-600" />
        </div>
      ))}
    </section>
  </PageShell>
);

const AcademyMore = () => (
  <PageShell>
    <h1 className="text-2xl font-bold tracking-tight">Mais</h1>
    <AcademyProfileCard />
    <div className="rounded-2xl bg-white border border-[#EAECF0] divide-y divide-[#F2F4F7] overflow-hidden">
      {['Minha faculdade', 'Disciplinas', 'Professores', 'Modelos de evolução', 'Configurações', 'Termos e privacidade'].map((item) => (
        <div key={item}><AcademySettingsItem label={item} /></div>
      ))}
    </div>
  </PageShell>
);

const AcademyCaseNew = ({ onCreateCase }: { onCreateCase: (newCase: AcademyCase) => void }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ patientName: '', procedure: '', discipline: '', professor: '', date: '', time: '', nextStep: '' });
  const createCase = (event: React.FormEvent) => {
    event.preventDefault();
    const id = `case-${Date.now()}`;
    onCreateCase({ id, patientName: form.patientName, procedure: form.procedure, discipline: form.discipline, professor: form.professor, clinic: 'Clínica Escola', status: 'Em andamento', currentStage: 'Triagem inicial', nextStep: form.nextStep, nextAppointmentLabel: `${form.date || 'Data a definir'}, ${form.time || '--:--'}`, lastEvolution: 'Caso criado no Academy.' });
    navigate(`/academy/casos/${id}`);
  };

  return (
    <PageShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Novo caso</h1>
        <p className="text-sm text-slate-500">Organize um atendimento da clínica em poucos passos.</p>
      </div>
      <form onSubmit={createCase} className="space-y-3 pb-20">
        <AcademyFormSection title="Caso">
          <input required value={form.patientName} onChange={(e) => setForm((prev) => ({ ...prev, patientName: e.target.value }))} placeholder="Nome do paciente ou código" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
          <input required value={form.procedure} onChange={(e) => setForm((prev) => ({ ...prev, procedure: e.target.value }))} placeholder="Procedimento" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
        </AcademyFormSection>
        <AcademyFormSection title="Clínica">
          <input required value={form.discipline} onChange={(e) => setForm((prev) => ({ ...prev, discipline: e.target.value }))} placeholder="Disciplina" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
          <input required value={form.professor} onChange={(e) => setForm((prev) => ({ ...prev, professor: e.target.value }))} placeholder="Professor" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
        </AcademyFormSection>
        <AcademyFormSection title="Próximo atendimento">
          <div className="grid grid-cols-2 gap-2">
            <input required value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} placeholder="Data" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
            <input required value={form.time} onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))} placeholder="Horário" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
          </div>
          <input required value={form.nextStep} onChange={(e) => setForm((prev) => ({ ...prev, nextStep: e.target.value }))} placeholder="Próximo passo" className="w-full rounded-xl border border-[#E4E7EC] px-3.5 py-3 text-sm outline-none focus:border-[#174F35]" />
        </AcademyFormSection>
        <div className="sticky bottom-24">
          <button type="submit" className="w-full rounded-2xl bg-[#174F35] text-white py-3.5 font-semibold shadow-[0_8px_24px_rgba(23,79,53,0.28)]">Criar caso</button>
        </div>
      </form>
    </PageShell>
  );
};

const AcademyCaseDetail = ({ cases }: { cases: AcademyCase[] }) => {
  const { id } = useParams();
  const currentCase = cases.find((item) => item.id === id);
  if (!currentCase) return <PageShell><p className="text-sm text-slate-500">Caso não encontrado.</p></PageShell>;
  return (
    <PageShell>
      <AcademyCaseSummaryCard academyCase={currentCase} />
      <section className="rounded-2xl bg-white border border-[#EAECF0] p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Última evolução</h3>
        <p className="text-sm text-slate-700">{currentCase.lastEvolution}</p>
      </section>
      <section className="rounded-2xl bg-white border border-[#EAECF0] p-4 space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Pendências</h3>
        <p className="text-sm text-slate-700">Aguardando validação do professor.</p>
      </section>
      <div className="grid grid-cols-1 gap-2">
        <Link to="/academy/checklist/appointment-laura" className="w-full text-center rounded-2xl bg-[#174F35] text-white py-3.5 font-semibold">Preparar atendimento</Link>
        <button className="w-full rounded-2xl bg-white border border-[#E4E7EC] py-3 font-semibold text-slate-700">Registrar evolução</button>
        <button className="w-full rounded-2xl bg-white border border-[#E4E7EC] py-3 font-semibold text-slate-700">Marcar retorno</button>
      </div>
    </PageShell>
  );
};

export const AcademyExperience = () => {
  const [academyCases, setAcademyCases] = useState<AcademyCase[]>(initialCases);
  const [academyAppointments, setAcademyAppointments] = useState<AcademyAppointment[]>(initialAppointments);
  const handleReady = (appointmentId: string) => setAcademyAppointments((prev) => prev.map((appointment) => appointment.id === appointmentId ? { ...appointment, status: 'em atendimento' } : appointment));


  return (
    <Routes>
      <Route index element={<AcademyHome nextAppointment={academyAppointments[0]} />} />
      <Route path="agenda" element={<AcademyAgenda appointments={academyAppointments} />} />
      <Route path="casos" element={<AcademyCases cases={academyCases} />} />
      <Route path="casos/novo" element={<AcademyCaseNew onCreateCase={(newCase) => setAcademyCases((prev) => [newCase, ...prev])} />} />
      <Route path="casos/:id" element={<AcademyCaseDetail cases={academyCases} />} />
      <Route path="checklist/:appointmentId" element={<AcademyChecklist appointments={academyAppointments} checklistItems={initialChecklistItems} onReady={handleReady} />} />
      <Route path="conteudos" element={<AcademyContents />} />
      <Route path="mais" element={<AcademyMore />} />
      <Route path="*" element={<PageShell><p className="text-sm text-slate-500">Rota Academy não encontrada</p></PageShell>} />
    </Routes>
  );
};
