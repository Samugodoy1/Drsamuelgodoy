export const WEEK_HOUR_HEIGHT = 60;
export const WEEK_SNAP_MINUTES = 15;

export function snapWeekMinutes(minutes: number): number {
  return Math.round(minutes / WEEK_SNAP_MINUTES) * WEEK_SNAP_MINUTES;
}

export function getWeekMinutesFromClientY(
  clientY: number,
  columnTop: number,
  earliestHour: number,
  latestHour: number
): number {
  const relativeY = clientY - columnTop;
  const minMinutes = earliestHour * 60;
  const maxMinutes = (latestHour + 1) * 60 - WEEK_SNAP_MINUTES;
  const rawMinutes = minMinutes + (relativeY / WEEK_HOUR_HEIGHT) * 60;
  return snapWeekMinutes(Math.min(maxMinutes, Math.max(minMinutes, rawMinutes)));
}

export function minutesToWeekTop(minutes: number, earliestHour: number): number {
  return ((minutes - earliestHour * 60) / 60) * WEEK_HOUR_HEIGHT;
}

export function durationToWeekHeight(durationMinutes: number): number {
  return Math.max(24, (durationMinutes / 60) * WEEK_HOUR_HEIGHT);
}

export function minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export interface WeekAppointmentLayout<T> {
  app: T;
  top: number;
  height: number;
  column: number;
  totalColumns: number;
}

export function layoutWeekDayAppointments<T extends { id: number; start_time: string; end_time: string }>(
  appointments: T[],
  earliestHour: number
): Array<WeekAppointmentLayout<T>> {
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  );

  const getStart = (a: T) => new Date(a.start_time).getTime();
  const getEnd = (a: T) => new Date(a.end_time).getTime();

  const getTop = (a: T) => {
    const d = new Date(a.start_time);
    const minutes = d.getHours() * 60 + d.getMinutes();
    return minutesToWeekTop(minutes, earliestHour);
  };

  const getHeight = (a: T) => {
    const mins = Math.max(1, Math.round((getEnd(a) - getStart(a)) / 60000));
    return durationToWeekHeight(mins);
  };

  const clusters: T[][] = [];
  for (const app of sorted) {
    let added = false;
    for (const cluster of clusters) {
      const overlaps = cluster.some(
        existing => getStart(app) < getEnd(existing) && getEnd(app) > getStart(existing)
      );
      if (overlaps) {
        cluster.push(app);
        added = true;
        break;
      }
    }
    if (!added) clusters.push([app]);
  }

  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const overlap = clusters[i].some(appA =>
          clusters[j].some(appB => getStart(appA) < getEnd(appB) && getEnd(appA) > getStart(appB))
        );
        if (overlap) {
          const mergedApps = [...clusters[i]];
          for (const app of clusters[j]) {
            if (!mergedApps.includes(app)) mergedApps.push(app);
          }
          clusters[i] = mergedApps;
          clusters.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  const layouts: Array<WeekAppointmentLayout<T>> = [];

  for (const cluster of clusters) {
    const clusterSorted = [...cluster].sort((a, b) => getStart(a) - getStart(b));
    const columns: T[][] = [];

    for (const app of clusterSorted) {
      let placed = false;
      for (const col of columns) {
        const last = col[col.length - 1];
        if (getStart(app) >= getEnd(last)) {
          col.push(app);
          placed = true;
          break;
        }
      }
      if (!placed) columns.push([app]);
    }

    const totalColumns = columns.length;
    columns.forEach((col, colIdx) => {
      col.forEach(app => {
        layouts.push({
          app,
          top: getTop(app),
          height: getHeight(app),
          column: colIdx,
          totalColumns,
        });
      });
    });
  }

  return layouts;
}

export function getWeekHourRange(appointments: Array<{ start_time: string; end_time: string }>) {
  let earliestHour = 8;
  let latestHour = 18;

  if (appointments.length > 0) {
    appointments.forEach(a => {
      const start = new Date(a.start_time);
      const end = new Date(a.end_time);
      earliestHour = Math.min(earliestHour, start.getHours());
      latestHour = Math.max(latestHour, end.getHours() + (end.getMinutes() > 0 || end.getSeconds() > 0 ? 1 : 0));
    });
    earliestHour = Math.max(0, Math.min(8, earliestHour - 1));
    latestHour = Math.min(23, Math.max(18, latestHour + 1));
  }

  return { earliestHour, latestHour };
}
