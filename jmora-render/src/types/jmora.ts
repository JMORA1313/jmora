export type Locale = 'fa' | 'en';
export type ThemeMode = 'light' | 'dark';
export type RadiusStyle = 'sharp' | 'rounded' | 'soft';
export type SurfaceStyle = 'bordered' | 'elevated' | 'glass';

export type PageRoute =
  | 'home'
  | 'muscle-guide'
  | 'onboarding'
  | 'dashboard'
  | 'shop'
  | 'transformations'
  | 'articles'
  | 'contact'
  | 'admin';

export interface BilingualText {
  fa: string;
  en: string;
}

export type MuscleSide = 'front' | 'back';

export interface MuscleGroup {
  id: string;
  side: MuscleSide | 'both';
  name: BilingualText;
  description: BilingualText;
  recoveryHours: number;
}

export type ExerciseLevel = 'beginner' | 'intermediate' | 'pro';
export type EquipmentType = 'bodyweight' | 'dumbbell' | 'machine' | 'barbell';
export type TrainingLocation = 'home' | 'gym';

export interface Exercise {
  id: string;
  muscleId: string;
  name: BilingualText;
  level: ExerciseLevel;
  equipment: EquipmentType;
  location: TrainingLocation[];
  setsReps: BilingualText;
  tempo: string;
  cues: BilingualText[];
  mistakes: BilingualText[];
  animationType: 'press' | 'squat' | 'hinge' | 'pull' | 'curl' | 'core';
}

export type ProductCategory = 'water' | 'equipment' | 'apparel' | 'supplements';

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  name: BilingualText;
  subtitle: BilingualText;
  description: BilingualText;
  priceUsd: number;
  priceToman: number;
  manualToman?: boolean;
  image: string;
  gallery: string[];
  sizes: string[];
  colors: { name: BilingualText; hex: string }[];
  stock: number;
  featured?: boolean;
}

export interface CartItem {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

export type PaymentGateway = 'reymit';

export interface ClientInfoSubmission {
  id: string;
  userId?: string;
  fullName: string;
  contact: string;
  gender: 'female' | 'male';
  age: number;
  heightCm: number;
  weightKg: number;
  goalText: string;
  experienceAndGear: string;
  injuriesNotes: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId?: string;
  name: string;
  contact: string;
  subject: string;
  message: string;
  status: 'open' | 'answered';
  adminReply?: string;
  repliedAt?: string;
  createdAt: string;
}

export interface OrderRecord {
  id: string;
  userId?: string;
  createdAt: string;
  customerName: string;
  phone: string;
  address: string;
  gateway: PaymentGateway;
  status: 'paid' | 'preparing' | 'shipped';
  totalUsd: number;
  totalToman: number;
  items: {
    productId: string;
    name: BilingualText;
    size: string;
    color: string;
    quantity: number;
    priceUsd: number;
    priceToman: number;
  }[];
}

export interface Transformation {
  id: string;
  userId?: string;
  name: BilingualText;
  gender: 'women' | 'men';
  goal: 'fat-loss' | 'muscle-gain' | 'glute-growth' | 'recomp';
  durationWeeks: number;
  weightDeltaKg: string;
  programName: BilingualText;
  testimonial: BilingualText;
  beforeMetrics: BilingualText;
  afterMetrics: BilingualText;
  beforeImage: string;
  afterImage: string;
  image?: string;
  approved: boolean;
}

export interface SponsorAd {
  id: string;
  title: BilingualText;
  subtitle: BilingualText;
  badge: BilingualText;
  image: string;
  linkUrl: string;
  active: boolean;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  category: 'training' | 'nutrition' | 'mindset' | 'glutes';
  title: BilingualText;
  excerpt: BilingualText;
  content: BilingualText[];
  readMinutes: number;
  tags: BilingualText[];
  image: string;
  publishedAt: string;
}

export interface FaqItem {
  id: string;
  question: BilingualText;
  answer: BilingualText;
}

export type CoachTier = 'assistant' | 'standard' | 'private';

export interface SiteConfig {
  accentColor: string;
  defaultTheme: ThemeMode;
  radiusStyle: RadiusStyle;
  surfaceStyle: SurfaceStyle;
  usdRate: number;
  marginToman: number;
  coachPassToman: number;
  coachAssistantToman: number;
  standardCoachToman: number;
  privateCoachToman: number;
  aiAutoReply: boolean;
  reymitUrl: string;
  heroEyebrow: BilingualText;
  heroTitle: BilingualText;
  heroSubtitle: BilingualText;
  heroImage: string;
  openHours: BilingualText;
  footerTagline: BilingualText;
}

export interface CoachAccessRequest {
  id: string;
  userId: string;
  userName: string;
  identifier: string;
  planTier: CoachTier;
  reymitRef: string;
  amountToman: number;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
}

export interface ProgressPhotoSubmission {
  id: string;
  userId: string;
  userName: string;
  identifier: string;
  beforeImage: string;
  afterImage: string;
  weightKg?: string;
  note: string;
  coachFeedback?: string;
  reviewedAt?: string;
  publishedTransformationId?: string;
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  userId: string;
  sender: 'user' | 'coach' | 'ai';
  text: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  type: string;
  detail: string;
  userId?: string;
  identifier?: string;
  ip?: string;
  createdAt: string;
}

export type OnboardingGoal =
  | 'fat-loss'
  | 'muscle-gain'
  | 'fitness'
  | 'glute-growth'
  | 'strength'
  | 'wellness';

export type TrainingStyle =
  | 'bodybuilding'
  | 'pilates'
  | 'yoga'
  | 'crossfit'
  | 'cardio'
  | 'hybrid';

export interface OnboardingProfile {
  gender: 'female' | 'male';
  age: number;
  heightCm: number;
  weightKg: number;
  goal: OnboardingGoal;
  level: ExerciseLevel;
  style: TrainingStyle;
  location: TrainingLocation;
  equipment: EquipmentType[];
  daysPerWeek: number;
  sessionMinutes: number;
  wantsDiet: boolean;
  dietPreference: 'balanced' | 'high-protein' | 'vegetarian' | 'vegan';
  allergies: string;
  injuries: string[];
}

export interface GeneratedWorkoutDay {
  dayIndex: number;
  title: BilingualText;
  focus: BilingualText;
  durationMinutes: number;
  exercises: {
    exerciseId: string;
    name: BilingualText;
    setsReps: BilingualText;
    muscleId: string;
  }[];
}

export interface GeneratedNutritionPlan {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  meals: {
    name: BilingualText;
    calories: number;
    description: BilingualText;
  }[];
}

export interface GeneratedPlan {
  generatedAt: string;
  weeklyWorkout: GeneratedWorkoutDay[];
  nutrition: GeneratedNutritionPlan | null;
  safetyNotes: BilingualText[];
}

export interface WeightEntry {
  date: string;
  weightKg: number;
  waistCm?: number;
}

export interface UserAuth {
  id: string;
  method: 'phone' | 'email';
  identifier: string;
  name: string;
  isAdmin: boolean;
  token?: string;
  coachAccessUnlocked?: boolean;
  coachTier?: CoachTier;
}

export interface UserState {
  auth: UserAuth | null;
  profile: OnboardingProfile | null;
  savedInfo?: ClientInfoSubmission | null;
  ticketIds?: string[];
  plan: GeneratedPlan | null;
  completedDays: Record<string, boolean>;
  customPlanExerciseIds: string[];
  favoriteExerciseIds: string[];
  favoriteProductIds: string[];
  weightLog: WeightEntry[];
  orders: OrderRecord[];
  coachAccessUnlocked?: boolean;
  coachTier?: CoachTier;
  coachRequestStatus?: 'none' | 'pending' | 'approved' | 'rejected';
}
