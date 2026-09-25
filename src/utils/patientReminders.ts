export type CadenceUnit = 'day' | 'week' | 'month' | 'year';

export interface ParsedReminder {
  ok: true;
  note: string;
  dueDate: string;
  cadenceUnit: CadenceUnit | null;
  cadenceCount: number | null;
  whenLabel: string;
}

export interface ParseFailure {
  ok: false;
  reason: string;
}

export type ReminderParse = ParsedReminder | ParseFailure;

export interface ReminderSuggestion {
  id: string;
  label: string;
  text: string;
}

const FOLD: Record<string, string> = {
  á: 'a', à: 'a', ã: 'a', â: 'a',
  é: 'e', ê: 'e',
  í: 'i',
  ó: 'o', ô: 'o', õ: 'o',
  ú: 'u',
  ç: 'c',
};

const NUMBER_WORDS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5,
  seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12,
  quinze: 15, vinte: 20, trinta: 30,
};

const MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const WEEKDAYS: Record<string, number> = {
  domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6,
};

const NUM = String.raw`(\d+|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|onze|doze|quinze|vinte|trinta)`;
const UNIT = String.raw`(dias|dia|semanas|semana|meses|mes|anos|ano)`;

export function fold(value: string): string {
  return value.toLowerCase().replace(/[áàãâéêíóôõúüç]/g, char => FOLD[char] || char);
}

export function clinicToday(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function parseIsoDate(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  return { year, month, day };
}

export function toIso(year: number, month: number, day: number): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function addDaysIso(iso: string, days: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return toIso(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate());
}

export function addMonthsIso(iso: string, months: number): string {
  const { year, month, day } = parseIsoDate(iso);
  const cursor = new Date(Date.UTC(year, month - 1 + months, 1));
  const last = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 0)).getUTCDate();
  return toIso(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, Math.min(day, last));
}

export function weekdayOf(iso: string): number {
  const { year, month, day } = parseIsoDate(iso);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function compareIso(a: string, b: string): number {
  return a.slice(0, 10).localeCompare(b.slice(0, 10));
}

function readCount(token: string): number | null {
  if (/^\d+$/.test(token)) {
    const value = Number(token);
    return value > 0 ? value : null;
  }
  return NUMBER_WORDS[token] ?? null;
}

function shiftByUnit(today: string, count: number, unit: CadenceUnit): string {
  if (unit === 'day') return addDaysIso(today, count);
  if (unit === 'week') return addDaysIso(today, count * 7);
  if (unit === 'month') return addMonthsIso(today, count);
  return addMonthsIso(today, count * 12);
}

function unitFromWord(word: string): CadenceUnit | null {
  if (word.startsWith('dia')) return 'day';
  if (word.startsWith('semana')) return 'week';
  if (word.startsWith('mes')) return 'month';
  if (word.startsWith('ano')) return 'year';
  return null;
}

export function formatCadence(count: number, unit: CadenceUnit): string {
  const labels: Record<CadenceUnit, [string, string]> = {
    day: ['dia', 'dias'],
    week: ['semana', 'semanas'],
    month: ['mês', 'meses'],
    year: ['ano', 'anos'],
  };
  const [one, many] = labels[unit];
  return count === 1 ? `1 ${one}` : `${count} ${many}`;
}

export function formatWhenLabel(dueDate: string, today: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate || '')) return 'em breve';
  if (dueDate === today) return 'hoje';
  if (dueDate === addDaysIso(today, 1)) return 'amanhã';
  const { year, month, day } = parseIsoDate(dueDate);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) return 'em breve';
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' }).format(date);
  return `${day} de ${monthName} de ${year}`;
}

export function advanceCadence(from: string, count: number, unit: CadenceUnit): string {
  return shiftByUnit(from, count, unit);
}

function nextWeekday(today: string, target: number): string {
  const current = weekdayOf(today);
  const delta = (target - current + 7) % 7 || 7;
  return addDaysIso(today, delta);
}

function nextMonthDay(today: string, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const { year } = parseIsoDate(today);
  const candidate = (startYear: number) => {
    const last = new Date(Date.UTC(startYear, month, 0)).getUTCDate();
    if (day > last) return null;
    return toIso(startYear, month, day);
  };
  const thisYear = candidate(year);
  if (thisYear && compareIso(thisYear, today) > 0) return thisYear;
  return candidate(year + 1);
}

function explicitDate(today: string, day: number, month: number, year?: number): string | null {
  if (year != null && year < 100) year += 2000;
  if (year != null) {
    const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day < 1 || day > last || month < 1 || month > 12) return null;
    return toIso(year, month, day);
  }
  return nextMonthDay(today, month, day);
}

interface TimeHit {
  start: number;
  end: number;
  dueDate: string;
  cadenceUnit: CadenceUnit | null;
  cadenceCount: number | null;
}

function findTime(folded: string, today: string): TimeHit | { error: string } | null {
  const patterns: Array<{ re: RegExp; build: (match: RegExpExecArray) => TimeHit | { error: string } | null }> = [
    {
      re: new RegExp(String.raw`(?:depois de amanha)`, 'g'),
      build: (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        dueDate: addDaysIso(today, 2),
        cadenceUnit: null,
        cadenceCount: null,
      }),
    },
    {
      re: new RegExp(String.raw`(?:daqui(?:\s+a)?|em|depois de)\s+${NUM}\s+${UNIT}`, 'g'),
      build: (match) => {
        const count = readCount(match[1]);
        const unit = unitFromWord(match[2]);
        if (!count || !unit || count > 120) return { error: 'Esse prazo não ficou claro.' };
        return {
          start: match.index,
          end: match.index + match[0].length,
          dueDate: shiftByUnit(today, count, unit),
          cadenceUnit: unit,
          cadenceCount: count,
        };
      },
    },
    {
      re: /\b(?:semana que vem|proxima semana)\b/g,
      build: (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        dueDate: addDaysIso(today, 7),
        cadenceUnit: 'week',
        cadenceCount: 1,
      }),
    },
    {
      re: /\b(?:mes que vem|proximo mes)\b/g,
      build: (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        dueDate: addMonthsIso(today, 1),
        cadenceUnit: 'month',
        cadenceCount: 1,
      }),
    },
    {
      re: /\b(?:na |nesta )?(?:proxima )?((?:segunda|terca|quarta|quinta|sexta)(?:-feira)?|sabado|domingo)\b/g,
      build: (match) => {
        const name = match[1].replace('-feira', '');
        const target = WEEKDAYS[name];
        return {
          start: match.index,
          end: match.index + match[0].length,
          dueDate: nextWeekday(today, target),
          cadenceUnit: null,
          cadenceCount: null,
        };
      },
    },
    {
      re: /\bdia\s+(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/g,
      build: (match) => dateHit(match, today),
    },
    {
      re: /\b(\d{1,2})[\/\-.](\d{1,2})(?:[\/\-.](\d{2,4}))?\b/g,
      build: (match) => dateHit(match, today),
    },
    {
      re: new RegExp(String.raw`\b(\d{1,2})\s+de\s+(${Object.keys(MONTHS).join('|')})\b`, 'g'),
      build: (match) => {
        const dueDate = nextMonthDay(today, MONTHS[match[2]], Number(match[1]));
        if (!dueDate) return { error: 'Essa data não existe.' };
        return {
          start: match.index,
          end: match.index + match[0].length,
          dueDate,
          cadenceUnit: null,
          cadenceCount: null,
        };
      },
    },
    {
      re: new RegExp(String.raw`\bem\s+(${Object.keys(MONTHS).join('|')})\b`, 'g'),
      build: (match) => {
        const { day } = parseIsoDate(today);
        const dueDate = nextMonthDay(today, MONTHS[match[1]], day);
        if (!dueDate) return { error: 'Essa data não existe.' };
        return {
          start: match.index,
          end: match.index + match[0].length,
          dueDate,
          cadenceUnit: 'year',
          cadenceCount: 1,
        };
      },
    },
    {
      re: /\bamanha\b/g,
      build: (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        dueDate: addDaysIso(today, 1),
        cadenceUnit: null,
        cadenceCount: null,
      }),
    },
    {
      re: /\bhoje\b/g,
      build: (match) => ({
        start: match.index,
        end: match.index + match[0].length,
        dueDate: today,
        cadenceUnit: null,
        cadenceCount: null,
      }),
    },
  ];

  let best: TimeHit | null = null;
  for (const pattern of patterns) {
    pattern.re.lastIndex = 0;
    const match = pattern.re.exec(folded);
    if (!match) continue;
    const built = pattern.build(match);
    if (!built) continue;
    if ('error' in built) return built;
    if (!best || built.start < best.start) best = built;
  }
  return best;
}

function dateHit(match: RegExpExecArray, today: string): TimeHit | { error: string } | null {
  const dueDate = explicitDate(today, Number(match[1]), Number(match[2]), match[3] ? Number(match[3]) : undefined);
  if (!dueDate) return { error: 'Essa data não existe.' };
  return {
    start: match.index,
    end: match.index + match[0].length,
    dueDate,
    cadenceUnit: null,
    cadenceCount: null,
  };
}

function cleanNote(original: string, hit: TimeHit): string {
  const withoutTime = `${original.slice(0, hit.start)} ${original.slice(hit.end)}`;
  let note = withoutTime.replace(/\s+/g, ' ').trim();
  note = note.replace(/^(?:me\s+)?(?:lembrar|lembre|lembrete|avise|avisar)(?:\s+(?:de|para|pra))?\s*/i, '');
  note = note.replace(/\s*(?:me\s+)?(?:lembrar|lembre|lembrete)\s*$/i, '');
  note = note.replace(/^(?:de|para|pra|que|sobre)\s+/i, '');
  note = note.replace(/[.,;:\-–—]+$/g, '').trim();
  if (!note) return 'Entrar em contato';
  return note.charAt(0).toUpperCase() + note.slice(1);
}

export function parseReminder(text: string, today = clinicToday()): ReminderParse {
  const source = text.replace(/\s+/g, ' ').trim();
  if (!source) return { ok: false, reason: 'Diga quando e o que lembrar.' };
  const folded = fold(source);
  const hit = findTime(folded, today);
  if (!hit) return { ok: false, reason: 'Diga quando. Por exemplo, “daqui a 6 meses”.' };
  if ('error' in hit) return { ok: false, reason: hit.error };
  const limit = addMonthsIso(today, 120);
  if (compareIso(hit.dueDate, today) < 0) return { ok: false, reason: 'Essa data já passou.' };
  if (compareIso(hit.dueDate, limit) > 0) return { ok: false, reason: 'Escolha um prazo de até 10 anos.' };
  const whenLabel = hit.cadenceCount && hit.cadenceUnit
    ? `em ${formatCadence(hit.cadenceCount, hit.cadenceUnit)}`
    : formatWhenLabel(hit.dueDate, today);
  return {
    ok: true,
    note: cleanNote(source, hit),
    dueDate: hit.dueDate,
    cadenceUnit: hit.cadenceUnit,
    cadenceCount: hit.cadenceCount,
    whenLabel,
  };
}

const SUGGESTION_RULES: Array<{ id: string; label: string; text: string; pattern: RegExp }> = [
  {
    id: 'protese',
    label: 'Prótese em 6 meses',
    text: 'Daqui a 6 meses entrar em contato para ver como está a prótese',
    pattern: /protese|protocolo/,
  },
  {
    id: 'implante',
    label: 'Implante em 3 meses',
    text: 'Daqui a 3 meses verificar a osseointegração do implante',
    pattern: /implante|osseointegr/,
  },
  {
    id: 'pos-op',
    label: 'Pós-operatório em 7 dias',
    text: 'Daqui a 7 dias conferir a cicatrização',
    pattern: /extracao|cirurg|sutura|enxerto/,
  },
  {
    id: 'canal',
    label: 'Canal em 15 dias',
    text: 'Daqui a 15 dias acompanhar o tratamento de canal',
    pattern: /endodont|canal/,
  },
  {
    id: 'manutencao',
    label: 'Manutenção em 6 meses',
    text: 'Daqui a 6 meses chamar para a manutenção',
    pattern: /profilaxia|limpeza|manutenc|raspagem/,
  },
  {
    id: 'ortodontia',
    label: 'Ortodontia em 30 dias',
    text: 'Daqui a 30 dias revisar a ortodontia',
    pattern: /ortodont|aparelho|alinhador/,
  },
];

const DEFAULT_SUGGESTIONS: ReminderSuggestion[] = [
  { id: '7d', label: 'Em 7 dias', text: 'Daqui a 7 dias entrar em contato' },
  { id: '30d', label: 'Em 30 dias', text: 'Daqui a 30 dias ver como o paciente está' },
  { id: '6m', label: 'Em 6 meses', text: 'Daqui a 6 meses entrar em contato' },
];

export function suggestReminders(context: string): ReminderSuggestion[] {
  const folded = fold(context || '');
  const matched = SUGGESTION_RULES.filter(rule => rule.pattern.test(folded)).slice(0, 3);
  if (matched.length > 0) return matched.map(({ id, label, text }) => ({ id, label, text }));
  return DEFAULT_SUGGESTIONS;
}
