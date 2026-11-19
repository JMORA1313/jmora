import type {
  Article,
  Exercise,
  FaqItem,
  MuscleGroup,
  Product,
  SiteConfig,
  SponsorAd,
  Transformation,
} from '../types/jmora';
import { calculateTomanPrice } from '../utils/pricing';

export const DEFAULT_SITE_CONFIG: SiteConfig = {
  accentColor: '#EA580C',
  defaultTheme: 'light',
  radiusStyle: 'rounded',
  surfaceStyle: 'bordered',
  usdRate: 260_000,
  marginToman: 600_000,
  coachPassToman: 490_000,
  coachAssistantToman: 490_000,
  standardCoachToman: 980_000,
  privateCoachToman: 2_400_000,
  aiAutoReply: true,
  reymitUrl: 'https://reymit.ir/JMORA',
  heroEyebrow: {
    fa: 'سبک زندگی هوشمند · آناتومی سه‌بعدی و آموزش اصولی با مربی',
    en: 'Minimalist Training · 3D Anatomy & Guided Learning',
  },
  heroTitle: {
    fa: 'بدنی بساز که با ذهن آرام و قدرت واقعی همراه است',
    en: 'Build a Body That Moves With Calm Power',
  },
  heroSubtitle: {
    fa: 'آناتومی سه‌بعدی گرافیکی عضلات، یادگیری اصولی زیر نظر مربی و فروشگاه منتخب JMORA.',
    en: 'Realistic 3D muscle anatomy, guided personal coaching plans, and curated JMORA essentials.',
  },
  heroImage: '/src/assets/images/hero_jmora_athlete_1795014055096.jpg',
  openHours: {
    fa: 'شنبه تا پنجشنبه · ۹ صبح تا ۲۱ شب',
    en: 'Sat–Thu · 9:00 AM – 9:00 PM',
  },
  footerTagline: {
    fa: 'حرکت آگاهانه، بدن ماندگار. آموزش علمی تمرین، تغذیه و همراهی مربی به زبان ساده.',
    en: 'Intentional movement, lasting strength. Bilingual 3D anatomy, guided training & lifestyle.',
  },
};

export const MUSCLES: MuscleGroup[] = [
  {
    id: 'chest',
    side: 'front',
    name: { fa: 'سینه (پکتورال)', en: 'Chest (Pectorals)' },
    description: {
      fa: 'عضلات سینه‌ای بزرگ و کوچک؛ مسئول حرکات پرس، نزدیک‌کردن بازو به تنه و فرم‌دهی بالاتنه.',
      en: 'Pectoralis major and minor; drives horizontal pressing, arm adduction, and upper-body stability.',
    },
    recoveryHours: 48,
  },
  {
    id: 'shoulders',
    side: 'both',
    name: { fa: 'شانه (دلتوئید)', en: 'Shoulders (Deltoids)' },
    description: {
      fa: 'سه سر قدامی، میانی و خلفی برای عرض شانه، ثبات مفصل و پرس‌های بالای سر.',
      en: 'Anterior, lateral, and posterior deltoid heads for shoulder width, posture, and overhead strength.',
    },
    recoveryHours: 48,
  },
  {
    id: 'biceps',
    side: 'front',
    name: { fa: 'جلو بازو (بایسپس)', en: 'Biceps' },
    description: {
      fa: 'عضله دو سر بازویی؛ درگیر در خم‌کردن آرنج و تمام حرکات کششی مثل زیربغل و بارفیکس.',
      en: 'Biceps brachii and brachialis; drives elbow flexion and assists every pulling movement.',
    },
    recoveryHours: 36,
  },
  {
    id: 'forearms',
    side: 'both',
    name: { fa: 'ساعد', en: 'Forearms' },
    description: {
      fa: 'قدرت پنجه، مچ و ثبات در ددلیفت، دمبل و حرکات کششی سنگین.',
      en: 'Grip strength and wrist stability essential for deadlifts, rows, and carries.',
    },
    recoveryHours: 24,
  },
  {
    id: 'abs',
    side: 'front',
    name: { fa: 'شکم و میان‌تنه (کور)', en: 'Core & Abs' },
    description: {
      fa: 'عضلات راست شکمی، مایل و عمقی برای ثبات ستون فقرات، تعادل و فرم کمر.',
      en: 'Rectus abdominis, obliques, and transverse core for spinal protection and athletic power transfer.',
    },
    recoveryHours: 24,
  },
  {
    id: 'quads',
    side: 'front',
    name: { fa: 'چهارسر ران', en: 'Quadriceps' },
    description: {
      fa: 'چهار عضله اصلی جلوی ران؛ موتور اصلی اسکوات، لانج، دویدن و سلامت مفصل زانو.',
      en: 'Four anterior thigh muscles powering squats, lunges, sprinting, and knee stability.',
    },
    recoveryHours: 72,
  },
  {
    id: 'calves',
    side: 'both',
    name: { fa: 'ساق پا', en: 'Calves' },
    description: {
      fa: 'دوقلو و نعلی؛ پایه تعادل مچ پا، پرش و ایستادگی در دویدن و پیاده‌روی.',
      en: 'Gastrocnemius and soleus; essential for ankle resilience, running stride, and lower-leg symmetry.',
    },
    recoveryHours: 24,
  },
  {
    id: 'traps',
    side: 'back',
    name: { fa: 'ذوزنقه و فوق‌کتفی', en: 'Traps & Upper Back' },
    description: {
      fa: 'نگهدارنده گردن، کتف و ستون فقرات سینه‌ای برای صاف ماندن قامت و جلوگیری از قوز.',
      en: 'Upper and mid trapezius stabilizing the scapulae, neck posture, and heavy carries.',
    },
    recoveryHours: 48,
  },
  {
    id: 'lats',
    side: 'back',
    name: { fa: 'زیربغل (لت)', en: 'Lats (Latissimus Dorsi)' },
    description: {
      fa: 'بزرگ‌ترین عضله پشت برای فرم V بالاتنه، بارفیکس، لت سیمکش و حفاظت از کمر.',
      en: 'Broad back muscle creating upper-body width and driving pull-ups and rows.',
    },
    recoveryHours: 48,
  },
  {
    id: 'triceps',
    side: 'back',
    name: { fa: 'پشت بازو (ترایسپس)', en: 'Triceps' },
    description: {
      fa: 'سه سر پشت بازو که دو سوم حجم بازو را می‌سازد و قفل‌کردن حرکات پرس را بر عهده دارد.',
      en: 'Three-headed posterior arm muscle making up two-thirds of arm mass and lockout strength.',
    },
    recoveryHours: 48,
  },
  {
    id: 'lower-back',
    side: 'back',
    name: { fa: 'کمر و فیله کمری', en: 'Lower Back (Erectors)' },
    description: {
      fa: 'عضلات راست‌کننده ستون فقرات برای انتقال نیرو بین بالاتنه و پایین‌تنه و کاهش کمردرد.',
      en: 'Spinal erectors supporting posture, hinge mechanics, and lower-body force transfer.',
    },
    recoveryHours: 72,
  },
  {
    id: 'glutes',
    side: 'back',
    name: { fa: 'سرین (باسن)', en: 'Glutes' },
    description: {
      fa: 'قوی‌ترین گروه عضلانی بدن؛ حیاتی برای فرم‌دهی پایین‌تنه، محافظت از کمر و قدرت دویدن.',
      en: 'Gluteus maximus, medius, and minimus; key for hip extension, athletic power, and pelvic stability.',
    },
    recoveryHours: 72,
  },
  {
    id: 'hamstrings',
    side: 'back',
    name: { fa: 'پشت ران (همسترینگ)', en: 'Hamstrings' },
    description: {
      fa: 'سه‌عضله پشت ران؛ متعادل‌کننده چهارسر، محافظ زانو و کلید حرکات لولای لگن.',
      en: 'Posterior thigh muscles balancing the quads, protecting the ACL, and powering hip hinges.',
    },
    recoveryHours: 72,
  },
];

export const EXERCISES: Exercise[] = [
  {
    id: 'ex-incline-db-press',
    muscleId: 'chest',
    name: { fa: 'پرس بالاسینه دمبل', en: 'Incline Dumbbell Press' },
    level: 'intermediate',
    equipment: 'dumbbell',
    location: ['gym', 'home'],
    setsReps: { fa: '۴ ست × ۸ تا ۱۲ تکرار', en: '4 sets × 8–12 reps' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'شیب میز را بین ۳۰ تا ۴۵ درجه تنظیم کنید و کتف‌ها را به پشت جمع نگه دارید.', en: 'Set bench to 30–45° and pin shoulder blades back and down.' },
      { fa: 'آرنج‌ها را با زاویه ۴۵ درجه نسبت به بدن پایین بیاورید، نه کاملاً باز.', en: 'Lower elbows at a 45° angle from your torso rather than flaring wide.' },
    ],
    mistakes: [
      { fa: 'قوس بیش از حد کمر و جدا شدن باسن از میز.', en: 'Excessive lower-back arch or lifting hips off the bench.' },
      { fa: 'ضربه زدن دمبل‌ها به هم در بالا.', en: 'Clanking dumbbells together at the top and losing chest tension.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-pushup',
    muscleId: 'chest',
    name: { fa: 'شنا سوئدی استاندارد', en: 'Controlled Tempo Push-Up' },
    level: 'beginner',
    equipment: 'bodyweight',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۱۰ تا ۱۵ تکرار', en: '3 sets × 10–15 reps' },
    tempo: '2-1-1-0',
    cues: [
      { fa: 'بدن از سر تا پاشنه در یک خط صاف با انقباض شکم و باسن بماند.', en: 'Keep a rigid plank line from head to heel with core and glutes braced.' },
      { fa: 'سینه را تا نزدیکی زمین پایین ببرید و با فشار کف دست بالا بیایید.', en: 'Lower chest cleanly toward the floor and drive smoothly through palms.' },
    ],
    mistakes: [
      { fa: 'افتادن لگن به سمت پایین یا بالا بردن بیش از حد باسن.', en: 'Letting hips sag or piking glutes upward.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-cable-fly',
    muscleId: 'chest',
    name: { fa: 'قفسه سینه سیمکش', en: 'Standing Cable Chest Fly' },
    level: 'intermediate',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۲ تا ۱۵ تکرار', en: '3 sets × 12–15 reps' },
    tempo: '2-1-2-1',
    cues: [
      { fa: 'خمیدگی ثابت و ملایم در آرنج‌ها حفظ کنید و با سینه دست‌ها را نزدیک کنید.', en: 'Maintain a soft fixed elbow bend and hug forward from the chest.' },
    ],
    mistakes: [
      { fa: 'استفاده از وزن سنگین و خم کردن بیش از حد آرنج مثل پرس.', en: 'Turning the fly into a heavy press with overly bent elbows.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-lateral-raise',
    muscleId: 'shoulders',
    name: { fa: 'نشر از جانب دمبل', en: 'Dumbbell Lateral Raise' },
    level: 'beginner',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۴ ست × ۱۲ تا ۱۵ تکرار', en: '4 sets × 12–15 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'دمبل‌ها را کمی به سمت جلو و مورب بالا ببرید (در صفحه کتف).', en: 'Raise dumbbells slightly forward in the scapular plane up to shoulder height.' },
      { fa: 'با آرنج حرکت را هدایت کنید و شانه‌ها را به گوش نزدیک نکنید.', en: 'Lead with the elbows and keep traps relaxed away from your ears.' },
    ],
    mistakes: [
      { fa: 'تاب دادن تنه و کمر برای بالا انداختن دمبل سنگین.', en: 'Swinging torso momentum to heave overly heavy weights.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-overhead-press',
    muscleId: 'shoulders',
    name: { fa: 'پرس سرشانه هالتر ایستاده', en: 'Standing Barbell Overhead Press' },
    level: 'pro',
    equipment: 'barbell',
    location: ['gym'],
    setsReps: { fa: '۴ ست × ۶ تا ۸ تکرار', en: '4 sets × 6–8 reps' },
    tempo: '2-0-1-0',
    cues: [
      { fa: 'شکم و باسن را قفل کنید تا کمر گود نشود و هالتر را در خط عمودی بالا ببرید.', en: 'Brace glutes and abs tightly, pressing the bar in a straight vertical path.' },
    ],
    mistakes: [
      { fa: 'خم کردن کمر به عقب برای تمام کردن تکرار.', en: 'Hyperextending the lumbar spine at lockout.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-pike-pushup',
    muscleId: 'shoulders',
    name: { fa: 'شنا پایک (شانه خانگی)', en: 'Pike Shoulder Push-Up' },
    level: 'beginner',
    equipment: 'bodyweight',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۸ تا ۱۲ تکرار', en: '3 sets × 8–12 reps' },
    tempo: '2-1-1-0',
    cues: [
      { fa: 'بدن را به شکل عدد ۸ فارسی درآورید و سر را جلوتر از خط دست‌ها فرود بیاورید.', en: 'Form an inverted V and lower the crown of your head forward of your hands.' },
    ],
    mistakes: [
      { fa: 'عمودی نبودن ساعدها هنگام پایین رفتن.', en: 'Letting elbows flare straight out to the sides.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-db-curl',
    muscleId: 'biceps',
    name: { fa: 'جلو بازو دمبل ایستاده', en: 'Alternating Dumbbell Curl' },
    level: 'beginner',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۱۰ تا ۱۲ تکرار', en: '3 sets × 10–12 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'آرنج‌ها را کنار پهلو ثابت نگه دارید و کف دست را هنگام بالا آوردن بچرخانید.', en: 'Pin elbows by your ribs and supinate wrists smoothly at the top.' },
    ],
    mistakes: [
      { fa: 'جلو آوردن آرنج یا تاب دادن شانه.', en: 'Swinging elbows forward with momentum.' },
    ],
    animationType: 'curl',
  },
  {
    id: 'ex-barbell-curl',
    muscleId: 'biceps',
    name: { fa: 'جلو بازو هالتر EZ', en: 'EZ-Bar Biceps Curl' },
    level: 'intermediate',
    equipment: 'barbell',
    location: ['gym'],
    setsReps: { fa: '۴ ست × ۸ تا ۱۰ تکرار', en: '4 sets × 8–10 reps' },
    tempo: '3-0-1-1',
    cues: [
      { fa: 'در پایین دامنه دست را کامل باز کنید و با کنترل منفی ۳ ثانیه‌ای پایین بیاورید.', en: 'Lower with a slow 3-second eccentric to full elbow extension.' },
    ],
    mistakes: [
      { fa: 'نصفه رها کردن حرکت در پایین دامنه.', en: 'Cutting the bottom range of motion short.' },
    ],
    animationType: 'curl',
  },
  {
    id: 'ex-farmers-walk',
    muscleId: 'forearms',
    name: { fa: 'راه رفتن کشاورز (دمبل)', en: 'Dumbbell Farmer’s Carry' },
    level: 'beginner',
    equipment: 'dumbbell',
    location: ['gym', 'home'],
    setsReps: { fa: '۳ ست × ۳۰ متر یا ۴۰ ثانیه', en: '3 sets × 30m or 40s' },
    tempo: 'Steady',
    cues: [
      { fa: 'سینه را بالا، شانه‌ها را عقب و گام‌ها را کوتاه و کنترل‌شده بردارید.', en: 'Stand tall, pack shoulders down, and walk with crisp controlled steps.' },
    ],
    mistakes: [
      { fa: 'خم شدن شانه به یک سمت یا قوز کردن گردن.', en: 'Leaning laterally or shrugging shoulders up.' },
    ],
    animationType: 'core',
  },
  {
    id: 'ex-dead-bug',
    muscleId: 'abs',
    name: { fa: 'ددباگ (ثبات عمقی شکم)', en: 'Controlled Dead Bug' },
    level: 'beginner',
    equipment: 'bodyweight',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۱۰ تکرار هر طرف', en: '3 sets × 10 reps / side' },
    tempo: '3-1-2-0',
    cues: [
      { fa: 'گودی کمر را کاملاً به زمین بچسبانید و بازو و پای مخالف را هم‌زمان باز کنید.', en: 'Press lower back flat into the mat while extending opposite arm and leg.' },
    ],
    mistakes: [
      { fa: 'بلند شدن کمر از زمین هنگام پایین بردن پا.', en: 'Allowing the lumbar arch to lift off the floor.' },
    ],
    animationType: 'core',
  },
  {
    id: 'ex-hanging-leg-raise',
    muscleId: 'abs',
    name: { fa: 'زیرشکم آویزان از بارفیکس', en: 'Hanging Knee/Leg Raise' },
    level: 'intermediate',
    equipment: 'bodyweight',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۰ تا ۱۵ تکرار', en: '3 sets × 10–15 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'لگن را به سمت بالا بچرخانید، نه صرفاً تاب دادن پاها از مفصل ران.', en: 'Curl your pelvis upward rather than just swinging legs from the hips.' },
    ],
    mistakes: [
      { fa: 'تاب خوردن بدن در هر تکرار.', en: 'Using body swing momentum between reps.' },
    ],
    animationType: 'core',
  },
  {
    id: 'ex-goblet-squat',
    muscleId: 'quads',
    name: { fa: 'اسکوات گابلت با دمبل', en: 'Dumbbell Goblet Squat' },
    level: 'beginner',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۴ ست × ۱۰ تا ۱۲ تکرار', en: '4 sets × 10–12 reps' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'دمبل را نزدیک سینه نگه دارید، زانوها را هم‌راستای پنجه پا پایین ببرید.', en: 'Hold dumbbell tight to chest and track knees smoothly over mid-foot.' },
    ],
    mistakes: [
      { fa: 'جمع شدن زانوها به داخل یا بلند شدن پاشنه از زمین.', en: 'Knees caving inward or heels lifting off the floor.' },
    ],
    animationType: 'squat',
  },
  {
    id: 'ex-barbell-squat',
    muscleId: 'quads',
    name: { fa: 'اسکوات هالتر پشت', en: 'Barbell Back Squat' },
    level: 'pro',
    equipment: 'barbell',
    location: ['gym'],
    setsReps: { fa: '۴ ست × ۶ تا ۸ تکرار', en: '4 sets × 6–8 reps' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'نفس عمیق شکمی بگیرید، ستون فقرات را خنثی نگه دارید و تا موازی شدن ران پایین بروید.', en: 'Take a 360° core brace, sit hips between heels to parallel, and drive evenly.' },
    ],
    mistakes: [
      { fa: 'خم شدن بیش از حد بالاتنه به جلو هنگام بالا آمدن.', en: 'Hips shooting up faster than the chest.' },
    ],
    animationType: 'squat',
  },
  {
    id: 'ex-leg-extension',
    muscleId: 'quads',
    name: { fa: 'جلو پا دستگاه', en: 'Seated Leg Extension' },
    level: 'beginner',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۲ تا ۱۵ تکرار', en: '3 sets × 12–15 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'در بالاترین نقطه ۱ ثانیه مکث کنید و به آرامی وزنه را پایین بیاورید.', en: 'Pause 1 second at full extension and lower under control.' },
    ],
    mistakes: [
      { fa: 'پرتاب کردن سریع پاها به بالا.', en: 'Kicking the pad up explosively with momentum.' },
    ],
    animationType: 'squat',
  },
  {
    id: 'ex-calf-raise',
    muscleId: 'calves',
    name: { fa: 'ساق پا ایستاده تک‌دمبل', en: 'Single-Leg Dumbbell Calf Raise' },
    level: 'beginner',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۴ ست × ۱۵ تا ۲۰ تکرار', en: '4 sets × 15–20 reps' },
    tempo: '2-2-2-1',
    cues: [
      { fa: 'در پایین دامنه ۲ ثانیه کشش کامل بدهید و روی پنجه تا انتها بالا بیایید.', en: 'Stretch the heel down for 2 seconds at the bottom and press high onto the big toe.' },
    ],
    mistakes: [
      { fa: 'حرکت سریع و فنری بدون مکث در پایین و بالا.', en: 'Bouncing rapidly through the Achilles tendon.' },
    ],
    animationType: 'squat',
  },
  {
    id: 'ex-face-pull',
    muscleId: 'traps',
    name: { fa: 'فیس‌پول طناب (فوق‌کتفی و دلتوئید خلفی)', en: 'Rope Face Pull' },
    level: 'beginner',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۵ تکرار', en: '3 sets × 15 reps' },
    tempo: '2-1-2-1',
    cues: [
      { fa: 'طناب را به سمت پیشانی بکشید و در انتها انگشتان شست را به عقب بچرخانید.', en: 'Pull rope toward forehead while externally rotating thumbs backward.' },
    ],
    mistakes: [
      { fa: 'عقب دادن کمر برای کشیدن وزنه سنگین.', en: 'Leaning back with body weight to move the stack.' },
    ],
    animationType: 'pull',
  },
  {
    id: 'ex-lat-pulldown',
    muscleId: 'lats',
    name: { fa: 'زیربغل سیمکش از جلو', en: 'Wide-Grip Lat Pulldown' },
    level: 'beginner',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۴ ست × ۱۰ تا ۱۲ تکرار', en: '4 sets × 10–12 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'ابتدا شانه‌ها را پایین بدهید و میله را با آرنج به سمت بالای سینه بکشید.', en: 'Depress shoulder blades first, then drive elbows down toward your ribs.' },
    ],
    mistakes: [
      { fa: 'کشیدن میله با کمک تاب کمر تا پایین شکم.', en: 'Swinging torso backward and pulling bar too low.' },
    ],
    animationType: 'pull',
  },
  {
    id: 'ex-one-arm-row',
    muscleId: 'lats',
    name: { fa: 'زیربغل دمبل تک‌دست', en: 'Single-Arm Dumbbell Row' },
    level: 'intermediate',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۴ ست × ۱۰ تکرار هر دست', en: '4 sets × 10 reps / side' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'دمبل را در مسیر قوسی به سمت لگن بکشید، نه عمودی به سمت شانه.', en: 'Sweep the dumbbell back toward your hip pocket rather than straight up.' },
    ],
    mistakes: [
      { fa: 'چرخاندن تنه و کمر برای بالا کشیدن دمبل.', en: 'Twisting the torso to heave the weight.' },
    ],
    animationType: 'pull',
  },
  {
    id: 'ex-triceps-pushdown',
    muscleId: 'triceps',
    name: { fa: 'پشت بازو طناب سیمکش', en: 'Cable Rope Triceps Pushdown' },
    level: 'beginner',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۲ تا ۱۵ تکرار', en: '3 sets × 12–15 reps' },
    tempo: '2-1-2-0',
    cues: [
      { fa: 'بازوها را کنار بدن قفل کنید و در پایین، طناب را به دو طرف باز کنید.', en: 'Keep upper arms pinned at your sides and flare the rope apart at lockout.' },
    ],
    mistakes: [
      { fa: 'تکیه دادن وزن بدن روی دستگیره و حرکت شانه‌ها.', en: 'Pressing down using shoulders and body weight.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-overhead-tricep-ext',
    muscleId: 'triceps',
    name: { fa: 'پشت بازو دمبل بالای سر', en: 'Overhead Dumbbell Triceps Extension' },
    level: 'intermediate',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۱۰ تا ۱۲ تکرار', en: '3 sets × 10–12 reps' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'آرنج‌ها را رو به سقف نگه دارید و کشش کامل سر دراز پشت بازو را حس کنید.', en: 'Keep elbows pointing upward to maximize long-head triceps stretch.' },
    ],
    mistakes: [
      { fa: 'گود کردن کمر یا باز شدن بیش از حد آرنج‌ها.', en: 'Rib flare and lower-back hyperextension.' },
    ],
    animationType: 'press',
  },
  {
    id: 'ex-hip-thrust',
    muscleId: 'glutes',
    name: { fa: 'هیپ تراست هالتر یا دمبل', en: 'Barbell / Dumbbell Hip Thrust' },
    level: 'intermediate',
    equipment: 'barbell',
    location: ['gym', 'home'],
    setsReps: { fa: '۴ ست × ۸ تا ۱۲ تکرار', en: '4 sets × 8–12 reps' },
    tempo: '2-2-2-0',
    cues: [
      { fa: 'چانه را کمی به سینه نزدیک کنید، دنده‌ها را پایین نگه دارید و با پاشنه بالا فشار دهید.', en: 'Tuck chin slightly, keep ribs stacked over pelvis, and squeeze glutes for 2s at top.' },
    ],
    mistakes: [
      { fa: 'کمک گرفتن از گودی کمر در بالا به جای انقباض کامل سرین.', en: 'Hyperextending the lower back instead of posterior pelvic tilt.' },
    ],
    animationType: 'hinge',
  },
  {
    id: 'ex-glute-bridge',
    muscleId: 'glutes',
    name: { fa: 'پل باسن (بدون وسیله و امن زانو)', en: 'Bodyweight Glute Bridge' },
    level: 'beginner',
    equipment: 'bodyweight',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۱۵ تکرار', en: '3 sets × 15 reps' },
    tempo: '2-2-2-0',
    cues: [
      { fa: 'پاشنه‌ها را به زمین فشار دهید و در بالا ۲ ثانیه باسن را منقبض نگه دارید.', en: 'Drive through heels and hold peak glute squeeze for 2 seconds.' },
    ],
    mistakes: [
      { fa: 'باز کردن دنده‌ها و فشار روی کمر.', en: 'Flaring ribcage and arching the lumbar spine.' },
    ],
    animationType: 'hinge',
  },
  {
    id: 'ex-bulgarian-split-squat',
    muscleId: 'glutes',
    name: { fa: 'اسکوات بلغاری دمبل (تمرکز سرین)', en: 'Bulgarian Split Squat (Glute Bias)' },
    level: 'pro',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۸ تا ۱۰ تکرار هر پا', en: '3 sets × 8–10 reps / leg' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'کمی بالاتنه را به جلو متمایل کنید تا فشار به جای چهارسر روی سرین متمرکز شود.', en: 'Lean torso slightly forward with a vertical shin to maximize glute stretch.' },
    ],
    mistakes: [
      { fa: 'قرار دادن پای جلو بیش از حد نزدیک به نیمکت.', en: 'Standing too close to the bench, overloading the front knee.' },
    ],
    animationType: 'squat',
  },
  {
    id: 'ex-rdl',
    muscleId: 'hamstrings',
    name: { fa: 'ددلیفت رومانیایی دمبل یا هالتر', en: 'Romanian Deadlift (RDL)' },
    level: 'intermediate',
    equipment: 'dumbbell',
    location: ['home', 'gym'],
    setsReps: { fa: '۴ ست × ۸ تا ۱۰ تکرار', en: '4 sets × 8–10 reps' },
    tempo: '3-1-1-0',
    cues: [
      { fa: 'زانوها فقط کمی خم بمانند و لگن را به سمت دیوار پشت سر هل دهید تا کشش پشت ران حس شود.', en: 'Maintain soft knees and hinge hips straight back until hamstrings reach full tension.' },
    ],
    mistakes: [
      { fa: 'گرد کردن کمر برای پایین‌تر بردن دمبل‌ها.', en: 'Rounding the lower back just to touch the floor.' },
    ],
    animationType: 'hinge',
  },
  {
    id: 'ex-lying-leg-curl',
    muscleId: 'hamstrings',
    name: { fa: 'پشت پا دستگاه خوابیده', en: 'Lying Hamstring Curl' },
    level: 'beginner',
    equipment: 'machine',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۱۲ تکرار', en: '3 sets × 12 reps' },
    tempo: '2-1-3-0',
    cues: [
      { fa: 'لگن را به تشک بچسبانید و در بخش برگشت به آرامی وزنه را کنترل کنید.', en: 'Keep pelvis pressed into the pad and resist the 3-second lowering phase.' },
    ],
    mistakes: [
      { fa: 'بلند شدن باسن از روی تشک در هر تکرار.', en: 'Hips lifting off the bench during flexion.' },
    ],
    animationType: 'hinge',
  },
  {
    id: 'ex-deadlift',
    muscleId: 'lower-back',
    name: { fa: 'ددلیفت کلاسیک هالتر', en: 'Conventional Barbell Deadlift' },
    level: 'pro',
    equipment: 'barbell',
    location: ['gym'],
    setsReps: { fa: '۳ ست × ۵ تکرار', en: '3 sets × 5 reps' },
    tempo: '2-1-1-0',
    cues: [
      { fa: 'هالتر چسبیده به ساق پا، پشت صاف، با فشار پا به زمین حرکت را شروع کنید.', en: 'Keep bar over mid-foot, lats engaged, and push the floor away with legs.' },
    ],
    mistakes: [
      { fa: 'کشیدن ناگهانی با کمر خمیده.', en: 'Jerking the bar off the floor with a rounded spine.' },
    ],
    animationType: 'hinge',
  },
  {
    id: 'ex-bird-dog',
    muscleId: 'lower-back',
    name: { fa: 'بردداگ (تقویت ایمن کمر و ریکاوری)', en: 'Controlled Bird-Dog' },
    level: 'beginner',
    equipment: 'bodyweight',
    location: ['home', 'gym'],
    setsReps: { fa: '۳ ست × ۸ تکرار هر طرف', en: '3 sets × 8 reps / side' },
    tempo: '2-2-2-0',
    cues: [
      { fa: 'بدون چرخاندن لگن، دست و پای مخالف را هم‌سطح بدن صاف کنید و ۲ ثانیه نگه دارید.', en: 'Extend opposite arm and leg cleanly without rotating the hips.' },
    ],
    mistakes: [
      { fa: 'بالا بردن بیش از حد پا و گود کردن کمر.', en: 'Swinging the leg too high and arching the lower back.' },
    ],
    animationType: 'core',
  },
];

// Initial shop contains ONLY Mineral Water; Admin can add, edit, replace, or remove anything.
export const PRODUCTS: Product[] = [
  {
    id: 'prod-mineral-water',
    slug: 'jmora-natural-mineral-water',
    category: 'water',
    name: {
      fa: 'آب معدنی طبیعی JMORA (پک ۱۲ عددی)',
      en: 'JMORA Natural Mineral Water (12-Pack)',
    },
    subtitle: {
      fa: 'بطری شیشه‌ای مات · سرشار از الکترولیت طبیعی · ریکاوری ورزشی',
      en: 'Frosted glass & matte bottles · Natural electrolytes · Recovery hydration',
    },
    description: {
      fa: 'آب معدنی طبیعی چشمه‌های کوهستانی با pH متعادل ۷.۸ و املاح کلسیم و منیزیم متوازن برای هیدراتاسیون تمرین و سلامت روزانه. قابل ویرایش، افزودن یا حذف کامل از پنل ادمین.',
      en: 'Pure mountain spring mineral water with balanced pH 7.8 and naturally occurring calcium and magnesium for clean training hydration.',
    },
    priceUsd: 2,
    priceToman: calculateTomanPrice(2),
    image: '/src/assets/images/shop_mineral_water_1795022774737.jpg',
    gallery: ['/src/assets/images/shop_mineral_water_1795022774737.jpg'],
    sizes: ['12 × 500ml', '6 × 1L'],
    colors: [
      { name: { fa: 'شیشه‌ای مات', en: 'Frosted Glass' }, hex: '#E7E5E4' },
      { name: { fa: 'ذغالی مَت', en: 'Matte Charcoal' }, hex: '#18181B' },
    ],
    stock: 40,
    featured: true,
  },
];

export const SPONSORS: SponsorAd[] = [
  {
    id: 'sp-studio-1',
    title: {
      fa: 'استودیو تمرین و ریکاوری JMORA',
      en: 'JMORA Studio & Recovery Partner',
    },
    subtitle: {
      fa: 'فضای تبلیغاتی و اسپانسری ویژه برندهای ورزشی — قابل افزودن، ویرایش و حذف کامل از پنل ادمین.',
      en: 'Curated partner showcase slot — fully editable and removable from the Admin Console.',
    },
    badge: { fa: 'همکار رسمی', en: 'Featured Partner' },
    image: '/src/assets/images/sponsor_banner_studio_1795022775859.jpg',
    linkUrl: 'https://reymit.ir/JMORA',
    active: true,
    createdAt: '2026-11-15T10:00:00.000Z',
  },
];

export const TRANSFORMATIONS: Transformation[] = [
  {
    id: 'tr-sara',
    name: { fa: 'نمونه قبل و بعد استودیو (قابل جایگزینی)', en: 'Studio Case Study (Editable)' },
    gender: 'women',
    goal: 'glute-growth',
    durationWeeks: 16,
    weightDeltaKg: '+2.4 kg Lean',
    programName: { fa: 'مسیر فرم‌دهی اصولی JMORA', en: 'JMORA Sculpt & Strength' },
    testimonial: {
      fa: 'در پنل ادمین می‌توانید تصاویر قبل و بعد واقعی خودتان را مستقیماً آپلود یا جایگزین کنید.',
      en: 'Admins can upload separate real Before and After photographs directly from the Admin Console.',
    },
    beforeMetrics: { fa: 'هفته ۱ · شروع مسیر', en: 'Week 1 · Baseline' },
    afterMetrics: { fa: 'هفته ۱۶ · نتیجه نهایی', en: 'Week 16 · Outcome' },
    beforeImage: '/src/assets/images/article_strength_studio_1795014056746.jpg',
    afterImage: '/src/assets/images/hero_jmora_athlete_1795014055096.jpg',
    image: '/src/assets/images/hero_jmora_athlete_1795014055096.jpg',
    approved: true,
  },
];

export const ARTICLES: Article[] = [
  {
    id: 'art-glutes',
    slug: 'why-glutes-not-growing',
    category: 'glutes',
    title: { fa: 'چرا باسنم رشد نمی‌کنه؟ ۵ اشتباه پنهان در تمرین و تغذیه', en: 'Why Aren’t My Glutes Growing? 5 Hidden Mistakes' },
    excerpt: {
      fa: 'انجام صدها حرکت کیک‌بک بدون وزنه کافی یا کمبود پروتئین، دلیل اصلی توقف رشد سرین است. راه‌حل علمی را بخوانید.',
      en: 'High-rep bodyweight kickbacks without progressive overload or adequate protein keep glutes flat. Here is what actually works.',
    },
    content: [
      {
        fa: 'بزرگ‌ترین دلیل رشد نکردن عضلات سرین، اشتباه گرفتن «سوزش عضله» با «رشد عضله» است. حرکات سبک و تکرارهای بالای ۳۰ معمولاً فقط سوزش موقت ایجاد می‌کنند و محرک واقعی برای ساخت بافت جدید نیستند.',
        en: 'The biggest trap in glute training is confusing a temporary burn with mechanical tension. Light bands for 30 reps create fatigue, not meaningful hypertrophy.',
      },
      {
        fa: 'برای رشد واقعی، به ۳ ستون نیاز دارید: ۱) حرکات پایه با بار پیش‌رونده مثل هیپ تراست، اسکوات بلغاری و ددلیفت رومانیایی در بازه ۶ تا ۱۲ تکرار؛ ۲) تغذیه با حداقل ۱.۶ تا ۲ گرم پروتئین به ازای هر کیلوگرم وزن بدن؛ ۳) ریکاوری ۴۸ تا ۷۲ ساعته بین جلسات سنگین.',
        en: 'Real growth relies on three pillars: progressive compound lifts in the 6–12 rep range, adequate daily protein, and 48–72 hours of recovery.',
      },
    ],
    readMinutes: 5,
    tags: [
      { fa: 'رشد سرین', en: 'Glutes' },
      { fa: 'اضافه‌بار پیش‌رونده', en: 'Progressive Overload' },
    ],
    image: '/src/assets/images/hero_jmora_athlete_1795014055096.jpg',
    publishedAt: '2026-10-14',
  },
  {
    id: 'art-hydration',
    slug: 'electrolytes-mineral-hydration',
    category: 'nutrition',
    title: { fa: 'نقش آب معدنی و الکترولیت‌ها در ریکاوری و توان عضلانی', en: 'Mineral Water & Electrolytes for Strength Recovery' },
    excerpt: {
      fa: 'حتی ۲٪ کم‌آبی بدن می‌تواند قدرت عضلانی و تمرکز عصبی را کاهش دهد. اصول هیدراتاسیون صحیح را بخوانید.',
      en: 'Even mild 2% dehydration reduces neuromuscular output and slows recovery between sets.',
    },
    content: [
      {
        fa: 'بافت عضلانی بیش از ۷۰ درصد از آب تشکیل شده است. مصرف منظم آب معدنی طبیعی سرشار از منیزیم و کلسیم پیش از تمرین و حین ریکاوری، از گرفتگی عضلات جلوگیری کرده و انتقال پیام عصبی را بهینه می‌کند.',
        en: 'Muscle tissue is over 70% water. Consistent hydration with natural calcium and magnesium supports nerve signaling and prevents cramps.',
      },
    ],
    readMinutes: 4,
    tags: [
      { fa: 'هیدراتاسیون', en: 'Hydration' },
      { fa: 'تغذیه', en: 'Nutrition' },
    ],
    image: '/src/assets/images/shop_mineral_water_1795022774737.jpg',
    publishedAt: '2026-11-10',
  },
  {
    id: 'art-no-results',
    slug: 'why-not-seeing-results',
    category: 'training',
    title: { fa: 'چرا با وجود تمرین مداوم نتیجه نمی‌گیرم؟', en: 'Why Am I Not Seeing Results Despite Training Hard?' },
    excerpt: {
      fa: 'عوض کردن مدام برنامه، خواب ناکافی و ثبت نکردن وزنه‌ها باعث می‌شود ماه‌ها در جا بزنید.',
      en: 'Program hopping, under-sleeping, and failing to track lifts quietly erase months of hard gym effort.',
    },
    content: [
      {
        fa: 'بدن شما تنها زمانی تغییر می‌کند که دلیل مشخصی برای سازگاری داشته باشد. یک برنامه مشخص را حداقل ۸ تا ۱۲ هفته دنبال کنید و هر هفته فشار تمرینی را کنترل‌شده بالا ببرید.',
        en: 'Stick to one structured split for 8–12 weeks and aim to beat last week by one rep or a clean load increment.',
      },
    ],
    readMinutes: 4,
    tags: [
      { fa: 'برنامه‌ریزی', en: 'Programming' },
      { fa: 'تداوم', en: 'Consistency' },
    ],
    image: '/src/assets/images/article_strength_studio_1795014056746.jpg',
    publishedAt: '2026-10-22',
  },
];

export const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    question: {
      fa: 'چگونه آموزش کامل حرکات عضلات و بخش مربیگری را باز کنم؟',
      en: 'How do I unlock the Exercise Tutorials and Coaching portal?',
    },
    answer: {
      fa: 'ابتدا در سایت حساب کاربری بسازید. مدل آناتومی سه‌بعدی برای بررسی عضلات باز است؛ برای دیدن حرکات تخصصی و ارسال اطلاعات جهت کمک مربی، هزینه اشتراک را در reymit.ir/JMORA پرداخت کرده و شماره پیگیری را ثبت کنید.',
      en: 'Create your JMORA account first. You can explore the 3D muscle map freely, then complete the pass payment via reymit.ir/JMORA to unlock all targeted exercises and live coaching.',
    },
  },
  {
    id: 'faq-2',
    question: {
      fa: 'پرداخت سفارش‌های فروشگاه JMORA چگونه انجام می‌شود؟',
      en: 'How does checkout and payment work in the JMORA Shop?',
    },
    answer: {
      fa: 'پس از ورود به حساب کاربری و ثبت سفارش در سبد خرید، پرداخت از طریق لینک reymit.ir/JMORA انجام می‌شود. حتماً نام محصول و آدرس دقیق خانه را در توضیحات بنویسید و مبلغ دقیق را وارد کنید.',
      en: 'After signing in and confirming your bag, pay at reymit.ir/JMORA. Include the selected item name and exact home address in the payment description.',
    },
  },
  {
    id: 'faq-3',
    question: {
      fa: 'پشتیبانی و پیگیری سفارش‌ها از چه طریقی انجام می‌شود؟',
      en: 'How do I reach JMORA support?',
    },
    answer: {
      fa: 'تمامی درخواست‌ها از طریق سیستم تیکت داخلی سایت پس از ورود به حساب کاربری بررسی و پاسخ داده می‌شوند.',
      en: 'All requests are handled through our in-site Support Ticket system once signed in.',
    },
  },
];

export const HERO_QUOTES = [
  { fa: 'بدنت همون چیزیه که هر روز تکرار می‌کنی.', en: 'Your body is what you repeat every day.' },
  { fa: 'شروع کن، کامل بودن لازم نیست.', en: 'Start today—perfection is never required.' },
  { fa: 'قدم‌های کوچک، بدن قدرتمند.', en: 'Small steps. Strong body.' },
  { fa: 'تنها رقیب تو، نسخه دیروز خودته.', en: "Your only competition is yesterday's you." },
];
