export const CATEGORIES = [
  'Groceries',
  'Food',
  'Transport',
  'Home',
  'Bills',
  'Health',
  'Shopping',
  'Other',
] as const;

export type ExpenseCategory = (typeof CATEGORIES)[number];

export const SUBCATEGORIES: Record<ExpenseCategory, readonly string[]> = {
  Groceries: ['Vegetables & fruits', 'Meat & seafood', 'Dairy & bakery', 'Pantry', 'Household'],
  Food: ['Restaurant', 'Takeaway', 'Cafe', 'Snacks'],
  Transport: ['Fuel', 'Public transport', 'Taxi', 'Parking'],
  Home: ['Rent', 'Maintenance', 'Furniture', 'Cleaning'],
  Bills: ['Electricity', 'Water', 'Internet', 'Mobile'],
  Health: ['Pharmacy', 'Doctor', 'Medical supplies', 'Insurance'],
  Shopping: ['Clothing', 'Electronics', 'Personal care', 'Other shopping'],
  Other: ['General', 'Education', 'Entertainment', 'Gifts'],
};

export const UNITS = [
  'pc',
  'kg',
  'g',
  'L',
  'mL',
  'pack',
  'box',
  'bottle',
  'dozen',
  'unit',
  'item',
  'km',
] as const;

export type ExpenseUnit = (typeof UNITS)[number];

export const UNIT_LABELS: Record<ExpenseUnit, string> = {
  pc: 'Piece (pc)',
  kg: 'Kilogram (kg)',
  g: 'Gram (g)',
  L: 'Liter (L)',
  mL: 'Milliliter (mL)',
  pack: 'Pack (pack)',
  box: 'Box (box)',
  bottle: 'Bottle (bottle)',
  dozen: 'Dozen (dozen)',
  unit: 'Unit (unit)',
  item: 'Item (item)',
  km: 'Kilometer (km)',
};

/** Strips non-numeric characters from a quantity input while keeping at most one decimal point. */
export function sanitizeQuantityInput(value: string): string {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) return cleaned;
  return `${cleaned.slice(0, dotIndex + 1)}${cleaned.slice(dotIndex + 1).replace(/\./g, '')}`;
}

/** Builds unit dropdown options, preserving any custom or legacy unit on an existing expense. */
export function buildUnitOptions(
  currentUnit?: string
): { value: string; label: string; shortLabel: string }[] {
  const options: { value: string; label: string; shortLabel: string }[] = UNITS.map((unit) => ({
    value: unit,
    label: UNIT_LABELS[unit],
    shortLabel: unit,
  }));
  const trimmed = currentUnit?.trim();
  if (trimmed && !options.some((option) => option.value === trimmed)) {
    options.push({
      value: trimmed,
      label: trimmed,
      shortLabel: trimmed,
    });
  }
  return options;
}

export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP';

export type Expense = {
  id: string;
  title: string;
  amount: number;
  quantity: number;
  unit: string;
  category: ExpenseCategory;
  subcategory: string;
  date: string;
  paidBy: string;
  notes: string;
  createdAt: string;
};

export type FamilyMember = {
  id: string;
  name: string;
};

export type Preferences = {
  currency: CurrencyCode;
  displayName: string;
  selfId: string;
  monthlyBudget?: number;
};

export type BackupDocument = {
  app: 'family-expense-tracker';
  version: 2;
  exportedAt: string;
  preferences: Pick<Preferences, 'currency' | 'displayName'>;
  members: FamilyMember[];
  expenses: Expense[];
};

export const CURRENCIES: CurrencyCode[] = ['INR', 'USD', 'EUR', 'GBP'];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export const CURRENCY_LOCALES: Record<CurrencyCode, string> = {
  INR: 'en-IN',
  USD: 'en-US',
  EUR: 'en-IE',
  GBP: 'en-GB',
};

/** Returns the formatting locale associated with a currency code. */
export function getCurrencyLocale(currency: CurrencyCode): string {
  return CURRENCY_LOCALES[currency] || 'en-US';
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const locale = getCurrencyLocale(currency);
  return `${symbol}${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function todayString(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function displayDate(value: string, locale = 'en-GB'): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1]) ||
    date.getMonth() !== Number(match[2]) - 1 ||
    date.getDate() !== Number(match[3])
  ) {
    return value;
  }
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatMonthLabel(value: string, locale = 'en-GB'): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1);
  return date.toLocaleDateString(locale, {
    month: 'short',
    year: '2-digit',
  });
}
