import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flame, Pill, CalendarDays, MapPin, CheckCheck } from 'lucide-react'
import { medicineOps, logOps, eventOps, clinicOps } from '../db/database'
import { showNotification } from '../utils/notifications'

export default function Dashboard() {
  const navigate  = useNavigate()
  const today     = new Date().toISOString().split('T')[0]

  const [medicines,   setMedicines]   = useState([])
  const [streak,      setStreak]      = useState(0)
  const [adherence,   setAdherence]   = useState([])
  const [upcoming,    setUpcoming]    = useState(null)
  const [clinic,      setClinic]      = useState(null)
  const [takenMap,    setTakenMap]    = useState({})   // { medId: bool }
  const [logDate,     setLogDate]     = useState(today) // date picker for past logging
  // intakeQty per medicine for the selected logDate sitting
  const [intakeQtys,  setIntakeQtys]  = useState({})

  useEffect(() => { loadAll() }, [])
  useEffect(() => { refreshTakenMap() }, [logDate, medicines])

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

    // Default intakeQty per medicine from saved setting
    const qtys = {}
    meds.forEach((m) => { qtys[m.id] = m.intakeQty || 1 })
    setIntakeQtys(qtys)
  }

  const refreshTakenMap = async () => {
    const map = {}
    for (const med of medicines) {
      map[med.id] = await logOps.alreadyLogged(med.id, logDate)
    }
    setTakenMap(map)
  }

  const handleTake = async (med) => {
    const already = await logOps.alreadyLogged(med.id, logDate)
    if (already) {
      // Undo: remove log and add quantity back
      await logOps.removeLog(med.id, logDate)
      const qty = intakeQtys[med.id] || med.intakeQty || 1
      await medicineOps.addQuantity(med.id, qty)
      await loadAll()
      return
    }

    const qty = intakeQtys[med.id] || med.intakeQty || 1
    await logOps.logDose(med.id, logDate, qty)
    const newQty = await medicineOps.decrementQuantity(med.id, qty)

    if (newQty <= 5) {
      showNotification(
        '⚠️ Low Stock',
        `${med.genericName} has ${newQty} doses left!`,
        `low-${med.id}`
      )
    }
    await loadAll()
  }

  const handleMarkAll = async () => {
    for (const med of medicines) {
      const already = await logOps.alreadyLogged(med.id, logDate)
      if (!already) {
        const qty = intakeQtys[med.id] || med.intakeQty || 1
        await logOps.logDose(med.id, logDate, qty)
        const newQty = await medicineOps.decrementQuantity(med.id, qty)
        if (newQty <= 5) {
          showNotification(
            '⚠️ Low Stock',
            `${med.genericName} has ${newQty} doses left!`,
            `low-${med.id}`
          )
        }
      }
    }
    await loadAll()
  }

  const allTaken = medicines.length > 0 &&
    medicines.every((m) => takenMap[m.id])

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
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4 text-center">
            <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
              <Flame size={18} />
              <span className="text-2xl font-semibold text-gray-800">{streak}</span>
            </div>
            <p className="text-xs text-gray-500">Day streak</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4 text-center">
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
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4">
          <p className="text-sm font-medium text-gray-700 mb-3">Last 7 days</p>
          <div className="flex gap-2">
            {adherence.map(({ date, taken }) => (
              <div key={date} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full aspect-square rounded-full flex items-center justify-center text-xs font-medium
                  ${date === today
                    ? 'bg-sky-500 text-white'
                    : taken
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-400'}`}
                >
                  {new Date(date + 'T00:00:00').getDate()}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(date + 'T00:00:00').toLocaleDateString('en', { weekday: 'narrow' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's medicines */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4">
          {/* Date picker for past logging */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">Medicines</p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400">Date:</label>
              <input
                type="date"
                value={logDate}
                max={today}
                onChange={(e) => setLogDate(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          {logDate !== today && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mb-3">
              📅 Logging for past date: {logDate}
            </p>
          )}

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
            <>
              {/* Mark All button */}
              <button
                onClick={handleMarkAll}
                disabled={allTaken}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium mb-4 transition-colors
                  ${allTaken
                    ? 'bg-green-50 border border-green-200 text-green-600'
                    : 'bg-sky-500 text-white hover:bg-sky-600'}`}
              >
                <CheckCheck size={16} />
                {allTaken ? 'All taken ✓' : 'Mark all as taken'}
              </button>

              <div className="space-y-4">
                {medicines.map((med) => {
                  const pct = Math.round(
                    ((med.quantity || 0) / (med.totalQuantity || 1)) * 100
                  )
                  const barColor =
                    pct > 40 ? 'bg-green-400'
                    : pct > 15 ? 'bg-amber-400'
                    : 'bg-red-400'
                  const taken = takenMap[med.id]

                  return (
                    <div key={med.id} className="border border-gray-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {med.genericName}
                          </p>
                          <p className="text-xs text-gray-400">
                            {med.dosage} · {med.reminderTime || '08:00'}
                          </p>
                        </div>
                        <button
                          onClick={() => handleTake(med)}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded-lg border transition-colors
                            ${taken
                              ? 'bg-green-50 border-green-200 text-green-600'
                              : 'border-sky-300 text-sky-600 hover:bg-sky-50'}`}
                        >
                          {taken ? 'Taken ✓' : 'Mark taken'}
                        </button>
                      </div>

                      {/* Intake quantity selector */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Tablets this sitting:</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() =>
                              setIntakeQtys((prev) => ({
                                ...prev,
                                [med.id]: Math.max(1, (prev[med.id] || 1) - 1),
                              }))
                            }
                            className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="text-sm font-medium text-gray-800 w-6 text-center">
                            {intakeQtys[med.id] || med.intakeQty || 1}
                          </span>
                          <button
                            onClick={() =>
                              setIntakeQtys((prev) => ({
                                ...prev,
                                [med.id]: (prev[med.id] || 1) + 1,
                              }))
                            }
                            className="w-6 h-6 rounded-md bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Quantity bar */}
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {med.quantity || 0} tablets left
                        {(med.quantity || 0) <= 5 && (
                          <span className="ml-2 text-red-500 font-medium">
                            Low stock!
                          </span>
                        )}
                      </p>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Next refill */}
        <div
          className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer"
          onClick={() => navigate('/schedule')}
        >
          <div className="bg-amber-50 p-2 rounded-lg">
            <CalendarDays size={20} className="text-amber-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-700">Next event</p>
            <p className="text-xs text-gray-400 truncate">
              {upcoming ? `${upcoming.name} · ${upcoming.date}` : 'No upcoming events'}
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
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sky-700">TB-DOTS Clinic</p>
            <p className="text-xs text-sky-500 truncate">
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