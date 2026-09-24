import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CroAccessFields } from './CroAccessFields';

type CroVerificationGateProps = {
  userName: string;
  busy?: boolean;
  error?: string;
  onVerify: (croUf: string, croNumber: string) => Promise<void>;
  onLogout: () => void;
};

const firstName = (full: string) => (full || '').trim().split(/\s+/)[0] || '';

export function CroVerificationGate({
  userName,
  busy = false,
  error = '',
  onVerify,
  onLogout,
}: CroVerificationGateProps) {
  const [croUf, setCroUf] = useState('');
  const [croNumber, setCroNumber] = useState('');
  const greeting = firstName(userName);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!croUf || !croNumber.trim()) return;
    await onVerify(croUf, croNumber.trim());
  };

  return (
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-[#f5f5f7] font-sans antialiased">
      <div className="flex min-h-screen items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[400px]"
        >
          <p className="mb-6 text-[12px] tracking-[0.08em] text-[#86868b]">OdontoHub</p>
          <h1 className="apple-display-ink mb-3 text-[40px] sm:text-[44px]">Seu CRO.</h1>
          <p className="apple-subhead mb-12 text-[17px]">
            {greeting
              ? `${greeting}, informe a UF e o número da inscrição.`
              : 'Informe a UF e o número da inscrição.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <CroAccessFields
              hint={false}
              croUf={croUf}
              croNumber={croNumber}
              disabled={busy}
              onChange={(next) => {
                if (next.croUf !== undefined) setCroUf(next.croUf);
                if (next.croNumber !== undefined) setCroNumber(next.croNumber);
              }}
            />

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-[13px] text-[#ff3b30]"
              >
                {error}
              </motion.p>
            )}

            <div className="pt-3">
              <motion.button
                type="submit"
                disabled={busy || !croUf || !croNumber.trim()}
                whileHover={busy ? undefined : { scale: 1.005 }}
                whileTap={busy ? undefined : { scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                className="apple-btn w-full cursor-pointer border-0 disabled:opacity-40"
              >
                {busy ? 'Conferindo…' : 'Continuar'}
              </motion.button>
              <p className="mt-4 text-center text-[12px] text-[#86868b]">Inscrição conferida antes de abrir a clínica.</p>
            </div>
          </form>

          <div className="mt-14 text-center">
            <button type="button" onClick={onLogout} className="apple-link">
              Sair da conta
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
