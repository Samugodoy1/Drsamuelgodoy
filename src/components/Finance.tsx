import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
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
  Shield,
  Building2,
  AlertCircle,
  CheckCircle,
  Phone,
  Mail,
  FileCheck,
  Clock,
  DollarSign,
  Zap,
  Calculator,
  Check,
  Settings,
  Upload,
  Lock,
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

interface InsurancePlan {
  id: number;
  dentist_id: number;
  name: string;
  ans_code: string | null;
  operator_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  notes: string | null;
  active: boolean;
  patient_count: number;
  created_at: string;
}

interface Invoice {
  id: number;
  dentist_id: number;
  patient_id: number | null;
  transaction_id: number | null;
  invoice_number: string;
  description: string;
  amount: number;
  status: 'DRAFT' | 'PROCESSING' | 'AUTHORIZED' | 'REJECTED' | 'ERROR' | 'CANCEL_PROCESSING' | 'CANCELLED' | 'INTERNAL';
  issued_at: string | null;
  patient_name: string | null;
  patient_cpf: string | null;
  service_code: string;
  created_at: string;
  retry_count?: number;
  // Campos NFS-e real
  nfse_numero?: string | null;
  nfse_codigo_verificacao?: string | null;
  nfse_link_visualizacao?: string | null;
  nfse_protocolo?: string | null;
  rps_numero?: number | null;
  rps_serie?: string | null;
  prestador_cnpj?: string | null;
  tomador_cpf_cnpj?: string | null;
  aliquota_iss?: number | null;
  valor_iss?: number | null;
  valor_liquido?: number | null;
  error_message?: string | null;
  _mode?: string;
  _notice?: string;
}

interface FiscalConfigData {
  cnpj?: string;
  inscricao_municipal?: string;
  razao_social?: string;
  nome_fantasia?: string;
  regime_tributario?: string;
  endereco_logradouro?: string;
  endereco_numero?: string;
  endereco_complemento?: string;
  endereco_bairro?: string;
  endereco_cidade?: string;
  endereco_uf?: string;
  endereco_cep?: string;
  codigo_municipio_ibge?: string;
  telefone?: string;
  email?: string;
  nfse_provider?: string;
  nfse_ambiente?: string;
  nfse_url_homologacao?: string;
  nfse_url_producao?: string;
  nfse_usuario?: string;
  nfse_senha?: string;
  codigo_servico?: string;
  codigo_cnae?: string;
  aliquota_iss?: number;
  iss_retido?: boolean;
  serie_rps?: string;
  has_certificado?: boolean;
  certificado_validade?: string | null;
  providers_available?: Array<{ id: string; name: string; description: string }>;
  regimes_tributarios?: Array<{ id: string; name: string }>;
}

interface DelinquencyRecord {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  installment_id: number | null;
  amount: number;
  due_date: string;
  days_overdue: number;
  status: 'OPEN' | 'CONTACTED' | 'NEGOTIATED' | 'PAID' | 'WRITTEN_OFF';
  contact_attempts: number;
  last_contact_date: string | null;
  last_contact_method: string | null;
  notes: string | null;
}

interface PixPayment {
  id: number;
  patient_id: number | null;
  patient_name: string | null;
  amount: number;
  pix_key: string;
  description: string | null;
  qr_code_payload: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  created_at: string;
  expires_at: string;
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
  profile?: { name?: string; cro?: string; clinic_name?: string; clinic_address?: string; phone?: string; email?: string } | null;
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
  profile,
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

  // ─── Sub-tab state ──────────────────────────────────────────────────
  type FinanceSubTab = 'geral' | 'nf' | 'convenios' | 'inadimplencia' | 'pix';
  const [subTab, setSubTab] = useState<FinanceSubTab>('geral');

  // ─── Convênios state ────────────────────────────────────────────────
  const [insurancePlans, setInsurancePlans] = useState<InsurancePlan[]>([]);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [newInsurance, setNewInsurance] = useState({ name: '', ans_code: '', operator_name: '', contact_phone: '', contact_email: '', notes: '' });

  // ─── NF state ───────────────────────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [newInvoice, setNewInvoice] = useState({ patient_id: '', transaction_id: '', description: '', amount: '' });
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);

  // ─── Configuração Fiscal (NFS-e) state ──────────────────────────────
  const [fiscalConfig, setFiscalConfig] = useState<FiscalConfigData | null>(null);
  const [showFiscalConfig, setShowFiscalConfig] = useState(false);
  const [fiscalForm, setFiscalForm] = useState<Record<string, any>>({});
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [lastInvoiceNotice, setLastInvoiceNotice] = useState<string | null>(null);

  // ─── Inadimplência state ────────────────────────────────────────────
  const [delinquencyRecords, setDelinquencyRecords] = useState<DelinquencyRecord[]>([]);

  // ─── Pix state ──────────────────────────────────────────────────────
  const [pixPayments, setPixPayments] = useState<PixPayment[]>([]);
  const [showPixForm, setShowPixForm] = useState(false);
  const [newPix, setNewPix] = useState({ patient_id: '', amount: '', description: '', pix_key: '', pix_key_type: 'CPF', pix_beneficiary_name: '' });
  const [copiedPixId, setCopiedPixId] = useState<number | null>(null);
  const [pixConfig, setPixConfig] = useState<{ pix_key: string; pix_key_type: string; pix_beneficiary_name: string } | null>(null);
  const [showPixConfig, setShowPixConfig] = useState(false);
  const [pixConfigForm, setPixConfigForm] = useState({ pix_key: '', pix_key_type: 'CPF', pix_beneficiary_name: '' });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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

  // ─── Fetch data for sub-tabs ────────────────────────────────────────
  const fetchInsurancePlans = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/insurance-plans');
      if (res.ok) { const data = await res.json(); setInsurancePlans(Array.isArray(data) ? data : []); }
      else { console.error('fetchInsurancePlans status:', res.status); }
    } catch (e) { console.error('fetchInsurancePlans error:', e); }
  }, [apiFetch]);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/invoices');
      if (res.ok) { const data = await res.json(); setInvoices(Array.isArray(data) ? data : []); }
      else { console.error('fetchInvoices status:', res.status); }
    } catch (e) { console.error('fetchInvoices error:', e); }
  }, [apiFetch]);

  const fetchFiscalConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/fiscal-config');
      if (res.ok) {
        const data = await res.json();
        setFiscalConfig(data);
        setFiscalForm(data);
      }
    } catch (e) { console.error('fetchFiscalConfig error:', e); }
  }, [apiFetch]);

  const fetchDelinquency = useCallback(async () => {
    try {
      // Sync first, then fetch
      await apiFetch('/api/finance/delinquency/sync', { method: 'POST' });
      const res = await apiFetch('/api/finance/delinquency');
      if (res.ok) { const data = await res.json(); setDelinquencyRecords(Array.isArray(data) ? data : []); }
      else { console.error('fetchDelinquency status:', res.status); }
    } catch (e) { console.error('fetchDelinquency error:', e); }
  }, [apiFetch]);

  const fetchPixPayments = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/pix/payments');
      if (res.ok) { const data = await res.json(); setPixPayments(Array.isArray(data) ? data : []); }
    } catch (e) { console.error('fetchPixPayments error:', e); }
  }, [apiFetch]);

  const fetchPixConfig = useCallback(async () => {
    try {
      const res = await apiFetch('/api/finance/pix/config');
      if (res.ok) {
        const data = await res.json();
        setPixConfig(data);
        if (data.pix_key) {
          setPixConfigForm({ pix_key: data.pix_key, pix_key_type: data.pix_key_type || 'CPF', pix_beneficiary_name: data.pix_beneficiary_name || '' });
        }
      }
    } catch (e) { console.error('fetchPixConfig error:', e); }
  }, [apiFetch]);

  useEffect(() => {
    if (subTab === 'convenios') fetchInsurancePlans();
    if (subTab === 'nf') { fetchInvoices(); fetchFiscalConfig(); }
    if (subTab === 'inadimplencia') fetchDelinquency();
    if (subTab === 'pix') { fetchPixPayments(); fetchPixConfig(); }
  }, [subTab, fetchInsurancePlans, fetchInvoices, fetchFiscalConfig, fetchDelinquency, fetchPixPayments, fetchPixConfig]);

  // ─── Handlers for new features ──────────────────────────────────────
  const handleCreateInsurance = async () => {
    if (!newInsurance.name.trim()) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/finance/insurance-plans', { method: 'POST', body: JSON.stringify(newInsurance) });
      if (res.ok) { setShowInsuranceForm(false); setNewInsurance({ name: '', ans_code: '', operator_name: '', contact_phone: '', contact_email: '', notes: '' }); fetchInsurancePlans(); }
      else { const d = await res.json().catch(() => ({})); setErrorMsg(d.error || 'Erro ao criar convênio'); }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const handleDeleteInsurance = async (id: number) => {
    if (!confirm('Excluir este convênio?')) return;
    try {
      await apiFetch(`/api/finance/insurance-plans/${id}`, { method: 'DELETE' });
      fetchInsurancePlans();
    } catch (e) { console.error(e); }
  };

  const handleCreateInvoice = async () => {
    if (!newInvoice.description || !newInvoice.amount) return;
    setErrorMsg(null);
    setLastInvoiceNotice(null);
    try {
      const res = await apiFetch('/api/finance/invoices', {
        method: 'POST',
        body: JSON.stringify({ ...newInvoice, amount: parseFloat(newInvoice.amount), patient_id: newInvoice.patient_id ? parseInt(newInvoice.patient_id) : null, transaction_id: newInvoice.transaction_id ? parseInt(newInvoice.transaction_id) : null })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok || res.status === 422) {
        setShowInvoiceForm(false);
        setNewInvoice({ patient_id: '', transaction_id: '', description: '', amount: '' });
        fetchInvoices();
        if (data._notice) setLastInvoiceNotice(data._notice);
        if (data.nfseError) setErrorMsg(`Prefeitura rejeitou: ${data.nfseError}`);
        if (data.error && res.status === 422) setErrorMsg(data.error);
      } else {
        setErrorMsg(data.error || 'Erro ao emitir NF');
      }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const handleSaveFiscalConfig = async () => {
    setSavingFiscal(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/finance/fiscal-config', {
        method: 'POST',
        body: JSON.stringify(fiscalForm)
      });
      if (res.ok) {
        setShowFiscalConfig(false);
        fetchFiscalConfig();
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error || 'Erro ao salvar configuração fiscal');
      }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
    finally { setSavingFiscal(false); }
  };

  const handleUploadCertificado = async (file: File, senha: string) => {
    setErrorMsg(null);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1] || reader.result as string;
        const res = await apiFetch('/api/finance/fiscal-config/certificado', {
          method: 'POST',
          body: JSON.stringify({ certificado_base64: base64, certificado_senha: senha })
        });
        if (res.ok) {
          fetchFiscalConfig();
          setErrorMsg(null);
        } else {
          const d = await res.json().catch(() => ({}));
          setErrorMsg(d.error || 'Erro ao enviar certificado');
        }
      };
      reader.readAsDataURL(file);
    } catch (e) { setErrorMsg('Erro ao ler certificado'); console.error(e); }
  };

  const handleCancelInvoice = async (id: number) => {
    if (!confirm('Cancelar esta nota fiscal? Se for NFS-e autorizada, o cancelamento será enviado à prefeitura.')) return;
    try {
      const res = await apiFetch(`/api/finance/invoices/${id}/cancel`, { method: 'PATCH' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error || 'Erro ao cancelar NF');
      }
      fetchInvoices();
    } catch (e) { console.error(e); }
  };

  const handleRetryInvoice = async (id: number) => {
    if (!confirm('Reprocessar esta nota fiscal junto à prefeitura?')) return;
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/finance/invoices/${id}/retry`, { method: 'PATCH' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 422) {
        setErrorMsg(data.error || 'Erro ao reprocessar NF');
      }
      if (data.nfseError) setErrorMsg(`Prefeitura rejeitou: ${data.nfseError}`);
      fetchInvoices();
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const handleDownloadXml = async (id: number, type: 'envio' | 'retorno') => {
    try {
      const res = await apiFetch(`/api/finance/invoices/${id}/xml?type=${type}`);
      if (!res.ok) { const d = await res.json().catch(() => ({})); setErrorMsg(d.error || 'XML não disponível'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nfse_${id}_${type}.xml`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { console.error(e); }
  };

  const handleEmitInvoiceFromTransaction = async (t: Transaction) => {
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/finance/invoices', {
        method: 'POST',
        body: JSON.stringify({ patient_id: t.patient_id, transaction_id: t.id, description: t.procedure || t.description, amount: t.amount })
      });
      if (res.ok) { fetchInvoices(); setSubTab('nf'); }
      else { const d = await res.json().catch(() => ({})); setErrorMsg(d.error || 'Erro ao emitir NF'); alert(d.error || 'Erro ao emitir NF'); }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const handleUpdateDelinquency = async (id: number, status: string, method?: string) => {
    try {
      await apiFetch(`/api/finance/delinquency/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, last_contact_method: method })
      });
      fetchDelinquency();
    } catch (e) { console.error(e); }
  };

  const handleCreatePix = async () => {
    if (!newPix.amount) return;
    setErrorMsg(null);
    // Use config or inline key
    const pixKey = newPix.pix_key || pixConfig?.pix_key || '';
    const pixKeyType = newPix.pix_key_type || pixConfig?.pix_key_type || 'CPF';
    const beneficiary = newPix.pix_beneficiary_name || pixConfig?.pix_beneficiary_name || '';
    
    if (!pixKey) {
      setErrorMsg('Configure sua chave Pix primeiro (botão "Configurar Pix" acima).');
      return;
    }
    try {
      const res = await apiFetch('/api/finance/pix/payments', {
        method: 'POST',
        body: JSON.stringify({ 
          amount: parseFloat(newPix.amount), 
          patient_id: newPix.patient_id ? parseInt(newPix.patient_id) : null,
          description: newPix.description,
          pix_key: pixKey,
          pix_key_type: pixKeyType,
          pix_beneficiary_name: beneficiary
        })
      });
      if (res.ok) { setShowPixForm(false); setNewPix({ patient_id: '', amount: '', description: '', pix_key: '', pix_key_type: 'CPF', pix_beneficiary_name: '' }); fetchPixPayments(); setErrorMsg(null); }
      else { const d = await res.json().catch(() => ({})); setErrorMsg(d.error || 'Erro ao gerar Pix'); }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const handleConfirmPix = async (id: number) => {
    try {
      await apiFetch(`/api/finance/pix/${id}/confirm`, { method: 'PATCH' });
      fetchPixPayments();
    } catch (e) { console.error(e); }
  };

  const handleSavePixConfig = async () => {
    if (!pixConfigForm.pix_key.trim()) { setErrorMsg('Informe a chave Pix'); return; }
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/finance/pix/config', {
        method: 'POST',
        body: JSON.stringify(pixConfigForm)
      });
      if (res.ok) {
        setPixConfig(pixConfigForm);
        setShowPixConfig(false);
        setErrorMsg(null);
      } else {
        const d = await res.json().catch(() => ({}));
        setErrorMsg(d.error || 'Erro ao salvar configuração Pix');
      }
    } catch (e) { setErrorMsg('Erro de conexão'); console.error(e); }
  };

  const copyPixPayload = (id: number, payload: string) => {
    navigator.clipboard.writeText(payload);
    setCopiedPixId(id);
    setTimeout(() => setCopiedPixId(null), 2000);
  };

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
                {transaction.type === 'INCOME' && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(null);
                      handleEmitInvoiceFromTransaction(transaction);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Emitir NF
                  </button>
                )}
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
          <h2 className="text-[28px] font-bold tracking-tight text-academy-text">Financeiro</h2>
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

      {/* ─── Sub-tab Navigation ──────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 overflow-x-auto no-scrollbar">
        {([
          { key: 'geral' as const, label: 'Geral', icon: <DollarSign size={14} /> },
          { key: 'nf' as const, label: 'Notas Fiscais', icon: <FileCheck size={14} /> },
          { key: 'convenios' as const, label: 'Convênios', icon: <Shield size={14} /> },
          { key: 'inadimplencia' as const, label: 'Inadimplência', icon: <AlertCircle size={14} /> },
          { key: 'pix' as const, label: 'Pix', icon: <Zap size={14} /> },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setSubTab(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold whitespace-nowrap transition-all duration-200 ${
              subTab === tab.key
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {subTab === 'geral' && (<>
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
      </>)}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* NOTAS FISCAIS (NF) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ─── Error Banner ─────────────────────────────────────────── */}
      {errorMsg && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle size={16} className="text-rose-500 shrink-0" />
            <p className="text-[13px] text-rose-700 font-medium truncate">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600 shrink-0"><X size={14} /></button>
        </div>
      )}

      {subTab === 'nf' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-slate-900">Notas Fiscais</h3>
              <p className="text-[13px] text-slate-400">Emissão e controle de NFS-e</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFiscalConfig(true)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white text-slate-700 px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-50 transition-colors"
              >
                <Settings size={14} /> Config Fiscal
              </button>
              <button
                onClick={() => setShowInvoiceForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} /> Emitir NF
              </button>
            </div>
          </div>

          {/* Fiscal config status banner */}
          {fiscalConfig && (
            <div className={`rounded-2xl border px-5 py-3.5 flex items-center gap-3 ${
              fiscalConfig.nfse_provider && fiscalConfig.nfse_provider !== 'NENHUM' && fiscalConfig.has_certificado
                ? 'border-emerald-100 bg-emerald-50/60'
                : 'border-amber-100 bg-amber-50/60'
            }`}>
              {fiscalConfig.nfse_provider && fiscalConfig.nfse_provider !== 'NENHUM' && fiscalConfig.has_certificado ? (
                <>
                  <CheckCircle size={16} className="text-emerald-600 shrink-0" />
                  <div className="text-[13px]">
                    <span className="font-semibold text-emerald-800">NFS-e configurada</span>
                    <span className="text-emerald-600 ml-2">
                      Provedor: {fiscalConfig.providers_available?.find(p => p.id === fiscalConfig.nfse_provider)?.name || fiscalConfig.nfse_provider}
                      {' · '}{fiscalConfig.nfse_ambiente === 'producao' ? 'Produção' : 'Homologação'}
                      {fiscalConfig.certificado_validade && ` · Cert. até ${new Date(fiscalConfig.certificado_validade).toLocaleDateString('pt-BR')}`}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <div className="text-[13px]">
                    <span className="font-semibold text-amber-800">NFS-e não configurada</span>
                    <span className="text-amber-600 ml-2">
                      {!fiscalConfig.nfse_provider || fiscalConfig.nfse_provider === 'NENHUM'
                        ? 'Selecione um provedor NFS-e'
                        : 'Envie o certificado digital A1'}
                      {' — notas serão emitidas apenas internamente.'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Last invoice notice */}
          {lastInvoiceNotice && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-5 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={16} className="text-blue-500 shrink-0" />
                <p className="text-[13px] text-blue-700">{lastInvoiceNotice}</p>
              </div>
              <button onClick={() => setLastInvoiceNotice(null)} className="text-blue-400 hover:text-blue-600 shrink-0"><X size={14} /></button>
            </div>
          )}

          {/* Quick emit from recent transactions */}
          {transactions.filter(t => t.type === 'INCOME').slice(0, 3).length > 0 && (
            <div className="rounded-[24px] border border-slate-100 bg-white/88 p-5 space-y-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Emitir NF rápida</p>
              {transactions.filter(t => t.type === 'INCOME').slice(0, 3).map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-700 truncate">{t.procedure || t.description}</p>
                    <p className="text-[12px] text-slate-400">{t.patient_name || 'Sem paciente'} · {currency(Number(t.amount))}</p>
                  </div>
                  <button
                    onClick={() => handleEmitInvoiceFromTransaction(t)}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1.5 text-[12px] font-semibold hover:bg-primary/20 transition-colors"
                  >
                    <FileCheck size={12} /> Emitir
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Invoice form */}
          <AnimatePresence>
            {showInvoiceForm && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[16px] font-bold text-slate-900">Nova Nota Fiscal</h4>
                  <button onClick={() => setShowInvoiceForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Descrição do serviço</label>
                    <input type="text" value={newInvoice.description} onChange={e => setNewInvoice({ ...newInvoice, description: e.target.value })}
                      placeholder="Ex: Tratamento de canal" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Valor (R$)</label>
                    <input type="number" step="0.01" value={newInvoice.amount} onChange={e => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                      placeholder="0,00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Paciente (opcional)</label>
                    <select value={newInvoice.patient_id} onChange={e => setNewInvoice({ ...newInvoice, patient_id: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                      <option value="">Selecione</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowInvoiceForm(false)} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleCreateInvoice} className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90">Emitir NF</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Invoices list */}
          <div className="space-y-3">
            {invoices.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Nenhuma nota fiscal emitida ainda.</p>}
            {invoices.map(inv => {
              const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                AUTHORIZED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Autorizada' },
                INTERNAL: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Interna' },
                PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Processando' },
                CANCEL_PROCESSING: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Cancelando' },
                DRAFT: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Rascunho' },
                REJECTED: { bg: 'bg-orange-50', text: 'text-orange-700', label: 'Rejeitada' },
                ERROR: { bg: 'bg-red-50', text: 'text-red-600', label: 'Erro' },
                CANCELLED: { bg: 'bg-rose-50', text: 'text-rose-600', label: 'Cancelada' },
                // backward compat
                ISSUED: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Emitida' },
                PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pendente' },
              };
              const st = statusMap[inv.status] || statusMap.DRAFT;
              const iconColor = st.bg + ' ' + st.text;
              const isRetryable = inv.status === 'REJECTED' || inv.status === 'ERROR';
              const isCancellable = inv.status === 'AUTHORIZED' || inv.status === 'INTERNAL' || inv.status === 'ISSUED';

              return (
              <div key={inv.id} className="rounded-[20px] border border-slate-100 bg-white/90 px-5 py-4 flex items-center justify-between gap-4 shadow-[0_4px_14px_rgba(15,23,42,0.035)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconColor}`}>
                    <FileText size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-slate-800 truncate">{inv.invoice_number} — {inv.description}</p>
                      {inv.nfse_numero && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider shrink-0">NFS-e {inv.nfse_numero}</span>
                      )}
                      {inv.status === 'INTERNAL' && (
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider shrink-0">Interna</span>
                      )}
                    </div>
                    <p className="text-[12px] text-slate-400">
                      {inv.patient_name || 'Sem paciente'} · {inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('pt-BR') : '—'}
                      {inv.nfse_codigo_verificacao && <span className="ml-1">· Cód: {inv.nfse_codigo_verificacao}</span>}
                      {inv.retry_count ? <span className="ml-1">· Tentativa {inv.retry_count}</span> : null}
                    </p>
                    {(inv.status === 'ERROR' || inv.status === 'REJECTED') && inv.error_message && (
                      <p className="text-[11px] text-red-500 truncate mt-0.5">{inv.error_message}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[14px] font-bold text-slate-900">{currency(Number(inv.amount))}</span>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.bg} ${st.text}`}>
                    {st.label}
                  </span>
                  {inv.nfse_link_visualizacao && (
                    <a href={inv.nfse_link_visualizacao} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                      <ArrowRight size={12} /> Portal
                    </a>
                  )}
                  {inv.nfse_numero && (
                    <button onClick={() => handleDownloadXml(inv.id, 'retorno')}
                      className="text-xs text-slate-500 hover:underline font-medium">XML</button>
                  )}
                  <button onClick={() => setViewingInvoice(inv)}
                    className="text-xs text-primary hover:underline font-medium flex items-center gap-1">
                    <FileText size={12} /> Ver
                  </button>
                  {isRetryable && (
                    <button onClick={() => handleRetryInvoice(inv.id)} className="text-xs text-blue-600 hover:underline font-medium">Reprocessar</button>
                  )}
                  {isCancellable && (
                    <button onClick={() => handleCancelInvoice(inv.id)} className="text-xs text-rose-500 hover:underline font-medium">Cancelar</button>
                  )}
                </div>
              </div>
              );
            })}
          </div>

          {/* Stats */}
          {invoices.length > 0 && (
            <div className="grid grid-cols-4 gap-4">
              <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 p-4 text-center">
                <p className="text-[24px] font-bold text-emerald-700">{invoices.filter(i => i.status === 'AUTHORIZED' || i.status === 'ISSUED').length}</p>
                <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Autorizadas</p>
              </div>
              <div className="rounded-[20px] bg-amber-50 border border-amber-100 p-4 text-center">
                <p className="text-[24px] font-bold text-amber-700">{currency(invoices.filter(i => i.status === 'AUTHORIZED' || i.status === 'ISSUED' || i.status === 'INTERNAL').reduce((s, i) => s + Number(i.amount), 0))}</p>
                <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Total NFs</p>
              </div>
              <div className="rounded-[20px] bg-red-50 border border-red-100 p-4 text-center">
                <p className="text-[24px] font-bold text-red-700">{invoices.filter(i => i.status === 'ERROR' || i.status === 'REJECTED').length}</p>
                <p className="text-[11px] font-semibold text-red-600 uppercase tracking-wider">Erros/Rejeitadas</p>
              </div>
              <div className="rounded-[20px] bg-rose-50 border border-rose-100 p-4 text-center">
                <p className="text-[24px] font-bold text-rose-700">{invoices.filter(i => i.status === 'CANCELLED').length}</p>
                <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Canceladas</p>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MODAL CONFIGURAÇÃO FISCAL NFS-e */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFiscalConfig && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowFiscalConfig(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-3xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white"><Settings size={20} /></div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-800">Configuração Fiscal NFS-e</h2>
                      <p className="text-xs text-slate-400">Dados do prestador, certificado digital e provedor</p>
                    </div>
                  </div>
                  <button onClick={() => setShowFiscalConfig(false)} className="p-2 bg-slate-100 rounded-lg hover:bg-slate-200"><X size={18} /></button>
                </div>

                {/* Dados do prestador */}
                <div className="space-y-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Dados do Prestador</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">CNPJ *</label>
                      <input type="text" value={fiscalForm.cnpj || ''} onChange={e => setFiscalForm({ ...fiscalForm, cnpj: e.target.value })}
                        placeholder="00.000.000/0001-00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Inscrição Municipal *</label>
                      <input type="text" value={fiscalForm.inscricao_municipal || ''} onChange={e => setFiscalForm({ ...fiscalForm, inscricao_municipal: e.target.value })}
                        placeholder="Nº IM da prefeitura" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Razão Social</label>
                      <input type="text" value={fiscalForm.razao_social || ''} onChange={e => setFiscalForm({ ...fiscalForm, razao_social: e.target.value })}
                        placeholder="Clínica Odonto LTDA" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome Fantasia</label>
                      <input type="text" value={fiscalForm.nome_fantasia || ''} onChange={e => setFiscalForm({ ...fiscalForm, nome_fantasia: e.target.value })}
                        placeholder="Clínica Sorriso" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Regime Tributário</label>
                      <select value={fiscalForm.regime_tributario || ''} onChange={e => setFiscalForm({ ...fiscalForm, regime_tributario: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                        <option value="">Selecione</option>
                        {(fiscalConfig?.regimes_tributarios || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Telefone</label>
                      <input type="text" value={fiscalForm.telefone || ''} onChange={e => setFiscalForm({ ...fiscalForm, telefone: e.target.value })}
                        placeholder="(11) 98765-4321" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">E-mail Fiscal</label>
                      <input type="email" value={fiscalForm.email || ''} onChange={e => setFiscalForm({ ...fiscalForm, email: e.target.value })}
                        placeholder="fiscal@clinica.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Endereço */}
                <div className="space-y-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Endereço</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Logradouro</label>
                      <input type="text" value={fiscalForm.endereco_logradouro || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_logradouro: e.target.value })}
                        placeholder="Rua Exemplo" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Número</label>
                      <input type="text" value={fiscalForm.endereco_numero || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_numero: e.target.value })}
                        placeholder="123" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Complemento</label>
                      <input type="text" value={fiscalForm.endereco_complemento || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_complemento: e.target.value })}
                        placeholder="Sala 1" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Bairro</label>
                      <input type="text" value={fiscalForm.endereco_bairro || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_bairro: e.target.value })}
                        placeholder="Centro" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Cidade</label>
                      <input type="text" value={fiscalForm.endereco_cidade || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_cidade: e.target.value })}
                        placeholder="São Paulo" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">UF</label>
                      <input type="text" value={fiscalForm.endereco_uf || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_uf: e.target.value })} maxLength={2}
                        placeholder="SP" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">CEP</label>
                      <input type="text" value={fiscalForm.endereco_cep || ''} onChange={e => setFiscalForm({ ...fiscalForm, endereco_cep: e.target.value })}
                        placeholder="01000-000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Provedor NFS-e */}
                <div className="space-y-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Provedor NFS-e</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Provedor</label>
                      <select value={fiscalForm.nfse_provider || ''} onChange={e => setFiscalForm({ ...fiscalForm, nfse_provider: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                        <option value="">Selecione o provedor da sua cidade</option>
                        {(fiscalConfig?.providers_available || []).map(p => (
                          <option key={p.id} value={p.id}>{p.name} — {p.description}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Ambiente</label>
                      <select value={fiscalForm.nfse_ambiente || 'homologacao'} onChange={e => setFiscalForm({ ...fiscalForm, nfse_ambiente: e.target.value })}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                        <option value="homologacao">Homologação (testes)</option>
                        <option value="producao">Produção (real)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">URL Homologação</label>
                      <input type="url" value={fiscalForm.nfse_url_homologacao || ''} onChange={e => setFiscalForm({ ...fiscalForm, nfse_url_homologacao: e.target.value })}
                        placeholder="https://homologacao.ginfes.com.br/..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-[12px]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">URL Produção</label>
                      <input type="url" value={fiscalForm.nfse_url_producao || ''} onChange={e => setFiscalForm({ ...fiscalForm, nfse_url_producao: e.target.value })}
                        placeholder="https://producao.ginfes.com.br/..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm text-[12px]" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Código Município IBGE</label>
                      <input type="text" value={fiscalForm.codigo_municipio_ibge || ''} onChange={e => setFiscalForm({ ...fiscalForm, codigo_municipio_ibge: e.target.value })}
                        placeholder="3550308" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Série RPS</label>
                      <input type="text" value={fiscalForm.serie_rps || ''} onChange={e => setFiscalForm({ ...fiscalForm, serie_rps: e.target.value })}
                        placeholder="A" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                  </div>
                </div>

                {/* Tributação */}
                <div className="space-y-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Tributação</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Código Serviço (CNAE/LC116)</label>
                      <input type="text" value={fiscalForm.codigo_servico || ''} onChange={e => setFiscalForm({ ...fiscalForm, codigo_servico: e.target.value })}
                        placeholder="8630504" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Código CNAE</label>
                      <input type="text" value={fiscalForm.codigo_cnae || ''} onChange={e => setFiscalForm({ ...fiscalForm, codigo_cnae: e.target.value })}
                        placeholder="8630504" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Alíquota ISS (%)</label>
                      <input type="number" step="0.01" min="0" max="5" value={fiscalForm.aliquota_iss || ''} onChange={e => setFiscalForm({ ...fiscalForm, aliquota_iss: parseFloat(e.target.value) || 0 })}
                        placeholder="2.00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={!!fiscalForm.iss_retido} onChange={e => setFiscalForm({ ...fiscalForm, iss_retido: e.target.checked })}
                      className="rounded" />
                    ISS retido na fonte
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer mt-2">
                    <input type="checkbox" checked={!!fiscalForm.auto_emit_on_payment} onChange={e => setFiscalForm({ ...fiscalForm, auto_emit_on_payment: e.target.checked })}
                      className="rounded" />
                    Emitir NFS-e automaticamente ao receber pagamento
                  </label>
                </div>

                {/* Certificado Digital */}
                <div className="space-y-3">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-slate-400">Certificado Digital A1 (ICP-Brasil)</p>
                  {fiscalConfig?.has_certificado ? (
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-5 py-3 flex items-center gap-3">
                      <Lock size={16} className="text-emerald-600" />
                      <div className="text-[13px]">
                        <span className="font-semibold text-emerald-800">Certificado ativo</span>
                        {fiscalConfig.certificado_validade && (
                          <span className="text-emerald-600 ml-2">Válido até {new Date(fiscalConfig.certificado_validade).toLocaleDateString('pt-BR')}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-5 py-3 flex items-center gap-3">
                      <AlertCircle size={16} className="text-amber-600" />
                      <p className="text-[13px] text-amber-700">Nenhum certificado digital enviado. Necessário para emissão real de NFS-e.</p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Arquivo .PFX / .P12</label>
                      <input type="file" accept=".pfx,.p12" id="cert-upload-input"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm file:mr-3 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Senha do Certificado</label>
                      <div className="flex gap-2">
                        <input type="password" id="cert-password-input" placeholder="Senha do .pfx"
                          className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                        <button
                          onClick={() => {
                            const fileInput = document.getElementById('cert-upload-input') as HTMLInputElement;
                            const passInput = document.getElementById('cert-password-input') as HTMLInputElement;
                            if (fileInput?.files?.[0] && passInput?.value) {
                              handleUploadCertificado(fileInput.files[0], passInput.value);
                            } else {
                              setErrorMsg('Selecione o arquivo .pfx e informe a senha');
                            }
                          }}
                          className="px-4 py-2.5 rounded-2xl bg-primary text-white text-sm font-semibold hover:opacity-90 flex items-center gap-1.5"
                        >
                          <Upload size={14} /> Enviar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowFiscalConfig(false)} className="flex-1 py-3 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleSaveFiscalConfig} disabled={savingFiscal}
                    className="flex-1 py-3 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
                    {savingFiscal ? <><Clock size={14} className="animate-spin" /> Salvando...</> : <><Check size={14} /> Salvar Configuração</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CONVÊNIOS (ANS) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'convenios' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-slate-900">Convênios & Planos de Saúde</h3>
              <p className="text-[13px] text-slate-400">Cadastro de operadoras e registro ANS</p>
            </div>
            <button
              onClick={() => setShowInsuranceForm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-800 transition-colors"
            >
              <Plus size={14} /> Novo Convênio
            </button>
          </div>

          {/* Insurance form */}
          <AnimatePresence>
            {showInsuranceForm && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[16px] font-bold text-slate-900">Cadastrar Convênio</h4>
                  <button onClick={() => setShowInsuranceForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome do convênio *</label>
                    <input type="text" value={newInsurance.name} onChange={e => setNewInsurance({ ...newInsurance, name: e.target.value })}
                      placeholder="Ex: Unimed, Amil..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Registro ANS</label>
                    <input type="text" value={newInsurance.ans_code} onChange={e => setNewInsurance({ ...newInsurance, ans_code: e.target.value })}
                      placeholder="Nº ANS da operadora" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome da operadora</label>
                    <input type="text" value={newInsurance.operator_name} onChange={e => setNewInsurance({ ...newInsurance, operator_name: e.target.value })}
                      placeholder="Razão social" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Telefone</label>
                    <input type="text" value={newInsurance.contact_phone} onChange={e => setNewInsurance({ ...newInsurance, contact_phone: e.target.value })}
                      placeholder="(00) 0000-0000" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">E-mail</label>
                    <input type="email" value={newInsurance.contact_email} onChange={e => setNewInsurance({ ...newInsurance, contact_email: e.target.value })}
                      placeholder="contato@operadora.com" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Observações</label>
                    <input type="text" value={newInsurance.notes} onChange={e => setNewInsurance({ ...newInsurance, notes: e.target.value })}
                      placeholder="Tabela TUSS, regras..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowInsuranceForm(false)} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleCreateInsurance} className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90">Salvar Convênio</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Insurance list */}
          <div className="space-y-3">
            {insurancePlans.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Nenhum convênio cadastrado.</p>}
            {insurancePlans.map(plan => (
              <div key={plan.id} className="rounded-[24px] border border-slate-100 bg-white/90 px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                      <Building2 size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[16px] font-semibold text-slate-900">{plan.name}</p>
                        {plan.ans_code && (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">ANS {plan.ans_code}</span>
                        )}
                      </div>
                      {plan.operator_name && <p className="text-[13px] text-slate-500 mt-0.5">{plan.operator_name}</p>}
                      <div className="flex items-center gap-4 mt-2 text-[12px] text-slate-400">
                        {plan.contact_phone && <span className="flex items-center gap-1"><Phone size={11} /> {plan.contact_phone}</span>}
                        {plan.contact_email && <span className="flex items-center gap-1"><Mail size={11} /> {plan.contact_email}</span>}
                        <span className="flex items-center gap-1"><UserRound size={11} /> {plan.patient_count} paciente{Number(plan.patient_count) !== 1 ? 's' : ''}</span>
                      </div>
                      {plan.notes && <p className="text-[12px] text-slate-400 mt-1.5 italic">{plan.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${plan.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                    <button onClick={() => handleDeleteInsurance(plan.id)} className="text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* INADIMPLÊNCIA */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'inadimplencia' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-slate-900">Controle de Inadimplência</h3>
              <p className="text-[13px] text-slate-400">Acompanhe e cobre parcelas em atraso</p>
            </div>
            <div className="flex items-center gap-3">
              {delinquencyRecords.filter(d => d.status === 'OPEN').length > 0 && (
                <div className="rounded-full bg-rose-50 px-4 py-2 text-[13px] font-semibold text-rose-700">
                  {currency(delinquencyRecords.filter(d => d.status === 'OPEN').reduce((s, d) => s + Number(d.amount), 0))} em aberto
                </div>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-[20px] bg-rose-50 border border-rose-100 p-4 text-center">
              <p className="text-[24px] font-bold text-rose-700">{delinquencyRecords.filter(d => d.status === 'OPEN').length}</p>
              <p className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider">Em aberto</p>
            </div>
            <div className="rounded-[20px] bg-amber-50 border border-amber-100 p-4 text-center">
              <p className="text-[24px] font-bold text-amber-700">{delinquencyRecords.filter(d => d.status === 'CONTACTED').length}</p>
              <p className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Contatados</p>
            </div>
            <div className="rounded-[20px] bg-blue-50 border border-blue-100 p-4 text-center">
              <p className="text-[24px] font-bold text-blue-700">{delinquencyRecords.filter(d => d.status === 'NEGOTIATED').length}</p>
              <p className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">Negociados</p>
            </div>
            <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 p-4 text-center">
              <p className="text-[24px] font-bold text-emerald-700">{delinquencyRecords.filter(d => d.status === 'PAID').length}</p>
              <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Resolvidos</p>
            </div>
          </div>

          {/* Delinquency list */}
          <div className="space-y-3">
            {delinquencyRecords.filter(d => d.status !== 'PAID' && d.status !== 'WRITTEN_OFF').length === 0 && (
              <div className="py-10 text-center space-y-2">
                <CheckCircle size={32} className="mx-auto text-emerald-400" />
                <p className="text-slate-500 text-sm font-medium">Nenhuma inadimplência ativa</p>
                <p className="text-slate-400 text-xs">Todos os pagamentos estão em dia</p>
              </div>
            )}
            {delinquencyRecords.filter(d => d.status !== 'PAID' && d.status !== 'WRITTEN_OFF').map(record => (
              <div key={record.id} className="rounded-[24px] border border-slate-100 bg-white/90 px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[16px] font-semibold text-slate-900">{record.patient_name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        record.days_overdue > 60 ? 'bg-rose-100 text-rose-700' :
                        record.days_overdue > 30 ? 'bg-amber-100 text-amber-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {record.days_overdue} dias
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-1.5 text-[13px] text-slate-500">
                      <span className="font-bold">{currency(Number(record.amount))}</span>
                      <span>Vencido em {formatDate(record.due_date)}</span>
                      {record.contact_attempts > 0 && (
                        <span className="text-[12px] text-slate-400">{record.contact_attempts} tentativa{record.contact_attempts !== 1 ? 's' : ''} de contato</span>
                      )}
                    </div>
                    {record.patient_phone && (
                      <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-1"><Phone size={11} /> {record.patient_phone}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {record.status === 'OPEN' && (
                      <>
                        <button onClick={() => handleUpdateDelinquency(record.id, 'CONTACTED', 'WHATSAPP')}
                          className="rounded-full bg-green-50 text-green-700 px-3 py-1.5 text-[12px] font-semibold hover:bg-green-100 transition-colors flex items-center gap-1">
                          <Phone size={12} /> WhatsApp
                        </button>
                        <button onClick={() => handleUpdateDelinquency(record.id, 'CONTACTED', 'PHONE')}
                          className="rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-[12px] font-semibold hover:bg-blue-100 transition-colors flex items-center gap-1">
                          <Phone size={12} /> Ligação
                        </button>
                      </>
                    )}
                    {(record.status === 'OPEN' || record.status === 'CONTACTED') && (
                      <button onClick={() => handleUpdateDelinquency(record.id, 'NEGOTIATED')}
                        className="rounded-full bg-indigo-50 text-indigo-700 px-3 py-1.5 text-[12px] font-semibold hover:bg-indigo-100 transition-colors flex items-center gap-1">
                        <Calculator size={12} /> Negociar
                      </button>
                    )}
                    <button onClick={() => handleUpdateDelinquency(record.id, 'PAID')}
                      className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1.5 text-[12px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1">
                      <CheckCircle size={12} /> Pago
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PIX */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {subTab === 'pix' && (
        <section className="space-y-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-[18px] font-bold text-slate-900">Pagamentos Pix</h3>
              <p className="text-[13px] text-slate-400">Gere cobranças Pix com QR Code e Copia e Cola</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPixConfig(true)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-100 text-slate-700 px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-200 transition-colors"
              >
                <CreditCard size={14} /> Configurar Pix
              </button>
              <button
                onClick={() => setShowPixForm(true)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-4 py-2.5 text-[13px] font-semibold hover:bg-slate-800 transition-colors"
              >
                <Zap size={14} /> Gerar Pix
              </button>
            </div>
          </div>

          {/* Pix config status */}
          {pixConfig && pixConfig.pix_key ? (
            <div className="rounded-[20px] bg-emerald-50 border border-emerald-100 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                <p className="text-[13px] text-emerald-700 font-medium">Chave Pix configurada: <span className="font-bold">{pixConfig.pix_key}</span> ({pixConfig.pix_key_type})</p>
              </div>
              <button onClick={() => setShowPixConfig(true)} className="text-emerald-600 hover:text-emerald-800 text-xs font-semibold">Alterar</button>
            </div>
          ) : (
            <div className="rounded-[20px] bg-amber-50 border border-amber-100 px-5 py-3 flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-600" />
              <p className="text-[13px] text-amber-700 font-medium">Configure sua chave Pix para começar a gerar cobranças.</p>
              <button onClick={() => setShowPixConfig(true)} className="ml-auto rounded-full bg-amber-600 text-white px-3 py-1.5 text-[12px] font-semibold hover:bg-amber-700">Configurar agora</button>
            </div>
          )}

          {/* Pix config form */}
          <AnimatePresence>
            {showPixConfig && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[16px] font-bold text-slate-900">Configuração Pix</h4>
                  <button onClick={() => setShowPixConfig(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Tipo de chave *</label>
                    <select value={pixConfigForm.pix_key_type} onChange={e => setPixConfigForm({ ...pixConfigForm, pix_key_type: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                      <option value="CPF">CPF</option>
                      <option value="CNPJ">CNPJ</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="PHONE">Telefone</option>
                      <option value="RANDOM">Chave aleatória</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Chave Pix *</label>
                    <input type="text" value={pixConfigForm.pix_key} onChange={e => setPixConfigForm({ ...pixConfigForm, pix_key: e.target.value })}
                      placeholder="Sua chave Pix" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Nome do beneficiário</label>
                    <input type="text" value={pixConfigForm.pix_beneficiary_name} onChange={e => setPixConfigForm({ ...pixConfigForm, pix_beneficiary_name: e.target.value })}
                      placeholder="Nome que aparece no QR Code" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPixConfig(false)} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleSavePixConfig} className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90">Salvar Configuração</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pix form */}
          <AnimatePresence>
            {showPixForm && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}
                className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-lg space-y-4"
              >
                <div className="flex justify-between items-center">
                  <h4 className="text-[16px] font-bold text-slate-900">Nova Cobrança Pix</h4>
                  <button onClick={() => setShowPixForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Valor (R$) *</label>
                    <input type="number" step="0.01" value={newPix.amount} onChange={e => setNewPix({ ...newPix, amount: e.target.value })}
                      placeholder="0,00" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm font-bold" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Paciente (opcional)</label>
                    <select value={newPix.patient_id} onChange={e => setNewPix({ ...newPix, patient_id: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm">
                      <option value="">Selecione</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1.5 block">Descrição</label>
                    <input type="text" value={newPix.description} onChange={e => setNewPix({ ...newPix, description: e.target.value })}
                      placeholder="Ex: Consulta, Parcela 3..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 text-sm" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowPixForm(false)} className="flex-1 py-2.5 rounded-full border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50">Cancelar</button>
                  <button onClick={handleCreatePix} className="flex-1 py-2.5 rounded-full bg-primary text-white font-semibold text-sm hover:opacity-90 flex items-center justify-center gap-2">
                    <Zap size={14} /> Gerar Cobrança
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pix payments list */}
          <div className="space-y-4">
            {pixPayments.length === 0 && <p className="text-center text-slate-400 text-sm py-8">Nenhuma cobrança Pix gerada.</p>}
            {pixPayments.map(pix => (
              <div key={pix.id} className="rounded-[24px] border border-slate-100 bg-white/90 px-5 py-5 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        pix.status === 'PAID' ? 'bg-emerald-50 text-emerald-600' : pix.status === 'PENDING' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        <Zap size={14} />
                      </div>
                      <p className="text-[16px] font-bold text-slate-900">{currency(Number(pix.amount))}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        pix.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : pix.status === 'PENDING' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {pix.status === 'PAID' ? 'Pago' : pix.status === 'PENDING' ? 'Aguardando' : pix.status === 'EXPIRED' ? 'Expirado' : 'Cancelado'}
                      </span>
                    </div>
                    <p className="text-[13px] text-slate-500">
                      {pix.patient_name || 'Sem paciente'}{pix.description ? ` · ${pix.description}` : ''}
                    </p>
                    <p className="text-[12px] text-slate-400">
                      {new Date(pix.created_at).toLocaleDateString('pt-BR')} · Expira {new Date(pix.expires_at).toLocaleDateString('pt-BR')}
                    </p>

                    {/* Pix Payload (copy) */}
                    {pix.status === 'PENDING' && pix.qr_code_payload && (
                      <div className="mt-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-200 px-3 py-2 text-[11px] font-mono text-slate-500 truncate select-all">
                            {pix.qr_code_payload}
                          </div>
                          <button
                            onClick={() => copyPixPayload(pix.id, pix.qr_code_payload)}
                            className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-semibold transition-all ${
                              copiedPixId === pix.id
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {copiedPixId === pix.id ? (
                              <span className="flex items-center gap-1"><Check size={12} /> Copiado!</span>
                            ) : (
                              'Copiar Pix'
                            )}
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-400">Envie o código acima para o paciente colar no app do banco</p>
                      </div>
                    )}
                  </div>

                  {pix.status === 'PENDING' && (
                    <div className="shrink-0">
                      <button onClick={() => handleConfirmPix(pix.id)}
                        className="rounded-full bg-emerald-50 text-emerald-700 px-4 py-2 text-[13px] font-semibold hover:bg-emerald-100 transition-colors flex items-center gap-1.5">
                        <CheckCircle size={14} /> Confirmar pagamento
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
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

                {selectedTransaction.type === 'INCOME' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleEmitInvoiceFromTransaction(selectedTransaction);
                      closeTransactionSheet();
                    }}
                    className="w-full rounded-[18px] bg-indigo-50 text-indigo-700 px-4 py-3.5 font-semibold hover:bg-indigo-100 transition-colors inline-flex items-center justify-center gap-2"
                  >
                    <FileCheck size={16} />
                    Emitir Nota Fiscal
                  </button>
                )}

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

    {/* ═══════════════════════════════════════════════════════════════ */}
    {/* MODAL VISUALIZAÇÃO NOTA FISCAL */}
    {/* ═══════════════════════════════════════════════════════════════ */}
    <AnimatePresence>
      {viewingInvoice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewingInvoice(null)}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            id="invoice-print-area"
          >
            <div className="p-8 md:p-12 bg-white text-slate-800">
              {/* Header com ações */}
              <div className="flex justify-between items-start mb-8 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-800">Nota Fiscal</h1>
                    <p className="text-xs text-slate-400">{viewingInvoice.invoice_number}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const printArea = document.getElementById('invoice-print-content');
                      if (!printArea) return;
                      const win = window.open('', '_blank');
                      if (!win) return;
                      win.document.write(`
                        <html><head><title>${viewingInvoice.invoice_number} - Nota Fiscal</title>
                        <style>
                          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
                          .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; }
                          .title { font-size: 28px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; }
                          .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
                          .number { font-size: 14px; color: #64748b; margin-top: 8px; }
                          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                          .status-issued { background: #ecfdf5; color: #047857; }
                          .status-cancelled { background: #fef2f2; color: #dc2626; }
                          .status-pending { background: #fffbeb; color: #d97706; }
                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
                          .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
                          .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
                          .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
                          .amount-block { text-align: center; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 24px 0; }
                          .amount { font-size: 36px; font-weight: 800; color: #1e293b; }
                          .service-block { margin: 24px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
                          .footer { margin-top: 48px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                          @media print { body { padding: 20px; } }
                        </style></head><body>${printArea.innerHTML}</body></html>
                      `);
                      win.document.close();
                      win.focus();
                      setTimeout(() => { win.print(); }, 300);
                    }}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Imprimir NF"
                  >
                    <Printer size={18} />
                  </button>
                  <button
                    onClick={() => {
                      const printArea = document.getElementById('invoice-print-content');
                      if (!printArea) return;
                      const win = window.open('', '_blank');
                      if (!win) return;
                      win.document.write(`
                        <html><head><title>${viewingInvoice.invoice_number} - Nota Fiscal</title>
                        <style>
                          body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1e293b; }
                          .header { text-align: center; margin-bottom: 32px; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; }
                          .title { font-size: 28px; font-weight: 700; letter-spacing: 4px; text-transform: uppercase; }
                          .subtitle { font-size: 12px; color: #94a3b8; margin-top: 4px; }
                          .number { font-size: 14px; color: #64748b; margin-top: 8px; }
                          .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                          .status-issued { background: #ecfdf5; color: #047857; }
                          .status-cancelled { background: #fef2f2; color: #dc2626; }
                          .status-pending { background: #fffbeb; color: #d97706; }
                          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 24px 0; }
                          .info-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; }
                          .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 4px; }
                          .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
                          .amount-block { text-align: center; padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; margin: 24px 0; }
                          .amount { font-size: 36px; font-weight: 800; color: #1e293b; }
                          .service-block { margin: 24px 0; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; }
                          .footer { margin-top: 48px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0; padding-top: 20px; }
                          @media print { body { padding: 20px; } }
                        </style></head><body>${printArea.innerHTML}</body></html>
                      `);
                      win.document.close();
                    }}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    title="Abrir em nova aba"
                  >
                    <Download size={18} />
                  </button>
                  <button
                    onClick={() => setViewingInvoice(null)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Conteúdo imprimível da NF */}
              <div id="invoice-print-content">
                <div className="header" style={{ textAlign: 'center', marginBottom: 32, borderBottom: '2px solid #e2e8f0', paddingBottom: 24 }}>
                  <p className="title" style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' as const }}>
                    Nota Fiscal de Serviços
                  </p>
                  <p className="subtitle" style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                    {profile?.clinic_name || 'OdontoHub'}{profile?.clinic_address ? ` · ${profile.clinic_address}` : ''}
                  </p>
                  <p className="number" style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>
                    {viewingInvoice.invoice_number}
                  </p>
                  <span
                    style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 8,
                      background: (['AUTHORIZED','ISSUED'].includes(viewingInvoice.status)) ? '#ecfdf5' : viewingInvoice.status === 'CANCELLED' ? '#fef2f2' : (['ERROR','REJECTED'].includes(viewingInvoice.status)) ? '#fef2f2' : viewingInvoice.status === 'PROCESSING' ? '#eff6ff' : '#fffbeb',
                      color: (['AUTHORIZED','ISSUED'].includes(viewingInvoice.status)) ? '#047857' : viewingInvoice.status === 'CANCELLED' ? '#dc2626' : (['ERROR','REJECTED'].includes(viewingInvoice.status)) ? '#991b1b' : viewingInvoice.status === 'PROCESSING' ? '#1d4ed8' : '#d97706',
                    }}
                  >
                    {({AUTHORIZED:'Autorizada',ISSUED:'Emitida',CANCELLED:'Cancelada',ERROR:'Erro',REJECTED:'Rejeitada',PROCESSING:'Processando',CANCEL_PROCESSING:'Cancelando',INTERNAL:'Interna',DRAFT:'Rascunho',PENDING:'Pendente'} as Record<string,string>)[viewingInvoice.status] || viewingInvoice.status}
                  </span>
                </div>

                <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, margin: '24px 0' }}>
                  <div className="info-block" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Prestador</p>
                    <p className="info-value" style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{profile?.name || 'Dentista'}</p>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>CRO: {profile?.cro || '—'}</p>
                  </div>
                  <div className="info-block" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Tomador (Paciente)</p>
                    <p className="info-value" style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{viewingInvoice.patient_name || 'Não informado'}</p>
                    {viewingInvoice.patient_cpf && <p style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>CPF: {viewingInvoice.patient_cpf}</p>}
                  </div>
                  <div className="info-block" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Data de Emissão</p>
                    <p className="info-value" style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{viewingInvoice.issued_at ? new Date(viewingInvoice.issued_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div className="info-block" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                    <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 4 }}>Código do Serviço</p>
                    <p className="info-value" style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>{viewingInvoice.service_code || '8630-5/04'}</p>
                    <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>Atividade odontológica</p>
                  </div>
                </div>

                <div className="service-block" style={{ margin: '24px 0', padding: 20, border: '1px solid #e2e8f0', borderRadius: 12 }}>
                  <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>Descrição do Serviço</p>
                  <p style={{ fontSize: 16, fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>{viewingInvoice.description}</p>
                </div>

                <div className="amount-block" style={{ textAlign: 'center', padding: 24, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, margin: '24px 0' }}>
                  <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#94a3b8', fontWeight: 700, marginBottom: 8 }}>Valor Total</p>
                  <p className="amount" style={{ fontSize: 36, fontWeight: 800, color: '#1e293b' }}>{currency(Number(viewingInvoice.amount))}</p>
                  {(viewingInvoice.valor_iss != null && viewingInvoice.valor_iss > 0) && (
                    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 24 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>ISS: {currency(viewingInvoice.valor_iss)} ({viewingInvoice.aliquota_iss}%)</span>
                      {viewingInvoice.valor_liquido != null && <span style={{ fontSize: 12, color: '#64748b' }}>Líquido: {currency(viewingInvoice.valor_liquido)}</span>}
                    </div>
                  )}
                </div>

                {/* NFS-e Details */}
                {viewingInvoice.nfse_numero && (
                  <div style={{ margin: '24px 0', padding: 20, border: '2px solid #a7f3d0', borderRadius: 12, background: '#ecfdf5' }}>
                    <p className="info-label" style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#047857', fontWeight: 700, marginBottom: 12 }}>Dados NFS-e Autorizada</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <p style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Nº NFS-e</p>
                        <p style={{ fontSize: 18, fontWeight: 800, color: '#047857' }}>{viewingInvoice.nfse_numero}</p>
                      </div>
                      {viewingInvoice.nfse_codigo_verificacao && (
                        <div>
                          <p style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Cód. Verificação</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#047857', fontFamily: 'monospace' }}>{viewingInvoice.nfse_codigo_verificacao}</p>
                        </div>
                      )}
                      {viewingInvoice.rps_numero && (
                        <div>
                          <p style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>RPS</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#047857' }}>{viewingInvoice.rps_numero}{viewingInvoice.rps_serie ? `/${viewingInvoice.rps_serie}` : ''}</p>
                        </div>
                      )}
                      {viewingInvoice.nfse_protocolo && (
                        <div>
                          <p style={{ fontSize: 10, color: '#6ee7b7', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Protocolo</p>
                          <p style={{ fontSize: 14, fontWeight: 600, color: '#047857', fontFamily: 'monospace' }}>{viewingInvoice.nfse_protocolo}</p>
                        </div>
                      )}
                    </div>
                    {viewingInvoice.nfse_link_visualizacao && (
                      <div style={{ marginTop: 12 }}>
                        <a href={viewingInvoice.nfse_link_visualizacao} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: 13, fontWeight: 600, color: '#047857', textDecoration: 'underline' }}>
                          Verificar no portal da prefeitura →
                        </a>
                      </div>
                    )}
                  </div>
                )}

                {/* Error info */}
                {(viewingInvoice.status === 'ERROR' || viewingInvoice.status === 'REJECTED') && viewingInvoice.error_message && (
                  <div style={{ margin: '24px 0', padding: 16, border: '1px solid #fecaca', borderRadius: 12, background: '#fef2f2' }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 1.5, color: '#dc2626', fontWeight: 700, marginBottom: 4 }}>
                      {viewingInvoice.status === 'REJECTED' ? 'Rejeitada pela Prefeitura' : 'Erro na Emissão'}
                    </p>
                    <p style={{ fontSize: 13, color: '#991b1b' }}>{viewingInvoice.error_message}</p>
                  </div>
                )}

                <div className="footer" style={{ marginTop: 48, textAlign: 'center', color: '#94a3b8', fontSize: 12, borderTop: '1px solid #e2e8f0', paddingTop: 20 }}>
                  <p>{profile?.clinic_name || 'OdontoHub'}</p>
                  {profile?.clinic_address && <p>{profile.clinic_address}</p>}
                  <p style={{ marginTop: 8, fontSize: 10 }}>Documento gerado pelo sistema OdontoHub · {viewingInvoice.invoice_number}</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </>
  );
}