import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sun, Moon, User, Trash2, AlertTriangle,
  MapPin, ChevronRight, Save,
} from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { patientOps, clearOps, clinicOps } from '../db/database'

const CONFIRM_SECTIONS = [
  {
    key:   'logs',
    label: 'Dose logs',
    sub:   'Clears all medication intake history and streak',
    color: 'text-amber-600',
    bg:    'bg-amber-50 dark:bg-amber-900/20',
    fn:    () => clearOps.clearLogs(),
  },
  {
    key:   'diary',
    label: 'Diary entries',
    sub:   'Clears all side effect diary logs',
    color: 'text-amber-600',
    bg:    'bg-amber-50 dark:bg-amber-900/20',
    fn:    () => clearOps.clearDiary(),
  },
  {
    key:   'schedule',
    label: 'Schedule & tests',
    sub:   'Clears all events and test results',
    color: 'text-amber-600',
    bg:    'bg-amber-50 dark:bg-amber-900/20',
    fn:    () => clearOps.clearSchedule(),
  },
  {
    key:   'medicines',
    label: 'Medicines + logs',
    sub:   'Clears medicines, reminders and all dose logs',
    color: 'text-red-600',
    bg:    'bg-red-50 dark:bg-red-900/20',
    fn:    () => clearOps.clearMedicines(),
  },
  {
    key:   'clinics',
    label: 'Clinics',
    sub:   'Clears all saved TB-DOTS clinic records',
    color: 'text-amber-600',
    bg:    'bg-amber-50 dark:bg-amber-900/20',
    fn:    () => clearOps.clearClinics(),
  },
]

const EMPTY_PATIENT = {
  name: '', age: '', weight: '', tbType: '',
  treatmentStart: '', phase: '', caseNumber: '',
}

export default function Settings() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()

  const [patient,    setPatient]    = useState(EMPTY_PATIENT)
  const [saved,      setSaved]      = useState(false)
  const [clinics,    setClinics]    = useState([])
  const [confirmKey, setConfirmKey] = useState(null) // which section to confirm
  const [showNuke,   setShowNuke]   = useState(false) // full reset confirm

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [info, cl] = await Promise.all([
      patientOps.get(),
      clinicOps.getAll(),
    ])
    if (Object.keys(info).length) setPatient({ ...EMPTY_PATIENT, ...info })
    setClinics(cl)
  }

  const handleSavePatient = async () => {
    await patientOps.set(patient)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleClearSection = async (fn) => {
    await fn()
    setConfirmKey(null)
    loadAll()
  }

  const handleNuke = async () => {
    await clearOps.clearAll()
    setShowNuke(false)
    setPatient(EMPTY_PATIENT)
    loadAll()
  }

  return (
    <div>
      <div className="bg-sky-500 text-white px-4 pt-10 pb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sky-100 text-sm mt-1">Profile, theme & data management</p>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* ── THEME TOGGLE ─────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <p className="text-sm font-medium text-gray-700 dark:text-slate-200 mb-3">
            Appearance
          </p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {dark
                ? <Moon size={18} className="text-sky-400" />
                : <Sun  size={18} className="text-amber-400" />
              }
              <div>
                <p className="text-sm text-gray-700 dark:text-slate-200">
                  {dark ? 'Dark mode' : 'Light mode'}
                </p>
                <p className="text-xs text-gray-400 dark:text-slate-500">
                  Tap to switch
                </p>
              </div>
            </div>
            {/* Toggle switch */}
            <button
              onClick={toggle}
              className={`relative w-12 h-6 rounded-full transition-colors
                ${dark ? 'bg-sky-500' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                ${dark ? 'translate-x-6' : 'translate-x-0'}`}
              />
            </button>
          </div>
        </div>

        {/* ── PATIENT INFO ──────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <User size={16} className="text-sky-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Patient information
            </p>
          </div>

          <div className="space-y-3">
            {[
              { key: 'name',           label: 'Full name',          placeholder: 'Juan dela Cruz'       },
              { key: 'age',            label: 'Age',                placeholder: '25'                   },
              { key: 'weight',         label: 'Weight (kg)',        placeholder: '60'                   },
              { key: 'caseNumber',     label: 'TB case number',     placeholder: 'e.g. TB-2026-0001'    },
              { key: 'tbType',         label: 'TB type',            placeholder: 'e.g. Pulmonary TB'    },
              { key: 'treatmentStart', label: 'Treatment start date', type: 'date'                      },
              { key: 'phase',          label: 'Treatment phase',    placeholder: 'e.g. Intensive phase' },
            ].map(({ key, label, placeholder, type }) => (
              <div key={key}>
                <label className="text-xs text-gray-500 dark:text-slate-400 block mb-1">
                  {label}
                </label>
                <input
                  type={type || 'text'}
                  value={patient[key] || ''}
                  onChange={(e) => setPatient({ ...patient, [key]: e.target.value })}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm
                    bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200
                    placeholder-gray-300 dark:placeholder-slate-500
                    focus:outline-none focus:border-sky-400"
                />
              </div>
            ))}
          </div>

          <button
            onClick={handleSavePatient}
            className={`w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors
              ${saved
                ? 'bg-green-500 text-white'
                : 'bg-sky-500 hover:bg-sky-600 text-white'}`}
          >
            <Save size={15} />
            {saved ? 'Saved ✓' : 'Save patient info'}
          </button>
        </div>

        {/* ── CLINICS SHORTCUT ─────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={16} className="text-sky-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              TB-DOTS Clinics
            </p>
          </div>

          {clinics.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500">
              No clinics saved yet
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {clinics.map((c) => (
                <div key={c.id}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-slate-700 last:border-0"
                >
                  <div>
                    <p className="text-sm text-gray-700 dark:text-slate-200">{c.clinicName}</p>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{c.doctorName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/clinics')}
            className="w-full flex items-center justify-between border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Manage clinics
            <ChevronRight size={15} />
          </button>
        </div>

        {/* ── CLEAR DATA ───────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trash2 size={16} className="text-red-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-200">
              Clear data
            </p>
          </div>

          <div className="space-y-2">
            {CONFIRM_SECTIONS.map((section) => (
              <div key={section.key}>
                {confirmKey === section.key ? (
                  /* Confirm row */
                  <div className={`${section.bg} rounded-xl p-3`}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={14} className={section.color} />
                      <p className={`text-xs font-medium ${section.color}`}>
                        Delete {section.label}?
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-3">
                      {section.sub}. This cannot be undone.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleClearSection(section.fn)}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg text-xs font-medium"
                      >
                        Yes, delete
                      </button>
                      <button
                        onClick={() => setConfirmKey(null)}
                        className="flex-1 border border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 py-2 rounded-lg text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmKey(section.key)}
                    className="w-full flex items-center justify-between border border-gray-100 dark:border-slate-700 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="text-left">
                      <p className="text-sm text-gray-700 dark:text-slate-200">
                        {section.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">
                        {section.sub}
                      </p>
                    </div>
                    <Trash2 size={14} className="text-gray-300 dark:text-slate-600 shrink-0 ml-2" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── NUCLEAR RESET ────────────────────────────── */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Full reset
            </p>
          </div>
          <p className="text-xs text-red-500 dark:text-red-400 mb-3">
            Wipes ALL data including medicines, diary, schedule, clinics,
            patient info, and all logs. Start completely fresh.
          </p>

          {showNuke ? (
            <div>
              <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-3">
                Are you absolutely sure? This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleNuke}
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium"
                >
                  Yes, reset everything
                </button>
                <button
                  onClick={() => setShowNuke(false)}
                  className="flex-1 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 py-2.5 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowNuke(true)}
              className="w-full bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              Reset all data
            </button>
          )}
        </div>

        <div className="text-center py-2">
          <p className="text-xs text-gray-300 dark:text-slate-600">
            TB Care v1.0 · All data stored locally on this device
          </p>
        </div>
      </div>
    </div>
  )
}