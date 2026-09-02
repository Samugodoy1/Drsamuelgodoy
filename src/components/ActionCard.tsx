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
  label: string;
  title: string;
  subtitle?: string;
  additionalInfo?: React.ReactNode;
  primaryAction: ActionCTAButton;
  secondaryActions?: ActionCTAButton[];
  variant?: 'info' | 'success' | 'warning' | 'danger' | 'neutral';
  className?: string;
}

const accent: Record<NonNullable<ActionCardProps['variant']>, string> = {
  info: '#0071e3',
  success: '#30d158',
  warning: '#FF9500',
  danger: '#ff3b30',
  neutral: '#86868b',
};

const getButtonStyles = (variant: ActionCTAButton['variant'] = 'secondary') => {
  switch (variant) {
    case 'primary':
      return 'bg-[#0071e3] text-white hover:bg-[#0077ed]';
    case 'danger':
      return 'bg-[#ff3b30] text-white hover:opacity-90';
    case 'secondary':
      return 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]';
    case 'tertiary':
    default:
      return 'text-[#2997ff] bg-transparent';
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
  const color = accent[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`bg-white rounded-[28px] ${className}`}
    >
      <div className="p-8 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 bg-[#f5f5f7]"
          >
            {React.cloneElement(icon as React.ReactElement, {
              size: 22,
              color,
              strokeWidth: 1.5,
            })}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-[13px] font-normal text-[#86868b] tracking-[-0.011em]">
              {label}
            </p>
          </div>
        </div>

        <h2 className="apple-display-ink text-[28px]">
          {title}
        </h2>

        {subtitle && (
          <p className="apple-subhead text-[17px] mt-3">
            {subtitle}
          </p>
        )}

        {additionalInfo && (
          <div className="mt-5 space-y-2">
            {additionalInfo}
          </div>
        )}

        <div className="mt-8 space-y-3">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={primaryAction.onClick}
            disabled={primaryAction.loading}
            className={`w-full py-3 px-[22px] rounded-[980px] text-[17px] font-normal tracking-[-0.022em] transition-colors flex items-center justify-center gap-2 ${getButtonStyles(primaryAction.variant)} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {primaryAction.icon}
            {primaryAction.loading ? 'Aguarde' : primaryAction.label}
          </motion.button>

          {secondaryActions && secondaryActions.length > 0 && (
            <div className="space-y-2 pt-2">
              {secondaryActions.map((action, idx) => (
                <motion.button
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`w-full py-3 px-4 rounded-[980px] text-[17px] font-normal transition-colors flex items-center justify-center gap-2 ${getButtonStyles(action.variant)} disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {action.icon}
                  {action.loading ? 'Aguarde' : action.label}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
