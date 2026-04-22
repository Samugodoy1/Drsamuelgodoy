import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, CheckCircle2, AlertCircle, Phone, Calendar, MessageCircle, Heart } from '../icons';

interface PostOperativeCheckInProps {
  procedure: string;
  daysSinceProc: number;
  onRequestCallback?: (reason: string) => Promise<void>;
  onRequestAppointment?: (type: 'return' | 'urgent') => Promise<void>;
  onClose?: () => void;
  sessionToken?: string | null;
}

type CheckInStage = 'feeling' | 'symptoms' | 'action' | 'completed';

interface SymptomResponse {
  isComfortable: boolean;
  symptom?: string;
  severity?: 'mild' | 'moderate' | 'severe';
}

export const PostOperativeCheckIn: React.FC<PostOperativeCheckInProps> = ({
  procedure,
  daysSinceProc,
  onRequestCallback,
  onRequestAppointment,
  onClose,
  sessionToken
}) => {
  const [stage, setStage] = useState<CheckInStage>('feeling');
  const [symptomData, setSymptomData] = useState<SymptomResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const getRecoveryMessage = () => {
    if (daysSinceProc === 0) return 'no mesmo dia';
    if (daysSinceProc === 1) return 'há 1 dia';
    return `há ${daysSinceProc} dias`;
  };

  const getSymptomOptions = () => {
    return [
      { id: 'no_issues', label: '✓ Tudo bem, sem problemas', severity: 'none' },
      { id: 'mild_discomfort', label: '⚠ Incômodo leve', severity: 'mild' },
      { id: 'moderate_pain', label: '⚠ Dor moderada', severity: 'moderate' },
      { id: 'severe_pain', label: '🚨 Dor forte', severity: 'severe' },
      { id: 'swelling', label: '⚠ Inchaço', severity: 'mild' },
      { id: 'bleeding', label: '🚨 Sangramento', severity: 'severe' },
      { id: 'fever', label: '🚨 Febre', severity: 'severe' },
      { id: 'other', label: '❓ Outro problema', severity: 'moderate' },
    ];
  };

  const handleFeelingResponse = (isComfortable: boolean) => {
    setSymptomData({ isComfortable });
    
    if (isComfortable) {
      // Se tudo bem: ir para conclusão
      setStage('completed');
    } else {
      // Se não está bem: perguntar o quê
      setStage('symptoms');
    }
  };

  const handleSymptomSelect = async (symptomId: string) => {
    const severity = getSymptomOptions().find(s => s.id === symptomId)?.severity;
    setSymptomData(prev => ({ ...prev, symptom: symptomId, severity: severity as any }));
    
    // Determinar ação baseado na severidade
    if (severity === 'severe' || severity === 'moderate') {
      setStage('action');
    } else {
      // Incômodos leves: confirmação de orientações
      setStage('action');
    }
  };

  const handleActionSelect = async (action: 'call' | 'schedule' | 'later') => {
    setIsSubmitting(true);
    try {
      if (action === 'call' && onRequestCallback) {
        await onRequestCallback(symptomData?.symptom || 'Dúvida pós-operatória');
      } else if (action === 'schedule' && onRequestAppointment) {
        const urgencyType = symptomData?.severity === 'severe' ? 'urgent' : 'return';
        await onRequestAppointment(urgencyType);
      }
      setCompleted(true);
    } catch (err) {
      console.error('Erro ao processar ação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getActionButtons = () => {
    const severity = symptomData?.severity;
    
    if (severity === 'severe') {
      return [
        {
          id: 'call',
          label: '📞 Falar com a clínica agora',
          description: 'Contato imediato para orientação',
          primary: true,
        },
        {
          id: 'schedule',
          label: '🏥 Agendar consulta urgente',
          description: 'Voltar para atendimento de urgência',
          primary: false,
        },
      ];
    }
    
    return [
      {
        id: 'schedule',
        label: '📅 Agendar retorno',
        description: 'Marcar avaliação profissional',
        primary: true,
      },
      {
        id: 'call',
        label: '💬 Tirar dúvida por mensagem',
        description: 'Chat com a equipe da clínica',
        primary: false,
      },
    ];
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-[#FF9500]/20 to-[#FF6347]/10 px-6 py-6 border-b border-[#FF9500]/20">
            <div className="flex items-center justify-between mb-4">
              {stage !== 'feeling' && (
                <button
                  onClick={() => setStage(stage === 'symptoms' ? 'feeling' : 'symptoms')}
                  className="p-2 hover:bg-white/50 rounded-full transition"
                >
                  <ChevronLeft size={20} className="text-[#1C1C1E]" />
                </button>
              )}
              <h2 className="text-[#FF9500] text-[13px] font-bold uppercase tracking-wider flex-1">
                Como você está?
              </h2>
              {stage !== 'feeling' && <div className="w-6" />}
            </div>
            <p className="text-[#1C1C1E] text-[16px] font-semibold">
              Após {procedure}
            </p>
            <p className="text-[#8E8E93] text-[13px] mt-1">
              Você realizou {getRecoveryMessage()}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              {/* Stage 1: Feeling */}
              {stage === 'feeling' && (
                <motion.div
                  key="feeling"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <p className="text-[#1C1C1E] text-[15px] leading-relaxed">
                    Está tudo bem com você?
                  </p>

                  <div className="space-y-3">
                    {/* Positive Response */}
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFeelingResponse(true)}
                      className="w-full p-4 rounded-2xl border-2 border-transparent bg-[#F2F2F7] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all flex items-center gap-3"
                    >
                      <span className="text-2xl">😊</span>
                      <div className="text-left flex-1">
                        <p className="text-[#1C1C1E] text-[15px] font-semibold">Sim, estou bem</p>
                        <p className="text-[#8E8E93] text-[12px]">Recuperação normal</p>
                      </div>
                      <CheckCircle2 size={20} className="text-[#0C9B72]" />
                    </motion.button>

                    {/* Negative Response */}
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleFeelingResponse(false)}
                      className="w-full p-4 rounded-2xl border-2 border-transparent bg-[#F2F2F7] hover:border-[#FF3B30] hover:bg-[#FF3B30]/5 transition-all flex items-center gap-3"
                    >
                      <span className="text-2xl">😕</span>
                      <div className="text-left flex-1">
                        <p className="text-[#1C1C1E] text-[15px] font-semibold">Não, tenho um problema</p>
                        <p className="text-[#8E8E93] text-[12px]">Quero reportar algo</p>
                      </div>
                      <AlertCircle size={20} className="text-[#FF3B30]" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* Stage 2: Symptoms */}
              {stage === 'symptoms' && (
                <motion.div
                  key="symptoms"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-3"
                >
                  <p className="text-[#1C1C1E] text-[15px] leading-relaxed mb-4">
                    O que você está sentindo?
                  </p>

                  {getSymptomOptions().map((option) => (
                    <motion.button
                      key={option.id}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleSymptomSelect(option.id)}
                      className={`w-full p-3 rounded-xl border-2 transition-all text-left ${
                        option.severity === 'severe'
                          ? 'border-[#FF3B30]/30 hover:border-[#FF3B30] bg-[#FF3B30]/5'
                          : option.severity === 'moderate'
                          ? 'border-[#FF9500]/30 hover:border-[#FF9500] bg-[#FF9500]/5'
                          : 'border-[#E5E5EA] hover:border-[#0C9B72] bg-[#F2F2F7]'
                      }`}
                    >
                      <p className="text-[#1C1C1E] text-[14px] font-semibold">{option.label}</p>
                    </motion.button>
                  ))}
                </motion.div>
              )}

              {/* Stage 3: Action */}
              {stage === 'action' && (
                <motion.div
                  key="action"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="bg-[#F2F2F7] rounded-2xl p-4 mb-6">
                    <p className="text-[#1C1C1E] text-[14px]">
                      {symptomData?.severity === 'severe'
                        ? '⚠️ Recomendamos contato imediato com a clínica para orientação'
                        : '💡 Podemos ajudar você de algumas formas'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {getActionButtons().map((action) => (
                      <motion.button
                        key={action.id}
                        whileHover={{ y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleActionSelect(action.id as any)}
                        disabled={isSubmitting}
                        className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${
                          action.primary
                            ? 'border-[#0C9B72] bg-[#0C9B72]/10 hover:bg-[#0C9B72]/20'
                            : 'border-[#E5E5EA] bg-[#F2F2F7] hover:border-[#0C9B72]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <p className={`text-[15px] font-semibold ${
                          action.primary ? 'text-[#0C9B72]' : 'text-[#1C1C1E]'
                        }`}>
                          {action.label}
                        </p>
                        <p className="text-[#8E8E93] text-[12px] mt-1">{action.description}</p>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Stage 4: Completed */}
              {stage === 'completed' && (
                <motion.div
                  key="completed"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="text-center space-y-6 py-4"
                >
                  <div className="flex justify-center">
                    <motion.div
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 0.6,
                        times: [0, 0.5, 1],
                      }}
                    >
                      {symptomData?.isComfortable ? (
                        <div className="w-16 h-16 bg-[#0C9B72]/20 rounded-full flex items-center justify-center">
                          <CheckCircle2 size={32} className="text-[#0C9B72]" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 bg-[#0C9B72]/20 rounded-full flex items-center justify-center">
                          <Heart size={32} className="text-[#0C9B72]" />
                        </div>
                      )}
                    </motion.div>
                  </div>

                  {symptomData?.isComfortable ? (
                    <>
                      <div>
                        <h3 className="text-[#1C1C1E] text-[18px] font-bold">Ótimo!</h3>
                        <p className="text-[#8E8E93] text-[14px] mt-2">
                          Continue seguindo as orientações recebidas e nos contacte se surgir qualquer dúvida.
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <h3 className="text-[#1C1C1E] text-[18px] font-bold">
                          {symptomData?.severity === 'severe' ? 'Em breve!' : 'Recebemos seu relato'}
                        </h3>
                        <p className="text-[#8E8E93] text-[14px] mt-2">
                          {symptomData?.severity === 'severe'
                            ? 'A clínica entrará em contato em breve para orientação.'
                            : 'Entraremos em contato para ajudá-lo.'}
                        </p>
                      </div>
                    </>
                  )}

                  <motion.button
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={onClose}
                    className="w-full h-12 rounded-full bg-[#0C9B72] text-white text-[15px] font-semibold transition-all hover:opacity-90"
                  >
                    {'Voltar ao portal'}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
