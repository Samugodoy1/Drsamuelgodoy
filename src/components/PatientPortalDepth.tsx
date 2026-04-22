import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Calendar,
  FileText,
  DollarSign,
  Clock,
  Activity,
  ChevronDown,
} from '../icons';

interface PatientPortalDepthProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    appointments: Array<{
      id: number;
      start_time: string;
      end_time: string;
      status: string;
      notes: string;
      dentist_name: string;
    }>;
    evolution: Array<{
      id: number;
      date: string;
      procedure_performed: string;
      notes: string;
      dentist_name: string;
    }>;
    files: Array<{
      id: number;
      file_url: string;
      file_type: string;
      description: string;
      created_at: string;
    }>;
    payment_plans: Array<{
      id: number;
      procedure: string;
      total_amount: number;
      installments_count: number;
      status: string;
    }>;
    transactions: Array<{
      id: number;
      type: string;
      description: string;
      amount: number;
      date: string;
      status: string;
    }>;
  };
}

type Section = 'appointments' | 'evolution' | 'files' | 'financial' | null;

export function PatientPortalDepth({ isOpen, onClose, data }: PatientPortalDepthProps) {
  const [expandedSection, setExpandedSection] = useState<Section>(null);

  const formatDateBR = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  const formatTimeBR = (d: string) => {
    try {
      return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const sections = [
    {
      id: 'appointments' as const,
      label: 'Todas as Consultas',
      icon: Calendar,
      count: data.appointments.length,
      preview: data.appointments.length > 0 
        ? `${data.appointments.length} consulta${data.appointments.length !== 1 ? 's' : ''}`
        : 'Nenhuma consulta',
    },
    {
      id: 'evolution' as const,
      label: 'Histórico Clínico',
      icon: Activity,
      count: data.evolution.length,
      preview: data.evolution.length > 0
        ? `${data.evolution.length} anotação${data.evolution.length !== 1 ? 's' : ''}`
        : 'Sem histórico',
    },
    {
      id: 'files' as const,
      label: 'Documentos',
      icon: FileText,
      count: data.files.length,
      preview: data.files.length > 0
        ? `${data.files.length} arquivo${data.files.length !== 1 ? 's' : ''}`
        : 'Sem documentos',
    },
    {
      id: 'financial' as const,
      label: 'Financeiro',
      icon: DollarSign,
      count: (data.payment_plans.length + data.transactions.length),
      preview: data.payment_plans.length > 0 || data.transactions.length > 0
        ? `${data.payment_plans.length} plano${data.payment_plans.length !== 1 ? 's' : ''}`
        : 'Nenhuma transação',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative w-full bg-white rounded-t-3xl overflow-hidden max-h-[90vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-4 pb-4 border-b border-[#E5E5EA]">
              <div className="w-10 h-1 bg-[#E5E5EA] rounded-full" />
              <h2 className="text-[#1C1C1E] text-[18px] font-bold tracking-tight flex-1 text-center">
                Seu Histórico
              </h2>
              <button
                onClick={onClose}
                className="p-2 text-[#8E8E93] hover:text-[#1C1C1E] transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-2">
                {sections.map(section => {
                  const SectionIcon = section.icon;
                  const isExpanded = expandedSection === section.id;

                  return (
                    <motion.div
                      key={section.id}
                      className="overflow-hidden"
                    >
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-[#F9FAFB] hover:bg-[#F2F2F7] transition-colors duration-200"
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#0C9B72]/10 flex items-center justify-center shrink-0">
                            <SectionIcon size={18} className="text-[#0C9B72]" />
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <p className="text-[#1C1C1E] text-[15px] font-semibold">
                              {section.label}
                            </p>
                            <p className="text-[#8E8E93] text-[12px] mt-0.5">
                              {section.preview}
                            </p>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                          className="shrink-0 text-[#C6C6C8]"
                        >
                          <ChevronDown size={18} />
                        </motion.div>
                      </button>

                      {/* Expanded Content */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="px-4 pt-2 pb-4"
                          >
                            {section.id === 'appointments' && (
                              <div className="space-y-2">
                                {data.appointments.length > 0 ? (
                                  data.appointments.map(apt => (
                                    <div key={apt.id} className="p-3 bg-white rounded-xl border border-[#E5E5EA]">
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <p className="text-[#1C1C1E] text-[13px] font-semibold">
                                          {formatDateBR(apt.start_time)} às {formatTimeBR(apt.start_time)}
                                        </p>
                                        <span className="text-[#8E8E93] text-[11px] font-medium bg-[#F2F2F7] px-2.5 py-1 rounded-full">
                                          {apt.status}
                                        </span>
                                      </div>
                                      <p className="text-[#8E8E93] text-[12px]">
                                        Dr(a). {apt.dentist_name}
                                      </p>
                                      {apt.notes && (
                                        <p className="text-[#3A3A3C] text-[12px] mt-2 leading-snug">
                                          {apt.notes}
                                        </p>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[#8E8E93] text-[13px] text-center py-4">
                                    Nenhuma consulta registrada
                                  </p>
                                )}
                              </div>
                            )}

                            {section.id === 'evolution' && (
                              <div className="space-y-2">
                                {data.evolution.length > 0 ? (
                                  data.evolution.map(evo => (
                                    <div key={evo.id} className="p-3 bg-white rounded-xl border border-[#E5E5EA]">
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <p className="text-[#1C1C1E] text-[13px] font-semibold">
                                          {formatDateBR(evo.date)}
                                        </p>
                                      </div>
                                      <p className="text-[#0C9B72] text-[12px] font-medium mb-1">
                                        {evo.procedure_performed}
                                      </p>
                                      {evo.notes && (
                                        <p className="text-[#3A3A3C] text-[12px] leading-snug">
                                          {evo.notes}
                                        </p>
                                      )}
                                      <p className="text-[#8E8E93] text-[11px] mt-2">
                                        {evo.dentist_name}
                                      </p>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[#8E8E93] text-[13px] text-center py-4">
                                    Sem anotações clínicas
                                  </p>
                                )}
                              </div>
                            )}

                            {section.id === 'files' && (
                              <div className="space-y-2">
                                {data.files.length > 0 ? (
                                  data.files.map(file => (
                                    <a
                                      key={file.id}
                                      href={file.file_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E5E5EA] hover:border-[#0C9B72] hover:bg-[#0C9B72]/5 transition-all"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[#0C9B72] text-[13px] font-semibold truncate">
                                          {file.description || file.file_type}
                                        </p>
                                        <p className="text-[#8E8E93] text-[11px] mt-0.5">
                                          {formatDateBR(file.created_at)}
                                        </p>
                                      </div>
                                      <ChevronDown size={16} className="text-[#C6C6C8] shrink-0 ml-2 rotate-90" />
                                    </a>
                                  ))
                                ) : (
                                  <p className="text-[#8E8E93] text-[13px] text-center py-4">
                                    Nenhum documento
                                  </p>
                                )}
                              </div>
                            )}

                            {section.id === 'financial' && (
                              <div className="space-y-2">
                                {data.payment_plans.length > 0 && (
                                  <div>
                                    <p className="text-[#1C1C1E] text-[12px] font-semibold mb-2 px-1">
                                      Planos de Pagamento
                                    </p>
                                    {data.payment_plans.map(plan => (
                                      <div key={plan.id} className="p-3 bg-white rounded-xl border border-[#E5E5EA] mb-2">
                                        <p className="text-[#1C1C1E] text-[13px] font-semibold">
                                          {plan.procedure}
                                        </p>
                                        <div className="mt-2 space-y-1">
                                          <p className="text-[#8E8E93] text-[12px]">
                                            Total: R$ {plan.total_amount.toFixed(2)}
                                          </p>
                                          <p className="text-[#8E8E93] text-[12px]">
                                            {plan.installments_count}x • Status: {plan.status}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {data.transactions.length > 0 && (
                                  <div>
                                    <p className="text-[#1C1C1E] text-[12px] font-semibold mb-2 px-1 mt-4">
                                      Transações
                                    </p>
                                    {data.transactions.map(tx => (
                                      <div key={tx.id} className="p-3 bg-white rounded-xl border border-[#E5E5EA] mb-2 flex items-center justify-between">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[#1C1C1E] text-[13px] font-semibold">
                                            {tx.description}
                                          </p>
                                          <p className="text-[#8E8E93] text-[11px] mt-1">
                                            {formatDateBR(tx.date)}
                                          </p>
                                        </div>
                                        <div className="text-right ml-4 shrink-0">
                                          <p className="text-[#1C1C1E] text-[13px] font-semibold">
                                            R$ {tx.amount.toFixed(2)}
                                          </p>
                                          <p className="text-[#8E8E93] text-[11px] mt-1">
                                            {tx.status}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {data.payment_plans.length === 0 && data.transactions.length === 0 && (
                                  <p className="text-[#8E8E93] text-[13px] text-center py-4">
                                    Nenhuma transação
                                  </p>
                                )}
                              </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Footer Safe Area */}
            <div className="h-4" />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
