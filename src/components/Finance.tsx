import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  CheckCheck,
  CreditCard,
  Download,
  FileText,
  MoreHorizontal,
  Plus,
  Printer,
  Rocket,
  Search,
  Tag,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  WalletCards,
  X,
} from '../icons';

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
  todayAppointmentsCount: number;
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
  setActiveTab: (tab: string) => void;
  setIsModalOpen: (open: boolean) => void;
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
  todayAppointmentsCount,
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
  setActiveTab,
  setIsModalOpen,
}: FinanceProps) {
  void financialSummary;
  void patients;
  const [insights, setInsights] = useState<FinancialInsights | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [visibleTransactionCount, setVisibleTransactionCount] = useState(TRANSACTIONS_PAGE_SIZE);
  const [hoveredTransactionId, setHoveredTransactionId] = useState<number | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [showAllOlderTransactions, setShowAllOlderTransactions] = useState(false);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [filterPatientId, setFilterPatientId] = useState<number | null>(null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const patientSearchRef = useRef<HTMLDivElement | null>(null);
  const dateInputRef = useRef<HTMLInputElement | null>(null);
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

  // ─── Previous month data for comparison ──────────────────────────────
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const prevMonthRevenue = useMemo(
    () =>
      transactions
        .filter((t) => {
          if (t.type !== 'INCOME') return false;
          const date = t.date?.split('T')[0];
          if (!date) return false;
          const [year, month] = date.split('-').map(Number);
          return year === prevYear && month === prevMonth + 1;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions, prevMonth, prevYear]
  );

  const prevMonthExpenses = useMemo(
    () =>
      transactions
        .filter((t) => {
          if (t.type !== 'EXPENSE') return false;
          const date = t.date?.split('T')[0];
          if (!date) return false;
          const [year, month] = date.split('-').map(Number);
          return year === prevYear && month === prevMonth + 1;
        })
        .reduce((sum, t) => sum + Number(t.amount), 0),
    [transactions, prevMonth, prevYear]
  );

  // ─── Smart financial analysis ────────────────────────────────────────
  const financeAnalysis = useMemo(() => {
    const dayOfMonth = now.getDate();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthProgress = dayOfMonth / daysInMonth;
    const projectedRevenue = monthProgress > 0.1 ? monthRevenue / monthProgress : 0;
    const revenueGrowth = prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : 0;
    const profitMargin = monthRevenue > 0 ? (netProfit / monthRevenue) * 100 : 0;
    const isStartOfMonth = dayOfMonth <= 5;
    const isEndOfMonth = dayOfMonth >= daysInMonth - 3;
    const freeSlots = Math.max(8 - todayAppointmentsCount, 0);
    const gap = prevMonthRevenue > 0 ? prevMonthRevenue - monthRevenue : 0;

    let headline = '';
    let headlineIcon: 'rocket' | 'check' | 'target' | 'chart' = 'check';
    let headlineColor = 'text-emerald-600';
    let subtitle = '';
    let ctaLabel = '';
    let ctaAction: 'agenda' | 'schedule' | 'patients' | 'income' | null = null;

    // ── Case 1: Zero revenue ──
    if (monthRevenue === 0 && isStartOfMonth) {
      headline = 'Mês novo. Sua primeira consulta define o ritmo 💪';
      headlineIcon = 'rocket';
      headlineColor = 'text-primary';
      subtitle = prevMonthRevenue > 0
        ? `Mês passado foram ${currency(prevMonthRevenue)}. Bora superar?`
        : 'Registre a primeira receita e veja a projeção do mês';
      ctaLabel = freeSlots > 0 ? `Agendar consulta · ${freeSlots} horários livres` : 'Agendar consulta';
      ctaAction = 'schedule';
    } else if (monthRevenue === 0) {
      headline = freeSlots > 0
        ? `Você tem ${freeSlots} horários livres hoje. Cada um é faturamento`
        : 'Sua agenda pode gerar receita agora';
      headlineIcon = 'target';
      headlineColor = 'text-amber-600';
      subtitle = prevMonthRevenue > 0
        ? `Faltam ${currency(prevMonthRevenue)} pra alcançar o mês passado`
        : 'Uma consulta registrada e a projeção já aparece aqui';
      ctaLabel = freeSlots > 0 ? 'Preencher agenda' : 'Registrar receita';
      ctaAction = freeSlots > 0 ? 'schedule' : 'income';

    // ── Case 2: Revenue dropping ──
    } else if (prevMonthRevenue > 0 && revenueGrowth < -10) {
      const pctDown = Math.round(Math.abs(revenueGrowth));
      headline = `Caiu ${pctDown}%. Dá pra recuperar ainda este mês`;
      headlineIcon = 'target';
      headlineColor = 'text-amber-600';
      if (freeSlots > 0) {
        subtitle = `${freeSlots} horários livres hoje · Faltam ${currency(Math.round(gap))} pro mês anterior`;
        ctaLabel = 'Preencher horários de hoje';
        ctaAction = 'schedule';
      } else {
        subtitle = `Faltam ${currency(Math.round(gap))} pra igualar o mês passado`;
        ctaLabel = 'Ver agenda da semana';
        ctaAction = 'agenda';
      }

    // ── Case 3: Growing fast ──
    } else if (revenueGrowth > 20) {
      headline = `+${Math.round(revenueGrowth)}% vs. mês passado. Tá voando 🔥`;
      headlineIcon = 'rocket';
      headlineColor = 'text-emerald-600';
      subtitle = projectedRevenue > 0
        ? `Projeção: ${currency(Math.round(projectedRevenue))} · Margem: ${Math.round(profitMargin)}%`
        : `Lucro líquido: ${currency(netProfit)}`;
      if (freeSlots >= 3) {
        ctaLabel = `Ainda tem ${freeSlots} horários hoje`;
        ctaAction = 'schedule';
      }

    // ── Case 4: Growing steadily ──
    } else if (revenueGrowth > 0) {
      headline = `+${Math.round(revenueGrowth)}% acima do anterior. Continue assim`;
      headlineIcon = 'chart';
      headlineColor = 'text-emerald-600';
      subtitle = projectedRevenue > prevMonthRevenue
        ? `Projeção: ${currency(Math.round(projectedRevenue))} · ${Math.round(((projectedRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)}% acima`
        : `Lucro líquido: ${currency(netProfit)} · Margem: ${Math.round(profitMargin)}%`;
      if (freeSlots >= 3) {
        ctaLabel = `${freeSlots} encaixes disponíveis hoje`;
        ctaAction = 'schedule';
      }

    // ── Case 5: End of month push ──
    } else if (isEndOfMonth && monthRevenue > 0) {
      headline = 'Reta final. Cada encaixe conta pro resultado';
      headlineIcon = 'target';
      headlineColor = 'text-primary';
      subtitle = freeSlots > 0
        ? `${freeSlots} horários livres hoje · Projeção: ${currency(Math.round(projectedRevenue))}`
        : `Projeção final: ${currency(Math.round(projectedRevenue))}`;
      if (freeSlots > 0) {
        ctaLabel = 'Encaixar pacientes agora';
        ctaAction = 'schedule';
      }

    // ── Case 6: Default – all good ──
    } else {
      headline = 'Tudo certo. Seu consultório tá faturando';
      headlineIcon = 'check';
      headlineColor = 'text-emerald-600';
      if (monthExpenses > 0) {
        subtitle = `Lucro: ${currency(netProfit)} · Margem: ${Math.round(profitMargin)}%`;
      } else if (projectedRevenue > 0) {
        subtitle = `Projeção do mês: ${currency(Math.round(projectedRevenue))}`;
      } else {
        subtitle = `${currency(monthRevenue)} faturados em ${dayOfMonth} dia${dayOfMonth !== 1 ? 's' : ''}`;
      }
      if (freeSlots >= 3) {
        ctaLabel = `Ainda dá tempo: ${freeSlots} horários livres`;
        ctaAction = 'schedule';
      }
    }

    return { headline, headlineIcon, headlineColor, subtitle, ctaLabel, ctaAction };
  }, [monthRevenue, monthExpenses, netProfit, prevMonthRevenue, currentMonth, currentYear, now, todayAppointmentsCount]);

  const pendingItems = useMemo(() => insights?.pendingInstallments || [], [insights]);

  const pendingTotal = useMemo(
    () => pendingItems.reduce((sum, item) => sum + Number(item.amount), 0),
    [pendingItems]
  );

  const pendingPatientCount = useMemo(
    () => new Set(pendingItems.map((item) => item.patient_id)).size,
    [pendingItems]
  );

  const pendingPatientGroups = useMemo(() => {
    const groups = new Map<number, {
      patientId: number;
      patientName: string;
      totalAmount: number;
      items: typeof pendingItems;
      planIds: number[];
    }>();

    pendingItems.forEach((item) => {
      const existing = groups.get(item.patient_id);

      if (existing) {
        existing.totalAmount += Number(item.amount);
        existing.items.push(item);
        if (!existing.planIds.includes(item.plan_id)) {
          existing.planIds.push(item.plan_id);
        }
        return;
      }

      groups.set(item.patient_id, {
        patientId: item.patient_id,
        patientName: item.patient_name || 'Paciente não identificado',
        totalAmount: Number(item.amount),
        items: [item],
        planIds: [item.plan_id],
      });
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      items: [...group.items].sort((left, right) => new Date(`${left.due_date}T12:00:00`).getTime() - new Date(`${right.due_date}T12:00:00`).getTime()),
    }));
  }, [pendingItems]);

  const visiblePendingGroups = useMemo(() => pendingPatientGroups.slice(0, 3), [pendingPatientGroups]);

  const hiddenPendingGroupsCount = useMemo(
    () => Math.max(pendingPatientGroups.length - visiblePendingGroups.length, 0),
    [pendingPatientGroups.length, visiblePendingGroups.length]
  );

  const handlePendingGroupAction = (group: (typeof pendingPatientGroups)[number]) => {
    const matchingPlan = paymentPlans.find((plan) => group.planIds.includes(plan.id));

    if (matchingPlan) {
      onViewInstallments(matchingPlan);
      return;
    }

    openPatientRecord(group.patientId);
  };

  const sortedTransactions = useMemo(
    () => [...transactions].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()),
    [transactions]
  );

  // ─── Filter helpers ──────────────────────────────────────────────────
  const todayKey = now.toLocaleDateString('en-CA');
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(now.getDate() - 1);
  const yesterdayKey = yesterdayDate.toLocaleDateString('en-CA');

  const hasActiveFilter = filterDate !== null || filterPatientId !== null;

  const uniqueTransactionPatients = useMemo(() => {
    const map = new Map<number, string>();
    transactions.forEach((t) => {
      if (t.patient_id && t.patient_name && !map.has(t.patient_id)) {
        map.set(t.patient_id, t.patient_name);
      }
    });
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!hasActiveFilter) return sortedTransactions;
    return sortedTransactions.filter((t) => {
      if (filterDate) {
        const tDate = t.date?.split('T')[0];
        if (tDate !== filterDate) return false;
      }
      if (filterPatientId) {
        if (t.patient_id !== filterPatientId) return false;
      }
      return true;
    });
  }, [sortedTransactions, filterDate, filterPatientId, hasActiveFilter]);

  const filterPatientName = useMemo(
    () => filterPatientId ? uniqueTransactionPatients.find((p) => p.id === filterPatientId)?.name || '' : '',
    [filterPatientId, uniqueTransactionPatients]
  );

  const clearFilters = () => {
    setFilterDate(null);
    setFilterPatientId(null);
    setPatientSearchOpen(false);
    setPatientSearchQuery('');
  };

  // Close patient search on outside click
  useEffect(() => {
    if (!patientSearchOpen) return;
    const handler = (e: MouseEvent) => {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setPatientSearchOpen(false);
        setPatientSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [patientSearchOpen]);

  useEffect(() => {
    setVisibleTransactionCount(TRANSACTIONS_PAGE_SIZE);
    setShowAllOlderTransactions(false);
  }, [transactions, filterDate, filterPatientId]);

  const visibleTransactions = useMemo(
    () => filteredTransactions.slice(0, visibleTransactionCount),
    [filteredTransactions, visibleTransactionCount]
  );

  const transactionIndexMap = useMemo(
    () => new Map(visibleTransactions.map((transaction, index) => [transaction.id, index])),
    [visibleTransactions]
  );

  const hasMoreTransactions = visibleTransactionCount < filteredTransactions.length;

  const recentSections = useMemo(() => {
    const todayItems = visibleTransactions.filter((transaction) => transaction.date?.split('T')[0] === todayKey);
    const yesterdayItems = visibleTransactions.filter((transaction) => transaction.date?.split('T')[0] === yesterdayKey);

    const sections = [
      { title: 'Hoje', items: todayItems },
      { title: 'Ontem', items: yesterdayItems },
    ].filter((section) => section.items.length > 0);

    return sections;
  }, [visibleTransactions, todayKey, yesterdayKey]);

  const getDateGroupLabel = (dateKey: string) => {
    if (dateKey === todayKey) return 'Hoje';
    if (dateKey === yesterdayKey) return 'Ontem';

    return formatDate(dateKey);
  };

  const olderTransactions = useMemo(() => {
    return visibleTransactions.filter((transaction) => {
      const transactionKey = transaction.date?.split('T')[0];
      return transactionKey && transactionKey !== todayKey && transactionKey !== yesterdayKey;
    });
  }, [visibleTransactions, todayKey, yesterdayKey]);

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

        setVisibleTransactionCount((current) => Math.min(current + TRANSACTIONS_PAGE_SIZE, filteredTransactions.length));
      },
      {
        root: null,
        rootMargin: '0px 0px 240px 0px',
        threshold: 0.01,
      }
    );

    observer.observe(loadMoreRef.current);

    return () => observer.disconnect();
  }, [hasMoreTransactions, filteredTransactions.length]);

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
          <div className="space-y-4">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-amber-700 flex items-center gap-2 leading-relaxed">
                <AlertTriangle size={18} className="text-amber-600" />
                {currency(pendingTotal)} parado esperando cobrança
              </p>
              <p className="text-[48px] md:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] text-slate-900">{currency(monthRevenue)}</p>
              <p className="text-[13px] leading-relaxed text-amber-700/80 font-medium">
                {pendingPatientCount} paciente{pendingPatientCount !== 1 ? 's' : ''} com pendência · Cobrar agora aumenta seu mês
              </p>
            </div>
            {financeAnalysis.ctaAction && (
              <button
                onClick={() => {
                  if (financeAnalysis.ctaAction === 'schedule') setIsModalOpen(true);
                  else if (financeAnalysis.ctaAction === 'agenda') setActiveTab('agenda');
                  else if (financeAnalysis.ctaAction === 'patients') setActiveTab('pacientes');
                  else if (financeAnalysis.ctaAction === 'income') onOpenTransactionModal('INCOME');
                }}
                className="flex items-center gap-2 text-[13px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-4 py-2.5 rounded-full transition-colors"
              >
                {financeAnalysis.ctaLabel}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-3">
              <p className={`text-[13px] font-semibold flex items-center gap-2 leading-relaxed ${financeAnalysis.headlineColor}`}>
                {financeAnalysis.headlineIcon === 'rocket' && <Rocket size={18} />}
                {financeAnalysis.headlineIcon === 'check' && <CheckCheck size={18} />}
                {financeAnalysis.headlineIcon === 'target' && <Target size={18} />}
                {financeAnalysis.headlineIcon === 'chart' && <TrendingUp size={18} />}
                {financeAnalysis.headline}
              </p>
              <p className="text-[48px] md:text-[56px] leading-[0.95] font-bold tracking-[-0.04em] text-slate-900">{currency(monthRevenue)}</p>
              <p className="text-[13px] leading-relaxed text-slate-500 font-medium">{financeAnalysis.subtitle}</p>
            </div>
            {financeAnalysis.ctaAction && financeAnalysis.ctaLabel && (
              <button
                onClick={() => {
                  if (financeAnalysis.ctaAction === 'schedule') setIsModalOpen(true);
                  else if (financeAnalysis.ctaAction === 'agenda') setActiveTab('agenda');
                  else if (financeAnalysis.ctaAction === 'patients') setActiveTab('pacientes');
                  else if (financeAnalysis.ctaAction === 'income') onOpenTransactionModal('INCOME');
                }}
                className="flex items-center gap-2 text-[13px] font-bold text-primary bg-primary/10 hover:bg-primary/15 px-4 py-2.5 rounded-full transition-colors"
              >
                {financeAnalysis.ctaLabel}
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {pendingTotal > 0 && (
        <section className="space-y-4">
          <div>
            <h3 className="text-[14px] font-semibold text-slate-900">Precisa de ação</h3>
            <p className="text-[14px] leading-relaxed text-slate-400">Cobranças que merecem atenção agora.</p>
          </div>

          <div className="space-y-4">
            {visiblePendingGroups.map((group) => (
              <div
                key={group.patientId}
                className="rounded-[24px] border border-slate-100 bg-white/88 px-5 py-5 shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-3.5">
                    <div className="space-y-1">
                      <p className="text-[16px] font-semibold text-slate-900 truncate leading-snug">{group.patientName}</p>
                      <p className="text-[13px] font-medium text-slate-500 leading-relaxed">
                        {group.items.length} pendência{group.items.length !== 1 ? 's' : ''} • {currency(group.totalAmount)} aguardando pagamento
                      </p>
                    </div>

                    <div className="space-y-2.5">
                      {group.items.map((item) => (
                        <div key={item.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                          <p className="text-[14px] text-slate-500 leading-snug">{item.procedure}</p>
                          <p className="text-[14px] font-semibold text-slate-900 tabular-nums">{currency(Number(item.amount))}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="shrink-0 md:pt-0.5">
                    <button
                      type="button"
                      onClick={() => handlePendingGroupAction(group)}
                      className="w-full md:w-auto rounded-full bg-amber-50 px-4 py-2.5 text-[13px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                    >
                      {group.items.length > 1 ? 'Cobrar de uma vez' : 'Cobrar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {hiddenPendingGroupsCount > 0 && (
            <p className="text-[13px] text-slate-400 leading-relaxed">
              +{hiddenPendingGroupsCount} paciente{hiddenPendingGroupsCount !== 1 ? 's' : ''} ainda aguardando cobrança.
            </p>
          )}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[14px] font-semibold text-slate-900">Movimentações</h3>
          {visibleTransactions.length > 0 && !hasActiveFilter && (
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

        {/* ─── Filter bar ─────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (filterDate === todayKey) { setFilterDate(null); } else { setFilterDate(todayKey); }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              filterDate === todayKey
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays size={14} />
            Hoje
          </button>

          <button
            type="button"
            onClick={() => {
              if (filterDate === yesterdayKey) { setFilterDate(null); } else { setFilterDate(yesterdayKey); }
            }}
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
              filterDate === yesterdayKey
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Ontem
          </button>

          <button
            type="button"
            onClick={() => {
              dateInputRef.current?.showPicker?.();
              dateInputRef.current?.click();
            }}
            className={`relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 cursor-pointer ${
              filterDate && filterDate !== todayKey && filterDate !== yesterdayKey
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <CalendarDays size={14} />
            {filterDate && filterDate !== todayKey && filterDate !== yesterdayKey
              ? new Date(`${filterDate}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
              : 'Data'}
            <input
              ref={dateInputRef}
              type="date"
              className="absolute inset-0 opacity-0 cursor-pointer"
              value={filterDate && filterDate !== todayKey && filterDate !== yesterdayKey ? filterDate : ''}
              onChange={(e) => {
                const val = e.target.value;
                if (val) setFilterDate(val);
              }}
            />
          </button>

          <div className="relative" ref={patientSearchRef}>
            <button
              type="button"
              onClick={() => {
                if (filterPatientId) {
                  setFilterPatientId(null);
                  setPatientSearchOpen(false);
                  setPatientSearchQuery('');
                } else {
                  setPatientSearchOpen(!patientSearchOpen);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold transition-all duration-200 ${
                filterPatientId
                  ? 'bg-slate-900 text-white shadow-sm'
                  : patientSearchOpen
                    ? 'bg-white text-slate-800 border border-slate-300 shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <UserRound size={14} />
              {filterPatientId ? filterPatientName : 'Paciente'}
              {filterPatientId && <X size={12} />}
            </button>

            {patientSearchOpen && !filterPatientId && (
              <div className="absolute top-full left-0 mt-2 z-50 w-64 rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(15,23,42,0.12)] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                  <Search size={14} className="text-slate-400 shrink-0" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="Buscar paciente..."
                    value={patientSearchQuery}
                    onChange={(e) => setPatientSearchQuery(e.target.value)}
                    className="w-full text-[13px] text-slate-800 placeholder:text-slate-400 bg-transparent outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto py-1">
                  {uniqueTransactionPatients
                    .filter((p) => !patientSearchQuery || p.name.toLowerCase().includes(patientSearchQuery.toLowerCase()))
                    .map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setFilterPatientId(p.id);
                          setPatientSearchOpen(false);
                          setPatientSearchQuery('');
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors truncate"
                      >
                        {p.name}
                      </button>
                    ))}
                  {uniqueTransactionPatients.filter((p) => !patientSearchQuery || p.name.toLowerCase().includes(patientSearchQuery.toLowerCase())).length === 0 && (
                    <p className="px-3.5 py-3 text-[12px] text-slate-400 text-center">Nenhum paciente encontrado</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {hasActiveFilter && (
            <>
              <span className="text-[12px] text-slate-400 font-medium tabular-nums ml-1">
                {filteredTransactions.length} movimentaç{filteredTransactions.length !== 1 ? 'ões' : 'ão'}
              </span>
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition-all"
              >
                <X size={12} />
                Limpar
              </button>
            </>
          )}
        </div>

        <div className="space-y-7">
          {hasActiveFilter ? (
            /* ─── Filtered view: flat grouped list ──────────────── */
            <div className="space-y-6">
              {allTransactionGroups.length > 0 ? (
                allTransactionGroups.map((group, groupIndex) => (
                  <div key={group.dateKey}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300 mb-2.5">{group.label}</p>
                    <div className="space-y-0">
                      {group.items.map((transaction, itemIndex) => renderTransactionCard(transaction, groupIndex, itemIndex))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-10 text-center space-y-2">
                  <p className="text-slate-400 text-sm">Nenhuma movimentação ainda.</p>
                  <button type="button" onClick={clearFilters} className="text-[13px] font-semibold text-primary hover:underline">
                    Limpar filtros
                  </button>
                </div>
              )}
            </div>
          ) : showAllOlderTransactions ? (
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

          {!hasActiveFilter && recentSections.length === 0 && olderTransactions.length === 0 && (
            <div className="py-8 text-center text-slate-400 text-sm">
              Nenhuma movimentação recente ainda.
            </div>
          )}

          {hasMoreTransactions && (
            <div ref={loadMoreRef} className="h-12 flex items-center justify-center text-xs font-medium text-slate-300">
              Carregando mais movimentações...
            </div>
          )}

          {(recentSections.length > 0 || (hasActiveFilter && filteredTransactions.length > 0)) && <div aria-hidden="true" className="h-[40vh] min-h-40" />}
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
                    value: selectedTransaction.patient_name || 'Paciente não identificado',
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