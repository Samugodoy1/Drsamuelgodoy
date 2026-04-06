import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Sparkles, Activity, MapPin, Zap, Info, Palette, FlaskConical, Lock } from '../icons';
import { useNavigate } from 'react-router-dom';

interface Block {
  id: string;
  type: string;
  value: string;
  label: string;
  icon: any;
  color: string;
}

const normalizeText = (text: string) => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

const FLOWS: Record<string, { label: string, keywords: string[], stages: any[] }> = {
  ENDODONTIA: {
    label: 'Endodontia',
    keywords: ['canal', 'endo', 'acesso', 'lima', 'obturação', 'odontometria'],
    stages: [
      { id: 'endo_acesso', label: 'Acesso / Odontometria', icon: Activity, color: 'text-blue-600 bg-blue-50 border-blue-100' },
      { id: 'endo_preparo', label: 'Preparo do Canal', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-100' },
      { id: 'endo_medicacao', label: 'Medicação Intracanal', icon: FlaskConical, color: 'text-orange-600 bg-orange-50 border-orange-100' },
      { id: 'endo_selamento', label: 'Selamento Provisório', icon: Lock, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
      { id: 'endo_instrumentacao', label: 'Instrumentação', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
      { id: 'endo_obturacao', label: 'Obturação', icon: Activity, color: 'text-purple-600 bg-purple-50 border-purple-100' },
      { id: 'endo_restauracao', label: 'Restauração', icon: Palette, color: 'text-pink-600 bg-pink-50 border-pink-100' },
    ]
  },
  RESTAURACAO: {
    label: 'Restauração',
    keywords: ['resina', 'restauração', 'classe', 'a1', 'a2', 'a3', 'adesivo', 'ácido', 'cárie'],
    stages: [
      { id: 'rest_remocao', label: 'Remoção de Cárie', icon: Activity, color: 'text-red-600 bg-red-50 border-red-100' },
      { id: 'rest_preparo', label: 'Preparo Cavitário', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-100' },
      { id: 'rest_condicionamento', label: 'Condicionamento Ácido', icon: FlaskConical, color: 'text-blue-600 bg-blue-50 border-blue-100' },
      { id: 'rest_adesivo', label: 'Sistema Adesivo', icon: Sparkles, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
      { id: 'rest_insercao', label: 'Inserção da Resina', icon: Palette, color: 'text-pink-600 bg-pink-50 border-pink-100' },
      { id: 'rest_acabamento', label: 'Acabamento e Polimento', icon: Zap, color: 'text-slate-600 bg-slate-50 border-slate-100' },
    ]
  },
  PROFILAXIA: {
    label: 'Profilaxia',
    keywords: ['limpeza', 'profilaxia', 'raspagem', 'tártaro', 'polimento'],
    stages: [
      { id: 'prof_avaliacao', label: 'Avaliação', icon: Info, color: 'text-blue-600 bg-blue-50 border-blue-100' },
      { id: 'prof_raspagem', label: 'Raspagem', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
      { id: 'prof_profilaxia', label: 'Profilaxia', icon: Sparkles, color: 'text-amber-600 bg-amber-50 border-amber-100' },
      { id: 'prof_polimento', label: 'Polimento', icon: Zap, color: 'text-slate-600 bg-slate-50 border-slate-100' },
      { id: 'prof_orientacao', label: 'Orientação', icon: Info, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
    ]
  },
  CIRURGIA: {
    label: 'Cirurgia',
    keywords: ['exodontia', 'extração', 'cirurgia', 'sutura', 'anestesia', 'luxação'],
    stages: [
      { id: 'cir_anestesia', label: 'Anestesia', icon: Activity, color: 'text-blue-600 bg-blue-50 border-blue-100' },
      { id: 'cir_sindesmotomia', label: 'Sindesmotomia', icon: Activity, color: 'text-slate-600 bg-slate-50 border-slate-100' },
      { id: 'cir_luxacao', label: 'Luxação', icon: Zap, color: 'text-amber-600 bg-amber-50 border-amber-100' },
      { id: 'cir_remocao', label: 'Remoção', icon: Activity, color: 'text-red-600 bg-red-50 border-red-100' },
      { id: 'cir_curetagem', label: 'Curetagem', icon: Activity, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
      { id: 'cir_sutura', label: 'Sutura', icon: Lock, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
      { id: 'cir_posop', label: 'Pós-operatório', icon: Info, color: 'text-slate-600 bg-slate-50 border-slate-100' },
    ]
  }
};

const CLINICAL_PATTERNS = [
  // Endo
  { patterns: ['acess', 'abert'], stageId: 'endo_acesso', display: 'Acesso Coronário' },
  { patterns: ['odontometr', 'comprim'], stageId: 'endo_acesso', display: 'Odontometria' },
  { patterns: ['prepar', 'limpez', 'quimic', 'mecanic'], stageId: 'endo_preparo', display: 'Preparo do Canal' },
  { patterns: ['paramono', 'pmcc'], stageId: 'endo_medicacao', display: 'Paramonoclorofenol' },
  { patterns: ['calen'], stageId: 'endo_medicacao', display: 'Calen' },
  { patterns: ['hidroxid', 'calcio'], stageId: 'endo_medicacao', display: 'Hidróxido de Cálcio' },
  { patterns: ['civ', 'ionomer'], stageId: 'endo_selamento', display: 'CIV' },
  { patterns: ['coltosol', 'provis'], stageId: 'endo_selamento', display: 'Coltosol' },
  { patterns: ['instrument', 'lima'], stageId: 'endo_instrumentacao', display: 'Instrumentação' },
  { patterns: ['obturac', 'con'], stageId: 'endo_obturacao', display: 'Obturação' },
  { patterns: ['restaurac', 'resin'], stageId: 'endo_restauracao', display: 'Restauração' },
  
  // Rest
  { patterns: ['cari', 'remoc'], stageId: 'rest_remocao', display: 'Remoção de Cárie' },
  { patterns: ['cavidad', 'prepar'], stageId: 'rest_preparo', display: 'Preparo Cavitário' },
  { patterns: ['acid', 'condicion'], stageId: 'rest_condicionamento', display: 'Condicionamento Ácido' },
  { patterns: ['adesiv', 'bond'], stageId: 'rest_adesivo', display: 'Sistema Adesivo' },
  { patterns: ['resin', 'restaurac'], stageId: 'rest_insercao', display: 'Inserção da Resina' },
  { patterns: ['a1', 'a2', 'a3', 'b1', 'b2'], stageId: 'rest_insercao', display: (val: string) => `Cor ${val.toUpperCase()}` },
  { patterns: ['poliment', 'acabament', 'ajust'], stageId: 'rest_acabamento', display: 'Acabamento e Polimento' },

  // Prof
  { patterns: ['avaliac', 'exame'], stageId: 'prof_avaliacao', display: 'Avaliação Clínica' },
  { patterns: ['raspag', 'tartar', 'calcul'], stageId: 'prof_raspagem', display: 'Raspagem' },
  { patterns: ['profilax', 'limpez'], stageId: 'prof_profilaxia', display: 'Profilaxia' },
  { patterns: ['poliment'], stageId: 'prof_polimento', display: 'Polimento' },
  { patterns: ['orientac', 'higien', 'instru'], stageId: 'prof_orientacao', display: 'Orientação de Higiene' },

  // Cir
  { patterns: ['anestes', 'infiltr', 'bloqueio'], stageId: 'cir_anestesia', display: 'Anestesia Local' },
  { patterns: ['sindesmot'], stageId: 'cir_sindesmotomia', display: 'Sindesmotomia' },
  { patterns: ['luxac', 'alavanc'], stageId: 'cir_luxacao', display: 'Luxação' },
  { patterns: ['extrac', 'exodont', 'remoc'], stageId: 'cir_remocao', display: 'Exodontia' },
  { patterns: ['curetag'], stageId: 'cir_curetagem', display: 'Curetagem' },
  { patterns: ['sutur', 'ponto'], stageId: 'cir_sutura', display: 'Sutura' },
  { patterns: ['posop', 'pos', 'orientac'], stageId: 'cir_posop', display: 'Pós-operatório' },
];

interface NovaEvolucaoProps {
  patientId?: number;
  onSave?: (evolution: any) => Promise<void>;
  onClose?: () => void;
}

export const NovaEvolucao: React.FC<NovaEvolucaoProps> = ({ patientId, onSave, onClose }) => {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Real-time interpretation
  useEffect(() => {
    const parseInput = (text: string) => {
      const normalized = normalizeText(text);
      const words = normalized.split(/\s+/).filter(w => w.length >= 1);
      if (words.length === 0) {
        setBlocks([]);
        return;
      }

      // 1. Detect dominant flow (fuzzy)
      const flowCounts: Record<string, number> = {};
      Object.entries(FLOWS).forEach(([flowKey, flow]) => {
        flowCounts[flowKey] = words.filter(word => 
          flow.keywords.some(kw => word.startsWith(normalizeText(kw).substring(0, 5)))
        ).length;
      });
      
      const dominantFlowKey = Object.entries(flowCounts).reduce((a, b) => b[1] > a[1] ? b : a)[1] > 0 
        ? Object.entries(flowCounts).reduce((a, b) => b[1] > a[1] ? b : a)[0] 
        : null;

      const foundStages: Record<string, string[]> = {};

      words.forEach((word, index) => {
        const prevWord = index > 0 ? words[index - 1] : null;
        const nextWord = index < words.length - 1 ? words[index + 1] : null;

        // Contextual Number Handling
        if (/^\d+$/.test(word)) {
          const num = parseInt(word);
          
          // Rule: Near "lima" or "instrumento" -> Instrument size
          const isNearLima = (prevWord && prevWord.startsWith('lima')) || (nextWord && nextWord.startsWith('lima'));
          // Rule: Near "dente" or "regiao" -> Tooth
          const isNearDente = (prevWord && prevWord.startsWith('dent')) || (nextWord && nextWord.startsWith('dent'));
          // Rule: Near "obtura" -> Length
          const isNearObtura = (prevWord && prevWord.startsWith('obtur')) || (nextWord && nextWord.startsWith('obtur'));

          if (isNearLima) {
            if (!foundStages['endo_instrumentacao']) foundStages['endo_instrumentacao'] = [];
            foundStages['endo_instrumentacao'].push(`#${word}`);
            return;
          }

          if (isNearObtura) {
             if (!foundStages['endo_obturacao']) foundStages['endo_obturacao'] = [];
             foundStages['endo_obturacao'].push(`${word}mm`);
             return;
          }

          if (isNearDente || (num >= 11 && num <= 48 && !isNearLima && !isNearObtura)) {
            if (!foundStages['regiao']) foundStages['regiao'] = [];
            foundStages['regiao'].push(`Dente ${word}`);
            return;
          }
          
          // If it's a small number and we are in Endo flow, might be a lima even if not near the word
          if (dominantFlowKey === 'ENDODONTIA' && num >= 10 && num <= 80 && num % 5 === 0) {
             if (!foundStages['endo_instrumentacao']) foundStages['endo_instrumentacao'] = [];
             foundStages['endo_instrumentacao'].push(`#${word}`);
             return;
          }
        }

        // Fuzzy Pattern Matching
        for (const entry of CLINICAL_PATTERNS) {
          if (entry.patterns.some(p => word.startsWith(p))) {
            const stageBelongsToFlow = !dominantFlowKey || entry.stageId.startsWith(dominantFlowKey.toLowerCase().substring(0, 3));
            
            if (stageBelongsToFlow) {
              if (!foundStages[entry.stageId]) foundStages[entry.stageId] = [];
              const displayVal = typeof entry.display === 'function' ? entry.display(word) : entry.display;
              if (!foundStages[entry.stageId].includes(displayVal)) {
                foundStages[entry.stageId].push(displayVal);
              }
            }
            break;
          }
        }

        // mm handling
        if (word.endsWith('mm')) {
          if (!foundStages['endo_obturacao']) foundStages['endo_obturacao'] = [];
          foundStages['endo_obturacao'].push(word);
        }
      });

      // Create blocks
      const newBlocks: Block[] = [];

      // Add Region block if exists
      if (foundStages['regiao']) {
        newBlocks.push({
          id: 'regiao',
          type: 'regiao',
          label: 'Dente/Região',
          value: foundStages['regiao'].join(', '),
          icon: MapPin,
          color: 'text-slate-600 bg-slate-50 border-slate-100'
        });
      }

      // Add stages from dominant flow in order
      if (dominantFlowKey) {
        const flow = FLOWS[dominantFlowKey];
        flow.stages.forEach(stage => {
          if (foundStages[stage.id]) {
            let displayValue = foundStages[stage.id].join(' + ');
            
            // Special formatting for instrumentação
            if (stage.id === 'endo_instrumentacao') {
              const limas = foundStages[stage.id].filter(v => v.startsWith('#'));
              const others = foundStages[stage.id].filter(v => !v.startsWith('#'));
              displayValue = [...others, limas.length > 0 ? `Limas ${limas.join(', ')}` : ''].filter(Boolean).join(' | ');
            }

            newBlocks.push({
              id: stage.id,
              type: stage.id,
              label: stage.label,
              value: displayValue,
              icon: stage.icon,
              color: stage.color
            });
          }
        });
      } else {
        // Fallback for non-dominant flow terms
        Object.entries(foundStages).forEach(([stageId, values]) => {
          if (stageId === 'regiao') return;
          // Find stage config in any flow
          let stageConfig = null;
          for (const flow of Object.values(FLOWS)) {
            stageConfig = flow.stages.find(s => s.id === stageId);
            if (stageConfig) break;
          }

          if (stageConfig) {
            newBlocks.push({
              id: stageId,
              type: stageId,
              label: stageConfig.label,
              value: values.join(' + '),
              icon: stageConfig.icon,
              color: stageConfig.color
            });
          }
        });
      }

      setBlocks(newBlocks);
    };

    const timer = setTimeout(() => {
      parseInput(inputText);
    }, 100); // Small debounce for performance

    return () => clearTimeout(timer);
  }, [inputText]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  };

  const handleSave = async () => {
    if (inputText.trim() === '' && blocks.length === 0) return;
    setIsSaving(true);
    
    const evolutionText = blocks.length > 0 
      ? blocks.map(b => `[${b.label}] ${b.value}`).join(' | ')
      : inputText;

    const newEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      procedure: blocks.length > 0 ? blocks[0].label : 'Evolução Clínica',
      notes: evolutionText,
      raw: inputText,
      materials: '',
      observations: ''
    };

    if (onSave) {
      await onSave(newEntry);
    } else {
      const savedHistory = JSON.parse(localStorage.getItem('odontohub_evolutions') || '[]');
      localStorage.setItem('odontohub_evolutions', JSON.stringify([newEntry, ...savedHistory]));
    }

    await new Promise(resolve => setTimeout(resolve, 600));
    setIsSaving(false);
    setSaved(true);
    setInputText('');
    setBlocks([]);
    setTimeout(() => {
      setSaved(false);
      if (onClose) onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-[#FAFAFA] z-50 flex flex-col font-sans antialiased">
      {/* ── Header ── */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between shrink-0 safe-area-top">
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="p-2 -ml-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight truncate">Nova Evolução</h2>
            <p className="text-[10px] text-slate-400 font-medium hidden sm:block">Descreva o atendimento naturalmente</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all hidden sm:block"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || (inputText.trim() === '' && blocks.length === 0)}
            className="bg-primary hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2 px-5 sm:px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-xs sm:text-sm"
          >
            {saved ? <Check size={16} /> : isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-5 sm:py-8 space-y-4 sm:space-y-6">

          {/* Interpreted Blocks */}
          {(blocks.length > 0 || (inputText.length > 0 && blocks.length === 0)) && (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} className="text-primary" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interpretação em tempo real</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <AnimatePresence mode="popLayout">
                  {blocks.map((block) => (
                    <motion.div
                      key={block.id}
                      layout
                      initial={{ scale: 0.95, opacity: 0, y: 4 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.95, opacity: 0 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${block.color}`}
                    >
                      <block.icon size={13} />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-bold uppercase tracking-wider opacity-60 leading-none">{block.label}</span>
                        <span className="text-[11px] font-bold leading-tight mt-0.5">{block.value}</span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {blocks.length === 0 && inputText.length > 0 && (
                  <p className="text-slate-300 text-[11px] font-medium italic py-1">Interpretando...</p>
                )}
              </div>
            </div>
          )}

          {/* ── Text Area Card ── */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-6 flex flex-col min-h-[280px] sm:min-h-[360px]">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              placeholder="Descreva o atendimento naturalmente...&#10;&#10;Ex: Realizei restauração no dente 12 com resina composta A2"
              className="flex-1 w-full bg-transparent border-none focus:ring-0 text-slate-900 text-base sm:text-lg leading-relaxed placeholder:text-slate-200 font-medium resize-none outline-none"
            />
            
            {/* Quick Flow Suggestions */}
            <div className="mt-4 pt-4 border-t border-slate-50">
              <p className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-2.5">Fluxos rápidos</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: 'Endodontia', text: 'canal 15 acess odontometr preparo lima 15 20 25 obturac 21 ' },
                  { label: 'Restauração', text: '15 restaurac resin A2 poliment ' },
                  { label: 'Profilaxia', text: 'avaliac raspag tartar profilax ' },
                  { label: 'Cirurgia', text: '38 anestes sindesmot luxac extrac sutur ' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setInputText(prev => prev + (prev ? ' ' : '') + item.text)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 text-[11px] font-semibold rounded-lg transition-all active:scale-95"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── How it works (collapsible on mobile via simple display) ── */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm p-4 sm:p-5">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Como funciona</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { n: '1', text: 'Escreva o que foi feito de forma natural', color: 'bg-primary/5 text-primary' },
                { n: '2', text: 'Procedimentos, dentes e materiais são identificados', color: 'bg-blue-50 text-blue-600' },
                { n: '3', text: 'Os blocos organizam o histórico clínico', color: 'bg-violet-50 text-violet-600' },
              ].map(step => (
                <div key={step.n} className="flex items-start gap-3">
                  <div className={`w-6 h-6 rounded-lg ${step.color} flex items-center justify-center shrink-0 text-[10px] font-bold`}>
                    {step.n}
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── Success Toast ── */}
      <AnimatePresence>
        {saved && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 z-[60]"
          >
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs font-bold">Evolução salva com sucesso</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
