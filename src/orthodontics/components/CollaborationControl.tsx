import React, { useState } from 'react';
import { ThumbsUp } from '../../icons';
import type { PatientCollaboration, CollaborationLevel } from '../types';
import { COLLABORATION_LABEL, COLLABORATION_ORDER } from '../utils/labels';
import { formatShortDate } from '../utils/format';

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  patientId: number;
  treatmentId: number;
  history: PatientCollaboration[];
  onSaved: () => void;
}

const TONE: Record<CollaborationLevel, string> = {
  excelente: 'bg-emerald-500',
  boa: 'bg-emerald-400',
  regular: 'bg-amber-400',
  baixa: 'bg-orange-500',
  muito_baixa: 'bg-rose-500',
};

/** Registro de colaboração — apenas histórico, jamais usado para decisões automáticas. */
export const CollaborationControl: React.FC<Props> = ({ apiFetch, patientId, treatmentId, history, onSaved }) => {
  const [saving, setSaving] = useState<CollaborationLevel | null>(null);

  const register = async (level: CollaborationLevel) => {
    setSaving(level);
    try {
      const res = await apiFetch(
        `/api/patients/${patientId}/orthodontics/treatments/${treatmentId}/collaboration`,
        { method: 'POST', body: JSON.stringify({ level }) }
      );
      if (res.ok) onSaved();
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <ThumbsUp size={14} className="text-slate-400" />
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Colaboração</p>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        {COLLABORATION_ORDER.map((c) => (
          <button
            key={c}
            type="button"
            disabled={saving !== null}
            onClick={() => register(c)}
            className="rounded-full px-3 py-1.5 text-[12px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50 transition"
          >
            {COLLABORATION_LABEL[c]}
          </button>
        ))}
      </div>

      {history.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {history.slice(0, 12).map((h) => (
            <span
              key={h.id}
              title={`${COLLABORATION_LABEL[h.level]} · ${formatShortDate(h.date)}`}
              className={`h-2.5 w-2.5 rounded-full ${TONE[h.level]}`}
            />
          ))}
          <span className="text-[11px] text-slate-400 ml-1">últimos registros</span>
        </div>
      )}
    </div>
  );
};
