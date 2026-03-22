export const CATEGORIES = [
  { id: 'fuel', name: 'Fuel', icon: '\u26FD', color: '#3B82F6' },
  { id: 'food', name: 'Food', icon: '\uD83C\uDF54', color: '#F97316' },
  { id: 'drinks', name: 'Drinks', icon: '\uD83C\uDF7A', color: '#EAB308' },
  { id: 'going-out', name: 'Going Out', icon: '\uD83C\uDF89', color: '#8B5CF6' },
  { id: 'grooming', name: 'Grooming', icon: '\uD83D\uDC88', color: '#EC4899' },
  { id: 'transport', name: 'Transport', icon: '\uD83D\uDE8C', color: '#06B6D4' },
  { id: 'shopping', name: 'Shopping', icon: '\uD83D\uDECD\uFE0F', color: '#14B8A6' },
  { id: 'bills', name: 'Bills', icon: '\uD83D\uDCC4', color: '#6366F1' },
  { id: 'health', name: 'Health', icon: '\uD83D\uDC8A', color: '#22C55E' },
  { id: 'entertainment', name: 'Entertainment', icon: '\uD83C\uDFAE', color: '#F43F5E' },
  { id: 'coffee', name: 'Coffee', icon: '\u2615', color: '#92400E' },
  { id: 'other', name: 'Other', icon: '\uD83D\uDCCC', color: '#64748B' },
]

export const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_NAMES_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function getCategoryById(id) {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]
}

export function formatCurrency(amount) {
  return '\u20AC' + Math.abs(amount).toFixed(2)
}

export function formatDate(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(d) {
  const date = typeof d === 'string' ? new Date(d + 'T00:00:00') : d
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

// Python weekday (Mon=0) → JS getDay (Sun=0)
export function pyDayToJs(pyDay) {
  return (pyDay + 1) % 7
}

// JS getDay (Sun=0) → Python weekday (Mon=0)
export function jsDayToPy(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1
}
