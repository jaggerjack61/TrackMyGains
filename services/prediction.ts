export interface ExerciseLogLike {
  date: string;
  weight: number;
  weight_unit: 'kg' | 'lbs';
  sets: number;
  reps: number;
}

export interface PredictedLog {
  weight: string;
  sets: string;
  reps: string;
  unit: 'kg' | 'lbs';
}

const LBS_PER_KG = 2.20462;

const regressNext = (values: number[]): number => {
  if (values.length === 0) return 0;
  if (values.length < 3) return values[values.length - 1];

  const n = values.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  values.forEach((y, x) => {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  });

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return values[values.length - 1];

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return intercept + slope * n;
};

export const predictNextLog = (logs: ExerciseLogLike[]): PredictedLog | null => {
  if (logs.length === 0) return null;

  const sorted = [...logs].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const unit = sorted[sorted.length - 1].weight_unit;
  const weights = sorted.map((l) =>
    l.weight_unit === unit
      ? l.weight
      : unit === 'kg'
        ? l.weight / LBS_PER_KG
        : l.weight * LBS_PER_KG
  );

  const weight = Math.max(regressNext(weights), 0);
  const sets = Math.max(Math.round(regressNext(sorted.map((l) => l.sets))), 1);
  const reps = Math.max(Math.round(regressNext(sorted.map((l) => l.reps))), 1);

  return {
    weight: (Math.round(weight * 10) / 10).toString(),
    sets: sets.toString(),
    reps: reps.toString(),
    unit,
  };
};
