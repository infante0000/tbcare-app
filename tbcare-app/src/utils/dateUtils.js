/**
 * Returns today's date as YYYY-MM-DD using the USER'S LOCAL timezone.
 * Fixes the UTC offset bug where e.g. Philippine users (UTC+8) see
 * yesterday's date after midnight UTC but before 8AM local time.
 */
export const localToday = () => {
  const now = new Date()
  const y   = now.getFullYear()
  const m   = String(now.getMonth() + 1).padStart(2, '0')
  const d   = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Converts any Date object to YYYY-MM-DD in local time.
 */
export const toLocalDateStr = (date = new Date()) => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parses a YYYY-MM-DD string into a Date at local midnight.
 * Avoids the UTC midnight shift that new Date('YYYY-MM-DD') causes.
 */
export const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Returns the last N days as YYYY-MM-DD strings in local time,
 * oldest first. Replaces the UTC-based loop used in logOps.
 */
export const lastNLocalDays = (n = 7) => {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toLocalDateStr(d))
  }
  return days
}

/**
 * Format a YYYY-MM-DD string for display using local time.
 * e.g. "May 10, 2026"
 */
export const formatDisplay = (dateStr, options = {}) => {
  const date = parseLocalDate(dateStr)
  return date.toLocaleDateString('en-PH', {
    month: 'long', day: 'numeric', year: 'numeric',
    ...options,
  })
}