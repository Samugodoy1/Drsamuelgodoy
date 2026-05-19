import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Sparkles, Activity, MapPin, Zap, Info, FlaskConical, Lock, Palette, Calendar, User, FileText, ArrowRight } from '../icons';
import { useNavigate } from 'react-router-dom';
import { formatAppointmentDate, formatAppointmentTime } from '../utils/dateUtils';

// ── Interpretation engine (kept from original) ─────────────────────────────

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const CLINICAL_PATTERNS = [
  // Endo
  { patterns: ['acess', 'abert'], category: 'procedure', display: 'Acesso Coronário' },
  { patterns: ['odontometr', 'comprim'], category: 'procedure', display: 'Odontometria' },
  { patterns: ['prepar', 'quimic', 'mecanic'], category: 'procedure', display: 'Preparo do Canal' },
  { patterns: ['paramono', 'pmcc'], category: 'material', display: 'Paramonoclorofenol' },
  { patterns: ['calen'], category: 'material', display: 'Calen' },
  { patterns: ['hidroxid', 'calcio'], category: 'material', display: 'Hidróxido de Cálcio' },
  { patterns: ['civ', 'ionomer'], category: 'material', display: 'CIV' },
  { patterns: ['coltosol', 'provis'], category: 'material', display: 'Coltosol' },
  { patterns: ['instrument'], category: 'procedure', display: 'Instrumentação' },
  { patterns: ['obturac'], category: 'procedure', display: 'Obturação' },
  { patterns: ['restaurac', 'resin'], category: 'procedure', display: 'Restauração' },
  // Rest
  { patterns: ['cari', 'remoc'], category: 'procedure', display: 'Remoção de Cárie' },
  { patterns: ['cavidad'], category: 'procedure', display: 'Preparo Cavitário' },
  { patterns: ['acid', 'condicion'], category: 'procedure', display: 'Condicionamento Ácido' },
  { patterns: ['adesiv', 'bond'], category: 'material', display: 'Sistema Adesivo' },
  { patterns: ['poliment', 'acabament', 'ajust'], category: 'procedure', display: 'Acabamento e Polimento' },
  // Prof
  { patterns: ['avaliac', 'exame'], category: 'procedure', display: 'Avaliação Clínica' },
  { patterns: ['raspag', 'tartar', 'calcul'], category: 'procedure', display: 'Raspagem' },
  { patterns: ['profilax', 'limpez'], category: 'procedure', display: 'Profilaxia' },
  // Cir
  { patterns: ['anestes', 'infiltr', 'bloqueio'], category: 'procedure', display: 'Anestesia Local' },
  { patterns: ['sindesmot'], category: 'procedure', display: 'Sindesmotomia' },
  { patterns: ['luxac', 'alavanc'], category: 'procedure', display: 'Luxação' },
  { patterns: ['extrac', 'exodont'], category: 'procedure', display: 'Exodontia' },
  { patterns: ['curetag'], category: 'procedure', display: 'Curetagem' },
  { patterns: ['sutur', 'ponto'], category: 'procedure', display: 'Sutura' },
  // Common
  { patterns: ['retorno', 'proximo', 'voltar', 'semana', 'dias'], category: 'next_step', display: '' },
];

interface Interpretation {
  teeth: string[];
  procedures: string[];
  materials: string[];
  nextStep: string | null;
}

function interpretText(text: string): Interpretation {
  const normalized = normalizeText(text);
  const words = normalized.split(/\s+/).filter(w => w.length >= 1);

  const teeth: string[] = [];
  const procedures = new Set<string>();
  const materials = new Set<string>();
  let nextStep: string | null = null;

  words.forEach((word, index) => {
    // Detect tooth numbers (11-48)
    if (/^\d+$/.test(word)) {
      const num = parseInt(word);
      const prevWord = index > 0 ? words[index - 1] : null;
      const isNearLima = prevWord && prevWord.startsWith('lima');
      if (!isNearLima && num >= 11 && num <= 48) {
        teeth.push(String(num));
        return;
      }
      // Lima sizes
      if (isNearLima) {
        materials.add(`Lima #${word}`);
        return;
      }
    }

    // Pattern matching
    for (const entry of CLINICAL_PATTERNS) {
      if (entry.patterns.some(p => word.startsWith(p))) {
        if (entry.category === 'procedure' && entry.display) procedures.add(entry.display);
        if (entry.category === 'material' && entry.display) materials.add(entry.display);
        if (entry.category === 'next_step') {
          // Capture next step as the rest of the sentence from this point
          const remaining = words.slice(index).join(' ');
          if (remaining.length > 3) nextStep = remaining.charAt(0).toUpperCase() + remaining.slice(1);
        }
        break;
      }
    }

    // Color codes (A1, A2, B1, etc.)
    if (/^[ab][1-4]$/i.test(word)) {
      materials.add(`Cor ${word.toUpperCase()}`);
    }
  });

  return {
    teeth: [...new Set(teeth)],
    procedures: [...procedures],
    materials: [...materials],
    nextStep,
  };
}

// ── Chip presets ────────────────────────────────────────────────────────────

const CHIP_PRESETS = [
  { label: 'Dente/região', text: 'Dente ', icon: MapPin },
  { label: 'Procedimento', text: '', icon: Activity },
  { label: 'Material', text: '', icon: FlaskConical },
  { label: 'Intercorrência', text: 'Intercorrência: ', icon: Info },
  { label: 'Próximo passo', text: 'Próximo passo: ', icon: ArrowRight },
  { label: 'Retorno', text: 'Retorno em ', icon: Calendar },
];

// ── Types ──────────────────────────────────────────────────────────────────

interface AppointmentContext {
  id: number;
  patient_name?: string;
  procedure?: string;
  notes?: string;
  start_time?: string;
  status?: string;
}

interface NovaEvolucaoProps {
  patientId?: number;
  patientName?: string;
  appointment?: AppointmentContext | null;
  onSave?: (evolution: any) => Promise<void>;
  onClose?: () => void;
}

export const NovaEvolucao: React.FC<NovaEvolucaoProps> = ({
  patientId,
  patientName,
  appointment,
  onSave,
  onClose,
}) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isClosingAppointment = Boolean(appointment?.id);
  const automaticDraftText = isClosingAppointment
    ? 'Ex: Acesso coronário no dente 47, odontometria realizada, instrumentação inicial com lima #15. Paciente sem intercorrências. Retorno em 7 dias para obturação.'
    : '';
  const [inputText, setInputText] = useState(automaticDraftText);
  const [interpretation, setInterpretation] = useState<Interpretation>({ teeth: [], procedures: [], materials: [], nextStep: null });
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const displayName = patientName || appointment?.patient_name || 'Paciente';

  // Debug logs
  console.log('[NovaEvolucao] opened:', { mode: isClosingAppointment ? 'close_appointment' : 'manual_record', patientId, appointment_id: appointment?.id, appointment_status: appointment?.status, appointment_start_time: appointment?.start_time });
  const displayProcedure = appointment?.notes || appointment?.procedure || null;
  const displayDate = appointment?.start_time
    ? formatAppointmentDate(appointment.start_time, { day: '2-digit', month: '2-digit', year: 'numeric' }) || null
    : null;
  const displayTime = appointment?.start_time
    ? (() => {
        const time = formatAppointmentTime(appointment.start_time);
        return time === '--:--' ? null : time;
      })()
    : null;

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Subtle real-time interpretation
  useEffect(() => {
    const timer = setTimeout(() => {
      setInterpretation(interpretText(inputText));
    }, 200);
    return () => clearTimeout(timer);
  }, [inputText]);

  const hasInterpretation = interpretation.teeth.length > 0 ||
    interpretation.procedures.length > 0 ||
    interpretation.materials.length > 0 ||
    interpretation.nextStep;

  const handleSave = async () => {
    if (inputText.trim() === '') return;
    setIsSaving(true);
    console.log('[NovaEvolucao] handleSave:', { mode: isClosingAppointment ? 'close_appointment' : 'manual_record', patientId, appointment_id: appointment?.id, textLength: inputText.length });

    const newEntry: Record<string, unknown> = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      procedure: interpretation.procedures.length > 0
        ? interpretation.procedures[0]
        : 'Evolução Clínica',
      procedure_performed: interpretation.procedures.join(', ') || undefined,
      notes: inputText,
      raw: inputText,
      materials: interpretation.materials.join(', ') || '',
      observations: '',
    };

    if (appointment?.id) {
      newEntry.appointment_id = appointment.id;
    }

    if (onSave) {
      await onSave(newEntry);
    } else {
      const savedHistory = JSON.parse(localStorage.getItem('odontohub_evolutions') || '[]');
      localStorage.setItem('odontohub_evolutions', JSON.stringify([newEntry, ...savedHistory]));
    }

    await new Promise(resolve => setTimeout(resolve, 400));
    setIsSaving(false);
    setSaved(true);
    setInputText('');
    setInterpretation({ teeth: [], procedures: [], materials: [], nextStep: null });
    setTimeout(() => {
      setSaved(false);
      if (onClose) onClose();
    }, 1800);
  };

  const insertChipText = (text: string) => {
    if (text) {
      setInputText(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + text);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 bg-[#F7F7F8] z-50 flex flex-col font-sans antialiased">
      {/* ── Header ── */}
      <header className="ios-glass-heavy border-b border-slate-100/60 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shrink-0 safe-area-top shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="p-2 -ml-2 hover:bg-slate-100/80 rounded-xl text-slate-400 transition-all ios-press shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">
              {isClosingAppointment ? 'Fechar atendimento' : 'Registro clínico'}
            </h2>
            <p className="text-[10px] text-slate-400 font-medium truncate">
              {isClosingAppointment ? 'Registre só o essencial antes de seguir.' : 'Adicione uma observação clínica ao prontuário.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-100/80 rounded-xl transition-all hidden sm:block ios-press"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || inputText.trim() === ''}
            className="bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 px-4 sm:px-5 rounded-xl flex items-center gap-2 transition-all ios-press text-xs sm:text-sm shadow-[0_2px_8px_rgba(139,92,246,0.25)]"
          >
            {saved ? <Check size={16} /> : isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isClosingAppointment ? (
              'Salvar e fechar atendimento'
            ) : (
              'Salvar registro'
            )}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-5">

          {/* ── Appointment context card (only when closing a specific appointment) ── */}
          {isClosingAppointment && (
            <div className="bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-5 h-5 rounded-md bg-emerald-50 flex items-center justify-center">
                  <Check size={12} className="text-emerald-600" />
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fechando atendimento</span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                  <User size={16} className="text-slate-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{displayName}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    {displayProcedure && (
                      <span className="text-[11px] text-slate-500 font-medium">{displayProcedure}</span>
                    )}
                    {displayProcedure && displayDate && (
                      <span className="text-slate-300">·</span>
                    )}
                    {displayDate && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        {displayDate}{displayTime ? ` · ${displayTime}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-bold">
                      <FileText size={10} />
                      Atendimento concluído · evolução pendente
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Main text area ── */}
          <div className="bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_4px_16px_rgba(15,23,42,0.04)] p-4 sm:p-6 flex flex-col min-h-[240px] sm:min-h-[320px]">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                isClosingAppointment
                ? ''
                : 'Descreva a observação clínica...'
              }
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-900 text-base sm:text-lg leading-relaxed placeholder:text-slate-200 font-medium resize-none outline-none"
            />

            {/* Character count */}
            {inputText.length > 0 && (
              <div className="flex justify-end mb-2">
                <span className="text-[10px] font-medium text-slate-300 tabular-nums">{inputText.length} caracteres</span>
              </div>
            )}

            {/* Quick chip presets */}
            <div className="mt-3 pt-3 border-t border-slate-50">
              <div className="flex flex-wrap gap-1.5">
                {CHIP_PRESETS.map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => insertChipText(chip.text)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50/80 hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-[10px] font-semibold rounded-lg transition-all ios-press border border-slate-100/60"
                  >
                    <chip.icon size={11} />
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            {/* "O que não pode faltar" hint — only when textarea is empty */}
            {isClosingAppointment && inputText.length === 0 && (
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">O que não pode faltar</p>
                <div className="text-[11px] text-slate-300 font-medium leading-relaxed space-y-0.5">
                  <p>• Dente/região</p>
                  <p>• Conduta realizada</p>
                  <p>• Material usado</p>
                  <p>• Intercorrência, se teve</p>
                  <p>• Próximo passo</p>
                  <p>• Retorno</p>
                </div>
              </div>
            )}
          </div>

          {/* ── "O que entendi" — subtle interpretation card ── */}
          <div className="bg-white/95 rounded-2xl sm:rounded-3xl border border-slate-100/80 shadow-[0_2px_8px_rgba(15,23,42,0.03)] p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 rounded-md bg-primary/8 flex items-center justify-center">
                <Sparkles size={12} className="text-primary" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">O que entendi</span>
            </div>

            {hasInterpretation ? (
              <div className="space-y-2">
                {interpretation.teeth.length > 0 && (
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Dentes</span>
                      <p className="text-xs text-slate-700 font-semibold">{interpretation.teeth.join(', ')}</p>
                    </div>
                  </div>
                )}
                {interpretation.procedures.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Activity size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Procedimento</span>
                      <p className="text-xs text-slate-700 font-semibold">{interpretation.procedures.join(' + ')}</p>
                    </div>
                  </div>
                )}
                {interpretation.materials.length > 0 && (
                  <div className="flex items-start gap-2">
                    <FlaskConical size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Materiais</span>
                      <p className="text-xs text-slate-700 font-semibold">{interpretation.materials.join(', ')}</p>
                    </div>
                  </div>
                )}
                {interpretation.nextStep && (
                  <div className="flex items-start gap-2">
                    <ArrowRight size={13} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-300 uppercase">Próximo passo</span>
                      <p className="text-xs text-slate-700 font-semibold">{interpretation.nextStep}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-slate-300 font-medium italic">
                {inputText.length > 0
                  ? 'Interpretando...'
                  : 'Comece escrevendo o que foi feito. Eu organizo o resto.'}
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
            <span className="text-[13px] font-semibold">
              {isClosingAppointment
                ? 'Atendimento fechado. A evolução ficou salva no prontuário.'
                : 'Registro salvo no prontuário.'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
