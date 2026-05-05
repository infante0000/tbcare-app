import Dexie from 'dexie'

// ─── CREATE DATABASE ───────────────────────────────────────────
export const db = new Dexie('TBCareDB')

db.version(1).stores({
  // Medicine directory
  // ++id = auto-increment primary key
  medicines:
    '++id, genericName, brandName, dosage, quantity, reminderEnabled',

  // TB-DOTS clinic directory
  clinics:
    '++id, clinicName, address, contact, doctorName',

  // Side effects diary
  // tag: 'positive' | 'negative'
  // severity: 'mild' | 'moderate' | 'severe'
  diary:
    '++id, date, notes, tag, severity, medicineId',

  // Medication reminders
  // type: 'dose' | 'refill' | 'test'
  reminders:
    '++id, medicineId, time, days, enabled, type',

  // Scheduled events (refills, tests, appointments)
  events:
    '++id, name, date, adjusted',

  // Test results history
  tests:
    '++id, testName, scheduledDate, result, notes',

  // Daily dose logs (used for streak tracking)
  logs:
    '++id, medicineId, date, taken',
})

// ─── MEDICINE OPERATIONS ───────────────────────────────────────
export const medicineOps = {
  // Get all medicines
  getAll: () => db.medicines.toArray(),

  // Add a new medicine
  add: (medicine) =>
    db.medicines.add({
      ...medicine,
      quantity: medicine.quantity || 0,
      totalQuantity: medicine.quantity || 0,
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
    }),

  // Update a medicine by id
  update: (id, changes) => db.medicines.update(id, changes),

  // Delete a medicine by id
  delete: (id) => db.medicines.delete(id),

  // Call this when patient marks a dose as taken
  // Reduces quantity by 1 and triggers low stock alert at 5 or below
  decrementQuantity: async (id) => {
    const med = await db.medicines.get(id)
    if (med && med.quantity > 0) {
      const newQty = med.quantity - 1
      await db.medicines.update(id, { quantity: newQty })
      return newQty
    }
    return 0
  },
}

// ─── DIARY OPERATIONS ──────────────────────────────────────────
export const diaryOps = {
  // Get all entries, newest first
  getAll: () => db.diary.orderBy('date').reverse().toArray(),

  // Get entries for a specific date (YYYY-MM-DD)
  getByDate: (date) => db.diary.where('date').equals(date).toArray(),

  // Add a new diary entry
  add: (entry) =>
    db.diary.add({
      ...entry,
      date: entry.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }),

  // Delete an entry by id
  delete: (id) => db.diary.delete(id),
}

// ─── CLINIC OPERATIONS ─────────────────────────────────────────
export const clinicOps = {
  getAll: () => db.clinics.toArray(),

  add: (clinic) =>
    db.clinics.add({
      ...clinic,
      createdAt: new Date().toISOString(),
    }),

  update: (id, changes) => db.clinics.update(id, changes),

  delete: (id) => db.clinics.delete(id),
}

// ─── EVENT / SCHEDULE OPERATIONS ───────────────────────────────
export const eventOps = {
  // Get all events sorted by date ascending
  getAll: () => db.events.orderBy('date').toArray(),

  add: (event) => db.events.add(event),

  delete: (id) => db.events.delete(id),

  // Get only upcoming events from today onwards
  getUpcoming: async () => {
    const today = new Date().toISOString().split('T')[0]
    const all = await db.events.orderBy('date').toArray()
    return all.filter((e) => e.date >= today)
  },
}

// ─── TEST RESULT OPERATIONS ────────────────────────────────────
export const testOps = {
  getAll: () => db.tests.orderBy('scheduledDate').reverse().toArray(),

  add: (test) =>
    db.tests.add({
      ...test,
      scheduledDate: test.scheduledDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }),

  update: (id, changes) => db.tests.update(id, changes),

  delete: (id) => db.tests.delete(id),
}

// ─── DOSE LOG / STREAK OPERATIONS ─────────────────────────────
export const logOps = {
  // Check if a dose was already logged today for a specific medicine
  alreadyLoggedToday: async (medicineId) => {
    const today = new Date().toISOString().split('T')[0]
    const existing = await db.logs
      .where('date')
      .equals(today)
      .and((log) => log.medicineId === medicineId)
      .first()
    return !!existing
  },

  // Log a dose as taken
  logDose: (medicineId) =>
    db.logs.add({
      medicineId,
      date: new Date().toISOString().split('T')[0],
      taken: true,
      loggedAt: new Date().toISOString(),
    }),

  // Calculate current streak (consecutive days with at least 1 dose logged)
  getStreak: async () => {
    const logs = await db.logs.orderBy('date').reverse().toArray()
    if (!logs.length) return 0

    // Get unique dates only
    const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse()
    if (!uniqueDates.length) return 0

    let streak = 0
    let current = new Date()
    current.setHours(0, 0, 0, 0)

    for (const dateStr of uniqueDates) {
      const logDate = new Date(dateStr)
      logDate.setHours(0, 0, 0, 0)
      const diffDays = Math.round(
        (current - logDate) / (1000 * 60 * 60 * 24)
      )

      if (diffDays <= 1) {
        streak++
        current = logDate
      } else {
        break
      }
    }

    return streak
  },

  // Get logs for the last N days (for adherence chart)
  getLastNDays: async (n = 7) => {
    const dates = []
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    const all = await db.logs.toArray()
    return dates.map((date) => ({
      date,
      taken: all.some((l) => l.date === date),
    }))
  },
}