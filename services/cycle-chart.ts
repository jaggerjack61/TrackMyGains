const BASE_VISIBLE_LABELS = 6;
const BASE_POINT_WIDTH = 14;
const MIN_ZOOM_LEVEL = 1;
const MAX_ZOOM_LEVEL = 4;

type TouchPoint = {
  pageX: number;
  pageY: number;
};

const formatShortDate = (isoDate: string) => {
  const date = new Date(isoDate);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

export const buildCycleChartLabels = (dates: string[], zoomLevel: number) => {
  const safeZoomLevel = Math.max(1, zoomLevel);
  const visibleLabelTarget = Math.max(
    BASE_VISIBLE_LABELS,
    Math.round(BASE_VISIBLE_LABELS * safeZoomLevel),
  );
  const labelInterval = Math.max(1, Math.floor(dates.length / visibleLabelTarget));

  return dates.map((isoDate, index) => {
    const isVisibleLabel = index % labelInterval === 0 || index === dates.length - 1;
    return isVisibleLabel ? formatShortDate(isoDate) : '';
  });
};

export const calculateCycleChartWidth = (
  dataPointsCount: number,
  viewportWidth: number,
  zoomLevel: number,
) => {
  const safeZoomLevel = Math.max(MIN_ZOOM_LEVEL, zoomLevel);
  const pointWidth = BASE_POINT_WIDTH * safeZoomLevel;

  return Math.max(viewportWidth, Math.round(dataPointsCount * pointWidth));
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