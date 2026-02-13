import { CycleCompound } from './database';

interface DataPoint {
  date: string; // ISO string
  value: number;
}

interface CompoundSeries {
  name: string;
  color: string;
  data: DataPoint[];
}

export const calculateCycleLevels = (
  compounds: CycleCompound[],
  startDate: Date,
  endDate: Date
): CompoundSeries[] => {
  // Generate array of dates from start to end + 4 weeks
  const plotEndDate = new Date(endDate);
  plotEndDate.setDate(plotEndDate.getDate() + 28); // +4 weeks to see clearance

  const dates: Date[] = [];
  let currentDate = new Date(startDate);
  while (currentDate <= plotEndDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group compounds by name (or compound_id if we want to treat same compound different esters differently? 
  // But usually we group by compound name or display name)
  // Actually, we should calculate per CycleCompound entry but if multiple entries use the same compound (e.g. front load), they should be summed.
  // Let's group by name for the chart legend.
  
  const compoundMap = new Map<string, CycleCompound[]>();
  compounds.forEach(c => {
    const key = c.name;
    if (!compoundMap.has(key)) {
      compoundMap.set(key, []);
    }
    compoundMap.get(key)!.push(c);
  });

  const series: CompoundSeries[] = [];
  const colors = [
    (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
    (opacity = 1) => `rgba(54, 162, 235, ${opacity})`,
    (opacity = 1) => `rgba(255, 206, 86, ${opacity})`,
    (opacity = 1) => `rgba(75, 192, 192, ${opacity})`,
    (opacity = 1) => `rgba(153, 102, 255, ${opacity})`,
    (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
  ];
  
  let colorIndex = 0;

  compoundMap.forEach((cycleCompounds, name) => {
    // Need half-life. It's not in CycleCompound directly, but we can fetch it or join it.
    // Wait, CycleCompound doesn't have half_life_hours. I need to fetch it or update the query.
    // The query in getCycleCompounds returns all columns from cycle_compounds.
    // I should update getCycleCompounds to join with compounds table to get half_life_hours.
    
    // For now, assuming I update the query.
    
    const dataPoints: DataPoint[] = dates.map(date => {
      let totalActiveAmount = 0;
      
      cycleCompounds.forEach(c => {
        const halfLifeHours = c.half_life_hours;
        
        // Calculate doses administered up to this date
        const cStart = new Date(c.start_date);
        const cEnd = new Date(c.end_date);
        const dosingPeriod = c.dosing_period;
        
        // Iterate doses
        let doseDate = new Date(cStart);
        while (doseDate <= cEnd && doseDate <= date) {
          const hoursSinceDose = (date.getTime() - doseDate.getTime()) / (1000 * 60 * 60);
          if (hoursSinceDose >= 0) {
            const remaining = c.amount * Math.pow(0.5, hoursSinceDose / halfLifeHours);
            totalActiveAmount += remaining;
          }
          
          doseDate.setDate(doseDate.getDate() + dosingPeriod);
        }
      });
      
      return {
        date: date.toISOString(),
        value: totalActiveAmount
      };
    });

    series.push({
      name,
      color: colors[colorIndex % colors.length](1),
      data: dataPoints
    });
    colorIndex++;
  });

  return series;
};
