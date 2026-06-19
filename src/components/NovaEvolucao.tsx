import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Calendar, Info, ClipboardList, FileText } from '../icons';
import { useNavigate } from 'react-router-dom';
import { buildEvolutionDraft } from '../utils/evolutionDraft';
import { parseClinicalText } from '../utils/clinicalParser';
import { buildShortcuts, type EvolutionShortcut } from '../utils/evolutionShortcuts';
import { CLINICAL_PROCEDURES } from '../constants/clinicalProcedures';

interface NovaEvolucaoProps {
  patientId?: number;
  /** Plano de tratamento estruturado do paciente (fonte primária do rascunho). */
  treatmentPlan?: any[];
  /** Última evolução do paciente (fallback do rascunho). */
  lastEvolution?: any | null;
  /** Acesso à API para buscar o histórico do dentista (Pilar B). */
  apiFetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  onSave?: (evolution: any) => Promise<void>;
  onClose?: () => void;
}

const RETURN_PRESETS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '60 dias', days: 60 },
  { label: 'Sem retorno', days: null as number | null },
];

export const NovaEvolucao: React.FC<NovaEvolucaoProps> = ({
  patientId,
  treatmentPlan = [],
  lastEvolution = null,
  apiFetch,
  onSave,
  onClose,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Rascunho pré-montado a partir da melhor fonte disponível (Pilar A).
  const draft = useMemo(
    () => buildEvolutionDraft({ treatmentPlan, lastEvolution }),
    [treatmentPlan, lastEvolution]
  );

  const [inputText, setInputText] = useState(draft.text);
  const [returnDays, setReturnDays] = useState<number | null>(draft.return.days);
  const [returnReason, setReturnReason] = useState(draft.return.reason);
  // Uma vez sobrescrito pelo dentista, o retorno para de auto-ajustar.
  const [returnOverridden, setReturnOverridden] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Pilar B — atalhos aprendidos do próprio dentista.
  const [shortcuts, setShortcuts] = useState<EvolutionShortcut[]>([]);
  const [appliedShortcutId, setAppliedShortcutId] = useState<string | null>(null);

  const computeReturnDate = (days: number | null): string | null => {
    if (days === null) return null;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-CA');
  };

  // Posiciona o cursor no fim do rascunho para revisão imediata (sem selecionar tudo).
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, []);

  // Busca o histórico do dentista e deriva atalhos. Silencioso em qualquer falha:
  // se não houver histórico suficiente, simplesmente não mostra nada.
  useEffect(() => {
    if (!apiFetch) return;
    let active = true;
    (async () => {
      try {
        const res = await apiFetch('/api/evolutions/recent?limit=300');
        if (!res.ok) return;
        const rows = await res.json();
        if (!active || !Array.isArray(rows)) return;
        setShortcuts(buildShortcuts(rows));
      } catch {
        /* sem atalhos — sem estado de erro forçado */
      }
    })();
    return () => {
      active = false;
    };
  }, [apiFetch]);

  const applyShortcut = (shortcut: EvolutionShortcut) => {
    setInputText(shortcut.text);
    setReturnDays(shortcut.returnDays);
    setReturnOverridden(true);
    setReturnReason(
      shortcut.returnDays === null
        ? 'Sem retorno — padrão que você costuma usar neste caso.'
        : `Retorno de ${shortcut.returnDays} dias — padrão aprendido do seu uso.`
    );
    setAppliedShortcutId(shortcut.id);
    const el = inputRef.current;
    if (el) {
      el.focus();
      const end = shortcut.text.length;
      requestAnimationFrame(() => el.setSelectionRange(end, end));
    }
  };

  const handleReturnSelect = (days: number | null) => {
    setReturnDays(days);
    setReturnOverridden(true);
    setReturnReason(
      days === null
        ? 'Sem retorno programado para este atendimento.'
        : 'Prazo definido por você.'
    );
  };

  const handleSave = async () => {
    if (inputText.trim() === '') return;
    setIsSaving(true);

    // Parsing roda UMA única vez, aqui no save (background), só pra estruturar.
    const parsed = parseClinicalText(inputText);
    const draftProcedureLabel = draft.procedureKey
      ? CLINICAL_PROCEDURES[draft.procedureKey]?.label
      : undefined;
    const procedurePerformed = parsed.procedure || draftProcedureLabel || 'Evolução clínica';

    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      procedure: procedurePerformed,
      procedure_performed: procedurePerformed,
      notes: inputText.trim(),
      raw: inputText,
      materials: parsed.materials.join(', '),
      observations: parsed.teeth.length > 0 ? `Elementos: ${parsed.teeth.join(', ')}` : '',
      teeth: parsed.teeth,
      return_date: computeReturnDate(returnDays),
      draft_source: draft.source,
    };

    if (onSave) {
      await onSave(newEntry);
    } else {
      const savedHistory = JSON.parse(localStorage.getItem('odontohub_evolutions') || '[]');
      localStorage.setItem('odontohub_evolutions', JSON.stringify([newEntry, ...savedHistory]));
    }

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      if (onClose) onClose();
    }, 1400);
  };

  const returnDate = returnDays !== null ? computeReturnDate(returnDays) : null;

  return (
    <div className="fixed inset-0 bg-[#F7F7F8] z-50 flex flex-col font-sans antialiased">
      {/* ── Header ── */}
      <header className="ios-glass-heavy border-b border-slate-100/60 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shrink-0 safe-area-top shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => (onClose ? onClose() : navigate(-1))}
            className="p-2 -ml-2 hover:bg-slate-100/80 rounded-xl text-slate-400 transition-all ios-press shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Nova Evolução</h2>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (onClose ? onClose() : navigate(-1))}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-xl transition-all hidden sm:block ios-press"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || inputText.trim() === ''}
            className="bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 px-5 sm:px-6 rounded-xl flex items-center gap-2 transition-all ios-press text-xs sm:text-sm shadow-[0_2px_8px_rgba(12,155,114,0.25)]"
          >
            {saved ? (
              <Check size={16} />
            ) : isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Confirmar'
            )}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

          {/* ── Atalhos aprendidos do dentista (Pilar B) — só aparecem se houver ── */}
          {shortcuts.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2.5 px-1">
                Seus atalhos
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {shortcuts.map((s) => {
                  const isApplied = appliedShortcutId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => applyShortcut(s)}
                      className={`text-left p-3 rounded-2xl border transition-all ios-press ${
                        isApplied
                          ? 'bg-primary/[0.08] border-primary/30 shadow-[0_2px_8px_rgba(12,155,114,0.12)]'
                          : 'bg-white/95 border-slate-100/80 hover:border-primary/20 shadow-[0_2px_8px_rgba(15,23,42,0.04)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary truncate">
                          {s.title}
                        </span>
                        <span className="text-[9px] font-semibold text-slate-300 shrink-0 tabular-nums">
                          {s.count}×
                        </span>
                      </div>
                      <p className="text-[12px] font-medium text-slate-600 leading-snug line-clamp-2">
                        {s.text}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-slate-400">
                        {isApplied ? <Check size={11} className="text-primary" /> : <Calendar size={11} />}
                        <span>
                          {isApplied
                            ? 'Aplicado'
                            : s.returnDays === null
                            ? 'Sem retorno'
                            : `Retorno ${s.returnDays} dias`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Rótulo honesto de rascunho (nunca fingir autoria) ── */}
          {draft.source !== 'none' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-primary/[0.06] border border-primary/15"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ClipboardList size={14} className="text-primary" />
              </div>
              <p className="text-[12px] font-semibold text-primary leading-tight">{draft.sourceLabel}</p>
            </motion.div>
          )}

          {/* ── Card de texto (nasce preenchido, sempre editável) ── */}
          <div className="bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-6 flex flex-col min-h-[240px] sm:min-h-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={13} className="text-slate-300" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {draft.source === 'none' ? 'Registro do atendimento' : 'Revise e confirme'}
              </span>
            </div>
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Descreva o que foi feito no atendimento..."
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-900 text-base sm:text-lg leading-relaxed placeholder:text-slate-200 font-medium resize-none outline-none"
            />
            {inputText.length > 0 && (
              <div className="flex justify-end pt-2">
                <span className="text-[10px] font-medium text-slate-300 tabular-nums">{inputText.length} caracteres</span>
              </div>
            )}
          </div>

          {/* ── Retorno sugerido (derivado do procedimento) ── */}
          <div className="bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-5">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2.5">Retorno sugerido</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {RETURN_PRESETS.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleReturnSelect(item.days)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ios-press border ${
                    returnDays === item.days
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'bg-slate-50/80 hover:bg-slate-100 text-slate-500 border-slate-100/60'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Micro-texto do porquê (some quando "sem retorno") */}
            <p className="text-[11px] text-slate-400 font-medium flex items-start gap-1.5">
              <Info size={12} className="mt-0.5 shrink-0" />
              <span>
                {returnReason}
                {!returnOverridden && draft.source !== 'none' && ' (derivado do procedimento)'}
              </span>
            </p>

            {returnDate && (
              <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mt-2">
                <Calendar size={12} />
                O OdontoHub lembra você em{' '}
                {new Date(`${returnDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Success Toast ── */}
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-xl text-white px-6 py-3.5 rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.3)] flex items-center gap-2.5 z-[60]"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
              <Check size={11} className="text-white" />
            </div>
            <span className="text-[13px] font-semibold">Evolução confirmada e registrada</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
