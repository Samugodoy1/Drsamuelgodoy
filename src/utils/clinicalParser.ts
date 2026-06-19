/**
 * clinicalParser — módulo isolado de parsing clínico PT-BR.
 *
 * Filosofia: NÃO roda enquanto o dentista digita. Roda uma única vez, no
 * momento do salvar, em background, apenas para estruturar o histórico
 * clínico (dente FDI + procedimento + material). Sem chamada de IA.
 *
 * Dicionário PT-BR + regex, client-side e testável.
 */

import { CLINICAL_PROCEDURES } from '../constants/clinicalProcedures';

export interface ParsedEvolution {
  /** Elementos dentários no padrão FDI (permanentes 11–48, decíduos 51–85). */
  teeth: number[];
  /** Label do procedimento dominante (ex. "Restauracao"), se detectado. */
  procedure?: string;
  /** Chave canônica em CLINICAL_PROCEDURES (ex. "filling"), se detectado. */
  procedureKey?: string;
  /** Materiais / insumos detectados (ex. "Resina composta", "Cor A2"). */
  materials: string[];
}

const stripAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalize = (value: string): string => stripAccents(value.toLowerCase());

/** Mapeia radicais de palavra → chave de procedimento em CLINICAL_PROCEDURES. */
const PROCEDURE_KEYWORDS: Array<{ patterns: string[]; key: string }> = [
  { patterns: ['restaur', 'resin'], key: 'filling' },
  { patterns: ['canal', 'endo', 'obtura', 'instrument'], key: 'root_canal' },
  { patterns: ['exodont', 'extrac', 'extrai'], key: 'extraction' },
  { patterns: ['coroa', 'protese fixa'], key: 'crown' },
  { patterns: ['implant'], key: 'implant' },
  { patterns: ['clareament'], key: 'whitening' },
  { patterns: ['profilax', 'limpez'], key: 'prophylaxis' },
  { patterns: ['raspag', 'tartar', 'calcul'], key: 'scaling' },
  { patterns: ['carie'], key: 'decay' },
];

/** Materiais / insumos reconhecidos (radical → rótulo formal). */
const MATERIAL_KEYWORDS: Array<{ patterns: string[]; label: string }> = [
  { patterns: ['resin'], label: 'Resina composta' },
  { patterns: ['ionomer', 'civ', 'cimento de vidro'], label: 'Ionômero de vidro' },
  { patterns: ['hidroxid'], label: 'Hidróxido de cálcio' },
  { patterns: ['pmcc', 'paramono'], label: 'Paramonoclorofenol' },
  { patterns: ['guta', 'gutaperch'], label: 'Guta-percha' },
  { patterns: ['pino'], label: 'Pino intrarradicular' },
  { patterns: ['nucleo'], label: 'Núcleo de preenchimento' },
  { patterns: ['articain', 'lidocain', 'mepivac', 'anestes'], label: 'Anestésico local' },
  { patterns: ['adesiv'], label: 'Sistema adesivo' },
  { patterns: ['coltosol', 'provisor'], label: 'Selamento provisório' },
];

// Elementos: permanentes 11-48 e decíduos 51-85.
const TOOTH_REGEX = /\b([1-4][1-8]|[5-8][1-5])\b/g;
// Cores de resina A1–D4 (com possível .5).
const COLOR_REGEX = /\b([A-D][1-4](?:\.5)?)\b/gi;

/**
 * Extrai entidades estruturadas de um texto de evolução clínica.
 * Determinístico, sem efeitos colaterais.
 */
export function parseClinicalText(input: string): ParsedEvolution {
  const result: ParsedEvolution = { teeth: [], materials: [] };
  if (!input || !input.trim()) return result;

  const normalized = normalize(input);

  // 1. Elementos dentários (FDI) — sobre o texto cru para respeitar números.
  const teeth = new Set<number>();
  for (const match of input.matchAll(TOOTH_REGEX)) {
    teeth.add(Number(match[1]));
  }
  result.teeth = Array.from(teeth).sort((a, b) => a - b);

  // 2. Procedimento dominante: conta ocorrências de radicais por chave.
  const counts: Record<string, number> = {};
  for (const entry of PROCEDURE_KEYWORDS) {
    const hits = entry.patterns.reduce(
      (sum, p) => sum + (normalized.includes(p) ? 1 : 0),
      0
    );
    if (hits > 0) counts[entry.key] = (counts[entry.key] || 0) + hits;
  }
  const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (dominant) {
    result.procedureKey = dominant[0];
    result.procedure = CLINICAL_PROCEDURES[dominant[0]]?.label;
  }

  // 3. Materiais / insumos.
  const materials: string[] = [];
  for (const entry of MATERIAL_KEYWORDS) {
    if (entry.patterns.some((p) => normalized.includes(p))) {
      materials.push(entry.label);
    }
  }

  // 4. Cores de resina (A2, B1, etc.) — anexadas como material.
  const colors = new Set<string>();
  for (const match of input.matchAll(COLOR_REGEX)) {
    colors.add(`Cor ${match[1].toUpperCase()}`);
  }
  result.materials = [...materials, ...Array.from(colors)];

  return result;
}
