import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield } from '../icons';
import { CroAccessFields } from './CroAccessFields';

type CroVerificationGateProps = {
  userName: string;
  busy?: boolean;
  error?: string;
  onVerify: (croUf: string, croNumber: string) => Promise<void>;
  onLogout: () => void;
};

export function CroVerificationGate({
  userName,
  busy = false,
  error = '',
  onVerify,
  onLogout,
}: CroVerificationGateProps) {
  const [croUf, setCroUf] = useState('');
  const [croNumber, setCroNumber] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!croUf || !croNumber.trim()) return;
    await onVerify(croUf, croNumber.trim());
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#f5f5f7]/95 backdrop-blur-sm flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-[24px] border border-[#d2d2d7] bg-white p-8 shadow-[0_24px_80px_rgba(0,0,0,0.12)]"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0071e3]/10 text-[#0071e3]">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[#1d1d1f] tracking-[-0.3px]">
              Confirme seu CRO
            </h1>
            <p className="text-[14px] text-[#86868b]">
              {userName ? `Olá, ${userName.split(' ')[0]}.` : 'Acesso exclusivo para dentistas.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <CroAccessFields
            compact
            croUf={croUf}
            croNumber={croNumber}
            disabled={busy}
            onChange={(next) => {
              if (next.croUf !== undefined) setCroUf(next.croUf);
              if (next.croNumber !== undefined) setCroNumber(next.croNumber);
            }}
          />

          {error && (
            <p className="text-[13px] text-red-500 leading-relaxed">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy || !croUf || !croNumber.trim()}
            className="w-full h-[48px] rounded-[14px] bg-[#0071e3] text-white text-[15px] font-medium disabled:opacity-50"
          >
            {busy ? 'Validando CRO…' : 'Validar e continuar'}
          </button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mt-5 w-full text-center text-[13px] text-[#86868b] hover:text-[#1d1d1f]"
        >
          Sair da conta
        </button>
      </motion.div>
    </div>
  );
}
