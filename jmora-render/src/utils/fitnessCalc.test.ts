import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDailyTargets } from './fitnessCalc';

test('calculateDailyTargets returns accurate BMI, hydration, and protein range', () => {
  const res = calculateDailyTargets(75, 178, 'moderate');
  assert.equal(res.bmi, 23.7);
  assert.equal(res.bmiCategory, 'healthy');
  assert.equal(res.waterLiters, 2.9);
  assert.equal(res.mineralBottles500ml, 6);
  assert.equal(res.proteinMinG, 120);
  assert.equal(res.proteinMaxG, 150);
});

test('calculateDailyTargets clamps out-of-range inputs safely', () => {
  const res = calculateDailyTargets(-10, 50, 'intense');
  assert.ok(res.waterLiters >= 1.3);
  assert.ok(res.proteinMinG >= 48);
});
