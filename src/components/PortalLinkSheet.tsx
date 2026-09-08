import { useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ClipboardList, Copy, Home, MessageCircle, X } from '../icons';

export type PortalLinkData = {
  url: string;
  preUrl: string | null;
  patientName: string;
  phone?: string;
};

interface PortalLinkSheetProps {
  data: PortalLinkData | null;
  onClose: () => void;
}

const easing = [0.16, 1, 0.3, 1] as const;

function firstNameOf(full: string) {
  return (full || '').trim().split(/\s+/)[0] || 'olá';
}

function toWhatsAppPhone(raw?: string) {
  if (!raw) return null;
  let phone = raw.replace(/\D/g, '');
  if (!phone) return null;
  if (phone.length === 10 || phone.length === 11) phone = `55${phone}`;
  else if (phone.length > 11 && !phone.startsWith('55')) phone = `55${phone}`;
  return phone;
}

function openWhatsApp(phone: string, message: string) {
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}

export function PortalLinkSheet({ data, onClose }: PortalLinkSheetProps) {
  const [copied, setCopied] = useState<'pre' | 'portal' | null>(null);

  useEffect(() => {
    setCopied(null);
  }, [data?.url, data?.preUrl]);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 1800);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async (value: string, which: 'pre' | 'portal') => {
    setCopied(which);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        return;
      }
    } catch {
      // fall through to the execCommand fallback
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = value;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'fixed';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    } catch {
      // Feedback already shown
    }
  };

  const phone = toWhatsAppPhone(data?.phone);
  const firstName = firstNameOf(data?.patientName || '');
  const initial = (data?.patientName || '?').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      {data && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center sm:items-center sm:px-4">
          <motion.button
            type="button"
            aria-label="Fechar"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/30 backdrop-blur-[8px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="portal-link-title"
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.42, ease: easing }}
            className="relative w-full max-w-[420px] overflow-hidden rounded-t-[28px] bg-[#f5f5f7] pb-[max(12px,env(safe-area-inset-bottom))] sm:rounded-[28px] sm:pb-2"
          >
            <div className="flex justify-center pt-3 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-[#d2d2d7]" />
            </div>

            <div className="px-6 pb-2 pt-4 sm:pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-[17px] font-semibold text-[#1d1d1f]">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-normal tracking-[-0.011em] text-[#86868b]">
                      Enviar para o paciente
                    </p>
                    <h3
                      id="portal-link-title"
                      className="truncate text-[22px] font-semibold tracking-[-0.025em] text-[#1d1d1f]"
                    >
                      {data.patientName}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e8e8ed] text-[#6e6e73]"
                  aria-label="Fechar"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="mt-3 text-[15px] leading-snug tracking-[-0.016em] text-[#6e6e73]">
                O paciente preenche, confirma e acompanha — sem papel na recepção.
              </p>
            </div>

            <div className="mx-4 mb-3 overflow-hidden rounded-[22px] bg-white">
              {data.preUrl && (
                <>
                  <LinkRow
                    icon={<ClipboardList size={18} className="text-[#1d1d1f]" />}
                    title="Pré-atendimento"
                    description="Ficha, termos e documentos antes da consulta"
                    copied={copied === 'pre'}
                    onCopy={() => copy(data.preUrl!, 'pre')}
                    onWhatsApp={
                      phone
                        ? () =>
                            openWhatsApp(
                              phone,
                              `Olá ${firstName}, segue o pré-atendimento da clínica para você preencher antes da consulta: ${data.preUrl}`,
                            )
                        : undefined
                    }
                  />
                  <div className="ml-[4.5rem] h-px bg-[#d2d2d7]/60" />
                </>
              )}
              <LinkRow
                icon={<Home size={18} className="text-[#1d1d1f]" />}
                title="Portal do paciente"
                description="Agenda, exames, orçamentos e conversa com a clínica"
                copied={copied === 'portal'}
                onCopy={() => copy(data.url, 'portal')}
                onWhatsApp={
                  phone
                    ? () =>
                        openWhatsApp(
                          phone,
                          `Olá ${firstName}, acesse o portal da clínica: ${data.url}`,
                        )
                    : undefined
                }
              />
            </div>

            {data.preUrl && (
              <p className="px-6 pb-7 text-center text-[12px] leading-relaxed tracking-[-0.011em] text-[#86868b]">
                Envie o pré-atendimento antes da primeira consulta.
              </p>
            )}
            {!data.preUrl && <div className="h-5" />}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LinkRow({
  icon,
  title,
  description,
  copied,
  onCopy,
  onWhatsApp,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  copied: boolean;
  onCopy: () => void;
  onWhatsApp?: () => void;
}) {
  return (
    <div className="flex items-start gap-3.5 px-4 py-4">
      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#f5f5f7]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[17px] font-normal tracking-[-0.022em] text-[#1d1d1f]">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug tracking-[-0.011em] text-[#86868b]">
          {description}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-normal tracking-[-0.016em] ${
              copied ? 'bg-[#30d158]/12 text-[#1d1d1f]' : 'bg-[#f5f5f7] text-[#1d1d1f]'
            }`}
          >
            {copied ? <Check size={13} className="text-[#30d158]" /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
          {onWhatsApp && (
            <button
              type="button"
              onClick={onWhatsApp}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0071e3] px-3.5 py-1.5 text-[13px] font-normal tracking-[-0.016em] text-white"
            >
              <MessageCircle size={13} />
              WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PortalLinkSheet;
