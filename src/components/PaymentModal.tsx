/**
 * PaymentModal Component
 * Handles payment method selection and PIX transfer workflow
 * 
 * @BLOCKER_FIX #3: Payment Flow Redesign
 * Replaces scattered payment logic with clear 3-step modal
 * 
 * Flow:
 * Step 1: Select payment method (PIX, Transfer, etc.)
 * Step 2: Confirm amount + Copy PIX key
 * Step 3: Confirmation with success/error states
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, AlertCircle, DollarSign, X, CheckCircle2 } from '../icons';
import { COLORS } from '../constants/colors';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: number;
  label: string;
  sessionToken: string | null;
  onSuccess?: () => void;
  installmentId?: number;
}

type PaymentStep = 'method' | 'confirm' | 'success' | 'error';
type PaymentMethod = 'pix' | 'transfer';

interface PixInfo {
  pix_key: string;
  pix_key_type: string;
  beneficiary_name: string;
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  label,
  sessionToken,
  onSuccess,
  installmentId,
}: PaymentModalProps) {
  const [step, setStep] = useState<PaymentStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('pix');
  const [pixInfo, setPixInfo] = useState<PixInfo | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load PIX info when modal opens
  useEffect(() => {
    if (!isOpen || selectedMethod !== 'pix' || pixInfo || !sessionToken) return;

    const loadPixInfo = async () => {
      try {
        const res = await fetch('/api/portal/pix-info', {
          headers: { 'Authorization': `Bearer ${sessionToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPixInfo(data);
        }
      } catch (err) {
        console.error('Failed to load PIX info:', err);
      }
    };

    loadPixInfo();
  }, [isOpen, selectedMethod, sessionToken, pixInfo]);

  // Keyboard and focus management
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }

      // Tab trap
      if (e.key === 'Tab') {
        const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (!focusable || focusable.length === 0) return;

        const nodes = Array.from(focusable);
        const currentIndex = nodes.indexOf(document.activeElement as HTMLElement);

        if (e.shiftKey) {
          if (currentIndex === 0) {
            nodes[nodes.length - 1].focus();
            e.preventDefault();
          }
        } else {
          if (currentIndex === nodes.length - 1) {
            nodes[0].focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  const handleCopyPix = async () => {
    if (pixInfo?.pix_key) {
      try {
        await navigator.clipboard.writeText(pixInfo.pix_key);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!sessionToken) {
      setError('Sessão expirada');
      setStep('error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/portal/inform-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ amount, installment_id: installmentId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Falha ao informar pagamento');
      }

      setStep('success');
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Erro ao informar pagamento');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setError(null);
  };

  const handleProceedToConfirm = () => {
    setError(null);
    setStep('confirm');
  };

  const handleBackToMethod = () => {
    if (!loading) {
      setStep('method');
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
        onClick={() => !loading && onClose()}
      >
        <motion.div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-t-[20px] sm:rounded-[20px] w-full sm:max-w-lg shadow-2xl overflow-hidden"
        >
          {/* Drag Indicator (mobile only) */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden">
            <div className="w-9 h-1 bg-[#C6C6C8] rounded-full" />
          </div>

          {/* ═══ STEP 1: SELECT PAYMENT METHOD ═══ */}
          {step === 'method' && (
            <div className="px-5 py-6">
              <div className="flex items-center justify-between mb-6">
                <h3
                  id="payment-modal-title"
                  className="text-[18px] font-semibold text-[#1C1C1E]"
                >
                  Escolha o método de pagamento
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Fechar"
                  className="w-8 h-8 bg-[#E5E5EA] rounded-full flex items-center justify-center hover:bg-[#D1D1D6] transition-colors"
                >
                  <X size={16} className="text-[#8E8E93]" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {/* PIX Option */}
                <button
                  type="button"
                  onClick={() => handleMethodChange('pix')}
                  className={`w-full p-4 border-2 rounded-xl transition-all ${
                    selectedMethod === 'pix'
                      ? `border-[${COLORS.brand.primary}] bg-[${COLORS.brand.primary}]/5`
                      : `border-[${COLORS.neutral.border}] bg-white hover:bg-[${COLORS.neutral.bg_secondary}]`
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold text-[#1C1C1E]">PIX</p>
                      <p className="text-[#8E8E93] text-sm">Transferência instantânea</p>
                    </div>
                    <div
                      className={`w-5 h-5 border-2 rounded-full flex items-center justify-center transition-all ${
                        selectedMethod === 'pix'
                          ? `border-[${COLORS.brand.primary}] bg-[${COLORS.brand.primary}]`
                          : `border-[${COLORS.neutral.gray_300}]`
                      }`}
                    >
                      {selectedMethod === 'pix' && (
                        <div className="w-2.5 h-2.5 bg-white rounded-full" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Transfer Option (Coming Soon) */}
                <button
                  type="button"
                  disabled
                  className={`w-full p-4 border-2 border-dashed rounded-xl opacity-50 cursor-not-allowed transition-all`}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-left">
                      <p className="font-semibold text-[#8E8E93]">Transferência Bancária</p>
                      <p className="text-[#AEAEB2] text-sm">Em breve</p>
                    </div>
                  </div>
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl">
                  <p className="text-[#FF3B30] text-[13px]">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleProceedToConfirm}
                disabled={loading}
                className="w-full h-12 bg-[#0C9B72] text-white rounded-xl font-semibold text-[15px] hover:bg-[#0A8560] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          )}

          {/* ═══ STEP 2: CONFIRM AMOUNT + COPY PIX ═══ */}
          {step === 'confirm' && selectedMethod === 'pix' && (
            <div className="px-5 py-6">
              <h3 className="text-[18px] font-semibold text-[#1C1C1E] mb-6">
                Confirme o Pagamento
              </h3>

              {/* Amount Summary */}
              <div className="bg-[#F2F2F7] rounded-xl p-4 mb-6 text-center">
                <p className="text-[#8E8E93] text-[12px] font-medium mb-2">{label}</p>
                <p className="text-[#1C1C1E] text-[28px] font-bold tracking-tight">
                  R$ {amount.toFixed(2)}
                </p>
              </div>

              {/* PIX Key Section */}
              {pixInfo ? (
                <div className="mb-6">
                  <p className="text-[#8E8E93] text-[11px] font-semibold uppercase tracking-widest mb-3">
                    Chave PIX
                  </p>
                  <button
                    type="button"
                    onClick={handleCopyPix}
                    className="w-full flex items-center gap-3 p-3.5 bg-[#F2F2F7] rounded-xl active:bg-[#E5E5EA] hover:bg-[#E5E5EA] transition-colors"
                  >
                    <div className="w-10 h-10 bg-[#0C9B72]/10 rounded-xl flex items-center justify-center shrink-0">
                      <DollarSign size={18} className="text-[#0C9B72]" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-[#1C1C1E] text-[15px] font-medium truncate">
                        {pixInfo.pix_key}
                      </p>
                      <p className="text-[#8E8E93] text-[12px] mt-0.5">
                        {pixInfo.pix_key_type} • {pixInfo.beneficiary_name}
                      </p>
                    </div>
                    <span className="text-[#0C9B72] text-[12px] font-semibold shrink-0">
                      {copied ? '✓ Copiado!' : 'Copiar'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-[#FF9500]/10 border border-[#FF9500]/20 rounded-xl">
                  <p className="text-[#FF9500] text-[13px]">
                    A clínica ainda não configurou PIX. Entre em contato para combinar pagamento.
                  </p>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-[#0C9B72]/5 border border-[#0C9B72]/15 rounded-xl p-4 mb-6">
                <p className="text-[#1C1C1E] text-[13px] leading-relaxed font-medium mb-2">
                  Como pagar:
                </p>
                <ol className="text-[#3A3A3C] text-[12px] space-y-1 list-decimal list-inside">
                  <li>Copie a chave PIX acima</li>
                  <li>Abra seu app bancário ou carteira digital</li>
                  <li>Crie uma transferência PIX</li>
                  <li>Cole a chave</li>
                  <li>Confirme o pagamento aqui</li>
                </ol>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-3 bg-[#FF3B30]/10 border border-[#FF3B30]/20 rounded-xl">
                  <p className="text-[#FF3B30] text-[13px]">{error}</p>
                </div>
              )}

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={loading || !pixInfo}
                className="w-full h-12 bg-[#34C759] text-white rounded-xl font-semibold text-[15px] hover:bg-[#31B54D] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center mb-3"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Já Paguei — Confirmar'
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToMethod}
                disabled={loading}
                className="w-full h-12 border border-[#D1D1D6] text-[#1C1C1E] rounded-xl font-semibold text-[15px] hover:bg-[#F2F2F7] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Voltar para Métodos
              </button>
            </div>
          )}

          {/* ═══ STEP 3: SUCCESS ═══ */}
          {step === 'success' && (
            <div className="text-center py-12 px-6">
              <div className="w-14 h-14 bg-[#34C759]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-[#34C759]" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#1C1C1E] mb-2">
                Pagamento Informado
              </h3>
              <p className="text-[#8E8E93] text-[14px]">
                Avisaremos a clínica. Eles confirmarão em breve.
              </p>
            </div>
          )}

          {/* ═══ STEP 4: ERROR ═══ */}
          {step === 'error' && (
            <div className="p-6">
              <div className="w-14 h-14 bg-[#FF3B30]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-[#FF3B30]" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#1C1C1E] mb-2 text-center">
                Erro ao Confirmar
              </h3>
              <p className="text-[#8E8E93] text-[14px] text-center mb-6">
                {error || 'Algo deu errado. Tente novamente.'}
              </p>

              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={loading}
                className="w-full h-12 bg-[#FF3B30] text-white rounded-xl font-semibold text-[15px] hover:bg-[#E63426] active:scale-[0.98] transition-all disabled:opacity-50 mb-3"
              >
                Tentar Novamente
              </button>

              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="w-full h-12 border border-[#D1D1D6] text-[#1C1C1E] rounded-xl font-semibold text-[15px] hover:bg-[#F2F2F7] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Fechar
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
