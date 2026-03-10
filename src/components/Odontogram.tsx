import React from 'react';

interface ToothData {
  status: 'healthy' | 'decay' | 'filling' | 'missing' | 'extraction';
  notes: string;
}

interface OdontogramProps {
  data: Record<number, ToothData>;
  onChange: (toothNumber: number, toothData: ToothData) => void;
  readOnly?: boolean;
}

const toothNumbers = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  lowerRight: [41, 42, 43, 44, 45, 46, 47, 48],
};

const statusColors = {
  healthy: 'bg-white border-slate-200',
  decay: 'bg-rose-500 border-rose-600 text-white',
  filling: 'bg-blue-500 border-blue-600 text-white',
  missing: 'bg-slate-200 border-slate-300 text-slate-400',
  extraction: 'bg-amber-400 border-amber-500 text-amber-900',
};

const statusLabels = {
  healthy: 'Saudável',
  decay: 'Cárie',
  filling: 'Restauração',
  missing: 'Ausente',
  extraction: 'Extração Necessária',
};

export const Odontogram: React.FC<OdontogramProps> = ({ data, onChange, readOnly = false }) => {
  const [selectedTooth, setSelectedTooth] = React.useState<number | null>(null);

  const handleToothClick = (num: number) => {
    if (readOnly) return;
    setSelectedTooth(num === selectedTooth ? null : num);
  };

  const updateStatus = (status: ToothData['status']) => {
    if (selectedTooth === null) return;
    onChange(selectedTooth, { ...data[selectedTooth], status });
    setSelectedTooth(null);
  };

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

      {/* Controls */}
      {!readOnly && selectedTooth && (
        <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="font-bold text-slate-800">Dente {selectedTooth}:</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusLabels) as Array<ToothData['status']>).map((status) => (
                <button
                  key={status}
                  onClick={() => updateStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${statusColors[status]} hover:opacity-80`}
                >
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200">
        {Object.entries(statusLabels).map(([status, label]) => (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full border ${statusColors[status as ToothData['status']]}`} />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
