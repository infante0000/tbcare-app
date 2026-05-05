import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Pill, CalendarDays, MapPin } from 'lucide-react'
import { medicineOps, logOps, eventOps, clinicOps } from '../db/database'
import { showNotification } from '../utils/notifications'

export default function Dashboard() {
  const navigate = useNavigate()
  const [medicines, setMedicines]   = useState([])
  const [streak, setStreak]         = useState(0)
  const [adherence, setAdherence]   = useState([])
  const [upcoming, setUpcoming]     = useState(null)
  const [clinic, setClinic]         = useState(null)
  const [takenToday, setTakenToday] = useState({})
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    const [meds, str, adh, events, clinics] = await Promise.all([
      medicineOps.getAll(),
      logOps.getStreak(),
      logOps.getLastNDays(7),
      eventOps.getUpcoming(),
      clinicOps.getAll(),
    ])
    setMedicines(meds)
    setStreak(str)
    setAdherence(adh)
    setUpcoming(events[0] || null)
    setClinic(clinics[0] || null)

    // Check which medicines are already taken today
    const takenMap = {}
    for (const med of meds) {
      takenMap[med.id] = await logOps.alreadyLoggedToday(med.id)
    }
    setTakenToday(takenMap)
  }

  const handleTake = async (med) => {
    const already = await logOps.alreadyLoggedToday(med.id)
    if (already) return

    await logOps.logDose(med.id)
    const newQty = await medicineOps.decrementQuantity(med.id)

    if (newQty <= 5) {
      showNotification(
        '⚠️ Low Stock',
        `${med.genericName} has ${newQty} doses left!`,
        `low-${med.id}`
      )
    }

    loadAll()
  }

  const dateLabel = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <p className="text-sky-100 text-sm">{dateLabel}</p>
        <h1 className="text-2xl font-semibold mt-1">TB Care</h1>
        <p className="text-sky-100 text-sm mt-1">
          Stay consistent. Every dose matters.
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Flame size={18} />
              <span className="text-2xl font-semibold text-gray-800">
                {streak}
              </span>
            </div>
            <p className="text-xs text-gray-500">Day streak</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Pill size={18} className="text-sky-400" />
              <span className="text-2xl font-semibold text-gray-800">
                {medicines.length}
              </span>
            </div>
            <p className="text-xs text-gray-500">Medicines</p>
          </div>
        </div>

        {/* Adherence dots */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Last 7 days
          </p>
          <div className="flex gap-2">
            {adherence.map(({ date, taken }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                    ${date === today
                      ? 'bg-sky-500 text-white'
                      : taken
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-400'}`}
                >
                  {new Date(date).getDate()}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(date).toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's medicines */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Today's medicines
            </p>
            <button
              onClick={() => navigate('/meds')}
              className="text-xs text-sky-500"
            >
              Manage
            </button>
          </div>

          {medicines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No medicines added yet.{' '}
              <span
                className="text-sky-500 cursor-pointer"
                onClick={() => navigate('/meds')}
              >
                Add one
              </span>
            </p>
          ) : (
            <div className="space-y-3">
              {medicines.map((med) => {
                const pct = Math.round(
                  ((med.quantity || 0) / (med.totalQuantity || 1)) * 100
                )
                const barColor =
                  pct > 40
                    ? 'bg-green-400'
                    : pct > 15
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                const taken = takenToday[med.id]

                return (
                  <div key={med.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {med.genericName}
                        </p>
                        <p className="text-xs text-gray-400">
                          {med.dosage} · {med.reminderTime || '08:00'}
                        </p>
                      </div>
                      <button
                        onClick={() => handleTake(med)}
                        disabled={taken}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors
                          ${taken
                            ? 'bg-green-50 border-green-200 text-green-600'
                            : 'border-sky-300 text-sky-600 hover:bg-sky-50'}`}
                      >
                        {taken ? 'Taken ✓' : 'Mark taken'}
                      </button>
                    </div>
                    <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {med.quantity || 0} tablets left
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Next refill */}
        <div
          className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/schedule')}
        >
          <div className="bg-amber-50 p-2 rounded-lg">
            <CalendarDays size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">Next event</p>
            <p className="text-xs text-gray-400">
              {upcoming
                ? `${upcoming.name} · ${upcoming.date}`
                : 'No upcoming events'}
            </p>
          </div>
        </div>

        {/* Clinic */}
        <div
          className="bg-sky-50 rounded-xl border border-sky-100 p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/clinics')}
        >
          <div className="bg-sky-100 p-2 rounded-lg">
            <MapPin size={20} className="text-sky-500" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-sky-700">TB-DOTS Clinic</p>
            <p className="text-xs text-sky-500">
              {clinic
                ? `${clinic.clinicName} · ${clinic.doctorName}`
                : 'No clinic saved yet'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}