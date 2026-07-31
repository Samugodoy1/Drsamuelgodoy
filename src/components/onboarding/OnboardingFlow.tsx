import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles, Check, Phone, Plus, ClipboardList, MessageCircle } from '../../icons';

// OdontoHub Core green — used for the immersive welcome/closing screens.
const CORE_GREEN = '#1B4D3E';

interface OnboardingFlowProps {
  userName: string;
  /** App-level authenticated fetch (injects token + x-product). */
  apiFetch: (url: string, options?: any) => Promise<Response>;
  /** Re-pull patients/appointments/finance so the home reflects the new state. */
  refreshAppData: () => Promise<void>;
  /** Persist onboarding_completed for the odontohub product. */
  markComplete: () => Promise<void> | void;
  /** Send the user to their (now real) home and close the flow. */
  goToDashboard: () => void;
}

type Step = 'welcome' | 'home' | 'form' | 'portal' | 'done';

const easing = [0.16, 1, 0.3, 1] as const;

// Staggered, settle-into-place reveal used on the immersive welcome screen.
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: easing } },
};

const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || '';

export function OnboardingFlow({
  userName,
  apiFetch,
  refreshAppData,
  markComplete,
  goToDashboard,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Form state (Etapa 2)
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showMore, setShowMore] = useState(false);
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const greetingName = firstName(userName);

  // ── Etapa 0 → 1: seed demo, then reveal the real (now alive) home ──────────
  // The seed endpoint is idempotent and atomic: reopening the onboarding never
  // duplicates data nor leaves the home half-populated.
  const handleStart = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/onboarding/demo-seed', {
        method: 'POST',
        product: 'odontohub',
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('seed failed');
      await refreshAppData();
      setStep('home');
    } catch (e) {
      setError('Não consegui montar a demonstração agora. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  // ── "Prefiro explorar sozinho": skip, no demo seeded ───────────────────────
  const handleSkip = async () => {
    setBusy(true);
    try {
      await markComplete();
      goToDashboard();
    } finally {
      setBusy(false);
    }
  };

  // ── Etapa 2: create the first REAL patient (backend retires the demo) ───────
  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await apiFetch('/api/patients', {
        method: 'POST',
        product: 'odontohub',
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          cpf: cpf.trim() || undefined,
          birth_date: birthDate || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'create failed');
      }
      await refreshAppData();
      // Persist completion now (not only on the final button): the real patient
      // already exists and the backend has retired the demo, so a refresh/close
      // before "Ver minha home" must NOT restart the flow nor re-seed demo.
      await markComplete();
      setStep('portal');
    } catch (e: any) {
      setError(e?.message || 'Não consegui criar o paciente. Tente novamente.');
    } finally {
      setBusy(false);
    }
  };

  // ── Etapa 3 → home (completion was already persisted at patient creation) ───
  const handleFinish = () => {
    goToDashboard();
  };

  // ─── Etapa 1: non-blocking chrome over the REAL home ───────────────────────
  if (step === 'home') {
    return (
      <>
        {/* Faixa fixa, discreta, NÃO bloqueante */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easing }}
          className="fixed top-0 inset-x-0 z-[120] flex justify-center px-3 pt-[max(8px,env(safe-area-inset-top))] pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-[#1B4D3E] text-white/95 shadow-md shadow-black/10 px-3 py-1.5 max-w-[440px] w-full">
            <span className="text-[11px] leading-none shrink-0">🟢</span>
            <p className="text-[11.5px] font-medium leading-tight">
              Demonstração — é assim que o OdontoHub vai funcionar com seus pacientes reais.
            </p>
          </div>
        </motion.div>

        {/* Rodapé fixo: "Gostou? Agora é a sua vez." — acima do menu inferior */}
        <motion.div
          initial={{ y: 56, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.15 }}
          className="fixed bottom-0 inset-x-0 z-[120] flex justify-center px-3 pb-[calc(84px+env(safe-area-inset-bottom))] pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-[16px] bg-white/95 backdrop-blur-sm shadow-lg shadow-black/10 border border-slate-100 px-4 py-2.5 max-w-[460px] w-full">
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 leading-tight">Gostou? Agora é a sua vez.</p>
              <p className="text-[11.5px] text-slate-500 mt-0.5 leading-snug">
                Criar seu primeiro paciente remove a demonstração.
              </p>
            </div>
            <button
              onClick={() => setStep('form')}
              aria-label="Criar meu primeiro paciente"
              className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-primary text-white rounded-[12px] font-semibold text-[13px] px-3.5 py-2.5 hover:opacity-95 active:scale-[0.98] transition-all"
            >
              Criar paciente
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      </>
    );
  }

  // ─── Full-screen steps (welcome / form / done) ─────────────────────────────
  return (
    <div className="fixed inset-0 z-[130] overflow-y-auto">
      <AnimatePresence mode="wait">
        {/* ── Etapa 0 — Boas-vindas ── */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.35, ease: easing } }}
            transition={{ duration: 0.5, ease: easing }}
            className="relative min-h-full flex items-center justify-center px-6 py-16 text-white overflow-hidden"
            style={{ backgroundColor: CORE_GREEN }}
          >
            {/* Depth: soft top glow + grounding vignette so the flat green reads
                as a crafted surface rather than a plain fill. */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(125% 80% at 50% -15%, rgba(86,170,135,0.45) 0%, rgba(27,77,62,0) 58%)' }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: 'radial-gradient(100% 65% at 50% 118%, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0) 62%)' }}
            />

            <motion.div
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.08 } } }}
              initial="hidden"
              animate="show"
              className="relative max-w-[420px] w-full text-center"
            >
              {/* Crafted product mark — frosted glass tile + wordmark */}
              <motion.div variants={fadeUp} className="mx-auto mb-9 flex flex-col items-center gap-3.5">
                <div className="w-16 h-16 rounded-[20px] bg-white/10 ring-1 ring-white/15 backdrop-blur-md flex items-center justify-center shadow-[0_12px_40px_rgba(0,0,0,0.28)]">
                  <Plus size={30} strokeWidth={3} className="text-white" />
                </div>
                <span className="text-[11px] font-semibold tracking-[0.22em] uppercase text-white/45">
                  OdontoHub
                </span>
              </motion.div>

              <motion.h1
                variants={fadeUp}
                className="text-[34px] sm:text-[40px] font-semibold tracking-[-1px] leading-[1.07]"
              >
                Bem-vindo,
                <br />
                Dr(a). {greetingName}.
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-5 text-[17px] text-white/65 leading-relaxed max-w-[342px] mx-auto"
              >
                Antes de começar, deixa eu te mostrar como vai ser seu dia a dia aqui.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-11 space-y-4">
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="group w-full inline-flex items-center justify-center gap-2 bg-white text-[#1B4D3E] rounded-full font-semibold text-[16px] px-6 py-4 shadow-[0_10px_40px_rgba(0,0,0,0.22)] hover:shadow-[0_16px_52px_rgba(0,0,0,0.30)] hover:-translate-y-px active:translate-y-0 active:scale-[0.99] transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  {busy ? 'Preparando seu consultório…' : 'Ver meu consultório funcionando'}
                  {!busy && (
                    <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                  )}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={busy}
                  className="block w-full text-[13.5px] text-white/50 hover:text-white/80 transition-colors disabled:opacity-50"
                >
                  Prefiro explorar sozinho
                </button>
                {error && <p className="text-[13px] text-rose-200">{error}</p>}
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Etapa 2 — Primeiro paciente real ── */}
        {step === 'form' && (
          <motion.div
            key="form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: easing }}
            className="min-h-full flex items-center justify-center px-6 py-16 bg-[#F8FAFC]"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easing }}
              className="max-w-md w-full"
            >
              <div className="mb-8">
                <h1 className="text-[26px] font-semibold text-slate-900 tracking-[-0.4px]">
                  Vamos criar seu primeiro paciente.
                </h1>
                <p className="mt-2 text-[15px] text-slate-500">
                  É o suficiente para a home passar a ser sua.
                </p>
              </div>

              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">Nome</label>
                  <input
                    autoFocus
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Maria Silva"
                    className="w-full h-[50px] px-4 bg-white border border-slate-200 rounded-[12px] text-base text-slate-900 placeholder-slate-300 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(12,155,114,0.08)] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-600 mb-2">Telefone</label>
                  <div className="relative">
                    <Phone size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full h-[50px] pl-11 pr-4 bg-white border border-slate-200 rounded-[12px] text-base text-slate-900 placeholder-slate-300 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(12,155,114,0.08)] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex items-center gap-1.5 text-[13px] font-medium text-primary hover:opacity-80 transition-opacity"
                >
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${showMore ? 'rotate-180' : ''}`}
                  />
                  adicionar mais detalhes
                </button>

                <AnimatePresence initial={false}>
                  {showMore && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: easing }}
                      className="overflow-hidden space-y-4"
                    >
                      <div className="pt-1">
                        <label className="block text-[13px] font-medium text-slate-600 mb-2">E-mail</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="maria@email.com"
                          className="w-full h-[50px] px-4 bg-white border border-slate-200 rounded-[12px] text-base text-slate-900 placeholder-slate-300 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(12,155,114,0.08)] transition-all"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 mb-2">CPF</label>
                          <input
                            type="text"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                            placeholder="000.000.000-00"
                            className="w-full h-[50px] px-4 bg-white border border-slate-200 rounded-[12px] text-base text-slate-900 placeholder-slate-300 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(12,155,114,0.08)] transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[13px] font-medium text-slate-600 mb-2">Nascimento</label>
                          <input
                            type="date"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                            className="w-full h-[50px] px-4 bg-white border border-slate-200 rounded-[12px] text-base text-slate-900 outline-none focus:border-primary focus:shadow-[0_0_0_4px_rgba(12,155,114,0.08)] transition-all"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <p className="text-[13px] text-slate-400 pt-1">
                  Só o essencial agora. O resto você completa quando quiser.
                </p>

                {error && <p className="text-[13px] text-rose-600">{error}</p>}

                <button
                  type="submit"
                  disabled={busy || !name.trim() || !phone.trim()}
                  className="w-full inline-flex items-center justify-center gap-2 bg-primary text-white rounded-[16px] font-semibold text-[16px] px-6 py-4 hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 mt-2"
                >
                  {busy ? 'Criando…' : 'Criar paciente'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── Etapa 3 — Portal do paciente + pré-atendimento ── */}
        {step === 'portal' && (
          <motion.div
            key="portal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: easing }}
            className="min-h-full flex items-center justify-center px-6 py-16 bg-[#F8FAFC]"
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easing }}
              className="max-w-md w-full"
            >
              <div className="mb-8">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-[12px] font-semibold mb-4">
                  <Check size={13} /> Paciente criado
                </div>
                <h1 className="text-[26px] font-semibold text-slate-900 tracking-[-0.4px] leading-tight">
                  Antes da consulta, deixe o paciente fazer a parte dele.
                </h1>
                <p className="mt-2 text-[15px] text-slate-500">
                  Dois links que você gera direto do prontuário — em segundos.
                </p>
              </div>

              <div className="space-y-3">
                {/* Pré-Atendimento */}
                <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-[12px] bg-emerald-50 flex items-center justify-center shrink-0">
                      <ClipboardList size={19} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-slate-900">Link de Pré-Atendimento</h3>
                      <p className="mt-1 text-[13.5px] text-slate-500 leading-relaxed">
                        O paciente preenche a ficha, aceita os termos e envia documentos online <strong className="font-semibold text-slate-600">antes</strong> da primeira consulta. Você recebe tudo pronto — zero papel, atendimento mais rápido.
                      </p>
                    </div>
                  </div>
                </div>
                {/* Portal do Paciente */}
                <div className="rounded-[18px] bg-white border border-slate-100 shadow-sm p-5">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-[12px] bg-blue-50 flex items-center justify-center shrink-0">
                      <MessageCircle size={19} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-semibold text-slate-900">Portal do Paciente</h3>
                      <p className="mt-1 text-[13.5px] text-slate-500 leading-relaxed">
                        Ele agenda e confirma consultas, envia documentos, conversa com você e acompanha pagamentos — sem o telefone tocando o dia todo.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-start gap-2 text-[13px] text-slate-400 leading-relaxed">
                <Sparkles size={15} className="text-primary shrink-0 mt-0.5" />
                <span>Você encontra os dois no prontuário de cada paciente, no botão "Link Portal do Paciente".</span>
              </div>

              <button
                onClick={() => setStep('done')}
                className="mt-7 w-full inline-flex items-center justify-center gap-2 bg-primary text-white rounded-[16px] font-semibold text-[16px] px-6 py-4 hover:opacity-95 active:scale-[0.98] transition-all"
              >
                Entendi, continuar
                <ArrowRight size={18} />
              </button>
            </motion.div>
          </motion.div>
        )}

        {/* ── Etapa 4 — Fechamento ── */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easing }}
            className="min-h-full flex items-center justify-center px-6 py-16 text-white"
            style={{ backgroundColor: CORE_GREEN }}
          >
            <div className="max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: easing }}
                className="mx-auto mb-10 w-16 h-16 rounded-full bg-white/12 flex items-center justify-center"
              >
                <Check size={30} className="text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5, ease: easing }}
                className="text-[30px] sm:text-[34px] font-semibold tracking-[-0.6px] leading-tight"
              >
                Pronto, Dr(a). {greetingName}. Seu consultório está montado.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.5, ease: easing }}
                className="mt-4 text-[16px] text-white/75 leading-relaxed"
              >
                A partir de agora, o OdontoHub vai te avisar quando um paciente precisar de você,
                sugerir encaixes e cuidar do que costuma escapar.
              </motion.p>
              <motion.button
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.5, ease: easing }}
                onClick={handleFinish}
                disabled={busy}
                className="mt-12 w-full inline-flex items-center justify-center gap-2.5 bg-white text-[#1B4D3E] rounded-[18px] font-semibold text-[16px] px-6 py-4.5 hover:bg-white/95 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                Ver minha home
                <ArrowRight size={19} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default OnboardingFlow;
