import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTICLES, EXERCISES, MUSCLES, PRODUCTS } from '../data/catalog';
import { performInstantSearch } from './search';

const catalog = {
  muscles: MUSCLES,
  exercises: EXERCISES,
  products: PRODUCTS,
  articles: ARTICLES,
};

test('performInstantSearch finds Persian muscle and exercise matches', () => {
  const res = performInstantSearch('سینه', catalog);
  assert.ok(res.muscles.some((m) => m.id === 'chest'));
  assert.ok(res.exercises.some((e) => e.id === 'ex-incline-db-press'));
  assert.ok(res.totalCount > 0);
});

test('performInstantSearch finds Mineral Water as default store item', () => {
  const res = performInstantSearch('mineral water', catalog);
  assert.ok(res.products.some((p) => p.id === 'prod-mineral-water'));
  assert.equal(catalog.products.length, 1);
});

test('performInstantSearch returns empty results on whitespace query', () => {
  const res = performInstantSearch('   ', catalog);
  assert.equal(res.totalCount, 0);
});
