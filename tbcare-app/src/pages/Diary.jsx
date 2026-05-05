import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { diaryOps } from '../db/database'

const TAGS = ['positive', 'negative']
const SEVERITIES = ['mild', 'moderate', 'severe']

const tagStyle = {
  positive: 'bg-green-100 text-green-700 border-green-200',
  negative: 'bg-red-100 text-red-700 border-red-200',
}
const sevStyle = {
  mild:     'bg-green-100 text-green-700',
  moderate: 'bg-amber-100 text-amber-700',
  severe:   'bg-red-100 text-red-700',
}

export default function Diary() {
  const [entries, setEntries] = useState([])
  const [notes, setNotes]     = useState('')
  const [tag, setTag]         = useState('negative')
  const [severity, setSeverity] = useState('mild')
  const [error, setError]     = useState('')

  useEffect(() => { load() }, [])
  const load = async () => setEntries(await diaryOps.getAll())

  const handleAdd = async () => {
    if (!notes.trim()) {
      setError('Please write something before saving')
      return
    }
    setError('')
    await diaryOps.add({ notes: notes.trim(), tag, severity })
    setNotes('')
    setTag('negative')
    setSeverity('mild')
    load()
  }

  const handleDelete = async (id) => {
    await diaryOps.delete(id)
    load()
  }

  return (
    <div>
      <div className="bg-blue-900 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">Side effects diary</h1>
        <p className="text-sky-100 text-sm mt-1">Track how you feel daily</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {/* Add entry form */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">New entry</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <div>
            <label className="text-xs text-gray-500 block mb-2">
              How are you feeling?
            </label>
            <div className="flex gap-2">
              {TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(t)}
                  className={`flex-1 py-2 rounded-lg border text-sm capitalize transition-colors
                    ${tag === t
                      ? tagStyle[t]
                      : 'border-gray-200 text-gray-400'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-2">Severity</label>
            <div className="flex gap-2">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`flex-1 py-2 rounded-lg border text-sm capitalize transition-colors
                    ${severity === s
                      ? sevStyle[s] + ' border-transparent'
                      : 'border-gray-200 text-gray-400'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you experienced today..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400 resize-none"
            />
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            Save entry
          </button>
        </div>

        {/* Entry list */}
        {entries.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">
            No entries yet
          </p>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-gray-400">{entry.date}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${tagStyle[entry.tag]}`}>
                      {entry.tag}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${sevStyle[entry.severity]}`}>
                      {entry.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{entry.notes}</p>
                </div>
                <button
                  onClick={() => handleDelete(entry.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors ml-3"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}