/**
 * Próteses e controle protético.
 *
 * Próteses são registradas como itens do plano de tratamento com escopo
 * regional (arcada ou intervalo de dentes), nunca por dente isolado:
 *  - Prótese Fixa (ponte) e Prótese Parcial Removível → escopo `range`
 *    (de um dente a outro), exibidas no odontograma como uma faixa.
 *  - Prótese Total e Protocolo → escopo `arch` (arcada superior/inferior).
 *
 * O "controle protético" acompanha cada prótese pelas etapas do trabalho no
 * laboratório (moldagem → enviada → aguardando → instalada).
 */

/** Chaves de procedimento consideradas próteses. */
export const PROSTHESIS_PROCEDURE_KEYS = [
  'prosthesis_fixed',
  'prosthesis_removable',
  'prosthesis_total',
  'prosthesis_protocol',
] as const;

export type ProsthesisProcedureKey = (typeof PROSTHESIS_PROCEDURE_KEYS)[number];

const PROSTHESIS_KEY_SET = new Set<string>(PROSTHESIS_PROCEDURE_KEYS);

export const isProsthesisProcedureKey = (key?: string | null): boolean =>
  !!key && PROSTHESIS_KEY_SET.has(key);

/** Rótulos legíveis por chave de prótese. */
export const PROSTHESIS_PROCEDURE_LABELS: Record<ProsthesisProcedureKey, string> = {
  prosthesis_fixed: 'Prótese Fixa',
  prosthesis_removable: 'Prótese Removível',
  prosthesis_total: 'Prótese Total',
  prosthesis_protocol: 'Protocolo s/ Implante',
};

/** Cores usadas na faixa do odontograma e nos cartões do controle protético. */
export interface ProsthesisColor {
  band: string;
  dot: string;
  chip: string;
}

export const PROSTHESIS_PROCEDURE_COLORS: Record<string, ProsthesisColor> = {
  prosthesis_fixed: { band: 'bg-violet-400', dot: 'bg-violet-500', chip: 'bg-violet-50 text-violet-700 border-violet-200' },
  prosthesis_removable: { band: 'bg-sky-400', dot: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700 border-sky-200' },
  prosthesis_total: { band: 'bg-indigo-400', dot: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  prosthesis_protocol: { band: 'bg-fuchsia-400', dot: 'bg-fuchsia-500', chip: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
};

export const DEFAULT_PROSTHESIS_COLOR: ProsthesisColor = {
  band: 'bg-violet-400',
  dot: 'bg-violet-500',
  chip: 'bg-violet-50 text-violet-700 border-violet-200',
};

export const getProsthesisColor = (procedureKey?: string | null): ProsthesisColor =>
  (procedureKey && PROSTHESIS_PROCEDURE_COLORS[procedureKey]) || DEFAULT_PROSTHESIS_COLOR;

/** Campo (em treatment_plan JSONB) que guarda a etapa atual do controle protético. */
export const PROSTHETIC_STAGE_FIELD = 'prosthetic_stage';

/** Campo (em treatment_plan JSONB) com anotações do laboratório / protético. */
export const PROSTHETIC_NOTES_FIELD = 'prosthetic_notes';

export interface ProstheticNote {
  id: string;
  text: string;
  created_at: string;
}

export interface ProstheticStage {
  key: string;
  label: string;
  short: string;
  /** Etapa final = prótese entregue/instalada. */
  terminal?: boolean;
  dotClass: string;
  toneClass: string;
}

/** Pipeline do trabalho protético, na ordem do processo. */
export const PROSTHETIC_STAGES: ProstheticStage[] = [
  { key: 'molding', label: 'Aguardando moldagem', short: 'Moldagem', dotClass: 'bg-slate-400', toneClass: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'sent', label: 'Enviada ao protético', short: 'Enviada', dotClass: 'bg-amber-500', toneClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'awaiting', label: 'Aguardando protético', short: 'Aguardando', dotClass: 'bg-sky-500', toneClass: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'installed', label: 'Prótese instalada', short: 'Instalada', dotClass: 'bg-emerald-500', toneClass: 'bg-emerald-50 text-emerald-700 border-emerald-200', terminal: true },
];

export const DEFAULT_PROSTHETIC_STAGE_KEY = PROSTHETIC_STAGES[0].key;

const ACTIVE_PROSTHESIS_STATUSES = new Set(['APROVADO', 'PENDENTE', 'PLANEJADO']);

/** Prótese em acompanhamento (não instalada / não concluída). */
export const isActiveProsthesisItem = (item: {
  status?: string;
  [key: string]: unknown;
}): boolean => {
  const status = String(item.status || '').toUpperCase();
  const stage = String(item[PROSTHETIC_STAGE_FIELD] || DEFAULT_PROSTHETIC_STAGE_KEY);
  if (stage === 'installed' || status === 'REALIZADO') return false;
  return ACTIVE_PROSTHESIS_STATUSES.has(status);
};

export const getProstheticStage = (key?: string | null): ProstheticStage =>
  PROSTHETIC_STAGES.find((s) => s.key === key) || PROSTHETIC_STAGES[0];

export const getProstheticStageIndex = (key?: string | null): number => {
  const idx = PROSTHETIC_STAGES.findIndex((s) => s.key === key);
  return idx < 0 ? 0 : idx;
};
