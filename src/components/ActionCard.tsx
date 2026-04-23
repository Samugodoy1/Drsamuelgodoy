import React from 'react';
import { motion } from 'framer-motion';

interface ActionCTAButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger';
  icon?: React.ReactNode;
  loading?: boolean;
}

interface ActionCardProps {
  icon: React.ReactNode;
  label: string; // Ex: "Sua Próxima Consulta"
  title: string; // Ex: "Terça, 10 de Junho"
  subtitle?: string; // Ex: "10:30 com Dr(a). Samuel"
  additionalInfo?: React.ReactNode; // Info extra
  primaryAction: ActionCTAButton;
  secondaryActions?: ActionCTAButton[];
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

const variantStyles = {
  info: 'from-[#007AFF]/5 to-[#5AC8FA]/5 border-[#007AFF]/20',
  success: 'from-[#34C759]/5 to-[#0C9B72]/5 border-[#0C9B72]/20',
  warning: 'from-[#FF9500]/5 to-[#FF8C00]/5 border-[#FF9500]/20',
  danger: 'from-[#FF3B30]/5 to-[#FF1744]/5 border-[#FF3B30]/30',
  neutral: 'from-white to-[#F9FAFB] border-white/80',
};

const variants_ColorAccent = {
  info: '#007AFF',
  success: '#0C9B72',
  warning: '#FF9500',
  danger: '#FF3B30',
  neutral: '#8E8E93',
};

const getButtonStyles = (variant: ActionCTAButton['variant'] = 'secondary') => {
  switch (variant) {
    case 'primary':
      return 'bg-gradient-to-r from-[#007AFF] to-[#5AC8FA] text-white hover:opacity-90 active:scale-95';
    case 'danger':
      return 'bg-gradient-to-r from-[#FF3B30] to-[#FF1744] text-white hover:opacity-90 active:scale-95';
    case 'secondary':
      return 'bg-white/60 text-[#007AFF] border border-[#007AFF]/20 hover:bg-white/80 active:scale-95';
    case 'tertiary':
    default:
      return 'text-[#8E8E93] hover:text-[#1C1C1E] font-medium transition-colors';
  }
};

export const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  label,
  title,
  subtitle,
  additionalInfo,
  primaryAction,
  secondaryActions,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${variantStyles[variant]} backdrop-blur-xl group transition-all duration-300 ${className}`}
    >
      {/* Background gradient blob */}
      <div
        className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          backgroundColor: `${variants_ColorAccent[variant]}20`,
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-48 h-48 rounded-full blur-3xl opacity-40"
        style={{
          backgroundColor: `${variants_ColorAccent[variant]}10`,
        }}
      />

      {/* Content */}
      <div className="relative z-10 p-8 sm:p-10">
        {/* Header with icon */}
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
            style={{
              backgroundColor: `${variants_ColorAccent[variant]}15`,
            }}
          >
            {React.cloneElement(icon as React.ReactElement, {
              size: 24,
              color: variants_ColorAccent[variant],
            })}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className="text-[12px] font-bold uppercase tracking-wider"
              style={{ color: variants_ColorAccent[variant] }}
            >
              {label}
            </p>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[#1C1C1E] text-[28px] font-bold tracking-tight leading-tight">
          {title}
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-[#8E8E93] text-[15px] mt-3 font-medium">
            {subtitle}
          </p>
        )}

        {/* Additional Info */}
        {additionalInfo && (
          <div className="mt-5 space-y-2">
            {additionalInfo}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {/* Primary Action */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={primaryAction.onClick}
            disabled={primaryAction.loading}
            className={`w-full h-12 px-5 rounded-full text-[15px] font-semibold tracking-tight transition-all flex items-center justify-center gap-2 ${getButtonStyles(primaryAction.variant)} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {primaryAction.icon}
            {primaryAction.loading ? 'Aguarde...' : primaryAction.label}
          </motion.button>

          {/* Secondary Actions */}
          {secondaryActions && secondaryActions.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/20">
              {secondaryActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`w-full h-11 px-4 rounded-full text-[14px] font-medium transition-all flex items-center justify-center gap-2 ${getButtonStyles(action.variant)} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {action.icon}
                  {action.loading ? 'Aguarde...' : action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
