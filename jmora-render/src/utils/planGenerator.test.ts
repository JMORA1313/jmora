import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES } from '../data/catalog';
import { calculateDailyTargets, generatePersonalizedPlan } from './planGenerator';
import type { OnboardingProfile } from '../types/jmora';

const baseProfile: OnboardingProfile = {
  gender: 'female',
  age: 28,
  heightCm: 165,
  weightKg: 60,
  goal: 'glute-growth',
  level: 'intermediate',
  style: 'bodybuilding',
  location: 'gym',
  equipment: ['dumbbell', 'barbell', 'machine'],
  daysPerWeek: 4,
  sessionMinutes: 60,
  wantsDiet: true,
  dietPreference: 'high-protein',
  allergies: '',
  injuries: ['none'],
};

test('calculateDailyTargets returns balanced macros matching calorie budget', () => {
  const targets = calculateDailyTargets(baseProfile);
  assert.ok(targets.calories >= 1350);
  assert.ok(targets.proteinG >= 100);
  assert.ok(targets.carbsG > 0);
  assert.ok(targets.fatG > 0);
});

test('generatePersonalizedPlan builds exact requested days and nutrition meals', () => {
  const plan = generatePersonalizedPlan(baseProfile, EXERCISES);
  assert.equal(plan.weeklyWorkout.length, 4);
  assert.ok(plan.nutrition !== null);
  assert.equal(plan.nutrition?.meals.length, 4);
  for (const day of plan.weeklyWorkout) {
    assert.ok(day.exercises.length >= 2);
  }
});

test('generatePersonalizedPlan swaps unsafe exercises when lower-back injury is reported', () => {
  const injuredProfile: OnboardingProfile = {
    ...baseProfile,
    gender: 'male',
    level: 'pro',
    injuries: ['lower-back'],
  };
  const plan = generatePersonalizedPlan(injuredProfile, EXERCISES);
  const allIds = plan.weeklyWorkout.flatMap((d) => d.exercises.map((e) => e.exerciseId));
  assert.equal(allIds.includes('ex-deadlift'), false);
  assert.ok(plan.safetyNotes.length > 0);
});

test('generatePersonalizedPlan omits nutrition when wantsDiet is false', () => {
  const plan = generatePersonalizedPlan({ ...baseProfile, wantsDiet: false }, EXERCISES);
  assert.equal(plan.nutrition, null);
});
