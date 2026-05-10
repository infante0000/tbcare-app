import { useEffect, useState } from 'react'
import { Trash2, CheckCircle, Pencil, Plus, X } from 'lucide-react'
import { eventOps, testOps, medicineOps }       from '../db/database'
import { adjustForHoliday, isHoliday, getHolidayName } from '../utils/holidays'
import { localToday, parseLocalDate }           from '../utils/dateUtils'

// One medicine row in the multi-medicine picker
function MedicineRow({ medicine, row, onChange, onRemove, showRemove }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 dark:bg-slate-700 rounded-xl p-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-slate-200 truncate">
          {medicine.genericName}
        </p>
        <p className="text-xs text-gray-400 dark:text-slate-500">
          {medicine.dosage}
        </p>
      </div>

      {/* Qty for this schedule entry */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onChange({ ...row, qty: Math.max(1, (row.qty || 1) - 1) })}
          className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center"
        >
          −
        </button>
        <span className="text-sm font-medium text-gray-800 dark:text-slate-200 w-5 text-center">
          {row.qty || 1}
        </span>
        <button
          onClick={() => onChange({ ...row, qty: (row.qty || 1) + 1 })}
          className="w-6 h-6 rounded-md bg-gray-200 dark:bg-slate-600 text-gray-600 dark:text-slate-300 text-sm font-bold flex items-center justify-center"
        >
          +
        </button>
      </div>

      {/* Time for this medicine */}
      <input
        type="time"
        value={row.time || '08:00'}
        onChange={(e) => onChange({ ...row, time: e.target.value })}
        className="w-24 border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1 text-xs
          bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-200
          focus:outline-none focus:border-sky-400 shrink-0"
      />

      {showRemove && (
        <button
          onClick={onRemove}
          className="text-gray-300 dark:text-slate-600 hover:text-red-400 shrink-0"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}

export default function Schedule() {
  const today = localToday()

  const [events,    setEvents]    = useState([])
  const [allEvents, setAllEvents] = useState([])
  const [tests,     setTests]     = useState([])
  const [medicines, setMedicines] = useState([])

  // ── Form state ──────────────────────────────────────────────
  const [name,     setName]     = useState('')
  const [date,     setDate]     = useState('')
  const [adjusted, setAdjusted] = useState(null)
  const [error,    setError]    = useState('')

  // Multi-medicine rows: [{ medicineId, qty, time }]
  const [medRows, setMedRows] = useState([])
  // Which medicine ids are checked in the picker
  const [checkedIds, setCheckedIds] = useState([])

  // Test form
  const [testName,   setTestName]   = useState('')
  const [testResult, setTestResult] = useState('')
  const [testDate,   setTestDate]   = useState(today)

  // Edit test
  const [editTestId, setEditTestId] = useState(null)
  const [editTest,   setEditTest]   = useState({})

  useEffect(() => { load() }, [])

  const load = async () => {
    const [upcoming, all, ts, meds] = await Promise.all([
      eventOps.getUpcoming(),
      eventOps.getAll_(),
      testOps.getAll(),
      medicineOps.getAll(),
    ])
    setEvents(upcoming)
    setAllEvents(all)
    setTests(ts)
    setMedicines(meds)
  }

  // ── Date change with holiday detection ─────────────────────
  const handleDateChange = (val) => {
    setDate(val)
    if (!val) { setAdjusted(null); return }
    const result = adjustForHoliday(val)
    setAdjusted(result.adjusted ? result : null)
  }

  // ── Toggle a medicine in the checklist ─────────────────────
  const toggleMed = (med) => {
    const isChecked = checkedIds.includes(med.id)
    if (isChecked) {
      setCheckedIds((prev) => prev.filter((id) => id !== med.id))
      setMedRows((prev)    => prev.filter((r)  => r.medicineId !== med.id))
    } else {
      setCheckedIds((prev) => [...prev, med.id])
      setMedRows((prev)    => [
        ...prev,
        {
          medicineId: med.id,
          qty:        med.intakeQty || 1,
          time:       med.reminderTime || '08:00',
        },
      ])
    }
  }

  const updateRow = (medicineId, changes) => {
    setMedRows((prev) =>
      prev.map((r) => r.medicineId === medicineId ? { ...r, ...changes } : r)
    )
  }

  const removeRow = (medicineId) => {
    setCheckedIds((prev) => prev.filter((id) => id !== medicineId))
    setMedRows((prev)    => prev.filter((r)  => r.medicineId !== medicineId))
  }

  // ── Add event ──────────────────────────────────────────────
  const handleAddEvent = async () => {
    if (!name.trim() || !date) {
      setError('Event name and date are required')
      return
    }
    setError('')
    const result = adjustForHoliday(date)

    await eventOps.add({
      name:      name.trim(),
      date:      result.date,
      adjusted:  result.adjusted,
      original:  result.original,
      // Store multi-medicine rows (may be empty for non-refill events)
      medicines: medRows,
    })

    // Reset form
    setName('')
    setDate('')
    setAdjusted(null)
    setCheckedIds([])
    setMedRows([])
    load()
  }

  // ── Complete event — adds qty to each linked medicine ──────
  const handleComplete = async (ev) => {
    await eventOps.complete(ev.id)
    if (ev.medicines && ev.medicines.length > 0) {
      for (const row of ev.medicines) {
        if (row.medicineId && row.qty > 0) {
          await medicineOps.addQuantity(row.medicineId, row.qty)
        }
      }
    }
    load()
  }

  // ── Test ops ───────────────────────────────────────────────
  const handleAddTest = async () => {
    if (!testName.trim() || !testResult.trim()) return
    await testOps.add({
      testName:      testName.trim(),
      result:        testResult.trim(),
      scheduledDate: testDate,
    })
    setTestName('')
    setTestResult('')
    setTestDate(today)
    load()
  }

  const startEditTest  = (t)  => { setEditTestId(t.id); setEditTest({ ...t }) }
  const cancelEditTest = ()   => { setEditTestId(null); setEditTest({}) }
  const saveEditTest   = async () => {
    await testOps.update(editTestId, {
      testName:      editTest.testName,
      result:        editTest.result,
      scheduledDate: editTest.scheduledDate,
    })
    setEditTestId(null)
    load()
  }

  // ── Calendar render ────────────────────────────────────────
  const y           = parseLocalDate(today).getFullYear()
  const mo          = parseLocalDate(today).getMonth()
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const firstDay    = new Date(y, mo, 1).getDay()
  const monthName   = parseLocalDate(today).toLocaleDateString('en-PH', {
    month: 'long', year: 'numeric',
  })

  const medLookup = Object.fromEntries(medicines.map((m) => [m.id, m]))

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sky-100 text-sm mt-1">Refills, tests and appointments</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── Calendar ──────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
            {monthName}
          </p>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 dark:text-slate-500 py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const ds       = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const isToday  = ds === today
              const hasEvent = allEvents.some((e) => e.date === ds)
              const holiday  = isHoliday(ds)
              return (
                <div key={ds}
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg
                    ${isToday                           ? 'bg-sky-500 text-white font-medium'                          : ''}
                    ${!isToday && hasEvent && !holiday  ? 'bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300'  : ''}
                    ${!isToday && holiday               ? 'bg-red-100 dark:bg-red-900 text-red-500 dark:text-red-400'  : ''}
                    ${!isToday && !hasEvent && !holiday ? 'text-gray-600 dark:text-slate-400'                          : ''}`}
                >
                  {d}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3">
            {[
              { color: 'bg-sky-500',                       label: 'Today'   },
              { color: 'bg-sky-100 dark:bg-sky-900',       label: 'Event'   },
              { color: 'bg-red-100 dark:bg-red-900',       label: 'Holiday' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-xs text-gray-400 dark:text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Add event form ────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Add refill or appointment
          </p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Event name */}
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
              Event name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Medicine refill, Check-up"
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                placeholder-gray-300 dark:placeholder-slate-500
                focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                focus:outline-none focus:border-sky-400"
            />
            {adjusted && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/30 px-3 py-2 rounded-lg mt-2">
                ⚠️ {getHolidayName(adjusted.original)} detected — auto-adjusted to{' '}
                <strong>{adjusted.date}</strong>
              </p>
            )}
          </div>

          {/* Medicine picker */}
          {medicines.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 block mb-2">
                Link medicines (optional — for refill tracking)
              </label>

              {/* Checklist */}
              <div className="space-y-1 mb-3">
                {medicines.map((med) => {
                  const checked = checkedIds.includes(med.id)
                  return (
                    <button
                      key={med.id}
                      onClick={() => toggleMed(med)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors
                        ${checked
                          ? 'border-sky-300 dark:border-sky-600 bg-sky-50 dark:bg-sky-900/30'
                          : 'border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700'}`}
                    >
                      {/* Checkbox visual */}
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                        ${checked
                          ? 'bg-sky-500 border-sky-500'
                          : 'border-gray-300 dark:border-slate-500'}`}
                      >
                        {checked && (
                          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                            <path d="M1 4L3 6L7 2" stroke="white" strokeWidth="1.5"
                              strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-slate-200 truncate">
                          {med.genericName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">
                          {med.dosage} · {med.quantity} left
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Per-medicine qty + time rows (only checked ones) */}
              {medRows.length > 0 && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2 px-3">
                    <span className="text-xs text-gray-400 dark:text-slate-500">Medicine</span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 text-center">
                      Add qty
                    </span>
                    <span className="text-xs text-gray-400 dark:text-slate-500 text-right">
                      Time
                    </span>
                  </div>
                  {medRows.map((row) => {
                    const med = medLookup[row.medicineId]
                    if (!med) return null
                    return (
                      <MedicineRow
                        key={row.medicineId}
                        medicine={med}
                        row={row}
                        onChange={(changes) => updateRow(row.medicineId, changes)}
                        onRemove={() => removeRow(row.medicineId)}
                        showRemove={medRows.length > 1}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleAddEvent}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            Add to schedule
          </button>
        </div>

        {/* ── Upcoming events ───────────────────────────── */}
        <div>
          <p className="text-xs text-gray-500 dark:text-slate-500 uppercase tracking-wide font-medium mb-2">
            Upcoming
          </p>
          {events.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-4">
              No upcoming events
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">
                        {ev.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {ev.date}
                        {ev.adjusted && (
                          <span className="ml-1 text-amber-500">(adjusted)</span>
                        )}
                      </p>

                      {/* Show linked medicines */}
                      {ev.medicines && ev.medicines.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {ev.medicines.map((row) => {
                            const med = medLookup[row.medicineId]
                            return med ? (
                              <div key={row.medicineId}
                                className="flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400"
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                                <span className="truncate">{med.genericName}</span>
                                <span className="shrink-0 text-green-600 dark:text-green-400 font-medium">
                                  +{row.qty} tablets
                                </span>
                                <span className="shrink-0 text-gray-300 dark:text-slate-600">
                                  @ {row.time}
                                </span>
                              </div>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => handleComplete(ev)}
                        className="flex items-center gap-1 text-xs bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 px-2 py-1.5 rounded-lg"
                      >
                        <CheckCircle size={13} /> Done
                      </button>
                      <button
                        onClick={async () => { await eventOps.delete(ev.id); load() }}
                        className="p-1.5 text-gray-300 dark:text-slate-600 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Test results ──────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
            Test results
          </p>

          {tests.length > 0 && (
            <div className="space-y-2 mb-2">
              {tests.map((t) => (
                <div key={t.id}>
                  {editTestId === t.id ? (
                    <div className="space-y-2 border border-sky-200 dark:border-sky-800 rounded-xl p-3">
                      <input
                        value={editTest.testName}
                        onChange={(e) => setEditTest({ ...editTest, testName: e.target.value })}
                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                          bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                          focus:outline-none focus:border-sky-400"
                      />
                      <input
                        value={editTest.result}
                        onChange={(e) => setEditTest({ ...editTest, result: e.target.value })}
                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                          bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                          focus:outline-none focus:border-sky-400"
                      />
                      <input
                        type="date"
                        value={editTest.scheduledDate}
                        onChange={(e) =>
                          setEditTest({ ...editTest, scheduledDate: e.target.value })
                        }
                        className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                          bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                          focus:outline-none focus:border-sky-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditTest}
                          className="flex-1 bg-sky-500 text-white py-2 rounded-lg text-sm">
                          Save
                        </button>
                        <button onClick={cancelEditTest}
                          className="flex-1 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 py-2 rounded-lg text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-sm text-gray-800 dark:text-slate-200">{t.testName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{t.scheduledDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-sky-100 dark:bg-sky-900 text-sky-700 dark:text-sky-300 px-2 py-1 rounded-full">
                          {t.result}
                        </span>
                        <button onClick={() => startEditTest(t)}
                          className="text-gray-300 dark:text-slate-600 hover:text-sky-400">
                          <Pencil size={13} />
                        </button>
                        <button onClick={async () => { await testOps.delete(t.id); load() }}
                          className="text-gray-300 dark:text-slate-600 hover:text-red-400">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                Test name
              </label>
              <input value={testName} onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Sputum smear, Chest X-ray"
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                  placeholder-gray-300 dark:placeholder-slate-500
                  focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                Result
              </label>
              <input value={testResult} onChange={(e) => setTestResult(e.target.value)}
                placeholder="e.g. Negative, Positive"
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                  placeholder-gray-300 dark:placeholder-slate-500
                  focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                Test date
              </label>
              <input type="date" value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                  bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                  focus:outline-none focus:border-sky-400"
              />
            </div>
            <button onClick={handleAddTest}
              className="w-full border border-sky-400 dark:border-sky-600 text-sky-600 dark:text-sky-400 py-2.5 rounded-lg text-sm font-medium hover:bg-sky-50 dark:hover:bg-sky-900/30 transition-colors"
            >
              Log test result
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}