import type {
  BilingualText,
  Exercise,
  GeneratedNutritionPlan,
  GeneratedPlan,
  GeneratedWorkoutDay,
  OnboardingProfile,
} from '../types/jmora';

const GOAL_CALORIE_DELTA: Record<OnboardingProfile['goal'], number> = {
  'fat-loss': -420,
  'muscle-gain': 320,
  fitness: 0,
  'glute-growth': 180,
  strength: 220,
  wellness: 0,
};

const GOAL_PROTEIN_PER_KG: Record<OnboardingProfile['goal'], number> = {
  'fat-loss': 2.0,
  'muscle-gain': 2.1,
  fitness: 1.7,
  'glute-growth': 1.9,
  strength: 2.0,
  wellness: 1.5,
};

export function calculateDailyTargets(profile: OnboardingProfile): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  const baseBmr =
    10 * profile.weightKg +
    6.25 * profile.heightCm -
    5 * profile.age +
    (profile.gender === 'male' ? 5 : -161);

  const activityMultiplier =
    profile.daysPerWeek >= 5 ? 1.58 : profile.daysPerWeek >= 3 ? 1.44 : 1.3;

  const tdee = Math.round(baseBmr * activityMultiplier);
  const rawCalories = tdee + GOAL_CALORIE_DELTA[profile.goal];
  const minFloor = profile.gender === 'female' ? 1350 : 1600;
  const calories = Math.max(minFloor, Math.round(rawCalories / 10) * 10);

  const proteinG = Math.round(profile.weightKg * GOAL_PROTEIN_PER_KG[profile.goal]);
  const fatG = Math.round((calories * 0.27) / 9);
  const remainingCalories = Math.max(200, calories - proteinG * 4 - fatG * 9);
  const carbsG = Math.round(remainingCalories / 4);

  return { calories, proteinG, carbsG, fatG };
}

function buildMealPlan(profile: OnboardingProfile): GeneratedNutritionPlan | null {
  if (!profile.wantsDiet) return null;
  const targets = calculateDailyTargets(profile);
  const isPlantBased =
    profile.dietPreference === 'vegetarian' || profile.dietPreference === 'vegan';

  const breakfastDesc: BilingualText = isPlantBased
    ? {
        fa: 'جو دوسر پخته با شیر بادام، دانه چیا، کره بادام‌زمینی طبیعی و پروتئین گیاهی',
        en: 'Rolled oats cooked in almond milk with chia seeds, natural peanut butter, and plant protein',
      }
    : {
        fa: 'املت ۳ تخم‌مرغ کامل و سفیده با نان سنگک یا تست سبوس‌دار و آووکادو',
        en: '3-egg & egg-white omelet with whole-grain sourdough toast and sliced avocado',
      };

  const lunchDesc: BilingualText = isPlantBased
    ? {
        fa: 'کاسه کینوا، عدس پخته، توفو گریل‌شده، سبزیجات بخارپز و سس ارده لیمو',
        en: 'Quinoa bowl with braised lentils, grilled tofu, steamed greens, and lemon-tahini dressing',
      }
    : {
        fa: 'سینه مرغ یا فیله ماهی گریل‌شده با برنج کته قهوه‌ای و سالاد فصل با روغن زیتون',
        en: 'Grilled chicken breast or salmon fillet with steamed basmati/brown rice and olive-oil salad',
      };

  const snackDesc: BilingualText =
    profile.dietPreference === 'vegan'
      ? {
          fa: 'اسموتی موز، توت، شیر سویا و یک مشت بادام خام',
          en: 'Banana, berry & soy-protein smoothie with a handful of raw almonds',
        }
      : {
          fa: 'ماست یونانی کم‌چرب همراه با توت تازه، گردو و کمی عسل طبیعی',
          en: 'Greek yogurt with fresh berries, walnuts, and a drizzle of raw honey',
        };

  const dinnerDesc: BilingualText = isPlantBased
    ? {
        fa: 'خوراک نخود و اسفناج با سیب‌زمینی تنوری و دانه کنجد',
        en: 'Spiced chickpea & spinach stew with roasted sweet potato and toasted sesame',
      }
    : {
        fa: 'فیله بوقلمون یا گوشت لخم با سیب‌زمینی تنوری و بروکلی گریل',
        en: 'Lean turkey or sirloin steak with oven-roasted sweet potato and charred broccoli',
      };

  return {
    ...targets,
    meals: [
      {
        name: { fa: 'صبحانه انرژی‌بخش', en: 'Morning Fuel' },
        calories: Math.round(targets.calories * 0.25),
        description: breakfastDesc,
      },
      {
        name: { fa: 'ناهار اصلی', en: 'Midday Performance' },
        calories: Math.round(targets.calories * 0.35),
        description: lunchDesc,
      },
      {
        name: { fa: 'میان‌وعده قبل/بعد تمرین', en: 'Pre / Post Training' },
        calories: Math.round(targets.calories * 0.15),
        description: snackDesc,
      },
      {
        name: { fa: 'شام ریکاوری', en: 'Evening Recovery' },
        calories: Math.round(targets.calories * 0.25),
        description: dinnerDesc,
      },
    ],
  };
}

function isExerciseSafe(ex: Exercise, injuries: string[]): boolean {
  if (injuries.length === 0 || injuries.includes('none')) return true;
  if (injuries.includes('knee') && (ex.muscleId === 'quads' || ex.id === 'ex-barbell-squat')) {
    return ex.equipment === 'bodyweight' || ex.id === 'ex-glute-bridge';
  }
  if (injuries.includes('lower-back') && (ex.muscleId === 'lower-back' || ex.id === 'ex-deadlift')) {
    return false;
  }
  if (injuries.includes('shoulder') && ex.muscleId === 'shoulders' && ex.equipment === 'barbell') {
    return false;
  }
  return true;
}

const DAY_TEMPLATES: {
  focus: BilingualText;
  muscles: string[];
}[] = [
  {
    focus: { fa: 'بالاتنه فشار و سینه', en: 'Upper Push & Chest' },
    muscles: ['chest', 'shoulders', 'triceps', 'abs'],
  },
  {
    focus: { fa: 'پایین‌تنه و سرین', en: 'Lower Body & Glutes' },
    muscles: ['glutes', 'quads', 'hamstrings', 'calves'],
  },
  {
    focus: { fa: 'پشت، زیربغل و جلو بازو', en: 'Back, Lats & Biceps' },
    muscles: ['lats', 'traps', 'biceps', 'lower-back'],
  },
  {
    focus: { fa: 'فرم‌دهی سرین و همسترینگ', en: 'Glute & Posterior Focus' },
    muscles: ['glutes', 'hamstrings', 'abs', 'calves'],
  },
  {
    focus: { fa: 'شانه، بازو و میان‌تنه', en: 'Shoulders, Arms & Core' },
    muscles: ['shoulders', 'biceps', 'triceps', 'abs'],
  },
  {
    focus: { fa: 'فول‌بادی و استقامت', en: 'Full Body Conditioning' },
    muscles: ['chest', 'lats', 'quads', 'glutes'],
  },
];

export function generatePersonalizedPlan(
  profile: OnboardingProfile,
  allExercises: Exercise[]
): GeneratedPlan {
  const days = Math.min(6, Math.max(2, profile.daysPerWeek));
  const allowedEquipment = new Set(
    profile.equipment.length > 0
      ? [...profile.equipment, 'bodyweight']
      : profile.location === 'home'
        ? ['bodyweight', 'dumbbell']
        : ['bodyweight', 'dumbbell', 'barbell', 'machine']
  );

  const safePool = allExercises.filter((ex) => {
    const locationMatch = ex.location.includes(profile.location);
    const eqMatch = allowedEquipment.has(ex.equipment);
    const injuryMatch = isExerciseSafe(ex, profile.injuries);
    const levelMatch =
      profile.level === 'pro'
        ? true
        : profile.level === 'intermediate'
          ? ex.level !== 'pro'
          : ex.level === 'beginner';
    return locationMatch && eqMatch && injuryMatch && levelMatch;
  });

  const fallbackPool =
    safePool.length >= 4
      ? safePool
      : allExercises.filter((ex) => isExerciseSafe(ex, profile.injuries));

  const weeklyWorkout: GeneratedWorkoutDay[] = [];

  for (let i = 0; i < days; i++) {
    const template =
      profile.goal === 'glute-growth' && i % 2 === 1
        ? DAY_TEMPLATES[3]
        : DAY_TEMPLATES[i % DAY_TEMPLATES.length];

    const picked: Exercise[] = [];
    for (const mId of template.muscles) {
      const match =
        fallbackPool.find((ex) => ex.muscleId === mId && !picked.includes(ex)) ||
        allExercises.find((ex) => ex.muscleId === mId && isExerciseSafe(ex, profile.injuries));
      if (match) picked.push(match);
    }

    const maxExercises = profile.sessionMinutes >= 60 ? 4 : 3;
    const finalExercises = picked.slice(0, maxExercises);

    weeklyWorkout.push({
      dayIndex: i + 1,
      title: {
        fa: `روز ${i + 1}`,
        en: `Day ${i + 1}`,
      },
      focus: template.focus,
      durationMinutes: profile.sessionMinutes,
      exercises: finalExercises.map((ex) => ({
        exerciseId: ex.id,
        name: ex.name,
        setsReps: ex.setsReps,
        muscleId: ex.muscleId,
      })),
    });
  }

  const safetyNotes: BilingualText[] = [];
  if (profile.injuries.includes('knee')) {
    safetyNotes.push({
      fa: 'به دلیل حساسیت زانو، حرکات سنگین اسکوات با هالتر جایگزین و روی کنترل دامنه حرکت تمرکز شد.',
      en: 'Heavy barbell knee-flexion movements were swapped for joint-friendly hip and glute patterns.',
    });
  }
  if (profile.injuries.includes('lower-back')) {
    safetyNotes.push({
      fa: 'حرکات پرفشار ستون فقرات مانند ددلیفت سنگین حذف شدند تا کمر در ایمنی کامل بماند.',
      en: 'High axial-load spinal movements were excluded to protect your lower back.',
    });
  }
  if (profile.injuries.includes('shoulder')) {
    safetyNotes.push({
      fa: 'پرس‌های سنگین بالای سر با هالتر حذف و با حرکات کنترل‌شده شانه جایگزین شدند.',
      en: 'Heavy overhead barbell pressing was replaced with controlled shoulder stabilization.',
    });
  }
  if (safetyNotes.length === 0) {
    safetyNotes.push({
      fa: 'پیش از هر جلسه ۵ تا ۸ دقیقه گرم‌کردن پویا انجام دهید و پیشرفت وزنه‌ها را تدریجی حفظ کنید.',
      en: 'Begin each session with 5–8 minutes of dynamic warm-up and progress loads gradually.',
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    weeklyWorkout,
    nutrition: buildMealPlan(profile),
    safetyNotes,
  };
}
