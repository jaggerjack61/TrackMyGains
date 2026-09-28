const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type CycleStatus = 'upcoming' | 'active' | 'completed';

export interface CycleProgress {
  status: CycleStatus;
  /** 0–1 share of the cycle that has elapsed. */
  progress: number;
  currentWeek: number;
  totalWeeks: number;
}

export function getCycleProgress(startDate: string, endDate: string, now = new Date()): CycleProgress {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.round((end - start) / MS_PER_DAY));
  const elapsedDays = Math.floor((now.getTime() - start) / MS_PER_DAY);
  const totalWeeks = Math.max(1, Math.ceil(totalDays / 7));

  const status: CycleStatus = now.getTime() < start ? 'upcoming' : now.getTime() > end ? 'completed' : 'active';
  const progress = Math.min(1, Math.max(0, elapsedDays / totalDays));
  const currentWeek = Math.min(totalWeeks, Math.max(1, Math.floor(elapsedDays / 7) + 1));

  return { status, progress, currentWeek, totalWeeks };
}

export const formatDateRange = (startDate: string, endDate: string) => {
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${new Date(startDate).toLocaleDateString(undefined, options)} – ${new Date(endDate).toLocaleDateString(undefined, options)}`;
};
