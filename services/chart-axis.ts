export type ChartYAxis = {
  decimalPlaces: number;
  labels: string[];
  max: number;
  min: number;
  segments: number;
  step: number;
};

type ChartYAxisOptions = {
  includeZero?: boolean;
  maxSegments?: number;
  targetSegments?: number;
};

const DEFAULT_TARGET_SEGMENTS = 5;
const DEFAULT_MAX_SEGMENTS = 6;
const TRANSPARENT = 'rgba(0,0,0,0)';

const roundAxisNumber = (value: number) => Number(value.toFixed(8));

const calculateDecimalPlaces = (value: number) => {
  const formattedValue = roundAxisNumber(value).toString();
  const [, decimals = ''] = formattedValue.split('.');

  return decimals.length;
};

const calculateNiceStep = (rawStep: number) => {
  if (!Number.isFinite(rawStep) || rawStep <= 0) return 1;

  const exponent = Math.floor(Math.log10(rawStep));
  const magnitude = 10 ** exponent;
  const fraction = rawStep / magnitude;

  if (fraction <= 1) return magnitude;
  if (fraction <= 2) return 2 * magnitude;
  if (fraction <= 5) return 5 * magnitude;

  return 10 * magnitude;
};

const calculateBounds = (minValue: number, maxValue: number, step: number, includeZero: boolean) => {
  const min = includeZero && minValue >= 0 ? 0 : Math.floor(minValue / step) * step;
  const max = Math.ceil(maxValue / step) * step;

  return {
    max: roundAxisNumber(max),
    min: roundAxisNumber(min),
  };
};

export const formatChartAxisValue = (value: number) => {
  const roundedValue = roundAxisNumber(value);

  if (Number.isInteger(roundedValue)) return roundedValue.toString();

  return roundedValue.toFixed(Math.min(2, calculateDecimalPlaces(roundedValue)));
};

export const buildChartYAxis = (
  values: number[],
  options: ChartYAxisOptions = {},
): ChartYAxis => {
  const finiteValues = values.filter(Number.isFinite);
  const targetSegments = Math.max(2, Math.round(options.targetSegments ?? DEFAULT_TARGET_SEGMENTS));
  const maxSegments = Math.max(targetSegments, Math.round(options.maxSegments ?? DEFAULT_MAX_SEGMENTS));
  const rawMin = finiteValues.length ? Math.min(...finiteValues) : 0;
  const rawMax = finiteValues.length ? Math.max(...finiteValues) : 1;
  const includeZero = options.includeZero === true && rawMin >= 0;
  const anchoredMin = includeZero ? 0 : rawMin;
  const measuredRange = rawMax - anchoredMin;
  const rawRange = measuredRange > 0 ? measuredRange : Math.max(Math.abs(rawMax || 1) * 0.1, 1);
  let step = calculateNiceStep(rawRange / targetSegments);
  let bounds = calculateBounds(anchoredMin, rawMax, step, includeZero);
  let segments = Math.round((bounds.max - bounds.min) / step);

  while (segments > maxSegments) {
    step = calculateNiceStep(step * 1.01);
    bounds = calculateBounds(anchoredMin, rawMax, step, includeZero);
    segments = Math.round((bounds.max - bounds.min) / step);
  }

  if (segments < 1) {
    segments = targetSegments;
    bounds.max = roundAxisNumber(bounds.min + step * segments);
  }

  const labels = Array.from({ length: segments + 1 }, (_, index) => (
    formatChartAxisValue(bounds.min + step * index)
  ));

  return {
    decimalPlaces: calculateDecimalPlaces(step),
    labels,
    max: bounds.max,
    min: bounds.min,
    segments,
    step,
  };
};

export const buildYAxisBoundsDataset = (axis: ChartYAxis, pointsCount: number) => {
  const boundsPointCount = Math.max(2, pointsCount);

  return {
    color: () => TRANSPARENT,
    data: Array.from({ length: boundsPointCount }, (_, index) => (
      index === boundsPointCount - 1 ? axis.max : axis.min
    )),
    strokeWidth: 0,
    withDots: false,
  };
};