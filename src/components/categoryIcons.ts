import type { ExpenseCategory } from '../domain';
import type { AppIconName } from './AppIcon';

const CATEGORY_ICON_MAP: Record<ExpenseCategory, AppIconName> = {
  Groceries: 'groceries',
  Food: 'food',
  Transport: 'transport',
  Home: 'home',
  Bills: 'bills',
  Health: 'health',
  Shopping: 'shopping',
  Other: 'other',
};

const SUBCATEGORY_ICON_MAP: Record<string, AppIconName> = {
  // Groceries
  'Vegetables & fruits': 'leaf',
  'Meat & seafood': 'groceries',
  'Dairy & bakery': 'cup',
  Pantry: 'box',
  Household: 'home',
  // Food
  Restaurant: 'food',
  Takeaway: 'box',
  Cafe: 'cup',
  Snacks: 'star',
  // Transport
  Fuel: 'fuel',
  'Public transport': 'bus',
  Taxi: 'transport',
  Parking: 'parking',
  // Home
  Rent: 'home',
  Maintenance: 'wrench',
  Furniture: 'box',
  Cleaning: 'droplet',
  // Bills
  Electricity: 'bolt',
  Water: 'droplet',
  Internet: 'wifi',
  Mobile: 'phone',
  // Health
  Pharmacy: 'health',
  Doctor: 'health',
  'Medical supplies': 'box',
  Insurance: 'shield',
  // Shopping
  Clothing: 'shirt',
  Electronics: 'screen',
  'Personal care': 'droplet',
  'Other shopping': 'shopping',
  // Other
  General: 'tag',
  Education: 'book',
  Entertainment: 'star',
  Gifts: 'gift',
};

/** Returns the geometric icon name for an expense category. */
export function getCategoryIcon(category: string): AppIconName {
  return CATEGORY_ICON_MAP[category as ExpenseCategory] ?? 'other';
}

/** Returns the geometric icon name for an expense subcategory, falling back to its category icon. */
export function getSubcategoryIcon(subcategory: string, category?: string): AppIconName {
  return SUBCATEGORY_ICON_MAP[subcategory] ?? (category ? getCategoryIcon(category) : 'tag');
}
