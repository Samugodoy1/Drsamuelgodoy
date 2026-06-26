import React, { useState } from 'react';
import { X, Check, Loader2 } from '../../icons';
import { STATUS_LABEL } from '../utils/labels';
import { todayIso } from '../utils/format';
import type { OrthoStatus } from '../types';

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  patientId: number;
  onClose: () => void;
  onCreated: () => void;
}

const STATUS_OPTIONS: OrthoStatus[] = ['planejamento', 'ativo', 'pausado', 'contencao', 'finalizado'];

/** Criação do tratamento ortodôntico — ativa toda a experiência ortodôntica. */
export const CreateTreatmentModal: React.FC<Props> = ({ apiFetch, patientId, onClose, onCreated }) => {
  const [status, setStatus] = useState<OrthoStatus>('ativo');
  const [startDate, setStartDate] = useState(todayIso());
  const [estimatedEnd, setEstimatedEnd] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/patients/${patientId}/orthodontics/treatments`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          start_date: startDate || null,
          estimated_end_date: estimatedEnd || null,
          notes: notes || null,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao criar tratamento');
      }
      onCreated();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar tratamento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl">
        <div className="px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-slate-900">Iniciar tratamento ortodôntico</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Situação</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    status === s ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Início</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Previsão de término</span>
              <input
                type="date"
                value={estimatedEnd}
                onChange={(e) => setEstimatedEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Observações</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="flex-1 rounded-xl bg-slate-950 text-white py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Iniciar
          </button>
        </div>
      </div>
    </div>
  );
};
