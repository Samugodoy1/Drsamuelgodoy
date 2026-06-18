import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, Sparkles, Check, Phone } from '../../icons';

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

type Step = 'welcome' | 'home' | 'form' | 'done';

const easing = [0.16, 1, 0.3, 1] as const;

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
      setStep('done');
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
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easing }}
          className="fixed top-0 inset-x-0 z-[120] flex justify-center px-3 pt-3 pointer-events-none"
        >
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-[#1B4D3E] text-white/95 shadow-lg shadow-black/10 px-4 py-2.5 max-w-[640px] w-full">
            <span className="text-[15px] leading-none">🟢</span>
            <p className="text-[13px] font-medium leading-snug">
              Esta é uma demonstração. É assim que o OdontoHub vai funcionar com seus pacientes reais.
            </p>
          </div>
        </motion.div>

        {/* Rodapé fixo: "Gostou? Agora é a sua vez." */}
        <motion.div
          initial={{ y: 64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, ease: easing, delay: 0.15 }}
          className="fixed bottom-0 inset-x-0 z-[120] flex justify-center px-3 pb-4 pointer-events-none"
        >
          <div className="pointer-events-auto flex flex-col sm:flex-row sm:items-center gap-3 rounded-[20px] bg-white shadow-xl shadow-black/10 border border-slate-100 px-5 py-4 max-w-[640px] w-full">
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-slate-900">Gostou? Agora é a sua vez.</p>
              <p className="text-[13px] text-slate-500 mt-0.5">
                Criar seu primeiro paciente remove a demonstração e deixa a home sua.
              </p>
            </div>
            <button
              onClick={() => setStep('form')}
              className="shrink-0 inline-flex items-center justify-center gap-2 bg-primary text-white rounded-[14px] font-semibold px-5 py-3 hover:opacity-95 active:scale-[0.98] transition-all"
            >
              Criar meu primeiro paciente
              <ArrowRight size={18} />
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
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: easing }}
            className="min-h-full flex items-center justify-center px-6 py-16 text-white"
            style={{ backgroundColor: CORE_GREEN }}
          >
            <div className="max-w-md w-full text-center">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, duration: 0.5, ease: easing }}
                className="mx-auto mb-10 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center"
              >
                <Sparkles size={26} className="text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.5, ease: easing }}
                className="text-[32px] sm:text-[36px] font-semibold tracking-[-0.6px] leading-tight"
              >
                Bem-vindo, Dr(a). {greetingName}.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.26, duration: 0.5, ease: easing }}
                className="mt-4 text-[17px] text-white/75 leading-relaxed"
              >
                Antes de começar, deixa eu te mostrar como vai ser seu dia a dia aqui.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36, duration: 0.5, ease: easing }}
                className="mt-12 space-y-5"
              >
                <button
                  onClick={handleStart}
                  disabled={busy}
                  className="w-full inline-flex items-center justify-center gap-2.5 bg-white text-[#1B4D3E] rounded-[18px] font-semibold text-[16px] px-6 py-4.5 hover:bg-white/95 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {busy ? 'Preparando seu consultório…' : 'Ver meu consultório funcionando'}
                  {!busy && <ArrowRight size={19} />}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={busy}
                  className="block w-full text-[14px] text-white/60 hover:text-white/90 transition-colors disabled:opacity-50"
                >
                  Prefiro explorar sozinho
                </button>
                {error && <p className="text-[13px] text-rose-200">{error}</p>}
              </motion.div>
            </div>
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

        {/* ── Etapa 3 — Fechamento ── */}
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
