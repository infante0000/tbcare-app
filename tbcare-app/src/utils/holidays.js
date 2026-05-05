// Philippine public holidays 2025–2026
export const PH_HOLIDAYS = [
  '2025-01-01', '2025-02-25', '2025-04-09', '2025-04-17',
  '2025-04-18', '2025-05-01', '2025-06-12', '2025-08-25',
  '2025-11-01', '2025-11-30', '2025-12-08', '2025-12-25',
  '2025-12-30', '2025-12-31',
  '2026-01-01', '2026-04-02', '2026-04-03', '2026-05-01',
  '2026-06-12', '2026-08-31', '2026-11-01', '2026-11-30',
  '2026-12-25', '2026-12-30', '2026-12-31',
]

// Returns true if the given date string (YYYY-MM-DD) is a PH holiday
export const isHoliday = (dateStr) => PH_HOLIDAYS.includes(dateStr)

// If date falls on a holiday or Sunday, move it 1 day earlier
// Keeps shifting until it lands on a safe day
export const adjustForHoliday = (dateStr) => {
  let date = new Date(dateStr)
  const fmt = (d) => d.toISOString().split('T')[0]
  let adjusted = false

  while (
    PH_HOLIDAYS.includes(fmt(date)) ||
    date.getDay() === 0 || date.getDay() === 6
  ) {
    date.setDate(date.getDate() - 1)
    adjusted = true
  }

  return {
    date: fmt(date),
    adjusted,
    original: dateStr,
  }
}

// Get holiday name for display (if it exists)
export const HOLIDAY_NAMES = {
  '2026-01-01': "New Year's Day",
  '2026-04-02': 'Maundy Thursday',
  '2026-04-03': 'Good Friday',
  '2026-05-01': 'Labor Day',
  '2026-06-12': 'Independence Day',
  '2026-08-31': 'National Heroes Day',
  '2026-11-01': "All Saints' Day",
  '2026-11-30': "Bonifacio Day",
  '2026-12-25': 'Christmas Day',
  '2026-12-30': 'Rizal Day',
  '2026-12-31': "New Year's Eve",
}

export const getHolidayName = (dateStr) =>
  HOLIDAY_NAMES[dateStr] || 'Holiday'