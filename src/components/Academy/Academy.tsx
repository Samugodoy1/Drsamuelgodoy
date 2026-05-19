import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Home,
  Stethoscope,
  Users,
  Zap
} from 'lucide-react';

interface AcademyProps {
  user?: any;
  onNavigate?: (section: string) => void;
}

const EmptyState: React.FC<{ icon: React.ElementType; title: string; description?: string }> = ({
  icon: Icon,
  title,
  description
}) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="px-4 mb-6"
  >
    <div className="ios-card bg-academy-study text-center py-8">
      <Icon size={40} className="mx-auto mb-3 text-academy-muted/50" />
      <p className="text-academy-muted font-medium">{title}</p>
      {description && <p className="text-sm text-academy-muted/70 mt-1">{description}</p>}
    </div>
  </motion.div>
);

const SectionCard: React.FC<{
  icon: React.ElementType;
  title: string;
  description: string;
  onClick?: () => void;
}> = ({ icon: Icon, title, description, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="ios-card w-full text-left transition-all duration-200 hover:shadow-[0_8px_32px_rgba(139,92,246,0.12)]"
  >
    <div className="flex items-start justify-between mb-3">
      <div className="bg-primary/10 rounded-full p-3">
        <Icon size={24} className="text-primary" />
      </div>
    </div>
    <h3 className="font-bold text-academy-text mb-1">{title}</h3>
    <p className="text-[13px] text-academy-muted mb-3">{description}</p>
    <div className="flex items-center gap-1 text-primary font-medium text-sm">
      Ver <ChevronRight size={16} />
    </div>
  </motion.button>
);

export const Academy: React.FC<AcademyProps> = ({ onNavigate }) => {
  return (
    <div className="flex-1 bg-academy-bg overflow-y-auto pb-20">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between px-4 py-4 sticky top-0 z-10 bg-academy-bg/80 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <Stethoscope size={20} className="text-white" />
            </div>
            <span className="font-bold text-academy-text">Academy</span>
          </div>
          <button className="p-2 hover:bg-white/60 rounded-full transition-all">
            <Home size={20} className="text-academy-text" />
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="px-4 py-8"
        >
          <div className="text-center space-y-2 mb-8">
            <h1 className="ios-title text-[32px]">
              Seu proximo passo <span className="text-primary">na clinica</span>
            </h1>
            <p className="ios-text-secondary text-base">
              Estude, prepare e execute com clareza
            </p>
          </div>
        </motion.div>

        <EmptyState
          icon={Calendar}
          title="Nenhum atendimento proximo"
          description="Quando houver uma API real para Academy, seus atendimentos aparecerao aqui."
        />

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="px-4 mb-6"
        >
          <div className="ios-card bg-academy-study border border-academy-border/70">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-primary/10 rounded-full p-2">
                <Zap size={20} className="text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-academy-text">Preparacao rapida</h3>
                <p className="text-[13px] text-academy-muted">Nenhum roteiro disponivel</p>
              </div>
            </div>
            <button className="w-full mt-4 py-2 bg-primary text-white rounded-[16px] font-semibold text-sm hover:opacity-95 transition-all">
              Iniciar Preparacao <ArrowRight size={16} className="inline ml-1" />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="px-4 mb-8 grid grid-cols-2 gap-3"
        >
          <SectionCard icon={Users} title="Meus Pacientes" description="Preparar casos" onClick={() => onNavigate?.('pacientes')} />
          <SectionCard icon={Calendar} title="Proximas Datas" description="Visualizar agenda" onClick={() => onNavigate?.('agenda')} />
          <SectionCard icon={BookOpen} title="Materiais" description="Estudar procedimentos" onClick={() => onNavigate?.('estudos')} />
          <SectionCard icon={CheckCircle2} title="Checklist" description="Seu desenvolvimento" onClick={() => onNavigate?.('checklist')} />
        </motion.div>

        <EmptyState icon={BookOpen} title="Nenhum material cadastrado" />
        <EmptyState icon={CheckCircle2} title="Nenhum checklist cadastrado" />
        <div className="h-4" />
      </div>
    </div>
  );
};
