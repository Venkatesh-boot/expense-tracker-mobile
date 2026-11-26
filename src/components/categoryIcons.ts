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
  Vegetables: 'leaf',
  Fruits: 'leaf',
  Chicken: 'food',
  Mutton: 'food',
  Beef: 'food',
  'Fish & seafood': 'droplet',
  Eggs: 'groceries',
  'Milk & dairy': 'cup',
  'Bakery & bread': 'cup',
  'Rice & grains': 'box',
  'Pulses & spices': 'box',
  'Oil & ghee': 'droplet',
  Beverages: 'cup',
  Pantry: 'box',
  Household: 'home',
  'Vegetables & fruits': 'leaf',
  'Meat & seafood': 'groceries',
  'Dairy & bakery': 'cup',

  // Food
  Restaurant: 'food',
  Takeaway: 'box',
  'Food delivery': 'transport',
  'Cafe & coffee': 'cup',
  'Bakery & desserts': 'star',
  'Street food': 'food',
  Snacks: 'star',
  Breakfast: 'cup',
  'Lunch & dinner': 'food',
  Cafe: 'cup',

  // Transport
  Petrol: 'fuel',
  Diesel: 'fuel',
  'EV charging': 'bolt',
  'Bus & metro': 'bus',
  Train: 'bus',
  'Auto & taxi': 'transport',
  Flight: 'trend',
  'Parking & toll': 'parking',
  'Vehicle service': 'wrench',
  Fuel: 'fuel',
  'Public transport': 'bus',
  Taxi: 'transport',
  Parking: 'parking',

  // Home
  Rent: 'home',
  Maintenance: 'wrench',
  'Plumbing & electrical': 'bolt',
  Appliances: 'screen',
  Furniture: 'box',
  'Cleaning supplies': 'droplet',
  'Maid & help': 'family',
  Gardening: 'leaf',
  Cleaning: 'droplet',

  // Bills
  Electricity: 'bolt',
  Water: 'droplet',
  'Gas / LPG': 'fuel',
  'Internet & Wi-Fi': 'wifi',
  'Mobile recharge': 'phone',
  'DTH & streaming': 'screen',
  'Society & HOA': 'home',
  Internet: 'wifi',
  Mobile: 'phone',

  // Health
  'Pharmacy & medicines': 'health',
  'Doctor consultation': 'health',
  'Lab tests & diagnostics': 'bills',
  'Dental & optical': 'health',
  'Medical supplies': 'box',
  'Fitness & gym': 'trend',
  'Health insurance': 'shield',
  Pharmacy: 'health',
  Doctor: 'health',
  Insurance: 'shield',

  // Shopping
  Clothing: 'shirt',
  Footwear: 'shopping',
  Electronics: 'screen',
  'Cosmetics & skincare': 'star',
  'Personal care': 'droplet',
  'Home decor': 'home',
  'Toys & baby': 'gift',
  'Other shopping': 'shopping',

  // Other
  General: 'tag',
  'School & tuition': 'book',
  'Books & stationery': 'book',
  'Movies & outings': 'star',
  'Travel & stays': 'transport',
  'Gifts & celebrations': 'gift',
  'Donations & charity': 'gift',
  'Pet care': 'star',
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
