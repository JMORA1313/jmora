export interface DailyTargets {
  bmi: number;
  bmiCategory: 'underweight' | 'healthy' | 'overweight' | 'obese';
  waterLiters: number;
  mineralBottles500ml: number;
  proteinMinG: number;
  proteinMaxG: number;
}

export function calculateDailyTargets(
  weightKg: number,
  heightCm: number,
  activityLevel: 'light' | 'moderate' | 'intense' = 'moderate'
): DailyTargets {
  const safeWeight = Math.max(30, Math.min(250, Number(weightKg) || 65));
  const safeHeightM = Math.max(1.1, Math.min(2.4, (Number(heightCm) || 170) / 100));

  const bmi = Math.round((safeWeight / (safeHeightM * safeHeightM)) * 10) / 10;
  let bmiCategory: DailyTargets['bmiCategory'] = 'healthy';
  if (bmi < 18.5) bmiCategory = 'underweight';
  else if (bmi < 25) bmiCategory = 'healthy';
  else if (bmi < 30) bmiCategory = 'overweight';
  else bmiCategory = 'obese';

  const waterFactor = activityLevel === 'intense' ? 0.045 : activityLevel === 'moderate' ? 0.038 : 0.033;
  const waterLiters = Math.round(safeWeight * waterFactor * 10) / 10;
  const mineralBottles500ml = Math.max(3, Math.round(waterLiters / 0.5));

  const proteinMinG = Math.round(safeWeight * (activityLevel === 'light' ? 1.4 : 1.6));
  const proteinMaxG = Math.round(safeWeight * (activityLevel === 'intense' ? 2.2 : 2.0));

  return {
    bmi,
    bmiCategory,
    waterLiters,
    mineralBottles500ml,
    proteinMinG,
    proteinMaxG,
  };
}
