import type { ToothStatus } from '../utils/toothStatusDerivation';

/**
 * Próteses disponíveis no odontograma e no controle protético.
 *
 * Mantém em um único lugar a relação entre o status do dente, o rótulo exibido
 * e a chave de ação usada pelo menu do odontograma — para que o odontograma e o
 * painel de "Controle Protético" nunca saiam de sincronia.
 */
export interface ProsthesisType {
  /** Status persistido no odontograma. */
  status: ToothStatus;
  /** Chave de ação usada no menu do odontograma e no plano de tratamento. */
  actionKey: string;
  /** Rótulo curto exibido no menu do odontograma. */
  shortLabel: string;
  /** Rótulo legível exibido no controle protético / histórico. */
  label: string;
}

/** Tipos de prótese que podem ser registrados diretamente pelo odontograma. */
export const PROSTHESIS_TYPES: ProsthesisType[] = [
  { status: 'prosthesis_fixed', actionKey: 'prosthesis-fixed', shortLabel: 'Pr. Fixa', label: 'Prótese Fixa' },
  { status: 'prosthesis_removable', actionKey: 'prosthesis-removable', shortLabel: 'Pr. Removível', label: 'Prótese Removível' },
  { status: 'prosthesis_total', actionKey: 'prosthesis-total', shortLabel: 'Pr. Total', label: 'Prótese Total' },
  { status: 'prosthesis_protocol', actionKey: 'prosthesis-protocol', shortLabel: 'Protocolo', label: 'Protocolo s/ Implante' },
  { status: 'prosthesis_core', actionKey: 'prosthesis-core', shortLabel: 'Núcleo', label: 'Núcleo / Pino' },
];

/**
 * Status do odontograma considerados trabalhos protéticos passíveis de
 * acompanhamento no controle protético (inclui coroa, faceta e implante, que já
 * existiam no odontograma, além dos novos tipos de prótese).
 */
export const PROSTHESIS_TOOTH_STATUSES: ToothStatus[] = [
  'crown',
  'facet',
  'implant',
  'prosthesis',
  ...PROSTHESIS_TYPES.map((p) => p.status),
];

const PROSTHESIS_STATUS_SET = new Set<string>(PROSTHESIS_TOOTH_STATUSES);

export const isProsthesisStatus = (status?: string | null): boolean =>
  !!status && PROSTHESIS_STATUS_SET.has(status);

/** Rótulos legíveis por status protético (usado no controle protético). */
export const PROSTHESIS_STATUS_LABELS: Record<string, string> = {
  crown: 'Coroa',
  facet: 'Faceta',
  implant: 'Implante',
  prosthesis: 'Prótese',
  ...Object.fromEntries(PROSTHESIS_TYPES.map((p) => [p.status, p.label])),
};

/** Procedimento usado para registrar controles protéticos na evolução clínica. */
export const PROSTHETIC_CONTROL_PROCEDURE = 'Controle Protético';

/** Intervalo padrão (em dias) sugerido até o próximo controle protético. */
export const DEFAULT_PROSTHETIC_CONTROL_INTERVAL_DAYS = 180;

export interface ProstheticControlCondition {
  key: string;
  label: string;
  dotClass: string;
  toneClass: string;
}

/** Avaliações possíveis ao registrar um controle protético. */
export const PROSTHETIC_CONTROL_CONDITIONS: ProstheticControlCondition[] = [
  { key: 'stable', label: 'Estável', dotClass: 'bg-emerald-500', toneClass: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'adjust', label: 'Ajuste necessário', dotClass: 'bg-amber-500', toneClass: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'problem', label: 'Intercorrência', dotClass: 'bg-rose-500', toneClass: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export const getProstheticControlCondition = (key?: string | null) =>
  PROSTHETIC_CONTROL_CONDITIONS.find((c) => c.key === key);
