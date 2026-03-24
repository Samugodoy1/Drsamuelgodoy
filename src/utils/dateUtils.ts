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
    .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

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
      return timeToMinutes(new Date(app.end_time).toTimeString().slice(0, 5));
    } else if (app.duration) {
      const startMinutes = timeToMinutes(new Date(app.start_time).toTimeString().slice(0, 5));
      return startMinutes + parseInt(app.duration);
    } else {
      // Default 60 minutes
      const startMinutes = timeToMinutes(new Date(app.start_time).toTimeString().slice(0, 5));
      return startMinutes + 60;
    }
  };

  // Check gap from start of day to first appointment
  if (sortedAppointments.length > 0) {
    const firstAppStart = timeToMinutes(new Date(sortedAppointments[0].start_time).toTimeString().slice(0, 5));
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
    const nextStart = timeToMinutes(new Date(sortedAppointments[i].start_time).toTimeString().slice(0, 5));

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
