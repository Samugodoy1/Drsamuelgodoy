export const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  
  // Handle YYYY-MM-DD or ISO strings starting with YYYY-MM-DD
  // This is the most common format for DATE columns in Postgres
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  
  // Fallback to UTC methods for any date to avoid local timezone shifts
  // This ensures that "2026-03-13T00:00:00.000Z" always shows as "13/03/2026"
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  
  return `${day}/${month}/${year}`;
};

export const isOverdue = (dateStr: string | undefined | null) => {
  if (!dateStr) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const datePart = dateStr.split('T')[0];
  return datePart < today;
};
