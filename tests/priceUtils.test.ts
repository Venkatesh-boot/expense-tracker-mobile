import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProductPriceHistories } from '../src/priceUtils';
import type { Expense } from '../src/domain';

function makeExpense(
  overrides: Partial<Expense> & { id: string; title: string; date: string; amount: number }
): Expense {
  return {
    quantity: 1,
    unit: 'pc',
    category: 'Groceries',
    subcategory: 'Pantry',
    paidBy: 'm1',
    notes: '',
    createdAt: `${overrides.date}T09:00:00.000Z`,
    ...overrides,
  };
}

test('buildProductPriceHistories computes unit price trends and normalizes g/kg', () => {
  const expenses: Expense[] = [
    makeExpense({ id: '1', title: 'Apples', date: '2026-11-01', amount: 100, quantity: 500, unit: 'g' }),
    makeExpense({ id: '2', title: 'apples', date: '2026-11-15', amount: 240, quantity: 1, unit: 'kg' }),
    makeExpense({ id: '3', title: 'Milk', date: '2026-11-10', amount: 60, quantity: 1, unit: 'L' }),
    makeExpense({ id: '4', title: 'Milk', date: '2026-11-20', amount: 130, quantity: 2, unit: 'L' }),
    makeExpense({ id: '5', title: 'Bread', date: '2026-11-22', amount: 45, quantity: 1, unit: 'pack' }),
  ];

  const histories = buildProductPriceHistories(expenses);
  assert.equal(histories.length, 3);

  // Apples went 200/kg -> 240/kg (+20%)
  const apples = histories[0];
  assert.equal(apples.key, 'apples');
  assert.equal(apples.unit, 'kg');
  assert.equal(apples.firstPrice, 200);
  assert.equal(apples.latestPrice, 240);
  assert.equal(apples.changePercent, 20);
  assert.equal(apples.points[1].deltaPercentFromPrev, 20);

  // Milk went 60/L -> 65/L (+8.3%)
  const milk = histories[1];
  assert.equal(milk.key, 'milk');
  assert.equal(milk.firstPrice, 60);
  assert.equal(milk.latestPrice, 65);
  assert.equal(milk.changePercent, 8.3);

  // Single-entry item sorted after multi-entry items
  assert.equal(histories[2].key, 'bread');
  assert.equal(histories[2].changePercent, 0);
});
