import React from 'react';
import { Plus, History, Save, X, Info } from 'lucide-react';
import { formatDate } from '../utils/dateUtils';

export type ToothStatus = 
  | 'healthy' 
  | 'decay' 
  | 'filling' 
  | 'crown' 
  | 'root_canal_done' 
  | 'root_canal_needed' 
  | 'implant' 
  | 'extraction_done' 
  | 'extraction_needed' 
  | 'fracture' 
  | 'wear' 
  | 'facet' 
  | 'prosthesis' 
  | 'missing';

interface ToothRecord {
  id?: number;
  tooth_number: number;
  procedure: string;
  notes: string;
  date: string;
  dentist_name?: string;
}

interface ToothData {
  status: ToothStatus;
  notes: string;
}

interface OdontogramProps {
  data: Record<number, ToothData>;
  history?: ToothRecord[];
  onChange: (toothNumber: number, toothData: ToothData) => void;
  onAddHistory?: (record: Omit<ToothRecord, 'id'>) => Promise<void>;
  readOnly?: boolean;
}

const toothNumbers = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
};

const statusColors: Record<ToothStatus, string> = {
  healthy: 'bg-white border-slate-200 text-slate-600',
  decay: 'bg-rose-500 border-rose-600 text-white',
  filling: 'bg-blue-500 border-blue-600 text-white',
  crown: 'bg-amber-600 border-amber-700 text-white',
  root_canal_done: 'bg-emerald-600 border-emerald-700 text-white',
  root_canal_needed: 'bg-orange-500 border-orange-600 text-white',
  implant: 'bg-indigo-600 border-indigo-700 text-white',
  extraction_done: 'bg-slate-800 border-slate-900 text-white',
  extraction_needed: 'bg-yellow-400 border-yellow-500 text-yellow-900',
  fracture: 'bg-red-700 border-red-800 text-white',
  wear: 'bg-stone-400 border-stone-500 text-white',
  facet: 'bg-cyan-400 border-cyan-500 text-white',
  prosthesis: 'bg-purple-500 border-purple-600 text-white',
  missing: 'bg-slate-200 border-slate-300 text-slate-400',
};

const statusLabels: Record<ToothStatus, string> = {
  healthy: 'Saudável',
  decay: 'Cárie',
  filling: 'Restauração',
  crown: 'Coroa',
  root_canal_done: 'Canal Realizado',
  root_canal_needed: 'Canal Necessário',
  implant: 'Implante',
  extraction_done: 'Extração Realizada',
  extraction_needed: 'Extração Necessária',
  fracture: 'Fratura',
  wear: 'Desgaste',
  facet: 'Faceta',
  prosthesis: 'Prótese',
  missing: 'Ausente',
};

export const Odontogram: React.FC<OdontogramProps> = ({ 
  data, 
  history = [], 
  onChange, 
  onAddHistory,
  readOnly = false 
}) => {
  const [selectedTooth, setSelectedTooth] = React.useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [newRecord, setNewRecord] = React.useState({
    procedure: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    status: 'healthy' as ToothStatus
  });
  const [isSaving, setIsSaving] = React.useState(false);

  const handleToothClick = (num: number) => {
    setSelectedTooth(num);
    const tooth = data[num] || { status: 'healthy', notes: '' };
    setNewRecord(prev => ({ ...prev, status: tooth.status, procedure: '' }));
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (selectedTooth === null || !onAddHistory) return;
    
    setIsSaving(true);
    try {
      // 1. Add to history
      await onAddHistory({
        tooth_number: selectedTooth,
        procedure: newRecord.procedure || statusLabels[newRecord.status],
        notes: newRecord.notes,
        date: newRecord.date
      });

      // 2. Update current status in odontogram
      onChange(selectedTooth, { 
        status: newRecord.status, 
        notes: newRecord.notes 
      });

      setIsModalOpen(false);
      setNewRecord({
        procedure: '',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        status: 'healthy'
      });
    } catch (error) {
      console.error('Error saving tooth record:', error);
      alert('Erro ao salvar registro do dente.');
    } finally {
      setIsSaving(false);
    }
  };

  const toothHistory = selectedTooth !== null 
    ? history.filter(h => h.tooth_number === selectedTooth)
    : [];

  const renderTooth = (num: number) => {
    const tooth = data[num] || { status: 'healthy', notes: '' };
    const isSelected = selectedTooth === num;

    return (
      <div key={num} className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={() => handleToothClick(num)}
          className={`
            w-10 h-12 rounded-lg border-2 flex items-center justify-center text-[10px] font-bold transition-all
            ${statusColors[tooth.status]}
            ${isSelected ? 'ring-4 ring-emerald-500/30 scale-110 z-10' : 'hover:scale-105'}
          `}
        >
          {num}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex flex-col gap-8 overflow-x-auto pb-4">
        {/* Upper Jaw */}
        <div className="flex justify-center gap-1 min-w-max">
          <div className="flex gap-1 border-r-2 border-slate-200 pr-2">
            {toothNumbers.upperRight.map(renderTooth)}
          </div>
          <div className="flex gap-1 pl-2">
            {toothNumbers.upperLeft.map(renderTooth)}
          </div>
        </div>

        {/* Lower Jaw */}
        <div className="flex justify-center gap-1 min-w-max">
          <div className="flex gap-1 border-r-2 border-slate-200 pr-2">
            {[...toothNumbers.lowerRight].reverse().map(renderTooth)}
          </div>
          <div className="flex gap-1 pl-2">
            {[...toothNumbers.lowerLeft].reverse().map(renderTooth)}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 pt-4 border-t border-slate-200">
        {(Object.entries(statusLabels) as [ToothStatus, string][]).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border ${statusColors[status]}`} />
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider leading-tight">{label}</span>
          </div>
        ))}
      </div>

      {/* Tooth Detail Modal */}
      {isModalOpen && selectedTooth !== null && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold border-2 ${statusColors[data[selectedTooth]?.status || 'healthy']}`}>
                  {selectedTooth}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Dente {selectedTooth}</h3>
                  <p className="text-sm text-slate-500">Histórico Clínico e Procedimentos</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {/* Current Status */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Info size={18} className="text-emerald-600" />
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Status Atual</h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(Object.entries(statusLabels) as [ToothStatus, string][]).map(([status, label]) => (
                    <button
                      key={status}
                      onClick={() => setNewRecord(prev => ({ ...prev, status }))}
                      className={`
                        px-3 py-2 rounded-xl text-[10px] font-bold transition-all border text-center
                        ${newRecord.status === status 
                          ? `${statusColors[status]} ring-2 ring-offset-1 ring-emerald-500` 
                          : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}
                      `}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {/* Clinical History */}
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <History size={18} className="text-emerald-600" />
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-sm">Histórico Clínico</h4>
                </div>
                {toothHistory.length > 0 ? (
                  <div className="space-y-3">
                    {toothHistory.map((record, idx) => (
                      <div key={record.id || idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex justify-between items-start gap-4">
                        <div>
                          <p className="font-bold text-slate-800">{record.procedure}</p>
                          {record.notes && <p className="text-sm text-slate-600 mt-1 italic">"{record.notes}"</p>}
                          <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold">Dentista: {record.dentist_name || 'Não informado'}</p>
                        </div>
                        <span className="text-xs font-mono text-slate-400 bg-white px-2 py-1 rounded border border-slate-100">
                          {formatDate(record.date)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm">Nenhum registro anterior para este dente.</p>
                  </div>
                )}
              </section>

              {/* Add New Procedure */}
              {!readOnly && (
                <section className="bg-emerald-50/30 p-6 rounded-2xl border border-emerald-100/50">
                  <div className="flex items-center gap-2 mb-4">
                    <Plus size={18} className="text-emerald-600" />
                    <h4 className="font-bold text-emerald-800 uppercase tracking-wider text-sm">Adicionar Novo Procedimento</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Procedimento</label>
                      <input 
                        type="text"
                        value={newRecord.procedure}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, procedure: e.target.value }))}
                        placeholder="Ex: Restauração em resina"
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Data</label>
                      <input 
                        type="date"
                        value={newRecord.date}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, date: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Observações</label>
                      <textarea 
                        value={newRecord.notes}
                        onChange={(e) => setNewRecord(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Detalhes adicionais sobre o procedimento..."
                        rows={2}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm resize-none"
                      />
                    </div>
                  </div>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Fechar
              </button>
              {!readOnly && (
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? 'Salvando...' : (
                    <>
                      <Save size={18} />
                      Salvar Registro
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
