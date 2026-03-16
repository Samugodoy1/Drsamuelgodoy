import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  Plus, 
  Search, 
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Settings,
  Image as ImageIcon,
  Bell,
  Lock,
  Mail,
  Trash2,
  Printer,
  Upload,
  FileText,
  UserPlus,
  UserCircle,
  Menu,
  CheckCircle,
  AlertTriangle,
  Camera,
  UserCog,
  Sun,
  Moon,
  Download,
  X,
  List
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Odontogram } from './components/Odontogram';
import { Documents } from './components/Documents';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import { formatDate, isOverdue } from './utils/dateUtils';

// Types
interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birth_date?: string;
  address?: string;
  photo_url?: string;
  anamnesis?: {
    medical_history: string;
    allergies: string;
    medications: string;
  };
  evolution?: Array<{
    id: number;
    date: string;
    notes: string;
    procedure_performed: string;
  }>;
  files?: Array<{
    id: number;
    file_url: string;
    file_type: string;
    description: string;
    created_at: string;
  }>;
  odontogram?: Record<number, { status: string; notes: string }>;
  toothHistory?: Array<{
    id: number;
    tooth_number: number;
    procedure: string;
    notes: string;
    date: string;
    dentist_name?: string;
  }>;
  financial?: {
    transactions: Transaction[];
    paymentPlans: PaymentPlan[];
    installments: Installment[];
  };
  created_at?: string;
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
}

interface Dentist {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  cro?: string;
  specialty?: string;
  bio?: string;
  photo_url?: string;
  clinic_name?: string;
  clinic_address?: string;
  accepted_terms?: boolean;
  accepted_terms_at?: string;
  accepted_privacy_policy?: boolean;
}

interface Appointment {
  id: number;
  patient_id: number;
  patient_name: string;
  patient_phone: string;
  dentist_id: number;
  dentist_name: string;
  start_time: string;
  end_time: string;
  status: 'SCHEDULED' | 'CONFIRMED' | 'CANCELLED' | 'IN_PROGRESS' | 'FINISHED';
  notes?: string;
}

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

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'pacientes' | 'financeiro' | 'documentos' | 'prontuario' | 'configuracoes' | 'admin'>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportType, setExportType] = useState<'patients' | 'finance'>('patients');
  const [exportFilters, setExportFilters] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString('en-CA'),
    endDate: new Date().toLocaleDateString('en-CA'),
    patientId: 'all',
    category: 'all',
  });

  const exportPatients = () => {
    let filteredP = patients;
    if (exportFilters.patientId !== 'all') {
      filteredP = filteredP.filter(p => p.id.toString() === exportFilters.patientId);
    }
    if (exportFilters.startDate) {
      filteredP = filteredP.filter(p => p.created_at && p.created_at.split('T')[0] >= exportFilters.startDate);
    }
    if (exportFilters.endDate) {
      filteredP = filteredP.filter(p => p.created_at && p.created_at.split('T')[0] <= exportFilters.endDate);
    }

    const data = filteredP.map(p => ({
      'ID': p.id,
      'Nome Completo': p.name,
      'Telefone': p.phone,
      'Email': p.email,
      'Data de Nascimento': p.birth_date ? formatDate(p.birth_date) : '',
      'CPF': p.cpf || '',
      'Endereço': p.address || '',
      'Observações': p.anamnesis?.medical_history || '',
      'Data de Cadastro': p.created_at ? formatDate(p.created_at) : '',
      'Dentista Responsável': profile?.name || user?.name
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pacientes");
    XLSX.writeFile(wb, `Pacientes_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    setIsExportModalOpen(false);
  };

  const exportFinance = () => {
    let filteredT = transactions;
    if (exportFilters.startDate) {
      filteredT = filteredT.filter(t => t.date >= exportFilters.startDate);
    }
    if (exportFilters.endDate) {
      filteredT = filteredT.filter(t => t.date <= exportFilters.endDate);
    }
    if (exportFilters.patientId !== 'all') {
      filteredT = filteredT.filter(t => t.patient_id?.toString() === exportFilters.patientId);
    }
    if (exportFilters.category === 'income') {
      filteredT = filteredT.filter(t => t.type === 'INCOME');
    } else if (exportFilters.category === 'expense') {
      filteredT = filteredT.filter(t => t.type === 'EXPENSE');
    }

    const transactionData = filteredT.map(t => ({
      'Data': formatDate(t.date),
      'Paciente': t.patient_name || 'N/A',
      'Procedimento': t.procedure || t.description,
      'Categoria': t.type === 'INCOME' ? 'Receita' : 'Despesa',
      'Valor': t.amount,
      'Forma de Pagamento': t.payment_method,
      'Status': 'Pago',
      'Dentista Responsável': profile?.name || user?.name,
      'Observações': t.notes || '',
      'Valor Total do Tratamento': '',
      'Número de Parcelas': '',
      'Número da Parcela': '',
      'Valor da Parcela': '',
      'Data de Vencimento': '',
      'Status da Parcela': '',
      'Data de Pagamento': ''
    }));

    const installmentData = installments.filter(inst => {
      if (exportFilters.startDate && inst.due_date < exportFilters.startDate) return false;
      if (exportFilters.endDate && inst.due_date > exportFilters.endDate) return false;
      if (exportFilters.patientId !== 'all' && inst.patient_id?.toString() !== exportFilters.patientId) return false;
      if (exportFilters.category === 'expense') return false; // Installments are income
      return true;
    }).map(inst => {
      const plan = paymentPlans.find(p => p.id === inst.payment_plan_id);
      const patient = patients.find(p => p.id === inst.patient_id);
      return {
        'Data': formatDate(inst.due_date),
        'Paciente': patient?.name || 'N/A',
        'Procedimento': inst.procedure || plan?.procedure || 'Parcelamento',
        'Categoria': 'Receita (Parcela)',
        'Valor': inst.amount,
        'Forma de Pagamento': inst.status === 'PAID' ? 'N/A' : 'Pendente',
        'Status': inst.status === 'PAID' ? 'Pago' : (isOverdue(inst.due_date) ? 'Atrasado' : 'Pendente'),
        'Dentista Responsável': profile?.name || user?.name,
        'Observações': `Parcela ${inst.number}/${plan?.installments_count || '?'}`,
        'Valor Total do Tratamento': plan?.total_amount || 0,
        'Número de Parcelas': plan?.installments_count || 0,
        'Número da Parcela': inst.number,
        'Valor da Parcela': inst.amount,
        'Data de Vencimento': formatDate(inst.due_date),
        'Status da Parcela': inst.status,
        'Data de Pagamento': inst.payment_date ? formatDate(inst.payment_date) : ''
      };
    });

    const combinedData = [...transactionData, ...installmentData];

    const ws = XLSX.utils.json_to_sheet(combinedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Financeiro");
    XLSX.writeFile(wb, `Financeiro_${new Date().toLocaleDateString('en-CA')}.xlsx`);
    setIsExportModalOpen(false);
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentPlans, setPaymentPlans] = useState<PaymentPlan[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [financialSummary, setFinancialSummary] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '', rememberMe: false });
  const [registerData, setRegisterData] = useState({ 
    name: '', 
    email: '', 
    password: '',
    acceptedTerms: false,
    acceptedPrivacyPolicy: false,
    acceptedResponsibility: false
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientTab, setSelectedPatientTab] = useState<'evolucao' | 'imagens' | 'financeiro'>('evolucao');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isDentistModalOpen, setIsDentistModalOpen] = useState(false);
  const [isEditDentistModalOpen, setIsEditDentistModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<any>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dentistSearchTerm, setDentistSearchTerm] = useState('');
  const [dentistStatusFilter, setDentistStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaViewMode, setAgendaViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedWeekDay, setSelectedWeekDay] = useState<number>(new Date().getDay());
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [statusFilter, setStatusFilter] = useState<string[]>(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);
  const [agendaSearchTerm, setAgendaSearchTerm] = useState('');
  const [isEvolutionFormOpen, setIsEvolutionFormOpen] = useState(false);
  const [newEvolution, setNewEvolution] = useState({ notes: '', procedure: '' });
  const [newDentist, setNewDentist] = useState({ name: '', email: '', password: '' });
  const [newImage, setNewImage] = useState<{ url: string, description: string, file: File | null }>({ url: '', description: '', file: null });
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    dentist_id: '',
    start_time: '',
    end_time: '',
    notes: ''
  });

  const [newPaymentPlan, setNewPaymentPlan] = useState({
    patient_id: '',
    procedure: '',
    total_amount: '',
    installments_count: '1',
    first_due_date: new Date().toLocaleDateString('en-CA')
  });

  const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = useState(false);
  const [isReceiveInstallmentModalOpen, setIsReceiveInstallmentModalOpen] = useState(false);
  const [isViewInstallmentsModalOpen, setIsViewInstallmentsModalOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    email: '',
    address: ''
  });

  // Finance States
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [newTransaction, setNewTransaction] = useState({
    description: '',
    category: 'Outros',
    amount: '',
    payment_method: 'PIX',
    date: new Date().toLocaleDateString('en-CA'),
    status: 'PAID',
    patient_id: '',
    procedure: '',
    notes: ''
  });
  const [financeFilter, setFinanceFilter] = useState({
    period: 'month', // 'day', 'week', 'month', 'all'
    type: 'all', // 'all', 'INCOME', 'EXPENSE'
    category: 'all'
  });
  const [financeSubTab, setFinanceSubTab] = useState<'transacoes' | 'parcelamentos'>('transacoes');

  const [profile, setProfile] = useState<Dentist | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profilePassword, setProfilePassword] = useState('');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmation, setConfirmation] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.role === 'DENTIST') {
          // No filter needed
        }
      } catch (e) {
        console.error('Error parsing saved user:', e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchProfile();
      if (user.role?.toUpperCase() === 'ADMIN') {
        fetchAdminUsers();
      }
      // Update schema once
      apiFetch('/api/admin/update-schema').catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (selectedPatientTab === 'financeiro' && selectedPatient) {
      fetchPatientFinancialHistory(selectedPatient.id);
    }
  }, [selectedPatientTab, selectedPatient?.id]);

  useEffect(() => {
    if ((activeTab === 'configuracoes' || activeTab === 'documentos') && user) {
      fetchProfile();
    }
  }, [activeTab, user]);

  const fetchProfile = async () => {
    try {
      const res = await apiFetch('/api/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSavingProfile(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'POST',
        body: JSON.stringify({ ...profile, password: profilePassword })
      });
      if (res.ok) {
        showNotification('Perfil atualizado com sucesso!');
        setProfilePassword('');
        fetchProfile();
      } else {
        const data = await res.json();
        showNotification(data.error || 'Erro ao atualizar perfil', 'error');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      showNotification('Erro de conexão ao salvar perfil', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch('/api/profile/photo', {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(prev => prev ? { ...prev, photo_url: data.url } : null);
        showNotification('Foto de perfil atualizada!');
      } else {
        showNotification('Erro ao carregar foto de perfil.', 'error');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      showNotification('Erro ao carregar foto de perfil.', 'error');
    }
  };

  const handlePatientPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPatient) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/photo`, {
        method: 'POST',
        body: formData
      });

      if (res.ok) {
        // Refresh patient data
        openPatientRecord(selectedPatient.id);
        fetchData(); // Refresh list
        showNotification('Foto do paciente atualizada!');
      } else {
        showNotification('Erro ao carregar foto do paciente.', 'error');
      }
    } catch (error) {
      console.error('Error uploading patient photo:', error);
      showNotification('Erro ao carregar foto do paciente.', 'error');
    }
  };

  const fetchData = async (explicitToken?: string) => {
    if (!user && !explicitToken) return;
    try {
      const [pRes, aRes, fRes, sRes, plRes, iRes] = await Promise.all([
        apiFetch('/api/patients', { explicitToken }),
        apiFetch('/api/appointments', { explicitToken }),
        apiFetch('/api/finance', { explicitToken }),
        apiFetch('/api/finance/summary', { explicitToken }),
        apiFetch('/api/finance/payment-plans', { explicitToken }),
        apiFetch('/api/finance/installments', { explicitToken })
      ]);
      
      const pData = await pRes.json();
      const aData = await aRes.json();
      const fData = await fRes.json();
      const sData = await sRes.json();
      const plData = await plRes.json();
      const iData = await iRes.json();
      
      if (Array.isArray(pData)) setPatients(pData);
      if (Array.isArray(aData)) setAppointments(aData);
      if (Array.isArray(fData)) setTransactions(fData);
      if (sData && !sData.error) setFinancialSummary(sData);
      if (Array.isArray(plData)) setPaymentPlans(plData);
      if (Array.isArray(iData)) setInstallments(iData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePaymentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const patientId = selectedPatient ? selectedPatient.id : newPaymentPlan.patient_id;
      if (!patientId) {
        alert('Selecione um paciente');
        return;
      }

      const res = await apiFetch('/api/finance/payment-plans', {
        method: 'POST',
        body: JSON.stringify({
          ...newPaymentPlan,
          patient_id: patientId,
          total_amount: parseFloat(newPaymentPlan.total_amount),
          installments_count: parseInt(newPaymentPlan.installments_count)
        })
      });
      if (res.ok) {
        setIsPaymentPlanModalOpen(false);
        setNewPaymentPlan({
          patient_id: '',
          procedure: '',
          total_amount: '',
          installments_count: '1',
          first_due_date: new Date().toLocaleDateString('en-CA')
        });
        fetchData();
        if (selectedPatient) {
          fetchPatientFinancialHistory(selectedPatient.id);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao criar plano de pagamento');
      }
    } catch (error) {
      console.error('Error creating payment plan:', error);
    }
  };

  const handlePayInstallment = async (id: number, method: string) => {
    try {
      const res = await apiFetch(`/api/finance/installments/${id}/pay`, {
        method: 'PATCH',
        body: JSON.stringify({
          payment_method: method,
          payment_date: new Date().toLocaleDateString('en-CA')
        })
      });
      if (res.ok) {
        const data = await res.json();
        setIsReceiveInstallmentModalOpen(false);
        setIsViewInstallmentsModalOpen(false);
        fetchData();
        if (selectedPatient) {
          fetchPatientFinancialHistory(selectedPatient.id);
        }
        // Automatically show receipt
        if (data.transaction) {
          generateReceipt(data.transaction);
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao registrar pagamento');
      }
    } catch (error) {
      console.error('Error paying installment:', error);
    }
  };

  const fetchPatientFinancialHistory = async (patientId: number) => {
    try {
      const res = await apiFetch(`/api/patients/${patientId}/financial`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPatient(prev => prev ? { ...prev, financial: data } : null);
      }
    } catch (error) {
      console.error('Error fetching patient financial history:', error);
    }
  };

  const generateReceipt = (transaction: any) => {
    const dentist = adminUsers.find(u => u.id === transaction.dentist_id) || profile;
    setSelectedReceipt({
      id: transaction.id,
      patientName: transaction.patient_name || transaction.patientName || (transaction.patient && transaction.patient.name) || 'Paciente não identificado',
      amount: transaction.amount,
      amountFormatted: Number(transaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      procedure: transaction.procedure || transaction.description,
      date: formatDate(transaction.date),
      paymentMethod: transaction.payment_method,
      dentistName: dentist?.name || user?.name,
      dentistCro: dentist?.cro || profile?.cro,
      clinicName: profile?.clinic_name || 'OdontoHub',
      clinicAddress: profile?.clinic_address || ''
    });
    setIsReceiptModalOpen(true);
  };

  const imprimirDocumento = (tipo: string, id: string | number | null = null) => {
    let url = `/print/${tipo}`;
    if (id) {
      url += `/${id}`;
    }
    
    // Special case for agenda date if not provided as ID
    if (tipo === 'agenda' && !id) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      url += `?date=${dateStr}`;
    }
    
    window.open(url, "_blank");
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/finance', {
        method: 'POST',
        body: JSON.stringify({
          ...newTransaction,
          type: transactionType,
          amount: parseFloat(newTransaction.amount),
          patient_id: newTransaction.patient_id ? parseInt(newTransaction.patient_id) : null
        })
      });
      if (res.ok) {
        setIsTransactionModalOpen(false);
        setNewTransaction({
          description: '',
          category: 'Outros',
          amount: '',
          payment_method: 'PIX',
          date: new Date().toLocaleDateString('en-CA'),
          status: 'PAID',
          patient_id: '',
          procedure: '',
          notes: ''
        });
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar transação');
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert('Erro de conexão ao salvar transação');
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    setConfirmation({
      message: 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/finance/${id}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchData();
            showNotification('Transação excluída com sucesso!');
          }
        } catch (error) {
          console.error('Error deleting transaction:', error);
          showNotification('Erro ao excluir transação', 'error');
        }
      }
    });
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await apiFetch('/api/admin/users');
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Error fetching admin users (${res.status}):`, errorText);
        return;
      }
      const data = await res.json();
      setAdminUsers(data);
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    try {
      const res = await apiFetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchAdminUsers();
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        fetchData(data.token);
        if (data.user.role === 'DENTIST') {
          // No filter needed
        }
      } else {
        setLoginError(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRegisterMessage('');

    if (!registerData.acceptedTerms || !registerData.acceptedPrivacyPolicy || !registerData.acceptedResponsibility) {
      setLoginError('Você deve aceitar todos os termos e declarações para continuar.');
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerData)
      });
      const data = await res.json();
      if (res.ok) {
        setRegisterMessage(data.message);
        setIsRegistering(false);
      } else {
        setLoginError(data.error || 'Erro ao fazer cadastro');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setActiveTab('dashboard');
    setLoading(true);
  };

  const filteredTransactions = transactions.filter(t => {
    if (financeFilter.type !== 'all' && t.type !== financeFilter.type) return false;
    if (financeFilter.category !== 'all' && t.category !== financeFilter.category) return false;
    
    const tDateStr = t.date?.split('T')[0];
    const nowLocalStr = new Date().toLocaleDateString('en-CA');
    
    if (financeFilter.period === 'day') {
      return tDateStr === nowLocalStr;
    } else if (financeFilter.period === 'week') {
      const tDate = new Date(tDateStr + 'T12:00:00'); // Use mid-day local to avoid shifts
      const now = new Date();
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return tDate >= weekAgo;
    } else if (financeFilter.period === 'month') {
      const [year, month] = tDateStr.split('-');
      const now = new Date();
      return parseInt(month) === (now.getMonth() + 1) && parseInt(year) === now.getFullYear();
    }
    return true;
  });

  const currentTotalIncome = filteredTransactions
    .filter(t => t.type === 'INCOME')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentTotalExpense = filteredTransactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const currentNetProfit = currentTotalIncome - currentTotalExpense;
  const currentProfitMargin = currentTotalIncome > 0 ? (currentNetProfit / currentTotalIncome) * 100 : 0;

  // Dashboard Stats Calculations
  const dashboardNow = new Date();
  const dashboardMonth = dashboardNow.getMonth();
  const dashboardYear = dashboardNow.getFullYear();

  const monthlyRevenue = transactions
    .filter(t => {
      const tDateStr = t.date?.split('T')[0];
      if (!tDateStr) return false;
      const [year, month] = tDateStr.split('-');
      return t.type === 'INCOME' && parseInt(month) === (dashboardMonth + 1) && parseInt(year) === dashboardYear;
    })
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const prevMonthDate = new Date(dashboardYear, dashboardMonth - 1, 1);
  const prevMonth = prevMonthDate.getMonth();
  const prevMonthYear = prevMonthDate.getFullYear();

  const prevMonthlyRevenue = transactions
    .filter(t => {
      const tDateStr = t.date?.split('T')[0];
      if (!tDateStr) return false;
      const [year, month] = tDateStr.split('-');
      return t.type === 'INCOME' && parseInt(month) === (prevMonth + 1) && parseInt(year) === prevMonthYear;
    })
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const revenueVariation = prevMonthlyRevenue > 0 
    ? ((monthlyRevenue - prevMonthlyRevenue) / prevMonthlyRevenue) * 100 
    : 0;

  const startOfWeek = new Date(dashboardNow);
  startOfWeek.setDate(dashboardNow.getDate() - dashboardNow.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weeklyAppointmentsCount = appointments.filter(a => {
    const d = new Date(a.start_time);
    return d >= startOfWeek && d <= endOfWeek;
  }).length;

  const todayStr = new Date().toLocaleDateString('en-CA');
  const dailyRevenue = financialSummary?.todayRevenue !== undefined 
    ? financialSummary.todayRevenue 
    : transactions
        .filter(t => {
          const tDate = t.date?.split('T')[0];
          return t.type === 'INCOME' && tDate === todayStr;
        })
        .reduce((acc, t) => acc + Number(t.amount), 0);

  const nextAppointments = appointments
    .filter(a => new Date(a.start_time) >= dashboardNow)
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const todayAppointmentsCount = appointments.filter(a => new Date(a.start_time).toDateString() === dashboardNow.toDateString()).length;

  const apiFetch = async (url: string, options: any = {}) => {
    const token = options.explicitToken || localStorage.getItem('token');
    const headers: any = {
      'Accept': 'application/json',
      ...options.headers,
    };
    
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (token && token !== 'null' && token !== 'undefined') {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
    }
    
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      try {
        const errorData = await response.json();
        console.warn('Auth error details:', errorData);
      } catch (e) {
        // Not JSON
      }
      handleLogout();
    }
    return response;
  };

  const openAppointmentModal = () => {
    if (user) {
      setNewAppointment(prev => ({ ...prev, dentist_id: user.id.toString() }));
    }
    setIsModalOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppointment.patient_id || !newAppointment.dentist_id || !newAppointment.start_time || !newAppointment.end_time) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }
    try {
      const body = {
        ...newAppointment,
        start_time: new Date(newAppointment.start_time).toISOString(),
        end_time: new Date(newAppointment.end_time).toISOString()
      };
      
      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewAppointment({ patient_id: '', dentist_id: '', start_time: '', end_time: '', notes: '' });
        showNotification('Agendamento realizado com sucesso!');
      } else {
        showNotification(data.error || 'Erro ao realizar agendamento', 'error');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      showNotification('Erro de conexão ao realizar agendamento', 'error');
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const res = await apiFetch('/api/patients', {
        method: 'POST',
        body: JSON.stringify(newPatient)
      });
      if (res.ok) {
        setIsPatientModalOpen(false);
        fetchData();
        setNewPatient({ name: '', cpf: '', birth_date: '', phone: '', email: '', address: '' });
        showNotification('Paciente cadastrado com sucesso!');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Erro ao cadastrar paciente', 'error');
      }
    } catch (error) {
      console.error('Error creating patient:', error);
      showNotification('Erro de conexão ao cadastrar paciente', 'error');
    }
  };

  const handleCreateDentist = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch('/api/dentists', {
        method: 'POST',
        body: JSON.stringify(newDentist)
      });
      if (res.ok) {
        setIsDentistModalOpen(false);
        fetchAdminUsers();
        setNewDentist({ name: '', email: '', password: '' });
        alert('Dentista cadastrado com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao cadastrar dentista');
      }
    } catch (error) {
      console.error('Error creating dentist:', error);
      alert('Erro de conexão ao cadastrar dentista');
    }
  };

  const handleUpdateDentist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDentist) return;
    try {
      const res = await apiFetch(`/api/admin/users/${editingDentist.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editingDentist.name, email: editingDentist.email })
      });
      if (res.ok) {
        setIsEditDentistModalOpen(false);
        fetchAdminUsers();
        alert('Dentista atualizado com sucesso!');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar dentista');
      }
    } catch (error) {
      console.error('Error updating dentist:', error);
      alert('Erro de conexão ao atualizar dentista');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewImage({ ...newImage, url: reader.result as string, file: file });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !newImage.file) return;
    try {
      await uploadFile(selectedPatient.id, newImage.file, newImage.description);
      setIsImageModalOpen(false);
      setNewImage({ url: '', description: '', file: null });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const updateStatus = async (id: number, status: Appointment['status']) => {
    try {
      const res = await apiFetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        if (status === 'FINISHED') {
          const app = appointments.find(a => a.id === id);
          if (app) {
            setTransactionType('INCOME');
            setNewTransaction({
              description: `Atendimento - ${app.patient_name}`,
              category: 'Procedimentos',
              amount: '',
              payment_method: 'PIX',
              date: new Date().toLocaleDateString('en-CA'),
              status: 'PAID',
              patient_id: app.patient_id.toString(),
              procedure: '',
              notes: `Referente ao agendamento #${app.id}`
            });
            setIsTransactionModalOpen(true);
            setActiveTab('financeiro');
          }
        }
        fetchData();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openPatientRecord = async (id: number) => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/patients/${id}`);
      const data = await res.json();
      setSelectedPatient(data);
      setActiveTab('prontuario');
    } catch (error) {
      console.error('Error fetching patient record:', error);
    }
  };

  const saveAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/anamnesis`, {
        method: 'PUT',
        body: JSON.stringify(selectedPatient.anamnesis)
      });
      if (res.ok) alert('Anamnese salva com sucesso!');
    } catch (error) {
      console.error('Error saving anamnesis:', error);
    }
  };

  const saveOdontogram = async (toothNumber: number, toothData: any) => {
    if (!selectedPatient) return;
    const updatedOdontogram = {
      ...(selectedPatient.odontogram || {}),
      [toothNumber]: toothData
    };
    
    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/odontogram`, {
        method: 'POST',
        body: JSON.stringify({ data: updatedOdontogram })
      });
      if (res.ok) {
        setSelectedPatient({ ...selectedPatient, odontogram: updatedOdontogram });
      }
    } catch (error) {
      console.error('Error saving odontogram:', error);
    }
  };

  const addToothHistory = async (record: any) => {
    if (!selectedPatient) return;
    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/tooth-history`, {
        method: 'POST',
        body: JSON.stringify(record)
      });
      if (res.ok) {
        // Refresh patient data to show new history
        openPatientRecord(selectedPatient.id);
      }
    } catch (error) {
      console.error('Error adding tooth history:', error);
      throw error;
    }
  };

  const addEvolution = async (notes: string, procedure: string) => {
    if (!selectedPatient || !user) return;
    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/evolution`, {
        method: 'POST',
        body: JSON.stringify({ notes, procedure_performed: procedure })
      });
      if (res.ok) openPatientRecord(selectedPatient.id);
    } catch (error) {
      console.error('Error adding evolution:', error);
    }
  };

  const sendReminder = async (app: Appointment) => {
    if (!app.patient_phone) {
      alert('Este paciente não possui telefone cadastrado.');
      return;
    }

    // Formata a mensagem de WhatsApp conforme solicitado
    const date = new Date(app.start_time).toLocaleDateString('pt-BR');
    const time = new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const message = `Olá ${app.patient_name}, este é um lembrete da sua consulta dia ${date} às ${time} com ${app.dentist_name}.`;
    
    // Limpa o número de telefone (apenas números)
    let phone = app.patient_phone.replace(/\D/g, '');
    
    // Garante o formato internacional (55 + DDD + número)
    if (phone.length === 10 || phone.length === 11) {
      phone = '55' + phone;
    } else if (phone.length > 11 && !phone.startsWith('55')) {
      // Se tiver mais de 11 dígitos e não começar com 55, assume que falta o DDI
      phone = '55' + phone;
    }
    
    // Abre o WhatsApp usando wa.me (melhor compatibilidade mobile/desktop)
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    
    // No mobile, window.open pode ser bloqueado se houver um await antes.
    // Abrimos primeiro e depois fazemos a chamada de log no backend.
    window.open(url, '_blank');

    try {
      // Chama o backend para registrar o lembrete enviado
      await apiFetch(`/api/appointments/${app.id}/remind`, { method: 'POST' });
    } catch (error) {
      console.error('Error sending reminder log:', error);
    }
  };

  const uploadFile = async (patientId: number, file: File, description: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('file_type', 'image');

    try {
      const res = await apiFetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        body: formData
      });
      if (res.ok) openPatientRecord(patientId);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!selectedPatient) return;
    setConfirmation({
      message: 'Tem certeza que deseja excluir este arquivo? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          const res = await apiFetch(`/api/files/${fileId}`, { method: 'DELETE' });
          if (res.ok) {
            openPatientRecord(selectedPatient.id);
            showNotification('Arquivo excluído com sucesso!');
          }
        } catch (error) {
          console.error('Error deleting file:', error);
          showNotification('Erro ao excluir arquivo', 'error');
        }
      }
    });
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) => (
    <button
      onClick={() => {
        setActiveTab(id);
        setIsSidebarOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        activeTab === id 
          ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} className="shrink-0" />
      <span className="font-medium tablet-l:hidden desktop:block whitespace-nowrap">{label}</span>
    </button>
  );

  const StatusBadge = ({ status }: { status: Appointment['status'] }) => {
    const styles = {
      SCHEDULED: 'bg-blue-100 text-blue-700',
      CONFIRMED: 'bg-emerald-100 text-emerald-700',
      CANCELLED: 'bg-rose-100 text-rose-700',
      IN_PROGRESS: 'bg-amber-100 text-amber-700',
      FINISHED: 'bg-slate-100 text-slate-700',
    };
    const labels = {
      SCHEDULED: 'Agendado',
      CONFIRMED: 'Confirmado',
      CANCELLED: 'Cancelado',
      IN_PROGRESS: 'Em Atendimento',
      FINISHED: 'Finalizado',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/print/:tipo/:id?" element={
        <PrintDocument 
          profile={profile} 
          patients={patients} 
          apiFetch={apiFetch} 
          appointments={appointments} 
          transactions={transactions} 
          installments={installments} 
          paymentPlans={paymentPlans} 
        />
      } />
      <Route path="*" element={
        !user ? (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
                    <Plus size={32} strokeWidth={3} />
                  </div>
                </div>
                <div className="text-center mb-10">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">OdontoHub</h1>
                  <p className="text-slate-500">Acesse sua conta para gerenciar sua clínica</p>
                </div>

                <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-6">
                  {isRegistering && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Completo</label>
                      <div className="relative">
                        <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                          type="text" 
                          required
                          placeholder="Dr. João Silva"
                          value={registerData.name}
                          onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="email" 
                        required
                        placeholder="exemplo@clinica.com"
                        value={isRegistering ? registerData.email : loginData.email}
                        onChange={(e) => isRegistering 
                          ? setRegisterData({...registerData, email: e.target.value})
                          : setLoginData({...loginData, email: e.target.value})
                        }
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="password" 
                        required
                        placeholder="••••••••"
                        value={isRegistering ? registerData.password : loginData.password}
                        onChange={(e) => isRegistering
                          ? setRegisterData({...registerData, password: e.target.value})
                          : setLoginData({...loginData, password: e.target.value})
                        }
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                  </div>

                  {!isRegistering && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input 
                          id="remember-me"
                          type="checkbox" 
                          checked={loginData.rememberMe}
                          onChange={(e) => setLoginData({...loginData, rememberMe: e.target.checked})}
                          className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium cursor-pointer">
                          Lembrar de mim
                        </label>
                      </div>
                      <Link to="/forgot-password" title="Recuperar senha" className="text-sm text-emerald-600 font-bold hover:underline">
                        Esqueci minha senha
                      </Link>
                    </div>
                  )}

                  {loginError && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm">
                      <AlertCircle size={18} />
                      {loginError}
                    </div>
                  )}

                  {registerMessage && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm">
                      <CheckCircle2 size={18} />
                      {registerMessage}
                    </div>
                  )}

                  {isRegistering && (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <input 
                          id="accepted-terms"
                          type="checkbox" 
                          required
                          checked={registerData.acceptedTerms && registerData.acceptedPrivacyPolicy}
                          onChange={(e) => setRegisterData({
                            ...registerData, 
                            acceptedTerms: e.target.checked,
                            acceptedPrivacyPolicy: e.target.checked
                          })}
                          className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="accepted-terms" className="text-sm text-slate-600 leading-tight">
                          Li e concordo com os <Link to="/termos" target="_blank" className="text-emerald-600 font-bold hover:underline">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="text-emerald-600 font-bold hover:underline">Política de Privacidade</Link>.
                        </label>
                      </div>

                      <div className="flex items-start gap-3">
                        <input 
                          id="accepted-responsibility"
                          type="checkbox" 
                          required
                          checked={registerData.acceptedResponsibility}
                          onChange={(e) => setRegisterData({...registerData, acceptedResponsibility: e.target.checked})}
                          className="mt-1 w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                        />
                        <label htmlFor="accepted-responsibility" className="text-sm text-slate-600 leading-tight">
                          Declaro que sou responsável legal pelos dados dos pacientes cadastrados na plataforma.
                        </label>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
                  </button>
                </form>

                <div className="mt-8 text-center space-y-4">
                  <button 
                    onClick={() => {
                      setIsRegistering(!isRegistering);
                      setLoginError('');
                      setRegisterMessage('');
                    }}
                    className="text-xs text-emerald-600 font-bold hover:underline"
                  >
                    {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                  </button>

                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">© 2026 OdontoHub</p>
                    <div className="flex justify-center gap-4 text-xs font-bold text-slate-500">
                      <Link to="/termos" className="hover:text-emerald-600 transition-colors">Termos de Uso</Link>
                      <span>|</span>
                      <Link to="/privacidade" className="hover:text-emerald-600 transition-colors">Política de Privacidade</Link>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        ) : (
          <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 relative overflow-x-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 tablet-l:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 p-4 md:p-6 flex flex-col transition-all duration-300 ease-in-out tablet-l:static tablet-l:translate-x-0 no-print
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 tablet-l:w-20 desktop:w-72'}
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
              <Plus size={24} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap tablet-l:hidden desktop:block">OdontoHub</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="tablet-l:hidden text-slate-400">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem id="dashboard" icon={ClipboardList} label="Dashboard" />
          <SidebarItem id="agenda" icon={Calendar} label="Agenda" />
          <SidebarItem id="pacientes" icon={Users} label="Pacientes" />
          <SidebarItem id="financeiro" icon={DollarSign} label="Financeiro" />
          <SidebarItem id="documentos" icon={FileText} label="Documentos" />
          {user?.role?.toUpperCase() === 'ADMIN' && (
            <SidebarItem id="admin" icon={UserCog} label="Gestão de Dentistas" />
          )}
          <SidebarItem id="configuracoes" icon={Settings} label="Configurações" />
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 overflow-hidden border border-slate-200">
              {profile?.photo_url ? (
                <img 
                  src={profile.photo_url} 
                  alt={profile.name} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserCircle size={24} />
              )}
            </div>
            <div className="tablet-l:hidden desktop:block whitespace-nowrap">
              <p className="text-sm font-semibold text-slate-800 truncate">{user?.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-rose-600 transition-colors overflow-hidden"
          >
            <LogOut size={18} className="shrink-0" />
            <span className="text-sm font-medium tablet-l:hidden desktop:block whitespace-nowrap">Sair</span>
          </button>

          <div className="mt-6 pt-6 border-t border-slate-50 tablet-l:hidden desktop:block">
            <p className="text-[10px] text-slate-400 px-4 mb-2">© 2026 OdontoHub</p>
            <div className="flex flex-col gap-1 px-4 text-[10px] font-bold text-slate-500">
              <Link to="/termos" className="hover:text-emerald-600 transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-emerald-600 transition-colors">Política de Privacidade</Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto w-full max-w-full print:p-0">
        <header className="w-full max-w-screen-xl mx-auto px-0 md:px-4 flex flex-col desktop:flex-row desktop:justify-between desktop:items-center gap-6 mb-8 md:mb-10 no-print">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="tablet-l:hidden p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm active:scale-95 transition-transform"
              >
                <Menu size={20} />
              </button>
              <div>
                <h2 className="text-xl md:text-3xl font-bold text-slate-900 tracking-tight">
                  {activeTab === 'dashboard' && 'Bem-vindo, Dr.'}
                  {activeTab === 'agenda' && 'Agenda Clínica'}
                  {activeTab === 'pacientes' && 'Gestão de Pacientes'}
                  {activeTab === 'financeiro' && 'Controle Financeiro'}
                  {activeTab === 'admin' && 'Gestão de Dentistas'}
                  {activeTab === 'documentos' && 'Documentos'}
                  {activeTab === 'configuracoes' && 'Configurações'}
                </h2>
                <p className="text-slate-500 text-[10px] md:text-sm mt-0.5 md:mt-1 font-medium">
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full desktop:w-auto">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
              <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center font-bold">
                {user?.name?.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">Profissional:</span>
                <span className="text-sm font-bold text-slate-700">{user?.name}</span>
              </div>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl lg:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-sm"
              />
            </div>
            <button 
              onClick={() => setIsPatientModalOpen(true)}
              className="flex bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95 w-full sm:w-auto"
            >
              <Plus size={20} />
              Novo Paciente
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + (searchTerm ? '-search' : '')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-screen-xl mx-auto px-0 md:px-4"
          >
            {searchTerm && activeTab !== 'pacientes' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Resultados da Busca: "{searchTerm}"</h3>
                  <button onClick={() => setSearchTerm('')} className="text-sm text-slate-400 hover:text-slate-600">Limpar</button>
                </div>
                <div className="space-y-2">
                  {patients
                    .filter(p => (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || (p.cpf && p.cpf.includes(searchTerm)))
                    .slice(0, 5)
                    .map(p => (
                      <div 
                        key={p.id} 
                        onClick={() => {
                          setSearchTerm('');
                          openPatientRecord(p.id);
                        }}
                        className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden border border-emerald-200">
                            {p.photo_url ? (
                              <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              (p.name || '?').charAt(0)
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{p.name}</p>
                            <p className="text-[10px] text-slate-400">{p.cpf || 'Sem CPF'}</p>
                          </div>
                        </div>
                        <button 
                          className="text-xs font-bold text-emerald-600 hover:underline"
                        >
                          Ver Prontuário
                        </button>
                      </div>
                    ))}
                  {patients.filter(p => (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-sm">Nenhum paciente encontrado.</p>
                  )}
                  {patients.filter(p => (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())).length > 5 && (
                    <button 
                      onClick={() => setActiveTab('pacientes')}
                      className="w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-emerald-600 transition-colors"
                    >
                      Ver todos os resultados
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && !searchTerm && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Stats */}
                <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {[
                    { 
                      label: 'Pacientes Ativos', 
                      value: patients.length, 
                      icon: Users, 
                      color: 'text-blue-600', 
                      bg: 'bg-blue-50',
                      action: () => setActiveTab('pacientes')
                    },
                    { 
                      label: 'Consultas Hoje', 
                      value: appointments.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString()).length, 
                      icon: Calendar, 
                      color: 'text-emerald-600', 
                      bg: 'bg-emerald-50',
                      action: () => {
                        setActiveTab('agenda');
                        setAgendaViewMode('day');
                        setSelectedDate(new Date());
                      }
                    },
                    { 
                      label: 'Consultas da Semana', 
                      value: weeklyAppointmentsCount, 
                      icon: Clock, 
                      color: 'text-amber-600', 
                      bg: 'bg-amber-50',
                      action: () => {
                        setActiveTab('agenda');
                        setAgendaViewMode('week');
                        setSelectedDate(new Date());
                      }
                    },
                    { 
                      label: 'Receita do Mês', 
                      value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 
                      icon: DollarSign, 
                      color: 'text-indigo-600', 
                      bg: 'bg-indigo-50',
                      variation: revenueVariation,
                      action: () => {
                        setActiveTab('financeiro');
                        setFinanceSubTab('transacoes');
                        setFinanceFilter(prev => ({ ...prev, period: 'month', type: 'INCOME' }));
                      }
                    },
                  ].map((stat, i) => (
                    <motion.div 
                      key={i} 
                      whileHover={{ y: -4, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                      transition={{ duration: 0.2 }}
                      onClick={stat.action}
                      className="bg-white p-5 md:p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 md:block cursor-pointer group"
                    >
                      <div className={`w-12 h-12 shrink-0 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center md:mb-4 group-hover:scale-110 transition-transform`}>
                        <stat.icon size={24} />
                      </div>
                      <div>
                        <p className="text-slate-500 text-xs md:text-sm font-medium group-hover:text-slate-700 transition-colors">{stat.label}</p>
                        <p className="text-xl md:text-2xl font-bold text-slate-900 md:mt-1">{stat.value}</p>
                        {stat.variation !== undefined && stat.variation !== 0 && (
                          <p className={`text-[10px] font-bold mt-1 ${stat.variation >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {stat.variation >= 0 ? '+' : ''}{stat.variation.toFixed(1)}% em relação ao mês anterior
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Next Appointments */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                  <div className="p-4 md:p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-bold text-sm md:text-base text-slate-800">
                      Próximas Consultas {nextAppointments.length > 0 && `(${nextAppointments.length})`}
                      {todayAppointmentsCount > 0 && <span className="ml-2 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Hoje: {todayAppointmentsCount}</span>}
                    </h3>
                    <button 
                      onClick={() => setActiveTab('agenda')}
                      className="text-emerald-600 text-[10px] md:text-xs font-bold hover:underline flex items-center gap-1"
                    >
                      Agenda Completa
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50 overflow-y-auto max-h-[400px]">
                    {nextAppointments.length > 0 ? nextAppointments.map((app) => (
                      <div 
                        key={app.id} 
                        onClick={() => openPatientRecord(app.patient_id)}
                        className="p-3 md:p-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors overflow-hidden border border-slate-200">
                            {(() => {
                              const patient = patients.find(p => p.id === app.patient_id);
                              return patient?.photo_url ? (
                                <img src={patient.photo_url} alt={app.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <UserCircle size={24} />
                              );
                            })()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate leading-tight">{app.patient_name}</p>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(app.start_time).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                              </p>
                              <span className="text-slate-300 text-[10px]">•</span>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <Clock size={10} />
                                {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-0.5 italic truncate">Procedimento não especificado</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <StatusBadge status={app.status} />
                          <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center">
                        <Calendar className="mx-auto text-slate-200 mb-3" size={32} />
                        <p className="text-slate-500 text-xs">Nenhuma consulta futura agendada.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions / Alerts / Daily Revenue */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                      <DollarSign size={80} className="text-emerald-600" />
                    </div>
                    <p className="text-slate-500 text-xs font-medium uppercase tracking-wider">Faturamento Hoje</p>
                    <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                      {dailyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Atualizado em tempo real</p>
                    </div>
                  </div>

                  <div className="bg-emerald-900 text-white p-6 rounded-2xl shadow-lg shadow-emerald-200 relative overflow-hidden">
                    <div className="relative z-10">
                      <h3 className="font-bold text-lg mb-2">Dica do Dia</h3>
                      <p className="text-emerald-100 text-sm leading-relaxed">
                        Lembre-se de confirmar as consultas de amanhã via WhatsApp para reduzir faltas em até 30%.
                      </p>
                      <button 
                        onClick={() => setActiveTab('agenda')}
                        className="mt-4 bg-white text-emerald-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-50 transition-colors"
                      >
                        Enviar Lembretes
                      </button>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-emerald-800/50 rotate-12">
                      <AlertCircle size={120} />
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-lg mb-4">Ações Rápidas</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Novo Prontuário', icon: ClipboardList, action: () => setActiveTab('pacientes') },
                        { label: 'Bloquear Horário', icon: Clock, action: () => setActiveTab('agenda') },
                        { label: 'Relatório Mensal', icon: DollarSign, action: () => setActiveTab('financeiro') },
                        { label: 'Configurações', icon: Settings, action: () => setActiveTab('configuracoes') },
                      ].map((action, i) => (
                        <button 
                          key={i} 
                          onClick={action.action}
                          className="flex flex-col items-center justify-center p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 transition-all group"
                        >
                          <action.icon size={20} className="text-slate-400 group-hover:text-emerald-600 mb-2" />
                          <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-900 text-center">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'agenda' && (
              <div className="flex flex-col desktop:grid desktop:grid-cols-4 gap-6 md:gap-8">
                {/* Mini Calendar / Filters */}
                <div className="space-y-6 order-1 desktop:order-1 no-print">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold mb-4 text-slate-800">Filtros da Agenda</h3>
                    <div className="space-y-4 tablet-p:grid tablet-p:grid-cols-3 tablet-p:gap-6 tablet-p:space-y-0 desktop:flex desktop:flex-col desktop:space-y-4">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Buscar Paciente</label>
                        <div className="relative">
                          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input 
                            type="text" 
                            placeholder="Nome do paciente..."
                            value={agendaSearchTerm}
                            onChange={(e) => setAgendaSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Data</label>
                        <input 
                          type="date" 
                          value={selectedDate.toLocaleDateString('en-CA')}
                          onChange={(e) => {
                            const [year, month, day] = e.target.value.split('-').map(Number);
                            setSelectedDate(new Date(year, month - 1, day));
                          }}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div className="tablet-p:pt-6 desktop:pt-4 desktop:border-t desktop:border-slate-50 space-y-3">
                        <button 
                          onClick={openAppointmentModal}
                          className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                          <Plus size={18} />
                          Novo Agendamento
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold mb-4 text-slate-800">Status</h3>
                    <div className="space-y-2 tablet-p:grid tablet-p:grid-cols-3 tablet-p:gap-4 tablet-p:space-y-0 desktop:flex desktop:flex-col desktop:space-y-2">
                      {[
                        { id: 'SCHEDULED', label: 'Agendado', color: 'bg-blue-400' },
                        { id: 'CONFIRMED', label: 'Confirmado', color: 'bg-emerald-400' },
                        { id: 'CANCELLED', label: 'Cancelado', color: 'bg-rose-400' },
                        { id: 'IN_PROGRESS', label: 'Em Atendimento', color: 'bg-amber-400' },
                        { id: 'FINISHED', label: 'Finalizado', color: 'bg-slate-400' }
                      ].map((s) => (
                        <label key={s.id} className="flex items-center gap-3 text-sm text-slate-600 cursor-pointer hover:bg-slate-50 p-1 rounded transition-colors">
                          <input 
                            type="checkbox" 
                            checked={statusFilter.includes(s.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setStatusFilter([...statusFilter, s.id]);
                              } else {
                                setStatusFilter(statusFilter.filter(f => f !== s.id));
                              }
                            }}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <div className={`w-2 h-2 rounded-full ${s.color}`} />
                          {s.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Timeline View */}
                <div className="desktop:col-span-3 space-y-4 order-2 desktop:order-2">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden no-print">
                    <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex flex-wrap items-center gap-3 md:gap-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedDate(new Date())}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
                          >
                            Hoje
                          </button>
                          <button 
                            onClick={() => imprimirDocumento('agenda')}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-50 transition-all no-print"
                            title="Imprimir agenda do dia"
                          >
                            <Printer size={18} />
                            <span className="hidden xs:inline">Imprimir</span>
                          </button>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                const newDate = new Date(selectedDate);
                                if (agendaViewMode === 'day') newDate.setDate(selectedDate.getDate() - 1);
                                else if (agendaViewMode === 'week') newDate.setDate(selectedDate.getDate() - 7);
                                else if (agendaViewMode === 'month') newDate.setMonth(selectedDate.getMonth() - 1);
                                setSelectedDate(newDate);
                              }}
                              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                              title="Anterior"
                            >
                              <ChevronRight size={20} className="rotate-180" />
                            </button>
                            <button 
                              onClick={() => {
                                const newDate = new Date(selectedDate);
                                if (agendaViewMode === 'day') newDate.setDate(selectedDate.getDate() + 1);
                                else if (agendaViewMode === 'week') newDate.setDate(selectedDate.getDate() + 7);
                                else if (agendaViewMode === 'month') newDate.setMonth(selectedDate.getMonth() + 1);
                                setSelectedDate(newDate);
                              }}
                              className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600"
                              title="Próximo"
                            >
                              <ChevronRight size={20} />
                            </button>
                          </div>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-lg md:text-xl text-slate-800">
                            {(() => {
                              const today = new Date();
                              const isToday = selectedDate.toDateString() === today.toDateString();
                              if (agendaViewMode === 'day') {
                                return isToday ? 'Horários de Hoje' : `Horários de ${selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
                              }
                              return agendaViewMode === 'week' ? 'Horários da Semana' : 'Horários do Mês';
                            })()}
                          </h3>
                          <p className="text-xs font-medium text-slate-500">
                            {agendaViewMode === 'day' ? selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : 
                             agendaViewMode === 'week' ? `Semana de ${(() => {
                               const d = new Date(selectedDate);
                               const day = d.getDay();
                               const diff = (day === 0 ? 7 : day) - 1;
                               d.setDate(d.getDate() - diff);
                               return d;
                             })().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : 
                             selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                          {appointments.filter(a => {
                            const appDate = new Date(a.start_time);
                            if (agendaViewMode === 'day') return appDate.toDateString() === selectedDate.toDateString();
                            if (agendaViewMode === 'week') {
                              const day = selectedDate.getDay();
                              const diff = (day === 0 ? 7 : day) - 1;
                              const startOfWeek = new Date(selectedDate);
                              startOfWeek.setDate(selectedDate.getDate() - diff);
                              startOfWeek.setHours(0, 0, 0, 0);
                              const endOfWeek = new Date(startOfWeek);
                              endOfWeek.setDate(startOfWeek.getDate() + 6);
                              endOfWeek.setHours(23, 59, 59, 999);
                              const appDateTime = appDate.getTime();
                              return appDateTime >= startOfWeek.getTime() && appDateTime <= endOfWeek.getTime();
                            }
                            if (agendaViewMode === 'month') return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
                            return false;
                          }).length} Consultas
                        </span>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-lg w-full sm:w-auto">
                        <button 
                          onClick={() => setAgendaViewMode('day')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${agendaViewMode === 'day' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Dia
                        </button>
                        <button 
                          onClick={() => setAgendaViewMode('week')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${agendaViewMode === 'week' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Semana
                        </button>
                        <button 
                          onClick={() => setAgendaViewMode('month')}
                          className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${agendaViewMode === 'month' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-800'}`}
                        >
                          Mês
                        </button>
                      </div>
                    </div>

                    {agendaViewMode === 'week' && (
                      <div className="px-4 tablet-l:px-8 py-3 bg-slate-50 border-b border-slate-100 overflow-x-auto no-scrollbar">
                        <div className="flex gap-2 min-w-max tablet-l:min-w-0 tablet-l:justify-between">
                          {[
                            { label: 'SEG', value: 1 },
                            { label: 'TER', value: 2 },
                            { label: 'QUA', value: 3 },
                            { label: 'QUI', value: 4 },
                            { label: 'SEX', value: 5 },
                            { label: 'SÁB', value: 6 },
                            { label: 'DOM', value: 0 },
                          ].map((day) => {
                            const dayOfWeek = selectedDate.getDay();
                            const diffToMon = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
                            const startOfMonday = new Date(selectedDate);
                            startOfMonday.setDate(selectedDate.getDate() - diffToMon);
                            const dayDate = new Date(startOfMonday);
                            const offset = (day.value === 0 ? 7 : day.value) - 1;
                            dayDate.setDate(startOfMonday.getDate() + offset);
                            const dayOfMonth = dayDate.getDate();

                            const count = appointments.filter(a => {
                              const appDate = new Date(a.start_time);
                              const endOfWeek = new Date(startOfMonday);
                              endOfWeek.setDate(startOfMonday.getDate() + 6);
                              const appDateTime = appDate.getTime();
                              const isInWeek = appDateTime >= startOfMonday.setHours(0,0,0,0) && appDateTime <= endOfWeek.setHours(23,59,59,999);
                              return isInWeek && appDate.getDay() === day.value && (statusFilter.length === 0 || statusFilter.includes(a.status));
                            }).length;

                            return (
                              <button
                                key={day.value}
                                onClick={() => setSelectedWeekDay(day.value)}
                                className={`flex flex-col items-center justify-center min-w-[60px] tablet-l:min-w-0 tablet-l:flex-1 py-2 px-2 rounded-xl transition-all ${
                                  selectedWeekDay === day.value
                                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-100'
                                }`}
                              >
                                <span className="text-[9px] font-bold uppercase tracking-wider opacity-80">{day.label}</span>
                                <span className="text-base font-black leading-tight">{dayOfMonth}</span>
                                <span className={`text-[9px] font-bold mt-0.5 ${selectedWeekDay === day.value ? 'text-emerald-100' : 'text-slate-400'}`}>
                                  ({count})
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {agendaViewMode === 'month' && (
                      <div className="px-4 tablet-l:px-8 py-6 bg-slate-50 border-b border-slate-100">
                        <div className="max-w-md mx-auto">
                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(day => (
                              <div key={day} className="text-center text-[10px] font-bold text-slate-400 py-2 uppercase tracking-widest">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {(() => {
                              const year = selectedDate.getFullYear();
                              const month = selectedDate.getMonth();
                              const firstDayOfMonth = new Date(year, month, 1);
                              const lastDayOfMonth = new Date(year, month + 1, 0);
                              
                              let firstDayIdx = firstDayOfMonth.getDay();
                              firstDayIdx = firstDayIdx === 0 ? 6 : firstDayIdx - 1;
                              
                              const days = [];
                              const prevMonthLastDay = new Date(year, month, 0).getDate();
                              for (let i = firstDayIdx - 1; i >= 0; i--) {
                                days.push({ day: prevMonthLastDay - i, month: month - 1, currentMonth: false });
                              }
                              for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
                                days.push({ day: i, month: month, currentMonth: true });
                              }
                              const remainingSlots = 42 - days.length;
                              for (let i = 1; i <= remainingSlots; i++) {
                                days.push({ day: i, month: month + 1, currentMonth: false });
                              }
                              
                              return days.map((d, idx) => {
                                const date = new Date(year, d.month, d.day);
                                const dateStr = date.toDateString();
                                const isSelected = dateStr === selectedDate.toDateString();
                                const isToday = dateStr === new Date().toDateString();
                                
                                const dayAppointments = appointments.filter(a => 
                                  new Date(a.start_time).toDateString() === dateStr &&
                                  (statusFilter.length === 0 || statusFilter.includes(a.status))
                                );
                                
                                const dotsCount = Math.min(dayAppointments.length, 3);
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => setSelectedDate(date)}
                                    className={`relative flex flex-col items-center justify-center aspect-square rounded-xl transition-all ${
                                      !d.currentMonth ? 'text-slate-300 opacity-40' : 
                                      isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-100' :
                                      isToday ? 'bg-emerald-50 text-emerald-600 font-bold border border-emerald-100' :
                                      'hover:bg-slate-100 text-slate-600'
                                    }`}
                                  >
                                    <span className="text-xs tablet-l:text-sm font-bold">{d.day}</span>
                                    {dotsCount > 0 && (
                                      <div className="flex gap-0.5 mt-0.5">
                                        {[...Array(dotsCount)].map((_, i) => (
                                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                        ))}
                                      </div>
                                    )}
                                  </button>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = appointments
                          .filter(a => {
                            const appDate = new Date(a.start_time);
                            const isSameDay = appDate.toDateString() === selectedDate.toDateString();
                            
                            if (agendaViewMode === 'day') return isSameDay;
                            
                            if (agendaViewMode === 'week') {
                              const day = selectedDate.getDay();
                              const diff = (day === 0 ? 7 : day) - 1;
                              const startOfWeek = new Date(selectedDate);
                              startOfWeek.setDate(selectedDate.getDate() - diff);
                              startOfWeek.setHours(0, 0, 0, 0);
                              const endOfWeek = new Date(startOfWeek);
                              endOfWeek.setDate(startOfWeek.getDate() + 6);
                              endOfWeek.setHours(23, 59, 59, 999);
                              
                              const appDateTime = appDate.getTime();
                              const isInWeek = appDateTime >= startOfWeek.getTime() && appDateTime <= endOfWeek.getTime();
                              return isInWeek && appDate.getDay() === selectedWeekDay;
                            }
                            
                            if (agendaViewMode === 'month') {
                              return appDate.toDateString() === selectedDate.toDateString();
                            }
                            
                            return false;
                          })
                          .filter(a => statusFilter.length === 0 || statusFilter.includes(a.status))
                          .filter(a => agendaSearchTerm === '' || (a.patient_name || '').toLowerCase().includes((agendaSearchTerm || '').toLowerCase()))
                          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                        if (filtered.length === 0) {
                          return (
                            <div className="p-20 text-center">
                              <Calendar className="mx-auto text-slate-200 mb-4" size={64} />
                              <p className="text-slate-500 font-medium">Nenhum agendamento encontrado para este período.</p>
                              <button 
                                onClick={openAppointmentModal}
                                className="mt-4 text-emerald-600 font-bold hover:underline"
                              >
                                Agendar agora
                              </button>
                            </div>
                          );
                        }

                        // Group by day for week/month views
                        const grouped: Record<string, Appointment[]> = {};
                        filtered.forEach(app => {
                          const dateKey = new Date(app.start_time).toDateString();
                          if (!grouped[dateKey]) grouped[dateKey] = [];
                          grouped[dateKey].push(app);
                        });

                        const renderAppointment = (app: Appointment) => (
                          <div key={app.id} className="p-4 tablet-l:p-6 desktop:p-8 flex flex-col tablet-l:flex-row gap-4 tablet-l:gap-6 desktop:gap-8 hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                            <div className="w-full tablet-l:w-20 desktop:w-24 pt-1 flex flex-row tablet-l:flex-col items-center tablet-l:items-center justify-start tablet-l:justify-start border-b tablet-l:border-b-0 tablet-l:border-r border-slate-100 pb-2 tablet-l:pb-0 tablet-l:pr-4 desktop:pr-6 gap-2 tablet-l:gap-0">
                              <p className="text-base tablet-l:text-lg font-black text-slate-900 leading-none">
                                {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className="hidden tablet-l:block w-full h-px bg-slate-100 my-2" />
                              <span className="tablet-l:hidden text-slate-300">•</span>
                              <p className="text-xs font-bold text-slate-400">
                                {new Date(app.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            
                            <div className="flex-1 bg-white border border-slate-100 p-4 tablet-l:p-6 rounded-2xl shadow-sm group-hover:border-emerald-200 group-hover:shadow-md transition-all flex flex-col tablet-l:flex-row justify-between items-start tablet-l:items-center gap-4">
                              <div 
                                className="flex items-start tablet-l:items-center gap-4 tablet-l:gap-5 cursor-pointer w-full"
                                onClick={() => openPatientRecord(app.patient_id)}
                              >
                                <div className="w-12 h-12 tablet-l:w-14 tablet-l:h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors shrink-0 overflow-hidden border border-slate-200">
                                  {(() => {
                                    const patient = patients.find(p => p.id === app.patient_id);
                                    return patient?.photo_url ? (
                                      <img src={patient.photo_url} alt={app.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      <>
                                        <UserCircle size={28} className="tablet-l:hidden" />
                                        <UserCircle size={32} className="hidden tablet-l:block" />
                                      </>
                                    );
                                  })()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-base tablet-l:text-lg font-bold text-slate-800 group-hover:text-emerald-900 transition-colors break-words leading-tight">{app.patient_name}</p>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                    <span className="text-xs text-slate-500 italic">Procedimento não especificado</span>
                                    <span className="hidden tablet-l:block w-1 h-1 bg-slate-300 rounded-full" />
                                    <span className="text-[10px] tablet-l:text-xs font-bold text-slate-400 uppercase tracking-widest">{app.dentist_name}</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center justify-between tablet-l:justify-end gap-4 w-full tablet-l:w-auto pt-4 tablet-l:pt-0 border-t tablet-l:border-t-0 border-slate-50">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={() => sendReminder(app)}
                                    className="p-2.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                                    title="Enviar Lembrete"
                                  >
                                    <Bell size={20} />
                                  </button>
                                  <select 
                                    value={app.status}
                                    onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])}
                                    className="text-[10px] tablet-l:text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-2 tablet-l:px-3 py-1.5 tablet-l:py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                  >
                                    <option value="SCHEDULED">Agendado</option>
                                    <option value="CONFIRMED">Confirmado</option>
                                    <option value="CANCELLED">Cancelado</option>
                                    <option value="IN_PROGRESS">Em Atendimento</option>
                                    <option value="FINISHED">Finalizado</option>
                                  </select>
                                </div>
                                <StatusBadge status={app.status} />
                              </div>
                            </div>
                          </div>
                        );

                        if (agendaViewMode === 'day' || agendaViewMode === 'week' || agendaViewMode === 'month') {
                          const morning = filtered.filter(a => {
                            const hour = new Date(a.start_time).getHours();
                            return hour >= 6 && hour < 12;
                          });
                          const afternoon = filtered.filter(a => {
                            const hour = new Date(a.start_time).getHours();
                            return hour >= 12 && hour < 18;
                          });
                          const evening = filtered.filter(a => {
                            const hour = new Date(a.start_time).getHours();
                            return hour >= 18 && hour < 22;
                          });
                          const others = filtered.filter(a => {
                            const hour = new Date(a.start_time).getHours();
                            return hour < 6 || hour >= 22;
                          });

                          const isToday = (() => {
                            const today = new Date();
                            if (agendaViewMode === 'day' || agendaViewMode === 'month') return selectedDate.toDateString() === today.toDateString();
                            if (agendaViewMode === 'week') {
                              const dayOfWeek = selectedDate.getDay();
                              const diffToMon = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
                              const targetDate = new Date(selectedDate);
                              targetDate.setDate(selectedDate.getDate() - diffToMon + (selectedWeekDay === 0 ? 6 : selectedWeekDay - 1));
                              return targetDate.toDateString() === today.toDateString();
                            }
                            return false;
                          })();

                          const renderNowIndicator = () => (
                            <div key="now-indicator" className="relative py-2 px-6 flex items-center gap-3 bg-rose-50/30">
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Agora — {now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <div className="h-px flex-1 bg-rose-200" />
                            </div>
                          );

                          const renderPeriod = (apps: Appointment[], periodStart: number, periodEnd: number, label: string, icon: React.ReactNode) => {
                            const nowHour = now.getHours();
                            const showNowInThisPeriod = isToday && nowHour >= periodStart && nowHour < periodEnd;
                            
                            if (apps.length === 0 && !showNowInThisPeriod) return null;

                            let content;
                            if (!showNowInThisPeriod) {
                              content = apps.map(renderAppointment);
                            } else {
                              const nowTime = now.getHours() * 60 + now.getMinutes();
                              const result = [];
                              let nowInserted = false;
                              
                              for (const app of apps) {
                                const appTime = new Date(app.start_time).getHours() * 60 + new Date(app.start_time).getMinutes();
                                if (!nowInserted && nowTime < appTime) {
                                  result.push(renderNowIndicator());
                                  nowInserted = true;
                                }
                                result.push(renderAppointment(app));
                              }
                              
                              if (!nowInserted) {
                                result.push(renderNowIndicator());
                              }
                              content = result;
                            }

                            return (
                              <div key={label}>
                                <div className="bg-slate-50 px-6 py-2 border-y border-slate-100 flex items-center gap-2">
                                  {icon}
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
                                </div>
                                {content}
                              </div>
                            );
                          };

                          return (
                            <div className="divide-y divide-slate-100">
                              {(agendaViewMode === 'week' || agendaViewMode === 'month') && (
                                <div className="bg-slate-50 px-6 py-3 border-b border-slate-100">
                                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                    {(() => {
                                      if (agendaViewMode === 'week') {
                                        const dayOfWeek = selectedDate.getDay();
                                        const diffToMon = (dayOfWeek === 0 ? 7 : dayOfWeek) - 1;
                                        const targetDate = new Date(selectedDate);
                                        targetDate.setDate(selectedDate.getDate() - diffToMon + (selectedWeekDay === 0 ? 6 : selectedWeekDay - 1));
                                        return targetDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase().replace('.', '');
                                      }
                                      return selectedDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).toUpperCase().replace('.', '');
                                    })()}
                                  </p>
                                </div>
                              )}
                              {renderPeriod(others.filter(a => new Date(a.start_time).getHours() < 6), 0, 6, "Madrugada (00:00 – 06:00)", <Clock size={14} className="text-slate-400" />)}
                              {renderPeriod(morning, 6, 12, "Manhã (06:00 – 12:00)", <Sun size={14} className="text-amber-500" />)}
                              {renderPeriod(afternoon, 12, 18, "Tarde (12:00 – 18:00)", <Sun size={14} className="text-orange-500" />)}
                              {renderPeriod(evening, 18, 22, "Noite (18:00 – 22:00)", <Moon size={14} className="text-indigo-500" />)}
                              {renderPeriod(others.filter(a => new Date(a.start_time).getHours() >= 22), 22, 24, "Noite Tardia (22:00 – 00:00)", <Moon size={14} className="text-slate-600" />)}
                            </div>
                          );
                        }

                        return Object.entries(grouped).map(([date, apps]) => (
                          <div key={date}>
                            <div className="bg-slate-50 px-6 py-2 border-y border-slate-100">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                              </span>
                            </div>
                            {apps.map(renderAppointment)}
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pacientes' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">Gestão de Pacientes</h3>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button 
                      onClick={() => {
                        setExportType('patients');
                        setIsExportModalOpen(true);
                      }}
                      className="bg-white text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <Download size={18} />
                      Exportar
                    </button>
                    <button 
                      onClick={() => setIsPatientModalOpen(true)}
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <Plus size={18} />
                      Novo Paciente
                    </button>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">Paciente</th>
                          <th className="px-6 py-4">CPF</th>
                          <th className="px-6 py-4">Contato</th>
                          <th className="px-6 py-4">Última Visita</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {patients
                          .filter(p => 
                            (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                            (p.cpf && p.cpf.includes(searchTerm)) ||
                            p.phone.includes(searchTerm)
                          )
                          .map((patient) => (
                            <tr 
                              key={patient.id} 
                              onClick={() => openPatientRecord(patient.id)}
                              className="hover:bg-slate-50 transition-colors group cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold overflow-hidden border border-emerald-200">
                                    {patient.photo_url ? (
                                      <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                      (patient.name || '?').charAt(0)
                                    )}
                                  </div>
                                  <span className="font-bold text-slate-800">{patient.name}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 font-mono text-sm">{patient.cpf || '---'}</td>
                              <td className="px-6 py-4">
                                <p className="text-sm font-medium text-slate-700">{patient.phone}</p>
                                <p className="text-xs text-slate-400">{patient.email}</p>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-sm">12/02/2024</td>
                              <td className="px-6 py-4 text-right">
                                <button 
                                  onClick={() => openPatientRecord(patient.id)}
                                  className="text-emerald-600 font-bold text-sm hover:underline"
                                >
                                  Ver Prontuário
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {patients
                      .filter(p => 
                        (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
                        (p.cpf && p.cpf.includes(searchTerm)) ||
                        p.phone.includes(searchTerm)
                      )
                      .map((patient) => (
                        <div 
                          key={patient.id} 
                          onClick={() => openPatientRecord(patient.id)}
                          className="p-4 active:bg-slate-50 transition-colors"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                                {(patient.name || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{patient.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{patient.cpf || 'Sem CPF'}</p>
                              </div>
                            </div>
                            <ChevronRight size={18} className="text-slate-300" />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Telefone</p>
                              <p className="text-slate-700 font-medium">{patient.phone}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg">
                              <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Última Visita</p>
                              <p className="text-slate-700 font-medium">12/02/2024</p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
            </div>
          )}

            {activeTab === 'prontuario' && selectedPatient && (
              <div className="space-y-8">
                <div className="flex items-center gap-3 md:gap-4 mb-6">
                  <button 
                    onClick={() => setActiveTab('pacientes')}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                  >
                    <ChevronRight size={20} className="rotate-180 md:hidden" />
                    <ChevronRight size={24} className="rotate-180 hidden md:block" />
                  </button>
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900 truncate">Prontuário: {selectedPatient.name}</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sidebar: Patient Info & Anamnesis */}
                  <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col items-center mb-6">
                        <div className="relative group">
                          <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border-2 border-slate-200 group-hover:border-emerald-500 transition-all">
                            {selectedPatient.photo_url ? (
                              <img 
                                src={selectedPatient.photo_url} 
                                alt={selectedPatient.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <UserCircle size={48} />
                            )}
                          </div>
                          <label className="absolute -bottom-2 -right-2 p-2 bg-emerald-600 text-white rounded-xl shadow-lg cursor-pointer hover:bg-emerald-700 transition-all">
                            <Camera size={16} />
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={handlePatientPhotoUpload}
                            />
                          </label>
                        </div>
                      </div>
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserCircle size={18} className="text-emerald-600" />
                        Dados Pessoais
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">CPF</span> {selectedPatient.cpf || '---'}</p>
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">Nascimento</span> {formatDate(selectedPatient.birth_date) || '---'}</p>
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">Telefone</span> {selectedPatient.phone}</p>
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">E-mail</span> {selectedPatient.email}</p>
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">Endereço</span> {selectedPatient.address || '---'}</p>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle size={18} className="text-rose-500" />
                        Anamnese
                      </h4>
                      <form onSubmit={saveAnamnesis} className="space-y-4">
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Histórico Médico</label>
                          <textarea 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                            rows={3}
                            value={selectedPatient.anamnesis?.medical_history || ''}
                            onChange={(e) => setSelectedPatient({
                              ...selectedPatient, 
                              anamnesis: { 
                                allergies: '', 
                                medications: '', 
                                ...selectedPatient.anamnesis, 
                                medical_history: e.target.value 
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Alergias</label>
                          <textarea 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                            rows={2}
                            value={selectedPatient.anamnesis?.allergies || ''}
                            onChange={(e) => setSelectedPatient({
                              ...selectedPatient, 
                              anamnesis: { 
                                medical_history: '', 
                                medications: '', 
                                ...selectedPatient.anamnesis, 
                                allergies: e.target.value 
                              }
                            })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Medicações</label>
                          <textarea 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                            rows={2}
                            value={selectedPatient.anamnesis?.medications || ''}
                            onChange={(e) => setSelectedPatient({
                              ...selectedPatient, 
                              anamnesis: { 
                                medical_history: '', 
                                allergies: '', 
                                ...selectedPatient.anamnesis, 
                                medications: e.target.value 
                              }
                            })}
                          />
                        </div>
                        <button type="submit" className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors">
                          Salvar Anamnese
                        </button>
                      </form>
                    </div>
                  </div>

                  {/* Main: Evolution & Odontogram Placeholder */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Tabs for Patient Record */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="flex border-b border-slate-100">
                        {['evolucao', 'imagens', 'financeiro'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setSelectedPatientTab(tab as any)}
                            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                              selectedPatientTab === tab 
                                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/30' 
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab === 'evolucao' ? 'Evolução Clínica' : tab === 'imagens' ? 'Imagens & RX' : 'Financeiro'}
                          </button>
                        ))}
                      </div>

                      <div className="p-6">
                        {selectedPatientTab === 'evolucao' ? (
                          <>
                            <div className="flex justify-between items-center mb-6">
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <ClipboardList size={18} className="text-emerald-600" />
                                Histórico de Evolução
                              </h4>
                              <button 
                                onClick={() => setIsEvolutionFormOpen(!isEvolutionFormOpen)}
                                className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                              >
                                <Plus size={14} className={isEvolutionFormOpen ? 'rotate-45' : ''} /> 
                                {isEvolutionFormOpen ? 'Cancelar' : 'Nova Evolução'}
                              </button>
                            </div>

                            <AnimatePresence>
                              {isEvolutionFormOpen && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden mb-6"
                                >
                                  <div className="bg-slate-50 p-4 rounded-xl border border-emerald-100 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Procedimento</label>
                                        <input 
                                          type="text"
                                          placeholder="Ex: Limpeza, Restauração..."
                                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20"
                                          value={newEvolution.procedure}
                                          onChange={(e) => setNewEvolution({...newEvolution, procedure: e.target.value})}
                                        />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notas</label>
                                        <textarea 
                                          placeholder="Descreva a evolução do paciente..."
                                          className="w-full p-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                                          rows={2}
                                          value={newEvolution.notes}
                                          onChange={(e) => setNewEvolution({...newEvolution, notes: e.target.value})}
                                        />
                                      </div>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                      <button 
                                        onClick={() => setIsEvolutionFormOpen(false)}
                                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      <button 
                                        onClick={() => {
                                          if (newEvolution.notes || newEvolution.procedure) {
                                            addEvolution(newEvolution.notes, newEvolution.procedure);
                                            setNewEvolution({ notes: '', procedure: '' });
                                            setIsEvolutionFormOpen(false);
                                          } else {
                                            alert('Preencha pelo menos um campo (Procedimento ou Notas).');
                                          }
                                        }}
                                        className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                                      >
                                        Adicionar Registro
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            <div className="space-y-6">
                              {selectedPatient.evolution && selectedPatient.evolution.length > 0 ? (
                                selectedPatient.evolution.map((evo) => (
                                  <div key={evo.id} className="relative pl-6 border-l-2 border-slate-100 pb-6 last:pb-0">
                                    <div className="absolute -left-[9px] top-0 w-4 h-4 bg-white border-2 border-emerald-500 rounded-full" />
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                      <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                                          {formatDate(evo.date)}
                                        </span>
                                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                                          {evo.procedure_performed}
                                        </span>
                                      </div>
                                      <p className="text-sm text-slate-700 leading-relaxed">{evo.notes}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-12 text-slate-400">
                                  <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
                                  <p>Nenhum registro de evolução clínica.</p>
                                </div>
                              )}
                            </div>
                          </>
                        ) : selectedPatientTab === 'imagens' ? (
                          <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <ImageIcon size={18} className="text-emerald-600" />
                                Imagens e Exames (RX)
                              </h4>
                              <button 
                                onClick={() => setIsImageModalOpen(true)}
                                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-2"
                              >
                                <Upload size={14} />
                                Upload
                              </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                              {selectedPatient.files && selectedPatient.files.length > 0 ? (
                                selectedPatient.files.map((file) => (
                                  <div key={file.id} className="group relative bg-slate-50 rounded-xl border border-slate-100 overflow-hidden aspect-square">
                                    <img 
                                      src={file.file_url} 
                                      alt={file.description} 
                                      className="w-full h-full object-cover"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4 text-center">
                                      <p className="text-white text-xs font-bold mb-2">{file.description}</p>
                                      <div className="flex gap-2">
                                        <button 
                                          onClick={() => window.open(file.file_url, '_blank')}
                                          className="p-2 bg-white/20 hover:bg-white/40 rounded-lg text-white transition-colors"
                                        >
                                          <Search size={14} />
                                        </button>
                                        <button 
                                          onClick={() => deleteFile(file.id)}
                                          className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-lg text-white transition-colors"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-full py-12 text-center text-slate-400">
                                  <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
                                  <p>Nenhuma imagem ou exame anexado.</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div className="flex justify-between items-center">
                              <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                <DollarSign size={18} className="text-emerald-600" />
                                Histórico Financeiro do Paciente
                              </h4>
                              <button 
                                onClick={() => {
                                  setNewPaymentPlan({...newPaymentPlan, patient_id: selectedPatient.id.toString()});
                                  setIsPaymentPlanModalOpen(true);
                                }}
                                className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline"
                              >
                                <Plus size={14} /> 
                                Novo Plano de Pagamento
                              </button>
                            </div>

                            {/* Payment Plans */}
                            <div className="space-y-4">
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Planos de Pagamento</h5>
                              {selectedPatient.financial?.paymentPlans && selectedPatient.financial.paymentPlans.length > 0 ? (
                                selectedPatient.financial.paymentPlans.map(plan => {
                                  const planInstallments = selectedPatient.financial?.installments.filter(i => i.payment_plan_id === plan.id) || [];
                                  const hasOverdue = planInstallments.some(i => i.status === 'PENDING' && isOverdue(i.due_date));
                                  
                                  return (
                                    <div key={plan.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                                      <div className="flex justify-between items-start mb-4">
                                        <div>
                                          <p className="font-bold text-slate-800">{plan.procedure}</p>
                                          <p className="text-xs text-slate-500">
                                            Total: {Number(plan.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} • {plan.installments_count} parcelas
                                          </p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                          plan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 
                                          plan.status === 'CANCELLED' ? 'bg-slate-200 text-slate-600' : 
                                          hasOverdue ? 'bg-rose-100 text-rose-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {plan.status === 'COMPLETED' ? 'Concluído' : 
                                           plan.status === 'CANCELLED' ? 'Cancelado' : 
                                           hasOverdue ? 'Atrasado' : 'Em Aberto'}
                                        </span>
                                      </div>
                                      
                                      <div className="space-y-2">
                                        {planInstallments.map(inst => (
                                          <div key={inst.id} className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-100 text-sm">
                                            <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center text-[10px] font-bold">
                                                {inst.number}
                                              </span>
                                              <div>
                                                <p className="font-medium text-slate-700">{Number(inst.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase">Vencimento: {formatDate(inst.due_date)}</p>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                                inst.status === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 
                                                isOverdue(inst.due_date) ? 'bg-rose-100 text-rose-700' : 
                                                'bg-amber-100 text-amber-700'
                                              }`}>
                                                {inst.status === 'PAID' ? 'Pago' : isOverdue(inst.due_date) ? 'Atrasado' : 'Pendente'}
                                              </span>
                                              {inst.status === 'PENDING' && (
                                                <button 
                                                  onClick={() => handlePayInstallment(inst.id, 'Dinheiro')}
                                                  className="text-[10px] font-bold text-emerald-600 hover:underline"
                                                >
                                                  Pagar
                                                </button>
                                              )}
                                              {inst.status === 'PAID' && inst.transaction_id && (
                                                <button 
                                                  onClick={() => {
                                                    const trans = selectedPatient.financial?.transactions.find(t => t.id === inst.transaction_id);
                                                    if (trans) generateReceipt(trans);
                                                  }}
                                                  className="text-[10px] font-bold text-blue-600 hover:underline"
                                                >
                                                  Recibo
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                  <DollarSign size={32} className="mx-auto mb-2 opacity-20" />
                                  <p className="text-sm">Nenhum plano de parcelamento ativo.</p>
                                </div>
                              )}
                            </div>

                            {/* Recent Transactions */}
                            <div className="space-y-4">
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pagamentos Recentes</h5>
                              <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden overflow-x-auto">
                                <table className="w-full text-left text-sm min-w-[500px]">
                                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">
                                    <tr>
                                      <th className="px-4 py-3">Data</th>
                                      <th className="px-4 py-3">Descrição</th>
                                      <th className="px-4 py-3 text-right">Valor</th>
                                      <th className="px-4 py-3"></th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {selectedPatient.financial?.transactions.map(t => (
                                      <tr key={t.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-slate-500">{formatDate(t.date)}</td>
                                        <td className="px-4 py-3 font-medium text-slate-700">{t.description}</td>
                                        <td className={`px-4 py-3 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                          <button 
                                            onClick={() => generateReceipt(t)}
                                            className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors"
                                            title="Gerar Recibo"
                                          >
                                            <FileText size={16} />
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                    {(!selectedPatient.financial?.transactions || selectedPatient.financial.transactions.length === 0) && (
                                      <tr>
                                        <td colSpan={4} className="px-4 py-8 text-center text-slate-400">Nenhuma transação registrada.</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Odontogram */}
                    <div className="bg-white p-4 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-6">
                        <h4 className="text-xl font-bold text-slate-800">Odontograma Interativo</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique no dente para alterar o status</span>
                      </div>
                      <Odontogram 
                        data={selectedPatient.odontogram || {}} 
                        history={selectedPatient.toothHistory || []}
                        onChange={saveOdontogram} 
                        onAddHistory={addToothHistory}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'financeiro' && (
              <div className="space-y-6">
                <div className="flex border-b border-slate-100 mb-6">
                  {['transacoes', 'parcelamentos'].map((subTab) => (
                    <button
                      key={subTab}
                      onClick={() => setFinanceSubTab(subTab as any)}
                      className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                        financeSubTab === subTab 
                          ? 'border-emerald-600 text-emerald-600 bg-emerald-50/30' 
                          : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {subTab === 'transacoes' ? 'Transações' : 'Parcelamentos'}
                    </button>
                  ))}
                </div>

                {financeSubTab === 'transacoes' ? (
                  <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                        <select 
                          value={financeFilter.period}
                          onChange={(e) => setFinanceFilter({...financeFilter, period: e.target.value})}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-auto"
                        >
                          <option value="day">Hoje</option>
                          <option value="week">Últimos 7 dias</option>
                          <option value="month">Este Mês</option>
                          <option value="all">Tudo</option>
                        </select>
                        <select 
                          value={financeFilter.type}
                          onChange={(e) => setFinanceFilter({...financeFilter, type: e.target.value})}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-auto"
                        >
                          <option value="all">Todos os Tipos</option>
                          <option value="INCOME">Receitas</option>
                          <option value="EXPENSE">Despesas</option>
                        </select>
                        <select 
                          value={financeFilter.category}
                          onChange={(e) => setFinanceFilter({...financeFilter, category: e.target.value})}
                          className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-emerald-500/20 w-full sm:w-auto"
                        >
                          <option value="all">Todas Categorias</option>
                          <option value="Procedimentos">Procedimentos</option>
                          <option value="Consultas">Consultas</option>
                          <option value="Aluguel">Aluguel</option>
                          <option value="Materiais">Materiais</option>
                          <option value="Laboratório">Laboratório</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Salários">Salários</option>
                          <option value="Outros">Outros</option>
                        </select>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <button 
                          onClick={() => imprimirDocumento('relatorio')}
                          className="flex-1 sm:flex-none bg-white text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <Printer size={18} />
                          Relatório
                        </button>
                        <button 
                          onClick={() => {
                            setExportType('finance');
                            setIsExportModalOpen(true);
                          }}
                          className="flex-1 sm:flex-none bg-white text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <Download size={18} />
                          Exportar
                        </button>
                        <button 
                          onClick={() => {
                            setTransactionType('EXPENSE');
                            setIsTransactionModalOpen(true);
                          }}
                          className="flex-1 sm:flex-none bg-rose-50 text-rose-600 px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-100 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <Plus size={18} />
                          Despesa
                        </button>
                        <button 
                          onClick={() => {
                            setTransactionType('INCOME');
                            setIsTransactionModalOpen(true);
                          }}
                          className="flex-1 sm:flex-none bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                          <Plus size={18} />
                          Receita
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase">Receita Total</p>
                          <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} />
                          </div>
                        </div>
                        <h4 className="text-2xl font-bold text-slate-800">
                          {currentTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider">No período selecionado</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase">Despesas</p>
                          <div className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} />
                          </div>
                        </div>
                        <h4 className="text-2xl font-bold text-slate-800">
                          {currentTotalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-bold mt-2 uppercase tracking-wider">No período selecionado</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase">Lucro Líquido</p>
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                            <DollarSign size={16} />
                          </div>
                        </div>
                        <h4 className={`text-2xl font-bold ${currentNetProfit >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {currentNetProfit.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-blue-500 font-bold mt-2">Margem de {currentProfitMargin.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Histórico Financeiro</h3>
                        <span className="text-xs font-bold text-slate-400 uppercase">{filteredTransactions.length} transações</span>
                      </div>
                      
                      {/* Desktop View */}
                      <div className="hidden md:block">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                              <th className="px-6 py-4">Data</th>
                              <th className="px-6 py-4">Descrição</th>
                              <th className="px-6 py-4">Categoria</th>
                              <th className="px-6 py-4">Pagamento</th>
                              <th className="px-6 py-4 text-right">Valor</th>
                              <th className="px-6 py-4"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredTransactions.map((t) => (
                              <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm text-slate-500">
                                  {formatDate(t.date)}
                                </td>
                                <td className="px-6 py-4">
                                  <p className="font-bold text-slate-800">{t.description}</p>
                                  {t.patient_name && <p className="text-[10px] text-slate-400 uppercase font-bold">Paciente: {t.patient_name}</p>}
                                </td>
                                <td className="px-6 py-4">
                                  <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded uppercase">{t.category}</span>
                                </td>
                                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                                  {t.payment_method}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => generateReceipt(t)}
                                      className="p-2 text-slate-300 hover:text-emerald-600 transition-colors"
                                      title="Gerar Recibo"
                                    >
                                      <FileText size={16} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTransaction(t.id)}
                                      className="p-2 text-slate-300 hover:text-rose-600 transition-colors"
                                      title="Excluir"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {filteredTransactions.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                  Nenhuma transação encontrada no período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile View */}
                      <div className="md:hidden divide-y divide-slate-100">
                        {filteredTransactions.map((t) => (
                          <div key={t.id} className="p-4 flex justify-between items-center">
                            <div className="min-w-0 flex-1 pr-4">
                              <p className="font-bold text-slate-800 text-sm truncate">{t.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400">{formatDate(t.date)}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">• {t.category}</span>
                              </div>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <p className={`font-bold text-sm ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {t.type === 'INCOME' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </p>
                                <div className="flex justify-end gap-2 mt-1">
                                  <button onClick={() => generateReceipt(t)} className="text-[10px] text-emerald-600 font-bold uppercase">Recibo</button>
                                  <button onClick={() => handleDeleteTransaction(t.id)} className="text-[10px] text-rose-500 font-bold uppercase">Excluir</button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {filteredTransactions.length === 0 && (
                          <div className="p-8 text-center text-slate-400">
                            Nenhuma transação encontrada.
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Total a Receber</p>
                        <h4 className="text-xl font-bold text-slate-800">
                          {(financialSummary?.pendingInstallmentsTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase">{financialSummary?.pendingInstallmentsCount || 0} parcelas pendentes</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Total em Atraso</p>
                        <h4 className="text-xl font-bold text-rose-600">
                          {(financialSummary?.overdueInstallmentsTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase">{financialSummary?.overdueInstallmentsCount || 0} parcelas atrasadas</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Recebido Hoje</p>
                        <h4 className="text-xl font-bold text-emerald-600">
                          {(financialSummary?.todayRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-emerald-500 font-bold mt-1 uppercase">Pagamentos confirmados</p>
                      </div>
                      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <p className="text-xs font-bold text-slate-400 uppercase mb-2">Receita Mensal</p>
                        <h4 className="text-xl font-bold text-blue-600">
                          {(financialSummary?.monthlyRevenue || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </h4>
                        <p className="text-[10px] text-blue-500 font-bold mt-1 uppercase">Mês atual</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h3 className="font-bold text-slate-800">Planos de Parcelamento Ativos</h3>
                        <button 
                          onClick={() => setIsPaymentPlanModalOpen(true)}
                          className="text-xs font-bold text-emerald-600 flex items-center gap-1 hover:underline w-full sm:w-auto justify-center sm:justify-start py-2 sm:py-0 border sm:border-0 border-emerald-100 rounded-lg sm:rounded-none"
                        >
                          <Plus size={14} /> Novo Plano
                        </button>
                      </div>
                      
                      <div className="hidden md:block w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                              <th className="px-6 py-4">Paciente</th>
                              <th className="px-6 py-4 hidden md:table-cell">Procedimento</th>
                              <th className="px-6 py-4 hidden sm:table-cell">Progresso</th>
                              <th className="px-6 py-4 text-right">Valor Total</th>
                              <th className="px-6 py-4 hidden md:table-cell">Status</th>
                              <th className="px-6 py-4 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {paymentPlans.map(plan => {
                              const planInstallments = installments.filter(i => i.payment_plan_id === plan.id);
                              const paidCount = planInstallments.filter(i => i.status === 'PAID').length;
                              const progress = (paidCount / plan.installments_count) * 100;
                              
                              return (
                                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-bold text-slate-800 break-words">
                                      {plan.patient?.name || plan.patient_name || "Paciente não identificado"}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 break-words hidden md:table-cell">{plan.procedure}</td>
                                  <td className="px-6 py-4 hidden sm:table-cell">
                                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progress}%` }} />
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{paidCount}/{plan.installments_count} parcelas pagas</p>
                                  </td>
                                  <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    {Number(plan.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </td>
                                  <td className="px-6 py-4 hidden md:table-cell">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                      plan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                      {plan.status === 'COMPLETED' ? 'Concluído' : 'Em Aberto'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                      <button 
                                        onClick={() => {
                                          const nextInstallment = planInstallments.find(i => i.status === 'PENDING');
                                          if (nextInstallment) {
                                            setSelectedInstallment({...nextInstallment, procedure: plan.procedure, patient_name: plan.patient_name});
                                            setIsReceiveInstallmentModalOpen(true);
                                          } else {
                                            alert('Todas as parcelas deste plano já foram pagas.');
                                          }
                                        }}
                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                        title="Receber Parcela"
                                      >
                                        <DollarSign size={16} />
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setSelectedPlan(plan);
                                          setIsViewInstallmentsModalOpen(true);
                                        }}
                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="Ver Parcelas"
                                      >
                                        <ClipboardList size={16} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                            {paymentPlans.length === 0 && (
                              <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">Nenhum plano de parcelamento encontrado.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Card View */}
                      <div className="md:hidden p-4 space-y-3 bg-slate-50/50">
                        {paymentPlans.map(plan => {
                          const planInstallments = installments.filter(i => i.payment_plan_id === plan.id);
                          const paidCount = planInstallments.filter(i => i.status === 'PAID').length;
                          const progress = (paidCount / plan.installments_count) * 100;
                          
                          return (
                            <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                              <div className="flex justify-between items-start mb-3">
                                <div className="max-w-[70%]">
                                  <p className="font-bold text-slate-800 leading-tight mb-1">{plan.patient?.name || plan.patient_name || "Paciente não identificado"}</p>
                                  <p className="text-xs text-slate-500 truncate">{plan.procedure}</p>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${
                                  plan.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {plan.status === 'COMPLETED' ? 'Concluído' : 'Em Aberto'}
                                </span>
                              </div>
                              
                              <div className="mb-4">
                                <div className="flex justify-between items-center mb-1">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">Progresso</p>
                                  <p className="text-[10px] font-bold text-slate-600">{paidCount}/{plan.installments_count} parcelas</p>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                  <div className="bg-emerald-500 h-full transition-all" style={{ width: `${progress}%` }} />
                                </div>
                              </div>
                              
                              <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                                <div>
                                  <p className="text-[10px] text-slate-400 uppercase font-bold">Valor Total</p>
                                  <p className="font-bold text-slate-700">
                                    {Number(plan.total_amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      const nextInstallment = planInstallments.find(i => i.status === 'PENDING');
                                      if (nextInstallment) {
                                        setSelectedInstallment({...nextInstallment, procedure: plan.procedure, patient_name: plan.patient_name});
                                        setIsReceiveInstallmentModalOpen(true);
                                      } else {
                                        alert('Todas as parcelas deste plano já foram pagas.');
                                      }
                                    }}
                                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-lg font-bold text-xs hover:bg-emerald-100 transition-colors"
                                  >
                                    <DollarSign size={14} />
                                    Receber
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setSelectedPlan(plan);
                                      setIsViewInstallmentsModalOpen(true);
                                    }}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-100"
                                  >
                                    <ClipboardList size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {paymentPlans.length === 0 && (
                          <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-200">
                            <p className="text-slate-400 text-sm italic">Nenhum plano de parcelamento encontrado.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(activeTab === 'admin' && user?.role?.toUpperCase() === 'ADMIN') && (
              <div className="max-w-screen-xl mx-auto space-y-8">
                {/* Painel de Aprovação */}
                {adminUsers.filter(u => u.status === 'pending').length > 0 && (
                  <div className="bg-amber-50 p-4 md:p-8 rounded-3xl border border-amber-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                        <Clock size={20} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-amber-900">Aprovação de Novos Dentistas</h3>
                        <p className="text-amber-700 text-sm">Existem solicitações de cadastro pendentes</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {adminUsers.filter(u => u.status === 'pending').map(u => (
                        <div key={u.id} className="bg-white p-4 rounded-2xl border border-amber-100 flex justify-between items-center">
                          <div>
                            <p className="font-bold text-slate-800">{u.name}</p>
                            <p className="text-xs text-slate-500">{u.email}</p>
                          </div>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => updateUserStatus(u.id, 'active')}
                              className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                              title="Aprovar"
                            >
                              <CheckCircle2 size={16} />
                            </button>
                            <button 
                              onClick={() => updateUserStatus(u.id, 'blocked')}
                              className="p-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                              title="Rejeitar"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Gestão de Dentistas */}
                <div className="bg-white p-4 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-900">Gestão de Dentistas</h3>
                      <p className="text-slate-500 text-sm">Gerencie os profissionais da sua clínica</p>
                    </div>
                    <button 
                      onClick={() => setIsDentistModalOpen(true)}
                      className="w-full sm:w-auto bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <UserPlus size={20} />
                      Adicionar Dentista
                    </button>
                  </div>

                  <div className="mb-6 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="text"
                        placeholder="Buscar dentista por nome ou e-mail..."
                        value={dentistSearchTerm}
                        onChange={(e) => setDentistSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <div className="sm:w-48">
                      <select
                        value={dentistStatusFilter}
                        onChange={(e) => setDentistStatusFilter(e.target.value as any)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-600 font-medium"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="active">Ativos</option>
                        <option value="blocked">Bloqueados</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                            <th className="px-6 py-4">Usuário</th>
                            <th className="px-6 py-4">E-mail</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {adminUsers
                            .filter(u => u.status !== 'pending')
                            .filter(u => 
                              !dentistSearchTerm || 
                              u.name?.toLowerCase().includes(dentistSearchTerm.toLowerCase()) || 
                              u.email?.toLowerCase().includes(dentistSearchTerm.toLowerCase())
                            )
                            .filter(u => dentistStatusFilter === 'all' || u.status === dentistStatusFilter)
                            .map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                                    {(u.name || '?').charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-800">{u.name}</p>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold">{u.role}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-slate-500 text-sm">{u.email}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-rose-100 text-rose-700'
                                }`}>
                                  {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setEditingDentist(u);
                                      setIsEditDentistModalOpen(true);
                                    }}
                                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                                  >
                                    Editar
                                  </button>
                                  {u.status !== 'active' && (
                                    <button 
                                      onClick={() => updateUserStatus(u.id, 'active')}
                                      className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                      Ativar
                                    </button>
                                  )}
                                  {u.status !== 'blocked' && u.role !== 'ADMIN' && (
                                    <button 
                                      onClick={() => updateUserStatus(u.id, 'blocked')}
                                      className="px-3 py-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition-colors"
                                    >
                                      Desativar
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {adminUsers
                        .filter(u => u.status !== 'pending')
                        .filter(u => 
                          !dentistSearchTerm || 
                          u.name?.toLowerCase().includes(dentistSearchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(dentistSearchTerm.toLowerCase())
                        )
                        .filter(u => dentistStatusFilter === 'all' || u.status === dentistStatusFilter)
                        .map((u) => (
                        <div key={u.id} className="p-4 space-y-4">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                                {(u.name || '?').charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{u.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{u.role}</p>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {u.status === 'active' ? 'Ativo' : 'Bloqueado'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">{u.email}</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingDentist(u);
                                setIsEditDentistModalOpen(true);
                              }}
                              className="flex-1 py-2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg hover:bg-slate-200 transition-colors"
                            >
                              Editar
                            </button>
                            {u.status !== 'active' && (
                              <button 
                                onClick={() => updateUserStatus(u.id, 'active')}
                                className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors"
                              >
                                Ativar
                              </button>
                            )}
                            {u.status !== 'blocked' && u.role !== 'ADMIN' && (
                              <button 
                                onClick={() => updateUserStatus(u.id, 'blocked')}
                                className="flex-1 py-2 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition-colors"
                              >
                                Desativar
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'documentos' && (
              <Documents patients={patients} profile={profile} apiFetch={apiFetch} imprimirDocumento={imprimirDocumento} />
            )}

            {activeTab === 'configuracoes' && profile && (
              <div className="max-w-screen-xl mx-auto space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-emerald-50 shadow-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        {profile.photo_url ? (
                          <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserCircle size={80} />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg cursor-pointer hover:bg-emerald-700 transition-all">
                        <Camera size={18} />
                        <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                      </label>
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 mt-4">Perfil do Usuário</h3>
                    <p className="text-slate-500">Mantenha seus dados atualizados</p>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Completo</label>
                        <input 
                          required
                          type="text" 
                          value={profile.name}
                          onChange={(e) => setProfile({...profile, name: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                        <input 
                          required
                          type="email" 
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Telefone</label>
                        <input 
                          type="text" 
                          value={profile.phone || ''}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      {user.role === 'DENTIST' && (
                        <>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">CRO</label>
                            <input 
                              type="text" 
                              value={profile.cro || ''}
                              onChange={(e) => setProfile({...profile, cro: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              placeholder="Ex: 12345-SP"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Especialidade</label>
                            <input 
                              type="text" 
                              value={profile.specialty || ''}
                              onChange={(e) => setProfile({...profile, specialty: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              placeholder="Ex: Ortodontia"
                            />
                          </div>
                        </>
                      )}
                      {user.role === 'DENTIST' && (
                        <>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome da Clínica</label>
                            <input 
                              type="text" 
                              value={profile.clinic_name || ''}
                              onChange={(e) => setProfile({...profile, clinic_name: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              placeholder="Ex: Clínica Sorriso Perfeito"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Endereço da Clínica</label>
                            <input 
                              type="text" 
                              value={profile.clinic_address || ''}
                              onChange={(e) => setProfile({...profile, clinic_address: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                              placeholder="Rua Exemplo, 123 - Centro"
                            />
                          </div>
                        </>
                      )}
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Alterar Senha</label>
                        <input 
                          type="password" 
                          value={profilePassword}
                          onChange={(e) => setProfilePassword(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          placeholder="Deixe em branco para manter a atual"
                        />
                      </div>
                    </div>

                    {user.role === 'DENTIST' && (
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Bio / Descrição Profissional</label>
                        <textarea 
                          rows={4}
                          value={profile.bio || ''}
                          onChange={(e) => setProfile({...profile, bio: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                          placeholder="Conte um pouco sobre sua trajetória e formação..."
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit"
                        disabled={isSavingProfile}
                        className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <FileText className="text-emerald-600" />
                    Informações Legais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link 
                      to="/termos" 
                      target="_blank"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-emerald-200 transition-all"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Termos de Uso</p>
                        <p className="text-[10px] text-slate-500">Leia as regras de uso da plataforma</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={16} />
                    </Link>
                    <Link 
                      to="/privacidade" 
                      target="_blank"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-emerald-200 transition-all"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Política de Privacidade</p>
                        <p className="text-[10px] text-slate-500">Saiba como cuidamos dos seus dados</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" size={16} />
                    </Link>
                  </div>
                  <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-2">
                      <CheckCircle2 size={14} />
                      TERMOS ACEITOS EM: {profile.accepted_terms_at ? new Date(profile.accepted_terms_at).toLocaleString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Modal de Exportação */}
      <AnimatePresence>
        {isExportModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Download className="text-emerald-600" size={24} />
                  Exportar Dados
                </h3>
                <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-sm text-slate-500">
                  Selecione os filtros para exportar os dados em formato Excel (.xlsx).
                </p>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                        {exportType === 'patients' ? 'Cadastrados desde' : 'Data Inicial'}
                      </label>
                      <input 
                        type="date" 
                        value={exportFilters.startDate}
                        onChange={(e) => setExportFilters({...exportFilters, startDate: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">
                        {exportType === 'patients' ? 'Cadastrados até' : 'Data Final'}
                      </label>
                      <input 
                        type="date" 
                        value={exportFilters.endDate}
                        onChange={(e) => setExportFilters({...exportFilters, endDate: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Paciente</label>
                    <select 
                      value={exportFilters.patientId}
                      onChange={(e) => setExportFilters({...exportFilters, patientId: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="all">Todos os Pacientes</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {exportType === 'finance' && (
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Tipo de Transação</label>
                      <select 
                        value={exportFilters.category}
                        onChange={(e) => setExportFilters({...exportFilters, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        <option value="all">Receitas + Despesas</option>
                        <option value="income">Apenas Receitas</option>
                        <option value="expense">Apenas Despesas</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setIsExportModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={exportType === 'patients' ? exportPatients : exportFinance}
                    className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Exportar Agora
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Agendamento */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900">Novo Agendamento</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreateAppointment} className="space-y-6">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Paciente</label>
                    <select 
                      required
                      value={newAppointment.patient_id}
                      onChange={(e) => setNewAppointment({...newAppointment, patient_id: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="">Selecione um paciente</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Início</label>
                      <input 
                        required
                        type="datetime-local" 
                        value={newAppointment.start_time}
                        onChange={(e) => setNewAppointment({...newAppointment, start_time: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Término</label>
                      <input 
                        required
                        type="datetime-local" 
                        value={newAppointment.end_time}
                        onChange={(e) => setNewAppointment({...newAppointment, end_time: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Observações</label>
                    <textarea 
                      rows={3}
                      value={newAppointment.notes}
                      onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                      placeholder="Ex: Paciente com dor aguda no molar..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Confirmar Agendamento
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Novo Paciente */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPatientModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900">Cadastrar Paciente</h3>
                  <button onClick={() => setIsPatientModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreatePatient} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">CPF</label>
                      <input 
                        type="text" 
                        value={newPatient.cpf}
                        onChange={(e) => setNewPatient({...newPatient, cpf: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nascimento</label>
                      <input 
                        type="date" 
                        value={newPatient.birth_date}
                        onChange={(e) => setNewPatient({...newPatient, birth_date: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Telefone</label>
                      <input 
                        required
                        type="text" 
                        value={newPatient.phone}
                        onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                      <input 
                        type="email" 
                        value={newPatient.email}
                        onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Endereço</label>
                    <input 
                      type="text" 
                      value={newPatient.address}
                      onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsPatientModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Cadastrar Paciente
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Editar Dentista */}
      <AnimatePresence>
        {isEditDentistModalOpen && editingDentist && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditDentistModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Editar Dentista</h3>
                  <button onClick={() => setIsEditDentistModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleUpdateDentist} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={editingDentist.name}
                      onChange={(e) => setEditingDentist({...editingDentist, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={editingDentist.email}
                      onChange={(e) => setEditingDentist({...editingDentist, email: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsEditDentistModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Plano de Parcelamento */}
      <AnimatePresence>
        {isPaymentPlanModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPaymentPlanModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900">Novo Plano de Pagamento</h3>
                  <button onClick={() => setIsPaymentPlanModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreatePaymentPlan} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Paciente</label>
                    {selectedPatient ? (
                      <input 
                        readOnly
                        type="text"
                        value={selectedPatient.name}
                        className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                      />
                    ) : (
                      <select 
                        required
                        value={newPaymentPlan.patient_id}
                        onChange={(e) => setNewPaymentPlan({...newPaymentPlan, patient_id: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        <option value="">Selecione um paciente</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Procedimento / Tratamento</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Tratamento de Canal, Implante..."
                      value={newPaymentPlan.procedure}
                      onChange={(e) => setNewPaymentPlan({...newPaymentPlan, procedure: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Valor Total (R$)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        value={newPaymentPlan.total_amount}
                        onChange={(e) => setNewPaymentPlan({...newPaymentPlan, total_amount: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nº de Parcelas</label>
                      <select 
                        required
                        value={newPaymentPlan.installments_count}
                        onChange={(e) => setNewPaymentPlan({...newPaymentPlan, installments_count: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 10, 12, 18, 24].map(n => (
                          <option key={n} value={n}>{n}x</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Data do Primeiro Vencimento</label>
                    <input 
                      required
                      type="date" 
                      value={newPaymentPlan.first_due_date}
                      onChange={(e) => setNewPaymentPlan({...newPaymentPlan, first_due_date: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsPaymentPlanModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Criar Plano
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Recibo */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 receipt-modal-overlay">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm no-print"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-2xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto receipt-content"
            >
              <div className="p-8 md:p-12 bg-white text-slate-800 font-serif">
                <div className="flex justify-between items-start mb-12 no-print">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
                      <Plus size={24} strokeWidth={3} />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-800">OdontoHub</h1>
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => imprimirDocumento('recibo', selectedReceipt.id)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                      title="Imprimir"
                    >
                      <Printer size={20} />
                    </button>
                    <button 
                      onClick={() => setIsReceiptModalOpen(false)}
                      className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                      <Plus size={24} className="rotate-45" />
                    </button>
                  </div>
                </div>

                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold uppercase tracking-widest border-b-2 border-slate-200 pb-4 inline-block px-12">Recibo</h2>
                  <p className="hidden print:block text-[10px] text-slate-400 mt-2 uppercase tracking-widest">Via do Paciente</p>
                </div>

                <div className="space-y-8 text-lg leading-relaxed">
                  <p>
                    Recebi de <span className="font-bold border-b border-slate-300 px-2">{selectedReceipt.patientName}</span>, 
                    a importância de <span className="font-bold border-b border-slate-300 px-2">{selectedReceipt.amountFormatted}</span>, 
                    referente ao procedimento de <span className="font-bold border-b border-slate-300 px-2">{selectedReceipt.procedure}</span>.
                  </p>

                  <div className="flex justify-between items-center py-4">
                    <p>Forma de Pagamento: <span className="font-bold">{selectedReceipt.paymentMethod}</span></p>
                    <p>Data: <span className="font-bold">{selectedReceipt.date}</span></p>
                  </div>

                  <div className="pt-16 flex flex-col items-center">
                    <div className="w-64 border-t border-slate-400 mb-2"></div>
                    <p className="font-bold text-xl">{selectedReceipt.dentistName}</p>
                    <p className="text-slate-500 uppercase tracking-widest text-sm">CRO: {selectedReceipt.dentistCro || 'XXXXX'}</p>
                  </div>

                  <div className="pt-12 text-sm text-slate-400 text-center italic">
                    <p>{selectedReceipt.clinicName}</p>
                    <p>{selectedReceipt.clinicAddress}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Dentista */}
      <AnimatePresence>
        {isDentistModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDentistModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Novo Dentista</h3>
                  <button onClick={() => setIsDentistModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreateDentist} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nome Completo</label>
                    <input 
                      required
                      type="text" 
                      value={newDentist.name}
                      onChange={(e) => setNewDentist({...newDentist, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={newDentist.email}
                      onChange={(e) => setNewDentist({...newDentist, email: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Senha</label>
                    <input 
                      required
                      type="password" 
                      value={newDentist.password}
                      onChange={(e) => setNewDentist({...newDentist, password: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsDentistModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Cadastrar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Upload de Imagem */}
      <AnimatePresence>
        {isImageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImageModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Upload de Imagem</h3>
                  <button onClick={() => setIsImageModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleUploadImage} className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Arquivo de Imagem</label>
                    <div className="relative group">
                      <input 
                        required={!newImage.url}
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all group overflow-hidden"
                      >
                        {newImage.url ? (
                          <div className="relative w-full h-full p-2">
                            <img src={newImage.url} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <p className="text-white text-xs font-bold">Alterar Imagem</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-emerald-600">
                            <Upload size={32} />
                            <span className="text-xs font-bold uppercase">Clique para selecionar arquivo</span>
                            <span className="text-[10px] text-slate-400">PNG, JPG ou GIF</span>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Descrição</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: RX Panorâmico"
                      value={newImage.description}
                      onChange={(e) => setNewImage({...newImage, description: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsImageModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Transação Financeira */}
      <AnimatePresence>
        {isTransactionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTransactionModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {transactionType === 'INCOME' ? 'Nova Receita' : 'Nova Despesa'}
                    </h3>
                    <p className="text-sm text-slate-500">Preencha os dados da transação abaixo</p>
                  </div>
                  <button onClick={() => setIsTransactionModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleSaveTransaction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Descrição</label>
                      <input 
                        required
                        type="text" 
                        placeholder={transactionType === 'INCOME' ? 'Ex: Limpeza - João Silva' : 'Ex: Aluguel'}
                        value={newTransaction.description}
                        onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Categoria</label>
                      <select 
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        {transactionType === 'INCOME' ? (
                          <>
                            <option value="Procedimentos">Procedimentos</option>
                            <option value="Consultas">Consultas</option>
                            <option value="Produtos">Produtos</option>
                            <option value="Outros">Outros</option>
                          </>
                        ) : (
                          <>
                            <option value="Aluguel">Aluguel</option>
                            <option value="Materiais">Materiais</option>
                            <option value="Laboratório">Laboratório</option>
                            <option value="Marketing">Marketing</option>
                            <option value="Salários">Salários</option>
                            <option value="Outros">Outros</option>
                          </>
                        )}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Valor (R$)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        value={newTransaction.amount}
                        onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Data</label>
                      <input 
                        required
                        type="date" 
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Forma de Pagamento</label>
                      <select 
                        value={newTransaction.payment_method}
                        onChange={(e) => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="PIX">PIX</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Transferência">Transferência</option>
                      </select>
                    </div>

                    {transactionType === 'INCOME' && (
                      <>
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Paciente (Opcional)</label>
                          <select 
                            value={newTransaction.patient_id}
                            onChange={(e) => setNewTransaction({...newTransaction, patient_id: e.target.value})}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          >
                            <option value="">Selecione um paciente</option>
                            {patients.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Procedimento (Opcional)</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Limpeza, Canal..."
                            value={newTransaction.procedure}
                            onChange={(e) => setNewTransaction({...newTransaction, procedure: e.target.value})}
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Observações</label>
                      <textarea 
                        rows={2}
                        value={newTransaction.notes}
                        onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsTransactionModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className={`flex-1 px-6 py-3 text-white font-bold rounded-xl shadow-lg transition-all active:scale-95 ${
                        transactionType === 'INCOME' 
                          ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' 
                          : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700'
                      }`}
                    >
                      Salvar {transactionType === 'INCOME' ? 'Receita' : 'Despesa'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Receber Parcela */}
      <AnimatePresence>
        {isReceiveInstallmentModalOpen && selectedInstallment && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Receber Parcela</h3>
                    <p className="text-xs text-slate-500">Confirme o recebimento do pagamento</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReceiveInstallmentModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6 overflow-y-auto">
                <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Paciente</span>
                    <span className="text-sm font-semibold text-slate-700">{selectedPatient?.name || selectedInstallment.patient_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Procedimento</span>
                    <span className="text-sm font-semibold text-slate-700">{selectedInstallment.procedure || selectedInstallment.procedure_name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">Parcela</span>
                    <span className="text-sm font-semibold text-slate-700">{selectedInstallment.installment_number}</span>
                  </div>
                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800">Valor</span>
                    <span className="text-lg font-bold text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedInstallment.amount)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Forma de Pagamento</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Dinheiro', 'Pix', 'Cartão de Crédito', 'Cartão de Débito'].map((method) => (
                      <button
                        key={method}
                        onClick={() => setPaymentMethod(method)}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                          paymentMethod === method
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setIsReceiveInstallmentModalOpen(false)}
                    className="flex-1 py-3 px-4 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handlePayInstallment(selectedInstallment.id, paymentMethod)}
                    className="flex-1 py-3 px-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
                  >
                    Confirmar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Ver Parcelas */}
      <AnimatePresence>
        {isViewInstallmentsModalOpen && selectedPlan && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <List size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Parcelas do Plano</h3>
                    <p className="text-xs text-slate-500">{selectedPlan.procedure} - {selectedPatient?.name || selectedPlan.patient_name}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsViewInstallmentsModalOpen(false)}
                  className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">Parcela</th>
                        <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">Valor</th>
                        <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">Vencimento</th>
                        <th className="text-left py-3 text-xs font-bold text-slate-400 uppercase">Status</th>
                        <th className="text-right py-3 text-xs font-bold text-slate-400 uppercase">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {installments
                        .filter(inst => inst.payment_plan_id === selectedPlan.id)
                        .sort((a, b) => a.installment_number - b.installment_number)
                        .map((inst) => (
                          <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 text-sm font-medium text-slate-700">{inst.installment_number}ª</td>
                            <td className="py-4 text-sm font-bold text-slate-900">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}
                            </td>
                            <td className="py-4 text-sm text-slate-500">
                              {formatDate(inst.due_date)}
                            </td>
                            <td className="py-4">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                inst.status === 'PAID'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : isOverdue(inst.due_date)
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {inst.status === 'PAID' ? 'Pago' : isOverdue(inst.due_date) ? 'Atrasado' : 'Pendente'}
                              </span>
                            </td>
                            <td className="py-4 text-right">
                              {inst.status === 'PENDING' && (
                                  <button
                                    onClick={() => {
                                      setIsViewInstallmentsModalOpen(false);
                                      setSelectedInstallment(inst);
                                      setIsReceiveInstallmentModalOpen(true);
                                    }}
                                    className="text-emerald-600 hover:text-emerald-700 font-bold text-xs bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
                                  >
                                  Receber
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-20 md:bottom-8 right-6 z-40 lg:hidden hidden md:flex flex-col gap-3 no-print">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          title="Novo Agendamento"
        >
          <Calendar size={24} />
        </button>
        <button 
          onClick={() => setIsPatientModalOpen(true)}
          className="w-14 h-14 bg-emerald-600 text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
          title="Novo Paciente"
        >
          <Plus size={28} />
        </button>
      </div>
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-emerald-600 border-emerald-500 text-white' 
                : 'bg-rose-600 border-rose-500 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmation && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar Ação</h3>
                <p className="text-slate-600">{confirmation.message}</p>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setConfirmation(null)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                  }}
                  className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
        )
      } />
    </Routes>
  );
}

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await fetch('/api/auth/request-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
              <Plus size={32} strokeWidth={3} />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Recuperar Senha</h1>
            <p className="text-slate-500">Digite seu e-mail para receber as instruções</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  placeholder="exemplo@clinica.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Instruções'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-emerald-600 font-bold hover:underline">
              Voltar para o login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const token = new URLSearchParams(location.search).get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setMessage(data.message);
        setTimeout(() => navigate('/'), 3000);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md">
          <AlertTriangle className="mx-auto text-rose-500 mb-4" size={48} />
          <h1 className="text-2xl font-bold mb-2">Link Inválido</h1>
          <p className="text-slate-500 mb-6">Este link de recuperação de senha é inválido ou expirou.</p>
          <Link to="/" className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold inline-block">
            Voltar para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        <div className="p-8 md:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-200">
              <Lock size={32} strokeWidth={3} />
            </div>
          </div>
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Nova Senha</h1>
            <p className="text-slate-500">Crie uma nova senha segura para sua conta</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Confirmar Nova Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 text-sm">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || success}
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Processando...' : 'Redefinir Senha'}
            </button>
          </form>

          {success && (
            <div className="mt-6 text-center text-sm text-slate-500">
              Redirecionando para o login em instantes...
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// Print Components
function PrintLayout({ children, title, onPrint }: { children: React.ReactNode, title: string, onPrint: () => void }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="bg-slate-50 py-4 md:py-8 font-sans text-slate-900">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8 no-print">
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          <div className="flex gap-4">
            <button 
              onClick={() => window.close()}
              className="px-6 py-2 bg-white text-slate-600 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all"
            >
              Fechar
            </button>
            <button 
              onClick={onPrint}
              className="print-btn flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
            >
              <Printer size={20} />
              Imprimir Agora
            </button>
          </div>
        </div>
        <div className="print-container bg-white shadow-xl">
          {children}
        </div>
      </div>
    </div>
  );
}

function PrintAgenda({ date, appointments, profile }: { date: Date, appointments: Appointment[], profile: Dentist | null }) {
  const dayAppointments = appointments
    .filter(a => new Date(a.start_time).toDateString() === date.toDateString())
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  return (
    <PrintLayout title="Agenda do Dia" onPrint={() => window.print()}>
      <div className="border-b-4 border-slate-900 pb-8 mb-10">
        <h1 className="text-4xl font-black text-slate-900 mb-2 uppercase tracking-tight">Agenda do Dia</h1>
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-bold text-slate-700 capitalize">
              {date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-xl text-slate-500 mt-1">
              {profile?.name || 'Dr. Samuel Godoy'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-slate-900">
              Total: {dayAppointments.length} consultas
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {dayAppointments.map((app) => (
          <div key={app.id} className="flex gap-8 pb-8 border-b border-slate-200 last:border-0">
            <div className="w-8 h-8 border-2 border-slate-400 rounded flex-shrink-0 mt-1" />
            <div className="flex-1">
              <div className="flex justify-between items-start mb-2">
                <p className="text-2xl font-black text-slate-900">
                  {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  <span className="mx-3 text-slate-300">—</span>
                  {app.patient_name}
                </p>
                <span className="text-sm font-black text-slate-400 border border-slate-200 px-3 py-1 rounded-lg uppercase tracking-widest">
                  {app.status === 'SCHEDULED' ? 'Agendado' : 
                   app.status === 'CONFIRMED' ? 'Confirmado' : 
                   app.status === 'CANCELLED' ? 'Cancelado' : 
                   app.status === 'IN_PROGRESS' ? 'Em Atendimento' : 'Finalizado'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <p className="text-slate-700 text-lg">
                  <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">Observações</span>
                  {app.notes || 'Nenhuma observação'}
                </p>
                <p className="text-slate-700 text-lg">
                  <span className="font-bold text-slate-400 uppercase text-xs tracking-wider block mb-0.5">Dentista</span>
                  {app.dentist_name}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </PrintLayout>
  );
}

function PrintReceipt({ transaction, installment, profile, patients, paymentPlans }: any) {
  const data = transaction || installment;
  if (!data) return <div className="p-8 text-center text-slate-500">Documento não encontrado.</div>;

  const patient = patients.find((p: any) => p.id === data.patient_id);
  const plan = installment ? paymentPlans.find((p: any) => p.id === data.payment_plan_id) : null;

  return (
    <PrintLayout title="Recibo" onPrint={() => window.print()}>
      <div className="p-12 bg-white text-slate-800 font-serif border border-slate-200">
        <div className="flex justify-between items-start mb-16">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white">
              <Plus size={28} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-800">OdontoHub</h1>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-serif italic text-slate-400 mb-1">Recibo</h2>
            <p className="text-sm font-sans font-bold text-slate-500 uppercase tracking-widest">Nº {data.id.toString().padStart(6, '0')}</p>
          </div>
        </div>

        <div className="space-y-10 text-lg leading-relaxed">
          <p>
            Recebemos de <span className="font-bold border-b-2 border-slate-200 px-2">{patient?.name || data.patient_name || '________________________________'}</span>, 
            a importância de <span className="font-bold border-b-2 border-slate-200 px-2">R$ {data.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span> 
            (<span className="italic text-slate-500">________________________________________________</span>).
          </p>

          <p>
            Referente a <span className="font-bold border-b-2 border-slate-200 px-2">{data.procedure || plan?.procedure || data.description || 'tratamento odontológico'}</span>.
          </p>

          <div className="pt-10 flex justify-between items-end">
            <div>
              <p className="text-slate-500 mb-1">Data do Pagamento</p>
              <p className="font-bold text-xl">{new Date(data.date || data.payment_date || data.due_date).toLocaleDateString('pt-BR')}</p>
            </div>
            <div className="text-center w-64">
              <div className="border-b-2 border-slate-900 mb-2"></div>
              <p className="font-bold text-slate-800">{profile?.name || 'Assinatura do Responsável'}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{profile?.cro ? `CRO: ${profile.cro}` : 'Cirurgião Dentista'}</p>
            </div>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}

function PrintReport({ profile, transactions, patients, appointments }: any) {
  const summary = {
    totalIncome: transactions.filter((t: any) => t.type === 'INCOME').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
    totalExpense: transactions.filter((t: any) => t.type === 'EXPENSE').reduce((acc: number, t: any) => acc + Number(t.amount), 0),
    totalPatients: patients.length,
    totalAppointments: appointments.length
  };

  return (
    <PrintLayout title="Relatório Financeiro" onPrint={() => window.print()}>
      <div className="p-12 bg-white text-slate-800 font-sans">
        <div className="flex justify-between items-start mb-16 border-b-4 border-slate-900 pb-8">
          <div>
            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight mb-2">Relatório Geral</h1>
            <p className="text-xl text-slate-500 font-medium">Resumo de Atividades e Financeiro</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Data de Emissão</p>
            <p className="text-xl font-bold text-slate-900">{new Date().toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mb-16">
          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Resumo Financeiro</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total de Entradas</span>
                <span className="text-2xl font-black text-emerald-600">
                  {summary.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Total de Saídas</span>
                <span className="text-2xl font-black text-rose-600">
                  {summary.totalExpense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t-2 border-slate-900">
                <span className="text-lg font-black text-slate-900 uppercase">Saldo Final</span>
                <span className={`text-3xl font-black ${(summary.totalIncome - summary.totalExpense) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {(summary.totalIncome - summary.totalExpense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Estatísticas Gerais</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Pacientes</p>
                <p className="text-4xl font-black text-slate-900">{summary.totalPatients}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Consultas</p>
                <p className="text-4xl font-black text-slate-900">{summary.totalAppointments}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] border-b border-slate-100 pb-2">Últimas Transações</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-widest">
                <th className="pb-4 font-black">Data</th>
                <th className="pb-4 font-black">Descrição</th>
                <th className="pb-4 font-black">Tipo</th>
                <th className="pb-4 font-black text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="text-slate-700">
              {transactions.slice(0, 15).map((t: any) => (
                <tr key={t.id} className="border-b border-slate-50">
                  <td className="py-4 font-medium">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                  <td className="py-4 font-bold text-slate-900">{t.description}</td>
                  <td className="py-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${t.type === 'INCOME' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`py-4 font-black text-right ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-24 pt-12 border-t border-slate-100 flex justify-between items-end">
          <div>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Clínica</p>
            <p className="text-lg font-bold text-slate-900">{profile?.clinic_name || 'OdontoHub'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Responsável</p>
            <p className="text-lg font-bold text-slate-900">{profile?.name}</p>
          </div>
        </div>
      </div>
    </PrintLayout>
  );
}

function PrintDocument({ profile, patients, apiFetch, appointments, transactions, installments, paymentPlans }: any) {
  const { tipo: type, id } = useParams();
  const [doc, setDoc] = useState<any>(null);
  const [fullPatient, setFullPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDoc = async () => {
      // If it's a generic document from the 'documents' table
      const genericTypes = ['receituario', 'declaracao', 'atestado', 'encaminhamento', 'ficha', 'orcamento'];
      if (type && genericTypes.includes(type) && id) {
        try {
          const res = await apiFetch(`/api/documents/${id}`);
          if (res.ok) {
            const data = await res.json();
            const parsedDoc = {
              ...data,
              content: JSON.parse(data.content)
            };
            setDoc(parsedDoc);
            
            if (data.patient_id) {
              const pRes = await apiFetch(`/api/patients/${data.patient_id}`);
              if (pRes.ok) {
                const pData = await pRes.json();
                setFullPatient(pData);
              }
            }
          }
        } catch (error) {
          console.error('Error fetching document:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    fetchDoc();
  }, [id, type, apiFetch]);

  if (loading) return <div className="bg-white flex items-center justify-center font-bold text-slate-400 py-20">Carregando dados para impressão...</div>;

  // Handle specific non-generic types
  if (type === 'agenda') {
    const dateStr = new URLSearchParams(window.location.search).get('date') || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr + 'T12:00:00');
    return <PrintAgenda date={date} appointments={appointments} profile={profile} />;
  }
  
  if (type === 'recibo') {
    const transaction = transactions.find((t: any) => t.id.toString() === id);
    const installment = installments.find((i: any) => i.id.toString() === id);
    return <PrintReceipt transaction={transaction} installment={installment} profile={profile} patients={patients} paymentPlans={paymentPlans} />;
  }
  
  if (type === 'relatorio') {
    return <PrintReport profile={profile} transactions={transactions} patients={patients} appointments={appointments} />;
  }

  if (!doc && id) return <div className="bg-white flex items-center justify-center font-bold text-slate-400 py-20">Documento não encontrado.</div>;

  const patient = fullPatient || patients.find((p: any) => p.id === doc?.patient_id);
  const content = doc?.content || {};

  return (
    <PrintLayout title={type ? type.charAt(0).toUpperCase() + type.slice(1) : 'Documento'} onPrint={() => window.print()}>
      <div className="bg-white p-[1cm] font-serif text-slate-900">
        {/* Header */}
        <div className="text-center border-b-2 border-emerald-600 pb-6 mb-10">
          <h1 className="text-3xl font-bold text-emerald-800 uppercase tracking-widest">
            {profile?.clinic_name || 'Clínica Odontológica'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {profile?.clinic_address || 'Endereço não informado'}
          </p>
          <p className="text-sm text-slate-500">
            Tel: {profile?.phone || 'Telefone não informado'}
          </p>
        </div>

        {/* Content */}
        <div className="space-y-8 min-h-[15cm]">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold uppercase underline decoration-emerald-600 underline-offset-8">
              {type === 'receituario' ? 'Receituário' : 
               type === 'declaracao' ? 'Declaração' : 
               type === 'atestado' ? 'Atestado' : 
               type === 'encaminhamento' ? 'Encaminhamento' : 
               type === 'ficha' ? 'Ficha Clínica' : 
               type === 'orcamento' ? 'Orçamento' : type}
            </h2>
          </div>

          <div className="space-y-6 text-lg leading-relaxed">
            <p><strong>Paciente:</strong> {patient?.name || '________________________________'}</p>
            <p><strong>Data:</strong> {doc?.created_at ? new Date(doc.created_at).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</p>

            {type === 'receituario' && (
              <div className="mt-10 space-y-8">
                <p className="font-bold text-xl mb-4 text-emerald-800">Uso Interno:</p>
                {content.items?.map((item: any, i: number) => (
                  <div key={i} className="border-l-4 border-emerald-600 pl-4 mb-6">
                    <p className="font-bold text-lg">{item.medication}</p>
                    <p className="text-slate-700 italic">{item.dosage}</p>
                  </div>
                ))}
                {content.instructions && (
                  <div className="mt-8 pt-6 border-t border-slate-100">
                    <p className="font-bold mb-2">Instruções:</p>
                    <p className="text-slate-700 whitespace-pre-wrap">{content.instructions}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'declaracao' && (
              <div className="mt-10">
                <p className="text-justify">
                  Declaro para os devidos fins que o(a) paciente <strong>{patient?.name}</strong> compareceu a esta clínica odontológica na data de <strong>{new Date(doc?.created_at || Date.now()).toLocaleDateString('pt-BR')}</strong> para atendimento odontológico.
                </p>
              </div>
            )}

            {type === 'atestado' && (
              <div className="mt-10 space-y-6">
                <p className="text-justify">
                  Atesto, para os devidos fins, que o(a) Sr(a). <strong>{patient?.name}</strong> necessita de <strong>{content.period}</strong> de afastamento de suas atividades, a partir desta data, por motivo de tratamento odontológico.
                </p>
                {content.reason && (
                  <p><strong>Observação:</strong> {content.reason}</p>
                )}
              </div>
            )}

            {type === 'encaminhamento' && (
              <div className="mt-10 space-y-6">
                <p><strong>Ao Especialista:</strong> {content.specialist}</p>
                <p className="text-justify">
                  Encaminho o(a) paciente <strong>{patient?.name}</strong> para avaliação e conduta especializada.
                </p>
                <p><strong>Motivo/Histórico:</strong> {content.reason}</p>
              </div>
            )}

            {type === 'ficha' && (
              <div className="mt-10 space-y-8">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><strong>CPF:</strong> {patient?.cpf}</p>
                  <p><strong>Data de Nasc.:</strong> {patient?.birth_date ? new Date(patient.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}</p>
                  <p><strong>E-mail:</strong> {patient?.email}</p>
                  <p><strong>Telefone:</strong> {patient?.phone}</p>
                  <p className="col-span-2"><strong>Endereço:</strong> {patient?.address || 'Não informado'}</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-bold border-b-2 border-emerald-600 pb-1 text-emerald-800 uppercase tracking-wider">Histórico Clínico (Anamnese)</h4>
                    <div className="grid grid-cols-1 gap-4 text-sm">
                      <div>
                        <p className="font-bold text-slate-500 text-[10px] uppercase">Histórico Médico:</p>
                        <p>{patient?.anamnesis?.medical_history || 'Nenhum histórico registrado.'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-500 text-[10px] uppercase">Alergias:</p>
                        <p className="text-rose-600 font-bold">{patient?.anamnesis?.allergies || 'Nenhuma alergia informada.'}</p>
                      </div>
                      <div>
                        <p className="font-bold text-slate-500 text-[10px] uppercase">Medicações em Uso:</p>
                        <p>{patient?.anamnesis?.medications || 'Nenhuma medicação informada.'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-bold border-b-2 border-emerald-600 pb-1 text-emerald-800 uppercase tracking-wider">Histórico de Atendimentos (Evolução)</h4>
                    {patient?.evolution && patient.evolution.length > 0 ? (
                      <div className="space-y-4">
                        {patient.evolution.map((evo: any, i: number) => (
                          <div key={i} className="border-b border-slate-100 pb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-emerald-700">{new Date(evo.date).toLocaleDateString('pt-BR')}</span>
                              <span className="text-xs font-bold text-slate-400 uppercase">{evo.procedure_performed}</span>
                            </div>
                            <p className="text-sm text-slate-600 italic">{evo.notes}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500 italic">Nenhum atendimento registrado até o momento.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {type === 'orcamento' && (
              <div className="mt-10 space-y-6">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-emerald-50 text-emerald-800">
                      <th className="border border-emerald-100 p-3 text-left">Procedimento</th>
                      <th className="border border-emerald-100 p-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {content.items?.map((item: any, i: number) => (
                      <tr key={i}>
                        <td className="border border-slate-100 p-3">{item.procedure}</td>
                        <td className="border border-slate-100 p-3 text-right">
                          {Number(item.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-slate-50">
                      <td className="border border-slate-100 p-3 text-right">Total</td>
                      <td className="border border-slate-100 p-3 text-right text-emerald-700">
                        {content.items?.reduce((acc: number, item: any) => acc + Number(item.value), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer / Signature */}
        <div className="mt-20 flex flex-col items-center">
          <div className="w-64 border-t border-slate-400 mb-2"></div>
          <p className="font-bold text-lg">{profile?.name}</p>
          <p className="text-slate-600">Cirurgião-Dentista • CRO: {profile?.cro}</p>
        </div>
      </div>
    </PrintLayout>
  );
}
