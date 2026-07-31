const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const formatLocalDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const parseLocalDateKey = (value: string) => {
  const match = DATE_KEY_PATTERN.exec(value);
  if (!match) return new Date(value);
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const day = Number(match[3]);
  const parsed = new Date(year, monthIndex, day);
  return parsed.getFullYear() === year
    && parsed.getMonth() === monthIndex
    && parsed.getDate() === day
    ? parsed
    : new Date(Number.NaN);
};
