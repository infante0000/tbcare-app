import { useEffect, useState } from 'react'
import { Trash2, Pill, Pencil, Check, X, Plus } from 'lucide-react'
import { medicineOps } from '../db/database'
import { scheduleDailyReminder } from '../utils/notifications'

const EMPTY_FORM = {
  genericName: '', brandName: '', dosage: '',
  quantity: '', sideEffects: '', reminderTime: '08:00', intakeQty: 1,
}

export default function Medicines() {
  const [medicines, setMedicines] = useState([])
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [error,     setError]     = useState('')
  // editId: which medicine is being edited
  const [editId,    setEditId]    = useState(null)
  const [editData,  setEditData]  = useState({})
  // addQtyMap: { medId: number } for the refill quantity input
  const [addQtyMap, setAddQtyMap] = useState({})

  useEffect(() => { load() }, [])
  const load = async () => setMedicines(await medicineOps.getAll())

  const handleAdd = async () => {
    if (!form.genericName.trim()) { setError('Generic name is required'); return }
    setError('')
    const qty = parseInt(form.quantity) || 30
    await medicineOps.add({
      genericName:   form.genericName.trim(),
      brandName:     form.brandName.trim(),
      dosage:        form.dosage.trim() || 'As prescribed',
      quantity:      qty,
      totalQuantity: qty,
      intakeQty:     parseInt(form.intakeQty) || 1,
      sideEffects:   form.sideEffects.trim(),
      reminderTime:  form.reminderTime,
      reminderEnabled: true,
    })
    scheduleDailyReminder(form.genericName, form.reminderTime, Date.now())
    setForm(EMPTY_FORM)
    load()
  }

  const handleDelete = async (id) => {
    await medicineOps.delete(id)
    load()
  }

  const startEdit = (med) => {
    setEditId(med.id)
    setEditData({ ...med })
  }

  const cancelEdit = () => { setEditId(null); setEditData({}) }

  const saveEdit = async () => {
    await medicineOps.update(editId, {
      genericName:  editData.genericName,
      brandName:    editData.brandName,
      dosage:       editData.dosage,
      sideEffects:  editData.sideEffects,
      reminderTime: editData.reminderTime,
      intakeQty:    parseInt(editData.intakeQty) || 1,
    })
    setEditId(null)
    load()
  }

  const handleAddQty = async (med) => {
    const qty = parseInt(addQtyMap[med.id]) || 0
    if (qty <= 0) return
    await medicineOps.addQuantity(med.id, qty)
    setAddQtyMap((prev) => ({ ...prev, [med.id]: '' }))
    load()
  }

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
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
            const isEditing = editId === med.id

            return (
              <div key={med.id} className="bg-white rounded-xl border border-gray-100 p-4">
                {isEditing ? (
                  /* ── EDIT MODE ── */
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-sky-600 mb-2">Editing medicine</p>
                    {[
                      { key: 'genericName', label: 'Generic name', placeholder: 'e.g. Rifampicin' },
                      { key: 'brandName',   label: 'Brand name',   placeholder: 'e.g. Rimactan'   },
                      { key: 'dosage',      label: 'Dosage',       placeholder: 'e.g. 600mg daily' },
                      { key: 'sideEffects', label: 'Side effects', placeholder: 'e.g. Nausea'      },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
                        <input
                          value={editData[key] || ''}
                          onChange={(e) =>
                            setEditData({ ...editData, [key]: e.target.value })
                          }
                          placeholder={placeholder}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    ))}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400 block mb-0.5">
                          Reminder time
                        </label>
                        <input
                          type="time"
                          value={editData.reminderTime || '08:00'}
                          onChange={(e) =>
                            setEditData({ ...editData, reminderTime: e.target.value })
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 block mb-0.5">
                          Default tablets/sitting
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={editData.intakeQty || 1}
                          onChange={(e) =>
                            setEditData({ ...editData, intakeQty: e.target.value })
                          }
                          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 flex items-center justify-center gap-1 bg-sky-500 text-white py-2 rounded-lg text-sm"
                      >
                        <Check size={14} /> Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm"
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1 min-w-0">
                        <div className="bg-sky-50 p-2 rounded-lg shrink-0">
                          <Pill size={18} className="text-sky-500" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">
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
                            <p className="text-xs text-gray-400 mt-0.5">
                              ⚠ {med.sideEffects}
                            </p>
                          )}
                          <p className="text-xs text-sky-500 mt-0.5">
                            ⏰ {med.reminderTime} · {med.intakeQty || 1} tablet(s)/sitting
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0 ml-2">
                        <button
                          onClick={() => startEdit(med)}
                          className="p-1.5 text-gray-300 hover:text-sky-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(med.id)}
                          className="p-1.5 text-gray-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Quantity bar */}
                    <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${barColor}`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {med.quantity || 0} of {med.totalQuantity || 0} tablets remaining
                    </p>

                    {/* Add quantity (refill) */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-50">
                      <span className="text-xs text-gray-400 shrink-0">Add refill qty:</span>
                      <input
                        type="number"
                        min="1"
                        placeholder="e.g. 30"
                        value={addQtyMap[med.id] || ''}
                        onChange={(e) =>
                          setAddQtyMap((prev) => ({ ...prev, [med.id]: e.target.value }))
                        }
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-sky-400"
                      />
                      <button
                        onClick={() => handleAddQty(med)}
                        className="flex items-center gap-1 bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium shrink-0"
                      >
                        <Plus size={13} /> Add
                      </button>
                    </div>
                  </>
                )}
              </div>
            )
          })
        )}

        {/* Add form */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add new medicine</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {[
            { key: 'genericName', label: 'Generic name *',   placeholder: 'e.g. Rifampicin'           },
            { key: 'brandName',   label: 'Brand name',       placeholder: 'e.g. Rimactan'             },
            { key: 'dosage',      label: 'Dosage',           placeholder: 'e.g. 600mg once daily'     },
            { key: 'sideEffects', label: 'Side effects',     placeholder: 'e.g. Orange urine, nausea' },
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

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Qty (tablets)</label>
              <input
                type="number"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                placeholder="30"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Per sitting</label>
              <input
                type="number"
                min="1"
                value={form.intakeQty}
                onChange={(e) => setForm({ ...form, intakeQty: e.target.value })}
                placeholder="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Reminder</label>
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