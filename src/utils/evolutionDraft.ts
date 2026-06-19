/**
 * evolutionDraft — Pilar A: a evolução nasce preenchida.
 *
 * Monta um rascunho editável a partir da melhor fonte disponível, nesta
 * ordem de prioridade:
 *   1. Plano de tratamento estruturado (item previsto para a sessão).
 *   2. Última evolução do mesmo paciente (ponto de partida editável).
 *   3. Nada (tela fica em branco, sem rascunho forçado).
 *
 * O rascunho é SEMPRE editável e nunca finge ter sido escrito pelo dentista.
 * O retorno sugerido é derivado do procedimento, não um default fixo.
 */

import {
  getProcedureDefinition,
  CLINICAL_PROCEDURES,
} from '../constants/clinicalProcedures';

export type DraftSource = 'plan' | 'lastEvolution' | 'none';

export interface SuggestedReturn {
  days: number | null;
  /** Micro-texto explicando o porquê do retorno sugerido. */
  reason: string;
}

export interface EvolutionDraft {
  /** Texto do rascunho pré-montado (pode ser vazio na fonte 'none'). */
  text: string;
  source: DraftSource;
  /** Rótulo honesto exibido na UI (ex. "Rascunho a partir do plano"). */
  sourceLabel: string;
  return: SuggestedReturn;
  procedureKey?: string;
}

/**
 * Procedimentos com retorno curto (7 dias): exigem reavaliação precoce.
 * endodontia / cirurgia / exodontia / implante.
 */
const SHORT_RETURN_KEYS = new Set(['root_canal', 'extraction', 'implant']);
/** Procedimentos de retorno padrão (30 dias): restauração / profilaxia. */
const STANDARD_RETURN_KEYS = new Set(['filling', 'prophylaxis', 'scaling']);

/**
 * Deriva o retorno sugerido a partir do procedimento — nunca um default cego.
 * Endodontia/cirurgia/exodontia/implante → 7 dias; restauração/profilaxia → 30.
 */
export function getSuggestedReturn(
  procedureKey?: string,
  procedureLabel?: string
): SuggestedReturn {
  const def = getProcedureDefinition(procedureLabel, procedureKey);
  const key = def?.key ?? procedureKey;

  if (key && SHORT_RETURN_KEYS.has(key)) {
    return {
      days: 7,
      reason: 'Procedimento cirúrgico/endodôntico pede reavaliação em ~7 dias.',
    };
  }
  if (key && STANDARD_RETURN_KEYS.has(key)) {
    return {
      days: 30,
      reason: 'Restauração/profilaxia: acompanhamento sugerido em ~30 dias.',
    };
  }
  return {
    days: 30,
    reason: 'Retorno padrão sugerido — ajuste se este caso pedir outro prazo.',
  };
}

interface PlanItemLike {
  procedure?: string;
  procedure_key?: string;
  tooth_number?: number;
  status?: string;
  updated_at?: string;
  created_at?: string;
}

interface EvolutionLike {
  notes?: string;
  procedure_performed?: string;
  return_date?: string | null;
}

const ACTIVE_STATUSES = new Set(['APROVADO', 'PENDENTE', 'PLANEJADO']);

const isActive = (status?: string): boolean =>
  ACTIVE_STATUSES.has(String(status || '').toUpperCase());

/**
 * Escolhe o item de plano previsto para esta sessão: prioriza itens ativos
 * com dente definido (mais acionáveis), depois quaisquer ativos, pegando o
 * mais recentemente mexido.
 */
function pickPlannedItem(plan: PlanItemLike[]): PlanItemLike | undefined {
  const active = plan.filter((item) => isActive(item.status));
  if (active.length === 0) return undefined;

  const recency = (item: PlanItemLike) =>
    new Date(item.updated_at || item.created_at || 0).getTime();

  const withTooth = active.filter((item) => Number(item.tooth_number) > 0);
  const pool = withTooth.length > 0 ? withTooth : active;
  return [...pool].sort((a, b) => recency(b) - recency(a))[0];
}

/** Gera a frase do rascunho a partir de um item de plano estruturado. */
function planItemToText(item: PlanItemLike, returnDays: number | null): string {
  const def = getProcedureDefinition(item.procedure, item.procedure_key);
  const label = def?.label || item.procedure || 'Procedimento';
  const tooth = Number(item.tooth_number);

  let phrase = label;
  if (Number.isFinite(tooth) && tooth > 0) {
    phrase += ` no dente ${tooth}`;
  }
  // Material padrão por procedimento (apenas como semente editável).
  if (def?.key === 'filling') phrase += ' com resina composta';
  if (def?.key === 'root_canal') phrase += ' (tratamento endodôntico)';

  if (returnDays !== null) {
    phrase += ` — retorno sugerido ${returnDays} dias`;
  }
  return phrase;
}

/**
 * Monta o rascunho da evolução. Função pura: não toca rede nem estado.
 */
export function buildEvolutionDraft(params: {
  treatmentPlan?: PlanItemLike[];
  lastEvolution?: EvolutionLike | null;
}): EvolutionDraft {
  const { treatmentPlan = [], lastEvolution = null } = params;

  // 1. Plano estruturado.
  const planned = pickPlannedItem(treatmentPlan);
  if (planned) {
    const def = getProcedureDefinition(planned.procedure, planned.procedure_key);
    const ret = getSuggestedReturn(def?.key ?? planned.procedure_key, planned.procedure);
    return {
      text: planItemToText(planned, ret.days),
      source: 'plan',
      sourceLabel: 'Rascunho a partir do plano — confirme ou ajuste',
      return: ret,
      procedureKey: def?.key ?? planned.procedure_key,
    };
  }

  // 2. Última evolução do mesmo paciente.
  if (lastEvolution && (lastEvolution.notes || lastEvolution.procedure_performed)) {
    const def = getProcedureDefinition(lastEvolution.procedure_performed);
    const ret = getSuggestedReturn(def?.key, lastEvolution.procedure_performed);
    return {
      text: lastEvolution.notes || lastEvolution.procedure_performed || '',
      source: 'lastEvolution',
      sourceLabel: 'Rascunho a partir da última evolução — confirme ou ajuste',
      return: ret,
      procedureKey: def?.key,
    };
  }

  // 3. Sem fonte: tela em branco, sem rascunho forçado.
  return {
    text: '',
    source: 'none',
    sourceLabel: '',
    return: getSuggestedReturn(),
  };
}

/** Reexporta para conveniência de quem só precisa do dicionário. */
export { CLINICAL_PROCEDURES };
