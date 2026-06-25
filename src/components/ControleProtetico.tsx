import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Calendar, Check, ChevronDown, Plus, X } from '../icons';
import {
  DEFAULT_PROSTHETIC_CONTROL_INTERVAL_DAYS,
  PROSTHESIS_STATUS_LABELS,
  PROSTHETIC_CONTROL_CONDITIONS,
  PROSTHETIC_CONTROL_PROCEDURE,
  getProstheticControlCondition,
  isProsthesisStatus,
} from '../constants/prosthetics';

export interface ProstheticControlPayload {
  toothNumber: number;
  status: string;
  label: string;
  conditionKey: string;
  conditionLabel: string;
  observation: string;
  nextControlDate: string | null;
}

interface ToothData {
  status: string;
  notes?: string;
}

interface ControleProteticoProps {
  /** Odontograma do paciente (status por dente). */
  odontogram: Record<number, ToothData>;
  /** Evoluções do paciente — fonte dos controles já registrados. */
  evolutions: any[];
  /** Persiste um novo controle protético (como evolução clínica). */
  onRegisterControl: (payload: ProstheticControlPayload) => Promise<void>;
  readOnly?: boolean;
}

interface ProsthesisItem {
  toothNumber: number;
  status: string;
  label: string;
}

interface ControlRecord {
  id: string;
  toothNumber: number | null;
  date: string;
  conditionKey?: string;
  observation: string;
  nextDate: string | null;
}

const ISO = (d: Date) => d.toLocaleDateString('en-CA');

const addDays = (days: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return ISO(d);
};

const formatDate = (value?: string | null): string => {
  if (!value) return '';
  const datePart = value.includes('T') ? value.split('T')[0] : value;
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
};

const isOverdue = (value?: string | null): boolean => {
  if (!value) return false;
  const datePart = value.includes('T') ? value.split('T')[0] : value;
  const date = new Date(`${datePart}T23:59:59`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

const isProstheticControl = (e: any): boolean => {
  const performed = String(e?.procedure_performed || '').toLowerCase();
  const procedure = String(e?.procedure || '').toLowerCase();
  const marker = PROSTHETIC_CONTROL_PROCEDURE.toLowerCase();
  return performed.includes(marker) || procedure.includes(marker);
};

const parseTooth = (e: any): number | null => {
  const fromObs = String(e?.observations || '').match(/Elementos?:\s*(\d+)/i);
  if (fromObs) return Number(fromObs[1]);
  const fromNotes = String(e?.notes || '').match(/Dente\s*(\d+)/i);
  return fromNotes ? Number(fromNotes[1]) : null;
};

const parseCondition = (e: any): string | undefined => {
  const text = String(e?.notes || '');
  return PROSTHETIC_CONTROL_CONDITIONS.find((c) => text.includes(c.label))?.key;
};

const parseObservation = (e: any): string => {
  const notes = String(e?.notes || '');
  const sep = notes.indexOf('—');
  return sep >= 0 ? notes.slice(sep + 1).trim() : '';
};

export const ControleProtetico: React.FC<ControleProteticoProps> = ({
  odontogram,
  evolutions,
  onRegisterControl,
  readOnly = false,
}) => {
  const [activeTooth, setActiveTooth] = useState<ProsthesisItem | null>(null);
  const [expandedTooth, setExpandedTooth] = useState<number | null>(null);
  const [conditionKey, setConditionKey] = useState<string>(PROSTHETIC_CONTROL_CONDITIONS[0].key);
  const [observation, setObservation] = useState('');
  const [nextControlDate, setNextControlDate] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  const prostheses = useMemo<ProsthesisItem[]>(() => {
    const entries = Object.entries(odontogram ?? {}) as Array<[string, ToothData]>;
    return entries
      .filter(([, value]) => isProsthesisStatus(value?.status))
      .map(([tooth, value]) => ({
        toothNumber: Number(tooth),
        status: value.status,
        label: PROSTHESIS_STATUS_LABELS[value.status] || 'Prótese',
      }))
      .filter((p) => Number.isFinite(p.toothNumber) && p.toothNumber > 0)
      .sort((a, b) => a.toothNumber - b.toothNumber);
  }, [odontogram]);

  const controlsByTooth = useMemo<Map<number, ControlRecord[]>>(() => {
    const map = new Map<number, ControlRecord[]>();
    (evolutions || [])
      .filter(isProstheticControl)
      .forEach((e: any, idx: number) => {
        const toothNumber = parseTooth(e);
        if (toothNumber === null) return;
        const record: ControlRecord = {
          id: String(e.id ?? `ctrl-${idx}`),
          toothNumber,
          date: e.date || e.created_at || '',
          conditionKey: parseCondition(e),
          observation: parseObservation(e),
          nextDate: e.return_date || null,
        };
        const list = map.get(toothNumber) || [];
        list.push(record);
        map.set(toothNumber, list);
      });
    map.forEach((list, tooth) => {
      list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      map.set(tooth, list);
    });
    return map;
  }, [evolutions]);

  const openForm = (item: ProsthesisItem) => {
    setActiveTooth(item);
    setConditionKey(PROSTHETIC_CONTROL_CONDITIONS[0].key);
    setObservation('');
    setNextControlDate(addDays(DEFAULT_PROSTHETIC_CONTROL_INTERVAL_DAYS));
  };

  const closeForm = () => {
    if (isSaving) return;
    setActiveTooth(null);
  };

  const handleSubmit = async () => {
    if (!activeTooth) return;
    const condition = getProstheticControlCondition(conditionKey);
    if (!condition) return;
    setIsSaving(true);
    try {
      await onRegisterControl({
        toothNumber: activeTooth.toothNumber,
        status: activeTooth.status,
        label: activeTooth.label,
        conditionKey: condition.key,
        conditionLabel: condition.label,
        observation: observation.trim(),
        nextControlDate: nextControlDate || null,
      });
      setActiveTooth(null);
    } catch {
      /* erro tratado a montante (notificação) */
    } finally {
      setIsSaving(false);
    }
  };

  const totalControls = useMemo(
    () =>
      Array.from(controlsByTooth.values()).reduce(
        (sum: number, list: ControlRecord[]) => sum + list.length,
        0
      ),
    [controlsByTooth]
  );

  return (
    <section className="rounded-[24px] border border-slate-200/60 bg-white/95 p-4 sm:p-5 shadow-[0_8px_22px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-500 hover:shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
            <Activity size={15} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-[-0.015em] text-slate-900">Controle protético</h3>
            <p className="text-[11px] text-slate-400 mt-0.5 font-medium tabular-nums">
              {prostheses.length === 0
                ? 'Sem próteses no odontograma'
                : `${prostheses.length} prótese${prostheses.length !== 1 ? 's' : ''} · ${totalControls} controle${totalControls !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
      </div>

      {prostheses.length === 0 ? (
        <div className="rounded-2xl py-9 text-center bg-slate-50/70 border border-slate-100">
          <div className="flex flex-col items-center gap-2.5 px-6">
            <div className="w-11 h-11 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
              <Activity size={18} />
            </div>
            <p className="text-slate-800 text-sm font-bold">Nenhuma prótese registrada</p>
            <p className="text-slate-500 text-xs leading-relaxed max-w-[280px]">
              Marque coroas, próteses ou implantes no odontograma para acompanhar aqui os controles e manutenções.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {prostheses.map((item) => {
            const controls = controlsByTooth.get(item.toothNumber) || [];
            const last = controls[0];
            const lastCondition = getProstheticControlCondition(last?.conditionKey);
            const nextDate = last?.nextDate || null;
            const overdue = isOverdue(nextDate);
            const isExpanded = expandedTooth === item.toothNumber;

            return (
              <div
                key={item.toothNumber}
                className="rounded-[18px] border border-slate-200/70 bg-white p-3.5 shadow-[0_1px_4px_rgba(15,23,42,0.03)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.05)]"
              >
                <div className="flex items-start gap-3">
                  {/* tooth badge */}
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex flex-col items-center justify-center">
                    <span className="text-[13px] font-extrabold text-violet-700 leading-none tabular-nums">{item.toothNumber}</span>
                    <span className="text-[7px] font-bold uppercase tracking-wide text-violet-400 mt-0.5">dente</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-bold text-slate-900 leading-snug truncate">{item.label}</p>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => openForm(item)}
                          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-950 text-white text-[11px] font-semibold hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.15)]"
                        >
                          <Plus size={10} />
                          Controle
                        </button>
                      )}
                    </div>

                    {/* status row */}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {last ? (
                        <>
                          {lastCondition && (
                            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${lastCondition.toneClass}`}>
                              <span className={`w-[6px] h-[6px] rounded-full ${lastCondition.dotClass}`} />
                              {lastCondition.label}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 font-medium">
                            Último: {formatDate(last.date)}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 font-medium">Sem controle registrado</span>
                      )}
                    </div>

                    {nextDate && (
                      <div className={`mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold ${overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                        <Calendar size={11} />
                        {overdue ? 'Controle vencido em ' : 'Próximo controle: '}
                        {formatDate(nextDate)}
                      </div>
                    )}

                    {controls.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedTooth(isExpanded ? null : item.toothNumber)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <ChevronDown size={12} className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        {isExpanded ? 'Ocultar histórico' : `Histórico (${controls.length})`}
                      </button>
                    )}

                    <AnimatePresence initial={false}>
                      {isExpanded && controls.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-2.5 space-y-1.5 border-l-2 border-slate-100 pl-3">
                            {controls.map((ctrl) => {
                              const cond = getProstheticControlCondition(ctrl.conditionKey);
                              return (
                                <div key={ctrl.id} className="text-[11px]">
                                  <div className="flex items-center gap-2">
                                    {cond && <span className={`w-[6px] h-[6px] rounded-full ${cond.dotClass}`} />}
                                    <span className="font-semibold text-slate-700">{cond?.label || 'Controle'}</span>
                                    <span className="text-slate-400 tabular-nums">{formatDate(ctrl.date)}</span>
                                  </div>
                                  {ctrl.observation && (
                                    <p className="text-slate-500 mt-0.5 leading-relaxed pl-3.5">{ctrl.observation}</p>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Registration modal ── */}
      <AnimatePresence>
        {activeTooth && (
          <div className="fixed inset-0 z-[220] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-[2px]"
              onClick={closeForm}
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.98 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 p-5 sm:p-6"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h4 className="text-base font-bold text-slate-900">Registrar controle</h4>
                  <p className="text-[12px] text-slate-500 mt-0.5">
                    Dente {activeTooth.toothNumber} · {activeTooth.label}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="rounded-full p-2 -mr-2 -mt-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* condition */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Avaliação</p>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {PROSTHETIC_CONTROL_CONDITIONS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setConditionKey(c.key)}
                    className={`rounded-xl border px-2 py-2.5 text-[12px] font-semibold transition-all duration-200 ${
                      conditionKey === c.key
                        ? `${c.toneClass} ring-2 ring-offset-1 ring-slate-900/10`
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* observation */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Observações</p>
              <textarea
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
                placeholder="Adaptação, oclusão, higiene, ajustes realizados..."
                rows={3}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-[13px] text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-slate-400 focus:ring-0 outline-none resize-none transition-colors mb-4"
              />

              {/* next control */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Próximo controle</p>
              <div className="flex items-center gap-2 mb-5">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={nextControlDate}
                  onChange={(e) => setNextControlDate(e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-[13px] text-slate-800 focus:bg-white focus:border-slate-400 focus:ring-0 outline-none transition-colors"
                />
                {nextControlDate && (
                  <button
                    type="button"
                    onClick={() => setNextControlDate('')}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
                  >
                    Limpar
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white text-[13px] font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-slate-950 text-white text-[13px] font-bold hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 shadow-[0_2px_8px_rgba(15,23,42,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={14} />
                      Registrar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};
