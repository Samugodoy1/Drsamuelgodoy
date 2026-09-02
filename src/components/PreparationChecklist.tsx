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
      className="rounded-3xl bg-white p-8 sm:p-10"
    >
      {/* Header */}
      <div className="mb-7">
        <h3 className="text-[#86868b] text-[13px] font-normal">
          ✓ Preparação
        </h3>
        <h2 className="text-[#1d1d1f] text-[24px] font-bold tracking-tight mt-2">
          {title}
        </h2>
        {description && (
          <p className="text-[#86868b] text-[14px] mt-3">
            {description}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-7">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#86868b] text-[13px] font-medium">
            Progresso
          </span>
          <span className="text-[#0071e3] text-[13px] font-semibold">
            {completedCount} de {items.length} ({completionPercentage}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/40 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-[#0071e3]"
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
                    <CheckCircle2 size={20} className="text-[#0071e3]" />
                  </motion.div>
                ) : (
                  <Circle size={20} className="text-[#C7C7CC]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-[15px] font-medium transition-all ${
                    item.completed
                      ? 'text-[#86868b] line-through'
                      : 'text-[#1d1d1f]'
                  }`}
                >
                  {item.label}
                </p>
                {item.description && (
                  <p className="text-[#86868b] text-[13px] mt-1">
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
          className="w-full apple-btn transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle2 size={18} />
          Tudo pronto! Confirmar presença
        </motion.button>
      )}
    </motion.div>
  );
};
