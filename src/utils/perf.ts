const EMPTY_LIST: readonly unknown[] = Object.freeze([]);

export function emptyList<T>(): T[] {
  return EMPTY_LIST as T[];
}

export function indexByPatientId<T extends { patient_id?: number | null }>(
  items: T[],
): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const id = Number(item.patient_id);
    if (!Number.isFinite(id)) continue;
    const list = map.get(id);
    if (list) list.push(item);
    else map.set(id, [item]);
  }
  return map;
}

function entityToken(item: Record<string, unknown>): string {
  return [
    item.id ?? '',
    item.status ?? '',
    item.start_time ?? '',
    item.end_time ?? '',
    item.updated_at ?? '',
    item.created_at ?? '',
    item.amount ?? '',
    item.name ?? '',
    item.phone ?? '',
    item.photo_url ?? '',
    item.date ?? '',
    item.payment_date ?? '',
    item.due_date ?? '',
    Array.isArray(item.evolution) ? item.evolution.length : '',
    Array.isArray(item.treatmentPlan) ? item.treatmentPlan.length : '',
    Array.isArray(item.files) ? item.files.length : '',
    item.odontogram && typeof item.odontogram === 'object'
      ? Object.keys(item.odontogram as object).length
      : '',
  ].join(':');
}

/** Cheap fingerprint so we can skip React state updates when API data is unchanged. */
export function clinicListFingerprint(items: unknown): string {
  if (!Array.isArray(items)) {
    try {
      return JSON.stringify(items) ?? '';
    } catch {
      return String(items);
    }
  }

  let hash = items.length;
  const tokens: string[] = new Array(items.length);
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const token =
      item && typeof item === 'object'
        ? entityToken(item as Record<string, unknown>)
        : String(item);
    tokens[i] = token;
    hash = (Math.imul(hash, 33) + token.length) >>> 0;
  }
  return `${items.length}:${hash}:${tokens.join('|')}`;
}

export function replaceIfChanged<T>(prev: T, next: T): T {
  if (Object.is(prev, next)) return prev;
  if (Array.isArray(prev) && Array.isArray(next)) {
    return clinicListFingerprint(prev) === clinicListFingerprint(next) ? prev : next;
  }
  if (prev && next && typeof prev === 'object' && typeof next === 'object') {
    try {
      return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
    } catch {
      return next;
    }
  }
  return next;
}

export async function writeXlsxSheet(
  rows: Record<string, unknown>[],
  sheetName: string,
  fileName: string,
) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

export const PATIENT_LIST_PAGE_SIZE = 40;
