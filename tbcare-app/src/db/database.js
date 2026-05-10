import Dexie from 'dexie'
import { lastNLocalDays } from '../utils/dateUtils'
import { lastNLocalDays, toLocalDateStr } from '../utils/dateUtils'

export const db = new Dexie('TBCareDB')

db.version(3).stores({
  medicines: '++id, genericName, brandName, dosage, quantity, reminderEnabled',
  clinics:   '++id, clinicName, address, contact, doctorName',
  diary:     '++id, date, notes, tag, severity, medicineId',
  reminders: '++id, medicineId, time, days, enabled, type',
  events:    '++id, name, date, adjusted, completed',
  tests:     '++id, testName, scheduledDate, result, notes',
  logs:      '++id, medicineId, date, taken, intakeQty',
  patient:   '++id, key, value',  // key-value store for patient info
})

// ─── MEDICINE OPERATIONS ───────────────────────────────────────
export const medicineOps = {
  getAll: () => db.medicines.toArray(),

  add: (medicine) =>
    db.medicines.add({
      ...medicine,
      quantity:        medicine.quantity || 0,
      totalQuantity:   medicine.quantity || 0,
      intakeQty:       medicine.intakeQty || 1,
      reminderEnabled: false,
      createdAt:       new Date().toISOString(),
    }),

  update: (id, changes) => db.medicines.update(id, changes),
  delete: (id)          => db.medicines.delete(id),

  decrementQuantity: async (id, qty = 1) => {
    const med = await db.medicines.get(id)
    if (!med) return 0
    const newQty = Math.max(0, (med.quantity || 0) - qty)
    await db.medicines.update(id, { quantity: newQty })
    return newQty
  },

  addQuantity: async (id, qty) => {
    const med = await db.medicines.get(id)
    if (!med) return 0
    const newQty   = (med.quantity || 0) + qty
    const newTotal = Math.max(med.totalQuantity || 0, newQty)
    await db.medicines.update(id, { quantity: newQty, totalQuantity: newTotal })
    return newQty
  },
}

// ─── DIARY OPERATIONS ──────────────────────────────────────────
export const diaryOps = {
  getAll:    () => db.diary.orderBy('date').reverse().toArray(),
  getByDate: (date) => db.diary.where('date').equals(date).toArray(),
  add:       (entry) => db.diary.add({
    ...entry,
    date:      entry.date || new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString(),
  }),
  update: (id, changes) => db.diary.update(id, changes),
  delete: (id)          => db.diary.delete(id),
}

// ─── CLINIC OPERATIONS ─────────────────────────────────────────
export const clinicOps = {
  getAll: () => db.clinics.toArray(),
  add:    (clinic) => db.clinics.add({ ...clinic, createdAt: new Date().toISOString() }),
  update: (id, changes) => db.clinics.update(id, changes),
  delete: (id)          => db.clinics.delete(id),
}

// ─── EVENT / SCHEDULE OPERATIONS ───────────────────────────────
export const eventOps = {
  getAll:  () => db.events.orderBy('date').toArray(),
  getAll_: () => db.events.orderBy('date').reverse().toArray(),
  add:     (event) => db.events.add({ ...event, completed: false }),
  update:  (id, changes) => db.events.update(id, changes),
  delete:  (id)          => db.events.delete(id),
  complete: (id)         => db.events.update(id, { completed: true }),
  getUpcoming: async () => {
    const today = new Date().toISOString().split('T')[0]
    const all   = await db.events.orderBy('date').toArray()
    return all.filter((e) => e.date >= today && !e.completed)
  },
}

// ─── TEST RESULT OPERATIONS ────────────────────────────────────
export const testOps = {
  getAll: () => db.tests.orderBy('scheduledDate').reverse().toArray(),
  add:    (test) => db.tests.add({
    ...test,
    scheduledDate: test.scheduledDate || new Date().toISOString().split('T')[0],
    createdAt:     new Date().toISOString(),
  }),
  update: (id, changes) => db.tests.update(id, changes),
  delete: (id)          => db.tests.delete(id),
}

// ─── DOSE LOG / STREAK OPERATIONS ─────────────────────────────
export const logOps = {
  alreadyLogged: async (medicineId, date) => {
    const existing = await db.logs
      .where('date').equals(date)
      .and((log) => log.medicineId === medicineId)
      .first()
    return !!existing
  },

  alreadyLoggedToday: async (medicineId) => {
    const today = new Date().toISOString().split('T')[0]
    return logOps.alreadyLogged(medicineId, today)
  },

logDose: (medicineId, date, intakeQty = 1) => {
  const safeDate = date || toLocalDateStr()
  return db.logs.add({
    medicineId,
    date:     safeDate,
    taken:    true,
    intakeQty,
    loggedAt: new Date().toISOString(),
  })
},

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
    let streak = 0
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
  const dates = lastNLocalDays(n)
  const all   = await db.logs.toArray()
  return dates.map((date) => ({
    date,
    taken: all.some((l) => l.date === date),
  }))
},

  getAll: () => db.logs.orderBy('date').reverse().toArray(),

  getByDate: (date) => db.logs.where('date').equals(date).toArray(),
}

// ─── PATIENT INFO ──────────────────────────────────────────────
export const patientOps = {
  get: async () => {
    const rows = await db.patient.toArray()
    const info = {}
    rows.forEach((r) => { info[r.key] = r.value })
    return info
  },

  set: async (data) => {
    // Upsert each key
    for (const [key, value] of Object.entries(data)) {
      const existing = await db.patient.where('key').equals(key).first()
      if (existing) {
        await db.patient.update(existing.id, { value })
      } else {
        await db.patient.add({ key, value })
      }
    }
  },
}

// ─── CLEAR / RESET OPERATIONS ─────────────────────────────────
export const clearOps = {
  clearLogs:      () => db.logs.clear(),
  clearDiary:     () => db.diary.clear(),
  clearMedicines: async () => {
    await db.medicines.clear()
    await db.logs.clear()      // logs reference medicines
    await db.reminders.clear()
  },
  clearSchedule:  async () => {
    await db.events.clear()
    await db.tests.clear()
  },
  clearClinics:   () => db.clinics.clear(),
  clearPatient:   () => db.patient.clear(),

  // Nuclear reset — wipes everything
  clearAll: async () => {
    await Promise.all([
      db.medicines.clear(),
      db.clinics.clear(),
      db.diary.clear(),
      db.reminders.clear(),
      db.events.clear(),
      db.tests.clear(),
      db.logs.clear(),
      db.patient.clear(),
    ])
  },
}