import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, Clock } from '../icons';

interface FeedbackPanelProps {
  type?: 'success' | 'warning' | 'info' | 'loading';
  title: string;
  message?: string;
  details?: React.ReactNode;
  timestamp?: string; // Ex: "há 2 minutos"
  autoHideDuration?: number; // Em ms, undefined = não desaparece
  onClose?: () => void;
}

const typeConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'from-[#30d158]/10 to-[#0071e3]/10',
    borderColor: 'border-[#0071e3]/20',
    accentColor: '#0071e3',
    textColor: 'text-[#0071e3]',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'from-[#FF9500]/10 to-[#FF8C00]/10',
    borderColor: 'border-[#FF9500]/20',
    accentColor: '#FF9500',
    textColor: 'text-[#FF9500]',
  },
  info: {
    icon: Info,
    bgColor: 'from-[#0071e3]/10 to-[#5AC8FA]/10',
    borderColor: 'border-[#0071e3]/20',
    accentColor: '#0071e3',
    textColor: 'text-[#0071e3]',
  },
  loading: {
    icon: Clock,
    bgColor: 'from-[#86868b]/10 to-[#C7C7CC]/10',
    borderColor: 'border-[#86868b]/20',
    accentColor: '#86868b',
    textColor: 'text-[#86868b]',
  },
};

export const FeedbackPanel: React.FC<FeedbackPanelProps> = ({
  type = 'success',
  title,
  message,
  details,
  timestamp,
  autoHideDuration,
  onClose,
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  React.useEffect(() => {
    if (autoHideDuration && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onClose?.();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, isVisible, onClose]);

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className={`rounded-2xl bg-gradient-to-br ${config.bgColor} backdrop-blur-xl border ${config.borderColor} p-5 sm:p-6`}
        >
          <div className="flex gap-4">
            {/* Icon */}
            <div className="shrink-0 pt-0.5">
              {type === 'loading' ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Icon size={20} color={config.accentColor} />
                </motion.div>
              ) : (
                <Icon size={20} color={config.accentColor} />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-[14px] font-bold tracking-tight ${config.textColor}`}>
                  {title}
                </h3>
                {timestamp && (
                  <span className="text-[12px] text-[#86868b] whitespace-nowrap">
                    {timestamp}
                  </span>
                )}
              </div>

              {message && (
                <p className="text-[#86868b] text-[13px] mt-1">
                  {message}
                </p>
              )}

              {details && (
                <div className="mt-2 text-[13px] text-[#86868b]">
                  {details}
                </div>
              )}
            </div>

            {/* Close button */}
            {onClose && (
              <button
                onClick={() => {
                  setIsVisible(false);
                  onClose();
                }}
                className="shrink-0 text-[#86868b] hover:text-[#1d1d1f] transition-colors p-1"
              >
                <span className="text-[18px]">×</span>
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
