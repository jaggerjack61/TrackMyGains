import { CycleCompound } from './database';

interface DataPoint {
  date: string;
  value: number;
}

interface CompoundSeries {
  name: string;
  color: string;
  data: DataPoint[];
}

const IU_TO_MG_EQUIVALENT = 0.333;
const MG_EQUIVALENT_TO_NGDL = 10;

const buildPlotDates = (startDate: Date, endDate: Date, extraDays: number): Date[] => {
  const plotEndDate = new Date(endDate);
  plotEndDate.setDate(plotEndDate.getDate() + extraDays);

  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= plotEndDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

const calculateRemainingAmount = (amount: number, halfLifeHours: number, hoursSinceDose: number): number => {
  return amount * Math.pow(0.5, hoursSinceDose / halfLifeHours);
};

const toMgEquivalent = (compound: CycleCompound): number => {
  if (compound.amount_unit === 'mcg') return compound.amount / 1000;
  if (compound.amount_unit === 'iu') return compound.amount * IU_TO_MG_EQUIVALENT;
  return compound.amount;
};

const calculateActiveAmounts = (compound: CycleCompound, dates: Date[]): number[] => {
  const dosingPeriodDays = compound.dosing_period;
  if (!Number.isInteger(dosingPeriodDays) || dosingPeriodDays <= 0) {
    return dates.map(() => 0);
  }

  const halfLifeHours = Number.isFinite(compound.half_life_hours) && compound.half_life_hours > 0
    ? compound.half_life_hours
    : 24;
  const compoundStart = new Date(compound.start_date);
  const compoundEnd = new Date(compound.end_date);
  if (Number.isNaN(compoundStart.getTime()) || Number.isNaN(compoundEnd.getTime())) {
    return dates.map(() => 0);
  }

  const doseAmount = toMgEquivalent(compound);
  if (!Number.isFinite(doseAmount) || doseAmount <= 0) {
    return dates.map(() => 0);
  }

  let activeAmount = 0;
  let previousDate: Date | null = null;
  const nextDoseDate = new Date(compoundStart);

  return dates.map((date) => {
    if (previousDate) {
      const elapsedHours = (date.getTime() - previousDate.getTime()) / (1000 * 60 * 60);
      activeAmount = calculateRemainingAmount(activeAmount, halfLifeHours, elapsedHours);
    }

    while (nextDoseDate <= compoundEnd && nextDoseDate <= date) {
      const hoursSinceDose = (date.getTime() - nextDoseDate.getTime()) / (1000 * 60 * 60);
      activeAmount += calculateRemainingAmount(doseAmount, halfLifeHours, hoursSinceDose);
      nextDoseDate.setDate(nextDoseDate.getDate() + dosingPeriodDays);
    }

    previousDate = date;
    return activeAmount;
  });
};

const defaultSeriesColors = [
  (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
  (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
  (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
  (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
  (opacity = 1) => `rgba(153, 102, 255, ${opacity})`,
  (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
];

export const calculateCycleLevels = (
  compounds: CycleCompound[],
  startDate: Date,
  endDate: Date
): CompoundSeries[] => {
  const dates = buildPlotDates(startDate, endDate, 28);

  return compounds.map((compound, index) => {
    const activeAmounts = calculateActiveAmounts(compound, dates);
    const data: DataPoint[] = dates.map((date, dateIndex) => ({
      date: date.toISOString(),
      value: activeAmounts[dateIndex] * MG_EQUIVALENT_TO_NGDL,
    }));

    return {
      name: compound.name,
      color: defaultSeriesColors[index % defaultSeriesColors.length](1),
      data,
    };
  });
};
