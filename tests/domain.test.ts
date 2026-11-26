import test from 'node:test';
import assert from 'node:assert/strict';
import { displayDate, formatMoney, getCurrencyLocale, todayString } from '../src/domain';

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
