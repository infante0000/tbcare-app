import Dexie from 'dexie'

export const db = new Dexie('TBCareDB')

db.version(2).stores({
  medicines: '++id, genericName, brandName, dosage, quantity, reminderEnabled',
  clinics:   '++id, clinicName, address, contact, doctorName',
  diary:     '++id, date, notes, tag, severity, medicineId',
  reminders: '++id, medicineId, time, days, enabled, type',
  events:    '++id, name, date, adjusted, completed',
  tests:     '++id, testName, scheduledDate, result, notes',
  // date: YYYY-MM-DD, intakeQty: how many tablets taken in one sitting
  logs:      '++id, medicineId, date, taken, intakeQty',
})

// ─── MEDICINE OPERATIONS ───────────────────────────────────────
export const medicineOps = {
  getAll: () => db.medicines.toArray(),

  add: (medicine) =>
    db.medicines.add({
      ...medicine,
      quantity:        medicine.quantity || 0,
      totalQuantity:   medicine.quantity || 0,
      intakeQty:       medicine.intakeQty || 1, // tablets per sitting
      reminderEnabled: false,
      createdAt:       new Date().toISOString(),
    }),

  // Full edit support
  update: (id, changes) => db.medicines.update(id, changes),

  delete: (id) => db.medicines.delete(id),

  // Decrement by intakeQty (e.g. 3 tablets at once)
  decrementQuantity: async (id, qty = 1) => {
    const med = await db.medicines.get(id)
    if (!med) return 0
    const newQty = Math.max(0, (med.quantity || 0) - qty)
    await db.medicines.update(id, { quantity: newQty })
    return newQty
  },

  // Add quantity when refill is completed
  addQuantity: async (id, qty) => {
    const med = await db.medicines.get(id)
    if (!med) return 0
    const newQty = (med.quantity || 0) + qty
    const newTotal = Math.max(med.totalQuantity || 0, newQty)
    await db.medicines.update(id, {
      quantity:      newQty,
      totalQuantity: newTotal,
    })
    return newQty
  },
}

// ─── DIARY OPERATIONS ──────────────────────────────────────────
export const diaryOps = {
  getAll: () => db.diary.orderBy('date').reverse().toArray(),

  getByDate: (date) => db.diary.where('date').equals(date).toArray(),

  add: (entry) =>
    db.diary.add({
      ...entry,
      date:      entry.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    }),

  // Edit support
  update: (id, changes) => db.diary.update(id, changes),

  delete: (id) => db.diary.delete(id),
}

// ─── CLINIC OPERATIONS ─────────────────────────────────────────
export const clinicOps = {
  getAll: () => db.clinics.toArray(),

  add: (clinic) =>
    db.clinics.add({ ...clinic, createdAt: new Date().toISOString() }),

  // Edit support
  update: (id, changes) => db.clinics.update(id, changes),

  delete: (id) => db.clinics.delete(id),
}

// ─── EVENT / SCHEDULE OPERATIONS ───────────────────────────────
export const eventOps = {
  getAll: () => db.events.orderBy('date').toArray(),

  add: (event) => db.events.add({ ...event, completed: false }),

  update: (id, changes) => db.events.update(id, changes),

  delete: (id) => db.events.delete(id),

  // Mark refill as done — also triggers quantity add in the page
  complete: (id) => db.events.update(id, { completed: true }),

  getUpcoming: async () => {
    const today = new Date().toISOString().split('T')[0]
    const all   = await db.events.orderBy('date').toArray()
    return all.filter((e) => e.date >= today && !e.completed)
  },

  getAll_: () => db.events.orderBy('date').reverse().toArray(),
}

// ─── TEST RESULT OPERATIONS ────────────────────────────────────
export const testOps = {
  getAll: () => db.tests.orderBy('scheduledDate').reverse().toArray(),

  add: (test) =>
    db.tests.add({
      ...test,
      scheduledDate: test.scheduledDate || new Date().toISOString().split('T')[0],
      createdAt:     new Date().toISOString(),
    }),

  update: (id, changes) => db.tests.update(id, changes),

  delete: (id) => db.tests.delete(id),
}

// ─── DOSE LOG / STREAK OPERATIONS ─────────────────────────────
export const logOps = {
  // Check if a specific medicine was already logged on a given date
  alreadyLogged: async (medicineId, date) => {
    const existing = await db.logs
      .where('date').equals(date)
      .and((log) => log.medicineId === medicineId)
      .first()
    return !!existing
  },

  // Kept for backward compat
  alreadyLoggedToday: async (medicineId) => {
    const today = new Date().toISOString().split('T')[0]
    return logOps.alreadyLogged(medicineId, today)
  },

  // Log a dose — supports any past date and custom intakeQty
  logDose: (medicineId, date, intakeQty = 1) =>
    db.logs.add({
      medicineId,
      date,
      taken:     true,
      intakeQty,
      loggedAt:  new Date().toISOString(),
    }),

  // Remove a log entry (undo)
  removeLog: async (medicineId, date) => {
    const log = await db.logs
      .where('date').equals(date)
      .and((l) => l.medicineId === medicineId)
      .first()
    if (log) await db.logs.delete(log.id)
  },

  getStreak: async () => {
    const logs = await db.logs.orderBy('date').reverse().toArray()
    if (!logs.length) return 0
    const uniqueDates = [...new Set(logs.map((l) => l.date))].sort().reverse()
    let streak  = 0
    let current = new Date()
    current.setHours(0, 0, 0, 0)
    for (const dateStr of uniqueDates) {
      const logDate = new Date(dateStr)
      logDate.setHours(0, 0, 0, 0)
      const diff = Math.round((current - logDate) / 86400000)
      if (diff <= 1) { streak++; current = logDate }
      else break
    }
    return streak
  },

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

  // Get all logs for a specific date
  getByDate: (date) => db.logs.where('date').equals(date).toArray(),
}