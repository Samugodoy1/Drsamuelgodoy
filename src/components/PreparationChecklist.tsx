import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from '../icons';

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  completed: boolean;
}

interface PreparationChecklistProps {
  title: string;
  description?: string;
  items: ChecklistItem[];
  onItemToggle: (itemId: string) => void;
  onComplete?: () => void;
  allCompleted?: boolean;
}

export const PreparationChecklist: React.FC<PreparationChecklistProps> = ({
  title,
  description,
  items,
  onItemToggle,
  onComplete,
  allCompleted = false,
}) => {
  const completedCount = items.filter(i => i.completed).length;
  const completionPercentage = Math.round((completedCount / items.length) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl bg-gradient-to-br from-[#0C9B72]/5 to-[#34C759]/5 backdrop-blur-xl border border-[#0C9B72]/20 p-8 sm:p-10"
    >
      {/* Header */}
      <div className="mb-7">
        <h3 className="text-[#0C9B72] text-[12px] font-bold uppercase tracking-wider">
          ✓ Preparação
        </h3>
        <h2 className="text-[#1C1C1E] text-[24px] font-bold tracking-tight mt-2">
          {title}
        </h2>
        {description && (
          <p className="text-[#8E8E93] text-[14px] mt-3">
            {description}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#8E8E93] text-[13px] font-medium">
            Progresso
          </span>
          <span className="text-[#0C9B72] text-[13px] font-semibold">
            {completedCount} de {items.length} ({completionPercentage}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-[#34C759] to-[#0C9B72]"
          />
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-3 mb-7">
        {items.map((item, idx) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            onClick={() => onItemToggle(item.id)}
            className="w-full text-left p-4 rounded-2xl bg-white/30 hover:bg-white/50 transition-colors group"
          >
            <div className="flex items-start gap-4">
              <div className="pt-0.5 shrink-0">
                {item.completed ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <CheckCircle2 size={20} className="text-[#0C9B72]" />
                  </motion.div>
                ) : (
                  <Circle size={20} className="text-[#C7C7CC]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[15px] font-medium transition-all ${
                    item.completed
                      ? 'text-[#8E8E93] line-through'
                      : 'text-[#1C1C1E]'
                  }`}
                >
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-[#8E8E93] text-[13px] mt-1">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Complete button */}
      {allCompleted && onComplete && (
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={onComplete}
          className="w-full h-12 px-5 rounded-full bg-gradient-to-r from-[#34C759] to-[#0C9B72] text-white text-[15px] font-semibold tracking-tight transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} />
          Tudo pronto! Confirmar presença
        </motion.button>
      )}
    </motion.div>
  );
};
