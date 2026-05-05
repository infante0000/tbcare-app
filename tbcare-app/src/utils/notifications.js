import { db } from '../db/database'

// ─── REQUEST PERMISSION ────────────────────────────────────────
// Call this once when the app first loads
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support notifications')
    return false
  }
  if (Notification.permission === 'granted') return true
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}

// ─── SHOW IMMEDIATE NOTIFICATION ──────────────────────────────
export const showNotification = (title, body, tag = 'tbcare') => {
  if (Notification.permission !== 'granted') return
  new Notification(title, {
    body,
    icon: '/tbcare-app/icon-192.png',
    badge: '/tbcare-app/icon-192.png',
    tag, // prevents duplicate notifications with same tag
  })
}

// ─── SCHEDULE DAILY REMINDER ───────────────────────────────────
// Schedules a repeating daily notification at a specific time
// timeString format: "HH:MM" e.g. "08:00"
export const scheduleDailyReminder = (medicineName, timeString, medicineId) => {
  const [hours, minutes] = timeString.split(':').map(Number)

  const scheduleNext = () => {
    const now = new Date()
    const next = new Date()
    next.setHours(hours, minutes, 0, 0)

    // If time already passed today, schedule for tomorrow
    if (next <= now) {
      next.setDate(next.getDate() + 1)
    }

    const delay = next - now

    setTimeout(() => {
      showNotification(
        '💊 Time to take your medicine',
        `${medicineName} — ${timeString}`,
        `dose-${medicineId}`
      )
      scheduleNext() // reschedule for next day
    }, delay)
  }

  scheduleNext()
}

// ─── LOW STOCK ALERT ───────────────────────────────────────────
export const notifyLowStock = (medicineName, remaining) => {
  if (Notification.permission !== 'granted') return
  showNotification(
    '⚠️ Low Stock Alert',
    `${medicineName} has only ${remaining} dose${remaining === 1 ? '' : 's'} left. Time to refill!`,
    `lowstock-${medicineName}`
  )
}

// ─── UPCOMING EVENT ALERT ──────────────────────────────────────
export const notifyUpcomingEvent = (eventName, date) => {
  showNotification(
    '📅 Upcoming Schedule',
    `${eventName} is scheduled on ${date}`,
    `event-${date}`
  )
}

// ─── RESCHEDULE ALL ON APP OPEN ────────────────────────────────
// Call this in App.jsx on mount so reminders survive app restarts
export const rescheduleAllReminders = async () => {
  try {
    const medicines = await db.medicines.toArray()
    medicines.forEach((med) => {
      if (med.reminderEnabled && med.reminderTime) {
        scheduleDailyReminder(
          med.genericName,
          med.reminderTime,
          med.id
        )
      }
    })
  } catch (err) {
    console.error('Failed to reschedule reminders:', err)
  }
}

// ─── CHECK FOR LOW STOCK ON APP OPEN ──────────────────────────
export const checkLowStockOnOpen = async () => {
  try {
    const medicines = await db.medicines.toArray()
    medicines.forEach((med) => {
      if (med.quantity <= 5 && med.quantity > 0) {
        notifyLowStock(med.genericName, med.quantity)
      }
    })
  } catch (err) {
    console.error('Failed to check stock:', err)
  }
}