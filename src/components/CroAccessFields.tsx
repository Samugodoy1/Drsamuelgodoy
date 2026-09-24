import React from 'react';
import { ChevronDown } from '../icons';
import { BRAZILIAN_CRO_STATES } from '../constants/croStates';

type CroAccessFieldsProps = {
  croUf: string;
  croNumber: string;
  onChange: (next: { croUf?: string; croNumber?: string }) => void;
  disabled?: boolean;
  hint?: boolean;
};

export function CroAccessFields({
  croUf,
  croNumber,
  onChange,
  disabled = false,
  hint = true,
}: CroAccessFieldsProps) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-[13px] font-medium text-[#6e6e73] mb-2">Conselho</label>
        <div className="relative">
          <select
            required
            disabled={disabled}
            value={croUf}
            onChange={(e) => onChange({ croUf: e.target.value })}
            className="ios-input w-full h-[48px] text-[17px] appearance-none pr-10"
          >
            <option value="">UF</option>
            {BRAZILIAN_CRO_STATES.map((state) => (
              <option key={state.uf} value={state.uf}>
                {state.uf} · {state.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={16}
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#86868b]"
          />
        </div>
      </div>

      <div>
        <label className="block text-[13px] font-medium text-[#6e6e73] mb-2">Número de inscrição</label>
        <input
          type="text"
          inputMode="numeric"
          required
          disabled={disabled}
          placeholder="102441"
          value={croNumber}
          onChange={(e) => onChange({ croNumber: e.target.value.replace(/\D/g, '') })}
          className="ios-input w-full h-[48px] text-[17px]"
        />
      </div>

      {hint && (
        <p className="text-[13px] text-[#86868b] leading-relaxed">
          A clínica abre para cirurgião-dentista com inscrição no CRO.
        </p>
      )}
    </div>
  );
}
