import { buildScrollableChartLabels, calculateScrollableChartWidth } from './chart-timeline';

const BASE_VISIBLE_LABELS = 5;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 4;

type TouchPoint = {
  pageX: number;
  pageY: number;
};

export const buildCycleChartLabels = (dates: string[], zoomLevel: number) => {
  const safeZoomLevel = Math.max(1, zoomLevel);

  return buildScrollableChartLabels(dates, {
    labelsPerVisibleRange: Math.round(BASE_VISIBLE_LABELS * safeZoomLevel),
  });
};

export const calculateCycleChartWidth = (
  dates: string[],
  viewportWidth: number,
  zoomLevel: number,
) => {
  const safeZoomLevel = Math.max(MIN_ZOOM_LEVEL, zoomLevel);

  return Math.round(calculateScrollableChartWidth(dates, viewportWidth) * safeZoomLevel);
};

export const calculateTouchDistance = (
  firstTouch: TouchPoint,
  secondTouch: TouchPoint,
) => {
  const deltaX = secondTouch.pageX - firstTouch.pageX;
  const deltaY = secondTouch.pageY - firstTouch.pageY;

  return Math.round(Math.hypot(deltaX, deltaY));
};

export const getPinchAdjustedZoom = (baseZoom: number, pinchScale: number) => {
  const nextZoom = baseZoom * pinchScale;

  return Number(
    Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, nextZoom)).toFixed(2),
  );
};