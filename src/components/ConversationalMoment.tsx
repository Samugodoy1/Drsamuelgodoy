import React from 'react';
import { motion } from 'framer-motion';

interface ConversationalMomentProps {
  // Toda a estrutura é baseada em uma pergunta conversacional
  question: string; // "Podemos contar com você quinta às 08:00?"
  context?: string; // "Faltam 2 dias" ou "Já passaram 3 meses"
  contextColor?: 'red' | 'yellow' | 'green' | 'gray'; // Cor da urgência
  emoji?: string; // Emoji para criar emoção: "⏰", "🏥", "😕", "💙"
  
  // Ações com microcópia conversacional
  primaryCTA: {
    label: string; // "Sim, conta comigo!" ou "Vou tentar"
    onClick: () => void;
    loading?: boolean;
    emotion?: '😊' | '💪' | '❤️' | '👍'; // Emoji que reforça ação
  };
  
  secondaryCTAs?: Array<{
    label: string; // "Não, preciso reagendar"
    onClick: () => void;
    type?: 'dismiss' | 'alternative';
  }>;
  
  // Sensação de cuidado
  doctorMessage?: string; // "Dr. Samuel está acompanhando você"
  lastUpdate?: string; // "Última atualização há 2 dias"
  
  // Visual
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'low'; // Define cores e animações
  variant?: 'question' | 'alert' | 'check-in' | 'milestone';
}

const urgencyConfig = {
  critical: {
    bg: 'from-[#FF3B30]/15 to-[#FF1744]/10',
    border: 'border-[#FF3B30]/40',
    accent: '#FF3B30',
    contextBg: 'bg-[#FF3B30]/20',
  },
  high: {
    bg: 'from-[#FF9500]/15 to-[#FF8C00]/10',
    border: 'border-[#FF9500]/40',
    accent: '#FF9500',
    contextBg: 'bg-[#FF9500]/20',
  },
  medium: {
    bg: 'from-[#FFD60A]/15 to-[#FFC300]/10',
    border: 'border-[#FFD60A]/40',
    accent: '#FFD60A',
    contextBg: 'bg-[#FFD60A]/20',
  },
  low: {
    bg: 'from-[#0C9B72]/15 to-[#34C759]/10',
    border: 'border-[#0C9B72]/40',
    accent: '#0C9B72',
    contextBg: 'bg-[#0C9B72]/20',
  },
};

const variantConfig = {
  question: {
    animationScale: [1, 1.02, 1],
    pulse: true,
  },
  alert: {
    animationScale: [1, 1.03, 1],
    pulse: true,
  },
  'check-in': {
    animationScale: [1, 1.01, 1],
    pulse: false,
  },
  milestone: {
    animationScale: [1, 1.02, 1],
    pulse: false,
  },
};

export const ConversationalMoment: React.FC<ConversationalMomentProps> = ({
  question,
  context,
  contextColor = 'gray',
  emoji = '💙',
  primaryCTA,
  secondaryCTAs,
  doctorMessage,
  lastUpdate,
  urgencyLevel = 'medium',
  variant = 'question',
}) => {
  const config = urgencyConfig[urgencyLevel];
  const varConfig = variantConfig[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={varConfig.pulse ? { y: -4 } : {}}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.bg} backdrop-blur-xl border-2 ${config.border} p-7 sm:p-9`}
    >
      {/* Background glow effect */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl opacity-40"
        style={{
          backgroundColor: `${config.accent}20`,
        }}
      />

      <div className="relative z-10">
        {/* Emoji grande + Contexto de urgência */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <motion.div
            animate={{ scale: varConfig.animationScale, rotate: [0, 2, -2, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-5xl flex-shrink-0 pt-1"
          >
            {emoji}
          </motion.div>

          {context && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className={`${config.contextBg} text-[#1C1C1E] px-4 py-2 rounded-full text-[12px] font-bold whitespace-nowrap flex-shrink-0`}
              style={{
                color: config.accent,
              }}
            >
              {context}
            </motion.span>
          )}
        </div>

        {/* Pergunta conversacional (GRANDE E CLARA) */}
        <motion.h2
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[#1C1C1E] text-[24px] sm:text-[28px] font-bold tracking-tight leading-tight mb-6"
        >
          {question}
        </motion.h2>

        {/* Sensação de cuidado - Dr message + Last update */}
        {(doctorMessage || lastUpdate) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-2 mb-7 pb-6 border-b border-white/20"
          >
            {doctorMessage && (
              <p className="text-[#8E8E93] text-[13px]">
                <span style={{ color: config.accent }}>💙</span> {doctorMessage}
              </p>
            )}
            {lastUpdate && (
              <p className="text-[#8E8E93] text-[12px]">
                ⏱ {lastUpdate}
              </p>
            )}
          </motion.div>
        )}

        {/* CTAs conversacionais */}
        <div className="space-y-3">
          {/* Primary CTA - com emoji de emoção */}
          <motion.button
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            disabled={primaryCTA.loading}
            onClick={primaryCTA.onClick}
            className="w-full relative group"
          >
            {/* Gradient animated background */}
            <div
              className="absolute inset-0 rounded-full bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-lg"
              style={{
                background: `linear-gradient(90deg, ${config.accent}, ${config.accent}80)`,
              }}
            />
            <div
              className="relative w-full h-13 px-6 rounded-full text-white text-[15px] font-bold tracking-tight active:scale-95 transition-all flex items-center justify-center gap-2"
              style={{
                background: `linear-gradient(135deg, ${config.accent}, ${config.accent}cc)`,
              }}
            >
              {primaryCTA.loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                <>
                  {primaryCTA.label}
                  {primaryCTA.emotion && <span className="text-[18px]">{primaryCTA.emotion}</span>}
                </>
              )}
            </div>
          </motion.button>

          {/* Secondary CTAs - dismissed visually */}
          {secondaryCTAs && secondaryCTAs.length > 0 && (
            <div className="space-y-2 pt-2">
              {secondaryCTAs.map((cta, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={cta.onClick}
                  className="w-full h-11 px-5 rounded-full text-[14px] font-medium transition-all hover:bg-white/10 text-[#8E8E93] hover:text-[#1C1C1E]"
                >
                  {cta.type === 'dismiss' && '↺ '}
                  {cta.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>

        {/* Micro detalhe: "você será notificado" ou similar */}
        {variant === 'alert' && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-[#8E8E93] text-[11px] mt-4 text-center italic"
          >
            Você receberá um lembrete 24h antes
          </motion.p>
        )}
      </div>
    </motion.div>
  );
};
