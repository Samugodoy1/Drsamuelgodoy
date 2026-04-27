import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, X } from '../icons';
import type { UrgencyLevel } from '../hooks/usePatientMoment';

export type ConversationStep = 0 | 1 | 2 | 3;

export interface ConversationState {
  step: ConversationStep;
  answers: {
    complaint?: 'dor' | 'estética' | 'alinhamento' | 'limpeza' | 'outro';
    desiredPeriod?: 'manha' | 'tarde' | 'noite' | 'primeiro_disponivel';
    observation?: string;
    readyToSchedule?: boolean;
  };
}

interface GuidedConversationProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleRequest: (payload: {
    complaint: string;
    desiredPeriod: string;
    observation?: string;
    isUrgent?: boolean;
  }) => void;
  isSubmitting?: boolean;
  urgency?: UrgencyLevel;
  hasActivePostOperative?: boolean;
  postOperativeDaysElapsed?: number;
}

export function GuidedConversation({
  isOpen,
  onClose,
  onScheduleRequest,
  isSubmitting = false,
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

  const handlePeriodSelect = (period: ConversationState['answers']['desiredPeriod']) => {
    setState(prev => ({
      ...prev,
      answers: { ...prev.answers, desiredPeriod: period },
      step: 2
    }));
  };

  const handleScheduleConfirm = () => {
    const { complaint, desiredPeriod, observation } = state.answers;
    if (!complaint || !desiredPeriod) return;

    onScheduleRequest({
      complaint,
      desiredPeriod,
      observation,
      isUrgent: complaint === 'dor'
    });

    setState({ step: 3, answers: { ...state.answers, readyToSchedule: true } });
  };

  if (!isOpen) return null;

  const complaintOptions = [
    { value: 'dor' as const, label: 'Dor urgente', icon: '😣' },
    { value: 'limpeza' as const, label: 'Limpeza / Check-up', icon: '🦷' },
    { value: 'estética' as const, label: 'Estética', icon: '✨' },
    { value: 'alinhamento' as const, label: 'Ortodontia / Alinhamento', icon: '📐' },
    { value: 'outro' as const, label: 'Outro', icon: '💭' },
  ];

  const periodOptions = [
    { value: 'manha' as const, label: 'Manhã' },
    { value: 'tarde' as const, label: 'Tarde' },
    { value: 'noite' as const, label: 'Noite' },
    { value: 'primeiro_disponivel' as const, label: 'Primeiro horário disponível' },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />

        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full bg-white rounded-t-3xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-6 pt-4">
            <div className="w-10 h-1 bg-[#E5E5EA] rounded-full" />
            <button onClick={onClose} className="p-2 -mr-2 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="px-6 py-8 pb-12 max-h-[80vh] overflow-y-auto">
            <AnimatePresence mode="wait">
              {state.step === 0 && (
                <motion.div key="step-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-8">O que está incomodando?</h2>
                  <div className="space-y-3">
                    {complaintOptions.map(option => (
                      <motion.button key={option.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handleComplaintSelect(option.value)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#E5E5EA] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <span className="text-[20px]">{option.icon}</span>
                          <span className="text-[#1C1C1E] text-[16px] font-semibold text-left">{option.label}</span>
                        </div>
                        <ChevronRight size={18} className="text-[#C6C6C8]" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {state.step === 1 && (
                <motion.div key="step-1" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-2">Qual o melhor período?</h2>
                  <p className="text-[#8E8E93] text-[15px] mb-8">Escolha sua preferência de atendimento</p>
                  <div className="space-y-3">
                    {periodOptions.map(option => (
                      <motion.button key={option.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => handlePeriodSelect(option.value)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl border-2 border-[#E5E5EA] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all duration-200">
                        <span className="text-[#1C1C1E] text-[16px] font-semibold text-left">{option.label}</span>
                        <ChevronRight size={18} className="text-[#C6C6C8]" />
                      </motion.button>
                    ))}
                  </div>
                  <motion.button onClick={() => setState(prev => ({ ...prev, step: 0 }))}
                    className="mt-8 w-full text-[#0C9B72] text-[15px] font-semibold py-3 hover:opacity-70 transition-opacity">
                    ← Voltar
                  </motion.button>
                </motion.div>
              )}

              {state.step === 2 && (
                <motion.div key="step-2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                  <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-3">Confirmar solicitação</h2>
                  <p className="text-[#8E8E93] text-[14px] mb-6">Você pode adicionar uma observação opcional antes de enviar.</p>

                  <textarea
                    placeholder="Ex.: dor no lado direito, preferência por WhatsApp..."
                    value={state.answers.observation || ''}
                    onChange={(e) => setState(prev => ({ ...prev, answers: { ...prev.answers, observation: e.target.value } }))}
                    rows={4}
                    className="w-full p-3 rounded-xl border border-[#E5E5EA] text-[14px] outline-none focus:border-[#0C9B72]/40"
                  />

                  {(state.answers.complaint === 'dor' || (hasActivePostOperative && state.answers.complaint === 'dor')) && (
                    <p className="text-[#FF3B30] text-[13px] font-semibold mt-3">🚨 Pedido enviado com prioridade clínica.</p>
                  )}

                  {hasActivePostOperative && postOperativeDaysElapsed >= 0 && (
                    <p className="text-[#8E8E93] text-[12px] mt-2">Pós-operatório ativo há {postOperativeDaysElapsed} dia(s).</p>
                  )}

                  <div className="space-y-3 mt-6">
                    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={handleScheduleConfirm} disabled={isSubmitting}
                      className="w-full h-12 rounded-full text-white text-[15px] font-semibold tracking-tight bg-gradient-to-r from-[#0C9B72] to-[#0A7D5C] disabled:opacity-50">
                      {isSubmitting ? 'Enviando...' : 'Confirmar solicitação'}
                    </motion.button>
                    <motion.button onClick={() => setState(prev => ({ ...prev, step: 1 }))} disabled={isSubmitting}
                      className="w-full h-12 rounded-full border-2 border-[#0C9B72]/30 text-[#1C1C1E] text-[15px] font-semibold tracking-tight disabled:opacity-50">
                      Voltar
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {state.step === 3 && (
                <motion.div key="step-3" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="text-center py-12">
                  <div className="w-16 h-16 bg-[#34C759] rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-[32px]">✓</span>
                  </div>
                  <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mb-3">Solicitação enviada!</h2>
                  <p className="text-[#8E8E93] text-[15px] leading-relaxed mb-8">A clínica recebeu seu pedido e vai retornar em breve.</p>
                  <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.95 }} onClick={onClose}
                    className="w-full h-12 rounded-full bg-[#0C9B72]/10 text-[#0C9B72] text-[15px] font-semibold tracking-tight hover:bg-[#0C9B72]/20 transition-all">
                    Voltar à Home
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
