import { useEffect, useState } from 'react'
import { Trash2, Phone, User } from 'lucide-react'
import { clinicOps } from '../db/database'

export default function Clinics() {
  const [clinics, setClinics] = useState([])
  const [form, setForm] = useState({
    clinicName: '', address: '', contact: '', doctorName: '',
  })
  const [error, setError] = useState('')

  useEffect(() => { load() }, [])
  const load = async () => setClinics(await clinicOps.getAll())

  const handleAdd = async () => {
    if (!form.clinicName.trim()) {
      setError('Clinic name is required')
      return
    }
    setError('')
    await clinicOps.add({ ...form })
    setForm({ clinicName: '', address: '', contact: '', doctorName: '' })
    load()
  }

  const handleDelete = async (id) => {
    await clinicOps.delete(id)
    load()
  }

  return (
    <div>
      <div className="bg-blue-900 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">TB-DOTS Clinics</h1>
        <p className="text-sky-100 text-sm mt-1">Your treatment centers</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {clinics.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">
            No clinics saved yet
          </p>
        ) : (
          clinics.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-xl border border-gray-100 p-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-gray-800">{c.clinicName}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.address}</p>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="mt-3 space-y-1.5">
                {c.contact && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Phone size={12} />
                    <span>{c.contact}</span>
                  </div>
                )}
                {c.doctorName && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <User size={12} />
                    <span>{c.doctorName}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {/* Add form */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          <p className="text-sm font-medium text-gray-700">Add clinic</p>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {[
            { key: 'clinicName',  label: 'Clinic name *',       placeholder: 'e.g. Pasay City Health Center' },
            { key: 'address',     label: 'Address',             placeholder: 'Full address'                   },
            { key: 'contact',     label: 'Contact number',      placeholder: 'e.g. 02-8123-4567'             },
            { key: 'doctorName',  label: 'Assigned doctor/nurse', placeholder: 'e.g. Dr. Santos'             },
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

          <button
            onClick={handleAdd}
            className="w-full bg-sky-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
          >
            Save clinic
          </button>
        </div>
      </div>
    </div>
  )
}