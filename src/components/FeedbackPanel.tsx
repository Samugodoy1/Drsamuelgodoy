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
    bgColor: 'from-[#34C759]/10 to-[#0C9B72]/10',
    borderColor: 'border-[#0C9B72]/20',
    accentColor: '#0C9B72',
    textColor: 'text-[#0C9B72]',
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
    bgColor: 'from-[#007AFF]/10 to-[#5AC8FA]/10',
    borderColor: 'border-[#007AFF]/20',
    accentColor: '#007AFF',
    textColor: 'text-[#007AFF]',
  },
  loading: {
    icon: Clock,
    bgColor: 'from-[#8E8E93]/10 to-[#C7C7CC]/10',
    borderColor: 'border-[#8E8E93]/20',
    accentColor: '#8E8E93',
    textColor: 'text-[#8E8E93]',
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
                  <span className="text-[12px] text-[#8E8E93] whitespace-nowrap">
                    {timestamp}
                  </span>
                )}
              </div>

              {message && (
                <p className="text-[#8E8E93] text-[13px] mt-1">
                  {message}
                </p>
              )}

              {details && (
                <div className="mt-2 text-[13px] text-[#8E8E93]">
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
                className="shrink-0 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors p-1"
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
