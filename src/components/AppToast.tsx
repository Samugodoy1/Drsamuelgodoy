import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, CheckCircle } from '../icons';

export type AppToastNotification = {
  message: string;
  type: 'success' | 'error';
  celebration?: boolean;
  onUndo?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

interface AppToastProps {
  notification: AppToastNotification | null;
  onDismiss: () => void;
  /** Extra offset when the onboarding demo island is visible at the top. */
  offsetTop?: boolean;
}

const easing = [0.16, 1, 0.3, 1] as const;

export function AppToast({ notification, onDismiss, offsetTop = false }: AppToastProps) {
  return (
    <AnimatePresence>
      {notification && (
        <motion.div
          role={notification.type === 'error' ? 'alert' : 'status'}
          initial={{ opacity: 0, y: -18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.98 }}
          transition={{ duration: 0.42, ease: easing }}
          className={`pointer-events-none fixed inset-x-0 z-[180] flex justify-center px-4 ${
            offsetTop
              ? 'top-[max(4.25rem,calc(env(safe-area-inset-top)+3.4rem))]'
              : 'top-[max(12px,env(safe-area-inset-top))]'
          }`}
        >
          <div
            className="pointer-events-auto flex w-full max-w-[400px] items-center gap-3 rounded-[22px] border border-white/70 px-3.5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.04)]"
            style={{
              background: 'rgba(255, 255, 255, 0.82)',
              WebkitBackdropFilter: 'blur(40px) saturate(180%)',
              backdropFilter: 'blur(40px) saturate(180%)',
            }}
          >
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                notification.type === 'error' ? 'bg-[#ff3b30]/12' : 'bg-[#30d158]/14'
              }`}
            >
              {notification.type === 'error' ? (
                <AlertCircle size={18} className="text-[#ff3b30]" />
              ) : (
                <CheckCircle size={18} className="text-[#30d158]" />
              )}
            </div>
            <p className="min-w-0 flex-1 text-[15px] font-normal leading-snug tracking-[-0.016em] text-[#1d1d1f]">
              {notification.message}
            </p>
            {notification.onUndo && (
              <button
                type="button"
                onClick={() => {
                  notification.onUndo?.();
                  onDismiss();
                }}
                className="shrink-0 px-1.5 text-[15px] font-normal tracking-[-0.016em] text-[#0071e3]"
              >
                Desfazer
              </button>
            )}
            {notification.onAction && notification.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  notification.onAction?.();
                  onDismiss();
                }}
                className="shrink-0 rounded-full bg-[#0071e3] px-3.5 py-1.5 text-[13px] font-normal tracking-[-0.016em] text-white"
              >
                {notification.actionLabel}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AppToast;
