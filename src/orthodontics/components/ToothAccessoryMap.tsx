import React, { useMemo, useState } from 'react';
import { X, Check } from '../../icons';
import type { OrthoTooth } from '../types';
import { TOOTH_ACCESSORIES } from '../utils/labels';

interface Props {
  apiFetch: (input: string, init?: any) => Promise<Response>;
  patientId: number;
  treatmentId: number;
  teeth: OrthoTooth[];
  /** odontograma restaurador (somente leitura) para o painel lateral */
  odontogram?: Record<string, any>;
  /** histórico do dente (somente leitura) para o painel lateral */
  toothHistory?: any[];
  onSaved: () => void;
}

// Numeração FDI — dentição permanente
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

/**
 * Camada ortodôntica do odontograma. Convive com a camada restauradora — nunca
 * a remove. Ao clicar num dente abre o painel lateral, separando claramente as
 * informações odontológicas, ortodônticas e o histórico do dente.
 */
export const ToothAccessoryMap: React.FC<Props> = ({
  apiFetch,
  patientId,
  treatmentId,
  teeth,
  odontogram,
  toothHistory,
  onSaved,
}) => {
  const [openTooth, setOpenTooth] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const byTooth = useMemo(() => {
    const map: Record<number, OrthoTooth> = {};
    for (const t of teeth) map[t.tooth_number] = t;
    return map;
  }, [teeth]);

  const current = openTooth !== null ? byTooth[openTooth] : undefined;
  const currentAccessories = current?.accessories || [];

  const toggleAccessory = async (acc: string) => {
    if (openTooth === null) return;
    const next = currentAccessories.includes(acc)
      ? currentAccessories.filter((a) => a !== acc)
      : [...currentAccessories, acc];
    setSaving(true);
    try {
      const res = await apiFetch(
        `/api/patients/${patientId}/orthodontics/treatments/${treatmentId}/teeth/${openTooth}`,
        { method: 'PUT', body: JSON.stringify({ accessories: next }) }
      );
      if (res.ok) onSaved();
    } finally {
      setSaving(false);
    }
  };

  const ToothButton: React.FC<{ n: number }> = ({ n }) => {
    const hasAcc = (byTooth[n]?.accessories?.length || 0) > 0;
    return (
      <button
        onClick={() => setOpenTooth(n)}
        className={`relative h-9 w-9 rounded-lg border text-[11px] font-semibold transition ${
          hasAcc
            ? 'border-slate-900 bg-slate-900 text-white'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
        } ${openTooth === n ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
        title={hasAcc ? byTooth[n].accessories.join(', ') : `Dente ${n}`}
      >
        {n}
      </button>
    );
  };

  const restorative = openTooth !== null && odontogram ? odontogram[String(openTooth)] : null;
  const history = (toothHistory || []).filter((h: any) => Number(h.tooth_number) === openTooth);

  return (
    <div className="rounded-[22px] border border-slate-200/70 bg-white p-4 sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400 mb-3">
        Acessórios ortodônticos por dente
      </p>

      <div className="space-y-2 overflow-x-auto">
        <div className="flex gap-1.5 justify-center min-w-max">
          {UPPER.map((n) => (
            <ToothButton key={n} n={n} />
          ))}
        </div>
        <div className="flex gap-1.5 justify-center min-w-max">
          {LOWER.map((n) => (
            <ToothButton key={n} n={n} />
          ))}
        </div>
      </div>

      {openTooth !== null && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-slate-900/40 backdrop-blur-sm" onClick={() => setOpenTooth(null)}>
          <div
            className="w-full sm:max-w-sm bg-white h-full overflow-y-auto p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[17px] font-bold text-slate-900">Dente {openTooth}</h3>
              <button onClick={() => setOpenTooth(null)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                <X size={15} />
              </button>
            </div>

            {/* Informações ortodônticas */}
            <section className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Ortodontia</p>
              <div className="flex flex-wrap gap-2">
                {TOOTH_ACCESSORIES.map((acc) => {
                  const active = currentAccessories.includes(acc);
                  return (
                    <button
                      key={acc}
                      disabled={saving}
                      onClick={() => toggleAccessory(acc)}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-semibold transition disabled:opacity-50 ${
                        active ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {active && <Check size={11} />}
                      {acc}
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Informações odontológicas (somente leitura) */}
            <section className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Odontológico</p>
              {restorative ? (
                <p className="text-[13px] text-slate-600">
                  {typeof restorative === 'string' ? restorative : JSON.stringify(restorative)}
                </p>
              ) : (
                <p className="text-[13px] text-slate-400">Sem registro restaurador neste dente.</p>
              )}
            </section>

            {/* Histórico do dente */}
            <section>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Histórico</p>
              {history.length === 0 ? (
                <p className="text-[13px] text-slate-400">Sem histórico.</p>
              ) : (
                <ul className="space-y-1.5">
                  {history.map((h: any) => (
                    <li key={h.id} className="rounded-xl bg-slate-50 px-3 py-2">
                      <p className="text-[13px] font-semibold text-slate-700">{h.procedure}</p>
                      {h.notes && <p className="text-[12px] text-slate-400">{h.notes}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
