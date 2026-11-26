import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildProductSuggestions,
  buildUnitOptions,
  displayDate,
  filterProductSuggestions,
  formatMoney,
  getCurrencyLocale,
  getNextThemeChangeDelayMs,
  resolveThemeMode,
  sanitizeQuantityInput,
  todayString,
} from '../src/domain';
import type { Expense } from '../src/domain';

test('formatMoney formats each currency with its appropriate locale grouping', () => {
  assert.equal(formatMoney(100000, 'INR'), '₹1,00,000.00');
  assert.equal(formatMoney(100000, 'USD'), '$100,000.00');
  assert.equal(formatMoney(100000, 'GBP'), '£100,000.00');
  assert.equal(formatMoney(100000, 'EUR'), '€100,000.00');
});

test('getCurrencyLocale maps currencies consistently', () => {
  assert.equal(getCurrencyLocale('INR'), 'en-IN');
  assert.equal(getCurrencyLocale('USD'), 'en-US');
  assert.equal(getCurrencyLocale('EUR'), 'en-IE');
  assert.equal(getCurrencyLocale('GBP'), 'en-GB');
});

test('displayDate validates calendar dates and leaves invalid strings untouched', () => {
  assert.match(displayDate('2026-02-15'), /15\s+Feb\s+2026/);
  assert.equal(displayDate('2026-02-30'), '2026-02-30');
  assert.equal(displayDate('not-a-date'), 'not-a-date');
});

test('todayString formats local YYYY-MM-DD', () => {
  const sample = new Date(2026, 0, 5);
  assert.equal(todayString(sample), '2026-01-05');
});

test('sanitizeQuantityInput strips non-numeric characters and keeps a single decimal point', () => {
  assert.equal(sanitizeQuantityInput('abc'), '');
  assert.equal(sanitizeQuantityInput('12abc.34xyz'), '12.34');
  assert.equal(sanitizeQuantityInput('1.2.3'), '1.23');
  assert.equal(sanitizeQuantityInput('-5.5 kg'), '5.5');
});

test('buildUnitOptions includes standard units and preserves custom legacy units', () => {
  const standard = buildUnitOptions('kg');
  assert.ok(standard.some((option) => option.value === 'kg' && option.shortLabel === 'kg'));
  assert.equal(standard.filter((option) => option.value === 'kg').length, 1);

  const withCustom = buildUnitOptions('cup');
  assert.ok(withCustom.some((option) => option.value === 'cup' && option.label === 'cup'));
});

test('resolveThemeMode switches between light and dark by local clock when auto', () => {
  assert.equal(resolveThemeMode('auto', new Date(2026, 10, 26, 5, 59)), 'dark');
  assert.equal(resolveThemeMode('auto', new Date(2026, 10, 26, 6, 0)), 'light');
  assert.equal(resolveThemeMode('auto', new Date(2026, 10, 26, 17, 59)), 'light');
  assert.equal(resolveThemeMode('auto', new Date(2026, 10, 26, 18, 0)), 'dark');
  assert.equal(resolveThemeMode(undefined, new Date(2026, 10, 26, 12, 0)), 'light');
  assert.equal(resolveThemeMode('dark', new Date(2026, 10, 26, 12, 0)), 'dark');
  assert.equal(resolveThemeMode('light', new Date(2026, 10, 26, 22, 0)), 'light');
});

test('getNextThemeChangeDelayMs targets the upcoming 6 AM or 6 PM boundary', () => {
  const beforeDawn = new Date(2026, 10, 26, 5, 30, 0, 0);
  assert.equal(getNextThemeChangeDelayMs(beforeDawn), 30 * 60 * 1000 + 500);

  const midday = new Date(2026, 10, 26, 17, 0, 0, 0);
  assert.equal(getNextThemeChangeDelayMs(midday), 60 * 60 * 1000 + 500);

  const night = new Date(2026, 10, 26, 23, 0, 0, 0);
  assert.equal(getNextThemeChangeDelayMs(night), 7 * 60 * 60 * 1000 + 500);
});

test('buildProductSuggestions deduplicates by title and preserves latest metadata ordered by frequency', () => {
  const sample: Expense[] = [
    {
      id: '1',
      title: 'milk',
      amount: 60,
      quantity: 1,
      unit: 'L',
      category: 'Groceries',
      subcategory: 'Pantry',
      date: '2026-11-10',
      paidBy: 'm1',
      notes: '',
      createdAt: '2026-11-10T08:00:00Z',
    },
    {
      id: '2',
      title: 'Organic Milk',
      amount: 75,
      quantity: 1,
      unit: 'L',
      category: 'Groceries',
      subcategory: 'Dairy & bakery',
      date: '2026-11-12',
      paidBy: 'm1',
      notes: '',
      createdAt: '2026-11-12T08:00:00Z',
    },
    {
      id: '3',
      title: 'Milk',
      amount: 65,
      quantity: 1,
      unit: 'L',
      category: 'Groceries',
      subcategory: 'Dairy & bakery',
      date: '2026-11-20',
      paidBy: 'm1',
      notes: '',
      createdAt: '2026-11-20T08:00:00Z',
    },
  ];

  const suggestions = buildProductSuggestions(sample);
  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0].title, 'Milk');
  assert.equal(suggestions[0].count, 2);
  assert.equal(suggestions[0].subcategory, 'Dairy & bakery');

  const filtered = filterProductSuggestions(suggestions, 'milk');
  assert.deepEqual(
    filtered.map((item) => item.title),
    ['Milk', 'Organic Milk']
  );
});
