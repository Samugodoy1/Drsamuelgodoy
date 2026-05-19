import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Users } from 'lucide-react';

interface AcademyPatientsProps {
  onSelectPatient?: (patient: any) => void;
}

export const AcademyPatients: React.FC<AcademyPatientsProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const patients: any[] = [];
  const filteredPatients = patients.filter(patient =>
    String(patient.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-academy-bg overflow-y-auto pb-20">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky top-0 z-20 bg-academy-bg/80 backdrop-blur-md px-4 py-4"
        >
          <div className="mb-4">
            <h1 className="ios-title text-2xl mb-1">Casos</h1>
            <p className="ios-text-secondary">Tudo em ordem por enquanto. Seus casos aparecem aqui quando precisarem de atenção.</p>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-academy-muted/70" />
            <input
              type="text"
              placeholder="Buscar paciente, conduta ou pendência"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ios-input pl-10 w-full"
            />
          </div>

          {patients.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {['Todos'].map(filter => (
                <button
                  key={filter}
                  type="button"
                  className="shrink-0 rounded-full bg-white border border-academy-border px-4 py-2 text-[13px] font-semibold text-academy-muted"
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <div className="px-4 space-y-3">
          {filteredPatients.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Users size={40} className="mx-auto mb-3 text-academy-muted/50" />
              <p className="text-academy-muted font-medium">Nenhum paciente encontrado</p>
              <p className="text-sm text-academy-muted/70 mt-1">A tela ainda nao possui uma API real de pacientes Academy.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
