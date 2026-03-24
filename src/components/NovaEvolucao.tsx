import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Check, Sparkles, Activity, MapPin, Zap, Info, Palette, FlaskConical, Lock } from 'lucide-react';
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
    <div className="fixed inset-0 bg-[#F7F8FA] z-50 flex flex-col font-sans text-[#0F172A] antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 h-20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="p-2 hover:bg-slate-50 rounded-xl text-[#64748B] transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-[#0F172A] tracking-tight">Nova Evolução Clínica</h2>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Atendimento em tempo real</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onClose ? onClose() : navigate(-1)}
            className="px-6 py-2.5 text-sm font-bold text-[#64748B] hover:bg-slate-50 rounded-xl transition-all border-none"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving || (inputText.trim() === '' && blocks.length === 0)}
            className="bg-[#22C55E] hover:bg-[#16A34A] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 px-8 rounded-xl shadow-sm flex items-center gap-2 transition-all active:scale-95 text-sm border-none"
          >
            {saved ? <Check size={18} /> : isSaving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Salvar Evolução'
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex">
        {/* Main Editor Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            {/* Blocks Area - Real-time interpretation */}
            <div className="flex flex-wrap gap-3 min-h-[48px]">
              <AnimatePresence mode="popLayout">
                {blocks.map((block) => (
                  <motion.div
                    key={block.id}
                    layout
                    initial={{ scale: 0.98, opacity: 0, y: 5 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.98, opacity: 0, y: -5 }}
                    className={`group relative flex items-center gap-3 px-5 py-3 rounded-2xl shadow-sm border-none ${
                      block.type === 'regiao' 
                        ? 'bg-slate-100 text-[#64748B]' 
                        : 'bg-emerald-50 text-[#22C55E]'
                    }`}
                  >
                    <block.icon size={16} />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-70">{block.label}</span>
                      <span className="text-sm font-bold tracking-tight">{block.value}</span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              
              {blocks.length === 0 && inputText.length > 0 && (
                <div className="py-2">
                  <p className="text-[#94A3B8] text-[11px] font-medium italic">Interpretando intenção clínica...</p>
                </div>
              )}
            </div>

            {/* Notepad Area */}
            <div className="relative bg-white rounded-[32px] shadow-sm p-8 min-h-[450px] flex flex-col border-none">
              <div className="flex items-center gap-2 text-[#22C55E] mb-6">
                <Sparkles size={18} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Bloco de Notas Inteligente</span>
              </div>
              
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                placeholder="Descreva o atendimento naturalmente... (ex: Realizei restauração no dente 12 com resina composta A2)"
                className="flex-1 w-full bg-transparent border-none focus:ring-0 text-[#0F172A] text-xl leading-relaxed placeholder:text-slate-200 font-medium resize-none"
              />
              
              {/* Quick Actions */}
              <div className="mt-8 pt-6 border-t border-slate-50 flex flex-wrap gap-2">
                <p className="w-full text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-2">Sugestões de Fluxo</p>
                {[
                  { label: 'Endodontia', text: 'canal 15 acess odontometr preparo lima 15 20 25 obturac 21 ' },
                  { label: 'Restauração', text: '15 restaurac resin A2 poliment ' },
                  { label: 'Profilaxia', text: 'avaliac raspag tartar profilax ' },
                  { label: 'Cirurgia', text: '38 anestes sindesmot luxac extrac sutur ' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => setInputText(prev => prev + (prev ? ' ' : '') + item.text)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-[#64748B] text-xs font-bold rounded-full transition-all border-none"
                  >
                    + {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Help/Info */}
        <div className="w-80 bg-white border-l border-slate-100 p-8 hidden lg:block overflow-y-auto">
          <div className="space-y-8">
            <div>
              <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Como funciona</h3>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#22C55E] flex items-center justify-center shrink-0 font-bold text-xs">
                    1
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed font-medium">Escreva o que foi feito de forma natural, como se estivesse contando a um colega.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    2
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed font-medium">Nossa IA identifica automaticamente procedimentos, dentes e materiais utilizados.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 font-bold text-xs">
                    3
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed font-medium">Os blocos gerados acima organizam seu histórico clínico de forma estruturada.</p>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-slate-50">
              <h3 className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest mb-4">Dica do Especialista</h3>
              <div className="bg-slate-50 rounded-2xl p-5">
                <p className="text-[11px] text-[#64748B] leading-relaxed italic font-medium">
                  "Você pode citar o número do dente (ex: 12 ou dente 12) e o material (ex: resina A2) para uma evolução mais precisa."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      <AnimatePresence>
        {saved && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-[#0F172A] text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3 z-[60] border-none"
          >
            <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
            <span className="text-sm font-bold">Evolução salva com sucesso</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
