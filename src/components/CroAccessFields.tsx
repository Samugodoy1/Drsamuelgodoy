import React from 'react';
import { BRAZILIAN_CRO_STATES } from '../constants/croStates';

type CroAccessFieldsProps = {
  croUf: string;
  croNumber: string;
  onChange: (next: { croUf?: string; croNumber?: string }) => void;
  disabled?: boolean;
  compact?: boolean;
};

export function CroAccessFields({
  croUf,
  croNumber,
  onChange,
  disabled = false,
  compact = false,
}: CroAccessFieldsProps) {
  const labelClass = compact
    ? 'text-[12px] font-medium text-[#86868b] mb-1.5 block'
    : 'block text-[13px] font-medium text-[#4B5250] mb-2';
  const fieldClass = compact
    ? 'w-full h-[44px] px-3 bg-white border border-[#d2d2d7] rounded-[12px] text-[15px] text-[#1d1d1f] outline-none focus:border-[#0071e3]'
    : 'w-full h-[48px] px-4 bg-white border border-[#DFE3E1] rounded-[12px] text-base text-[#0F1211] outline-none focus:border-[#2E6B53]';

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div>
        <label className={labelClass}>CRO — conselho regional</label>
        <div className="grid grid-cols-[112px_minmax(0,1fr)] gap-2">
          <select
            required
            disabled={disabled}
            value={croUf}
            onChange={(e) => onChange({ croUf: e.target.value })}
            className={fieldClass}
          >
            <option value="">UF</option>
            {BRAZILIAN_CRO_STATES.map((state) => (
              <option key={state.uf} value={state.uf}>
                {state.uf}
              </option>
            ))}
          </select>
          <input
            type="text"
            inputMode="numeric"
            required
            disabled={disabled}
            placeholder="Nº de inscrição"
            value={croNumber}
            onChange={(e) => onChange({ croNumber: e.target.value.replace(/\D/g, '') })}
            className={fieldClass}
          />
        </div>
        <p className={`${compact ? 'text-[11px] text-[#86868b]' : 'text-[12px] text-[#8B918E]'} mt-2 leading-relaxed`}>
          Apenas cirurgiões-dentistas com CRO ativo podem acessar o OdontoHub e a demonstração.
        </p>
      </div>
    </div>
  );
}
