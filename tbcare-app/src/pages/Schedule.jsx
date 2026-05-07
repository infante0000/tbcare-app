import { useEffect, useState } from 'react'
import { Trash2, CheckCircle, Plus, Pencil } from 'lucide-react'
import { eventOps, testOps, medicineOps } from '../db/database'
import { adjustForHoliday, isHoliday, getHolidayName } from '../utils/holidays'

export default function Schedule() {
  const [events,      setEvents]      = useState([])
  const [allEvents,   setAllEvents]   = useState([])
  const [tests,       setTests]       = useState([])
  const [medicines,   setMedicines]   = useState([])
  const [name,        setName]        = useState('')
  const [date,        setDate]        = useState('')
  const [adjusted,    setAdjusted]    = useState(null)
  const [linkedMed,   setLinkedMed]   = useState('')   // medicine to refill
  const [refillQty,   setRefillQty]   = useState('')   // qty to add on completion
  const [testName,    setTestName]    = useState('')
  const [testResult,  setTestResult]  = useState('')
  const [testDate,    setTestDate]    = useState(
    new Date().toISOString().split('T')[0]
  )
  const [error,       setError]       = useState('')
  // edit test
  const [editTestId,  setEditTestId]  = useState(null)
  const [editTest,    setEditTest]    = useState({})

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

  const handleDateChange = (val) => {
    setDate(val)
    if (!val) { setAdjusted(null); return }
    const result = adjustForHoliday(val)
    setAdjusted(result.adjusted ? result : null)
  }

  const handleAddEvent = async () => {
    if (!name.trim() || !date) { setError('Event name and date are required'); return }
    setError('')
    const result = adjustForHoliday(date)
    await eventOps.add({
      name:      name.trim(),
      date:      result.date,
      adjusted:  result.adjusted,
      original:  result.original,
      medicineId: linkedMed || null,
      refillQty:  parseInt(refillQty) || 0,
    })
    setName(''); setDate(''); setAdjusted(null)
    setLinkedMed(''); setRefillQty('')
    load()
  }

  // Mark refill as done → add quantity to linked medicine
  const handleComplete = async (ev) => {
    await eventOps.complete(ev.id)
    if (ev.medicineId && ev.refillQty > 0) {
      await medicineOps.addQuantity(ev.medicineId, ev.refillQty)
    }
    load()
  }

  const handleAddTest = async () => {
    if (!testName.trim() || !testResult.trim()) return
    await testOps.add({
      testName:      testName.trim(),
      result:        testResult.trim(),
      scheduledDate: testDate,
    })
    setTestName(''); setTestResult('')
    setTestDate(new Date().toISOString().split('T')[0])
    load()
  }

  const startEditTest = (t) => { setEditTestId(t.id); setEditTest({ ...t }) }
  const cancelEditTest = () => { setEditTestId(null); setEditTest({}) }
  const saveEditTest = async () => {
    await testOps.update(editTestId, {
      testName:      editTest.testName,
      result:        editTest.result,
      scheduledDate: editTest.scheduledDate,
    })
    setEditTestId(null)
    load()
  }

  const today = new Date().toISOString().split('T')[0]
  const y  = new Date().getFullYear()
  const mo = new Date().getMonth()
  const daysInMonth = new Date(y, mo + 1, 0).getDate()
  const firstDay    = new Date(y, mo, 1).getDay()
  const monthName   = new Date().toLocaleDateString('en-PH', {
    month: 'long', year: 'numeric',
  })

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">Schedule</h1>
        <p className="text-sky-100 text-sm mt-1">Refills, tests and appointments</p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Calendar */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">{monthName}</p>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map((d) => (
              <div key={d} className="text-center text-xs text-gray-400 dark:text-slate-500 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
              const ds = `${y}-${String(mo+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
              const isToday    = ds === today
              const hasEvent   = allEvents.some((e) => e.date === ds)
              const holiday    = isHoliday(ds)
              return (
                <div key={ds}
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg
                    ${isToday               ? 'bg-sky-500 text-white font-medium' : ''}
                    ${!isToday && hasEvent  ? 'bg-sky-100 text-sky-700'           : ''}
                    ${!isToday && holiday   ? 'bg-red-100 text-red-500'           : ''}
                    ${!isToday && !hasEvent && !holiday ? 'text-gray-600'         : ''}`}
                >
                  {d}
                </div>
              )
            })}
          </div>
          <div className="flex gap-3 mt-3">
            {[
              { color: 'bg-sky-500', label: 'Today'   },
              { color: 'bg-sky-100', label: 'Event'   },
              { color: 'bg-red-100', label: 'Holiday' },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-xs text-gray-400 dark:text-slate-500">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Add event */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Add refill or appointment</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-1">Event name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Medicine refill, Sputum test"
              className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            />
            {adjusted && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg mt-2">
                ⚠️ {getHolidayName(adjusted.original)} detected — auto-adjusted to{' '}
                <strong>{adjusted.date}</strong>
              </p>
            )}
          </div>

          {/* Link to medicine for auto-refill */}
          <div>
            <label className="text-xs text-gray-500 block mb-1">
              Link to medicine (optional — for refill)
            </label>
            <select
              value={linkedMed}
              onChange={(e) => setLinkedMed(e.target.value)}
              className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
            >
              <option value="">— None —</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.genericName}</option>
              ))}
            </select>
          </div>

          {linkedMed && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Quantity to add when completed
              </label>
              <input
                type="number"
                min="1"
                value={refillQty}
                onChange={(e) => setRefillQty(e.target.value)}
                placeholder="e.g. 30"
                className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          )}

          <button
            onClick={handleAddEvent}
            className="w-full bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            Add to schedule
          </button>
        </div>

        {/* Upcoming events */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
            Upcoming
          </p>
          {events.length === 0 ? (
            <p className="text-center text-gray-400 dark:text-slate-500 text-sm py-4">No upcoming events</p>
          ) : (
            <div className="space-y-2">
              {events.map((ev) => (
                <div key={ev.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-3 flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-slate-100 truncate">{ev.name}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">
                      {ev.date}
                      {ev.adjusted && <span className="ml-1 text-amber-500">(adjusted)</span>}
                      {ev.medicineId && ev.refillQty > 0 && (
                        <span className="ml-1 text-green-500">
                          · +{ev.refillQty} tablets on done
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => handleComplete(ev)}
                      className="flex items-center gap-1 text-xs bg-green-50 border border-green-200 text-green-600 px-2 py-1.5 rounded-lg"
                    >
                      <CheckCircle size={13} /> Done
                    </button>
                    <button
                      onClick={async () => { await eventOps.delete(ev.id); load() }}
                      className="p-1.5 text-gray-300 hover:text-red-400"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test results */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200">Test results</p>

          {tests.length > 0 && (
            <div className="space-y-2 mb-2">
              {tests.map((t) => (
                <div key={t.id}>
                  {editTestId === t.id ? (
                    <div className="space-y-2 border border-sky-200 rounded-xl p-3">
                      <input
                        value={editTest.testName}
                        onChange={(e) => setEditTest({ ...editTest, testName: e.target.value })}
                        className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                      />
                      <input
                        value={editTest.result}
                        onChange={(e) => setEditTest({ ...editTest, result: e.target.value })}
                        className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                      />
                      <input
                        type="date"
                        value={editTest.scheduledDate}
                        onChange={(e) =>
                          setEditTest({ ...editTest, scheduledDate: e.target.value })
                        }
                        className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                      />
                      <div className="flex gap-2">
                        <button onClick={saveEditTest}
                          className="flex-1 bg-sky-500 text-white py-2 rounded-lg text-sm">
                          Save
                        </button>
                        <button onClick={cancelEditTest}
                          className="flex-1 border border-gray-200 dark:border-slate-600 text-gray-500 py-2 rounded-lg text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm text-gray-800 dark:text-slate-100">{t.testName}</p>
                        <p className="text-xs text-gray-400 dark:text-slate-500">{t.scheduledDate}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-sky-100 text-sky-700 px-2 py-1 rounded-full">
                          {t.result}
                        </span>
                        <button onClick={() => startEditTest(t)}
                          className="text-gray-300 hover:text-sky-400">
                          <Pencil size={13} />
                        </button>
                        <button onClick={async () => { await testOps.delete(t.id); load() }}
                          className="text-gray-300 hover:text-red-400">
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
              <label className="text-xs text-gray-500 block mb-1">Test name</label>
              <input value={testName} onChange={(e) => setTestName(e.target.value)}
                placeholder="e.g. Sputum smear, Chest X-ray"
                className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Result</label>
              <input value={testResult} onChange={(e) => setTestResult(e.target.value)}
                placeholder="e.g. Negative, Positive"
                className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Test date</label>
              <input type="date" value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                className="w-full border dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <button onClick={handleAddTest}
              className="w-full border border-sky-400 text-sky-600 py-2.5 rounded-lg text-sm font-medium hover:bg-sky-50 transition-colors"
            >
              Log test result
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}