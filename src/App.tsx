import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useParams, useLocation, Link, useNavigate, Navigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { 
  Users, 
  Calendar, 
  ClipboardList, 
  DollarSign, 
  Plus, 
  Search,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
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
  List,
  Activity,
  Check,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Odontogram } from './components/Odontogram';
import { Documents } from './components/Documents';
import { PatientClinical } from './components/PatientClinical';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import { NovaEvolucao } from './components/NovaEvolucao';
import { Dashboard } from './components/Dashboard';
import { Finance } from './components/Finance';
import { formatDate, isOverdue, getFreeSlots, getSuggestion, FreeSlot } from './utils/dateUtils';

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
  journey?: {
    cadastro: 'PENDENTE' | 'CONCLUIDO';
    anamnese: 'PENDENTE' | 'CONCLUIDO';
    odontograma: 'PENDENTE' | 'CONCLUIDO';
    plano: 'PENDENTE' | 'CONCLUIDO';
    aceite: 'PENDENTE' | 'CONCLUIDO';
    consultas: 'PENDENTE' | 'CONCLUIDO';
    evolucao: 'PENDENTE' | 'CONCLUIDO';
    pagamento: 'PENDENTE' | 'CONCLUIDO';
  };
  toothHistory?: Array<{
    id: number;
    tooth_number: number;
    procedure: string;
    notes: string;
    date: string;
    dentist_name?: string;
  }>;
  treatmentPlan?: Array<{
    id: number;
    tooth_number?: number;
    procedure: string;
    value: number;
    status: 'PLANEJADO' | 'APROVADO' | 'REALIZADO' | 'CANCELADO';
    created_at: string;
  }>;
  procedures?: Array<{
    id: number;
    date: string;
    tooth_number?: number;
    procedure: string;
    dentist_name: string;
    notes: string;
  }>;
  clinicalEvolution?: Array<{
    id: number;
    date: string;
    procedure: string;
    notes: string;
    materials?: string;
    observations?: string;
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

const SidebarItem = ({ id, icon: Icon, label, activeTab, setActiveTab, setIsSidebarOpen, navigate }: any) => (
  <button
    onClick={() => {
      setActiveTab(id);
      setIsSidebarOpen(false);
      navigate('/');
    }}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 ${
      activeTab === id 
        ? 'bg-white text-primary shadow-sm' 
        : 'text-slate-500 hover:text-slate-900'
    }`}
  >
    <Icon size={20} className="shrink-0" />
    <span className="font-medium tablet-l:hidden desktop:block whitespace-nowrap">{label}</span>
  </button>
);

const BottomNavItem = ({ id, icon: Icon, label, activeTab, setActiveTab, navigate }: any) => (
  <button
    onClick={() => {
      setActiveTab(id);
      navigate('/');
    }}
    className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all ${
      activeTab === id 
        ? 'text-primary' 
        : 'text-[#8E8E93]'
    }`}
  >
    <Icon size={24} className={activeTab === id ? 'stroke-[2.5px]' : 'stroke-[1.5px]'} />
    <span className={`text-[10px] font-semibold ${activeTab === id ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
  </button>
);

const StatusBadge = ({ app, now }: { app: Appointment; now: Date }) => {
  const startTime = new Date(app.start_time);
  const diffInMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);
  
  let label = '';
  let style = '';
  let icon = null;

  if (app.status === 'IN_PROGRESS') {
    label = 'Em Atendimento';
    style = 'bg-primary/10 text-primary border-primary/20';
    icon = <Activity size={10} className="animate-pulse" />;
  } else if (app.status === 'FINISHED') {
    label = 'Finalizado';
    style = 'bg-slate-100 text-slate-500 border-slate-200';
  } else if (app.status === 'CANCELLED') {
    label = 'Faltou';
    style = 'bg-rose-50 text-rose-500 border-rose-100';
    icon = <AlertCircle size={10} />;
  } else if (diffInMinutes < 0 && app.status === 'SCHEDULED') {
    label = 'Atrasado';
    style = 'bg-rose-50 text-rose-500 border-rose-100 animate-pulse';
    icon = <Clock size={10} />;
  } else if (diffInMinutes >= 0 && diffInMinutes <= 15 && app.status === 'SCHEDULED') {
    label = `Próximo em ${diffInMinutes} min`;
    style = 'bg-amber-50 text-amber-600 border-amber-100 font-bold';
    icon = <Clock size={10} />;
  } else if (app.status === 'CONFIRMED') {
    label = 'Confirmado';
    style = 'bg-emerald-50 text-emerald-600 border-emerald-100';
  } else {
    label = 'Agendado';
    style = 'bg-slate-50 text-slate-400 border-slate-100';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${style}`}>
      {icon}
      {label}
    </span>
  );
};

const ClinicalPageRoute = ({ transactions, appointments, onUpdatePatient, onUpdateAnamnesis, onAddEvolution, onAddTransaction, dentistName, onOpenSidebar, apiFetch, setAppActiveTab, navigate }: any) => {
  const { id } = useParams();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const apiFetchRef = useRef(apiFetch);
  apiFetchRef.current = apiFetch;

  const loadPatient = React.useCallback(async (showLoading = true) => {
    if (!id) return;

    if (showLoading) {
      setLoading(true);
    }

    try {
      const res = await apiFetchRef.current(`/api/patients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      }
    } catch (error) {
      console.error('Error loading patient:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [id]);

  useEffect(() => {
    loadPatient(true);
  }, [loadPatient]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 font-medium">Carregando prontuário...</p>
      </div>
    </div>
  );
  
  if (!patient) return <div className="p-8 text-center">Paciente não encontrado.</div>;
  
  return (
    <PatientClinical 
      patient={patient} 
      appointments={appointments}
      onUpdatePatient={(updated: any) => {
        setPatient(updated);
        onUpdatePatient(updated);
      }} 
      onAddEvolution={(data: any) => {
        setPatient((prev: any) => ({ ...prev, evolution: [data, ...(prev.evolution || [])] }));
        onAddEvolution(data);
      }}
      onRefreshPatient={() => loadPatient(false)}
      apiFetch={apiFetch}
      setAppActiveTab={setAppActiveTab}
      navigate={navigate}
    />
  );
};

const LegacyClinicalRedirect = () => {
  const { id } = useParams();
  return <Navigate to={id ? `/prontuario/${id}` : '/'} replace />;
};

export default function App() {
  const navigate = useNavigate();
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
  const [isAnamnesisEditing, setIsAnamnesisEditing] = useState(false);
  const [showTreatmentPlanSummary, setShowTreatmentPlanSummary] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isDentistModalOpen, setIsDentistModalOpen] = useState(false);
  const [isEditDentistModalOpen, setIsEditDentistModalOpen] = useState(false);
  const [editingDentist, setEditingDentist] = useState<any>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [patientListFilter, setPatientListFilter] = useState<'all' | 'action-needed' | 'at-risk' | 'no-appointment' | 'in-treatment' | 'overdue'>('all');
  const [patientActionsToday, setPatientActionsToday] = useState<Set<number>>(new Set());
  const [patientsInlineFeedback, setPatientsInlineFeedback] = useState('');
  const [patientIntelligence, setPatientIntelligence] = useState<any[]>([]);
  const [patientIntelLoaded, setPatientIntelLoaded] = useState(false);
  const [dentistSearchTerm, setDentistSearchTerm] = useState('');
  const [dentistStatusFilter, setDentistStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaViewMode, setAgendaViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedWeekDay, setSelectedWeekDay] = useState<number>(new Date().getDay());
  const [now, setNow] = useState(new Date());
  const [monthSheetSelectedDay, setMonthSheetSelectedDay] = useState<Date | null>(null);
  const [weekSheetSelectedAppointment, setWeekSheetSelectedAppointment] = useState<Appointment | null>(null);
  const [weekSuggestionSheet, setWeekSuggestionSheet] = useState<{ date: Date; start: string; end: string; duration: number; procedure: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [statusFilter, setStatusFilter] = useState<string[]>(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);
  const [agendaSearchTerm, setAgendaSearchTerm] = useState('');
  const [agendaFocusMode, setAgendaFocusMode] = useState(true);
  const [isEvolutionFormOpen, setIsEvolutionFormOpen] = useState(false);
  const [newEvolution, setNewEvolution] = useState({ notes: '', procedure: '' });
  const [newDentist, setNewDentist] = useState({ name: '', email: '', password: '' });
  const [newImage, setNewImage] = useState<{ url: string, description: string, file: File | null }>({ url: '', description: '', file: null });
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    patient_name: '',
    dentist_id: '',
    date: '',
    time: '',
    duration: '',
    notes: ''
  });
  const [suggestedSlot, setSuggestedSlot] = useState<{ date: Date; duration: number; procedure: string } | null>(null);

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

      // Fetch patient intelligence (non-blocking)
      apiFetch('/api/intelligence/patients', { explicitToken })
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) { setPatientIntelligence(data); setPatientIntelLoaded(true); } })
        .catch(() => {});
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
          // Update journey status
          const updatedPatient = {
            ...selectedPatient,
            journey: {
              ...(selectedPatient.journey || {}),
              pagamento: 'CONCLUIDO'
            }
          };
          setSelectedPatient(updatedPatient);
          setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
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

  // Dashboard Stats Calculations
  const dashboardNow = new Date();
  const dashboardMonth = dashboardNow.getMonth();
  const dashboardYear = dashboardNow.getFullYear();

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

  const todayIncome = transactions
    .filter(t => t.type === 'INCOME' && t.date?.split('T')[0] === todayStr)
    .reduce((acc, t) => acc + Number(t.amount), 0);
    
  const todayExpense = transactions
    .filter(t => t.type === 'EXPENSE' && t.date?.split('T')[0] === todayStr)
    .reduce((acc, t) => acc + Number(t.amount), 0);

  const absencesToday = appointments.filter(a => 
    new Date(a.start_time).toDateString() === dashboardNow.toDateString() && 
    a.status === 'CANCELLED'
  ).length;

  const proceduresToday = appointments.filter(a => 
    new Date(a.start_time).toDateString() === dashboardNow.toDateString() && 
    (a.status === 'FINISHED' || a.status === 'IN_PROGRESS')
  ).length;

  const nextAppointments = appointments
    .filter(a => new Date(a.start_time).toDateString() === dashboardNow.toDateString() && new Date(a.start_time) >= dashboardNow && a.status !== 'FINISHED' && a.status !== 'CANCELLED')
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
    .slice(0, 5);

  const todayAppointmentsTotalCount = appointments.filter(a => new Date(a.start_time).toDateString() === dashboardNow.toDateString()).length;
  const todayAppointmentsRemainingCount = appointments.filter(a => 
    new Date(a.start_time).toDateString() === dashboardNow.toDateString() &&
    a.status !== 'FINISHED' &&
    a.status !== 'CANCELLED'
  ).length;

  const tomorrowStart = new Date(dashboardNow);
  tomorrowStart.setDate(dashboardNow.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const tomorrowUnconfirmedCount = appointments.filter(a => {
    const apptDate = new Date(a.start_time);
    return apptDate >= tomorrowStart && apptDate <= tomorrowEnd && a.status !== 'CONFIRMED' && a.status !== 'CANCELLED';
  }).length;

  // Weekly Revenue Data for the Chart
  const weeklyRevenueData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dStr = d.toLocaleDateString('en-CA');
    const amount = transactions
      .filter(t => t.type === 'INCOME' && t.date?.split('T')[0] === dStr)
      .reduce((acc, t) => acc + Number(t.amount), 0);
    return {
      day: d.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0).toUpperCase(),
      amount
    };
  });

  const maxWeeklyRevenue = Math.max(...weeklyRevenueData.map(d => d.amount), 1);

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
    // Initialize with current user if available
    const dentist_id = user?.id ? user.id.toString() : (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}')?.id?.toString() : '');
    
    setNewAppointment({
      patient_id: '',
      dentist_id: dentist_id || '',
      start_time: '',
      end_time: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openPatientAppointmentModal = (patient: Patient) => {
    const dentistId = user?.id ? user.id.toString() : (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}')?.id?.toString() : '');

    setNewAppointment({
      patient_id: patient.id.toString(),
      dentist_id: dentistId || '',
      date: new Date().toLocaleDateString('en-CA'),
      time: '',
      duration: '30',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const openScheduleSuggestion = (patientId: number, date: string, startTime: string, endTime: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const dentistId = user?.id ? user.id.toString() : (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user') || '{}')?.id?.toString() : '');
    // Calculate duration from start/end times
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const duration = ((eh * 60 + em) - (sh * 60 + sm)).toString();
    setNewAppointment({
      patient_id: patient.id.toString(),
      dentist_id: dentistId || '',
      date,
      time: startTime,
      duration: duration || '30',
      notes: ''
    });
    setIsModalOpen(true);
  };

  const contactPatientOnWhatsApp = (patient: Patient) => {
    if (!patient.phone) {
      alert('Este paciente não possui telefone cadastrado.');
      return;
    }

    let phone = patient.phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = `55${phone}`;
    } else if (phone.length > 11 && !phone.startsWith('55')) {
      phone = `55${phone}`;
    }

    const firstName = (patient.name || '').split(' ')[0] || 'Olá';
    const message = `Olá ${firstName}, tudo bem?`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const getPatientLastVisitDate = (patient: Patient) => {
    const finishedAppointments = appointments
      .filter(app => app.patient_id === patient.id && app.status === 'FINISHED')
      .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    if (finishedAppointments.length > 0) {
      return new Date(finishedAppointments[0].start_time);
    }

    if (patient.evolution && patient.evolution.length > 0) {
      const evolutionDates = patient.evolution
        .map(item => new Date(item.date))
        .filter(date => !Number.isNaN(date.getTime()))
        .sort((a, b) => b.getTime() - a.getTime());

      return evolutionDates[0] || null;
    }

    return null;
  };

  const formatTimeSinceLastVisit = (date: Date | null) => {
    if (!date) return 'Sem visitas registradas';

    const nowDate = new Date();
    const diffInDays = Math.max(0, Math.floor((nowDate.getTime() - date.getTime()) / 86400000));

    if (diffInDays < 30) {
      if (diffInDays <= 1) return 'há 1 dia';
      if (diffInDays < 7) return `há ${diffInDays} dias`;
      const weeks = Math.floor(diffInDays / 7);
      return `há ${weeks} ${weeks === 1 ? 'semana' : 'semanas'}`;
    }

    const months = Math.max(1, Math.floor(diffInDays / 30));
    if (months < 12) {
      return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
    }

    const years = Math.floor(months / 12);
    return `há ${years} ${years === 1 ? 'ano' : 'anos'}`;
  };

  const formatNextVisitLabel = (date: Date | null) => {
    if (!date) return null;

    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    const startAfterTomorrow = new Date(startTomorrow);
    startAfterTomorrow.setDate(startAfterTomorrow.getDate() + 1);

    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const timeLabel = `${hh}:${mm}`;

    if (date >= startToday && date < startTomorrow) {
      return `Hoje, ${timeLabel}`;
    }
    if (date >= startTomorrow && date < startAfterTomorrow) {
      return `Amanhã, ${timeLabel}`;
    }
    return `${formatDate(date.toISOString())}, ${timeLabel}`;
  };

  const getRelativeDayLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return formatDate(dateStr) || 'Data inválida';

    const startToday = new Date(now);
    startToday.setHours(0, 0, 0, 0);
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    const startTomorrow = new Date(startToday);
    startTomorrow.setDate(startTomorrow.getDate() + 1);

    if (date >= startToday && date < startTomorrow) return 'Hoje';
    if (date >= startYesterday && date < startToday) return 'Ontem';

    return formatDate(date.toISOString()) || formatDate(dateStr) || 'Sem data';
  };

  const getPatientCardMeta = (patient: Patient) => {
    const lastVisitDate = getPatientLastVisitDate(patient);

    // ── Derive clinical fields from real data ──────────────────────────────

    // hasActiveTreatment: treatment plan with open items OR a future scheduled/confirmed appointment
    const hasActiveTreatment =
      (patient.treatmentPlan?.some(plan => plan.status === 'PLANEJADO' || plan.status === 'APROVADO') ?? false) ||
      appointments.some(app =>
        app.patient_id === patient.id &&
        new Date(app.start_time) > now &&
        app.status !== 'CANCELLED' && app.status !== 'FINISHED'
      );

    // nextVisitDate: nearest upcoming SCHEDULED/CONFIRMED appointment.
    const scheduledAppointments = appointments
      .filter(app =>
        app.patient_id === patient.id &&
        (app.status === 'SCHEDULED' || app.status === 'CONFIRMED')
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const nextVisitAppointment = scheduledAppointments.find(app => new Date(app.start_time) >= now) ?? null;
    const nextVisitDate: Date | null = nextVisitAppointment ? new Date(nextVisitAppointment.start_time) : null;

    // isInRecallProgram: patient has at least one recorded visit (ever seen before)
    const isInRecallProgram = lastVisitDate !== null;

    // Fallback signal when there's no next visit scheduled.
    const daysSinceLastVisit = lastVisitDate
      ? Math.floor((now.getTime() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24))
      : Number.POSITIVE_INFINITY;

    // ── Clinical priority rules (strict order) ────────────────────────────
    // 1. em_tratamento – nextVisitDate exists and today <= nextVisitDate
    // 2. atrasado      – daysSinceLastVisit > 180 (only when nextVisitDate is null)
    // 3. revisao       – daysSinceLastVisit > 90  (only when nextVisitDate is null)
    // 4. em_dia        – otherwise

    type AttentionKey = 'overdue' | 'review' | 'up-to-date';
    type PatientStatus = 'em_tratamento' | 'atrasado' | 'revisao' | 'em_dia';
    let attentionKey: AttentionKey;
    let status: PatientStatus;
    let clinicalStatus: string;

    if (nextVisitDate !== null && now <= nextVisitDate) {
      status       = 'em_tratamento';
      attentionKey = 'up-to-date';
      clinicalStatus = 'Em tratamento';
    } else if (nextVisitDate !== null && now > nextVisitDate) {
      // Missed scheduled appointment should still be treated as attention-needed.
      status       = 'atrasado';
      attentionKey   = 'overdue';
      clinicalStatus = 'Inativo';
    } else if (nextVisitDate === null) {
      if (daysSinceLastVisit > 180) {
        status       = 'atrasado';
        attentionKey = 'overdue';
        clinicalStatus = 'Inativo';
      } else if (daysSinceLastVisit > 90) {
        status       = 'revisao';
        attentionKey = 'review';
        clinicalStatus = 'Revisão';
      } else {
        status       = 'em_dia';
        attentionKey = 'up-to-date';
        clinicalStatus = 'Em dia';
      }
    } else {
      status       = 'em_dia';
      attentionKey   = 'up-to-date';
      clinicalStatus = 'Em dia';
    }

    const attentionStatusMap: Record<AttentionKey, { key: AttentionKey; label: string; dot: string; tone: string }> = {
      'overdue':    { key: 'overdue',    label: 'Atrasado',        dot: 'bg-rose-500',    tone: 'text-rose-700 bg-rose-50 border-rose-100' },
      'review':     { key: 'review',     label: 'Revisão próxima', dot: 'bg-amber-400',   tone: 'text-amber-700 bg-amber-50 border-amber-100' },
      'up-to-date': { key: 'up-to-date', label: 'Em dia',          dot: 'bg-emerald-500', tone: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
    };

    return {
      lastVisitDate,
      lastVisitLabel: formatTimeSinceLastVisit(lastVisitDate),
      clinicalStatus,
      attentionStatus: attentionStatusMap[attentionKey],
      // expose derived fields for future consumers
      hasActiveTreatment,
      nextVisitDate,
      nextVisitLabel: formatNextVisitLabel(nextVisitDate),
      isInRecallProgram,
      daysSinceLastVisit,
      status,
    };
  };

  const formatProcedure = (input: string) => {
    const normalized = (input || '').trim();
    if (!normalized) return '';

    const lower = normalized.toLowerCase();

    // Endodontia shorthand
    const endoMatch = lower.match(/\b(?:endo|canal)\b\s*(\d{1,2})/);
    if (endoMatch) {
      return `Endodontia dente ${endoMatch[1]}`;
    }

    // Restauração shorthand
    const restaMatch = lower.match(/\b(?:restaura(?:c|ç)ao|restauração|resina)\b(?:\s+dente\s*(\d{1,2}))?/);
    if (restaMatch) {
      return restaMatch[1] ? `Restauração dente ${restaMatch[1]}` : 'Restauração';
    }

    // Extração shorthand
    const exoMatch = lower.match(/\b(?:extra(?:c|ç)ao|extração|exo)\b\s*(\d{1,2})?/);
    if (exoMatch) {
      return exoMatch[1] ? `Extração dente ${exoMatch[1]}` : 'Extração';
    }

    // Profilaxia / limpeza
    if (/\b(?:higiene|limpeza|profilaxia)\b/.test(lower)) {
      return 'Profilaxia';
    }

    // Fallback: capitalize words
    return normalized
      .split(/\s+/)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const getProcedureColor = (procedure: string) => {
    const lower = (procedure || '').toLowerCase();
    
    if (/endo|canal/.test(lower)) {
      return { bg: '#1e40af', hover: '#1e3a8a' }; // blue-600, blue-800
    } else if (/restaura|resina/.test(lower)) {
      return { bg: '#16a34a', hover: '#15803d' }; // green-600, green-700
    } else if (/extra|exo/.test(lower)) {
      return { bg: '#dc2626', hover: '#991b1b' }; // red-600, red-900
    } else if (/higiene|limpeza|profila/.test(lower)) {
      return { bg: '#ca8a04', hover: '#a16207' }; // yellow-600, yellow-700
    } else if (/ortodo|alinha/.test(lower)) {
      return { bg: '#7c3aed', hover: '#6d28d9' }; // purple-600, purple-700
    } else if (/prot/.test(lower)) {
      return { bg: '#db2777', hover: '#be123c' }; // pink-600, pink-700
    } else {
      return { bg: '#4b5563', hover: '#2d3748' }; // slate-600, slate-800
    }
  };

  const getProcedureByDuration = (minutes: number): string => {
    if (minutes < 30) {
      return 'Avaliação';
    } else if (minutes < 60) {
      return 'Avaliação e limpeza';
    } else if (minutes < 90) {
      return 'Restauração';
    } else if (minutes < 120) {
      return 'Endodontia';
    } else {
      return 'Tratamento complexo';
    }
  };

  const findAvailableSlots = (date: Date, workingHours = { start: 8, end: 18 }) => {
    const dayAppointments = appointments
      .filter(a => {
        const appDate = new Date(a.start_time);
        return appDate.toDateString() === date.toDateString();
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const slots: Array<{ startTime: Date; endTime: Date; duration: number; procedure: string }> = [];

    // First slot: from working hours start to first appointment
    if (dayAppointments.length === 0) {
      const startTime = new Date(date);
      startTime.setHours(workingHours.start, 0, 0, 0);
      const endTime = new Date(date);
      endTime.setHours(workingHours.end, 0, 0, 0);
      const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
      slots.push({
        startTime,
        endTime,
        duration,
        procedure: getProcedureByDuration(duration)
      });
    } else {
      // First slot: before first appointment
      const firstAppStart = new Date(dayAppointments[0].start_time);
      if (firstAppStart.getHours() > workingHours.start) {
        const startTime = new Date(date);
        startTime.setHours(workingHours.start, 0, 0, 0);
        const duration = (firstAppStart.getTime() - startTime.getTime()) / (1000 * 60);
        if (duration >= 15) {
          slots.push({
            startTime,
            endTime: firstAppStart,
            duration,
            procedure: getProcedureByDuration(duration)
          });
        }
      }

      // Slots between appointments
      for (let i = 0; i < dayAppointments.length - 1; i++) {
        const currentAppEnd = new Date(dayAppointments[i].end_time);
        const nextAppStart = new Date(dayAppointments[i + 1].start_time);
        const duration = (nextAppStart.getTime() - currentAppEnd.getTime()) / (1000 * 60);

        if (duration >= 15) {
          slots.push({
            startTime: currentAppEnd,
            endTime: nextAppStart,
            duration,
            procedure: getProcedureByDuration(duration)
          });
        }
      }

      // Last slot: after last appointment
      const lastAppEnd = new Date(dayAppointments[dayAppointments.length - 1].end_time);
      if (lastAppEnd.getHours() < workingHours.end) {
        const endTime = new Date(date);
        endTime.setHours(workingHours.end, 0, 0, 0);
        const duration = (endTime.getTime() - lastAppEnd.getTime()) / (1000 * 60);
        if (duration >= 15) {
          slots.push({
            startTime: lastAppEnd,
            endTime,
            duration,
            procedure: getProcedureByDuration(duration)
          });
        }
      }
    }

    return slots.sort((a, b) => b.duration - a.duration); // Sort by duration (biggest first)
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure dentist_id is set - fallback to user if not already set
    const dentist_id = newAppointment.dentist_id || (user?.id ? user.id.toString() : null);
    const savedUser = localStorage.getItem('user');
    const fallbackDentistId = dentist_id || (savedUser ? JSON.parse(savedUser)?.id?.toString() : null);

    // Debug logs
    console.log('New appointment data:', newAppointment);
    console.log('User:', user);
    console.log('Dentist ID:', fallbackDentistId);

    // Improved validation with better error messages
    if (!newAppointment.patient_id || newAppointment.patient_id === '') {
      alert('Por favor, selecione um paciente.');
      return;
    }
    if (!fallbackDentistId) {
      alert('Erro: Dentista não identificado. Tente recarregar a página.');
      return;
    }
    if (!newAppointment.date || newAppointment.date === '') {
      alert('Por favor, selecione a data da consulta.');
      return;
    }
    if (!newAppointment.time || newAppointment.time === '') {
      alert('Por favor, selecione o horário da consulta.');
      return;
    }
    if (!newAppointment.duration || newAppointment.duration === '') {
      alert('Por favor, informe a duração da consulta em minutos.');
      return;
    }
    const durationMinutes = parseInt(newAppointment.duration, 10);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      alert('A duração da consulta deve ser um número maior que 0.');
      return;
    }

    // Calculate start and end times
    const startTime = new Date(`${newAppointment.date}T${newAppointment.time}`);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    try {
      const formattedProcedure = formatProcedure(newAppointment.notes || '');
      const body = {
        ...newAppointment,
        notes: formattedProcedure,
        dentist_id: fallbackDentistId,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString()
      };

      const res = await apiFetch('/api/appointments', {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        setSuggestedSlot(null);
        fetchData();

        setNewAppointment({ patient_id: '', dentist_id: '', date: '', time: '', duration: '', notes: '' });
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
        const data = await res.json();
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

  const isNextAppointment = (app: Appointment, allApps: Appointment[]) => {
    const futureApps = allApps
      .filter(a => new Date(a.start_time) > now && a.status !== 'CANCELLED' && a.status !== 'FINISHED')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    return futureApps.length > 0 && futureApps[0].id === app.id;
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
      navigate(`/prontuario/${id}`);
    } catch (error) {
      console.error('Error fetching patient record:', error);
    }
  };

  const handleUpdateAnamnesis = async (patientId: number, anamnesisData: any) => {
    try {
      const res = await apiFetch(`/api/patients/${patientId}/anamnesis`, {
        method: 'PUT',
        body: JSON.stringify(anamnesisData)
      });
      if (res.ok) {
        setPatients(prev => prev.map(p => {
          if (p.id === patientId) {
            return { ...p, anamnesis: anamnesisData };
          }
          return p;
        }));
        showNotification('Anamnese salva com sucesso!');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Erro ao salvar anamnese', 'error');
      }
    } catch (error) {
      console.error('Error saving anamnesis:', error);
      showNotification('Erro de conexão ao salvar anamnese', 'error');
    }
  };

  const saveAnamnesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    await handleUpdateAnamnesis(selectedPatient.id, selectedPatient.anamnesis);
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

  const addEvolution = async (evolutionData: any) => {
    if (!selectedPatient || !user) return;
    try {
      const res = await apiFetch(`/api/patients/${selectedPatient.id}/evolution`, {
        method: 'POST',
        body: JSON.stringify({ 
          notes: evolutionData.notes, 
          procedure_performed: evolutionData.procedure,
          materials: evolutionData.materials,
          observations: evolutionData.observations
        })
      });
      if (res.ok) {
        openPatientRecord(selectedPatient.id);
        showNotification('Evolução clínica registrada!');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Erro ao registrar evolução', 'error');
      }
    } catch (error) {
      console.error('Error adding evolution:', error);
      showNotification('Erro de conexão ao registrar evolução', 'error');
    }
  };

  const sendReminder = async (app: Appointment) => {
    if (!app.patient_phone) {
      alert('Este paciente não possui telefone cadastrado.');
      return;
    }

    // Calcula o dia natural da consulta
    const appointmentDate = new Date(app.start_time);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    appointmentDate.setHours(0, 0, 0, 0);
    
    const daysUntilAppointment = Math.floor((appointmentDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let dayDescription = '';
    if (daysUntilAppointment === 0) {
      dayDescription = 'hoje';
    } else if (daysUntilAppointment === 1) {
      dayDescription = 'amanhã';
    } else if (daysUntilAppointment > 1 && daysUntilAppointment <= 6) {
      const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const dayOfWeek = appointmentDate.getDay();
      dayDescription = `no próximo ${daysOfWeek[dayOfWeek]}`;
    } else {
      dayDescription = `em ${appointmentDate.toLocaleDateString('pt-BR')}`;
    }

    // Formata a mensagem de WhatsApp conforme solicitado
    const time = new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const message = `Olá ${app.patient_name}, você confirma sua consulta ${dayDescription} às ${time}?`;
    
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

  const handleUpdatePatient = async (updatedPatient: Patient) => {
    try {
      const res = await apiFetch(`/api/patients/${updatedPatient.id}`, {
        method: 'PATCH',
        body: JSON.stringify(updatedPatient)
      });
      if (res.ok) {
        setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
        showNotification('Dados do paciente atualizados!');
      } else {
        const data = await res.json();
        showNotification(data.error || 'Erro ao atualizar paciente', 'error');
      }
    } catch (error) {
      console.error('Error updating patient:', error);
      showNotification('Erro de conexão ao atualizar paciente', 'error');
    }
  };

  const handleAddTransaction = async (transaction: any) => {
    const newTransaction = {
      ...transaction,
      id: Date.now(),
      created_at: new Date().toISOString()
    };
    setTransactions(prev => [newTransaction, ...prev]);
    
    // Update journey status if it's for the selected patient
    if (selectedPatient && transaction.patient_id === selectedPatient.id) {
      const updatedPatient = {
        ...selectedPatient,
        journey: {
          ...(selectedPatient.journey || {}),
          pagamento: 'CONCLUIDO'
        }
      };
      setSelectedPatient(updatedPatient);
      setPatients(prev => prev.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    }
  };

  return (
    <Routes>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/prontuario/:id" element={
        user ? (
          <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 relative overflow-x-hidden">
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] tablet-l:hidden"
                />
              )}
            </AnimatePresence>

            <aside className={`
              fixed inset-y-0 left-0 z-[110] bg-white border-r border-slate-200 p-4 md:p-6 flex flex-col transition-all duration-300 ease-in-out tablet-l:static tablet-l:translate-x-0 no-print
              ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 tablet-l:w-20 desktop:w-72'}
            `}>
              <div className="flex items-center justify-between mb-10 px-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 shrink-0">
                    <Plus size={24} strokeWidth={3} />
                  </div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap tablet-l:hidden desktop:block">OdontoHub</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="tablet-l:hidden text-slate-400">
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              <nav className="space-y-2 flex-1">
                <SidebarItem id="dashboard" icon={ClipboardList} label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
                <SidebarItem id="agenda" icon={Calendar} label="Agenda" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
                <SidebarItem id="pacientes" icon={Users} label="Pacientes" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
                <SidebarItem id="financeiro" icon={DollarSign} label="Financeiro" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
                <SidebarItem id="documentos" icon={FileText} label="Documentos" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
                <SidebarItem id="configuracoes" icon={Settings} label="Configurações" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
              </nav>
            </aside>
            <main className="flex-1 min-w-0 overflow-hidden flex flex-col">
              <ClinicalPageRoute 
                transactions={transactions}
                appointments={appointments}
                onUpdatePatient={handleUpdatePatient}
                onUpdateAnamnesis={handleUpdateAnamnesis}
                onAddEvolution={addEvolution}
                onAddTransaction={handleAddTransaction}
                dentistName={profile?.name || ''}
                onOpenSidebar={() => setIsSidebarOpen(true)}
                apiFetch={apiFetch}
                setAppActiveTab={setActiveTab}
                navigate={navigate}
              />
            </main>
          </div>
        ) : <Navigate to="/" />
      } />
      <Route path="/pacientes/:id/clinico" element={<LegacyClinicalRedirect />} />
      <Route path="/nova-evolucao" element={<NovaEvolucao />} />
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
                  <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/10">
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
                          className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                          className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-600 font-medium cursor-pointer">
                          Lembrar de mim
                        </label>
                      </div>
                      <Link to="/forgot-password" title="Recuperar senha" className="text-sm text-primary font-bold hover:underline">
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
                    <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl flex items-center gap-3 text-primary text-sm">
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
                          className="mt-1 w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="accepted-terms" className="text-sm text-slate-600 leading-tight">
                          Li e concordo com os <Link to="/termos" target="_blank" className="text-primary font-bold hover:underline">Termos de Uso</Link> e a <Link to="/privacidade" target="_blank" className="text-primary font-bold hover:underline">Política de Privacidade</Link>.
                        </label>
                      </div>

                      <div className="flex items-start gap-3">
                        <input 
                          id="accepted-responsibility"
                          type="checkbox" 
                          required
                          checked={registerData.acceptedResponsibility}
                          onChange={(e) => setRegisterData({...registerData, acceptedResponsibility: e.target.checked})}
                          className="mt-1 w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
                        />
                        <label htmlFor="accepted-responsibility" className="text-sm text-slate-600 leading-tight">
                          Declaro que sou responsável legal pelos dados dos pacientes cadastrados na plataforma.
                        </label>
                      </div>
                    </div>
                  )}

                  <button 
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-[0.98]"
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
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    {isRegistering ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
                  </button>

                  <div className="pt-8 border-t border-slate-100">
                    <p className="text-xs text-slate-400 mb-2">© 2026 OdontoHub</p>
                    <div className="flex justify-center gap-4 text-xs font-bold text-slate-500">
                      <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
                      <span>|</span>
                      <Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link>
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] tablet-l:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-[110] bg-white border-r border-slate-200 p-4 md:p-6 flex flex-col transition-all duration-300 ease-in-out tablet-l:static tablet-l:translate-x-0 no-print
        ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72 tablet-l:w-20 desktop:w-72'}
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-md shadow-primary/10 shrink-0">
              <Plus size={24} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 whitespace-nowrap tablet-l:hidden desktop:block">OdontoHub</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="tablet-l:hidden text-slate-400">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem id="dashboard" icon={ClipboardList} label="Dashboard" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          <SidebarItem id="agenda" icon={Calendar} label="Agenda" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          <SidebarItem id="pacientes" icon={Users} label="Pacientes" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          <SidebarItem id="financeiro" icon={DollarSign} label="Financeiro" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          <SidebarItem id="documentos" icon={FileText} label="Documentos" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          {user?.role?.toUpperCase() === 'ADMIN' && (
            <SidebarItem id="admin" icon={UserCog} label="Gestão de Dentistas" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
          )}
          <SidebarItem id="configuracoes" icon={Settings} label="Configurações" activeTab={activeTab} setActiveTab={setActiveTab} setIsSidebarOpen={setIsSidebarOpen} navigate={navigate} />
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
              <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-primary transition-colors">Política de Privacidade</Link>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 lg:p-8 w-full max-w-full print:p-0 pb-36 md:pb-8">
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
                          <div className="w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold overflow-hidden border border-primary/20">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            setSearchTerm('');
                            openPatientRecord(p.id);
                          }}
                          className="text-xs font-bold text-primary hover:underline"
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
                      className="w-full text-center py-2 text-xs font-bold text-slate-400 hover:text-primary transition-colors"
                    >
                      Ver todos os resultados
                    </button>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && !searchTerm && (
              <Dashboard 
                user={user}
                patients={patients}
                nextAppointments={nextAppointments}
                todayAppointmentsTotalCount={todayAppointmentsTotalCount}
                todayAppointmentsRemainingCount={todayAppointmentsRemainingCount}
                todayRevenue={dailyRevenue}
                tomorrowUnconfirmedCount={tomorrowUnconfirmedCount}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                openPatientRecord={openPatientRecord}
                setIsModalOpen={setIsModalOpen}
                setActiveTab={setActiveTab}
                sendReminder={sendReminder}
                onSchedulePatient={openScheduleSuggestion}
              />
            )}

            {activeTab === 'agenda' && (
              <div className="flex flex-col gap-14 pb-32 pt-10 px-2 max-w-screen-xl mx-auto w-full">
                {/* Clean Header */}
                <div className="flex flex-col gap-4 mb-6 no-print">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Agenda</h2>
                      <span className="text-sm font-medium text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                        {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
                      title="Nova consulta"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Focus Mode Toggle and View Controls */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-full">
                      <button 
                        onClick={() => setAgendaFocusMode(true)}
                        className={`px-6 py-2 text-[13px] font-bold rounded-full transition-all flex items-center gap-2 ${agendaFocusMode ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <Activity size={16} />
                        Modo Foco
                      </button>
                      <button 
                        onClick={() => setAgendaFocusMode(false)}
                        className={`px-6 py-2 text-[13px] font-bold rounded-full transition-all flex items-center gap-2 ${!agendaFocusMode ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        <List size={16} />
                        Agenda Completa
                      </button>
                    </div>

                    {!agendaFocusMode && (
                      <div className="flex bg-slate-100 p-1 rounded-full">
                        <button 
                          onClick={() => setAgendaViewMode('day')}
                          className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'day' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Dia
                        </button>
                        <button 
                          onClick={() => setAgendaViewMode('week')}
                          className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'week' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Semana
                        </button>
                        <button 
                          onClick={() => setAgendaViewMode('month')}
                          className={`px-4 py-2 text-[12px] font-bold rounded-full transition-all ${agendaViewMode === 'month' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                          Mês
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-[0_8px_40px_rgba(0,0,0,0.02)] overflow-hidden no-print">
                  <div className="divide-y divide-slate-100">
                    {(() => {
                      const getFilteredAppointments = () => {
                        // Always include FINISHED so completed appointments remain visible across day/week/month views.
                        const effectiveStatusFilter = [...statusFilter, 'FINISHED'].filter((v, i, a) => a.indexOf(v) === i);
                        
                        let filtered = appointments.filter(a => effectiveStatusFilter.length === 0 || effectiveStatusFilter.includes(a.status))
                          .filter(a => agendaSearchTerm === '' || (a.patient_name || '').toLowerCase().includes((agendaSearchTerm || '').toLowerCase()));

                        if (agendaViewMode === 'day') {
                          filtered = filtered.filter(a => {
                            const appDate = new Date(a.start_time);
                            // Only include appointments from the selected date
                            return appDate.toDateString() === selectedDate.toDateString();
                          });
                        } else if (agendaViewMode === 'week') {
                          const startOfWeek = new Date(selectedDate);
                          startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
                          const endOfWeek = new Date(startOfWeek);
                          endOfWeek.setDate(startOfWeek.getDate() + 6);

                          filtered = filtered.filter(a => {
                            const appDate = new Date(a.start_time);
                            return appDate >= startOfWeek && appDate <= endOfWeek;
                          });
                        } else if (agendaViewMode === 'month') {
                          filtered = filtered.filter(a => {
                            const appDate = new Date(a.start_time);
                            return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
                          });
                        }

                        return filtered.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
                      };

                      const filtered = getFilteredAppointments();

                      if (filtered.length === 0 && agendaViewMode === 'day') {
                        return (
                          <div className="p-20 text-center">
                            <Calendar className="mx-auto text-slate-200 mb-4" size={64} />
                            <p className="text-slate-500 font-medium">Nenhum agendamento encontrado para este período.</p>
                            <button 
                              onClick={openAppointmentModal}
                              className="mt-4 bg-primary text-white px-6 py-2.5 rounded-[30px] font-bold shadow-[0_8px_24px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                            >
                              Agendar agora
                            </button>
                          </div>
                        );
                      }

                      const renderAppointment = (app: Appointment, isFocusMode: boolean = false) => {
                        const isNext = isNextAppointment(app, filtered);
                        
                        return (
                          <div key={app.id} className={`p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 hover:bg-slate-50 transition-all group relative ${isNext && !isFocusMode ? 'border-l-4 border-primary bg-primary/5' : 'border-l-4 border-transparent'}`}>
                            {/* Time column - hidden on week/month view mobile */}
                            <div className={`${agendaViewMode === 'day' ? '' : 'hidden sm:flex'} w-12 sm:w-16 pt-1 flex flex-col items-center shrink-0`}>
                              <p className={`text-[13px] sm:text-[15px] font-bold ${isNext && !isFocusMode ? 'text-primary' : 'text-slate-900'}`}>
                                {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              <div className={`w-[1px] ${agendaViewMode === 'day' ? 'flex-1' : 'h-8'} bg-slate-100 my-2`} />
                            </div>
                            
                            <div className="flex-1 bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-sm group-hover:shadow-md transition-all flex flex-col gap-4">
                              {/* Head: Patient info and status */}
                              <div className="flex items-start gap-3 justify-between">
                                <div className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => openPatientRecord(app.patient_id)}>
                                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 shrink-0 overflow-hidden border border-slate-200">
                                    {(() => {
                                      const patient = patients.find(p => p.id === app.patient_id);
                                      return patient?.photo_url ? (
                                        <img src={patient.photo_url} alt={app.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <UserCircle size={24} />
                                      );
                                    })()}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-base sm:text-lg font-bold text-slate-900 truncate">{app.patient_name}</p>
                                    <p className="text-xs sm:text-sm text-slate-500 truncate">{app.notes || 'Consulta'}</p>
                                  </div>
                                </div>

                                {!isFocusMode && (
                                  <select
                                    value={app.status}
                                    onChange={(e) => updateStatus(app.id, e.target.value as Appointment['status'])}
                                    className="px-2 sm:px-3 py-1 sm:py-2 bg-white border border-slate-200 rounded text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none whitespace-nowrap shrink-0"
                                  >
                                    <option value="SCHEDULED">Agendado</option>
                                    <option value="CONFIRMED">Confirmado</option>
                                    <option value="IN_PROGRESS">Em Andamento</option>
                                    <option value="FINISHED">Finalizado</option>
                                    <option value="CANCELLED">Cancelado</option>
                                    <option value="NO_SHOW">Faltou</option>
                                  </select>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <button 
                                  onClick={() => {
                                    const patient = patients.find(p => p.id === app.patient_id);
                                    if (patient) openPatientRecord(patient.id);
                                    navigate(`/prontuario/${app.patient_id}`);
                                  }}
                                  className="flex-1 sm:flex-none bg-primary text-white px-4 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-95"
                                >
                                  <Activity size={16} />
                                  <span className="hidden sm:inline">{app.status === 'FINISHED' ? 'Ver Prontuário' : 'Iniciar Atendimento'}</span>
                                  <span className="sm:hidden">{app.status === 'FINISHED' ? 'Ver' : 'Atender'}</span>
                                </button>
                                
                                <button 
                                  onClick={() => sendReminder(app)}
                                  className="p-2.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-full transition-all shrink-0"
                                  title="WhatsApp"
                                >
                                  <MessageCircle size={18} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      };

                      const renderSuggestion = (slot: FreeSlot) => {
                        const suggestion = getSuggestion(slot.duration);
                        return (
                          <div
                            key={`suggestion-${slot.start}-${slot.end}`}
                            className="py-1 px-6 hover:bg-slate-50 transition-colors cursor-pointer group"
                            onClick={() => {
                              // Pre-fill new appointment form
                              setNewAppointment({
                                patient_id: '',
                                dentist_id: user?.id ? user.id.toString() : '',
                                date: selectedDate.toISOString().split('T')[0],
                                time: slot.start.replace(':', ''),
                                duration: slot.duration.toString(),
                                notes: suggestion
                              });
                              setIsModalOpen(true);
                            }}
                          >
                            <span className="text-xs text-gray-500">
                              💡 {slot.start} – {slot.end}   {suggestion}
                            </span>
                          </div>
                        );
                      };

                      if (agendaFocusMode && agendaViewMode === 'day') {
                        const todayStr = new Date().toDateString();
                        const isToday = selectedDate.toDateString() === todayStr;
                        const todayApps = filtered.filter(a => new Date(a.start_time).toDateString() === todayStr);
                        const nextApps = todayApps
                          .filter(a => new Date(a.start_time) > now && a.status !== 'CANCELLED' && a.status !== 'FINISHED')
                          .slice(0, 3);

                        return (
                          <div className="divide-y divide-slate-100">
                            {/* Current Time Indicator */}
                            {isToday && (
                              <div className="py-4 px-6 flex items-center gap-3">
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                                  <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Agora</span>
                                </div>
                                <div className="h-[1px] flex-1 bg-rose-200/50" />
                              </div>
                            )}
                            
                            {/* Next Appointments */}
                            {nextApps.length > 0 ? nextApps.map(app => renderAppointment(app, true)) : (
                              <div className="px-6 py-12 text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                  <CheckCircle2 className="text-slate-200" size={32} />
                                </div>
                                <p className="text-slate-500 font-medium">Nenhum paciente próximo para hoje.</p>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // Full Agenda Mode - Different views based on agendaViewMode
                      if (agendaViewMode === 'week') {
                        // Week grid view (always show current week)
                        const current = new Date();
                        const startOfWeek = new Date(current);
                        startOfWeek.setDate(current.getDate() - current.getDay());
                        
                        const weekDays = [];
                        for (let i = 0; i < 7; i++) {
                          const day = new Date(startOfWeek);
                          day.setDate(startOfWeek.getDate() + i);
                          weekDays.push(day);
                        }

                        // Keep weekly grid broad enough to always include suggestion hours
                        let earliestHour = 8;
                        let latestHour = 18;
                        
                        if (filtered.length > 0) {
                          const hours = filtered.map(a => new Date(a.start_time).getHours());
                          earliestHour = Math.min(...hours);
                          latestHour = Math.max(...hours);
                          
                          // Add one hour buffer before and after while always including 08:00-18:00
                          earliestHour = Math.max(0, Math.min(8, earliestHour - 1));
                          latestHour = Math.min(23, Math.max(18, latestHour + 1));
                        }

                        const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
                        const timeSlots = [];
                        for (let h = earliestHour; h <= latestHour; h++) {
                          timeSlots.push(h);
                        }

                        const timeToMinutes = (time: string) => {
                          const [h, m] = time.split(':').map(Number);
                          return h * 60 + m;
                        };

                        const weekdayCandidates = weekDays.map((day, idx) => {
                          const dayOfWeek = day.getDay();
                          if (dayOfWeek === 0 || dayOfWeek === 6) {
                            return null;
                          }

                          const dayAppointments = filtered.filter(a => {
                            const appDate = new Date(a.start_time);
                            return appDate.toDateString() === day.toDateString() && a.status !== 'CANCELLED';
                          });

                          const validSlots = getFreeSlots(dayAppointments, '08:00', '18:00')
                            .filter(slot => slot.duration >= 30)
                            .map(slot => ({
                              ...slot,
                              startMin: timeToMinutes(slot.start),
                              endMin: timeToMinutes(slot.end)
                            }));

                          if (validSlots.length === 0) return null;

                          const bestSlot = validSlots.sort((a, b) => b.duration - a.duration)[0];

                          return {
                            ...bestSlot,
                            day,
                            dayIndex: idx,
                            appointmentCount: dayAppointments.length
                          };
                        }).filter(Boolean);

                        const workdayAppointmentCount = weekDays.reduce((total, day) => {
                          const dayOfWeek = day.getDay();
                          if (dayOfWeek === 0 || dayOfWeek === 6) {
                            return total;
                          }

                          return total + filtered.filter(a => {
                            const appDate = new Date(a.start_time);
                            return appDate.toDateString() === day.toDateString() && a.status !== 'CANCELLED';
                          }).length;
                        }, 0);

                        const isMostlyEmptyWeek = workdayAppointmentCount <= 2;
                        const allWorkdaysCompletelyFree = workdayAppointmentCount === 0;
                        const maxSuggestionDays = allWorkdaysCompletelyFree ? 1 : 2;
                        const limitedCandidates = isMostlyEmptyWeek
                          ? weekdayCandidates
                              .sort((a, b) => {
                                const appointmentWeight = (b.appointmentCount - a.appointmentCount) * 1000;
                                const durationWeight = b.duration - a.duration;
                                const dayWeight = a.dayIndex - b.dayIndex;
                                return appointmentWeight || durationWeight || dayWeight;
                              })
                              .slice(0, Math.min(maxSuggestionDays, weekdayCandidates.length))
                          : weekdayCandidates;

                        const weekBestSlots = weekDays.map((_, idx) => {
                          return limitedCandidates.find(candidate => candidate.dayIndex === idx) || null;
                        });

                        return (
                          <div className="space-y-4">
                            {/* Mobile: Day-selector strip + appointment list */}
                            <div className="block sm:hidden space-y-4">
                              {/* 7-day horizontal strip */}
                              <div className="grid grid-cols-7 gap-1">
                                {weekDays.map((day, idx) => {
                                  const isToday = day.toDateString() === new Date().toDateString();
                                  const isSelected = selectedWeekDay === idx;
                                  const hasDayApps = filtered.some(a =>
                                    new Date(a.start_time).toDateString() === day.toDateString()
                                  );
                                  return (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => setSelectedWeekDay(idx)}
                                      className={`flex flex-col items-center py-2 px-1 rounded-xl transition-all ${
                                        isSelected
                                          ? 'bg-primary text-white shadow-sm'
                                          : isToday
                                          ? 'bg-primary/10 text-primary'
                                          : 'bg-slate-50 text-slate-600'
                                      }`}
                                    >
                                      <span className="text-[10px] font-semibold uppercase tracking-wide">{dayLabels[idx].slice(0, 1)}</span>
                                      <span className={`text-base font-bold leading-tight mt-0.5 ${isSelected ? 'text-white' : isToday ? 'text-primary' : 'text-slate-900'}`}>
                                        {day.getDate()}
                                      </span>
                                      {hasDayApps && (
                                        <div className={`w-1.5 h-1.5 rounded-full mt-1 ${isSelected ? 'bg-white/70' : 'bg-primary'}`} />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Appointment list for selected day */}
                              {(() => {
                                const selectedDay = weekDays[selectedWeekDay];
                                const dayApps = filtered
                                  .filter(a => selectedDay && new Date(a.start_time).toDateString() === selectedDay.toDateString())
                                  .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                const bestSlot = weekBestSlots[selectedWeekDay];

                                if (dayApps.length === 0) {
                                  return (
                                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center space-y-3">
                                      <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                        <CalendarDays size={24} className="text-slate-300" />
                                      </div>
                                      <p className="text-sm text-slate-400 font-medium">Nenhum agendamento neste dia</p>
                                      {bestSlot && (
                                        <button
                                          type="button"
                                          onClick={() => setWeekSuggestionSheet({
                                            date: selectedDay,
                                            start: bestSlot.start,
                                            end: bestSlot.end,
                                            duration: bestSlot.duration,
                                            procedure: getSuggestion(bestSlot.duration)
                                          })}
                                          className="text-xs font-bold text-primary flex items-center gap-1 mx-auto hover:underline"
                                        >
                                          💡 Ver horário disponível ({bestSlot.start}–{bestSlot.end})
                                        </button>
                                      )}
                                    </div>
                                  );
                                }

                                return (
                                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                                    {bestSlot && (
                                      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                                        <span className="text-xs text-amber-700">💡 Horário livre: {bestSlot.start}–{bestSlot.end}</span>
                                        <button
                                          type="button"
                                          onClick={() => setWeekSuggestionSheet({
                                            date: selectedDay,
                                            start: bestSlot.start,
                                            end: bestSlot.end,
                                            duration: bestSlot.duration,
                                            procedure: getSuggestion(bestSlot.duration)
                                          })}
                                          className="text-xs font-bold text-amber-700 hover:underline"
                                        >
                                          Agendar
                                        </button>
                                      </div>
                                    )}
                                    <div className="divide-y divide-slate-100">
                                      {dayApps.map(app => {
                                        const colors = app.status === 'FINISHED' 
                                          ? { bg: '#cbd5e1', hover: '#a1a5ab' } 
                                          : getProcedureColor(app.notes || '');
                                        const time = new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                        return (
                                          <button
                                            key={app.id}
                                            type="button"
                                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                                            onClick={() => setWeekSheetSelectedAppointment(app)}
                                          >
                                            <div
                                              className="w-1 self-stretch rounded-full shrink-0"
                                              style={{ backgroundColor: colors.bg }}
                                            />
                                            <div className="w-12 shrink-0 text-center">
                                              <span className="text-sm font-bold text-slate-900">{time}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                              <p className="text-sm font-semibold text-slate-900 truncate">{app.patient_name}</p>
                                              <p className="text-xs text-slate-400 truncate">{app.notes || 'Consulta'}</p>
                                            </div>
                                            <ChevronRight size={16} className="text-slate-300 shrink-0" />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Desktop: Full time-grid view */}
                            <div className="hidden sm:block overflow-x-auto pb-2">
                              <div className="min-w-[760px] space-y-4">
                                {/* Week header with day names and dates */}
                                <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                  <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-x divide-slate-200">
                                {/* Time column header */}
                                    <div className="bg-slate-50 p-2 flex items-center justify-center">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Hora</span>
                                    </div>
                                
                                    {/* Day headers */}
                                    {weekDays.map((day, idx) => {
                                      const isToday = day.toDateString() === new Date().toDateString();
                                      const bestSlotSuggestion = weekBestSlots[idx];
                                      return (
                                        <div 
                                          key={idx} 
                                          className={`p-3 text-center relative ${
                                            isToday ? 'bg-primary/10' : 'bg-slate-50'
                                          }`}
                                        >
                                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                            {dayLabels[idx]}
                                          </div>
                                          <div className={`text-lg font-bold mt-1 ${isToday ? 'text-primary' : 'text-slate-900'}`}>
                                            {day.getDate()}
                                          </div>
                                          {isToday && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                                          )}
                                          {bestSlotSuggestion && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setWeekSuggestionSheet({
                                                  date: day,
                                                  start: bestSlotSuggestion.start,
                                                  end: bestSlotSuggestion.end,
                                                  duration: bestSlotSuggestion.duration,
                                                  procedure: getSuggestion(bestSlotSuggestion.duration)
                                                });
                                              }}
                                              className="absolute top-1 right-1 z-10 text-[10px] leading-none text-slate-500 bg-white/80 rounded px-0.5 hover:text-slate-600 transition-colors"
                                              title="Ver sugestao"
                                            >
                                              💡
                                            </button>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Time slots grid */}
                                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                  {timeSlots.map(hour => (
                                    <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 border-b border-slate-200 last:border-b-0 min-h-[60px] divide-x divide-slate-200">
                                      {/* Time label */}
                                      <div className="bg-slate-50 p-2 flex items-center justify-center border-b border-slate-200">
                                        <span className="text-[10px] font-bold text-slate-400">
                                          {String(hour).padStart(2, '0')}:00
                                        </span>
                                      </div>
  
                                      {/* Day columns */}
                                      {weekDays.map((day, dayIdx) => {
                                        const dayAppointments = filtered.filter(a => {
                                          const appDate = new Date(a.start_time);
                                          const appHour = appDate.getHours();
                                          // Show appointment if it starts in this hour
                                          return appDate.toDateString() === day.toDateString() && appHour === hour;
                                        }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                        const isToday = day.toDateString() === new Date().toDateString();
                                        return (
                                          <div 
                                            key={dayIdx}
                                            className={`p-1.5 relative ${
                                              isToday ? 'bg-primary/5' : 'bg-white'
                                            } hover:bg-slate-50 transition-colors`}
                                          >
                                            <div className="space-y-1">
                                              {dayAppointments.slice(0, 3).map(app => {
                                                const firstName = (app.patient_name || '').split(' ')[0] || app.patient_name;
                                                const colors = app.status === 'FINISHED'
                                                  ? { bg: '#e2e8f0', hover: '#cbd5e1' }
                                                  : getProcedureColor(app.notes || '');
                                                const textColor = app.status === 'FINISHED' ? 'text-slate-600' : 'text-white';
                                                return (
                                                  <div
                                                    key={app.id}
                                                    style={{
                                                      backgroundColor: colors.bg,
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                                                    className={`${textColor} rounded text-[8px] px-1 py-0.5 font-medium cursor-pointer transition-colors min-h-6 flex flex-col justify-center overflow-hidden`}
                                                    title={`${app.patient_name} - ${new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                                    onClick={() => setWeekSheetSelectedAppointment(app)}
                                                  >
                                                    <div className="truncate leading-tight">{firstName}</div>
                                                    <div className="text-[7px] opacity-90 leading-tight">
                                                      {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                              {dayAppointments.length > 3 && (
                                                <div className="text-[7px] text-primary font-bold px-1 py-0.5">
                                                  +{dayAppointments.length - 3}
                                                </div>
                                              )}
                                            </div>
                                        </div>
                                        );
                                      })}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Bottom Sheet for selected appointment in week view */}
                            {weekSheetSelectedAppointment && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setWeekSheetSelectedAppointment(null)}
                              />
                            )}
                            {weekSheetSelectedAppointment && (
                              <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-32"
                              >
                                <div className="p-6 space-y-6">
                                  {/* Close button and header */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-2xl font-bold text-slate-900">
                                        {new Date(weekSheetSelectedAppointment.start_time).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long' })}
                                      </h3>
                                      <p className="text-sm text-slate-500 mt-1">Detalhes do Agendamento</p>
                                    </div>
                                    <button
                                      onClick={() => setWeekSheetSelectedAppointment(null)}
                                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                      <X size={24} className="text-slate-400" />
                                    </button>
                                  </div>

                                  {/* Appointment details */}
                                  <div className="pt-4 space-y-6">
                                    {/* Time and duration */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário</p>
                                      <div className="flex items-center gap-4">
                                        <div>
                                          <p className="text-2xl font-bold text-primary">
                                            {new Date(weekSheetSelectedAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-1">
                                            {(() => {
                                              const start = new Date(weekSheetSelectedAppointment.start_time);
                                              const end = new Date(weekSheetSelectedAppointment.end_time);
                                              const mins = Math.round((end.getTime() - start.getTime()) / 60000);
                                              return `${mins}min`;
                                            })()}
                                          </p>
                                        </div>
                                        <div className="h-12 w-[1px] bg-slate-200" />
                                        <div>
                                          <p className="text-sm text-slate-500">Término</p>
                                          <p className="text-lg font-bold text-slate-700 mt-0.5">
                                            {new Date(weekSheetSelectedAppointment.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Patient info */}
                                    <div className="border-t border-slate-100 pt-6 space-y-3">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente</p>
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0">
                                          {(() => {
                                            const patient = patients.find(p => p.id === weekSheetSelectedAppointment.patient_id);
                                            return patient?.photo_url ? (
                                              <img src={patient.photo_url} alt={weekSheetSelectedAppointment.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              <UserCircle size={24} />
                                            );
                                          })()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-900">{weekSheetSelectedAppointment.patient_name}</p>
                                          <p className="text-sm text-slate-500 truncate">{weekSheetSelectedAppointment.notes || 'Consulta'}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status and controls */}
                                    <div className="border-t border-slate-100 pt-6 space-y-4">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</p>
                                      <div className="space-y-3">
                                        <select
                                          value={weekSheetSelectedAppointment.status}
                                          onChange={(e) => {
                                            updateStatus(weekSheetSelectedAppointment.id, e.target.value as Appointment['status']);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        >
                                          <option value="SCHEDULED">Agendado</option>
                                          <option value="CONFIRMED">Confirmado</option>
                                          <option value="IN_PROGRESS">Em Andamento</option>
                                          <option value="FINISHED">Finalizado</option>
                                          <option value="CANCELLED">Cancelado</option>
                                          <option value="NO_SHOW">Faltou</option>
                                        </select>

                                        <button
                                          onClick={() => {
                                            const patient = patients.find(p => p.id === weekSheetSelectedAppointment.patient_id);
                                            if (patient) openPatientRecord(patient.id);
                                            navigate(`/prontuario/${weekSheetSelectedAppointment.patient_id}`);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                        >
                                          <Activity size={18} />
                                          Iniciar Atendimento
                                        </button>

                                        <button
                                          onClick={() => {
                                            sendReminder(weekSheetSelectedAppointment);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full bg-slate-50 text-primary px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200"
                                        >
                                          <MessageCircle size={18} />
                                          Enviar Lembrete WhatsApp
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            {/* Bottom Sheet for weekly suggestion */}
                            {weekSuggestionSheet && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setWeekSuggestionSheet(null)}
                              />
                            )}
                            {weekSuggestionSheet && (
                              <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-24"
                              >
                                <div className="p-6 space-y-5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-base font-semibold text-slate-800">Sugestao</p>
                                    <button
                                      onClick={() => setWeekSuggestionSheet(null)}
                                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                      <X size={20} className="text-slate-400" />
                                    </button>
                                  </div>

                                  <div className="space-y-1">
                                    <p className="text-sm text-slate-600">
                                      {weekSuggestionSheet.start} - {weekSuggestionSheet.end}
                                    </p>
                                    <p className="text-sm text-slate-600">{weekSuggestionSheet.procedure}</p>
                                  </div>

                                  <button
                                    onClick={() => {
                                      setNewAppointment({
                                        patient_id: '',
                                        dentist_id: user?.id ? user.id.toString() : '',
                                        date: weekSuggestionSheet.date.toISOString().split('T')[0],
                                        time: weekSuggestionSheet.start.replace(':', ''),
                                        duration: String(weekSuggestionSheet.duration),
                                        notes: weekSuggestionSheet.procedure
                                      });
                                      setWeekSuggestionSheet(null);
                                      setIsModalOpen(true);
                                    }}
                                    className="w-full bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                                  >
                                    Agendar
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );

                        return (
                          <div className="space-y-6">
                            {/* Week grid */}
                            <div className="space-y-4">
                              {/* Week header with day names and dates */}
                              <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10">
                                <div className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 border border-slate-200 rounded-2xl overflow-hidden shadow-sm divide-x divide-slate-200">
                                  {/* Time column header */}
                                  <div className="bg-slate-50 p-2 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Hora</span>
                                  </div>
                                  
                                  {/* Day headers */}
                                  {weekDays.map((day, idx) => {
                                    const isToday = day.toDateString() === new Date().toDateString();
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`p-3 text-center ${
                                          isToday ? 'bg-primary/10' : 'bg-slate-50'
                                        }`}
                                      >
                                        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                          {dayLabels[idx]}
                                        </div>
                                        <div className={`text-lg font-bold mt-1 ${isToday ? 'text-primary' : 'text-slate-900'}`}>
                                          {day.getDate()}
                                        </div>
                                        {isToday && (
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary mx-auto mt-1" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Time slots grid */}
                              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                {timeSlots.map(hour => (
                                  <div key={hour} className="grid grid-cols-[80px_repeat(7,1fr)] gap-0 border-b border-slate-200 last:border-b-0 min-h-[60px] divide-x divide-slate-200">
                                    {/* Time label */}
                                    <div className="bg-slate-50 p-2 flex items-center justify-center border-b border-slate-200">
                                      <span className="text-[10px] font-bold text-slate-400">
                                        {String(hour).padStart(2, '0')}:00
                                      </span>
                                    </div>

                                    {/* Day columns */}
                                    {weekDays.map((day, dayIdx) => {
                                      const dayAppointments = filtered.filter(a => {
                                        const appDate = new Date(a.start_time);
                                        const appHour = appDate.getHours();
                                        // Show appointment if it starts in this hour
                                        return appDate.toDateString() === day.toDateString() && appHour === hour;
                                      }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                                      const isToday = day.toDateString() === new Date().toDateString();

                                      return (
                                        <div 
                                          key={dayIdx}
                                          className={`p-1.5 relative ${
                                            isToday ? 'bg-primary/5' : 'bg-white'
                                          } hover:bg-slate-50 transition-colors`}
                                        >
                                          <div className="space-y-1">
                                            {dayAppointments.slice(0, 3).map(app => {
                                              const firstName = (app.patient_name || '').split(' ')[0] || app.patient_name;
                                              const colors = app.status === 'FINISHED'
                                                ? { bg: '#e2e8f0', hover: '#cbd5e1' }
                                                : getProcedureColor(app.notes || '');
                                              const textColor = app.status === 'FINISHED' ? 'text-slate-600' : 'text-white';
                                              return (
                                                <div
                                                  key={app.id}
                                                  style={{
                                                    backgroundColor: colors.bg,
                                                  }}
                                                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.hover}
                                                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = colors.bg}
                                                  className={`${textColor} rounded text-[8px] px-1 py-0.5 font-medium cursor-pointer transition-colors min-h-6 flex flex-col justify-center overflow-hidden`}
                                                  title={`${app.patient_name} - ${new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
                                                  onClick={() => setWeekSheetSelectedAppointment(app)}
                                                >
                                                  <div className="truncate leading-tight">{firstName}</div>
                                                  <div className="text-[7px] opacity-90 leading-tight">
                                                    {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                            {dayAppointments.length > 3 && (
                                              <div className="text-[7px] text-primary font-bold px-1 py-0.5">
                                                +{dayAppointments.length - 3}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Bottom Sheet for selected appointment in week view */}
                            {weekSheetSelectedAppointment && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setWeekSheetSelectedAppointment(null)}
                              />
                            )}
                            {weekSheetSelectedAppointment && (
                              <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-32"
                              >
                                <div className="p-6 space-y-6">
                                  {/* Close button and header */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-2xl font-bold text-slate-900">
                                        {new Date(weekSheetSelectedAppointment.start_time).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long' })}
                                      </h3>
                                      <p className="text-sm text-slate-500 mt-1">Detalhes do Agendamento</p>
                                    </div>
                                    <button
                                      onClick={() => setWeekSheetSelectedAppointment(null)}
                                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                      <X size={24} className="text-slate-400" />
                                    </button>
                                  </div>

                                  {/* Appointment details */}
                                  <div className="pt-4 space-y-6">
                                    {/* Time and duration */}
                                    <div className="space-y-2">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Horário</p>
                                      <div className="flex items-center gap-4">
                                        <div>
                                          <p className="text-2xl font-bold text-primary">
                                            {new Date(weekSheetSelectedAppointment.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                          <p className="text-[10px] text-slate-400 mt-1">
                                            {(() => {
                                              const start = new Date(weekSheetSelectedAppointment.start_time);
                                              const end = new Date(weekSheetSelectedAppointment.end_time);
                                              const mins = Math.round((end.getTime() - start.getTime()) / 60000);
                                              return `${mins}min`;
                                            })()}
                                          </p>
                                        </div>
                                        <div className="h-12 w-[1px] bg-slate-200" />
                                        <div>
                                          <p className="text-sm text-slate-500">Término</p>
                                          <p className="text-lg font-bold text-slate-700 mt-0.5">
                                            {new Date(weekSheetSelectedAppointment.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Patient info */}
                                    <div className="border-t border-slate-100 pt-6 space-y-3">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Paciente</p>
                                      <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 overflow-hidden border border-slate-200 shrink-0">
                                          {(() => {
                                            const patient = patients.find(p => p.id === weekSheetSelectedAppointment.patient_id);
                                            return patient?.photo_url ? (
                                              <img src={patient.photo_url} alt={weekSheetSelectedAppointment.patient_name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              <UserCircle size={24} />
                                            );
                                          })()}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="font-bold text-slate-900">{weekSheetSelectedAppointment.patient_name}</p>
                                          <p className="text-sm text-slate-500 truncate">{weekSheetSelectedAppointment.notes || 'Consulta'}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Status and controls */}
                                    <div className="border-t border-slate-100 pt-6 space-y-4">
                                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ações</p>
                                      <div className="space-y-3">
                                        <select
                                          value={weekSheetSelectedAppointment.status}
                                          onChange={(e) => {
                                            updateStatus(weekSheetSelectedAppointment.id, e.target.value as Appointment['status']);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full px-4 py-3 text-sm bg-white border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                        >
                                          <option value="SCHEDULED">Agendado</option>
                                          <option value="CONFIRMED">Confirmado</option>
                                          <option value="IN_PROGRESS">Em Andamento</option>
                                          <option value="FINISHED">Finalizado</option>
                                          <option value="CANCELLED">Cancelado</option>
                                          <option value="NO_SHOW">Faltou</option>
                                        </select>

                                        <button
                                          onClick={() => {
                                            const patient = patients.find(p => p.id === weekSheetSelectedAppointment.patient_id);
                                            if (patient) openPatientRecord(patient.id);
                                            navigate(`/prontuario/${weekSheetSelectedAppointment.patient_id}`);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all"
                                        >
                                          <Activity size={18} />
                                          Iniciar Atendimento
                                        </button>

                                        <button
                                          onClick={() => {
                                            sendReminder(weekSheetSelectedAppointment);
                                            setWeekSheetSelectedAppointment(null);
                                          }}
                                          className="w-full bg-slate-50 text-primary px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200"
                                        >
                                          <MessageCircle size={18} />
                                          Enviar Lembrete WhatsApp
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        );
                      } else if (agendaViewMode === 'month') {
                        // Interactive month view with bottom sheet
                        const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                        const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
                        
                        const weeks = [];
                        let currentWeek = [];
                        let currentDate = new Date(startOfMonth);
                        
                        const firstDayOfWeek = startOfMonth.getDay();
                        for (let i = 0; i < firstDayOfWeek; i++) {
                          currentWeek.push(null);
                        }
                        
                        while (currentDate <= endOfMonth) {
                          currentWeek.push(new Date(currentDate));
                          if (currentWeek.length === 7) {
                            weeks.push(currentWeek);
                            currentWeek = [];
                          }
                          currentDate.setDate(currentDate.getDate() + 1);
                        }
                        
                        while (currentWeek.length < 7) {
                          currentWeek.push(null);
                        }
                        weeks.push(currentWeek);

                        const selectedDayAppointments = monthSheetSelectedDay
                          ? filtered.filter(a => {
                              const appDate = new Date(a.start_time);
                              return appDate.toDateString() === monthSheetSelectedDay.toDateString();
                            }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
                          : [];

                        return (
                          <div className="space-y-4">
                            {/* Calendar grid */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                              {/* Month header with navigation */}
                              <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-6 py-4 border-b border-slate-200">
                                <div className="flex items-center justify-between">
                                  <button
                                    onClick={() => {
                                      const newDate = new Date(selectedDate);
                                      newDate.setMonth(newDate.getMonth() - 1);
                                      setSelectedDate(newDate);
                                    }}
                                    className="p-2 hover:bg-white/50 rounded-full transition-colors"
                                  >
                                    <ChevronLeft size={20} className="text-slate-600" />
                                  </button>
                                  <h3 className="text-xl font-bold text-slate-900 capitalize">
                                    {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                  </h3>
                                  <button
                                    onClick={() => {
                                      const newDate = new Date(selectedDate);
                                      newDate.setMonth(newDate.getMonth() + 1);
                                      setSelectedDate(newDate);
                                    }}
                                    className="p-2 hover:bg-white/50 rounded-full transition-colors"
                                  >
                                    <ChevronRight size={20} className="text-slate-600" />
                                  </button>
                                </div>
                              </div>

                              {/* Day headers */}
                              <div className="grid grid-cols-7 gap-0 border-b border-slate-200">
                                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                  <div key={day} className="p-3 text-center border-r border-slate-100 last:border-r-0 bg-slate-50">
                                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{day}</p>
                                  </div>
                                ))}
                              </div>

                              {/* Calendar weeks */}
                              {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="grid grid-cols-7 gap-0 border-b border-slate-200 last:border-b-0">
                                  {week.map((day, dayIndex) => {
                                    if (!day) {
                                      return <div key={dayIndex} className="border-r border-slate-100 last:border-r-0 bg-slate-50/50" />;
                                    }

                                    const dayAppointments = filtered.filter(a => {
                                      const appDate = new Date(a.start_time);
                                      return appDate.toDateString() === day.toDateString();
                                    });

                                    const isToday = day.toDateString() === new Date().toDateString();
                                    const isCurrentMonth = day.getMonth() === selectedDate.getMonth();
                                    const isSelected = monthSheetSelectedDay?.toDateString() === day.toDateString();
                                    const hasAppointments = dayAppointments.length > 0;

                                    return (
                                      <div
                                        key={dayIndex}
                                        onClick={() => setMonthSheetSelectedDay(day)}
                                        className={`border-r border-slate-100 last:border-r-0 min-h-[100px] p-2 cursor-pointer transition-all relative ${
                                          isSelected 
                                            ? 'bg-primary/10 border-primary/50' 
                                            : isToday 
                                            ? 'bg-primary/5 hover:bg-primary/10' 
                                            : 'bg-white hover:bg-slate-50'
                                        } ${!isCurrentMonth ? 'opacity-40' : ''}`}
                                      >
                                        {/* Day number */}
                                        <div className={`text-sm font-bold mb-2 ${
                                          isToday 
                                            ? 'text-primary' 
                                            : isCurrentMonth 
                                            ? 'text-slate-900' 
                                            : 'text-slate-400'
                                        }`}>
                                          {day.getDate()}
                                        </div>

                                        {/* Today indicator dot */}
                                        {isToday && (
                                          <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        )}

                                        {/* Appointment indicators */}
                                        {hasAppointments && (
                                          <div className="space-y-0.5">
                                            <div className="flex gap-0.5 flex-wrap">
                                              {dayAppointments.slice(0, 2).map((_, i) => (
                                                <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/70" />
                                              ))}
                                            </div>
                                            <div className="text-[10px] font-bold text-primary">
                                              {dayAppointments.length} {dayAppointments.length === 1 ? 'consulta' : 'consultas'}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>

                            {/* Bottom Sheet for selected day */}
                            {monthSheetSelectedDay && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm"
                                onClick={() => setMonthSheetSelectedDay(null)}
                              />
                            )}
                            {monthSheetSelectedDay && (
                              <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed inset-x-0 bottom-0 z-[1000] bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto pb-32"
                              >
                                <div className="p-6 space-y-6">
                                  {/* Close button and header */}
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <h3 className="text-2xl font-bold text-slate-900">
                                        {monthSheetSelectedDay.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', weekday: 'long' })}
                                      </h3>
                                      <p className="text-sm text-slate-500 mt-1">
                                        {selectedDayAppointments.length} {selectedDayAppointments.length === 1 ? 'agendamento' : 'agendamentos'}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => setMonthSheetSelectedDay(null)}
                                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                                    >
                                      <X size={24} className="text-slate-400" />
                                    </button>
                                  </div>

                                  {/* Appointments list for selected day */}
                                  {selectedDayAppointments.length > 0 ? (
                                    <div className="space-y-4 divide-y divide-slate-100">
                                      {selectedDayAppointments.map(app => (
                                        <div key={app.id} className="pt-4 first:pt-0">
                                          <div className="flex items-start gap-4">
                                            {/* Time */}
                                            <div className="flex-shrink-0 text-center">
                                              <p className="text-lg font-bold text-primary">
                                                {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </p>
                                              <p className="text-[10px] text-slate-400 mt-1">
                                                {(() => {
                                                  const start = new Date(app.start_time);
                                                  const end = new Date(app.end_time);
                                                  const mins = Math.round((end.getTime() - start.getTime()) / 60000);
                                                  return `${mins}min`;
                                                })()}
                                              </p>
                                            </div>

                                            {/* Patient info and actions */}
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 flex-1">
                                                  <p className="text-base font-bold text-slate-900">{app.patient_name}</p>
                                                  <p className="text-sm text-slate-500 truncate">{app.notes || 'Consulta'}</p>
                                                </div>
                                                <button
                                                  onClick={() => {
                                                    const patient = patients.find(p => p.id === app.patient_id);
                                                    if (patient) openPatientRecord(patient.id);
                                                    navigate(`/prontuario/${app.patient_id}`);
                                                    setMonthSheetSelectedDay(null);
                                                  }}
                                                  className="px-3 py-1.5 bg-primary text-white rounded-full text-xs font-bold hover:opacity-90 transition-all shrink-0"
                                                >
                                                  Atender
                                                </button>
                                              </div>

                                              {/* Status and actions */}
                                              <div className="flex items-center gap-2 mt-3">
                                                <select
                                                  value={app.status}
                                                  onChange={(e) => {
                                                    updateStatus(app.id, e.target.value as Appointment['status']);
                                                    setMonthSheetSelectedDay(null);
                                                  }}
                                                  className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-medium focus:ring-2 focus:ring-primary/20 outline-none"
                                                >
                                                  <option value="SCHEDULED">Agendado</option>
                                                  <option value="CONFIRMED">Confirmado</option>
                                                  <option value="IN_PROGRESS">Em Andamento</option>
                                                  <option value="FINISHED">Finalizado</option>
                                                  <option value="CANCELLED">Cancelado</option>
                                                  <option value="NO_SHOW">Faltou</option>
                                                </select>
                                                <button
                                                  onClick={() => sendReminder(app)}
                                                  className="p-1.5 text-primary bg-primary/5 hover:bg-primary/10 rounded-full transition-all"
                                                  title="WhatsApp"
                                                >
                                                  <MessageCircle size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="py-12 text-center space-y-4">
                                      <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                                      <p className="text-slate-500 font-medium">Nenhum agendamento para este dia</p>
                                      <button
                                        onClick={() => {
                                          const slots = findAvailableSlots(monthSheetSelectedDay!);
                                          if (slots.length > 0) {
                                            const bestSlot = slots[0]; // Biggest slot
                                            setSuggestedSlot({
                                              date: bestSlot.startTime,
                                              duration: bestSlot.duration,
                                              procedure: bestSlot.procedure
                                            });
                                            setNewAppointment({
                                              patient_id: '',
                                              dentist_id: user?.id ? user.id.toString() : '',
                                              date: bestSlot.startTime.toISOString().split('T')[0],
                                              time: bestSlot.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', ''),
                                              duration: Math.floor(bestSlot.duration).toString(),
                                              notes: bestSlot.procedure
                                            });
                                          } else {
                                            setNewAppointment({
                                              patient_id: '',
                                              dentist_id: user?.id ? user.id.toString() : '',
                                              date: monthSheetSelectedDay!.toISOString().split('T')[0],
                                              time: '',
                                              duration: '30',
                                              notes: ''
                                            });
                                          }
                                          setMonthSheetSelectedDay(null);
                                          setIsModalOpen(true);
                                        }}
                                        className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2 mx-auto"
                                      >
                                        <Plus size={18} />
                                        Criar Nova Consulta
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}

                          </div>
                        );
                      }

                      // Day view - Group by time periods
                      const _now = new Date();

                      // Finished appointments from the selected day that already happened — shown in "Consultas Anteriores Realizadas"
                      const pastFinishedAppointments = filtered.filter(a => {
                        const appDate = new Date(a.start_time);
                        return a.status === 'FINISHED' && appDate <= _now && appDate.toDateString() === selectedDate.toDateString();
                      }).sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

                      // Remaining appointments (exclude ones already shown above to avoid duplication)
                      const todayAppointments = filtered.filter(a => {
                        const appDate = new Date(a.start_time);
                        if (appDate.toDateString() !== selectedDate.toDateString()) return false;
                        if (a.status === 'FINISHED' && appDate <= _now) return false;
                        return true;
                      });

                      // Calculate free slots for suggestions
                      const freeSlots = getFreeSlots(todayAppointments);

                      const morning = todayAppointments.filter(a => {
                        const hour = new Date(a.start_time).getHours();
                        return hour >= 6 && hour < 12;
                      });
                      const afternoon = todayAppointments.filter(a => {
                        const hour = new Date(a.start_time).getHours();
                        return hour >= 12 && hour < 18;
                      });
                      const evening = todayAppointments.filter(a => {
                        const hour = new Date(a.start_time).getHours();
                        return hour >= 18 && hour < 22;
                      });

                      const isToday = selectedDate.toDateString() === new Date().toDateString();

                      const renderNowIndicator = () => (
                        <div key="now-indicator" className="py-4 px-6 flex items-center gap-3">
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            <span className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Agora</span>
                          </div>
                          <div className="h-[1px] flex-1 bg-rose-200/50" />
                        </div>
                      );

                      const renderPeriod = (apps: Appointment[], periodStart: number, periodEnd: number, label: string) => {
                        const nowHour = now.getHours();
                        const showNowInThisPeriod = isToday && nowHour >= periodStart && nowHour < periodEnd;
                        
                        if (apps.length === 0 && !showNowInThisPeriod) return null;

                        // Filter free slots for this period
                        const periodFreeSlots = freeSlots.filter(slot => {
                          const slotHour = parseInt(slot.start.split(':')[0]);
                          return slotHour >= periodStart && slotHour < periodEnd;
                        });

                        // Create timeline items: appointments and suggestions
                        const timelineItems: Array<{ type: 'appointment' | 'suggestion' | 'now', item: any, time: number }> = [];

                        // Add appointments
                        apps.forEach(app => {
                          const appTime = new Date(app.start_time).getHours() * 60 + new Date(app.start_time).getMinutes();
                          timelineItems.push({ type: 'appointment', item: app, time: appTime });
                        });

                        // Add suggestions
                        periodFreeSlots.forEach(slot => {
                          const slotTime = parseInt(slot.start.split(':')[0]) * 60 + parseInt(slot.start.split(':')[1]);
                          timelineItems.push({ type: 'suggestion', item: slot, time: slotTime });
                        });

                        // Add now indicator if in this period
                        if (showNowInThisPeriod) {
                          const nowTime = now.getHours() * 60 + now.getMinutes();
                          timelineItems.push({ type: 'now', item: null, time: nowTime });
                        }

                        // Sort by time
                        timelineItems.sort((a, b) => a.time - b.time);

                        // Render content
                        const content = timelineItems.map(({ type, item }) => {
                          if (type === 'appointment') {
                            return renderAppointment(item);
                          } else if (type === 'suggestion') {
                            return renderSuggestion(item);
                          } else if (type === 'now') {
                            return renderNowIndicator();
                          }
                          return null;
                        });

                        return (
                          <div key={label} className="py-2">
                            <div className="px-6 py-2 flex items-center gap-2">
                              <span className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">{label}</span>
                            </div>
                            {content}
                          </div>
                        );
                      };

                      return (
                        <div className="divide-y divide-[#C6C6C8]/5">
                          {/* Past finished appointments */}
                          {pastFinishedAppointments.length > 0 && (
                            <div className="py-4">
                              <div className="px-6 py-2 flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Consultas Anteriores Realizadas</span>
                              </div>
                              <div className="space-y-2">
                                {pastFinishedAppointments.map(app => renderAppointment(app))}
                              </div>
                            </div>
                          )}
                          {renderPeriod(morning, 6, 12, "Manhã")}
                          {renderPeriod(afternoon, 12, 18, "Tarde")}
                          {renderPeriod(evening, 18, 24, "Noite")}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'pacientes' && (
              <div className="space-y-4 pt-10">
                {(() => {
                  // ---------- stats ----------
                  const allMetas = patients.map(p => ({ patient: p, meta: getPatientCardMeta(p) }));
                  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
                  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);
                  const totalOverdue = allMetas.filter(x => x.meta.attentionStatus.key === 'overdue').length;
                  const todayAppointments = appointments.filter(app => {
                    const appDate = new Date(app.start_time);
                    return appDate >= todayStart && appDate <= todayEnd && app.status !== 'CANCELLED';
                  });
                  const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                  const freeSlotsToday = getFreeSlots(todayAppointments, '08:00', '18:00', nowHHMM).filter(slot => slot.duration >= 30).length;
                  const showPatientsFeedback = (message: string) => {
                    setPatientsInlineFeedback(message);
                    window.setTimeout(() => setPatientsInlineFeedback(''), 2400);
                  };
                  const opportunitiesToday = allMetas.filter(({ patient, meta }) => {
                    if (meta.attentionStatus.key === 'up-to-date') return false;
                    return !appointments.some(app =>
                      app.patient_id === patient.id &&
                      new Date(app.start_time) >= todayStart &&
                      new Date(app.start_time) <= todayEnd &&
                      app.status !== 'CANCELLED'
                    );
                  }).length;
                  const handledToday = appointments.filter(app =>
                    app.status === 'FINISHED' &&
                    new Date(app.start_time) >= todayStart &&
                    new Date(app.start_time) <= todayEnd
                  ).length;
                  const opportunityCandidates = allMetas
                    .filter(({ patient, meta }) => {
                      if (meta.attentionStatus.key === 'up-to-date') return false;
                      return !appointments.some(app =>
                        app.patient_id === patient.id &&
                        new Date(app.start_time) >= todayStart &&
                        new Date(app.start_time) <= todayEnd &&
                        app.status !== 'CANCELLED'
                      );
                    })
                    .sort((a, b) => {
                      const attentionPriority = { overdue: 0, review: 1, 'up-to-date': 2 } as const;
                      const attentionDiff =
                        attentionPriority[a.meta.attentionStatus.key as keyof typeof attentionPriority] -
                        attentionPriority[b.meta.attentionStatus.key as keyof typeof attentionPriority];
                      if (attentionDiff !== 0) return attentionDiff;
                      const dateA = a.meta.lastVisitDate ? a.meta.lastVisitDate.getTime() : 0;
                      const dateB = b.meta.lastVisitDate ? b.meta.lastVisitDate.getTime() : 0;
                      return dateA - dateB;
                    });

                  // ---------- filtered + sorted card list ----------
                  // Build a quick lookup from intelligence data
                  const intelMap = new Map<number, any>();
                  patientIntelligence.forEach((pi: any) => intelMap.set(pi.patient_id, pi));

                  const patientCards = patients
                    .filter(p =>
                      (p.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) ||
                      (p.cpf && p.cpf.includes(searchTerm)) ||
                      p.phone.includes(searchTerm)
                    )
                    .map(patient => ({ patient, meta: getPatientCardMeta(patient), intel: intelMap.get(patient.id) || null }))
                    .filter(({ meta, intel }) => {
                      if (patientListFilter === 'all') return true;
                      if (patientListFilter === 'action-needed') return intel?.priority === 'HIGH';
                      if (patientListFilter === 'at-risk') return intel?.status === 'ABANDONO' || intel?.status === 'ATENCAO';
                      if (patientListFilter === 'no-appointment') return intel ? !intel.has_future_appointment : !meta.nextVisitDate;
                      if (patientListFilter === 'in-treatment') return intel?.status === 'EM_TRATAMENTO' || meta.clinicalStatus === 'Em tratamento';
                      if (patientListFilter === 'overdue') return meta.attentionStatus.key === 'overdue';
                      return true;
                    })
                    .sort((a, b) => {
                      // Sort by intelligence priority first, then by days since last visit
                      const priorityOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
                      const aPri = priorityOrder[a.intel?.priority] ?? 2;
                      const bPri = priorityOrder[b.intel?.priority] ?? 2;
                      if (aPri !== bPri) return aPri - bPri;
                      const attentionPriority = { overdue: 0, review: 1, 'up-to-date': 2 } as const;
                      const attentionDiff =
                        attentionPriority[a.meta.attentionStatus.key as keyof typeof attentionPriority] -
                        attentionPriority[b.meta.attentionStatus.key as keyof typeof attentionPriority];
                      if (attentionDiff !== 0) return attentionDiff;
                      const dateA = a.meta.lastVisitDate ? a.meta.lastVisitDate.getTime() : 0;
                      const dateB = b.meta.lastVisitDate ? b.meta.lastVisitDate.getTime() : 0;
                      return dateA - dateB;
                    });

                  const totalActionNeeded = patientIntelligence.filter((pi: any) => pi.priority === 'HIGH').length;
                  const totalAtRisk = patientIntelligence.filter((pi: any) => pi.status === 'ABANDONO' || pi.status === 'ATENCAO').length;
                  const totalNoAppointment = patientIntelligence.filter((pi: any) => !pi.has_future_appointment && pi.status !== 'FINALIZADO').length;

                  const filterChips = [
                    { key: 'all', label: 'Todos', count: 0 },
                    { key: 'action-needed', label: 'Preciso agir', count: totalActionNeeded },
                    { key: 'at-risk', label: 'Em risco', count: totalAtRisk },
                    { key: 'no-appointment', label: 'Sem agendamento', count: totalNoAppointment },
                    { key: 'in-treatment', label: 'Em tratamento', count: 0 },
                    { key: 'overdue', label: 'Atrasados', count: totalOverdue }
                  ] as const;

                  const handleScheduleFromCard = (patient: Patient) => {
                    setPatientActionsToday(prev => new Set([...prev, patient.id]));
                    openPatientAppointmentModal(patient);
                  };

                  const handleSummaryOverdueClick = () => {
                    setPatientListFilter('overdue');
                    showPatientsFeedback(`${totalOverdue} ${totalOverdue === 1 ? 'paciente precisa' : 'pacientes precisam'} de follow-up.`);
                  };

                  const handleSummaryOpportunityClick = () => {
                    const target = opportunityCandidates[0];
                    if (!target) {
                      showPatientsFeedback('Nenhuma oportunidade disponível agora.');
                      return;
                    }
                    handleScheduleFromCard(target.patient);
                    const firstName = (target.patient.name || '').split(' ')[0] || 'Paciente';
                    showPatientsFeedback(`Sugestão iniciada para ${firstName}.`);
                  };

                  const handleSummaryProgressClick = () => {
                    showPatientsFeedback(
                      handledToday > 0
                        ? `Excelente ritmo: ${handledToday} ${handledToday === 1 ? 'paciente atendido' : 'pacientes atendidos'} hoje.`
                        : 'Comece por um paciente em atraso para avançar hoje.'
                    );
                  };

                  return (
                    <>
                      {/* ── Header ── */}
                      <div className="flex flex-col gap-4 mb-2">
                        <h3 className="text-2xl font-bold tracking-tight text-slate-900">Pacientes</h3>
                        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-full">
                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                              type="text"
                              placeholder="Buscar paciente..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full h-10 pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 transition-all text-sm"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setIsPatientModalOpen(true)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-200/50"
                            title="Novo paciente"
                          >
                            <Plus size={18} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>

                      {/* ── Action-driven status bar ── */}
                      {(() => {
                        const items: React.ReactNode[] = [];

                        // +X hoje — always visible, green + fire when >0
                        items.push(
                          <button
                            key={`hoje-${handledToday}`}
                            type="button"
                            onClick={handleSummaryProgressClick}
                            className={`font-semibold transition-colors ${handledToday > 0 ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                            style={{ animation: 'statusPop 150ms ease-out' }}
                          >
                            {handledToday > 0 ? `🔥 ${handledToday} hoje` : '0 hoje'}
                          </button>
                        );

                        // X oportunidades — only when >0
                        if (freeSlotsToday > 0) {
                          items.push(<span key="sep1" className="text-slate-300">•</span>);
                          items.push(
                            <button
                              key={`oport-${freeSlotsToday}`}
                              type="button"
                              onClick={handleSummaryOpportunityClick}
                              className="text-slate-500 hover:text-slate-700 transition-colors"
                              style={{ animation: 'statusPop 150ms ease-out' }}
                            >
                              {freeSlotsToday} {freeSlotsToday === 1 ? 'oportunidade' : 'oportunidades'}
                            </button>
                          );
                        }

                        // X precisam de atenção — only when >0
                        if (totalOverdue > 0) {
                          items.push(<span key="sep2" className="text-slate-300">•</span>);
                          items.push(
                            <button
                              key={`atencao-${totalOverdue}`}
                              type="button"
                              onClick={handleSummaryOverdueClick}
                              className="text-rose-500 hover:text-rose-700 transition-colors"
                              style={{ animation: 'statusPop 150ms ease-out' }}
                            >
                              {totalOverdue} {totalOverdue === 1 ? 'precisa de atenção' : 'precisam de atenção'}
                            </button>
                          );
                        }

                        return (
                          <div className="h-8 flex items-center gap-2 text-xs overflow-x-auto whitespace-nowrap px-0.5">
                            {items}
                          </div>
                        );
                      })()}

                      {patientsInlineFeedback && (
                        <p className="text-[11px] text-slate-400 px-0.5 -mt-1">{patientsInlineFeedback}</p>
                      )}

                      {/* ── Filter chips ── */}
                      <div className="flex flex-wrap gap-2 bg-slate-100 p-1 rounded-2xl">
                        {filterChips.map(chip => (
                          <button
                            key={chip.key}
                            type="button"
                            onClick={() => setPatientListFilter(chip.key)}
                            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all flex items-center gap-1.5 ${
                              patientListFilter === chip.key
                                ? 'bg-white shadow-sm text-primary'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                          >
                            {chip.label}
                            {chip.count > 0 && (
                              <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ${
                                chip.key === 'action-needed' || chip.key === 'overdue'
                                  ? 'bg-rose-100 text-rose-600'
                                  : chip.key === 'at-risk'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-200 text-slate-600'
                              }`}>
                                {chip.count}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* ── Card grid ── */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {patientCards.map(({ patient, meta, intel }) => {
                          const isOverdue = meta.attentionStatus.key === 'overdue';
                          const isReview  = meta.attentionStatus.key === 'review';
                          const isScheduled = meta.status === 'em_tratamento' && !!meta.nextVisitDate;
                          const isActed   = patientActionsToday.has(patient.id);

                          // Intelligence-driven labels
                          const intelPriority = intel?.priority || null;
                          const intelStatus = intel?.status || null;
                          const daysAgo = intel?.days_since_last_visit;

                          // Status label and config
                          const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
                            ABANDONO:      { label: 'Abandono',       bg: 'bg-rose-50',    text: 'text-rose-700',    dot: 'bg-rose-500' },
                            ATENCAO:       { label: 'Atenção',        bg: 'bg-amber-50',   text: 'text-amber-700',   dot: 'bg-amber-400' },
                            EM_TRATAMENTO: { label: 'Em tratamento',  bg: 'bg-sky-50',     text: 'text-sky-700',     dot: 'bg-sky-500' },
                            FINALIZADO:    { label: 'Concluído',      bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
                          };
                          const priorityConfig: Record<string, { label: string; bg: string; text: string; ring: string }> = {
                            HIGH:   { label: 'Urgente', bg: 'bg-rose-500',    text: 'text-white',     ring: 'ring-rose-200' },
                            MEDIUM: { label: 'Atenção', bg: 'bg-amber-400',   text: 'text-white',     ring: 'ring-amber-200' },
                          };
                          const stCfg = intelStatus ? statusConfig[intelStatus] : null;
                          const priCfg = intelPriority ? priorityConfig[intelPriority] : null;

                          const urgencyLabel = intelStatus === 'ABANDONO'
                            ? `${daysAgo != null ? `${daysAgo}d sem visita` : meta.lastVisitLabel}`
                            : intelStatus === 'ATENCAO'
                            ? `Sem agendamento · ${meta.lastVisitLabel}`
                            : isScheduled
                            ? `Próx: ${meta.nextVisitLabel || 'Agendada'}`
                            : isOverdue
                            ? `Sem visita · ${meta.lastVisitLabel}`
                            : isReview
                              ? `Revisão · ${meta.lastVisitLabel}`
                              : meta.lastVisitLabel;

                          const borderColor = intelPriority === 'HIGH' ? 'border-l-rose-500 border-rose-100' : intelStatus === 'ATENCAO' ? 'border-l-amber-400 border-amber-50' : intelStatus === 'ABANDONO' ? 'border-l-rose-400 border-rose-50' : intelStatus === 'EM_TRATAMENTO' ? 'border-l-sky-400 border-slate-100' : 'border-l-transparent border-slate-100 hover:border-slate-200';

                          return (
                            <div
                              key={patient.id}
                              className={`flex items-stretch bg-white rounded-2xl border border-l-[3px] hover:shadow-md transition-all ${borderColor}`}
                            >
                              <div className="flex items-center gap-3.5 flex-1 min-w-0 px-4 py-3.5">
                                {/* Avatar */}
                                <button
                                  type="button"
                                  onClick={() => openPatientRecord(patient.id)}
                                  className="w-11 h-11 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-sm overflow-hidden border border-primary/20 shrink-0"
                                >
                                  {patient.photo_url ? (
                                    <img src={patient.photo_url} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    (patient.name || '?').charAt(0)
                                  )}
                                </button>

                                {/* Info */}
                                <button
                                  type="button"
                                  onClick={() => openPatientRecord(patient.id)}
                                  className="min-w-0 flex-1 text-left"
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <p className="text-[15px] font-semibold text-slate-900 truncate leading-tight">{patient.name}</p>
                                    {priCfg && (
                                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${priCfg.bg} ${priCfg.text} ring-1 ${priCfg.ring} shrink-0`}>
                                        {priCfg.label}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {stCfg && (
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${stCfg.bg} ${stCfg.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${stCfg.dot}`} />
                                        {stCfg.label}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-400 truncate">
                                      {urgencyLabel}
                                    </span>
                                  </div>
                                  {intel?.next_appointment_date && (
                                    <p className="text-[10px] text-sky-600 font-medium mt-1 flex items-center gap-1">
                                      <Calendar size={10} />
                                      Próx: {new Date(intel.next_appointment_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  )}
                                </button>
                              </div>

                              {/* Icon actions */}
                              <div className="flex items-center gap-1 shrink-0 px-3 border-l border-slate-50">
                                <button
                                  type="button"
                                  title={isActed ? 'Agendamento iniciado' : 'Agendar consulta'}
                                  onClick={() => handleScheduleFromCard(patient)}
                                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                                    isActed
                                      ? 'text-emerald-600 bg-emerald-50'
                                      : 'text-slate-400 hover:text-primary hover:bg-primary/8'
                                  }`}
                                >
                                  {isActed ? <Check size={16} /> : <Calendar size={16} />}
                                </button>
                                <button
                                  type="button"
                                  title="Contatar via WhatsApp"
                                  onClick={() => contactPatientOnWhatsApp(patient)}
                                  className="w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                                >
                                  <MessageCircle size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {patientCards.length === 0 && (
                          <div className="col-span-full bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
                            <Users size={36} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-slate-600 font-medium">Nenhum paciente encontrado para este filtro.</p>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === 'financeiro' && (
              <Finance
                transactions={transactions}
                paymentPlans={paymentPlans}
                installments={installments}
                financialSummary={financialSummary}
                patients={patients}
                apiFetch={apiFetch}
                onOpenTransactionModal={(type) => {
                  setTransactionType(type);
                  setIsTransactionModalOpen(true);
                }}
                onDeleteTransaction={handleDeleteTransaction}
                onGenerateReceipt={generateReceipt}
                onPrint={imprimirDocumento}
                onExport={() => {
                  setExportType('finance');
                  setIsExportModalOpen(true);
                }}
                onOpenPaymentPlanModal={() => setIsPaymentPlanModalOpen(true)}
                onReceiveInstallment={(inst) => {
                  setSelectedInstallment(inst);
                  setIsReceiveInstallmentModalOpen(true);
                }}
                onViewInstallments={(plan) => {
                  setSelectedPlan(plan);
                  setIsViewInstallmentsModalOpen(true);
                }}
                openPatientRecord={openPatientRecord}
                formatDate={formatDate}
              />
            )}

            {(activeTab === 'admin' && user?.role?.toUpperCase() === 'ADMIN') && (
              <div className="max-w-screen-xl mx-auto space-y-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Administração</h2>
                  <p className="text-sm text-slate-500">Gestão de dentistas e aprovações</p>
                </div>
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
                              className="p-2 bg-primary text-white rounded-lg hover:opacity-90 transition-colors"
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
                      className="w-full sm:w-auto bg-primary text-white px-6 py-3 rounded-2xl font-bold hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-[0_12px_36px_rgba(38,78,54,0.12)]"
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
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      />
                    </div>
                    <div className="sm:w-48">
                      <select
                        value={dentistStatusFilter}
                        onChange={(e) => setDentistStatusFilter(e.target.value as any)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-slate-600 font-medium"
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
                                  u.status === 'active' ? 'bg-primary/10 text-primary' :
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
                                      className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-colors"
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
                              u.status === 'active' ? 'bg-primary/10 text-primary' :
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
                                className="flex-1 py-2 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90 transition-colors"
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
              <div className="space-y-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Documentos</h2>
                  <p className="text-sm text-slate-500">Emissão de receitas, atestados e contratos</p>
                </div>
                <Documents patients={patients} profile={profile} apiFetch={apiFetch} imprimirDocumento={imprimirDocumento} />
              </div>
            )}

            {activeTab === 'configuracoes' && profile && (
              <div className="max-w-screen-xl mx-auto space-y-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Configurações</h2>
                  <p className="text-sm text-slate-500">Gerencie seu perfil e preferências</p>
                </div>
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                      <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary/5 shadow-lg bg-slate-100 flex items-center justify-center text-slate-400">
                        {profile.photo_url ? (
                          <img src={profile.photo_url} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <UserCircle size={80} />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-primary text-white p-2 rounded-full shadow-lg cursor-pointer hover:opacity-90 transition-all">
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
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                        <input 
                          required
                          type="email" 
                          value={profile.email}
                          onChange={(e) => setProfile({...profile, email: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Telefone</label>
                        <input 
                          type="text" 
                          value={profile.phone || ''}
                          onChange={(e) => setProfile({...profile, phone: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder="Ex: 12345-SP"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Especialidade</label>
                            <input 
                              type="text" 
                              value={profile.specialty || ''}
                              onChange={(e) => setProfile({...profile, specialty: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                              placeholder="Ex: Clínica Sorriso Perfeito"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Endereço da Clínica</label>
                            <input 
                              type="text" 
                              value={profile.clinic_address || ''}
                              onChange={(e) => setProfile({...profile, clinic_address: e.target.value})}
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                          placeholder="Conte um pouco sobre sua trajetória e formação..."
                        />
                      </div>
                    )}

                    <div className="flex justify-end pt-4">
                      <button 
                        type="submit"
                        disabled={isSavingProfile}
                        className="bg-primary text-white px-10 py-4 rounded-2xl font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-3">
                    <FileText className="text-primary" />
                    Informações Legais
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Link 
                      to="/termos" 
                      target="_blank"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Termos de Uso</p>
                        <p className="text-[10px] text-slate-500">Leia as regras de uso da plataforma</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" size={16} />
                    </Link>
                    <Link 
                      to="/privacidade" 
                      target="_blank"
                      className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all"
                    >
                      <div>
                        <p className="font-bold text-slate-800 text-sm">Política de Privacidade</p>
                        <p className="text-[10px] text-slate-500">Saiba como cuidamos dos seus dados</p>
                      </div>
                      <ChevronRight className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" size={16} />
                    </Link>
                  </div>
                  <div className="mt-6 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-[10px] text-primary font-bold flex items-center gap-2">
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              className="relative bg-white/85 backdrop-blur-2xl border border-white/30 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100/70 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Download className="text-primary" size={24} />
                  Exportar relatório
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Paciente</label>
                    <select 
                      value={exportFilters.patientId}
                      onChange={(e) => setExportFilters({...exportFilters, patientId: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                    className="flex-1 py-3 rounded-full font-bold text-slate-500 hover:bg-slate-100/70 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={exportType === 'patients' ? exportPatients : exportFinance}
                    className="flex-1 bg-primary text-white py-3 rounded-full font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download size={20} />
                    Exportar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Novo Agendamento — iOS Premium Minimalista */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsModalOpen(false);
                setSuggestedSlot(null);
              }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="relative bg-white/80 backdrop-blur-2xl w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[24px] shadow-2xl overflow-hidden max-h-[90vh] sm:max-h-fit overflow-y-auto border border-white/20"
            >
              {/* Minimal Header */}
              <div className="px-5 pt-5 pb-3 border-b border-slate-100/50">
                <div className="flex justify-between items-center gap-4">
                  <h2 className="text-lg font-semibold text-slate-900">Agendar</h2>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setSuggestedSlot(null);
                    }} 
                    className="w-7 h-7 rounded-full hover:bg-slate-100/50 transition-colors flex items-center justify-center shrink-0"
                  >
                    <X size={16} className="text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Alert Suggestion - Super minimalista */}
              {suggestedSlot && (
                <div className="mx-4 mt-3 p-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[12px]">
                  <p className="text-xs text-slate-600 font-medium">
                    <strong>{suggestedSlot.startTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong> • <strong>{Math.floor(suggestedSlot.duration)}min</strong> • {suggestedSlot.procedure}
                  </p>
                </div>
              )}

              {/* Form - iOS Glass Style */}
              <form onSubmit={handleCreateAppointment} className="p-4 sm:p-5 space-y-4">
                
                {/* SEÇÃO 1: Procedimento com sugestões pequenas */}
                <div>
                  {/* Sugestões rápidas - Pequenas pills */}
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {[
                      { label: 'Limpeza', duration: '30' },
                      { label: 'Consulta', duration: '20' },
                      { label: 'Endo', duration: '90' },
                      { label: 'Restauração', duration: '60' },
                    ].map(proc => (
                      <button
                        key={proc.label}
                        type="button"
                        onClick={() => {
                          setNewAppointment({
                            ...newAppointment, 
                            notes: proc.label,
                            duration: proc.duration
                          });
                        }}
                        className={`px-2.5 py-1 rounded-full font-medium text-[11px] transition-all border ${
                          proc.label === newAppointment.notes
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-slate-200/50 bg-slate-100/30 text-slate-600 hover:bg-slate-100/50'
                        }`}
                      >
                        {proc.label}
                      </button>
                    ))}
                  </div>
                  
                  {/* Input para procedimento customizado */}
                  <input
                    type="text"
                    value={newAppointment.notes || ''}
                    onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                    placeholder="Procedimento..."
                    maxLength={60}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[12px] focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                {/* SEÇÃO 2: Paciente (Campo de busca minimalista) */}
                <div>
                  <input 
                    required
                    type="text"
                    placeholder="Paciente..."
                    value={newAppointment.patient_name || ''}
                    onChange={(e) => {
                      const name = e.target.value;
                      setNewAppointment({...newAppointment, patient_name: name});
                      const matched = patients.find(p => p.name.toLowerCase() === name.toLowerCase());
                      if (matched) {
                        setNewAppointment(prev => ({...prev, patient_id: matched.id.toString()}));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[12px] focus:ring-1 focus:ring-primary focus:border-primary outline-none text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                  {newAppointment.patient_name && !newAppointment.patient_id && (
                    <div className="mt-2 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[12px] max-h-40 overflow-y-auto shadow-lg">
                      {patients.filter(p => p.name.toLowerCase().includes(newAppointment.patient_name?.toLowerCase() || '')).length > 0 ? (
                        patients.filter(p => p.name.toLowerCase().includes(newAppointment.patient_name?.toLowerCase() || '')).map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setNewAppointment({...newAppointment, patient_id: p.id.toString(), patient_name: p.name});
                            }}
                            className="w-full text-left px-3.5 py-2 hover:bg-slate-100/50 text-sm text-slate-700 font-medium border-b border-slate-100/30 last:border-b-0 transition-colors"
                          >
                            {p.name}
                          </button>
                        ))
                      ) : (
                        <div className="px-3.5 py-2.5 text-xs text-slate-400">Nenhum paciente</div>
                      )}
                    </div>
                  )}
                </div>

                {/* SEÇÃO 3: Data, Hora, Duração */}
                <div className="grid grid-cols-3 gap-2">
                  <input 
                    required
                    type="date" 
                    value={newAppointment.date}
                    onChange={(e) => setNewAppointment({...newAppointment, date: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[10px] focus:ring-1 focus:ring-primary outline-none text-xs font-medium text-slate-900 transition-all"
                  />
                  <input 
                    required
                    type="time" 
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    className="w-full px-3 py-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[10px] focus:ring-1 focus:ring-primary outline-none text-xs font-medium text-slate-900 transition-all"
                  />
                  <input 
                    required
                    type="number" 
                    min="1"
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({...newAppointment, duration: e.target.value})}
                    placeholder="min"
                    className="w-full px-3 py-2.5 bg-slate-50/50 backdrop-blur-sm border border-slate-200/50 rounded-[10px] focus:ring-1 focus:ring-primary outline-none text-xs font-medium text-slate-900 placeholder:text-slate-400 transition-all"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-2 pt-2">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsModalOpen(false);
                      setSuggestedSlot(null);
                    }}
                    className="flex-1 py-2.5 px-4 border border-slate-200/50 text-slate-700 font-medium rounded-[10px] hover:bg-slate-50/50 active:bg-slate-100/50 transition-all text-sm backdrop-blur-sm"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={!newAppointment.patient_id || !newAppointment.date || !newAppointment.time}
                    className="flex-1 py-2.5 px-4 bg-primary/90 hover:bg-primary text-white font-medium rounded-[10px] active:scale-95 transition-all text-sm shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed backdrop-blur-sm"
                  >
                    Agendar
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Modal de Novo Paciente */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              className="relative bg-white/85 backdrop-blur-2xl border border-white/30 w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-bold text-slate-900">Novo paciente</h3>
                  <button onClick={() => setIsPatientModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={20} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreatePatient} className="space-y-3">
                  {/* Essencial: Nome */}
                  <div>
                    <input 
                      required
                      type="text" 
                      placeholder="Nome completo"
                      value={newPatient.name}
                      onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>

                  {/* Essencial: Telefone */}
                  <div>
                    <input 
                      required
                      type="text" 
                      placeholder="Telefone"
                      value={newPatient.phone}
                      onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>

                  {/* Contato: Email */}
                  <div>
                    <input 
                      type="email" 
                      placeholder="E-mail (opcional)"
                      value={newPatient.email}
                      onChange={(e) => setNewPatient({...newPatient, email: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                    />
                  </div>

                  {/* Informações Adicionais - Collapsible */}
                  <details className="group">
                    <summary className="cursor-pointer text-xs font-bold text-slate-400 uppercase tracking-wider py-3 hover:text-slate-600 transition-colors">
                      + Informações adicionais
                    </summary>
                    <div className="space-y-3 pt-1">
                      <div>
                        <input 
                          type="text" 
                          placeholder="CPF (opcional)"
                          value={newPatient.cpf}
                          onChange={(e) => setNewPatient({...newPatient, cpf: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                      </div>
                      <div>
                        <input 
                          type="date" 
                          value={newPatient.birth_date}
                          onChange={(e) => setNewPatient({...newPatient, birth_date: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                          title="Data de Nascimento"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Endereço (opcional)"
                          value={newPatient.address}
                          onChange={(e) => setNewPatient({...newPatient, address: e.target.value})}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none text-sm"
                        />
                      </div>
                    </div>
                  </details>

                  <div className="flex gap-2.5 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsPatientModalOpen(false)}
                      className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 text-sm font-bold rounded-full hover:bg-slate-100/70 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-full shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95"
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

      {/* Modal de Editar Dentista */}
      <AnimatePresence>
        {isEditDentistModalOpen && editingDentist && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              className="relative bg-white/85 backdrop-blur-2xl border border-white/30 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden"
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={editingDentist.email}
                      onChange={(e) => setEditingDentist({...editingDentist, email: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                      className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95"
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                  <h3 className="text-xl md:text-2xl font-bold text-slate-900">Novo parcelamento</h3>
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Nº de Parcelas</label>
                      <select 
                        required
                        value={newPaymentPlan.installments_count}
                        onChange={(e) => setNewPaymentPlan({...newPaymentPlan, installments_count: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsPaymentPlanModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-100/70 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-full shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95"
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 receipt-modal-overlay">
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
                    <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white">
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              className="relative bg-white/85 backdrop-blur-2xl border border-white/30 w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Novo dentista</h3>
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">E-mail</label>
                    <input 
                      required
                      type="email" 
                      value={newDentist.email}
                      onChange={(e) => setNewDentist({...newDentist, email: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Senha</label>
                    <input 
                      required
                      type="password" 
                      value={newDentist.password}
                      onChange={(e) => setNewDentist({...newDentist, password: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsDentistModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-100/70 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-full shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95"
                    >
                      Salvar dentista
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                  <h3 className="text-2xl font-bold text-slate-900">Adicionar imagem</h3>
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
                        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group overflow-hidden"
                      >
                        {newImage.url ? (
                          <div className="relative w-full h-full p-2">
                            <img src={newImage.url} alt="Preview" className="w-full h-full object-contain rounded-lg" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                              <p className="text-white text-xs font-bold">Alterar Imagem</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-primary">
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
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none"
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
                      className="flex-1 px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-95"
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
              className="relative bg-white/85 backdrop-blur-2xl border border-white/30 w-full max-w-lg rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      {transactionType === 'INCOME' ? 'Lançar receita' : 'Lançar despesa'}
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Categoria</label>
                      <select 
                        value={newTransaction.category}
                        onChange={(e) => setNewTransaction({...newTransaction, category: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Data</label>
                      <input 
                        required
                        type="date" 
                        value={newTransaction.date}
                        onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Forma de Pagamento</label>
                      <select 
                        value={newTransaction.payment_method}
                        onChange={(e) => setNewTransaction({...newTransaction, payment_method: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
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
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-full focus:ring-2 focus:ring-primary/20 outline-none"
                          />
                        </div>
                      </>
                    )}
                    <div className="col-span-2">
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Observações</label>
                      <textarea 
                        rows={2}
                        value={newTransaction.notes || ''}
                        onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-primary/20 outline-none resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-4">
                    <button 
                      type="button"
                      onClick={() => setIsTransactionModalOpen(false)}
                      className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-100/70 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className={`flex-1 px-6 py-3 text-white font-bold rounded-full shadow-lg transition-all active:scale-95 ${
                        transactionType === 'INCOME' 
                          ? 'bg-primary shadow-primary/10 hover:opacity-90' 
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
              className="bg-white/85 backdrop-blur-2xl border border-white/30 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Registrar recebimento</h3>
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
                <div className="bg-slate-50 rounded-[20px] p-4 space-y-3">
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
                    <span className="text-lg font-bold text-primary">
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
                        className={`p-3 rounded-full border text-sm font-medium transition-all ${
                          paymentMethod === method
                            ? 'bg-primary/5 border-primary/20 text-primary shadow-sm'
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
                    className="flex-1 py-3 px-4 text-slate-600 font-bold hover:bg-slate-100/70 rounded-full transition-colors border border-slate-200"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handlePayInstallment(selectedInstallment.id, paymentMethod)}
                    className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-full hover:opacity-90 transition-all shadow-[0_12px_36px_rgba(38,78,54,0.12)] active:scale-95"
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
              className="bg-white/85 backdrop-blur-2xl border border-white/30 rounded-[24px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <List size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Parcelas</h3>
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
                                  ? 'bg-primary/10 text-primary'
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
                                    className="text-primary hover:opacity-80 font-bold text-xs bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
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

      {/* Notifications */}
      {/* Primary Action & Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 z-50 tablet-l:hidden no-print">
        {/* Bottom Navigation */}
        <nav className="bg-white/80 backdrop-blur-xl border-t border-[#C6C6C8]/30 px-2 pt-2 pb-6 flex justify-around items-center">
          <BottomNavItem id="dashboard" label="Início" icon={ClipboardList} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
          <BottomNavItem id="agenda" label="Agenda" icon={Calendar} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
          <BottomNavItem id="pacientes" label="Pacientes" icon={Users} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
          <BottomNavItem id="financeiro" label="Financeiro" icon={DollarSign} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
          <BottomNavItem id="configuracoes" label="Mais" icon={Settings} activeTab={activeTab} setActiveTab={setActiveTab} navigate={navigate} />
        </nav>
      </div>

      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' 
                ? 'bg-primary border-primary/20 text-white' 
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
              className="bg-white/85 backdrop-blur-2xl border border-white/30 rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Confirmar</h3>
                <p className="text-slate-600">{confirmation.message}</p>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setConfirmation(null)}
                  className="flex-1 px-6 py-3 bg-white border border-slate-200 text-slate-600 font-bold rounded-full hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmation.onConfirm();
                    setConfirmation(null);
                  }}
                  className="flex-1 px-6 py-3 bg-rose-600 text-white font-bold rounded-full hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all"
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
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3 text-primary text-sm">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar Instruções'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <Link to="/" className="text-xs text-primary font-bold hover:underline">
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
          <Link to="/" className="bg-primary text-white px-6 py-3 rounded-xl font-bold inline-block">
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
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-white shadow-xl shadow-primary/20">
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3 text-primary text-sm">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <button 
              type="submit"
              disabled={loading || success}
              className="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-[0_12px_36px_rgba(38,78,54,0.12)] hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-50"
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
              className="print-btn flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-[0_12px_36px_rgba(38,78,54,0.12)]"
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
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center text-white">
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
                <span className="text-2xl font-black text-primary">
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
                <span className={`text-3xl font-black ${(summary.totalIncome - summary.totalExpense) >= 0 ? 'text-primary' : 'text-rose-600'}`}>
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
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${t.type === 'INCOME' ? 'bg-primary/5 text-primary' : 'bg-rose-50 text-rose-600'}`}>
                      {t.type === 'INCOME' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td className={`py-4 font-black text-right ${t.type === 'INCOME' ? 'text-primary' : 'text-rose-600'}`}>
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
        <div className="text-center border-b-2 border-primary/20 pb-6 mb-10">
          <h1 className="text-3xl font-bold text-primary uppercase tracking-widest">
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
            <h2 className="text-2xl font-bold uppercase underline decoration-primary/40 underline-offset-8">
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
                <p className="font-bold text-xl mb-4 text-primary">Uso Interno:</p>
                {content.items?.map((item: any, i: number) => (
                  <div key={i} className="border-l-4 border-primary/40 pl-4 mb-6">
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
                    <h4 className="font-bold border-b-2 border-primary/40 pb-1 text-primary uppercase tracking-wider">Histórico Clínico (Anamnese)</h4>
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
                    <h4 className="font-bold border-b-2 border-primary/40 pb-1 text-primary uppercase tracking-wider">Histórico de Atendimentos (Evolução)</h4>
                    {patient?.evolution && patient.evolution.length > 0 ? (
                      <div className="space-y-4">
                        {patient.evolution.map((evo: any, i: number) => (
                          <div key={i} className="border-b border-slate-100 pb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-bold text-primary">{new Date(evo.date).toLocaleDateString('pt-BR')}</span>
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
                    <tr className="bg-primary/5 text-primary">
                      <th className="border border-primary/10 p-3 text-left">Procedimento</th>
                      <th className="border border-primary/10 p-3 text-right">Valor</th>
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
                      <td className="border border-slate-100 p-3 text-right text-primary">
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
