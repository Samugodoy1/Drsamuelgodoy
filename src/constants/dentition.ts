export type DentitionMode = 'deciduous' | 'mixed' | 'permanent';
export type DentitionQuadrantId = 1 | 2 | 3 | 4;
export type DentitionSource = 'auto' | 'manual';

export interface QuadrantTeethLayout {
  permanent?: number[];
  deciduous?: number[];
}

export interface ArchLayout {
  right: QuadrantTeethLayout;
  left: QuadrantTeethLayout;
}

export interface DentitionLayout {
  mode: DentitionMode;
  upper: ArchLayout;
  lower: ArchLayout;
}

const PERMANENT = {
  upperRight: [18, 17, 16, 15, 14, 13, 12, 11],
  upperLeft: [21, 22, 23, 24, 25, 26, 27, 28],
  lowerLeft: [38, 37, 36, 35, 34, 33, 32, 31],
  lowerRight: [48, 47, 46, 45, 44, 43, 42, 41],
} as const;

const DECIDUOUS = {
  upperRight: [55, 54, 53, 52, 51],
  upperLeft: [61, 62, 63, 64, 65],
  lowerLeft: [71, 72, 73, 74, 75],
  lowerRight: [85, 84, 83, 82, 81],
} as const;

export const DENTITION_MODE_LABELS: Record<DentitionMode, string> = {
  deciduous: 'Dentição Decídua',
  mixed: 'Dentição Mista',
  permanent: 'Dentição Permanente',
};

/** Rótulos curtos para UI compacta (chip / menu). */
export const DENTITION_MODE_SHORT: Record<DentitionMode, string> = {
  deciduous: 'Decídua',
  mixed: 'Mista',
  permanent: 'Permanente',
};

/** Posição dos decíduos na grade de 8 colunas (alinhados aos permanentes). */
export const MIXED_DECIDUOUS_GRID_SLOTS: Record<
  'upperRight' | 'upperLeft' | 'lowerLeft' | 'lowerRight',
  Array<number | null>
> = {
  upperRight: [null, null, 55, 54, 53, 52, 51, null],
  upperLeft: [null, 61, 62, 63, 64, 65, null, null],
  lowerLeft: [null, 71, 72, 73, 74, 75, null, null],
  lowerRight: [null, null, 85, 84, 83, 82, 81, null],
};

/** Ações do menu do dente ocultas em dentes decíduos ou no modo decídua inteiro. */
export const DECIDUOUS_HIDDEN_TOOTH_ACTION_KEYS = new Set(['implant', 'prosthesis', 'facet']);

export function inferDentitionFromAge(ageYears: number | null | undefined): DentitionMode {
  if (ageYears == null || !Number.isFinite(ageYears)) return 'permanent';
  if (ageYears <= 5) return 'deciduous';
  if (ageYears <= 12) return 'mixed';
  return 'permanent';
}

export function isDeciduousToothNumber(toothNumber: number): boolean {
  const n = Number(toothNumber);
  if (!Number.isFinite(n)) return false;
  const quadrant = Math.floor(n / 10);
  const unit = n % 10;
  return quadrant >= 5 && quadrant <= 8 && unit >= 1 && unit <= 5;
}

export function isPermanentToothNumber(toothNumber: number): boolean {
  const n = Number(toothNumber);
  if (!Number.isFinite(n)) return false;
  const quadrant = Math.floor(n / 10);
  const unit = n % 10;
  return quadrant >= 1 && quadrant <= 4 && unit >= 1 && unit <= 8;
}

export function isValidFdiToothNumber(toothNumber: number): boolean {
  return isDeciduousToothNumber(toothNumber) || isPermanentToothNumber(toothNumber);
}

export function shouldShowPediatricContext(
  mode: DentitionMode,
  ageYears: number | null | undefined
): boolean {
  if (mode === 'deciduous' || mode === 'mixed') return true;
  return ageYears != null && ageYears <= 12;
}

export function getPreferredModeForTooth(toothNumber: number): DentitionMode {
  if (isDeciduousToothNumber(toothNumber)) return 'deciduous';
  if (isPermanentToothNumber(toothNumber)) return 'permanent';
  return 'permanent';
}

export function isToothVisibleInMode(toothNumber: number, mode: DentitionMode): boolean {
  return getAllTeethInMode(mode).includes(Number(toothNumber));
}

export function isToothActionAllowed(
  actionKey: string,
  toothNumber: number | null,
  mode: DentitionMode
): boolean {
  if (DECIDUOUS_HIDDEN_TOOTH_ACTION_KEYS.has(actionKey)) {
    if (mode === 'deciduous') return false;
    if (mode === 'mixed' && toothNumber != null && isDeciduousToothNumber(toothNumber)) {
      return false;
    }
  }
  return true;
}

function quadrantLayout(
  mode: DentitionMode,
  permanent: number[],
  deciduous: number[]
): QuadrantTeethLayout {
  switch (mode) {
    case 'deciduous':
      return { deciduous: [...deciduous] };
    case 'permanent':
      return { permanent: [...permanent] };
    case 'mixed':
      return { permanent: [...permanent], deciduous: [...deciduous] };
    default:
      return { permanent: [...permanent] };
  }
}

export function getDentitionLayout(mode: DentitionMode): DentitionLayout {
  return {
    mode,
    upper: {
      right: quadrantLayout(mode, [...PERMANENT.upperRight], [...DECIDUOUS.upperRight]),
      left: quadrantLayout(mode, [...PERMANENT.upperLeft], [...DECIDUOUS.upperLeft]),
    },
    lower: {
      left: quadrantLayout(mode, [...PERMANENT.lowerLeft], [...DECIDUOUS.lowerLeft]),
      right: quadrantLayout(mode, [...PERMANENT.lowerRight], [...DECIDUOUS.lowerRight]),
    },
  };
}

const QUADRANT_MAP: Record<
  DentitionQuadrantId,
  { arch: 'upper' | 'lower'; side: 'right' | 'left' }
> = {
  1: { arch: 'upper', side: 'right' },
  2: { arch: 'upper', side: 'left' },
  3: { arch: 'lower', side: 'left' },
  4: { arch: 'lower', side: 'right' },
};

export function getQuadrantTeethForMode(
  quadrant: DentitionQuadrantId,
  mode: DentitionMode = 'permanent'
): number[] {
  const layout = getDentitionLayout(mode);
  const { arch, side } = QUADRANT_MAP[quadrant];
  const block = layout[arch][side];
  const teeth: number[] = [];
  if (block.permanent) teeth.push(...block.permanent);
  if (block.deciduous) teeth.push(...block.deciduous);
  return teeth;
}

export function getAllTeethInMode(mode: DentitionMode): number[] {
  const layout = getDentitionLayout(mode);
  const collect = (arch: ArchLayout) => {
    const rows: number[] = [];
    (['right', 'left'] as const).forEach((side) => {
      const block = arch[side];
      if (block.permanent) rows.push(...block.permanent);
      if (block.deciduous) rows.push(...block.deciduous);
    });
    return rows;
  };
  return [...collect(layout.upper), ...collect(layout.lower)];
}

/**
 * Sequências completas de cada arcada, em ordem anatômica contínua (de um lado
 * ao outro, cruzando a linha média). Usadas para resolver um intervalo de
 * dentes "de X a Y" (ponte / prótese parcial removível).
 */
export const ARCH_SEQUENCES: number[][] = [
  [...PERMANENT.upperRight, ...PERMANENT.upperLeft],
  [...PERMANENT.lowerRight, ...PERMANENT.lowerLeft],
  [...DECIDUOUS.upperRight, ...DECIDUOUS.upperLeft],
  [...DECIDUOUS.lowerRight, ...DECIDUOUS.lowerLeft],
];

/**
 * Retorna os dentes entre dois elementos (inclusive), na ordem da arcada.
 * Os dois dentes precisam pertencer à mesma arcada; caso contrário, retorna [].
 */
export function getToothRange(from: number, to: number): number[] {
  for (const seq of ARCH_SEQUENCES) {
    const i = seq.indexOf(from);
    const j = seq.indexOf(to);
    if (i === -1 || j === -1) continue;
    const [start, end] = i <= j ? [i, j] : [j, i];
    return seq.slice(start, end + 1);
  }
  return [];
}

export function getArchSequencesForMode(mode: DentitionMode): number[][] {
  if (mode === 'deciduous') return ARCH_SEQUENCES.slice(2);
  if (mode === 'mixed') return ARCH_SEQUENCES;
  return ARCH_SEQUENCES.slice(0, 2);
}

export function sortTeethInArchOrder(teeth: number[], mode: DentitionMode = 'permanent'): number[] {
  for (const seq of getArchSequencesForMode(mode)) {
    const picked = teeth.filter((t) => seq.includes(t));
    if (picked.length === teeth.length) {
      return picked.sort((a, b) => seq.indexOf(a) - seq.indexOf(b));
    }
  }
  return [...teeth].sort((a, b) => a - b);
}

export function validateProsthesisTeethSelection(
  teeth: number[],
  mode: DentitionMode = 'permanent'
): { ok: boolean; message?: string } {
  if (teeth.length < 2) {
    return { ok: false, message: 'Selecione pelo menos 2 dentes.' };
  }
  for (const seq of getArchSequencesForMode(mode)) {
    if (teeth.every((t) => seq.includes(t))) return { ok: true };
  }
  return { ok: false, message: 'Os dentes precisam estar na mesma arcada.' };
}

/** Dentes da arcada (superior/inferior) para o modo informado. */
export function getArchTeeth(arch: 'upper' | 'lower', mode: DentitionMode): number[] {
  const layout = getDentitionLayout(mode);
  const block = layout[arch];
  const rows: number[] = [];
  (['right', 'left'] as const).forEach((side) => {
    const b = block[side];
    if (b.permanent) rows.push(...b.permanent);
    if (b.deciduous) rows.push(...b.deciduous);
  });
  return rows;
}

export function resolveEffectiveDentitionMode(
  patient: {
    dentition_mode?: string | null;
    dentition_mode_source?: string | null;
    birth_date?: string | null;
  } | null | undefined,
  ageYears: number | null | undefined
): DentitionMode {
  const stored = String(patient?.dentition_mode || '').toLowerCase();
  if (
    stored === 'deciduous' ||
    stored === 'mixed' ||
    stored === 'permanent'
  ) {
    return stored;
  }
  if (ageYears != null) return inferDentitionFromAge(ageYears);
  return 'permanent';
}

export function resolveSuggestedDentitionMode(
  ageYears: number | null | undefined
): DentitionMode | null {
  if (ageYears == null) return null;
  return inferDentitionFromAge(ageYears);
}

export function shouldPromptDentitionUpdate(
  effectiveMode: DentitionMode,
  suggestedMode: DentitionMode | null,
  source: DentitionSource | null | undefined
): boolean {
  if (suggestedMode == null) return false;
  if (source === 'manual') return false;
  return suggestedMode !== effectiveMode;
}

/** Modo mínimo para exibir um dente fora do layout atual (ex.: resumo → odontograma). */
export function suggestModeToRevealTooth(
  toothNumber: number,
  currentMode: DentitionMode
): DentitionMode | null {
  if (isToothVisibleInMode(toothNumber, currentMode)) return null;
  if (isDeciduousToothNumber(toothNumber)) {
    return currentMode === 'permanent' ? 'mixed' : 'deciduous';
  }
  if (isPermanentToothNumber(toothNumber)) {
    return currentMode === 'deciduous' ? 'mixed' : 'permanent';
  }
  return 'permanent';
}
