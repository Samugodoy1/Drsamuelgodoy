import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, ArrowRight, Sparkles } from '../icons';

export function ExploreDemo() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExplore = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        console.error('Demo login response error:', { status: res.status, data });
        setError(data.error || `Erro ${res.status}: Não foi possível acessar o modo de exploração`);
        return;
      }
      
      if (!data.token || !data.user) {
        console.error('Invalid response structure:', data);
        setError('Resposta inválida do servidor. Por favor, recarregue a página.');
        return;
      }
      
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/');
      window.location.reload();
    } catch (err: any) {
      console.error('Demo explore error:', err);
      setError(`Erro de conexão: ${err.message || 'Tente novamente'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 overflow-hidden relative">
      {/* Background elements (subtle) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-10 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full relative z-10"
      >
        {/* Logo / Top accent */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mb-12 flex justify-center"
        >
          <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Sparkles size={24} className="text-primary" />
          </div>
        </motion.div>

        {/* Main Heading */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-6 text-center space-y-3"
        >
          <h1 className="text-4xl font-semibold text-slate-900 tracking-[-0.8px]">
            Explore com dados reais
          </h1>
          <p className="text-lg text-slate-500 leading-relaxed">
            Sem compromisso. Sem necessidade de cadastro. Simplesmente clique e conheça.
          </p>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          className="space-y-3 mb-10"
        >
          {[
            { title: 'Prontuário digital', desc: 'Veja como fica um cadastro clínico completo' },
            { title: 'Agenda inteligente', desc: 'Gerenciamento de consultas e lembretes automáticos' },
            { title: 'Financeiro organizado', desc: 'Controle de receitas, planos e cobranças' },
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + idx * 0.08, duration: 0.4 }}
              className="flex items-start gap-3 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ChevronRight size={14} className="text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          whileHover={!isLoading ? { scale: 1.02 } : {}}
          whileTap={!isLoading ? { scale: 0.98 } : {}}
          onClick={handleExplore}
          disabled={isLoading}
          className="w-full h-14 bg-primary hover:bg-primary/90 text-white text-base font-semibold rounded-[18px] shadow-[0_12px_32px_rgba(38,78,54,0.15)] hover:shadow-[0_16px_40px_rgba(38,78,54,0.2)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
          ) : (
            <>
              Explorar agora
              <ArrowRight size={16} />
            </>
          )}
        </motion.button>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center text-sm text-red-500 mt-4"
          >
            {error}
          </motion.p>
        )}

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="text-center text-[12px] text-slate-400 mt-8 leading-relaxed"
        >
          Ambiente de demonstração seguro · Dados totalmente fictícios · Sem impacto em terceiros
        </motion.p>

        {/* Back to login */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="text-center mt-8 pt-6 border-t border-slate-100"
        >
          <button
            onClick={() => navigate('/')}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
          >
            ← Voltar para o login
          </button>
        </motion.div>
      </motion.div>
    </div>
  );
}
