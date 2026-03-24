import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  CreditCard,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Tag,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from 'lucide-react';

interface Transaction {
  id: number;
  dentist_id: number;
  type: 'INCOME' | 'EXPENSE';
  description: string;
  category: string;
  amount: number;
  payment_method: string;
  date: string;
  status: string;
  patient_id?: number;
  patient_name?: string;
  procedure?: string;
  notes?: string;
  created_at: string;
}

interface PaymentPlan {
  id: number;
  dentist_id: number;
  patient_id: number;
  procedure: string;
  total_amount: number;
  installments_count: number;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  patient_name?: string;
  patient?: { name: string };
}

interface Installment {
  id: number;
  payment_plan_id: number;
  dentist_id: number;
  patient_id: number;
  number: number;
  amount: number;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  payment_date?: string;
  transaction_id?: number;
  procedure?: string;
  patient_name?: string;
}

interface FinancialInsights {
  pendingInstallments: Array<{
    id: number;
    amount: number;
    due_date: string;
    number: number;
    procedure: string;
    patient_name: string;
    patient_id: number;
    plan_id: number;
  }>;
}

interface FinanceProps {
  transactions: Transaction[];
  paymentPlans: PaymentPlan[];
  installments: Installment[];
  financialSummary: any;
  patients: Array<{ id: number; name: string }>;
  apiFetch: (url: string, options?: any) => Promise<Response>;
  onOpenTransactionModal: (type: 'INCOME' | 'EXPENSE') => void;
  onDeleteTransaction: (id: number) => void;
  onGenerateReceipt: (t: Transaction) => void;
  onPrint: (tipo: string, id?: string | number | null) => void;
  onExport: () => void;
  onOpenPaymentPlanModal: () => void;
  onReceiveInstallment: (installment: any) => void;
  onViewInstallments: (plan: PaymentPlan) => void;
  openPatientRecord: (id: number) => void;
  formatDate: (d: string) => string;
}

const currency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const TRANSACTIONS_PAGE_SIZE = 10;
const OLDER_TRANSACTIONS_PREVIEW_COUNT = 4;

export function Finance({
  transactions,
  paymentPlans,
  installments,
  financialSummary,
  patients,
  apiFetch,
  onOpenTransactionModal,
  onDeleteTransaction,
  onGenerateReceipt,
  onPrint,
  onExport,
  onOpenPaymentPlanModal,
  onReceiveInstallment,
  onViewInstallments,
  openPatientRecord,
  formatDate,
}: FinanceProps) {
  void financialSummary;
  void patients;
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTIONS_PAGE_SIZE);
  const [hoveredTransactionId, setHoveredTransactionId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAllOlderTransactions, setShowAllOlderTransactions] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const response = await apiFetch('/api/finance/insights');
        if (!response.ok) return;
        const data = await response.json();
        setInsights(data);
      } catch (error) {
        console.error('Error fetching finance insights:', error);
      }
    };

    fetchInsights();
  }, [apiFetch, transactions, installments]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthRevenue = useMemo(
    () =>
      transactions
        .filter((transaction) => {
          if (transaction.type !== 'INCOME') return false;
          const date = transaction.date?.split('T')[0];
          if (!date) return false;
          const [year, month] = date.split('-').map(Number);
          return year === currentYear && month === currentMonth + 1;
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    [transactions, currentMonth, currentYear]
  );

  const monthExpenses = useMemo(
    () =>
      transactions
        .filter((transaction) => {
          if (transaction.type !== 'EXPENSE') return false;
          const date = transaction.date?.split('T')[0];
          if (!date) return false;
          const [year, month] = date.split('-').map(Number);
          return year === currentYear && month === currentMonth + 1;
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount), 0),
    [transactions, currentMonth, currentYear]
  );

  const netProfit = monthRevenue - monthExpenses;

  const pendingItems = useMemo(() => insights?.pendingInstallments || [], [insights]);

  const pendingTotal = useMemo(
    () => pendingItems.reduce((sum, item) => sum + Number(item.amount), 0),
    [pendingItems]
  );

  const pendingPatientCount = useMemo(
    () => new Set(pendingItems.map((item) => item.patient_id)).size,
    [pendingItems]
  );

  const visiblePending = useMemo(() => pendingItems.slice(0, 3), [pendingItems]);

  const sortedTransactions = useMemo(
    () => [...transactions].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [transactions]
  );

  useEffect(() => {
    setVisibleTransactionCount(TRANSACTIONS_PAGE_SIZE);
    setShowAllOlderTransactions(false);
  }, [transactions]);

  const visibleTransactions = useMemo(
    () => sortedTransactions.slice(0, visibleTransactionCount),
    [sortedTransactions, visibleTransactionCount]
  );

  const transactionIndexMap = useMemo(
    () => new Map(visibleTransactions.map((transaction, index) => [transaction.id, index])),
    [visibleTransactions]
  );

  const hasMoreTransactions = visibleTransactionCount < sortedTransactions.length;

  const recentSections = useMemo(() => {
    const todayKey = now.toLocaleDateString('en-CA');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    const todayItems = visibleTransactions.filter((transaction) => transaction.date?.split('T')[0] === todayKey);
    const yesterdayItems = visibleTransactions.filter((transaction) => transaction.date?.split('T')[0] === yesterdayKey);

    const sections = [
      { title: 'Hoje', items: todayItems },
      { title: 'Ontem', items: yesterdayItems },
    ].filter((section) => section.items.length > 0);

    return sections;
  }, [visibleTransactions, now]);

  const getDateGroupLabel = (dateKey: string) => {
    const todayKey = now.toLocaleDateString('en-CA');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    if (dateKey === todayKey) return 'Hoje';
    if (dateKey === yesterdayKey) return 'Ontem';

    return formatDate(dateKey);
  };

  const olderTransactions = useMemo(() => {
    const todayKey = now.toLocaleDateString('en-CA');
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayKey = yesterday.toLocaleDateString('en-CA');

    return visibleTransactions.filter((transaction) => {
      const transactionKey = transaction.date?.split('T')[0];
      return transactionKey && transactionKey !== todayKey && transactionKey !== yesterdayKey;
    });
  }, [visibleTransactions, now]);

  const olderTransactionsToRender = useMemo(
    () => (showAllOlderTransactions ? olderTransactions : olderTransactions.slice(0, OLDER_TRANSACTIONS_PREVIEW_COUNT)),
    [olderTransactions, showAllOlderTransactions]
  );

  const olderTransactionGroups = useMemo(() => {
    const groups = olderTransactionsToRender.reduce<Array<{ dateKey: string; label: string; items: Transaction[] }>>((acc, transaction) => {
      const dateKey = transaction.date?.split('T')[0];

      if (!dateKey) return acc;

      const existingGroup = acc.find((group) => group.dateKey === dateKey);

      if (existingGroup) {
        existingGroup.items.push(transaction);
        return acc;
      }

      acc.push({
        dateKey,
        label: formatDate(dateKey),
        items: [transaction],
      });

      return acc;
    }, []);

    return groups;
  }, [formatDate, olderTransactionsToRender]);

  const allTransactionGroups = useMemo(() => {
    return visibleTransactions.reduce<Array<{ dateKey: string; label: string; items: Transaction[] }>>((acc, transaction) => {
      const dateKey = transaction.date?.split('T')[0];

      if (!dateKey) return acc;

      const existingGroup = acc.find((group) => group.dateKey === dateKey);

      if (existingGroup) {
        existingGroup.items.push(transaction);
        return acc;
      }

      acc.push({
        dateKey,
        label: getDateGroupLabel(dateKey),
        items: [transaction],
      });

      return acc;
    }, []);
  }, [visibleTransactions, now, formatDate]);

  useEffect(() => {
    if (!hasMoreTransactions || !loadMoreRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;

        if (!entry?.isIntersecting) return;

        setVisibleTransactionCount((current) => Math.min(current + TRANSACTIONS_PAGE_SIZE, sortedTransactions.length));
      },
      {
        root: null,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMoreTransactions, sortedTransactions.length]);

  const criticalPlans = useMemo(() => {
    return paymentPlans
      .map((plan) => {
        const planInstallments = installments.filter((installment) => installment.payment_plan_id === plan.id);
        const overdueInstallments = planInstallments.filter(
          (installment) => installment.status === 'PENDING' && new Date(`${installment.due_date}T12:00:00`) < now
        );
        const pendingInstallment = planInstallments.find((installment) => installment.status === 'PENDING');

        return {
          plan,
          overdueInstallments,
          pendingInstallment,
        };
      })
      .filter((item) => item.overdueInstallments.length > 0)
      .slice(0, 3);
  }, [paymentPlans, installments, now]);

  const handleRowClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
  };

  const closeTransactionSheet = () => {
    setSelectedTransaction(null);
  };

  const getTransactionVisual = (transaction: Transaction) => {
    const isInstallment = transaction.description?.toLowerCase().includes('parcela');

    if (isInstallment) {
      return {
        icon: <CreditCard size={14} />,
        iconClass: 'bg-slate-100 text-slate-500',
        valueClass: 'text-slate-500',
      };
    }

    if (transaction.type === 'EXPENSE') {
      return {
        icon: <ArrowDownRight size={14} />,
        iconClass: 'bg-rose-50 text-rose-500',
        valueClass: 'text-rose-500',
      };
    }

    return {
      icon: <ArrowUpRight size={14} />,
      iconClass: 'bg-emerald-50 text-emerald-600',
      valueClass: 'text-emerald-600',
    };
  };

  const renderTransactionCard = (transaction: Transaction, sectionIndex: number, itemIndex: number) => {
    const visual = getTransactionVisual(transaction);
    const globalIndex = transactionIndexMap.get(transaction.id) ?? itemIndex;
    const isFeatured = globalIndex === 0;
    const isActive = hoveredTransactionId === transaction.id;

    return (
      <motion.div
        key={transaction.id}
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2, delay: sectionIndex * 0.05 + itemIndex * 0.04 }}
        className={`relative ${itemIndex > 0 ? '-mt-2.5 md:-mt-3' : ''}`}
        style={{ zIndex: isActive ? visibleTransactions.length + 20 : visibleTransactions.length - globalIndex }}
      >
        <motion.div
          onClick={() => handleRowClick(transaction)}
          onHoverStart={() => setHoveredTransactionId(transaction.id)}
          onHoverEnd={() => setHoveredTransactionId((current) => (current === transaction.id ? null : current))}
          animate={{
            scale: hoveredTransactionId === null ? 1 : isActive ? 1.02 : 0.982,
            opacity: hoveredTransactionId === null || isFeatured ? 1 : isActive ? 1 : 0.68,
            y: isActive ? -4 : 0,
          }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ y: isActive ? -5 : -2, scale: isActive ? 1.024 : 0.995, opacity: 1 }}
          whileTap={{ scale: isActive ? 1.01 : 0.99 }}
          className={`w-full flex items-center gap-3 cursor-pointer rounded-[24px] border transition-all duration-200 ${
            isActive
              ? 'px-4 py-4 bg-[linear-gradient(135deg,#ffffff_0%,#f4f7fb_100%)] border-slate-200 shadow-[0_16px_36px_rgba(15,23,42,0.10)]'
              : isFeatured
                ? 'px-4 py-4 bg-[linear-gradient(135deg,#ffffff_0%,#f4f7fb_100%)] border-slate-200 shadow-[0_12px_26px_rgba(15,23,42,0.06)] hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]'
                : 'px-3.5 py-3 bg-white/92 border-slate-100 shadow-[0_4px_14px_rgba(15,23,42,0.035)] hover:bg-white hover:border-slate-200 hover:shadow-[0_8px_18px_rgba(15,23,42,0.05)]'
          }`}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              handleRowClick(transaction);
            }
          }}
          onFocus={() => setHoveredTransactionId(transaction.id)}
          onBlur={() => setHoveredTransactionId((current) => (current === transaction.id ? null : current))}
        >
          <div className={`shrink-0 flex items-center justify-center transition-all duration-200 ${isActive || isFeatured ? 'w-10 h-10 rounded-2xl' : 'w-8 h-8 rounded-xl'} ${visual.iconClass} ${isActive ? 'ring-4 ring-white/70' : ''}`}>
            {visual.icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <p className={`truncate leading-snug transition-all duration-200 ${isActive || isFeatured ? 'text-[16px] font-semibold text-slate-900' : 'text-[15px] font-medium text-slate-700'}`}>
                {`${transaction.procedure || transaction.description} — ${transaction.patient_name || 'Sem paciente'}`}
              </p>
              <span className={`text-[14px] font-semibold shrink-0 md:hidden ${visual.valueClass}`}>
                {transaction.type === 'INCOME' ? '+' : '-'}{currency(Number(transaction.amount))}
              </span>
            </div>
          </div>

          <div className={`hidden md:block shrink-0 transition-all duration-200 ${isActive || isFeatured ? 'text-[15px]' : 'text-[14px]'} font-semibold ${visual.valueClass}`}>
            {transaction.type === 'INCOME' ? '+' : '-'}{currency(Number(transaction.amount))}
          </div>

          <div className="relative shrink-0">
            <button
              onClick={(event) => {
                event.stopPropagation();
                setOpenMenuId(openMenuId === transaction.id ? null : transaction.id);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-300 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200"
              title="Ações"
            >
              <MoreHorizontal size={16} />
            </button>

            {openMenuId === transaction.id && (
              <div className="absolute right-0 top-9 z-10 min-w-36 rounded-2xl border border-slate-200 bg-white shadow-lg py-1">
                {transaction.patient_id && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      openPatientRecord(transaction.patient_id!);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Ver paciente
                  </button>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId(null);
                    onGenerateReceipt(transaction);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Recibo
                </button>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpenMenuId(null);
                    onDeleteTransaction(transaction.id);
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  Excluir
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  };

  return (
    <>
    <div className="max-w-screen-xl mx-auto pt-10 px-2 pb-32 md:pb-10 space-y-10 bg-[linear-gradient(180deg,#f8f9fb_0%,#fbfcfd_100%)] rounded-[36px] min-h-full">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between px-2">
        <div className="space-y-1">
          <h2 className="text-[28px] font-bold tracking-tight text-[#1C1C1E]">Financeiro</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onPrint('relatorio')}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Printer size={14} /> Relatório
          </button>
          <button
            onClick={onExport}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Download size={14} /> Exportar
          </button>
          <button
            onClick={() => onOpenTransactionModal('EXPENSE')}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Despesa
          </button>
          <button
            onClick={() => onOpenTransactionModal('INCOME')}
            className="px-3 py-1.5 rounded-full text-sm font-medium text-slate-700 hover:bg-slate-100 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Receita
          </button>
        </div>
      </div>

      <section
        className={`rounded-[32px] px-5 py-6 md:px-7 md:py-7 border shadow-[0_16px_40px_rgba(15,23,42,0.06)] ${
          pendingTotal > 0
            ? 'bg-[linear-gradient(135deg,#fff8eb_0%,#fff2d8_100%)] border-amber-100'
            : 'bg-[linear-gradient(135deg,#ffffff_0%,#f2f6f3_100%)] border-slate-100'
        }`}
      >
        {pendingTotal > 0 ? (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2 leading-relaxed">
              <AlertTriangle size={18} className="text-amber-600" />
              Tem um ponto pedindo atenção por aqui
            </p>
            <p className="text-[48px] md:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] text-slate-900">{currency(monthRevenue)}</p>
            <p className="text-[13px] leading-relaxed text-amber-700/80 font-medium">
              {currency(pendingTotal)} aguardando pagamento • {pendingPatientCount} paciente{pendingPatientCount !== 1 ? 's' : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-[13px] font-semibold text-slate-600 flex items-center gap-2 leading-relaxed">
              <CheckCheck size={18} className="text-emerald-600" />
              Tudo sob controle por aqui 👌
            </p>
            <p className="text-[48px] md:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] text-slate-900">{currency(monthRevenue)}</p>
            <p className="text-[13px] leading-relaxed text-emerald-700/80 font-medium">Tudo recebido</p>
          </div>
        )}
      </section>

      {pendingTotal > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Precisa de ação</h3>
            <p className="text-[14px] leading-relaxed text-slate-400">Cobranças que merecem atenção agora.</p>
          </div>

          <div className="space-y-3">
            {visiblePending.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 transition-colors duration-200 hover:border-amber-200">
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-slate-800 truncate leading-snug">{item.patient_name}</p>
                  <p className="text-[14px] text-slate-400 truncate leading-relaxed">{item.procedure}</p>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[15px] font-semibold text-slate-900">{currency(Number(item.amount))}</p>
                  <p className="text-[12px] text-amber-700/85">Cobrar</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-slate-900">Movimentações</h3>
          {visibleTransactions.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllOlderTransactions((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-[14px] px-3 py-2 text-[13px] font-medium transition-all ${
                showAllOlderTransactions
                  ? 'bg-white shadow-sm text-primary border border-slate-200'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-800'
              }`}
            >
              {showAllOlderTransactions ? 'Ver resumo' : 'Ver todas'}
            </button>
          )}
        </div>

        <div className="space-y-7">
          {recentSections.length > 0 && <div aria-hidden="true" className="h-[14vh] min-h-16" />}

          {showAllOlderTransactions ? (
            <div className="space-y-6">
              {allTransactionGroups.map((group, groupIndex) => (
                <div key={group.dateKey}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 mb-2.5">{group.label}</p>
                  <div className="space-y-0">
                    {group.items.map((transaction, itemIndex) => renderTransactionCard(transaction, groupIndex, itemIndex))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {recentSections.map((section, sectionIndex) => (
                <div key={section.title}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 mb-2.5">{section.title}</p>
                  <div className="space-y-0">
                    {section.items.map((transaction, itemIndex) => renderTransactionCard(transaction, sectionIndex, itemIndex))}
                  </div>
                </div>
              ))}

              {olderTransactions.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 mb-2.5">Últimos dias</p>
                  <div className="space-y-6">
                    {olderTransactionGroups.map((group, groupIndex) => (
                      <div key={group.dateKey}>
                        <p className="text-[11px] font-medium text-slate-400 mb-2">{group.label}</p>
                        <div className="space-y-0">
                          {group.items.map((transaction, itemIndex) => renderTransactionCard(transaction, recentSections.length + groupIndex, itemIndex))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {recentSections.length === 0 && olderTransactions.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhuma movimentação recente.
            </div>
          )}

          {hasMoreTransactions && (
            <div ref={loadMoreRef} className="h-12 flex items-center justify-center text-xs font-medium text-slate-300">
              Carregando mais movimentações...
            </div>
          )}

          {recentSections.length > 0 && <div aria-hidden="true" className="h-[40vh] min-h-40" />}
        </div>
      </section>

      {criticalPlans.length > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Parcelamentos</h3>
            <p className="text-[14px] leading-relaxed text-slate-400">Só aparece quando existe algo crítico para resolver.</p>
          </div>

          <div className="space-y-0">
            {criticalPlans.map(({ plan, overdueInstallments, pendingInstallment }, index) => {
              const patientName = plan.patient?.name || plan.patient_name || 'Paciente não identificado';

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 12, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`${index > 0 ? '-mt-1.5 md:-mt-2' : ''} relative`}
                  style={{ zIndex: criticalPlans.length - index }}
                >
                <motion.div
                  whileHover={{ y: -2, scale: 1.004 }}
                  whileTap={{ scale: 0.993 }}
                  className="rounded-[24px] border border-slate-100 bg-white/92 px-4 py-4 flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between transition-all duration-200 shadow-[0_6px_18px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)] hover:border-rose-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-800 truncate text-[15px] leading-snug">
                      {plan.procedure} — {patientName}
                    </p>
                    <p className="text-[14px] mt-0.5 text-rose-500 leading-relaxed">
                      {overdueInstallments.length} parcela{overdueInstallments.length !== 1 ? 's' : ''} em atraso — {currency(overdueInstallments.reduce((sum, item) => sum + Number(item.amount), 0))}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-[14px]">
                    <button
                      onClick={() => {
                        if (!pendingInstallment) return;
                        onReceiveInstallment({ ...pendingInstallment, procedure: plan.procedure, patient_name: plan.patient_name });
                      }}
                      className="text-primary font-medium hover:underline transition-colors duration-200"
                    >
                      Receber
                    </button>
                    <button
                      onClick={() => onViewInstallments(plan)}
                      className="text-slate-500 font-medium hover:underline transition-colors duration-200"
                    >
                      Ver parcelas
                    </button>
                  </div>
                </motion.div>
                </motion.div>
              );
            })}
          </div>

        </section>
      )}
    </div>

    <AnimatePresence>
      {selectedTransaction && (
        <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeTransactionSheet}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Fechar detalhes da movimentação"
          />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative bg-white/80 backdrop-blur-2xl w-full sm:max-w-md rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-fit overflow-y-auto border border-white/20"
          >
            <div className="px-5 pt-5 pb-3 border-b border-slate-100/50">
              <div className="flex justify-between items-center gap-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">Movimentação</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-900 truncate">
                    {selectedTransaction.procedure || selectedTransaction.description}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeTransactionSheet}
                  className="w-7 h-7 rounded-full hover:bg-slate-100/50 transition-colors flex items-center justify-center shrink-0"
                >
                  <X size={16} className="text-slate-400" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5 space-y-4 pb-32 md:pb-10">
              <section className="px-1">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[12px] text-slate-400">Valor</p>
                    <p className={`mt-1 text-[32px] leading-none font-bold tracking-tight ${selectedTransaction.type === 'EXPENSE' ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {selectedTransaction.type === 'INCOME' ? '+' : '-'}{currency(Number(selectedTransaction.amount))}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${selectedTransaction.type === 'EXPENSE' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    <span className={`w-2 h-2 rounded-full ${selectedTransaction.type === 'EXPENSE' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                    {selectedTransaction.type === 'EXPENSE' ? 'Saída' : 'Entrada'}
                  </span>
                </div>
              </section>

              <section className="rounded-[20px] bg-slate-50/70 border border-slate-200/60 overflow-hidden">
                {[
                  {
                    icon: <CalendarDays size={17} />,
                    label: 'Data',
                    value: formatDate(selectedTransaction.date.split('T')[0]),
                  },
                  {
                    icon: <WalletCards size={17} />,
                    label: 'Pagamento',
                    value: selectedTransaction.payment_method || 'Não informado',
                  },
                  {
                    icon: <Tag size={17} />,
                    label: 'Categoria',
                    value: selectedTransaction.category || 'Sem categoria',
                  },
                  {
                    icon: <UserRound size={17} />,
                    label: 'Paciente',
                    value: selectedTransaction.patient_name || 'Sem paciente vinculado',
                  },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-3 px-4 py-3.5 ${index !== 0 ? 'border-t border-slate-200/60' : ''}`}
                  >
                    <div className="w-9 h-9 rounded-[14px] bg-white text-slate-500 flex items-center justify-center shadow-sm">
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] text-slate-400 uppercase tracking-[0.14em]">{item.label}</p>
                      <p className="text-[14px] font-medium text-slate-800 truncate">{item.value}</p>
                    </div>
                  </div>
                ))}
              </section>

              {selectedTransaction.notes && (
                <section className="rounded-[18px] bg-slate-50/70 border border-slate-200/60 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-slate-500">
                    <FileText size={15} />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em]">Observações</p>
                  </div>
                  <p className="text-[14px] leading-relaxed text-slate-700">{selectedTransaction.notes}</p>
                </section>
              )}

              <section className="space-y-2.5">
                {selectedTransaction.patient_id && (
                  <button
                    type="button"
                    onClick={() => {
                      closeTransactionSheet();
                      openPatientRecord(selectedTransaction.patient_id!);
                    }}
                    className="w-full rounded-[18px] bg-primary text-white px-4 py-3.5 font-semibold hover:opacity-95 transition-all"
                  >
                    Ver paciente
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    closeTransactionSheet();
                    onGenerateReceipt(selectedTransaction);
                  }}
                  className="w-full rounded-[18px] bg-slate-100/90 text-slate-800 px-4 py-3.5 font-semibold hover:bg-slate-200 transition-colors"
                >
                  Gerar recibo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    closeTransactionSheet();
                    onDeleteTransaction(selectedTransaction.id);
                  }}
                  className="w-full rounded-[18px] bg-rose-50 text-rose-600 px-4 py-3.5 font-semibold hover:bg-rose-100 transition-colors inline-flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  Excluir movimentação
                </button>
              </section>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}