export const formatDate = (dateStr: string | undefined | null) => {
  if (!dateStr) return '';
  
  // Handle YYYY-MM-DD or ISO strings starting with YYYY-MM-DD
  // This is the most common format for DATE columns in Postgres
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const datePart = dateStr.split(/[T\s]/)[0];
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

export const ACADEMY_TIME_ZONE = 'America/Sao_Paulo';

const LOCAL_DATE_TIME_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
const EXPLICIT_TIMEZONE_RE = /(Z|[+-]\d{2}:?\d{2})$/i;
const zonedFormatterCache = new Map<string, Intl.DateTimeFormat>();

type LocalDateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export const padDatePart = (value: number) => String(value).padStart(2, '0');

export const formatDateInputValue = (date: Date) => {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

export const formatTimeInputValue = (date: Date) => {
  return `${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
};

const getZonedFormatter = (timeZone: string) => {
  let formatter = zonedFormatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    zonedFormatterCache.set(timeZone, formatter);
  }
  return formatter;
};

const partsToRecord = (parts: Intl.DateTimeFormatPart[]) => {
  return parts.reduce<Record<string, string>>((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
};

const getZonedDateTimeParts = (date: Date, timeZone = ACADEMY_TIME_ZONE): LocalDateTimeParts => {
  const parts = partsToRecord(getZonedFormatter(timeZone).formatToParts(date));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
};

const parseLocalDateTimeParts = (value: string): LocalDateTimeParts | null => {
  const match = value.trim().match(LOCAL_DATE_TIME_RE);
  if (!match) return null;

  const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
  const parts = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
  };

  if (
    parts.month < 1 || parts.month > 12 ||
    parts.day < 1 || parts.day > 31 ||
    parts.hour < 0 || parts.hour > 23 ||
    parts.minute < 0 || parts.minute > 59 ||
    parts.second < 0 || parts.second > 59
  ) {
    return null;
  }

  return parts;
};

const getTimeZoneOffsetMs = (date: Date, timeZone = ACADEMY_TIME_ZONE) => {
  const parts = getZonedDateTimeParts(date, timeZone);
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  ) - date.getTime();
};

const sameWallClock = (a: LocalDateTimeParts, b: LocalDateTimeParts) => (
  a.year === b.year &&
  a.month === b.month &&
  a.day === b.day &&
  a.hour === b.hour &&
  a.minute === b.minute &&
  a.second === b.second
);

const createAcademyDateFromWallClock = (
  parts: LocalDateTimeParts,
  timeZone = ACADEMY_TIME_ZONE
) => {
  const utcGuess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second
  );

  let instant = new Date(utcGuess - getTimeZoneOffsetMs(new Date(utcGuess), timeZone));
  instant = new Date(utcGuess - getTimeZoneOffsetMs(instant, timeZone));

  return Number.isNaN(instant.getTime()) || !sameWallClock(getZonedDateTimeParts(instant, timeZone), parts)
    ? null
    : instant;
};

export const formatAppointmentDateInputValue = (date: Date) => {
  const parts = getZonedDateTimeParts(date);
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
};

export const formatAppointmentTimeInputValue = (date: Date) => {
  const parts = getZonedDateTimeParts(date);
  return `${padDatePart(parts.hour)}:${padDatePart(parts.minute)}`;
};

export const createLocalDateTime = (date: string, time: string, seconds = '00') => {
  const cleanDate = String(date || '').trim();
  const cleanTime = String(time || '').trim();
  if (!cleanDate || !cleanTime) return '';
  const [hours = '00', minutes = '00'] = cleanTime.split(':');
  return `${cleanDate} ${padDatePart(Number(hours) || 0)}:${padDatePart(Number(minutes) || 0)}:${seconds}`;
};

export const parseAppointmentDateTime = (value: string | undefined | null): Date | null => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  if (EXPLICIT_TIMEZONE_RE.test(raw)) {
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const match = raw.match(LOCAL_DATE_TIME_RE);
  if (match) {
    const parts = parseLocalDateTimeParts(raw);
    return parts ? createAcademyDateFromWallClock(parts) : null;
  }

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const addMinutesToLocalDateTime = (value: string, minutes: number) => {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return '';
  const shifted = new Date(parsed.getTime() + minutes * 60000);
  return `${formatAppointmentDateInputValue(shifted)} ${formatAppointmentTimeInputValue(shifted)}:00`;
};

export const formatAppointmentDate = (value: string | undefined | null, options?: Intl.DateTimeFormatOptions) => {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return '';
  return parsed.toLocaleDateString('pt-BR', { ...options, timeZone: ACADEMY_TIME_ZONE });
};

export const formatAppointmentTime = (value: string | undefined | null) => {
  const parsed = parseAppointmentDateTime(value);
  if (!parsed) return '--:--';
  return parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: ACADEMY_TIME_ZONE });
};

export const isSameAppointmentDay = (value: string | undefined | null, date: Date) => {
  const parsed = parseAppointmentDateTime(value);
  return !!parsed && formatAppointmentDateInputValue(parsed) === formatDateInputValue(date);
};

export const getAppointmentTime = (value: string | undefined | null) => {
  const parsed = parseAppointmentDateTime(value);
  return parsed ? parsed.getTime() : 0;
};

export const isOverdue = (dateStr: string | undefined | null) => {
  if (!dateStr) return false;
  const today = new Date().toLocaleDateString('en-CA');
  const datePart = dateStr.split('T')[0];
  return datePart < today;
};

// Smart scheduling suggestion system
export interface FreeSlot {
  start: string; // HH:MM format
  end: string;   // HH:MM format
  duration: number; // minutes
}

export const getFreeSlots = (
  appointments: any[],
  startOfDay: string = '08:00',
  endOfDay: string = '18:00',
  fromTime?: string  // when provided, only return slots with remaining time from this point
): FreeSlot[] => {
  // Sort appointments passed by caller (caller can pass a specific day)
  const sortedAppointments = appointments
    .filter(app => app.status !== 'CANCELLED') // Exclude cancelled appointments
    .sort((a, b) => getAppointmentTime(a.start_time) - getAppointmentTime(b.start_time));

  const freeSlots: FreeSlot[] = [];

  // Convert time strings to minutes since midnight
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const startOfDayMinutes = timeToMinutes(startOfDay);
  const endOfDayMinutes = timeToMinutes(endOfDay);

  let currentTime = startOfDayMinutes;

  // Function to get appointment end time
  const getAppointmentEnd = (app: any): number => {
    if (app.end_time) {
      return timeToMinutes(formatAppointmentTime(app.end_time));
    } else if (app.duration) {
      const startMinutes = timeToMinutes(formatAppointmentTime(app.start_time));
      return startMinutes + parseInt(app.duration);
    } else {
      // Default 60 minutes
      const startMinutes = timeToMinutes(formatAppointmentTime(app.start_time));
      return startMinutes + 60;
    }
  };

  // Check gap from start of day to first appointment
  if (sortedAppointments.length > 0) {
    const firstAppStart = timeToMinutes(formatAppointmentTime(sortedAppointments[0].start_time));
    if (firstAppStart > currentTime) {
      freeSlots.push({
        start: minutesToTime(currentTime),
        end: minutesToTime(firstAppStart),
        duration: firstAppStart - currentTime
      });
    }
    currentTime = getAppointmentEnd(sortedAppointments[0]);
  }

  // Check gaps between appointments
  for (let i = 1; i < sortedAppointments.length; i++) {
    const prevEnd = getAppointmentEnd(sortedAppointments[i-1]);
    const nextStart = timeToMinutes(formatAppointmentTime(sortedAppointments[i].start_time));

    if (nextStart > prevEnd) {
      freeSlots.push({
        start: minutesToTime(prevEnd),
        end: minutesToTime(nextStart),
        duration: nextStart - prevEnd
      });
    }
  }

  // Check gap from last appointment to end of day
  if (sortedAppointments.length > 0) {
    const lastAppEnd = getAppointmentEnd(sortedAppointments[sortedAppointments.length - 1]);
    if (endOfDayMinutes > lastAppEnd) {
      freeSlots.push({
        start: minutesToTime(lastAppEnd),
        end: minutesToTime(endOfDayMinutes),
        duration: endOfDayMinutes - lastAppEnd
      });
    }
  } else {
    // No appointments today, whole day is free
    freeSlots.push({
      start: startOfDay,
      end: endOfDay,
      duration: endOfDayMinutes - startOfDayMinutes
    });
  }

  // Filter out slots shorter than 15 minutes (too small for suggestions)
  const rawSlots = freeSlots.filter(slot => slot.duration >= 15);

  if (!fromTime) return rawSlots;

  // Trim / discard slots that are fully or partially in the past
  const fromMinutes = timeToMinutes(fromTime);
  return rawSlots
    .map(slot => {
      const slotEnd = timeToMinutes(slot.end);
      if (slotEnd <= fromMinutes) return null; // entirely in the past
      const slotStart = timeToMinutes(slot.start);
      const effectiveStart = Math.max(slotStart, fromMinutes);
      const effectiveDuration = slotEnd - effectiveStart;
      if (effectiveDuration < 15) return null;
      return {
        start: minutesToTime(effectiveStart),
        end: slot.end,
        duration: effectiveDuration
      };
    })
    .filter((s): s is FreeSlot => s !== null);
};

export const getSuggestion = (duration: number): string => {
  if (duration <= 30) return "Avaliação";
  if (duration <= 60) return "Profilaxia";
  if (duration <= 90) return "Restauração";
  return "Procedimento longo";
};
