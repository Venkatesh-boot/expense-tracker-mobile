import test from 'node:test';
import assert from 'node:assert/strict';
import { parseItemizedReceiptText, parseReceiptText } from '../src/receiptParser';

test('parseReceiptText skips invoice noise lines and picks merchant, total, and ISO date', () => {
  const sample = [
    'TAX INVOICE',
    'GSTIN: 29ABCDE1234F1Z5',
    'Green Valley Supermarket',
    'Date: 2026-11-18',
    'Subtotal 420.00',
    'Grand Total Rs. 450.50',
  ].join('\n');

  const parsed = parseReceiptText(sample);
  assert.equal(parsed.title, 'Green Valley Supermarket');
  assert.equal(parsed.amount, '450.50');
  assert.equal(parsed.date, '2026-11-18');
  assert.equal(parsed.category, 'Groceries');
});

test('parseReceiptText handles MM/DD/YYYY when day > 12', () => {
  const sample = [
    'Blue Bottle Cafe',
    '11/24/2026',
    'Total $14.25',
  ].join('\n');

  const parsed = parseReceiptText(sample);
  assert.equal(parsed.date, '2026-11-24');
  assert.equal(parsed.amount, '14.25');
  assert.equal(parsed.category, 'Food');
});

test('parseItemizedReceiptText extracts multiple bill items with per-item categories and measures', () => {
  const sample = [
    'Fresh Mart',
    'Date: 14-Nov-2026',
    'Item Qty Rate Amount',
    '1 Organic Milk 1 L 60.00 60.00',
    '2 Paracetamol Pharmacy 2 25.00 50.00',
    '3 Apples 500 g 120.00 120.00',
    'Grand Total 230.00',
  ].join('\n');

  const items = parseItemizedReceiptText(sample);
  assert.equal(items.length, 3);
  assert.deepEqual(items[0], {
    title: 'Organic Milk',
    quantity: 1,
    unit: 'L',
    amount: '60.00',
    date: '2026-11-14',
    category: 'Groceries',
  });
  assert.equal(items[1].title, 'Paracetamol Pharmacy');
  assert.equal(items[1].category, 'Health');
  assert.equal(items[2].quantity, 500);
  assert.equal(items[2].unit, 'g');
  assert.equal(items[2].category, 'Groceries');
});
