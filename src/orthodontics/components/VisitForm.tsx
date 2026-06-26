import React, { useMemo, useState } from 'react';
import { X, Check, Loader2 } from '../../icons';
import { VISIT_PROCEDURES, PROCEDURE_LABEL, COLLABORATION_LABEL, COLLABORATION_ORDER } from '../utils/labels';
import { todayIso } from '../utils/format';
import type { CollaborationLevel } from '../types';

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  patientId: number;
  treatmentId: number;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Registro da consulta em poucos segundos — seleção rápida em vez de formulário
 * longo. A evolução textual é gerada automaticamente e pode ser editada antes
 * de confirmar.
 */
export const VisitForm: React.FC<Props> = ({ apiFetch, patientId, treatmentId, onClose, onSaved }) => {
  const [date, setDate] = useState(todayIso());
  const [upperArch, setUpperArch] = useState('');
  const [lowerArch, setLowerArch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [collaboration, setCollaboration] = useState<CollaborationLevel | ''>('');
  const [guidance, setGuidance] = useState('');
  const [summaryEdited, setSummaryEdited] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (code: string) => {
    setSummaryEdited(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(code) ? next.delete(code) : next.add(code);
      return next;
    });
  };

  // Prévia da evolução textual (espelha a geração do backend)
  const generatedSummary = useMemo(() => {
    const parts: string[] = [];
    if (upperArch || lowerArch) {
      const a: string[] = [];
      if (upperArch) a.push(`superior ${upperArch}`);
      if (lowerArch) a.push(`inferior ${lowerArch}`);
      parts.push(`Arco ${a.join(' / ')}`);
    }
    const procs = Array.from(selected).map((c: string) => PROCEDURE_LABEL[c] || c);
    if (procs.length) parts.push(`Realizado: ${procs.join(', ')}`);
    if (collaboration) parts.push(`Colaboração ${COLLABORATION_LABEL[collaboration].toLowerCase()}`);
    if (guidance.trim()) parts.push(`Orientações: ${guidance.trim()}`);
    if (!parts.length) return 'Manutenção ortodôntica realizada.';
    return parts.join('. ') + '.';
  }, [upperArch, lowerArch, selected, collaboration, guidance]);

  const summary = summaryEdited ?? generatedSummary;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(
        `/api/patients/${patientId}/orthodontics/treatments/${treatmentId}/visits`,
        {
          method: 'POST',
          body: JSON.stringify({
            date,
            upper_arch: upperArch || null,
            lower_arch: lowerArch || null,
            procedures: Array.from(selected),
            collaboration: collaboration || null,
            guidance: guidance || null,
            summary_text: summary,
          }),
        }
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || 'Falha ao salvar manutenção');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-900/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-slate-900">Registrar manutenção</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <X size={15} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Data</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Arco superior</span>
              <input
                value={upperArch}
                onChange={(e) => { setSummaryEdited(null); setUpperArch(e.target.value); }}
                placeholder="ex: NiTi .014"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Arco inferior</span>
              <input
                value={lowerArch}
                onChange={(e) => { setSummaryEdited(null); setLowerArch(e.target.value); }}
                placeholder="ex: NiTi .014"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
              />
            </label>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Procedimentos</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {VISIT_PROCEDURES.map((p) => {
                const active = selected.has(p.code);
                return (
                  <button
                    key={p.code}
                    type="button"
                    onClick={() => toggle(p.code)}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      active
                        ? 'bg-slate-950 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Colaboração</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLLABORATION_ORDER.map((c) => {
                const active = collaboration === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setSummaryEdited(null); setCollaboration(active ? '' : c); }}
                    className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {COLLABORATION_LABEL[c]}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Orientações</span>
            <input
              value={guidance}
              onChange={(e) => { setSummaryEdited(null); setGuidance(e.target.value); }}
              placeholder="Orientações ao paciente"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px]"
            />
          </label>

          <div>
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Evolução (gerada automaticamente)</span>
            <textarea
              value={summary}
              onChange={(e) => setSummaryEdited(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-[13px] leading-snug"
            />
          </div>

          {error && <p className="text-[12px] text-rose-600 font-medium">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white px-5 py-4 border-t border-slate-100 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-[13px] font-semibold text-slate-600"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-slate-950 text-white py-2.5 text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Salvar manutenção
          </button>
        </div>
      </div>
    </div>
  );
};
