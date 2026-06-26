/** Helpers de formatação de datas — somente apresentação. */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function pluralDays(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n} dia${n === 1 ? '' : 's'}`;
}

export function todayIso(): string {
  return new Date().toISOString().split('T')[0];
}
