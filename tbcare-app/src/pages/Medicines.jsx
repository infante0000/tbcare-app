import { useEffect, useState } from 'react'
import { Trash2, Pill } from 'lucide-react'
import { medicineOps } from '../db/database'
import { scheduleDailyReminder } from '../utils/notifications'

export default function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [form, setForm] = useState({
    genericName: '', brandName: '', dosage: '',
    quantity: '', sideEffects: '', reminderTime: '08:00',
  })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])

  const load = async () => setMedicines(await medicineOps.getAll())

  const handleAdd = async () => {
    if (!form.genericName.trim()) {
      setError('Generic name is required')
      return
    }
    setError('')
    const qty = parseInt(form.quantity) || 30
    await medicineOps.add({
      genericName:   form.genericName.trim(),
      brandName:     form.brandName.trim(),
      dosage:        form.dosage.trim() || 'As prescribed',
      quantity:      qty,
      totalQuantity: qty,
      sideEffects:   form.sideEffects.trim(),
      reminderTime:  form.reminderTime,
      reminderEnabled: true,
    })
    scheduleDailyReminder(form.genericName, form.reminderTime, Date.now())
    setForm({
      genericName: '', brandName: '', dosage: '',
      quantity: '', sideEffects: '', reminderTime: '08:00',
    })
    load()
  }

  const handleDelete = async (id) => {
    await medicineOps.delete(id)
    load()
  }

  return (
    <div>
      <div className="bg-blue-900 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">Medicines</h1>
        <p className="text-sky-100 text-sm mt-1">Your TB treatment directory</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {medicines.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">
            No medicines added yet
          </p>
        ) : (
          medicines.map((med) => {
            const pct = Math.round(
              ((med.quantity || 0) / (med.totalQuantity || 1)) * 100
            )
            const barColor =
              pct > 40 ? 'bg-green-400' : pct > 15 ? 'bg-amber-400' : 'bg-red-400'
            return (
              <div
                key={med.id}
                className="bg-white rounded-xl border border-gray-100 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex gap-3">
                    <div className="bg-sky-50 p-2 rounded-lg">
                      <Pill size={18} className="text-sky-500" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {med.genericName}
                        {(med.quantity || 0) <= 5 && (
                          <span className="ml-2 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                            Low stock
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        {med.brandName} · {med.dosage}
                      </p>
                      {med.sideEffects && (
                        <p className="text-xs text-gray-400 mt-1">
                          Side effects: {med.sideEffects}
                        </p>
                      )}
                      <p className="text-xs text-sky-500 mt-1">
                        ⏰ {med.reminderTime}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(med.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {med.quantity || 0} of {med.totalQuantity || 0} tablets remaining
                </p>
              </div>
            )
          })
        )}

        {/* Add form */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add medicine</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {[
            { key: 'genericName',  label: 'Generic name *',       placeholder: 'e.g. Rifampicin'            },
            { key: 'brandName',    label: 'Brand name',           placeholder: 'e.g. Rimactan'              },
            { key: 'dosage',       label: 'Dosage',               placeholder: 'e.g. 600mg once daily'      },
            { key: 'sideEffects',  label: 'Side effects',         placeholder: 'e.g. Orange urine, nausea'  },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="text-xs text-gray-500 block mb-1">{label}</label>
              <input
                value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Quantity (tablets)
              </label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">
                Reminder time
              </label>
              <input
                type="time"
                value={form.reminderTime}
                onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="w-full bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            Save medicine
          </button>
        </div>
      </div>
    </div>
  )
}