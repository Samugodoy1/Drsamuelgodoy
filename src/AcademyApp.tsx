import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, LogOut, Eye, EyeOff } from './icons';
import { AcademyExperience } from './components/AcademyExperience';

interface AcademyUser {
  id: number;
  name: string;
  email: string;
  role: string;
  demoMode?: boolean;
}

export default function AcademyApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AcademyUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerMessage, setRegisterMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '', rememberMe: false });
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    acceptedTerms: false,
    acceptedPrivacyPolicy: false,
    acceptedResponsibility: false
  });

  // Check if user is already logged in (Academy session)
  useEffect(() => {
    const checkSession = () => {
      const savedUser = localStorage.getItem('academy_user');
      const savedToken = localStorage.getItem('academy_token');
      
      if (savedUser && savedToken) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);
        } catch (e) {
          console.error('Error parsing saved user:', e);
          localStorage.removeItem('academy_user');
          localStorage.removeItem('academy_token');
        }
      }
      setLoading(false);
    };

    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      const res = await fetch('/api/academy/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      const data = await res.json();
      
      if (res.ok) {
        const academyUser = data.user;
        localStorage.setItem('academy_token', data.token);
        localStorage.setItem('academy_user', JSON.stringify(academyUser));
        setUser(academyUser);
        setLoginData({ email: '', password: '', rememberMe: false });
      } else {
        setLoginError(data.error || 'Erro ao fazer login. Verifique suas credenciais.');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor. Tente novamente.');
      console.error('Login error:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setRegisterMessage('');

    if (registerData.password !== registerData.passwordConfirm) {
      setLoginError('As senhas não correspondem.');
      return;
    }

    if (!registerData.acceptedTerms || !registerData.acceptedPrivacyPolicy || !registerData.acceptedResponsibility) {
      setLoginError('Você deve aceitar todos os termos para continuar.');
      return;
    }

    try {
      const res = await fetch('/api/academy/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: registerData.name,
          email: registerData.email,
          password: registerData.password,
          acceptedTerms: registerData.acceptedTerms,
          acceptedPrivacyPolicy: registerData.acceptedPrivacyPolicy,
          acceptedResponsibility: registerData.acceptedResponsibility
        })
      });
      const data = await res.json();
      
      if (res.ok) {
        setRegisterMessage('Cadastro realizado com sucesso! Agora você pode fazer login.');
        setIsRegistering(false);
        setRegisterData({
          name: '',
          email: '',
          password: '',
          passwordConfirm: '',
          acceptedTerms: false,
          acceptedPrivacyPolicy: false,
          acceptedResponsibility: false
        });
      } else {
        setLoginError(data.error || 'Erro ao fazer cadastro.');
      }
    } catch (error) {
      setLoginError('Erro de conexão com o servidor.');
      console.error('Register error:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('academy_token');
    localStorage.removeItem('academy_user');
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#174F35] to-[#0D3822] flex items-center justify-center">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Not logged in - show login/register screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-6 font-sans text-slate-900">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[372px]"
        >
          {/* Heading */}
          <motion.div
            className="mb-11"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="text-[26px] font-semibold text-[#0F1211] tracking-[-0.4px] leading-[1.2] mb-2.5">
              {isRegistering ? 'Comece sua jornada de aprendizado' : (() => {
                const h = new Date().getHours();
                if (h >= 5 && h < 12) return 'Bom dia ☀️ Pronto para aprender?';
                if (h >= 12 && h < 18) return 'Boa tarde 👋🏻 Vamos estudar?';
                return 'Boa noite 🌙 Que tal revisar o conteúdo?';
              })()}
            </h1>
            <p className="text-[15px] text-[#8B918E] leading-relaxed">
              {isRegistering ? 'Acesse a plataforma de aplicação clínica' : 'Acesse a OdontoHub Academy'}
            </p>
          </motion.div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-5">
            {isRegistering && (
              <div>
                <label className="block text-[13px] font-medium text-[#4B5250] mb-2">Nome completo</label>
                <input
                  type="text"
                  required
                  placeholder="Seu nome"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({...registerData, name: e.target.value})}
                  className="w-full h-[48px] px-4 bg-white border border-[#DFE3E1] rounded-[12px] text-base text-[#0F1211] placeholder-[#C0C7C3] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-[#2E6B53] focus:bg-[#FBFEFC] focus:shadow-[0_0_0_4px_rgba(46,107,83,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                />
              </div>
            )}

            <div>
              <label className="block text-[13px] font-medium text-[#4B5250] mb-2">E-mail</label>
              <input
                type="email"
                required
                placeholder="voce@email.com"
                value={isRegistering ? registerData.email : loginData.email}
                onChange={(e) => isRegistering
                  ? setRegisterData({...registerData, email: e.target.value})
                  : setLoginData({...loginData, email: e.target.value})
                }
                className="w-full h-[48px] px-4 bg-white border border-[#DFE3E1] rounded-[12px] text-base text-[#0F1211] placeholder-[#C0C7C3] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-[#2E6B53] focus:bg-[#FBFEFC] focus:shadow-[0_0_0_4px_rgba(46,107,83,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[13px] font-medium text-[#4B5250]">Senha</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={isRegistering ? registerData.password : loginData.password}
                  onChange={(e) => isRegistering
                    ? setRegisterData({...registerData, password: e.target.value})
                    : setLoginData({...loginData, password: e.target.value})
                  }
                  className="w-full h-[48px] px-4 bg-white border border-[#DFE3E1] rounded-[12px] text-base text-[#0F1211] placeholder-[#C0C7C3] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-[#2E6B53] focus:bg-[#FBFEFC] focus:shadow-[0_0_0_4px_rgba(46,107,83,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AAA7] hover:text-[#6B7270] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isRegistering && (
              <div>
                <label className="text-[13px] font-medium text-[#4B5250] mb-2 block">Confirmar senha</label>
                <div className="relative">
                  <input
                    type={showPasswordConfirm ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={registerData.passwordConfirm}
                    onChange={(e) => setRegisterData({...registerData, passwordConfirm: e.target.value})}
                    className="w-full h-[48px] px-4 bg-white border border-[#DFE3E1] rounded-[12px] text-base text-[#0F1211] placeholder-[#C0C7C3] outline-none transition-[border-color,box-shadow,background-color] duration-200 ease-out focus:border-[#2E6B53] focus:bg-[#FBFEFC] focus:shadow-[0_0_0_4px_rgba(46,107,83,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#A3AAA7] hover:text-[#6B7270] transition-colors"
                  >
                    {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {loginError && (
              <motion.p
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="text-[13px] text-rose-500"
              >
                {loginError}
              </motion.p>
            )}

            {registerMessage && (
              <motion.p
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="text-[13px] text-[#2E6B53]"
              >
                {registerMessage}
              </motion.p>
            )}

            {isRegistering && (
              <div className="space-y-3 pt-0.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={registerData.acceptedTerms && registerData.acceptedPrivacyPolicy}
                    onChange={(e) => setRegisterData({
                      ...registerData,
                      acceptedTerms: e.target.checked,
                      acceptedPrivacyPolicy: e.target.checked
                    })}
                    className="mt-[3px] w-3.5 h-3.5 rounded-[4px] border-[#D1D5DB] text-[#2E6B53] focus:ring-0 cursor-pointer shrink-0"
                  />
                  <span className="text-[13px] text-[#6B7270] leading-snug">
                    Li e concordo com os Termos de Uso e a Política de Privacidade.
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={registerData.acceptedResponsibility}
                    onChange={(e) => setRegisterData({...registerData, acceptedResponsibility: e.target.checked})}
                    className="mt-[3px] w-3.5 h-3.5 rounded-[4px] border-[#D1D5DB] text-[#2E6B53] focus:ring-0 cursor-pointer shrink-0"
                  />
                  <span className="text-[13px] text-[#6B7270] leading-snug">
                    Declaro que sou responsável legal pelo uso desta plataforma.
                  </span>
                </label>
              </div>
            )}

            <div className="pt-3">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25, mass: 0.8 }}
                className="w-full h-[48px] bg-[#264E36] hover:bg-[#1E4230] text-white text-[15px] font-medium rounded-[12px] shadow-[0_1px_3px_rgba(38,78,54,0.1),0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_3px_8px_rgba(38,78,54,0.14),0_1px_2px_rgba(0,0,0,0.04)] transition-[background-color,box-shadow] duration-[160ms] ease-in-out"
                style={{ willChange: 'transform' }}
              >
                {isRegistering ? 'Criar conta' : 'Continuar'}
              </motion.button>
              <p className="text-center text-[11px] text-[#C0C7C3] mt-3.5">Plataforma segura · Dados criptografados</p>
            </div>
          </form>

          {/* Footer links */}
          <div className="mt-14 space-y-6">
            <div className="text-center">
              <motion.button
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError('');
                  setRegisterMessage('');
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="text-[13px] text-[#8B918E] hover:text-[#4B5250] transition-colors duration-200"
              >
                {isRegistering ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Logged in - show Academy experience
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top bar with logout */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200">
        <div className="max-w-[480px] mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="font-bold text-slate-900">OdontoHub Academy</h1>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
          >
            <LogOut size={16} />
            <span>Sair</span>
          </button>
        </div>
      </div>

      {/* Academy Experience */}
      <Routes>
        <Route path="/*" element={<AcademyExperience />} />
      </Routes>
    </div>
  );
}
