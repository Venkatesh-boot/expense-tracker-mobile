import * as Crypto from 'expo-crypto';

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

export function createId(): string {
  return Crypto.randomUUID();
}

export function formatMoney(amount: number, currency: CurrencyCode): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function todayString(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function displayDate(value: string): string {
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
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}
