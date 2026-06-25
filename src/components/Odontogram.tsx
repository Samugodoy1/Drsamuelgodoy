import React from 'react';
import { X } from '../icons';
import {
  type DentitionMode,
  getAllTeethInMode,
  getDentitionLayout,
  isToothActionAllowed,
  MIXED_DECIDUOUS_GRID_SLOTS,
  type QuadrantTeethLayout,
} from '../constants/dentition';
import { deriveToothFlagsPure } from '../utils/toothStatusDerivation';
import { normalizeTreatmentItem, type QuadrantId } from '../utils/treatmentPlanScope';
import { getProsthesisColor } from '../constants/prosthetics';

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
  onChange?: (toothNumber: number, toothData: ToothData) => void;
  onAddHistory?: (record: Omit<ToothRecord, 'id'>) => Promise<void>;
  onResetTooth?: (toothNumber: number) => Promise<void>;
  onSelectProcedure?: (payload: {
    toothNumber: number;
    procedure: string;
    category: 'diagnosis' | 'procedure';
    mode: 'initial' | 'continuity';
    status: ToothStatus;
  }) => void;
  treatments?: Array<{
    id: string;
    tooth_number?: number;
    quadrant?: number;
    procedure?: string;
    procedure_key?: string;
    scope?: string;
    status?: string;
  }>;
  activeToothNumbers?: number[];
  activeQuadrants?: QuadrantId[];
  /** Próteses regionais cobrindo cada dente (faixa colorida tipo "ponte"). */
  prosthesisByTooth?: Record<number, { procedureKey?: string; label: string }>;
  priorityToothNumber?: number | null;
  highlightedToothNumber?: number | null;
  highlightedQuadrant?: QuadrantId | null;
  readOnly?: boolean;
  dentitionMode?: DentitionMode;
}

// Conditions that represent PENDING treatment needs (feeds into intelligence)
const PENDING_STATUSES: Set<ToothStatus> = new Set([
  'decay', 'root_canal_needed', 'extraction_needed', 'fracture',
]);

// Conditions that are urgent
const URGENT_STATUSES: Set<ToothStatus> = new Set([
  'root_canal_needed', 'extraction_needed', 'fracture',
]);

// Conditions that represent completed procedures
const COMPLETED_STATUSES: Set<ToothStatus> = new Set([
  'filling', 'crown', 'root_canal_done', 'extraction_done', 'implant', 'prosthesis', 'facet',
]);

const statusColors: Record<ToothStatus, string> = {
  healthy: 'bg-white border-slate-300 text-slate-700',
  decay: 'bg-amber-50 border-amber-300 text-amber-900',
  filling: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  crown: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  root_canal_done: 'bg-sky-50 border-sky-200 text-sky-800',
  root_canal_needed: 'bg-rose-50 border-rose-300 text-rose-800',
  implant: 'bg-sky-50 border-sky-200 text-sky-800',
  extraction_done: 'bg-slate-100 border-slate-300 text-slate-600',
  extraction_needed: 'bg-rose-50 border-rose-300 text-rose-800',
  fracture: 'bg-rose-100 border-rose-300 text-rose-900',
  wear: 'bg-amber-50 border-amber-200 text-amber-800',
  facet: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  prosthesis: 'bg-sky-50 border-sky-200 text-sky-800',
  missing: 'bg-slate-100 border-slate-300 text-slate-500',
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

interface LegendItem {
  key: string;
  label: string;
  swatchClass: string;
  markerClass?: string;
  markerPosition?: 'top' | 'bottom';
}

const legendItems: LegendItem[] = [
  {
    key: 'normal',
    label: 'Normal',
    swatchClass: 'bg-white border border-slate-300',
  },
  {
    key: 'pending',
    label: 'Pendente',
    swatchClass: 'bg-amber-50 border border-amber-300',
  },
  {
    key: 'attention',
    label: 'Urgente',
    swatchClass: 'bg-rose-50 border border-rose-300',
  },
  {
    key: 'in-progress',
    label: 'Em andamento',
    swatchClass: 'bg-white border border-slate-300',
    markerClass: 'bg-emerald-500',
    markerPosition: 'top',
  },
  {
    key: 'done',
    label: 'Concluído',
    swatchClass: 'bg-white border border-slate-300',
    markerClass: 'bg-sky-500',
    markerPosition: 'bottom',
  },
  {
    key: 'focus',
    label: 'Próximo',
    swatchClass: 'bg-white border-2 border-slate-900',
  },
  {
    key: 'prosthesis',
    label: 'Prótese',
    swatchClass: 'bg-white border border-slate-300',
    markerClass: 'bg-violet-500',
    markerPosition: 'bottom',
  },
];

const diagnosisActions = [
  { key: 'decay', label: 'Carie', status: 'decay' as ToothStatus, category: 'diagnosis' as const },
  { key: 'fracture', label: 'Fratura', status: 'fracture' as ToothStatus, category: 'diagnosis' as const },
];

const procedureActions = [
  { key: 'filling', label: 'Restauracao', status: 'filling' as ToothStatus, category: 'procedure' as const },
  { key: 'root-canal', label: 'Canal', status: 'root_canal_needed' as ToothStatus, category: 'procedure' as const },
  { key: 'extraction', label: 'Extracao', status: 'extraction_needed' as ToothStatus, category: 'procedure' as const },
  { key: 'crown', label: 'Coroa', status: 'crown' as ToothStatus, category: 'procedure' as const },
  { key: 'implant', label: 'Implante', status: 'implant' as ToothStatus, category: 'procedure' as const },
];

const continuationActions = [
  { key: 'adjust-restoration', label: 'Restauracao', status: 'filling' as ToothStatus, category: 'procedure' as const },
  { key: 'continue-canal', label: 'Canal', status: 'root_canal_done' as ToothStatus, category: 'procedure' as const },
  { key: 'extraction', label: 'Extracao', status: 'extraction_done' as ToothStatus, category: 'procedure' as const },
  { key: 'crown', label: 'Coroa', status: 'crown' as ToothStatus, category: 'procedure' as const },
  { key: 'implant', label: 'Implante', status: 'implant' as ToothStatus, category: 'procedure' as const },
];

const COMPACT_LEGEND_KEYS = new Set(['attention', 'in-progress', 'done']);

const resolveHistoryTag = (procedure?: string, notes?: string) => {
  const text = `${procedure || ''} ${notes || ''}`.toLowerCase();
  if (text.includes('conclus') || text.includes('conclu')) return 'Conclusão';
  if (text.includes('início') || text.includes('inicio')) return 'Início';
  if (text.includes('convers') || text.includes('ajust')) return 'Ajuste';
  if (text.includes('diag')) return 'Diagnóstico';
  return 'Registro';
};

const historyTagTone: Record<string, string> = {
  'Diagnóstico': 'border-rose-200 bg-rose-50/70 text-rose-700',
  'Início': 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
  'Ajuste': 'border-amber-200 bg-amber-50/70 text-amber-700',
  'Conclusão': 'border-sky-200 bg-sky-50/70 text-sky-700',
  'Registro': 'border-slate-200 bg-slate-50 text-slate-500',
};

const formatHistoryDate = (value?: string) => {
  if (!value) return '';

  // Preserve calendar date from ISO/SQL strings and show only dd/mm/yyyy.
  const datePart = value.includes('T') ? value.split('T')[0] : value;
  const date = new Date(`${datePart}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('pt-BR');
};

interface ToothProps {
  number: number;
  status: ToothStatus;
  selected: boolean;
  isInTreatment: boolean;
  hasDiagnosis: boolean;
  isCompleted: boolean;
  isPending: boolean;
  isUrgent: boolean;
  isPriority: boolean;
  disabled: boolean;
  compact?: boolean;
  prosthesisBand?: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onHover: (event: React.MouseEvent<HTMLButtonElement>, num: number) => void;
  onLeave: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
}

const Tooth: React.FC<ToothProps> = ({
  number,
  status,
  selected,
  isInTreatment,
  hasDiagnosis,
  isCompleted,
  isPending,
  isUrgent,
  isPriority,
  disabled,
  compact = false,
  prosthesisBand,
  onClick,
  onHover,
  onLeave,
  buttonRef,
}) => {
  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={(event) => onHover(event, number)}
        onMouseLeave={onLeave}
        className={`
          ${compact ? 'w-9 h-[3.15rem] sm:w-10 sm:h-[3.5rem] rounded-[14px] text-[9px] sm:text-[10px]' : 'w-10 h-[3.6rem] sm:w-12 sm:h-[4.1rem] rounded-[16px] sm:rounded-[18px] text-[10px] sm:text-[12px]'}
          border
          flex items-center justify-center font-semibold tracking-tight
          transition-all duration-200
          ${statusColors[status]}
          ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
          ${isUrgent ? 'ring-2 ring-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.2)]' : ''}
          ${isPending && !isUrgent ? 'ring-2 ring-amber-300' : ''}
          ${isInTreatment && !isPending && !isUrgent ? 'ring-2 ring-emerald-300' : ''}
          ${isCompleted && !isPending && !isUrgent ? 'ring-2 ring-sky-300' : ''}
          ${isPriority ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white' : ''}
          ${selected
            ? 'scale-[1.04] ring-2 ring-slate-900 shadow-[0_10px_18px_rgba(15,23,42,0.08)]'
            : 'hover:scale-[1.02] hover:shadow-[0_8px_16px_rgba(15,23,42,0.08)] active:scale-[0.98]'}
        `}
      >
        {isUrgent && (
          <span className="absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full border-2 border-white bg-rose-500 animate-pulse" />
        )}
        {isPending && !isUrgent && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-amber-400" />
        )}
        {isInTreatment && !isPending && !isUrgent && (
          <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-emerald-500" />
        )}
        {isCompleted && !isPending && !isUrgent && !isInTreatment && (
          <span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border border-white bg-sky-500" />
        )}
        {number}
      </button>
      {prosthesisBand && (
        <span
          className={`pointer-events-none absolute -bottom-[3px] left-0 right-0 h-[3px] rounded-full ${prosthesisBand}`}
          aria-hidden
        />
      )}
    </div>
  );
};

interface ActionMenuProps {
  open: boolean;
  selectedTooth: number | null;
  selectedStatus: ToothStatus;
  hasTreatment: boolean;
  currentProcedure?: string;
  toothHistory: ToothRecord[];
  mobile: boolean;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onAction: (action: { label: string; status: ToothStatus; category: 'diagnosis' | 'procedure'; mode: 'initial' | 'continuity' }) => void;
  onReset?: () => void;
  isActionAllowed?: (actionKey: string) => boolean;
}

const ActionMenu: React.FC<ActionMenuProps> = ({
  open,
  selectedTooth,
  selectedStatus,
  hasTreatment,
  currentProcedure,
  toothHistory,
  mobile,
  anchorRect,
  onClose,
  onAction,
  onReset,
  isActionAllowed,
}) => {
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (!menuRef.current) return;
      const target = event.target as Node;
      if (!menuRef.current.contains(target)) onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open, onClose]);

  if (!open || selectedTooth === null) return null;

  const rawActions = hasTreatment ? continuationActions : [...diagnosisActions, ...procedureActions];
  const actions = isActionAllowed
    ? rawActions.filter((action) => isActionAllowed(action.key))
    : rawActions;
  const recentHistory = toothHistory.slice(0, 4);

  if (mobile) {
    return (
      <div className="fixed inset-0 z-[9999]">
        <div className="absolute inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity duration-200" />
        <div
          ref={menuRef}
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white p-5 shadow-2xl border-t border-slate-200 transition-transform duration-300 translate-y-0"
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-base font-semibold text-slate-900">Dente {selectedTooth}</p>
              {hasTreatment && <p className="text-xs text-slate-500">{currentProcedure || 'Em andamento'}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 pb-2">
            {actions.map((action) => (
              <button
                key={action.key}
                type="button"
                onClick={() => onAction({ label: action.label, status: action.status, category: action.category, mode: hasTreatment ? 'continuity' : 'initial' })}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-all duration-200
                  ${selectedStatus === action.status
                    ? 'border-slate-900 bg-slate-100 text-slate-950'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'}
                `}
              >
                {action.label}
              </button>
            ))}
          </div>

          {onReset && selectedStatus !== 'healthy' && (
            <button
              type="button"
              onClick={onReset}
              className="mt-2 w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-100 hover:border-rose-300"
            >
              Remover registro
            </button>
          )}

          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Histórico do dente</p>
            {recentHistory.length > 0 ? (
              <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {recentHistory.map((entry, idx) => (
                  <div key={entry.id || `${entry.date}-${entry.procedure}-${idx}`} className="rounded-lg bg-white px-2.5 py-2 border border-slate-200">
                    {(() => {
                      const tag = resolveHistoryTag(entry.procedure, entry.notes);
                      const tone = historyTagTone[tag] || historyTagTone.Registro;
                      return (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-slate-800 truncate">{entry.procedure}</p>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                              {tag}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5">{formatHistoryDate(entry.date)}</p>
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500">Sem histórico para este dente.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const top = anchorRect ? anchorRect.bottom + 10 : 0;
  const left = anchorRect ? Math.max(12, anchorRect.left - 20) : 12;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div
        ref={menuRef}
        style={{ top, left }}
        className="pointer-events-auto absolute w-[240px] rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_18px_36px_rgba(15,23,42,0.14)] transition-all duration-200"
      >
        <p className="px-1 text-sm font-semibold text-slate-900">Dente {selectedTooth}</p>
        {hasTreatment && (
          <p className="mb-2 px-1 text-[11px] text-slate-500">{currentProcedure || 'Em andamento'}</p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              onClick={() => onAction({ label: action.label, status: action.status, category: action.category, mode: hasTreatment ? 'continuity' : 'initial' })}
              className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-all duration-200
                ${selectedStatus === action.status
                  ? 'border-slate-900 bg-slate-100 text-slate-950'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:border-slate-300'}
              `}
            >
              {action.label}
            </button>
          ))}
        </div>

        {onReset && selectedStatus !== 'healthy' && (
          <button
            type="button"
            onClick={onReset}
            className="mt-1.5 w-full rounded-lg border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs font-semibold text-rose-600 transition-all duration-200 hover:bg-rose-100 hover:border-rose-300"
          >
            Remover registro
          </button>
        )}

        <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2">
          <p className="px-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">Histórico</p>
          {recentHistory.length > 0 ? (
            <div className="mt-1 space-y-1 max-h-24 overflow-y-auto pr-1">
              {recentHistory.map((entry, idx) => (
                <div key={entry.id || `${entry.date}-${entry.procedure}-${idx}`} className="rounded-md bg-white px-2 py-1.5 border border-slate-200">
                  {(() => {
                    const tag = resolveHistoryTag(entry.procedure, entry.notes);
                    const tone = historyTagTone[tag] || historyTagTone.Registro;
                    return (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] font-medium text-slate-800 truncate">{entry.procedure}</p>
                          <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] ${tone}`}>
                            {tag}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{formatHistoryDate(entry.date)}</p>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-1 px-0.5 text-[11px] text-slate-500">Sem histórico.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const Odontogram: React.FC<OdontogramProps> = ({ 
  data = {}, 
  history = [], 
  onChange, 
  onAddHistory,
  onResetTooth,
  onSelectProcedure,
  treatments = [],
  activeToothNumbers = [],
  activeQuadrants = [],
  prosthesisByTooth = {},
  priorityToothNumber = null,
  highlightedToothNumber = null,
  highlightedQuadrant = null,
  readOnly = false,
  dentitionMode = 'permanent' as DentitionMode,
}) => {
  const dentitionLayout = React.useMemo(
    () => getDentitionLayout(dentitionMode),
    [dentitionMode]
  );
  const visibleTeeth = React.useMemo(
    () => getAllTeethInMode(dentitionMode),
    [dentitionMode]
  );
  const [selectedTooth, setSelectedTooth] = React.useState<number | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const [anchorRect, setAnchorRect] = React.useState<DOMRect | null>(null);
  const [hoveredTooth, setHoveredTooth] = React.useState<number | null>(null);
  const [hoverRect, setHoverRect] = React.useState<DOMRect | null>(null);
  const [optimisticHistory, setOptimisticHistory] = React.useState<ToothRecord[]>([]);
  const [legendExpanded, setLegendExpanded] = React.useState(false);
  const toothRefs = React.useRef<Record<number, HTMLButtonElement | null>>({});
  const activeToothSet = React.useMemo(() => new Set(activeToothNumbers), [activeToothNumbers]);
  const activeQuadrantSet = React.useMemo(() => new Set(activeQuadrants), [activeQuadrants]);
  const visibleLegendItems = React.useMemo(
    () =>
      legendExpanded
        ? legendItems
        : legendItems.filter((item) => COMPACT_LEGEND_KEYS.has(item.key)),
    [legendExpanded]
  );

  const getToothStatus = React.useCallback((num: number): ToothStatus => {
    return data[num]?.status || 'healthy';
  }, [data]);

  const treatmentsByTooth = React.useMemo(() => {
    const map = new Map<number, Array<{ id?: string; procedure?: string; status?: string }>>();
    treatments.forEach((item) => {
      const normalized = normalizeTreatmentItem(item);
      if (normalized.scope !== 'tooth') return;
      const toothNumber = Number(normalized.tooth_number);
      if (Number.isFinite(toothNumber) && toothNumber > 0) {
        const list = map.get(toothNumber) || [];
        list.push({ id: item.id, procedure: item.procedure, status: item.status });
        map.set(toothNumber, list);
      }
    });
    return map;
  }, [treatments]);

  const deriveToothFlags = React.useCallback(
    (num: number) => {
      const toothStatus = getToothStatus(num);
      const toothTreatments = treatmentsByTooth.get(num) || [];
      const planStatuses = toothTreatments.map((t) => String(t.status || ''));
      return deriveToothFlagsPure(toothStatus, planStatuses);
    },
    [getToothStatus, treatmentsByTooth]
  );

  React.useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const historyByTooth = React.useMemo(() => {
    const map = new Map<number, ToothRecord[]>();
    const treatmentHistory: ToothRecord[] = (treatments || [])
      .map((item) => {
        const normalized = normalizeTreatmentItem(item);
        if (normalized.scope !== 'tooth') return null;
        const tooth = Number(normalized.tooth_number);
        if (!Number.isFinite(tooth) || tooth <= 0 || !item.procedure) return null;

        return {
          id: Number(item.id) || undefined,
          tooth_number: tooth,
          procedure: item.procedure,
          notes: '',
          date: new Date().toISOString().split('T')[0],
        } as ToothRecord;
      })
      .filter((entry): entry is ToothRecord => entry !== null);

    const persistedHistory = history || [];

    // Prefer persisted records, then optimistic, then treatment fallback.
    const mergedHistory = [
      ...persistedHistory,
      ...optimisticHistory,
      ...treatmentHistory,
    ];

    const seen = new Set<string>();
    const dedupedHistory = mergedHistory.filter((entry) => {
      const key = [
        Number(entry.tooth_number) || 0,
        String(entry.procedure || '').trim().toLowerCase(),
        String(entry.date || '').slice(0, 10),
        String(entry.notes || '').trim().toLowerCase(),
      ].join('|');

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    dedupedHistory.forEach((entry) => {
      const tooth = Number(entry.tooth_number);
      if (!Number.isFinite(tooth) || tooth <= 0) return;
      const list = map.get(tooth) || [];
      list.push(entry);
      map.set(tooth, list);
    });

    map.forEach((list, tooth) => {
      const sorted = [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      map.set(tooth, sorted);
    });

    return map;
  }, [history, optimisticHistory, treatments]);

  const handleToothClick = (num: number, event: React.MouseEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setHoveredTooth(null);
    setHoverRect(null);
    setSelectedTooth(num);
    setAnchorRect(rect);
    setIsMenuOpen(true);
  };

  const handleAction = ({ label, status, category, mode }: { label: string; status: ToothStatus; category: 'diagnosis' | 'procedure'; mode: 'initial' | 'continuity' }) => {
    if (selectedTooth === null) return;

    // Close first for immediate UX feedback even if callbacks fail.
    setIsMenuOpen(false);

    try {
      if (onChange) {
        onChange(selectedTooth, {
          status,
          notes: data[selectedTooth]?.notes || '',
        });
      }
    } catch (error) {
      console.error('Error applying tooth status change:', error);
    }

    try {
      if (onSelectProcedure) {
        Promise.resolve(
          onSelectProcedure({
            toothNumber: selectedTooth,
            procedure: label,
            category,
            mode,
            status,
          })
        ).catch((error) => {
          console.error('Error applying selected procedure:', error);
        });
      }
    } catch (error) {
      console.error('Error dispatching selected procedure:', error);
    }

    const today = new Date().toISOString().split('T')[0];
    const isCompletionStatus = ['root_canal_done', 'extraction_done'].includes(String(status || '').toLowerCase());
    const historyNotes =
      category === 'diagnosis'
        ? 'Diagnóstico registrado no odontograma.'
        : mode === 'continuity' && isCompletionStatus
          ? 'Procedimento concluído.'
          : mode === 'continuity'
            ? 'Plano ajustado.'
            : 'Início de tratamento.';

    const optimisticRecord: ToothRecord = {
      id: Date.now(),
      tooth_number: selectedTooth,
      procedure: label,
      notes: historyNotes,
      date: today,
    };

    setOptimisticHistory((prev) => [optimisticRecord, ...prev]);

    if (onAddHistory) {
      onAddHistory({
        tooth_number: selectedTooth,
        procedure: label,
        notes: historyNotes,
        date: today,
      }).catch((error) => {
        console.error('Error adding tooth history:', error);
      });
    }
  };

  const handleResetTooth = () => {
    if (selectedTooth === null) return;
    setIsMenuOpen(false);

    if (onChange) {
      onChange(selectedTooth, { status: 'healthy', notes: '' });
    }

    setOptimisticHistory((prev) => prev.filter((r) => r.tooth_number !== selectedTooth));

    if (onResetTooth) {
      onResetTooth(selectedTooth).catch((error) => {
        console.error('Error resetting tooth:', error);
      });
    }
  };

  const renderTooth = (num: number, compact = false) => {
    const toothStatus = getToothStatus(num);
    const flags = deriveToothFlags(num);
    const prosthesis = prosthesisByTooth[num];
    return (
      <Tooth
        key={num}
        number={num}
        compact={compact}
        status={toothStatus}
        selected={(selectedTooth === num && isMenuOpen) || highlightedToothNumber === num}
        isInTreatment={flags.isInTreatment}
        hasDiagnosis={['decay', 'fracture'].includes(toothStatus)}
        isCompleted={flags.isCompleted}
        isPending={flags.isPending}
        isUrgent={flags.isUrgent}
        isPriority={priorityToothNumber === num}
        prosthesisBand={prosthesis ? getProsthesisColor(prosthesis.procedureKey).band : undefined}
        disabled={readOnly}
        onClick={(event) => handleToothClick(num, event)}
        onHover={(event, toothNumber) => {
          if (isMobile) return;
          setHoveredTooth(toothNumber);
          setHoverRect(event.currentTarget.getBoundingClientRect());
        }}
        onLeave={() => {
          if (isMenuOpen) return;
          setHoveredTooth(null);
          setHoverRect(null);
      }}
      buttonRef={(el) => {
        toothRefs.current[num] = el;
      }}
    />
    );
  };

  type ArchHalfKey = 'upperRight' | 'upperLeft' | 'lowerLeft' | 'lowerRight';

  const halfQuadrants: Record<ArchHalfKey, QuadrantId[]> = {
    upperRight: [1],
    upperLeft: [2],
    lowerLeft: [3],
    lowerRight: [4],
  };

  const getHalfHighlightClass = (halfKey: ArchHalfKey) => {
    const quadrants = halfQuadrants[halfKey];
    const isActive = quadrants.some((q) => activeQuadrantSet.has(q));
    const isHighlighted = quadrants.some((q) => highlightedQuadrant === q);
    if (!isActive && !isHighlighted) return '';
    return isHighlighted
      ? 'ring-1 ring-indigo-300/50 bg-indigo-50/15'
      : 'ring-1 ring-emerald-200/50 bg-emerald-50/10';
  };

  const renderArchHalf = (
    halfKey: ArchHalfKey,
    block: QuadrantTeethLayout,
    reversePermanent: boolean
  ) => {
    const highlight = getHalfHighlightClass(halfKey);
    const permanent = block.permanent
      ? reversePermanent
        ? [...block.permanent].reverse()
        : block.permanent
      : [];
    const deciduous = block.deciduous
      ? (reversePermanent && dentitionMode !== 'deciduous')
        ? [...block.deciduous].reverse()
        : block.deciduous
      : [];

    if (dentitionMode === 'mixed' && permanent.length > 0 && deciduous.length > 0) {
      const slots = MIXED_DECIDUOUS_GRID_SLOTS[halfKey];
      const slotTeeth = reversePermanent ? [...slots].reverse() : slots;
      return (
        <div className={`flex min-w-0 flex-1 flex-col gap-0.5 rounded-xl px-0.5 py-0.5 ${highlight}`}>
          <div className="grid grid-cols-8 gap-1">
            {permanent.map((num) => (
              <div key={num} className="flex justify-center">
                {renderTooth(num, false)}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8 gap-1">
            {slotTeeth.map((num, idx) => (
              <div key={`${halfKey}-slot-${idx}`} className="flex justify-center">
                {num ? (
                  renderTooth(num, true)
                ) : (
                  <div className="w-9 sm:w-10" aria-hidden />
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    const teeth = permanent.length > 0 ? permanent : deciduous;
    const compact = permanent.length === 0;
    return (
      <div className={`flex min-w-0 flex-1 justify-center gap-1.5 rounded-xl px-0.5 py-0.5 ${highlight}`}>
        {teeth.map((num) => renderTooth(num, compact))}
      </div>
    );
  };

  const renderArch = (arch: 'upper' | 'lower') => {
    const layout = dentitionLayout[arch];
    const reverseLower = arch === 'lower';
    const rightKey: ArchHalfKey = arch === 'upper' ? 'upperRight' : 'lowerRight';
    const leftKey: ArchHalfKey = arch === 'upper' ? 'upperLeft' : 'lowerLeft';

    return (
      <div className="rounded-[20px] border border-slate-200/70 bg-white px-2 py-2 sm:rounded-[22px] sm:px-3 sm:py-2.5">
        <div className="flex items-stretch justify-center gap-2 sm:gap-3">
          {renderArchHalf(rightKey, layout.right, reverseLower)}
          <div className="w-px shrink-0 self-stretch bg-slate-200/80" aria-hidden />
          {renderArchHalf(leftKey, layout.left, reverseLower)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 p-1 sm:p-2 bg-transparent rounded-none shadow-none border-none">
      <div className="overflow-x-auto pb-2">
        <div className="mx-auto min-w-max space-y-3">
          {renderArch('upper')}
          <div className="flex justify-center px-4" aria-hidden>
            <span className="h-px w-16 bg-slate-200/80" />
          </div>
          {renderArch('lower')}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 border-t border-slate-100">
        {visibleLegendItems.map((item) => (
          <div key={item.key} className="inline-flex items-center gap-1.5 py-0.5">
            <span className={`relative h-2.5 w-2.5 rounded-[3px] ${item.swatchClass}`}>
              {item.markerClass && (
                <span
                  className={`absolute ${item.markerPosition === 'top' ? '-top-0.5 -right-0.5' : '-bottom-0.5 -right-0.5'} h-1.5 w-1.5 rounded-full border border-white ${item.markerClass}`}
                />
              )}
            </span>
            <span className="text-[10px] font-medium text-slate-400">{item.label}</span>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLegendExpanded((prev) => !prev)}
          className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors"
        >
          {legendExpanded ? 'Menos' : 'Legenda'}
        </button>
      </div>

      {/* Clinical insight summary */}
      {(() => {
        const allTeeth = visibleTeeth;
        const urgentTeeth = allTeeth.filter(n => deriveToothFlags(n).isUrgent);
        const pendingTeeth = allTeeth.filter(n => deriveToothFlags(n).isPending);
        const completedTeeth = allTeeth.filter(n => deriveToothFlags(n).isCompleted);
        if (pendingTeeth.length === 0 && urgentTeeth.length === 0 && completedTeeth.length === 0) return null;
        const insightParts: string[] = [];
        if (urgentTeeth.length > 0) {
          insightParts.push(
            `${urgentTeeth.length} urgente${urgentTeeth.length > 1 ? 's' : ''} (${urgentTeeth.slice(0, 4).join(', ')}${urgentTeeth.length > 4 ? '…' : ''})`
          );
        }
        if (pendingTeeth.length > urgentTeeth.length) {
          const n = pendingTeeth.length - urgentTeeth.length;
          insightParts.push(`${n} pendente${n > 1 ? 's' : ''}`);
        }
        if (completedTeeth.length > 0) {
          insightParts.push(`${completedTeeth.length} concluído${completedTeeth.length > 1 ? 's' : ''}`);
        }
        return (
          <p className="px-0.5 text-[11px] font-medium text-slate-400">{insightParts.join(' • ')}</p>
        );
      })()}

      <ActionMenu
        open={isMenuOpen}
        selectedTooth={selectedTooth}
        selectedStatus={selectedTooth !== null ? getToothStatus(selectedTooth) : 'healthy'}
        hasTreatment={selectedTooth !== null ? treatmentsByTooth.has(selectedTooth) : false}
        currentProcedure={selectedTooth !== null ? treatmentsByTooth.get(selectedTooth)?.[0]?.procedure : undefined}
        toothHistory={selectedTooth !== null ? historyByTooth.get(selectedTooth) || [] : []}
        mobile={isMobile}
        anchorRect={anchorRect}
        onClose={() => setIsMenuOpen(false)}
        onAction={handleAction}
        onReset={onResetTooth ? handleResetTooth : undefined}
        isActionAllowed={(actionKey) =>
          isToothActionAllowed(actionKey, selectedTooth, dentitionMode)
        }
      />

      {!isMobile && hoveredTooth !== null && hoverRect && (
        <div
          className="fixed z-[9998] pointer-events-none rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-[0_14px_30px_rgba(15,23,42,0.12)]"
          style={{
            top: hoverRect.top - 70,
            left: Math.max(10, hoverRect.left - 12),
          }}
        >
          <p className="text-xs font-semibold text-slate-900">Dente {hoveredTooth}</p>
          <p className="text-[11px] text-slate-500">{treatmentsByTooth.get(hoveredTooth)?.[0]?.procedure || statusLabels[getToothStatus(hoveredTooth)]}</p>
          {prosthesisByTooth[hoveredTooth] && (
            <p className="text-[11px] font-medium text-violet-600">{prosthesisByTooth[hoveredTooth].label}</p>
          )}
        </div>
      )}
    </div>
  );
};
