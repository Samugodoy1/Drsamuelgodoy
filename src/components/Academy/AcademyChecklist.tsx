import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

interface AcademyChecklistProps {
  appointmentId?: number;
}

export const AcademyChecklist: React.FC<AcademyChecklistProps> = () => {
  const phases: any[] = [];

  return (
    <div className="flex-1 bg-[#F2F2F7] overflow-y-auto pb-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-[#F2F2F7]/80 backdrop-blur-md px-4 py-4"
        >
          <div className="mb-4">
            <h1 className="ios-title text-2xl mb-1">Seu Caminho</h1>
            <p className="ios-text-secondary">Antes, durante e depois da clinica</p>
          </div>

          <div className="ios-card bg-gradient-to-r from-primary/5 to-primary/2 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-[#1C1C1E]">Progresso Geral</h3>
              <span className="text-xl font-bold text-primary">0%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '0%' }}
                transition={{ duration: 0.5 }}
                className="bg-gradient-to-r from-primary to-emerald-500 h-full"
              />
            </div>
          </div>
        </motion.div>

        <div className="px-4 space-y-4 py-4">
          {phases.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 font-medium">Nenhum checklist disponivel</p>
              <p className="text-sm text-slate-400 mt-1">A tela ainda nao possui uma API real de checklists Academy.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
