import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X, AlertCircle } from '../icons';
import type { UrgencyLevel } from '../hooks/usePatientMoment';

export type ConversationStep = 0 | 1 | 2 | 'urgency' | 3 | 4;

export interface ConversationState {
  step: ConversationStep;
  answers: {
    complaint?: 'dor' | 'estética' | 'alinhamento' | 'limpeza' | 'outro';
    duration?: 'hoje' | 'dias' | 'semanas' | 'meses';
    isUrgent?: boolean; // Se quer encaixe imediato
    readyToSchedule?: boolean;
  };
}

interface GuidedConversationProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleRequest: (complaint: string, duration: string, isUrgent?: boolean) => void;
  isSubmitting?: boolean;
  // Contexto adaptativo
  urgency?: UrgencyLevel;
  hasActivePostOperative?: boolean;
  postOperativeDaysElapsed?: number;
}

export function GuidedConversation({
  isOpen,
  onClose,
  onScheduleRequest,
  isSubmitting = false,
  urgency = 'low',
  hasActivePostOperative = false,
  postOperativeDaysElapsed = 0,
}: GuidedConversationProps) {
  const [state, setState] = useState<ConversationState>({
    step: 0,
    answers: {}
  });

  useEffect(() => {
    if (!isOpen) {
      setState({ step: 0, answers: {} });
    }
  }, [isOpen]);

  const handleComplaintSelect = (complaint: ConversationState['answers']['complaint']) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, complaint },
      step: 1
    }));
  };

  const handleDurationSelect = (duration: ConversationState['answers']['duration']) => {
    const complaint = state.answers.complaint;
    
    // ─── LÓGICA ADAPTATIVA ───
    // Se "dor" + "hoje" → oferecer urgência
    if (complaint === 'dor' && duration === 'hoje') {
      setState(prev => ({
        ...prev,
        answers: { ...prev.answers, duration },
        step: 'urgency' as ConversationStep
      }));
    } else {
      // Fluxo normal
      setState(prev => ({
        ...prev,
        answers: { ...prev.answers, duration },
        step: 2
      }));
    }
  };

  const handleUrgencySelect = (isUrgent: boolean) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, isUrgent },
      step: 2
    }));
  };

  const handleScheduleConfirm = () => {
    const { complaint, duration, isUrgent } = state.answers;
    if (complaint && duration) {
      onScheduleRequest(complaint, duration, isUrgent);
      setState({ step: 3, answers: { ...state.answers, readyToSchedule: true } });
    }
  };

  const handlePostOperativeConfirm = () => {
    const { complaint, duration } = state.answers;
    if (complaint === 'dor' && duration === 'hoje') {
      // Pós-op com dor aguda
      onScheduleRequest(complaint, duration, true);
    } else {
      onScheduleRequest(complaint, duration, false);
    }
    setState({ step: 4, answers: { ...state.answers, readyToSchedule: true } });
  };

  if (!isOpen) return null;

  const complaintOptions = [
    { value: 'dor' as const, label: 'Dor ou desconforto', icon: '😣' },
    { value: 'estética' as const, label: 'Estética / Aparência', icon: '✨' },
    { value: 'alinhamento' as const, label: 'Alinhamento', icon: '📐' },
    { value: 'limpeza' as const, label: 'Limpeza / Check-up', icon: '🦷' },
    { value: 'outro' as const, label: 'Outro motivo', icon: '💭' },
  ];

  const durationOptions = [
    { value: 'hoje' as const, label: 'Hoje' },
    { value: 'dias' as const, label: 'Nos últimos dias' },
    { value: 'semanas' as const, label: 'Há algumas semanas' },
    { value: 'meses' as const, label: 'Há meses' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full bg-white rounded-t-3xl overflow-hidden"
          >
            {/* Handle + Close */}
            <div className="flex items-center justify-between px-6 pt-4">
              <div className="w-10 h-1 bg-[#E5E5EA] rounded-full" />
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-8 pb-12 max-h-[80vh] overflow-y-auto">
              <AnimatePresence mode="wait">
                {/* Step 0: O que está incomodando? */}
                {state.step === 0 && (
                  <motion.div
                    key="step-0"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-8">
                      O que está incomodando?
                    </h2>
                    <div className="space-y-3">
                      {complaintOptions.map(option => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleComplaintSelect(option.value)}
                          className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#E5E5EA] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all duration-200"
                        >
                          <div className="flex items-center gap-4">
                            <span className="text-[20px]">{option.icon}</span>
                            <span className="text-[#1C1C1E] text-[16px] font-semibold text-left">
                              {option.label}
                            </span>
                          </div>
                          <ChevronRight size={18} className="text-[#C6C6C8]" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Step 1: Há quanto tempo? */}
                {state.step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-2">
                      Há quanto tempo?
                    </h2>
                    <p className="text-[#8E8E93] text-[15px] mb-8">
                      Isso nos ajuda a entender melhor sua situação
                    </p>
                    <div className="space-y-3">
                      {durationOptions.map(option => (
                        <motion.button
                          key={option.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleDurationSelect(option.value)}
                          className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#E5E5EA] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all duration-200"
                        >
                          <span className="text-[#1C1C1E] text-[16px] font-semibold text-left">
                            {option.label}
                          </span>
                          <ChevronRight size={18} className="text-[#C6C6C8]" />
                        </motion.button>
                      ))}
                    </div>

                    <motion.button
                      onClick={() => setState(prev => ({ ...prev, step: 0 }))}
                      className="mt-8 w-full text-[#0C9B72] text-[15px] font-semibold py-3 hover:opacity-70 transition-opacity"
                    >
                      ← Voltar
                    </motion.button>
                  </motion.div>
                )}

                {/* Step urgency: Precisa de urgência? (somente para dor + hoje) */}
                {state.step === 'urgency' && state.answers.complaint === 'dor' && state.answers.duration === 'hoje' && (
                  <motion.div
                    key="step-urgency"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-8">
                      <div className="flex items-start gap-3 mb-6">
                        <div className="w-10 h-10 bg-[#FF3B30]/10 rounded-full flex items-center justify-center shrink-0">
                          <AlertCircle size={20} className="text-[#FF3B30]" />
                        </div>
                        <div>
                          <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight">
                            Precisa de atendimento urgente?
                          </h2>
                          <p className="text-[#8E8E93] text-[15px] mt-2">
                            Se a dor é intensa, podemos tentar encaixar você mais rapidamente
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUrgencySelect(true)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#FF3B30]/30 hover:border-[#FF3B30] hover:bg-[#FF3B30]/5 bg-[#FF3B30]/[0.02] transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[20px]">🚨</span>
                          <div className="text-left">
                            <p className="text-[#FF3B30] text-[16px] font-semibold">
                              Sim, é urgente
                            </p>
                            <p className="text-[#8E8E93] text-[13px]">Tente encaixe hoje</p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-[#C6C6C8]" />
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleUrgencySelect(false)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#0C9B72]/30 hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all duration-200"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[20px]">📅</span>
                          <div className="text-left">
                            <p className="text-[#0C9B72] text-[16px] font-semibold">
                              Não, pode ser em breve
                            </p>
                            <p className="text-[#8E8E93] text-[13px]">Próximos dias</p>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-[#C6C6C8]" />
                      </motion.button>
                    </div>

                    <motion.button
                      onClick={() => setState(prev => ({ ...prev, step: 1 }))}
                      className="mt-8 w-full text-[#0C9B72] text-[15px] font-semibold py-3 hover:opacity-70 transition-opacity"
                    >
                      ← Voltar
                    </motion.button>
                  </motion.div>
                )}

                {/* Step 2: Confirmação e agendamento (adaptativo) */}
                {state.step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="mb-10">
                      <h2 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight mb-8">
                        {hasActivePostOperative && state.answers.complaint === 'dor' ? 'Vamos cuidar!' : 'Perfeito!'}
                      </h2>

                      {/* Caixa de contexto adaptativa */}
                      {hasActivePostOperative && state.answers.complaint === 'dor' ? (
                        <div className="bg-[#FF9500]/5 rounded-2xl p-6 mb-6 border border-[#FF9500]/10">
                          <p className="text-[#1C1C1E] text-[15px] leading-relaxed">
                            Entendi que você está com{' '}
                            <span className="font-semibold">dor no pós-operatório</span>
                            {postOperativeDaysElapsed && postOperativeDaysElapsed <= 1 
                              ? ` (recém operado)`
                              : ` (há alguns dias)`}.
                          </p>
                          <p className="text-[#FF9500] text-[14px] font-semibold mt-3">
                            🏥 Vamos marcar uma avaliação rápida
                          </p>
                        </div>
                      ) : (
                        <div className="bg-[#0C9B72]/5 rounded-2xl p-6 mb-6 border border-[#0C9B72]/10">
                          <p className="text-[#1C1C1E] text-[15px] leading-relaxed">
                            Entendi. Vou marcar um horário pra gente avaliar sua{' '}
                            <span className="font-semibold">
                              {state.answers.complaint === 'dor' && 'dor'}
                              {state.answers.complaint === 'estética' && 'estética'}
                              {state.answers.complaint === 'alinhamento' && 'alinhamento'}
                              {state.answers.complaint === 'limpeza' && 'limpeza'}
                              {state.answers.complaint === 'outro' && 'situação'}
                            </span>
                            {' '}
                            {state.answers.duration === 'hoje' && 'que começou hoje'}
                            {state.answers.duration === 'dias' && 'que vem ocorrendo nos últimos dias'}
                            {state.answers.duration === 'semanas' && 'que vem incomodando há semanas'}
                            {state.answers.duration === 'meses' && 'que vem acontecendo há meses'}
                            .
                          </p>
                          {state.answers.isUrgent && (
                            <p className="text-[#FF3B30] text-[14px] font-semibold mt-3">
                              🚨 Tentaremos agendar hoje ou amanhã
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-[#8E8E93] text-[14px] leading-relaxed">
                        {hasActivePostOperative && state.answers.complaint === 'dor'
                          ? 'A clínica entrará em contato em breve com um horário prioritário.'
                          : state.answers.isUrgent
                          ? 'Você receberá um link para confirmar o horário hoje ou amanhã.'
                          : 'Você receberá um link para confirmar o horário em breve.'
                        }
                      </p>
                    </div>

                    <div className="space-y-3">
                      <motion.button
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleScheduleConfirm}
                        disabled={isSubmitting}
                        className={`w-full h-12 rounded-full text-white text-[15px] font-semibold tracking-tight active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center ${
                          state.answers.isUrgent || (hasActivePostOperative && state.answers.complaint === 'dor')
                            ? 'bg-gradient-to-r from-[#FF3B30] to-[#FF1744]'
                            : 'bg-gradient-to-r from-[#0C9B72] to-[#0A7D5C]'
                        }`}
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
                        ) : state.answers.isUrgent || (hasActivePostOperative && state.answers.complaint === 'dor')
                        ? 'Priorizar Urgência'
                        : 'Agendar'
                        }
                      </motion.button>

                      <motion.button
                        onClick={() => setState(prev => ({ ...prev, step: 1 }))}
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-full border-2 border-[#0C9B72]/30 text-[#1C1C1E] text-[15px] font-semibold tracking-tight hover:border-[#0C9B72]/60 hover:bg-[#0C9B72]/5 transition-all disabled:opacity-50"
                      >
                        Voltar
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: Sucesso (pós-op) */}
                {state.step === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-16 h-16 bg-[#FF9500] rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <span className="text-[32px]">🏥</span>
                    </motion.div>
                    <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-3">
                      Avaliação agendada!
                    </h2>
                    <p className="text-[#8E8E93] text-[15px] leading-relaxed mb-8">
                      A clínica receberá sua solicitação prioritária e entrará em contato com um horário de avaliação.
                    </p>

                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full h-12 rounded-full bg-[#FF9500]/10 text-[#FF9500] text-[15px] font-semibold tracking-tight hover:bg-[#FF9500]/20 transition-all"
                    >
                      Voltar à Home
                    </motion.button>
                  </motion.div>
                )}

                {/* Step 3: Sucesso */}
                {state.step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                      className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center mx-auto mb-6"
                    >
                      <span className="text-[32px]">✓</span>
                    </motion.div>
                    <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-3">
                      Solicitação enviada!
                    </h2>
                    <p className="text-[#8E8E93] text-[15px] leading-relaxed mb-8">
                      A clínica receberá seu pedido e entrará em contato em breve com as opções de horário.
                    </p>

                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={onClose}
                      className="w-full h-12 rounded-full bg-[#0C9B72]/10 text-[#0C9B72] text-[15px] font-semibold tracking-tight hover:bg-[#0C9B72]/20 transition-all"
                    >
                      Voltar à Home
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
