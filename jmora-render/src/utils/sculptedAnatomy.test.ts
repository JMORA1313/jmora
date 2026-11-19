import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompleteSculptedAnatomy, type AnatomyRegionId } from './sculptedAnatomy';

const REQUIRED_MUSCLES: AnatomyRegionId[] = [
  'chest',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'traps',
  'lats',
  'lower-back',
  'glutes',
  'hamstrings',
  'calves',
];

test('buildCompleteSculptedAnatomy generates all 13 clickable muscle regions with valid geometry', () => {
  const parts = buildCompleteSculptedAnatomy();
  const regionTriCounts = new Map<AnatomyRegionId, number>();

  let minY = Infinity;
  let maxY = -Infinity;

  for (const part of parts) {
    const pos = part.geometry.getAttribute('position');
    const norm = part.geometry.getAttribute('normal');
    const col = part.geometry.getAttribute('color');
    const idx = part.geometry.getIndex();

    assert.ok(pos && pos.count > 0, `Empty positions for ${part.regionId}`);
    assert.ok(norm && norm.count === pos.count, `Normals mismatch for ${part.regionId}`);
    assert.ok(col && col.count === pos.count, `AO colors mismatch for ${part.regionId}`);
    assert.ok(idx && idx.count >= 3, `Empty indices for ${part.regionId}`);

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      assert.equal(Number.isFinite(pos.getX(i)), true);
      assert.equal(Number.isFinite(y), true);
      assert.equal(Number.isFinite(pos.getZ(i)), true);
      assert.equal(Number.isFinite(norm.getX(i)), true);
      assert.equal(Number.isFinite(norm.getY(i)), true);
      assert.equal(Number.isFinite(norm.getZ(i)), true);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    regionTriCounts.set(
      part.regionId,
      (regionTriCounts.get(part.regionId) ?? 0) + idx.count / 3
    );
    part.geometry.dispose();
  }

  for (const muscleId of REQUIRED_MUSCLES) {
    const tris = regionTriCounts.get(muscleId) ?? 0;
    assert.ok(tris > 20, `Expected >20 triangles for muscle "${muscleId}", got ${tris}`);
  }

  // Grounded feet near y=0 and head crown near y=2.18
  assert.ok(minY >= -0.02 && minY <= 0.02, `Expected grounded feet near y=0, got ${minY}`);
  assert.ok(maxY >= 2.1 && maxY <= 2.25, `Expected head crown near y=2.18, got ${maxY}`);

  // Verify outward normals: chest faces +Z, glutes face -Z (not inside-out!)
  const parts2 = buildCompleteSculptedAnatomy();
  let chestNzSum = 0;
  let gluteNzSum = 0;
  for (const part of parts2) {
    const norm = part.geometry.getAttribute('normal');
    if (part.regionId === 'chest') {
      for (let i = 0; i < norm.count; i++) chestNzSum += norm.getZ(i);
    } else if (part.regionId === 'glutes') {
      for (let i = 0; i < norm.count; i++) gluteNzSum += norm.getZ(i);
    }
    part.geometry.dispose();
  }
  assert.ok(chestNzSum > 0, `Expected chest normals to face +Z, got sum ${chestNzSum}`);
  assert.ok(gluteNzSum < 0, `Expected glutes normals to face -Z, got sum ${gluteNzSum}`);
});
