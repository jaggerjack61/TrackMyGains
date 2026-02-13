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

type CompoundType = 'injectable' | 'oral' | 'peptide';

const groupCycleCompoundsByType = (compounds: CycleCompound[]): Map<CompoundType, CycleCompound[]> => {
  const compoundMap = new Map<CompoundType, CycleCompound[]>();

  for (const compound of compounds) {
    const key: CompoundType =
      compound.type === 'injectable' || compound.type === 'oral' || compound.type === 'peptide'
        ? compound.type
        : 'injectable';
    const list = compoundMap.get(key);
    if (list) {
      list.push(compound);
    } else {
      compoundMap.set(key, [compound]);
    }
  }

  return compoundMap;
};

const calculateRemainingAmount = (amount: number, halfLifeHours: number, hoursSinceDose: number): number => {
  return amount * Math.pow(0.5, hoursSinceDose / halfLifeHours);
};

const toMgEquivalent = (compound: CycleCompound): number => {
  if (compound.amount_unit === 'mcg') return compound.amount / 1000;
  if (compound.amount_unit === 'iu') return compound.amount * IU_TO_MG_EQUIVALENT;
  return compound.amount;
};

const calculateActiveAmountForCompoundAtDate = (compound: CycleCompound, date: Date): number => {
  const dosingPeriodDays = compound.dosing_period;
  if (dosingPeriodDays <= 0) return 0;

  const halfLifeHours = compound.half_life_hours > 0 ? compound.half_life_hours : 24;
  const compoundStart = new Date(compound.start_date);
  const compoundEnd = new Date(compound.end_date);

  let totalActiveAmount = 0;
  const doseDate = new Date(compoundStart);
  const doseAmount = toMgEquivalent(compound);

  while (doseDate <= compoundEnd && doseDate <= date) {
    const hoursSinceDose = (date.getTime() - doseDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceDose >= 0) {
      totalActiveAmount += calculateRemainingAmount(doseAmount, halfLifeHours, hoursSinceDose);
    }

    doseDate.setDate(doseDate.getDate() + dosingPeriodDays);
  }

  return totalActiveAmount;
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
  const compoundMap = groupCycleCompoundsByType(compounds);

  const groupOrder: { type: CompoundType; name: string; colorIndex: number }[] = [
    { type: 'injectable', name: 'Injectables', colorIndex: 0 },
    { type: 'oral', name: 'Orals', colorIndex: 1 },
    { type: 'peptide', name: 'Peptides', colorIndex: 2 },
  ];

  const series: CompoundSeries[] = [];

  for (const group of groupOrder) {
    const cycleCompounds = compoundMap.get(group.type);
    if (!cycleCompounds || cycleCompounds.length === 0) continue;

    const data: DataPoint[] = dates.map(date => {
      let totalActiveAmount = 0;

      for (const compound of cycleCompounds) {
        totalActiveAmount += calculateActiveAmountForCompoundAtDate(compound, date);
      }

      return { date: date.toISOString(), value: totalActiveAmount * MG_EQUIVALENT_TO_NGDL };
    });

    series.push({
      name: group.name,
      color: defaultSeriesColors[group.colorIndex % defaultSeriesColors.length](1),
      data,
    });
  }

  return series;
};
