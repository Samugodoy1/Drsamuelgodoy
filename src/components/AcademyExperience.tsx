import React, { useMemo, useState } from 'react';
import { Link, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Check, CheckCircle2, ChevronLeft, Clock, Home, MessageCircle, Plus, Search, Sparkles, UserCircle } from '../icons';
import { appointments as initialAppointments, cases as initialCases, checklistItems as initialChecklistItems, students, type AcademyAppointment, type AcademyCase, type ChecklistGroup } from '../data/academyMockData';

const statusChipClass: Record<string, string> = {
  'Em andamento': 'bg-emerald-50 text-emerald-700',
  'Aguardando professor': 'bg-amber-50 text-amber-700',
  'Retorno': 'bg-blue-50 text-blue-700',
  'Pendente': 'bg-slate-100 text-slate-700'
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
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40">
      <nav className="max-w-[480px] mx-auto flex items-center justify-between px-2 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `flex flex-col items-center justify-center gap-1 py-1 px-2 min-w-0 flex-1 ${isActive ? 'text-primary' : 'text-[#8E8E93]'}`}
          >
            {({ isActive }) => (
              <>
                <Icon size={22} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.6px]'} />
                <span className={`text-[10px] font-semibold truncate ${isActive ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-24">
    <div className="max-w-[480px] mx-auto px-4 pt-5 space-y-4">{children}</div>
    <AcademyBottomNav />
  </div>
);

const AcademyHome = ({ nextAppointment }: { nextAppointment: AcademyAppointment }) => {
  const navigate = useNavigate();

  return (
    <PageShell>
      <div className="space-y-1">
        <p className="text-slate-600 text-sm">Boa tarde, {students[0].greetingName} 👋</p>
        <h1 className="text-[30px] leading-[1.1] font-bold tracking-tight">Sua clínica sem confusão.</h1>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-[#0D3D2F] text-white p-5 shadow-xl shadow-emerald-950/20 space-y-3">
        <div>
          <p className="text-white/75 text-xs">Próximo atendimento acadêmico</p>
          <h2 className="text-2xl font-semibold mt-1">{nextAppointment.patientName}</h2>
          <p className="text-white/85 text-sm">{nextAppointment.procedure}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm text-white/90">
          <p>{nextAppointment.dateLabel}, {nextAppointment.time}</p>
          <p>{nextAppointment.duration}</p>
          <p>{nextAppointment.discipline}</p>
          <p>{nextAppointment.clinic}</p>
          <p className="col-span-2">{nextAppointment.professor}</p>
        </div>
        <button onClick={() => navigate(`/academy/checklist/${nextAppointment.id}`)} className="w-full rounded-full bg-white text-[#0D3D2F] font-semibold py-3 text-sm">
          Preparar atendimento
        </button>
      </motion.div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-semibold text-slate-900">Checklist de hoje</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">Materiais e EPIs</span>
          <span className="text-emerald-700 font-semibold">Tudo pronto</span>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
        <h3 className="font-semibold text-slate-900">Pendências</h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">Assinatura do plano de tratamento</span>
          <span className="text-amber-700 font-semibold">Aguardando professor</span>
        </div>
      </div>
    </PageShell>
  );
};

const AcademyAgenda = ({ appointments }: { appointments: AcademyAppointment[] }) => {
  const [activeTab, setActiveTab] = useState<'Próximos' | 'Dia' | 'Semana'>('Próximos');
  return (
    <PageShell>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Agenda da clínica</h1>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between">
        <button className="p-2 rounded-full hover:bg-slate-50"><ChevronLeft size={18} /></button>
        <p className="font-medium text-sm">Terça, 28 de abril</p>
        <button className="p-2 rounded-full hover:bg-slate-50 rotate-180"><ChevronLeft size={18} /></button>
      </div>

      <div className="grid grid-cols-3 rounded-full bg-slate-100 p-1">
        {(['Próximos', 'Dia', 'Semana'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full py-2 text-sm font-medium ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
            {tab}
          </button>
        ))}
      </div>

      {appointments.map((appointment) => (
        <div key={appointment.id} className="rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{appointment.patientName}</h3>
              <p className="text-sm text-slate-600">{appointment.time} · {appointment.procedure}</p>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-slate-100 text-slate-600">{appointment.duration}</span>
          </div>
          <p className="text-sm text-slate-600">{appointment.discipline} · {appointment.clinic}</p>
          <div className="flex items-center gap-2">
            <button className="rounded-full bg-[#0D3D2F] text-white px-4 py-2 text-sm font-semibold">Atender</button>
            <Link to={`/academy/casos/${appointment.caseId}`} className="rounded-full bg-slate-100 text-slate-700 px-4 py-2 text-sm font-semibold">Ver caso</Link>
            <button className="ml-auto w-9 h-9 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center"><MessageCircle size={16} /></button>
          </div>
        </div>
      ))}
    </PageShell>
  );
};

const AcademyCases = ({ cases }: { cases: AcademyCase[] }) => {
  const [filter, setFilter] = useState('Todos');
  const visibleCases = useMemo(() => filter === 'Todos' ? cases : cases.filter((c) => c.status === filter), [cases, filter]);

  return (
    <PageShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Casos</h1>
        <p className="text-sm text-slate-500">Acompanhe seus pacientes e estágios de tratamento.</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 px-3 py-2 flex items-center gap-2 text-slate-500">
        <Search size={16} />
        <input className="w-full bg-transparent outline-none text-sm" placeholder="Buscar paciente ou caso..." />
      </div>

      <div className="flex gap-2 overflow-auto no-scrollbar pb-1">
        {['Todos', 'Em andamento', 'Aguardando professor', 'Retorno'].map((item) => (
          <button key={item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${filter === item ? 'bg-[#0D3D2F] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {item}
          </button>
        ))}
      </div>

      <Link to="/academy/casos/novo" className="rounded-full bg-slate-900 text-white px-4 py-2 text-sm font-semibold inline-flex">Novo caso</Link>

      <div className="space-y-3">
        {visibleCases.map((academyCase) => (
          <Link key={academyCase.id} to={`/academy/casos/${academyCase.id}`} className="block rounded-2xl bg-white p-4 shadow-sm border border-slate-100 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">{academyCase.patientName}</h3>
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusChipClass[academyCase.status] || statusChipClass.Pendente}`}>{academyCase.status}</span>
            </div>
            <p className="text-sm text-slate-600">{academyCase.procedure}</p>
            <p className="text-sm text-slate-500">Próximo passo: {academyCase.nextStep}</p>
            <p className="text-xs text-slate-400">Próx: {academyCase.nextAppointmentLabel.replace(',', ' ·')}</p>
          </Link>
        ))}
      </div>
    </PageShell>
  );
};

const AcademyCaseNew = ({ onCreateCase }: { onCreateCase: (newCase: AcademyCase) => void }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ patientName: '', procedure: '', discipline: '', professor: '', date: '', time: '', nextStep: '' });

  const createCase = (event: React.FormEvent) => {
    event.preventDefault();
    const id = `case-${Date.now()}`;
    onCreateCase({
      id,
      patientName: form.patientName,
      procedure: form.procedure,
      discipline: form.discipline,
      professor: form.professor,
      clinic: 'Clínica Escola',
      status: 'Em andamento',
      currentStage: 'Triagem inicial',
      nextStep: form.nextStep,
      nextAppointmentLabel: `${form.date || 'Data a definir'}, ${form.time || '--:--'}`,
      lastEvolution: 'Caso criado no Academy.'
    });
    navigate(`/academy/casos/${id}`);
  };

  return (
    <PageShell>
      <h1 className="text-2xl font-bold tracking-tight">Novo caso clínico</h1>
      <form onSubmit={createCase} className="space-y-3">
        {[
          ['patientName', 'Nome do paciente ou código'],
          ['procedure', 'Procedimento'],
          ['discipline', 'Disciplina'],
          ['professor', 'Professor'],
          ['date', 'Data'],
          ['time', 'Horário'],
          ['nextStep', 'Próximo passo']
        ].map(([key, label]) => (
          <input
            key={key}
            required
            value={(form as any)[key]}
            onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            placeholder={label}
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          />
        ))}
        <button type="submit" className="w-full rounded-full bg-[#0D3D2F] text-white py-3 font-semibold">Criar caso</button>
      </form>
    </PageShell>
  );
};

const AcademyCaseDetail = ({ cases }: { cases: AcademyCase[] }) => {
  const { id } = useParams();
  const currentCase = cases.find((item) => item.id === id);

  if (!currentCase) {
    return <PageShell><p className="text-sm text-slate-500">Caso não encontrado.</p></PageShell>;
  }

  return (
    <PageShell>
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-slate-100 space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">{currentCase.patientName}</h1>
        <p className="text-slate-600">{currentCase.procedure}</p>
        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
          <p>Disciplina: {currentCase.discipline}</p>
          <p>Professor: {currentCase.professor}</p>
          <p>Status: {currentCase.status}</p>
          <p>Etapa: {currentCase.currentStage || 'Em avaliação'}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3 space-y-1 text-sm">
          <p><strong>Próximo passo:</strong> {currentCase.nextStep}</p>
          <p><strong>Próxima consulta:</strong> {currentCase.nextAppointmentLabel}</p>
          <p><strong>Última evolução:</strong> {currentCase.lastEvolution}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <Link to="/academy/checklist/appointment-laura" className="w-full text-center rounded-full bg-[#0D3D2F] text-white py-3 font-semibold">Preparar atendimento</Link>
        <button className="w-full rounded-full bg-white border border-slate-200 py-3 font-semibold text-slate-700">Registrar evolução</button>
        <button className="w-full rounded-full bg-white border border-slate-200 py-3 font-semibold text-slate-700">Marcar retorno</button>
      </div>
    </PageShell>
  );
};

const AcademyChecklist = ({ appointments, checklistItems, onReady }: { appointments: AcademyAppointment[]; checklistItems: Record<string, ChecklistGroup[]>; onReady: (id: string) => void }) => {
  const { appointmentId = '' } = useParams();
  const appointment = appointments.find((item) => item.id === appointmentId);
  const [groups, setGroups] = useState<ChecklistGroup[]>(checklistItems[appointmentId] || []);

  const { total, done } = useMemo(() => groups.reduce((acc, group) => {
    acc.total += group.items.length;
    acc.done += group.items.filter((item) => item.done).length;
    return acc;
  }, { total: 0, done: 0 }), [groups]);

  const toggleItem = (groupId: string, itemId: string) => {
    setGroups((previous) => previous.map((group) => {
      if (group.id !== groupId) return group;
      return {
        ...group,
        items: group.items.map((item) => item.id === itemId ? { ...item, done: !item.done } : item)
      };
    }));
  };

  if (!appointment) {
    return <PageShell><p className="text-sm text-slate-500">Checklist indisponível para este atendimento.</p></PageShell>;
  }

  return (
    <PageShell>
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Antes de atender</h1>
        <p className="text-sm text-slate-500">Confira o essencial antes da clínica.</p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-2">
        <div className="flex items-center justify-between text-sm text-slate-600">
          <p>{done} de {total} itens concluídos</p>
          <Clock size={15} />
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div className="h-full bg-emerald-500" style={{ width: `${total ? Math.round((done / total) * 100) : 0}%` }} />
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.id} className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
          <h3 className="font-semibold text-slate-900">{group.title}</h3>
          {group.items.map((item) => (
            <button key={item.id} onClick={() => toggleItem(group.id, item.id)} className="w-full flex items-center gap-3 text-left">
              <span className={`w-5 h-5 rounded-md border flex items-center justify-center ${item.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent'}`}><Check size={12} /></span>
              <span className="text-sm text-slate-700">{item.label}</span>
            </button>
          ))}
        </div>
      ))}

      <button onClick={() => onReady(appointment.id)} className="w-full rounded-full bg-[#0D3D2F] text-white py-3 font-semibold">Estou pronto para atender</button>
    </PageShell>
  );
};

const AcademyContents = () => (
  <PageShell>
    <div className="space-y-1">
      <h1 className="text-2xl font-bold tracking-tight">Academy</h1>
      <p className="text-sm text-slate-500">Conteúdos práticos para sua jornada na clínica.</p>
    </div>

    <div className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm space-y-2">
      <p className="text-xs text-emerald-700 font-semibold">Destaque</p>
      <h2 className="text-lg font-semibold">Checklist da primeira clínica</h2>
      <p className="text-sm text-slate-600">Tudo o que você precisa conferir antes de atender.</p>
      <button className="rounded-full bg-[#0D3D2F] text-white px-4 py-2 text-sm font-semibold">Ver conteúdo</button>
    </div>

    <div className="grid grid-cols-2 gap-2">
      {['Dentística', 'Endodontia', 'Cirurgia', 'Biossegurança'].map((module, index) => (
        <div key={module} className={`rounded-2xl p-4 text-sm font-semibold ${index % 2 === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{module}</div>
      ))}
    </div>

    <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm space-y-2">
      <h3 className="font-semibold">Continue aprendendo</h3>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-700">Passo a passo de anamnese</p>
          <p className="text-xs text-slate-500">5 min · Leitura rápida</p>
        </div>
        <CheckCircle2 size={18} className="text-emerald-600" />
      </div>
    </div>
  </PageShell>
);

const AcademyMore = () => (
  <PageShell>
    <h1 className="text-2xl font-bold tracking-tight">Mais</h1>

    <div className="rounded-3xl bg-white p-5 border border-slate-100 shadow-sm flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">SG</div>
      <div>
        <h2 className="font-semibold text-slate-900">Samuel Godoy</h2>
        <p className="text-sm text-slate-600">Estudante de Odontologia</p>
        <p className="text-xs text-slate-500">7º período · Faculdade</p>
      </div>
    </div>

    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-100">
      {['Minha faculdade', 'Disciplinas', 'Professores', 'Modelos de evolução', 'Configurações', 'Termos e privacidade'].map((item) => (
        <button key={item} className="w-full px-4 py-3 text-left text-sm text-slate-700">{item}</button>
      ))}
    </div>
  </PageShell>
);

export const AcademyExperience = () => {
  const [academyCases, setAcademyCases] = useState<AcademyCase[]>(initialCases);
  const [academyAppointments, setAcademyAppointments] = useState<AcademyAppointment[]>(initialAppointments);

  const handleReady = (appointmentId: string) => {
    setAcademyAppointments((prev) => prev.map((appointment) => appointment.id === appointmentId ? { ...appointment, status: 'em atendimento' } : appointment));
  };

  return (
    <Routes>
      <Route path="/" element={<AcademyHome nextAppointment={academyAppointments[0]} />} />
      <Route path="/agenda" element={<AcademyAgenda appointments={academyAppointments} />} />
      <Route path="/casos" element={<AcademyCases cases={academyCases} />} />
      <Route path="/casos/novo" element={<AcademyCaseNew onCreateCase={(newCase) => setAcademyCases((prev) => [newCase, ...prev])} />} />
      <Route path="/casos/:id" element={<AcademyCaseDetail cases={academyCases} />} />
      <Route path="/checklist/:appointmentId" element={<AcademyChecklist appointments={academyAppointments} checklistItems={initialChecklistItems} onReady={handleReady} />} />
      <Route path="/conteudos" element={<AcademyContents />} />
      <Route path="/mais" element={<AcademyMore />} />
    </Routes>
  );
};
