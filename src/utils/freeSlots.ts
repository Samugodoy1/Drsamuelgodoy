const WORK_START_HOUR = 8;
const WORK_END_HOUR = 18;
const SLOT_MINUTES = 30;
const BLOCKING_STATUSES = new Set(['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'FINISHED']);

export interface FreeSlotAppointment {
  start_time: string;
  end_time: string;
  status: string;
}

/** Returns the start times (Date) of 30-min slots still free today, from now onwards. */
export function computeTodayFreeSlotTimes(
  appointments: FreeSlotAppointment[],
  now: Date = new Date(),
): Date[] {
  const busy = appointments
    .filter((a) => BLOCKING_STATUSES.has(a.status) && new Date(a.start_time).toDateString() === now.toDateString())
    .map((a) => ({ start: new Date(a.start_time).getTime(), end: new Date(a.end_time).getTime() }));

  const cursor = new Date(now);
  cursor.setSeconds(0, 0);
  const remainder = cursor.getMinutes() % SLOT_MINUTES;
  if (remainder > 0) cursor.setMinutes(cursor.getMinutes() + (SLOT_MINUTES - remainder));
  if (cursor.getHours() < WORK_START_HOUR) cursor.setHours(WORK_START_HOUR, 0, 0, 0);

  const dayEnd = new Date(now);
  dayEnd.setHours(WORK_END_HOUR, 0, 0, 0);

  const free: Date[] = [];
  while (cursor.getTime() + SLOT_MINUTES * 60000 <= dayEnd.getTime()) {
    const slotStart = cursor.getTime();
    const slotEnd = slotStart + SLOT_MINUTES * 60000;
    const overlaps = busy.some((b) => slotStart < b.end && slotEnd > b.start);
    if (!overlaps) free.push(new Date(slotStart));
    cursor.setMinutes(cursor.getMinutes() + SLOT_MINUTES);
  }
  return free;
}
