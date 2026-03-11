import React, { useState, useEffect } from 'react';
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
  Upload,
  FileText,
  UserPlus,
  UserCircle,
  Menu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Odontogram } from './components/Odontogram';

// Types
interface Patient {
  id: number;
  name: string;
  cpf: string;
  phone: string;
  email: string;
  birth_date?: string;
  address?: string;
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
}

interface Dentist {
  id: number;
  name: string;
  email: string;
  role: string;
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
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agenda' | 'pacientes' | 'financeiro' | 'prontuario' | 'configuracoes' | 'admin'>('dashboard');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dentists, setDentists] = useState<Dentist[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: number; name: string; role: string } | null>(null);
  const [activeDentist, setActiveDentist] = useState<{ id: number; name: string } | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ name: '', email: '', password: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedPatientTab, setSelectedPatientTab] = useState<'evolucao' | 'imagens'>('evolucao');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isDentistModalOpen, setIsDentistModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendaViewMode, setAgendaViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [statusFilter, setStatusFilter] = useState<string[]>(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS']);
  const [agendaSearchTerm, setAgendaSearchTerm] = useState('');
  const [dentistFilter, setDentistFilter] = useState<string>('all');
  const [isEvolutionFormOpen, setIsEvolutionFormOpen] = useState(false);
  const [newEvolution, setNewEvolution] = useState({ notes: '', procedure: '' });
  const [newDentist, setNewDentist] = useState({ name: '', email: '', password: '' });
  const [newImage, setNewImage] = useState({ url: '', description: '' });
  const [newAppointment, setNewAppointment] = useState({
    patient_id: '',
    dentist_id: '',
    start_time: '',
    end_time: '',
    notes: ''
  });
  const [newPatient, setNewPatient] = useState({
    name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    email: '',
    address: ''
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        setActiveDentist({ id: parsedUser.id, name: parsedUser.name });
        if (parsedUser.role === 'DENTIST') {
          setDentistFilter(parsedUser.id.toString());
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
      if (user.role === 'ADMIN') {
        fetchAdminUsers();
      }
    }
  }, [user, activeDentist]);

  const fetchData = async () => {
    if (!user) return;
    try {
      const dentistId = user.role === 'ADMIN' ? (activeDentist?.id || user.id) : user.id;
      const [pRes, aRes, dRes] = await Promise.all([
        fetch(`/api/patients?dentist_id=${dentistId}`),
        fetch(`/api/appointments?dentist_id=${dentistId}`),
        fetch('/api/dentists')
      ]);
      const pData = await pRes.json();
      const aData = await aRes.json();
      const dData = await dRes.json();
      setPatients(pData);
      setAppointments(aData);
      setDentists(dData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      setAdminUsers(data);
    } catch (error) {
      console.error('Error fetching admin users:', error);
    }
  };

  const updateUserStatus = async (userId: number, status: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        setUser(data.user);
        setActiveDentist({ id: data.user.id, name: data.user.name });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        if (data.user.role === 'DENTIST') {
          setDentistFilter(data.user.id.toString());
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

  const openAppointmentModal = () => {
    if (activeDentist) {
      setNewAppointment(prev => ({ ...prev, dentist_id: activeDentist.id.toString() }));
    } else if (user && user.role === 'DENTIST') {
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
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAppointment)
      });
      const data = await res.json();
      if (res.ok) {
        setIsModalOpen(false);
        fetchData();
        setNewAppointment({ patient_id: '', dentist_id: '', start_time: '', end_time: '', notes: '' });
        alert('Agendamento realizado com sucesso!');
      } else {
        alert(data.error || 'Erro ao realizar agendamento');
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
      alert('Erro de conexão ao realizar agendamento');
    }
  };

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      const dentistId = user.role === 'ADMIN' ? (activeDentist?.id || user.id) : user.id;
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPatient, dentist_id: dentistId })
      });
      if (res.ok) {
        setIsPatientModalOpen(false);
        fetchData();
        setNewPatient({ name: '', cpf: '', birth_date: '', phone: '', email: '', address: '' });
      }
    } catch (error) {
      console.error('Error creating patient:', error);
    }
  };

  const handleCreateDentist = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Enviando dados do novo dentista:', newDentist);
    try {
      const res = await fetch('/api/dentists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newDentist)
      });
      const data = await res.json();
      if (res.ok) {
        console.log('Dentista cadastrado com sucesso:', data);
        setIsDentistModalOpen(false);
        fetchData();
        setNewDentist({ name: '', email: '', password: '' });
        alert('Dentista cadastrado com sucesso!');
      } else {
        console.error('Erro retornado pelo servidor:', data.error);
        alert(data.error || 'Erro ao cadastrar dentista');
      }
    } catch (error) {
      console.error('Error creating dentist:', error);
      alert('Erro de conexão ao cadastrar dentista');
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient) return;
    try {
      await uploadFile(selectedPatient.id, newImage.url, newImage.description);
      setIsImageModalOpen(false);
      setNewImage({ url: '', description: '' });
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const updateStatus = async (id: number, status: Appointment['status']) => {
    try {
      const res = await fetch(`/api/appointments/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const openPatientRecord = async (id: number) => {
    if (!user) return;
    try {
      const dentistId = user.role === 'ADMIN' ? (activeDentist?.id || user.id) : user.id;
      const res = await fetch(`/api/patients/${id}?dentist_id=${dentistId}`);
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
      const res = await fetch(`/api/patients/${selectedPatient.id}/anamnesis`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch(`/api/patients/${selectedPatient.id}/odontogram`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: updatedOdontogram })
      });
      if (res.ok) {
        setSelectedPatient({ ...selectedPatient, odontogram: updatedOdontogram });
      }
    } catch (error) {
      console.error('Error saving odontogram:', error);
    }
  };

  const addEvolution = async (notes: string, procedure: string) => {
    if (!selectedPatient || !user) return;
    try {
      const dentistId = user.role === 'ADMIN' ? (activeDentist?.id || user.id) : user.id;
      const res = await fetch(`/api/patients/${selectedPatient.id}/evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, procedure_performed: procedure, dentist_id: dentistId })
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
    try {
      // Primeiro chama o backend para registrar (opcional, mas bom para log)
      await fetch(`/api/appointments/${app.id}/remind`, { method: 'POST' });
      
      // Formata a mensagem de WhatsApp
      const date = new Date(app.start_time).toLocaleDateString('pt-BR');
      const time = new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const message = `Olá ${app.patient_name}, confirmamos sua consulta na OdontoManager para o dia ${date} às ${time}. Podemos confirmar sua presença?`;
      
      // Limpa o número de telefone (apenas números)
      const phone = app.patient_phone.replace(/\D/g, '');
      
      // Abre o WhatsApp
      const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error sending reminder:', error);
    }
  };

  const uploadFile = async (patientId: number, fileUrl: string, description: string) => {
    try {
      const res = await fetch(`/api/patients/${patientId}/files`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_url: fileUrl, file_type: 'image', description })
      });
      if (res.ok) openPatientRecord(patientId);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const deleteFile = async (fileId: number) => {
    if (!selectedPatient) return;
    try {
      const res = await fetch(`/api/files/${fileId}`, { method: 'DELETE' });
      if (res.ok) openPatientRecord(selectedPatient.id);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
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
      <Icon size={20} />
      <span className="font-medium">{label}</span>
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

  if (!user) {
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
              <h1 className="text-3xl font-bold text-slate-900 mb-2">OdontoManager</h1>
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

              <button 
                type="submit"
                className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-[0.98]"
              >
                {isRegistering ? 'Criar Conta' : 'Entrar no Sistema'}
              </button>
            </form>

            <div className="mt-8 text-center">
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
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans text-slate-900 relative">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 p-6 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between mb-10 px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Plus size={24} strokeWidth={3} />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">OdontoManager</h1>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
            <Plus size={24} className="rotate-45" />
          </button>
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem id="dashboard" icon={ClipboardList} label="Dashboard" />
          <SidebarItem id="agenda" icon={Calendar} label="Agenda" />
          <SidebarItem id="pacientes" icon={Users} label="Pacientes" />
          <SidebarItem id="financeiro" icon={DollarSign} label="Financeiro" />
          {user && user.role === 'ADMIN' && (
            <SidebarItem id="admin" icon={Settings} label="Painel Admin" />
          )}
          <SidebarItem id="configuracoes" icon={Settings} label="Configurações" />
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
              <UserCircle size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{user?.name}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">{user?.role}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-slate-500 hover:text-rose-600 transition-colors"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <header className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">
                {activeTab === 'dashboard' && 'Bem-vindo, Dr.'}
                {activeTab === 'agenda' && 'Agenda Clínica'}
                {activeTab === 'pacientes' && 'Gestão de Pacientes'}
                {activeTab === 'financeiro' && 'Controle Financeiro'}
                {activeTab === 'configuracoes' && 'Configurações'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white border border-slate-200 rounded-xl text-slate-600"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            {(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') && (
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                <UserCircle size={18} className="text-emerald-600" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-0.5">Agendando como:</span>
                  <select 
                    value={activeDentist?.id || ''}
                    onChange={(e) => {
                      const d = dentists.find(dentist => dentist.id.toString() === e.target.value);
                      if (d) setActiveDentist({ id: d.id, name: d.name });
                    }}
                    className="text-xs font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
                  >
                    {dentists.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar paciente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl md:w-64 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
            <button 
              onClick={() => setIsPatientModalOpen(true)}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 active:scale-95"
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
          >
            {searchTerm && activeTab !== 'pacientes' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm mb-8">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">Resultados da Busca: "{searchTerm}"</h3>
                  <button onClick={() => setSearchTerm('')} className="text-sm text-slate-400 hover:text-slate-600">Limpar</button>
                </div>
                <div className="space-y-2">
                  {patients
                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || (p.cpf && p.cpf.includes(searchTerm)))
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
                          <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold">
                            {p.name.charAt(0)}
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
                  {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                    <p className="text-center py-4 text-slate-400 text-sm">Nenhum paciente encontrado.</p>
                  )}
                  {patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 5 && (
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Stats */}
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                  {[
                    { label: 'Pacientes Ativos', value: patients.length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Consultas Hoje', value: appointments.filter(a => new Date(a.start_time).toDateString() === new Date().toDateString()).length, icon: Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Aguardando', value: 2, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Receita Mensal', value: 'R$ 12.450', icon: DollarSign, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center mb-4`}>
                        <stat.icon size={24} />
                      </div>
                      <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                    </div>
                  ))}
                </div>

                {/* Next Appointments */}
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">Próximas Consultas</h3>
                    <button 
                      onClick={() => setActiveTab('agenda')}
                      className="text-emerald-600 text-sm font-bold hover:underline"
                    >
                      Ver Agenda Completa
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {appointments.length > 0 ? appointments.map((app) => (
                      <div 
                        key={app.id} 
                        onClick={() => openPatientRecord(app.patient_id)}
                        className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                            <UserCircle size={28} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{app.patient_name}</p>
                            <p className="text-sm text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Clock size={14} />
                              {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <StatusBadge status={app.status} />
                          <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 text-center">
                        <Calendar className="mx-auto text-slate-200 mb-4" size={48} />
                        <p className="text-slate-500">Nenhuma consulta agendada para hoje.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions / Alerts */}
                <div className="space-y-6">
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
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Mini Calendar / Filters */}
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold mb-4 text-slate-800">Filtros da Agenda</h3>
                    <div className="space-y-4">
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
                          value={selectedDate.toISOString().split('T')[0]}
                          onChange={(e) => setSelectedDate(new Date(e.target.value))}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Dentista</label>
                        <select 
                          value={dentistFilter}
                          onChange={(e) => setDentistFilter(e.target.value)}
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 outline-none"
                        >
                          <option value="all">Todos os Dentistas</option>
                          {dentists.map(d => (
                            <option key={d.id} value={d.id.toString()}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="pt-4 border-t border-slate-50 space-y-3">
                        <button 
                          onClick={() => setDentistFilter('all')}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                            dentistFilter === 'all' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                          }`}
                        >
                          <Users size={16} />
                          Ver Agenda Geral
                        </button>
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
                    <div className="space-y-2">
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
                <div className="lg:col-span-3 space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 mr-2">
                          <button 
                            onClick={() => {
                              const newDate = new Date(selectedDate);
                              if (agendaViewMode === 'day') newDate.setDate(selectedDate.getDate() - 1);
                              else if (agendaViewMode === 'week') newDate.setDate(selectedDate.getDate() - 7);
                              else if (agendaViewMode === 'month') newDate.setMonth(selectedDate.getMonth() - 1);
                              setSelectedDate(newDate);
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                          >
                            <ChevronRight size={18} className="rotate-180" />
                          </button>
                          <button 
                            onClick={() => {
                              const newDate = new Date(selectedDate);
                              if (agendaViewMode === 'day') newDate.setDate(selectedDate.getDate() + 1);
                              else if (agendaViewMode === 'week') newDate.setDate(selectedDate.getDate() + 7);
                              else if (agendaViewMode === 'month') newDate.setMonth(selectedDate.getMonth() + 1);
                              setSelectedDate(newDate);
                            }}
                            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                        <h3 className="font-bold text-lg">
                          {agendaViewMode === 'day' ? 'Horários de Hoje' : 
                           agendaViewMode === 'week' ? 'Horários da Semana' : 'Horários do Mês'}
                        </h3>
                        <span className="text-xs font-medium text-slate-500">
                          {agendaViewMode === 'day' ? selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : 
                           agendaViewMode === 'week' ? `Semana de ${new Date(selectedDate.getTime() - selectedDate.getDay() * 86400000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}` : 
                           selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                          {appointments.filter(a => {
                            const appDate = new Date(a.start_time);
                            if (agendaViewMode === 'day') return appDate.toDateString() === selectedDate.toDateString();
                            if (agendaViewMode === 'week') {
                              const startOfWeek = new Date(selectedDate);
                              startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
                              const endOfWeek = new Date(startOfWeek);
                              endOfWeek.setDate(startOfWeek.getDate() + 6);
                              const appDateTime = appDate.getTime();
                              return appDateTime >= startOfWeek.setHours(0,0,0,0) && appDateTime <= endOfWeek.setHours(23,59,59,999);
                            }
                            if (agendaViewMode === 'month') return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
                            return false;
                          }).length} Consultas
                        </span>
                        <button 
                          onClick={() => setSelectedDate(new Date())}
                          className="text-[10px] font-bold text-slate-400 hover:text-emerald-600 uppercase tracking-wider transition-colors"
                        >
                          Hoje
                        </button>
                      </div>
                      <div className="flex bg-slate-100 p-1 rounded-lg">
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

                    <div className="divide-y divide-slate-100">
                      {(() => {
                        const filtered = appointments
                          .filter(a => {
                            const appDate = new Date(a.start_time);
                            const isSameDay = appDate.toDateString() === selectedDate.toDateString();
                            
                            if (agendaViewMode === 'day') return isSameDay;
                            
                            if (agendaViewMode === 'week') {
                              const startOfWeek = new Date(selectedDate);
                              startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
                              const endOfWeek = new Date(startOfWeek);
                              endOfWeek.setDate(startOfWeek.getDate() + 6);
                              
                              const appDateTime = appDate.getTime();
                              return appDateTime >= startOfWeek.setHours(0,0,0,0) && appDateTime <= endOfWeek.setHours(23,59,59,999);
                            }
                            
                            if (agendaViewMode === 'month') {
                              return appDate.getMonth() === selectedDate.getMonth() && appDate.getFullYear() === selectedDate.getFullYear();
                            }
                            
                            return false;
                          })
                          .filter(a => statusFilter.length === 0 || statusFilter.includes(a.status))
                          .filter(a => agendaSearchTerm === '' || a.patient_name.toLowerCase().includes(agendaSearchTerm.toLowerCase()))
                          .filter(a => dentistFilter === 'all' || a.dentist_id.toString() === dentistFilter)
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

                        return Object.entries(grouped).map(([date, apps]) => (
                          <div key={date}>
                            {agendaViewMode !== 'day' && (
                              <div className="bg-slate-50 px-6 py-2 border-y border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                  {new Date(date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                                </span>
                              </div>
                            )}
                            {apps.map((app) => (
                              <div key={app.id} className="p-8 flex gap-8 hover:bg-slate-50/50 transition-colors group border-b border-slate-50 last:border-0">
                                <div className="w-24 pt-1 flex flex-col items-center justify-start border-r border-slate-100 pr-6">
                                  <p className="text-lg font-black text-slate-900 leading-none">
                                    {new Date(app.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                  <div className="w-full h-px bg-slate-100 my-2" />
                                  <p className="text-xs font-bold text-slate-400">
                                    {new Date(app.end_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                
                                <div className="flex-1 bg-white border border-slate-100 p-6 rounded-2xl shadow-sm group-hover:border-emerald-200 group-hover:shadow-md transition-all flex justify-between items-center">
                                  <div 
                                    className="flex items-center gap-5 cursor-pointer"
                                    onClick={() => openPatientRecord(app.patient_id)}
                                  >
                                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                      <UserCircle size={32} />
                                    </div>
                                    <div>
                                      <p className="text-lg font-bold text-slate-800 group-hover:text-emerald-900 transition-colors">{app.patient_name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-slate-500 italic">Procedimento não especificado</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full" />
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{app.dentist_name}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-4">
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
                                      className="text-sm font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                    >
                                      <option value="SCHEDULED">Agendado</option>
                                      <option value="CONFIRMED">Confirmado</option>
                                      <option value="CANCELLED">Cancelado</option>
                                      <option value="IN_PROGRESS">Em Atendimento</option>
                                      <option value="FINISHED">Finalizado</option>
                                    </select>
                                    <StatusBadge status={app.status} />
                                  </div>
                                </div>
                              </div>
                            ))}
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
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold text-slate-900">Gestão de Pacientes</h3>
                  <button 
                    onClick={() => setIsPatientModalOpen(true)}
                    className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Novo Paciente
                  </button>
                </div>
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
                        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
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
                            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                              {patient.name.charAt(0)}
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
            </div>
          )}

            {activeTab === 'prontuario' && selectedPatient && (
              <div className="space-y-8">
                <div className="flex items-center gap-4 mb-6">
                  <button 
                    onClick={() => setActiveTab('pacientes')}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                  >
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                  <h3 className="text-2xl font-bold text-slate-900">Prontuário: {selectedPatient.name}</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Sidebar: Patient Info & Anamnesis */}
                  <div className="space-y-8">
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserCircle size={18} className="text-emerald-600" />
                        Dados Pessoais
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">CPF</span> {selectedPatient.cpf || '---'}</p>
                        <p><span className="text-slate-400 font-medium uppercase text-[10px] block">Nascimento</span> {selectedPatient.birth_date || '---'}</p>
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
                        {['evolucao', 'imagens'].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setSelectedPatientTab(tab as any)}
                            className={`px-6 py-4 text-sm font-bold transition-all border-b-2 ${
                              selectedPatientTab === tab 
                                ? 'border-emerald-600 text-emerald-600 bg-emerald-50/30' 
                                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {tab === 'evolucao' ? 'Evolução Clínica' : 'Imagens & RX'}
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
                                          {new Date(evo.date).toLocaleDateString('pt-BR')} às {new Date(evo.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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
                        ) : (
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
                        )}
                      </div>
                    </div>

                    {/* Odontogram */}
                    <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-center mb-6">
                        <h4 className="text-xl font-bold text-slate-800">Odontograma Interativo</h4>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Clique no dente para alterar o status</span>
                      </div>
                      <Odontogram 
                        data={selectedPatient.odontogram || {}} 
                        onChange={saveOdontogram} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'admin' && user.role === 'ADMIN' && (
              <div className="space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-2xl font-bold text-slate-900">Painel de Administração</h3>
                </div>
                
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                        <th className="px-6 py-4">Usuário</th>
                        <th className="px-6 py-4">E-mail</th>
                        <th className="px-6 py-4">Data Cadastro</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold">
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-bold text-slate-800">{u.name}</p>
                                <p className="text-[10px] text-slate-400 uppercase font-bold">{u.role}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-slate-500 text-sm">{u.email}</td>
                          <td className="px-6 py-4 text-slate-500 text-sm">
                            {new Date(u.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              u.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                              u.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {u.status === 'active' ? 'Ativo' : u.status === 'pending' ? 'Pendente' : 'Bloqueado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
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
                                  Bloquear
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'configuracoes' && (
              <div className="space-y-8">
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h3 className="text-2xl font-bold text-slate-900">Gestão de Dentistas</h3>
                      <p className="text-slate-500">Gerencie os profissionais da sua clínica</p>
                    </div>
                    <button 
                      onClick={() => setIsDentistModalOpen(true)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
                    >
                      <UserPlus size={20} />
                      Adicionar Dentista
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {dentists.map((dentist) => (
                      <div key={dentist.id} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                            <UserCircle size={28} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{dentist.name}</p>
                            <p className="text-xs text-slate-500">{dentist.email}</p>
                            <span className="inline-block mt-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">
                              {dentist.role}
                            </span>
                          </div>
                        </div>
                        {dentist.role !== 'ADMIN' && (
                          <button 
                            onClick={() => {
                              if (confirm('Deseja remover este dentista?')) {
                                fetch(`/api/dentists/${dentist.id}`, { method: 'DELETE' }).then(() => fetchData());
                              }
                            }}
                            className="text-slate-300 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-2">Configurações do Sistema</h3>
                    <p className="text-slate-400 mb-6">Personalize sua experiência no OdontoManager</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Bell size={20} className="text-emerald-400" />
                          <span className="text-sm font-medium">Notificações por WhatsApp</span>
                        </div>
                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Lock size={20} className="text-emerald-400" />
                          <span className="text-sm font-medium">Backup Automático</span>
                        </div>
                        <div className="w-10 h-5 bg-emerald-500 rounded-full relative">
                          <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Novo Agendamento</h3>
                  <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                <form onSubmit={handleCreateAppointment} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Dentista</label>
                      <select 
                        required
                        value={newAppointment.dentist_id}
                        onChange={(e) => setNewAppointment({...newAppointment, dentist_id: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      >
                        <option value="">Selecione um dentista</option>
                        {dentists.map(d => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                      </select>
                    </div>
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
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Cadastrar Paciente</h3>
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
                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">URL da Imagem</label>
                    <input 
                      required
                      type="url" 
                      placeholder="https://exemplo.com/imagem.jpg"
                      value={newImage.url}
                      onChange={(e) => setNewImage({...newImage, url: e.target.value})}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
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
    </div>
  );
}
