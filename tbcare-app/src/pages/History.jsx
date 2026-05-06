import { useEffect, useState } from 'react'
import { logOps, medicineOps } from '../db/database'
import { CheckCircle2, XCircle, Calendar } from 'lucide-react'

const TABS = ['7 Days', 'All Time']

export default function History() {
  const [activeTab,  setActiveTab]  = useState('7 Days')
  const [medicines,  setMedicines]  = useState([])
  const [logs,       setLogs]       = useState([])
  const [week,       setWeek]       = useState([])   // last 7 days adherence
  const [grouped,    setGrouped]    = useState({})   // { date: [log, ...] }
  const [medMap,     setMedMap]     = useState({})   // { medId: medicine }

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [meds, allLogs, weekData] = await Promise.all([
      medicineOps.getAll(),
      logOps.getAll(),
      logOps.getLastNDays(7),
    ])
    setMedicines(meds)
    setLogs(allLogs)
    setWeek(weekData)

    // Build medicine lookup map
    const mm = {}
    meds.forEach((m) => { mm[m.id] = m })
    setMedMap(mm)

    // Group all logs by date
    const grp = {}
    allLogs.forEach((log) => {
      if (!grp[log.date]) grp[log.date] = []
      grp[log.date].push(log)
    })
    setGrouped(grp)
  }

  // Stats
  const totalDoses    = logs.length
  const uniqueDays    = Object.keys(grouped).length
  const totalTablets  = logs.reduce((sum, l) => sum + (l.intakeQty || 1), 0)
  const weekTaken     = week.filter((d) => d.taken).length
  const adherencePct  = week.length ? Math.round((weekTaken / week.length) * 100) : 0

  // Sorted dates descending
  const sortedDates = Object.keys(grouped).sort().reverse()

  const today = new Date().toISOString().split('T')[0]

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">History</h1>
        <p className="text-sky-100 text-sm mt-1">Your medication intake record</p>
      </div>

      {/* Tab switcher */}
      <div className="flex bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors
              ${activeTab === tab
                ? 'text-sky-500 border-b-2 border-sky-500'
                : 'text-gray-400 dark:text-slate-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {activeTab === '7 Days' ? (
          <>
            {/* 7-day adherence grid */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                Last 7 days
              </p>
              <div className="grid grid-cols-7 gap-2">
                {week.map(({ date, taken }) => {
                  const d = new Date(date + 'T00:00:00')
                  return (
                    <div key={date} className="flex flex-col items-center gap-1">
                      <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-medium
                        ${date === today
                          ? 'bg-sky-500 text-white'
                          : taken
                          ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500'}`}
                      >
                        {d.getDate()}
                      </div>
                      <span className="text-xs text-gray-400 dark:text-slate-500">
                        {d.toLocaleDateString('en', { weekday: 'narrow' })}
                      </span>
                      <div className="mt-0.5">
                        {taken
                          ? <CheckCircle2 size={12} className="text-green-500" />
                          : <XCircle size={12} className="text-gray-300 dark:text-slate-600" />
                        }
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Adherence bar */}
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-400 dark:text-slate-500 mb-1">
                  <span>Weekly adherence</span>
                  <span className="font-medium text-gray-700 dark:text-slate-200">
                    {adherencePct}%
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all
                      ${adherencePct >= 80
                        ? 'bg-green-400'
                        : adherencePct >= 50
                        ? 'bg-amber-400'
                        : 'bg-red-400'}`}
                    style={{ width: `${adherencePct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Per-medicine breakdown for last 7 days */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                Per medicine — last 7 days
              </p>
              {medicines.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No medicines added yet
                </p>
              ) : (
                <div className="space-y-4">
                  {medicines.map((med) => {
                    const medLogs = logs.filter(
                      (l) => l.medicineId === med.id &&
                        week.some((w) => w.date === l.date)
                    )
                    const daysTaken = new Set(medLogs.map((l) => l.date)).size
                    const tabletsTaken = medLogs.reduce(
                      (s, l) => s + (l.intakeQty || 1), 0
                    )
                    const pct = Math.round((daysTaken / 7) * 100)

                    return (
                      <div key={med.id}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm text-gray-700 dark:text-slate-200">
                            {med.genericName}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-slate-500">
                            {daysTaken}/7 days · {tabletsTaken} tablets
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full
                              ${pct >= 80 ? 'bg-green-400' : pct >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {/* Day-by-day dots for this medicine */}
                        <div className="grid grid-cols-7 gap-2 mt-2">
                          {week.map(({ date }) => {
                            const log = medLogs.find((l) => l.date === date)
                            return (
                              <div key={date} className="flex flex-col items-center">
                                <div className={`w-full h-6 rounded-md flex items-center justify-center text-xs
                                  ${log
                                    ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                    : 'bg-gray-100 dark:bg-slate-700 text-gray-300 dark:text-slate-600'}`}
                                >
                                  {log ? log.intakeQty || 1 : '—'}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* All-time stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total doses',   value: totalDoses   },
                { label: 'Days logged',   value: uniqueDays   },
                { label: 'Total tablets', value: totalTablets },
              ].map(({ label, value }) => (
                <div key={label}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3 text-center"
                >
                  <p className="text-xl font-semibold text-sky-500">{value}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">{label}</p>
                </div>
              ))}
            </div>

            {/* Per-medicine all-time */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
              <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
                Per medicine — all time
              </p>
              {medicines.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">
                  No medicines added yet
                </p>
              ) : (
                <div className="space-y-3">
                  {medicines.map((med) => {
                    const medLogs = logs.filter((l) => l.medicineId === med.id)
                    const daysTaken = new Set(medLogs.map((l) => l.date)).size
                    const totalTab  = medLogs.reduce((s, l) => s + (l.intakeQty || 1), 0)
                    const firstDate = medLogs.length
                      ? [...medLogs].sort((a,b) => a.date.localeCompare(b.date))[0].date
                      : null

                    return (
                      <div key={med.id}
                        className="border border-gray-100 dark:border-slate-700 rounded-xl p-3"
                      >
                        <div className="flex justify-between items-start">
                          <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                            {med.genericName}
                          </p>
                          <span className="text-xs bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full">
                            {totalTab} tablets
                          </span>
                        </div>
                        <div className="flex gap-4 mt-2">
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500">Days taken</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {daysTaken}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500">First logged</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {firstDate || '—'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400 dark:text-slate-500">Per sitting</p>
                            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                              {med.intakeQty || 1} tablet(s)
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Full log by date */}
            <div>
              <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide font-medium mb-2">
                Log by date
              </p>
              {sortedDates.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-6">No logs yet</p>
              ) : (
                <div className="space-y-3">
                  {sortedDates.map((date) => (
                    <div key={date}
                      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar size={14} className="text-sky-500" />
                        <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
                          {date}
                          {date === today && (
                            <span className="ml-2 text-xs bg-sky-100 dark:bg-sky-900 text-sky-600 dark:text-sky-300 px-2 py-0.5 rounded-full">
                              Today
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="space-y-2">
                        {grouped[date].map((log) => {
                          const med = medMap[log.medicineId]
                          return (
                            <div key={log.id}
                              className="flex items-center justify-between"
                            >
                              <span className="text-sm text-gray-600 dark:text-slate-300">
                                {med ? med.genericName : 'Unknown medicine'}
                              </span>
                              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">
                                {log.intakeQty || 1} tablet(s)
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}