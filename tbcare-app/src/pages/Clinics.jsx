import { useEffect, useState } from 'react'
import { Trash2, Phone, User, Pencil, Check, X } from 'lucide-react'
import { clinicOps } from '../db/database'

const EMPTY = { clinicName: '', address: '', contact: '', doctorName: '' }

export default function Clinics() {
  const [clinics,  setClinics]  = useState([])
  const [form,     setForm]     = useState(EMPTY)
  const [error,    setError]    = useState('')
  const [editId,   setEditId]   = useState(null)
  const [editData, setEditData] = useState({})

  useEffect(() => { load() }, [])
  const load = async () => setClinics(await clinicOps.getAll())

  const handleAdd = async () => {
    if (!form.clinicName.trim()) { setError('Clinic name is required'); return }
    setError('')
    await clinicOps.add({ ...form })
    setForm(EMPTY)
    load()
  }

  const startEdit  = (c)  => { setEditId(c.id); setEditData({ ...c }) }
  const cancelEdit = ()   => { setEditId(null); setEditData({}) }
  const saveEdit   = async () => {
    await clinicOps.update(editId, {
      clinicName: editData.clinicName,
      address:    editData.address,
      contact:    editData.contact,
      doctorName: editData.doctorName,
    })
    setEditId(null)
    load()
  }

  const fields = [
    { key: 'clinicName', label: 'Clinic name *',         placeholder: 'e.g. Pasay City Health Center' },
    { key: 'address',    label: 'Address',               placeholder: 'Full address'                   },
    { key: 'contact',    label: 'Contact number',        placeholder: 'e.g. 02-8123-4567'             },
    { key: 'doctorName', label: 'Assigned doctor/nurse', placeholder: 'e.g. Dr. Santos'               },
  ]

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">TB-DOTS Clinics</h1>
        <p className="text-sky-100 text-sm mt-1">Your treatment centers</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {clinics.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">No clinics saved yet</p>
        ) : (
          clinics.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-4">
              {editId === c.id ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-sky-600 mb-1">Editing clinic</p>
                  {fields.map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-xs text-gray-400 block mb-0.5">{label}</label>
                      <input
                        value={editData[key] || ''}
                        onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-400"
                      />
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <button onClick={saveEdit}
                      className="flex-1 flex items-center justify-center gap-1 bg-sky-500 text-white py-2 rounded-lg text-sm"
                    >
                      <Check size={14} /> Save
                    </button>
                    <button onClick={cancelEdit}
                      className="flex-1 flex items-center justify-center gap-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm"
                    >
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{c.clinicName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{c.address}</p>
                    </div>
                    <div className="flex gap-1 ml-2 shrink-0">
                      <button onClick={() => startEdit(c)}
                        className="p-1.5 text-gray-300 hover:text-sky-400 transition-colors">
                        <Pencil size={15} />
                      </button>
                      <button onClick={async () => { await clinicOps.delete(c.id); load() }}
                        className="p-1.5 text-gray-300 hover:text-red-400 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    {c.contact && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Phone size={12} /><span>{c.contact}</span>
                      </div>
                    )}
                    {c.doctorName && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User size={12} /><span>{c.doctorName}</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}

        {/* Add form */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add clinic</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          {fields.map(({ key, label, placeholder }) => (
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

          <button onClick={handleAdd}
            className="w-full bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            Save clinic
          </button>
        </div>
      </div>
    </div>
  )
}