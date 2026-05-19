import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search } from 'lucide-react';

interface AcademyStudyProps {
  onSelectMaterial?: (material: any) => void;
}

export const AcademyStudy: React.FC<AcademyStudyProps> = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const materials: any[] = [];
  const filteredMaterials = materials.filter(material =>
    String(material.title || '').toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="ios-title text-2xl mb-1">Materiais de Estudo</h1>
            <p className="ios-text-secondary">Aprenda procedimentos com video-aulas rapidas</p>
          </div>

          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-academy-muted/70" />
            <input
              type="text"
              placeholder="Buscar video-aula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ios-input pl-10 w-full"
            />
          </div>
        </motion.div>

        <div className="px-4 space-y-3 py-4">
          {filteredMaterials.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <BookOpen size={40} className="mx-auto mb-3 text-academy-muted/50" />
              <p className="text-academy-muted font-medium">Nenhum material encontrado</p>
              <p className="text-sm text-academy-muted/70 mt-1">A tela ainda nao possui uma API real de materiais Academy.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
