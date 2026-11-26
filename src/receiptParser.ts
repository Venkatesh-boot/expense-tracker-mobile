import { CATEGORIES } from './domain';
import type { ExpenseCategory } from './domain';

export type ReceiptSuggestion = {
  title: string;
  amount: string;
  quantity: number;
  unit: string;
  date: string;
  category: ExpenseCategory;
};

const TITLE_NOISE_PATTERN =
  /\b(?:total|receipt|tax\s*invoice|retail\s*invoice|invoice|cash\s*memo|bill\s*of\s*supply|gstin|fssai|phone|tel|mob|date|time|original|duplicate|customer\s*copy|welcome|thank\s*you)\b/i;

export function parseItemizedReceiptText(text: string): ReceiptSuggestion[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((_, index) =>
    isItemizedReceiptHeader(lines.slice(index, index + 3).join(' '))
  );
  if (headerIndex < 0) return [];

  const date = extractDateFromLines(lines);
  const rows: ReceiptSuggestion[] = [];
  const hasHsnColumn = /\bhsn\b/i.test(lines.slice(headerIndex, headerIndex + 3).join(' '));
  let pendingRow = '';

  for (const line of lines.slice(headerIndex + 1)) {
    if (/^(?:items?\s*:|\b(?:sub\s*total|discount|grand\s*total|net\s*amount|total\s*due|amount\s*paid|balance\s*due)\b)/i.test(line)) {
      if (pendingRow) {
        const suggestion = parseItemizedRow(pendingRow, hasHsnColumn, date, text);
        if (suggestion) rows.push(suggestion);
        pendingRow = '';
      }
      if (rows.length > 0) break;
      continue;
    }
    if (/^[\s=|_*—-]+$/.test(line)) continue;

    const rowStart = line.match(/^\s*(?:#\s*)?(\d{1,3})\s+(.+?)\s*$/);
    if (rowStart && !/^\d+\s*[x×]\s*(?:rs\.?|₹)/i.test(rowStart[2])) {
      if (pendingRow) {
        const suggestion = parseItemizedRow(pendingRow, hasHsnColumn, date, text);
        if (suggestion) rows.push(suggestion);
      }
      pendingRow = rowStart[2];
    } else if (!/^\(?\s*\d+\s*[x×]\s*(?:rs\.?|₹)/i.test(line)) {
      const combined = pendingRow
        ? parseItemizedRow(`${pendingRow} ${line}`, hasHsnColumn, date, text)
        : null;
      if (combined) {
        rows.push(combined);
        pendingRow = '';
        continue;
      }

      const standalone = parseItemizedRow(line, hasHsnColumn, date, text);
      if (standalone) {
        if (pendingRow) {
          const previous = parseItemizedRow(pendingRow, hasHsnColumn, date, text);
          if (previous) rows.push(previous);
        }
        rows.push(standalone);
        pendingRow = '';
      } else if (pendingRow) {
        pendingRow = `${pendingRow} ${line}`;
      } else {
        pendingRow = line;
      }
    }
  }

  if (pendingRow) {
    const suggestion = parseItemizedRow(pendingRow, hasHsnColumn, date, text);
    if (suggestion) rows.push(suggestion);
  }

  return rows;
}

function isItemizedReceiptHeader(line: string): boolean {
  return /\b(?:item|description)\b.*\bqty\b.*\b(?:rate|price)\b.*\b(?:amount|amt)\b/i.test(line);
}

function parseItemizedRow(
  row: string,
  hasHsnColumn: boolean,
  date: string,
  receiptText: string
): ReceiptSuggestion | null {
  const unitMatch = hasHsnColumn ? null : row.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s*(kilograms?|kgs?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|ltrs?|l|grams?|gms?|gm|g|kilomet(?:er|re)s?|kms?|km|pcs?|pieces?|units?|packs?|pkt|packets?|dozen|boxes?|bottles?)\s+(?:₹|rs\.?|inr|n)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:₹|rs\.?|inr|n)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i
  );
  const numericMatch = row.match(
    /^(.+?)\s+(\d+(?:\.\d+)?)\s+(?:₹|rs\.?|inr|n)?\s*([\d,]+(?:\.\d{1,2})?)\s+(?:₹|rs\.?|inr|n)?\s*([\d,]+(?:\.\d{1,2})?)\s*$/i
  );
  const title = (unitMatch?.[1] ?? numericMatch?.[1])?.trim().replace(/\s+/g, ' ');
  const quantityText = unitMatch?.[2] ?? numericMatch?.[2];
  const packageMeasure = unitMatch ? null : extractPackageMeasure(title || '');
  const amountText = unitMatch?.[5] ?? numericMatch?.[4];
  const purchasedQuantity = Number(quantityText);
  const quantity = packageMeasure
    ? purchasedQuantity * packageMeasure.quantity
    : purchasedQuantity;
  const unit = unitMatch
    ? normalizeUnit(unitMatch[3])
    : packageMeasure?.unit ?? 'pc';
  const amount = amountText ? Number(amountText.replace(/,/g, '')) : 0;
  if (!title || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(amount) || amount <= 0) {
    return null;
  }

  const itemCategory = guessCategory(title);
  return {
    title: title.slice(0, 160),
    amount: amount.toFixed(2),
    quantity,
    unit,
    date,
    category: itemCategory === 'Other' ? guessCategory(receiptText) : itemCategory,
  };
}

export function parseReceiptText(text: string): ReceiptSuggestion {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const totalLine = [...lines]
    .reverse()
    .find((line) => /\b(grand\s*total|total\s*due|amount\s*due|total)\b/i.test(line) &&
      !/\b(sub\s*total|taxable\s*total)\b/i.test(line));
  const amountSource = totalLine || [...lines].reverse().find((line) => /\d/.test(line));
  const amountMatch = amountSource
    ?.replace(/,/g, '')
    .match(/(?:₹|rs\.?|inr|\$|€|£)?\s*(\d+(?:\.\d{1,2})?)/i);
  const amount = amountMatch ? Number(amountMatch[1]) : 0;

  const title =
    lines.find(
      (line) => /[a-z]{2,}/i.test(line) && !TITLE_NOISE_PATTERN.test(line)
    ) || 'Receipt expense';
  const date = extractDateFromLines(lines);
  const category = guessCategory(`${title}\n${text}`);
  const packageMeasure = extractPackageMeasure(title);

  return {
    title: title.slice(0, 60),
    amount: amount > 0 ? amount.toFixed(2) : '',
    quantity: packageMeasure?.quantity ?? 1,
    unit: packageMeasure?.unit ?? 'pc',
    date,
    category,
  };
}

function extractDateFromLines(lines: string[]): string {
  for (const line of lines) {
    const isoMatch = line.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      const iso = toIsoDate(isoMatch[3], isoMatch[2], isoMatch[1]);
      if (iso) return iso;
    }
    const dmyMatch = line.match(/\b(\d{1,2})[-/\s]([a-z]{3,9}|\d{1,2})[-/,\s]+(\d{2,4})\b/i);
    if (dmyMatch) {
      const first = Number(dmyMatch[1]);
      const secondNum = /^\d+$/.test(dmyMatch[2]) ? Number(dmyMatch[2]) : null;
      if (secondNum !== null && first <= 12 && secondNum > 12) {
        const iso = toIsoDate(dmyMatch[2], dmyMatch[1], dmyMatch[3]);
        if (iso) return iso;
      }
      const iso = toIsoDate(dmyMatch[1], dmyMatch[2], dmyMatch[3]);
      if (iso) return iso;
    }
  }
  return '';
}

function extractPackageMeasure(title: string): { quantity: number; unit: string } | null {
  const match = title.match(
    /(?:^|\s)(\d+(?:\.\d+)?)\s*(kilograms?|kgs?|kg|millilit(?:er|re)s?|ml|lit(?:er|re)s?|ltrs?|l|grams?|gms?|gm|g|kilomet(?:er|re)s?|kms?|km|pieces?|pcs?|pc|units?|packs?|pkt|packets?|dozen|boxes?|bottles?)\s*$/i
  );
  if (!match) return null;
  return {
    quantity: Number(match[1]),
    unit: normalizeUnit(match[2]),
  };
}

function normalizeUnit(unit: string): string {
  const value = unit.toLowerCase();
  if (/^(?:kilograms?|kgs?)$/.test(value)) return 'kg';
  if (/^(?:grams?|gms?|gm)$/.test(value)) return 'g';
  if (/^(?:liters?|litres?|ltrs?|l)$/.test(value)) return 'L';
  if (/^(?:milliliters?|millilitres?|ml)$/.test(value)) return 'mL';
  if (/^(?:kilometers?|kilometres?|kms?|km)$/.test(value)) return 'km';
  if (/^(?:pieces?|pcs?|pc)$/.test(value)) return 'pc';
  if (/^units?$/.test(value)) return 'unit';
  if (/^(?:packs?|pkt|packets?)$/.test(value)) return 'pack';
  if (/^boxes?$/.test(value)) return 'box';
  if (/^bottles?$/.test(value)) return 'bottle';
  return value;
}

function toIsoDate(dayText: string, monthText: string, yearText: string): string {
  const day = Number(dayText);
  const month = /^\d+$/.test(monthText)
    ? Number(monthText)
    : [
        'jan',
        'feb',
        'mar',
        'apr',
        'may',
        'jun',
        'jul',
        'aug',
        'sep',
        'oct',
        'nov',
        'dec',
      ].findIndex((monthName) => monthText.toLowerCase().startsWith(monthName)) + 1;
  let year = Number(yearText);
  if (year < 100) {
    year += year < 50 ? 2000 : 1900;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return '';
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function guessCategory(text: string): ExpenseCategory {
  const value = text.toLowerCase();
  if (/grocery|supermarket|vegetable|market|mart\b/.test(value)) return 'Groceries';
  if (/restaurant|cafe|coffee|food|bakery|pizza|dining/.test(value)) return 'Food';
  if (/fuel|petrol|gas station|taxi|uber|bus|metro/.test(value)) return 'Transport';
  if (/electricity|water bill|internet|mobile bill|utility/.test(value)) return 'Bills';
  if (/pharmacy|medical|hospital|clinic/.test(value)) return 'Health';
  if (/hardware|furniture|home/.test(value)) return 'Home';
  if (/store|shopping|mall|clothing/.test(value)) return 'Shopping';
  return CATEGORIES[CATEGORIES.length - 1];
}
