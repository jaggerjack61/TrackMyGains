const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_LABELS_PER_VISIBLE_RANGE = 5;

export const DEFAULT_CHART_VISIBLE_DAYS = 31;

type ChartLabelFormat = 'monthDay' | 'dayMonth';

type ChartDateParts = {
  day: number;
  month: number;
  timestamp: number;
};

type ScrollableChartWidthOptions = {
  visibleDays?: number;
};

type ScrollableChartLabelOptions = {
  dateFormat?: ChartLabelFormat;
  labelsPerVisibleRange?: number;
  visibleDays?: number;
};

const parseChartDate = (dateValue: string): ChartDateParts => {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateValue);

  if (dateMatch) {
    const timestamp = Date.UTC(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
    );
    const normalizedDate = new Date(timestamp);

    return {
      day: normalizedDate.getUTCDate(),
      month: normalizedDate.getUTCMonth() + 1,
      timestamp,
    };
  }

  const parsedDate = new Date(dateValue);
  const timestamp = Date.UTC(
    parsedDate.getUTCFullYear(),
    parsedDate.getUTCMonth(),
    parsedDate.getUTCDate(),
  );

  return {
    day: parsedDate.getUTCDate(),
    month: parsedDate.getUTCMonth() + 1,
    timestamp,
  };
};

const formatChartDate = (dateValue: string, dateFormat: ChartLabelFormat) => {
  const dateParts = parseChartDate(dateValue);

  if (dateFormat === 'dayMonth') {
    return `${dateParts.day}/${dateParts.month}`;
  }

  return `${dateParts.month}/${dateParts.day}`;
};

export const calculateScrollableChartWidth = (
  dates: string[],
  viewportWidth: number,
  options: ScrollableChartWidthOptions = {},
) => {
  const safeViewportWidth = Math.max(1, Math.round(viewportWidth));
  const visibleDays = Math.max(1, Math.round(options.visibleDays ?? DEFAULT_CHART_VISIBLE_DAYS));

  if (dates.length < 2) {
    return safeViewportWidth;
  }

  const timestamps = dates.map(date => parseChartDate(date).timestamp);
  const firstTimestamp = Math.min(...timestamps);
  const lastTimestamp = Math.max(...timestamps);
  const spannedDays = Math.max(
    1,
    Math.round((lastTimestamp - firstTimestamp) / MILLISECONDS_PER_DAY) + 1,
  );

  return Math.max(
    safeViewportWidth,
    Math.round((spannedDays / visibleDays) * safeViewportWidth),
  );
};

export const calculateInitialChartScrollOffset = (
  contentWidth: number,
  viewportWidth: number,
) => Math.max(0, Math.round(contentWidth - viewportWidth));

export const buildScrollableChartLabels = (
  dates: string[],
  options: ScrollableChartLabelOptions = {},
) => {
  const dateFormat = options.dateFormat ?? 'monthDay';
  const visibleDays = Math.max(1, Math.round(options.visibleDays ?? DEFAULT_CHART_VISIBLE_DAYS));
  const labelsPerVisibleRange = Math.max(
    1,
    Math.round(options.labelsPerVisibleRange ?? DEFAULT_LABELS_PER_VISIBLE_RANGE),
  );
  const labelInterval = Math.max(1, Math.ceil(visibleDays / labelsPerVisibleRange));
  let lastVisibleLabelTimestamp = Number.NEGATIVE_INFINITY;

  return dates.map((date, index) => {
    const timestamp = parseChartDate(date).timestamp;
    const isEdgeLabel = index === 0 || index === dates.length - 1;
    const isIntervalLabel = timestamp - lastVisibleLabelTimestamp >= labelInterval * MILLISECONDS_PER_DAY;

    if (!isEdgeLabel && !isIntervalLabel) {
      return '';
    }

    lastVisibleLabelTimestamp = timestamp;

    return formatChartDate(date, dateFormat);
  });
};