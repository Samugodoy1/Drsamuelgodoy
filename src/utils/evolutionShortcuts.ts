/**
 * evolutionShortcuts — Pilar B: suas frases viram um toque.
 *
 * Detecta redações recorrentes do PRÓPRIO dentista (mesmo procedimento +
 * redação parecida usada N vezes) e as transforma em cartões de confirmação
 * rápida. São atalhos pessoais aprendidos do uso, NÃO templates genéricos do
 * produto. Se não houver histórico suficiente, retorna lista vazia (sem
 * estado vazio forçado na UI).
 *
 * Função pura e testável. Sem rede, sem IA.
 */

import { getProcedureDefinition } from '../constants/clinicalProcedures';
import { parseClinicalText } from './clinicalParser';

export interface EvolutionRecord {
  notes?: string;
  procedure_performed?: string;
  materials?: string;
  return_date?: string | null;
  created_at?: string;
  date?: string;
}

export interface EvolutionShortcut {
  id: string;
  /** Título curto (label do procedimento). */
  title: string;
  /** Texto que preenche a evolução num toque (sem dente específico). */
  text: string;
  procedureKey?: string;
  /** Retorno aprendido do hábito do dentista; null = sem retorno. */
  returnDays: number | null;
  /** Quantas vezes essa redação foi usada (peso do atalho). */
  count: number;
}

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalize = (value: string): string =>
  stripAccents(String(value || '').toLowerCase());

/**
 * Remove referências a dente/elemento específico para que a mesma frase
 * usada em dentes diferentes seja reconhecida como a MESMA redação — e para
 * que o texto preenchido nunca carregue o dente de outro paciente.
 */
function stripToothReferences(text: string): string {
  return text
    .replace(/\b(no |do |nos |dos )?(dente|elemento)s?\s*\d{1,2}\b/gi, '')
    .replace(/\b\d{2}\b/g, '') // números FDI soltos
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;])/g, '$1')
    .replace(/(^[\s,;.-]+)|([\s,;.-]+$)/g, '')
    .trim();
}

/** Remove o sufixo "retorno X dias/meses" do corpo (o retorno vai à parte). */
function stripReturnSuffix(text: string): string {
  return text
    .replace(/[—\-,;]?\s*retorno[^.]*$/i, '')
    .replace(/(^[\s,;.-]+)|([\s,;.-]+$)/g, '')
    .trim();
}

/** Assinatura de agrupamento: procedimento + redação sem dente nem ruído. */
function signatureOf(record: EvolutionRecord): string {
  const proc = normalize(record.procedure_performed);
  const body = normalize(stripReturnSuffix(stripToothReferences(String(record.notes || ''))))
    .replace(/[^\wçãõáéíóúâêô\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${proc}|${body}`;
}

function recordDate(record: EvolutionRecord): Date | null {
  const raw = record.created_at || record.date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Intervalo de retorno (em dias) que o dentista efetivamente usou. */
function returnDeltaDays(record: EvolutionRecord): number | null {
  if (!record.return_date) return null;
  const ret = new Date(`${String(record.return_date).split('T')[0]}T12:00:00`);
  const base = recordDate(record);
  if (!base || Number.isNaN(ret.getTime())) return null;
  const days = Math.round((ret.getTime() - base.getTime()) / 86_400_000);
  return days > 0 ? days : null;
}

/** Valor mais frequente de uma lista (moda); null se vazia. */
function mode<T>(values: T[]): T | null {
  const counts = new Map<T, number>();
  let best: T | null = null;
  let bestCount = 0;
  for (const v of values) {
    const c = (counts.get(v) || 0) + 1;
    counts.set(v, c);
    if (c > bestCount) {
      bestCount = c;
      best = v;
    }
  }
  return best;
}

export interface ShortcutOptions {
  /** Mínimo de repetições para virar atalho. */
  minCount?: number;
  /** Máximo de cartões exibidos. */
  maxCards?: number;
}

/**
 * Constrói os atalhos a partir do histórico de evoluções do dentista.
 * Retorna [] quando nada atinge o limiar de repetição.
 */
export function buildShortcuts(
  records: EvolutionRecord[],
  options: ShortcutOptions = {}
): EvolutionShortcut[] {
  const minCount = options.minCount ?? 3;
  const maxCards = options.maxCards ?? 3;

  if (!Array.isArray(records) || records.length === 0) return [];

  // Agrupa por assinatura.
  const groups = new Map<string, EvolutionRecord[]>();
  for (const rec of records) {
    if (!rec || !String(rec.notes || '').trim()) continue;
    const sig = signatureOf(rec);
    if ((sig.split('|')[1] || '').trim() === '') continue; // sem corpo clínico
    const list = groups.get(sig);
    if (list) list.push(rec);
    else groups.set(sig, [rec]);
  }

  const shortcuts: EvolutionShortcut[] = [];
  for (const [sig, members] of groups) {
    if (members.length < minCount) continue;

    // Frase representativa: a redação exata mais usada (desempate: mais recente).
    const cleaned = members.map((m) =>
      stripReturnSuffix(stripToothReferences(String(m.notes || ''))).trim()
    );
    const representative = mode(cleaned) || cleaned[0];
    if (!representative) continue;

    // Procedimento: pelo campo salvo, com fallback no parser do texto.
    const def =
      getProcedureDefinition(members[0].procedure_performed) ||
      getProcedureDefinition(parseClinicalText(representative).procedure);
    const procedureKey = def?.key || parseClinicalText(representative).procedureKey;
    const title = def?.label || members[0].procedure_performed || 'Evolução';

    // Retorno aprendido: moda dos intervalos reais; null se o hábito é sem retorno.
    const deltas = members.map(returnDeltaDays).filter((d): d is number => d !== null);
    const returnDays = deltas.length >= Math.ceil(members.length / 2) ? mode(deltas) : null;

    shortcuts.push({
      id: sig,
      title,
      text: representative,
      procedureKey,
      returnDays,
      count: members.length,
    });
  }

  return shortcuts.sort((a, b) => b.count - a.count).slice(0, maxCards);
}
